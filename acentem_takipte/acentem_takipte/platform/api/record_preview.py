from __future__ import annotations

import frappe
from frappe import _

from acentem_takipte.acentem_takipte.platform.api.security import assert_authenticated
from acentem_takipte.acentem_takipte.doctype.at_customer.at_customer import (
    has_sensitive_access,
    mask_phone,
    mask_tax_id,
)


def _mask_email(value: str | None) -> str:
    email = str(value or "").strip()
    if not email or "@" not in email:
        return ""
    local, domain = email.split("@", 1)
    if not local:
        return f"***@{domain}"
    return f"{local[:1]}***@{domain}"

def _link_label(doctype: str, name: str | None, field: str) -> str:
    if not name:
        return ""
    return frappe.db.get_value(doctype, name, field) or name


@frappe.whitelist()
def get_record_preview(doctype: str, name: str) -> dict:
    assert_authenticated()
    doc = frappe.get_doc(doctype, name)
    frappe.has_permission(doctype, ptype="read", doc=doc, throw=True)
    
    # Base summary
    preview = {
        "doctype": doctype,
        "name": name,
        "title": name,
        "subtitle": doctype,
        "fields": [],
        "metrics": []
    }

    if doctype == "AT Policy":
        preview["title"] = doc.policy_no or name
        ic_label = _link_label("AT Insurance Company", doc.insurance_company, "company_name")
        br_label = _link_label("AT Branch", doc.branch, "branch_name")
        preview["subtitle"] = f"{ic_label} - {br_label}"
        preview["fields"] = [
            {"label": _("Customer"), "value": _link_label("AT Customer", doc.customer, "full_name")},
            {"label": _("Status"), "value": doc.status},
            {"label": _("Start Date"), "value": doc.start_date},
            {"label": _("End Date"), "value": doc.end_date},
        ]
        preview["metrics"] = [
            {"label": _("Gross Premium"), "value": doc.gross_premium, "currency": doc.currency}
        ]

    elif doctype == "AT Customer":
        can_view_sensitive = has_sensitive_access()
        preview["title"] = doc.full_name or name
        preview["subtitle"] = doc.tax_id if can_view_sensitive else mask_tax_id(doc.tax_id)
        preview["fields"] = [
            {
                "label": _("Email"),
                "value": doc.email if can_view_sensitive else _mask_email(doc.email),
            },
            {
                "label": _("Phone"),
                "value": doc.phone if can_view_sensitive else mask_phone(doc.phone),
            },
            {"label": _("Type"), "value": doc.customer_type},
        ]

    elif doctype == "AT Claim":
        preview["title"] = doc.claim_no or name
        ic_label = _link_label("AT Insurance Company", getattr(doc, "insurance_company", None), "company_name")
        br_label = _link_label("AT Branch", getattr(doc, "branch", None), "branch_name")
        preview["subtitle"] = f"{ic_label} - {br_label}"
        preview["fields"] = [
            {"label": _("Policy"), "value": _link_label("AT Policy", doc.policy, "policy_no")},
            {"label": _("Status"), "value": doc.claim_status},
            {"label": _("Reported Date"), "value": doc.reported_date},
        ]
        preview["metrics"] = [
            {"label": _("Estimated"), "value": doc.estimated_amount, "currency": "TRY"},
            {"label": _("Paid"), "value": doc.paid_amount, "currency": "TRY"},
        ]

    return preview
