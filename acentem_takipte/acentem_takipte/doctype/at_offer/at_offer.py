from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_days, flt, getdate, nowdate
from acentem_takipte.services.branches import get_default_office_branch
from acentem_takipte.services.quick_customer import resolve_or_create_quick_customer
from acentem_takipte.utils.commissions import resolve_commission_amount
from acentem_takipte.utils.statuses import ATLeadStatus, ATOfferStatus, ATPolicyStatus
from acentem_takipte.utils.financials import normalize_financial_amounts
from acentem_takipte.api.security import (
    assert_authenticated,
    assert_doc_permission,
    assert_doctype_permission,
    assert_post_request,
)


class ATOffer(Document):
    def validate(self):
        offer_date = getdate(self.offer_date) if self.offer_date else None
        valid_until = getdate(self.valid_until) if self.valid_until else None

        if offer_date and valid_until and valid_until < offer_date:
            frappe.throw(_("Valid until date cannot be earlier than offer date."))

        if self.status == ATOfferStatus.CONVERTED and not self.converted_policy:
            frappe.throw(_("Converted offers must be linked to a policy."))

        self._normalize_financials()

    def _normalize_financials(self):
        normalized = normalize_financial_amounts(
            net_premium=self.net_premium,
            tax_amount=self.tax_amount,
            commission_amount=self.commission_amount,
            gross_premium=self.gross_premium,
            allow_all_zero=self.status == ATOfferStatus.DRAFT,
            zero_message_context="offer",
        )
        self.net_premium = normalized["net_premium"]
        self.tax_amount = normalized["tax_amount"]
        self.commission_amount = normalized["commission_amount"]
        self.gross_premium = normalized["gross_premium"]


@frappe.whitelist()
def create_quick_offer(
    customer: str | None = None,
    customer_name: str | None = None,
    customer_type: str | None = None,
    tax_id: str | None = None,
    phone: str | None = None,
    email: str | None = None,
    branch: str | None = None,
    office_branch: str | None = None,
    notes: str | None = None,
    currency: str | None = None,
    offer_date: str | None = None,
    valid_until: str | None = None,
    insurance_company: str | None = None,
    sales_entity: str | None = None,
    status: str | None = None,
    gross_premium: float | None = None,
    net_premium: float | None = None,
    tax_amount: float | None = None,
    commission_amount: float | None = None,
) -> dict[str, str | int]:
    assert_authenticated()
    assert_post_request("Only POST requests are allowed for quick offer creation.")
    if not frappe.has_permission("AT Offer", "create"):
        frappe.throw(_("You do not have permission to create offers."))

    resolved_customer, customer_created = _resolve_or_create_quick_customer(
        customer=customer,
        customer_name=customer_name,
        customer_type=customer_type,
        tax_id=tax_id,
        phone=phone,
        email=email,
        office_branch=office_branch,
    )

    offer_day = getdate(offer_date) if offer_date else getdate(nowdate())
    expiry_day = getdate(valid_until) if valid_until else add_days(offer_day, 15)
    if expiry_day < offer_day:
        frappe.throw(_("Valid until date cannot be earlier than offer date."))

    normalized_status = (status or ATOfferStatus.DRAFT).strip() or ATOfferStatus.DRAFT
    if normalized_status not in ATOfferStatus.CREATION_ALLOWED:
        frappe.throw(_("Unsupported quick offer status: {0}").format(normalized_status))

    gross_value = flt(gross_premium) if gross_premium not in {None, ""} else 0
    net_value = flt(net_premium) if net_premium not in {None, ""} else 0
    tax_value = flt(tax_amount) if tax_amount not in {None, ""} else 0
    commission_value = flt(commission_amount) if commission_amount not in {None, ""} else 0

    payload = {
        "doctype": "AT Offer",
        "customer": resolved_customer,
        "office_branch": _resolve_offer_office_branch(office_branch, resolved_customer),
        "status": normalized_status,
        "offer_date": offer_day,
        "valid_until": expiry_day,
        "currency": (currency or "TRY").upper(),
        "gross_premium": gross_value,
        "net_premium": net_value,
        "tax_amount": tax_value,
        "commission_amount": commission_value,
        "notes": (notes or "").strip() or None,
        "branch": branch or None,
        "insurance_company": insurance_company or None,
        "sales_entity": sales_entity or None,
    }

    offer_doc = frappe.get_doc(payload)
    offer_doc.flags.ignore_mandatory = True
    offer_doc.insert(ignore_permissions=True)
    frappe.db.commit()

    return {
        "offer": offer_doc.name,
        "customer": resolved_customer,
        "customer_created": int(customer_created),
    }


