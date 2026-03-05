from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_days, flt, nowdate, validate_email_address
from acentem_takipte.acentem_takipte.api.security import (
    assert_authenticated,
    assert_doc_permission,
    assert_doctype_permission,
    assert_post_request,
    audit_admin_action,
)

class ATLead(Document):
    def validate(self):
        self.first_name = (self.first_name or "").strip()
        self.last_name = (self.last_name or "").strip()
        self.email = (self.email or "").strip().lower()
        self.status = self.status or "Draft"
        self.estimated_gross_premium = flt(self.estimated_gross_premium)

        if not self.first_name:
            frappe.throw(_("First Name is required."))

        if self.estimated_gross_premium < 0:
            frappe.throw(_("Estimated Gross Premium cannot be negative."))

        if self.email and not validate_email_address(self.email, throw=False):
            frappe.throw(_("Please enter a valid email address."))

    def before_insert(self):
        frappe.logger("acentem_takipte").info("Yeni Lead Kaydedildi")


@frappe.whitelist()
def convert_to_offer(lead_name: str) -> dict[str, str]:
    assert_authenticated()
    assert_post_request("Only POST requests are allowed for lead conversion.")
    lead_name = str(lead_name or "").strip()
    if not lead_name:
        frappe.throw(_("Lead is required."))

    lead = frappe.get_doc("AT Lead", lead_name)
    lead.check_permission("read")
    lead.check_permission("write")
    assert_doctype_permission("AT Offer", "create", "You do not have permission to create offers.")

    if lead.converted_offer:
        return {"offer": lead.converted_offer, "message": _("Lead is already converted to Offer.")}

    _validate_lead_conversion_inputs(lead)
    assert_doc_permission("AT Customer", lead.customer, "read")
    lead_title = " ".join(part for part in [lead.first_name, lead.last_name] if part)
    notes = "\n".join(
        [
            _("Source Lead: {0}").format(lead.name),
            _("Lead Name: {0}").format(lead_title or lead.name),
            _("Lead Email: {0}").format(lead.email or "-"),
            _("Lead Notes: {0}").format(lead.notes or "-"),
        ]
    )

    offer = _insert_offer_for_lead_conversion(
        {
            "doctype": "AT Offer",
            "source_lead": lead.name,
            "customer": lead.customer,
            "sales_entity": lead.sales_entity,
            "insurance_company": lead.insurance_company,
            "branch": lead.branch,
            "offer_date": nowdate(),
            "valid_until": add_days(nowdate(), 7),
            "currency": "TRY",
            "gross_premium": flt(lead.estimated_gross_premium),
            "status": "Draft",
            "notes": notes,
        }
    )

    lead.db_set("converted_offer", offer.name, update_modified=False)
    lead.db_set("status", "Replied", update_modified=False)
    frappe.db.commit()
    audit_admin_action(
        "doctype.at_lead.convert_to_offer",
        {
            "lead": lead.name,
            "offer": offer.name,
            "customer": lead.customer,
        },
    )

    return {"offer": offer.name, "message": _("Lead converted to Offer successfully.")}


def _insert_offer_for_lead_conversion(payload: dict):
    # Permission checks are enforced by the whitelisted wrapper; insert runs as trusted internal service.
    return frappe.get_doc(payload).insert(ignore_permissions=True)


def _validate_lead_conversion_inputs(lead: ATLead) -> None:
    required_fields = {
        "customer": _("Customer"),
        "sales_entity": _("Sales Entity"),
        "insurance_company": _("Insurance Company"),
        "branch": _("Branch"),
    }

    missing = [label for fieldname, label in required_fields.items() if not lead.get(fieldname)]
    if missing:
        frappe.throw(_("Lead is missing required fields: {0}").format(", ".join(missing)))

    if flt(lead.estimated_gross_premium) <= 0:
        frappe.throw(_("Estimated Gross Premium must be greater than zero."))