@frappe.whitelist()
def convert_to_policy(
    offer_name: str,
    start_date: str | None = None,
    end_date: str | None = None,
    commission: float | None = None,
    commission_amount: float | None = None,
    tax_amount: float | None = None,
    net_premium: float | None = None,
    policy_no: str | None = None,
) -> dict[str, str]:
    assert_authenticated()
    assert_post_request("Only POST requests are allowed for offer conversion.")
    offer_name = str(offer_name or "").strip()
    if not offer_name:
        frappe.throw(_("Offer is required."))

    frappe.db.sql("select name from `tabAT Offer` where name = %s for update", offer_name)
    offer = frappe.get_doc("AT Offer", offer_name)
    offer.check_permission("read")
    offer.check_permission("write")
    assert_doctype_permission("AT Policy", "create", "You do not have permission to create policies.")

    if offer.converted_policy:
        return {"policy": offer.converted_policy, "message": _("Offer is already converted to Policy.")}

    _validate_offer_conversion_inputs(offer)
    assert_doc_permission("AT Customer", offer.customer, "read")

    start = getdate(start_date) if start_date else getdate(nowdate())
    end = getdate(end_date) if end_date else add_days(start, 365)
    if end < start:
        frappe.throw(_("Policy end date cannot be earlier than start date."))

    commission_value = _resolve_commission_value(offer, commission_amount=commission_amount, commission=commission)
    tax_value = _resolve_tax_value(offer, tax_amount=tax_amount)
    net_value = _resolve_net_value(offer, net_premium=net_premium)
    gross_value = flt(offer.gross_premium)

    if net_value <= 0 and gross_value > 0:
        net_value = gross_value - tax_value - commission_value

    if net_value <= 0:
        frappe.throw(_("Net premium must be greater than zero for policy conversion."))

    calculated_gross = net_value + tax_value + commission_value
    if gross_value > 0 and abs(gross_value - calculated_gross) > 0.01:
        frappe.throw(_("Offer premium values are inconsistent. Update offer amounts before conversion."))

    policy_payload = {
        "doctype": "AT Policy",
        "customer": offer.customer,
        "office_branch": offer.office_branch,
        "sales_entity": offer.sales_entity,
        "insurance_company": offer.insurance_company,
        "branch": offer.branch,
        "status": ATPolicyStatus.ACTIVE,
        "issue_date": nowdate(),
        "start_date": start,
        "end_date": end,
        "currency": offer.currency or "TRY",
        "net_premium": net_value,
        "tax_amount": tax_value,
        "commission_amount": commission_value,
        "commission": commission_value,
        "gross_premium": calculated_gross,
    }

    if policy_no:
        stripped_policy_no = policy_no.strip()
        duplicate_name = frappe.db.get_value(
            "AT Policy",
            {
                "insurance_company": offer.insurance_company,
                "policy_no": stripped_policy_no,
            },
            "name",
        )
        if duplicate_name:
            frappe.throw(
                _("Carrier policy number already exists for {0}: {1}").format(
                    frappe.bold(offer.insurance_company),
                    frappe.bold(stripped_policy_no),
                )
            )
        policy_payload["policy_no"] = stripped_policy_no

    policy = _insert_policy_for_offer_conversion(policy_payload)

    offer.db_set("net_premium", net_value, update_modified=False)
    offer.db_set("tax_amount", tax_value, update_modified=False)
    offer.db_set("commission_amount", commission_value, update_modified=False)
    offer.db_set("gross_premium", calculated_gross, update_modified=False)
    offer.db_set("converted_policy", policy.name, update_modified=False)
    offer.db_set("status", ATOfferStatus.CONVERTED, update_modified=False)

    if offer.source_lead and frappe.db.exists("AT Lead", offer.source_lead):
        lead = frappe.get_doc("AT Lead", offer.source_lead)
        lead.check_permission("write")
        if not lead.converted_offer:
            lead.db_set("converted_offer", offer.name, update_modified=False)
        lead.db_set("converted_policy", policy.name, update_modified=False)
        lead.db_set("status", ATLeadStatus.CLOSED, update_modified=False)

    frappe.db.commit()
    return {"policy": policy.name, "message": _("Offer converted to Policy successfully.")}


def _insert_policy_for_offer_conversion(payload: dict):
    # Permission checks are enforced by the whitelisted wrapper; insert runs as trusted internal service.
    return frappe.get_doc(payload).insert(ignore_permissions=True)


def _validate_offer_conversion_inputs(offer: ATOffer) -> None:
    required_fields = {
        "customer": _("Customer"),
        "sales_entity": _("Sales Entity"),
        "insurance_company": _("Insurance Company"),
        "branch": _("Branch"),
    }
    missing = [label for fieldname, label in required_fields.items() if not offer.get(fieldname)]
    if missing:
        frappe.throw(_("Offer is missing required fields: {0}").format(", ".join(missing)))

    if offer.status not in ATOfferStatus.CONVERTIBLE:
        frappe.throw(_("Offer status must be Sent or Accepted before conversion."))

    today = getdate(nowdate())
    valid_until = getdate(offer.valid_until) if offer.valid_until else None
    if valid_until and valid_until < today:
        frappe.throw(_("Offer has expired. Update Valid Until date before conversion."))

    if flt(offer.net_premium) <= 0 and flt(offer.gross_premium) <= 0:
        frappe.throw(_("Offer premium values are missing. Set net or gross premium before conversion."))


def _resolve_commission_value(offer: ATOffer, *, commission_amount: float | None, commission: float | None) -> float:
    if commission_amount is not None:
        resolved = flt(commission_amount)
    elif commission is not None:
        resolved = flt(commission)
    else:
        # Older data may still carry `commission`, but current AT Offer schema
        # only persists `commission_amount`.
        resolved = resolve_commission_amount(offer.commission_amount, getattr(offer, "commission", None))
    if resolved < 0:
        frappe.throw(_("Commission amount cannot be negative."))
    return resolved


def _resolve_tax_value(offer: ATOffer, *, tax_amount: float | None) -> float:
    resolved = flt(tax_amount) if tax_amount is not None else flt(offer.tax_amount)
    if resolved < 0:
        frappe.throw(_("Tax amount cannot be negative."))
    return resolved


def _resolve_net_value(offer: ATOffer, *, net_premium: float | None) -> float:
    return flt(net_premium) if net_premium is not None else flt(offer.net_premium)


def _resolve_or_create_quick_customer(
    *,
    customer: str | None,
    customer_name: str | None,
    customer_type: str | None,
    tax_id: str | None,
    phone: str | None,
    email: str | None,
    office_branch: str | None,
) -> tuple[str, bool]:
    if not customer and not frappe.has_permission("AT Customer", "create"):
        frappe.throw(_("You do not have permission to create customers."))

    resolved_customer, customer_created = resolve_or_create_quick_customer(
        customer=customer,
        full_name=customer_name,
        customer_type=customer_type,
        tax_id=tax_id,
        phone=phone,
        email=email,
        office_branch=_resolve_offer_office_branch(office_branch, customer),
        require_customer=True,
    )
    return str(resolved_customer or "").strip(), customer_created


def _resolve_offer_office_branch(office_branch: str | None, customer: str | None) -> str | None:
    explicit_branch = str(office_branch or "").strip()
    if explicit_branch:
        return explicit_branch
    customer_name = str(customer or "").strip()
    if customer_name and frappe.db.exists("AT Customer", customer_name):
        customer_branch = frappe.db.get_value("AT Customer", customer_name, "office_branch")
        if customer_branch:
            return customer_branch
    return get_default_office_branch()
