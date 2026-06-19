from __future__ import annotations

import frappe

from acentem_takipte.acentem_takipte.doctype.at_customer.at_customer import normalize_identity_number
from acentem_takipte.acentem_takipte.utils.normalization import normalize_link


LINK_LOOKUPS: dict[str, tuple[str, ...]] = {
    "AT Branch": ("branch_name", "branch_code"),
    "AT Insurance Company": ("company_name", "company_code"),
    "AT Sales Entity": ("full_name",),
}


def resolve_customer_ref(value: str | None) -> tuple[str | None, str | None]:
    raw = str(value or "").strip()
    if not raw:
        return None, "Customer is required."

    if frappe.db.exists("AT Customer", raw):
        return raw, None

    tax_id = normalize_identity_number(raw)
    if tax_id:
        existing = frappe.db.get_value("AT Customer", {"tax_id": tax_id}, "name")
        if existing:
            return existing, None

    by_name = frappe.db.get_value("AT Customer", {"full_name": raw}, "name")
    if by_name:
        return by_name, None

    return None, f"Customer could not be resolved: {raw}"


def resolve_link_ref(doctype: str, value: str | None, *, required: bool = False) -> tuple[str | None, str | None]:
    raw = str(value or "").strip()
    if not raw:
        if required:
            return None, f"{doctype} is required."
        return None, None

    direct = normalize_link(doctype, raw)
    if direct:
        return direct, None

    for fieldname in LINK_LOOKUPS.get(doctype, ()):
        matched = frappe.db.get_value(doctype, {fieldname: raw}, "name")
        if matched:
            return matched, None

    return None, f"{doctype} could not be resolved: {raw}"


def offer_duplicate_exists(*, customer: str, insurance_company: str, offer_date) -> str | None:
    if not all([customer, insurance_company, offer_date]):
        return None
    return frappe.db.get_value(
        "AT Offer",
        {
            "customer": customer,
            "insurance_company": insurance_company,
            "offer_date": offer_date,
        },
        "name",
    )


def policy_duplicate_exists(*, insurance_company: str, policy_no: str) -> str | None:
    policy_number = str(policy_no or "").strip()
    if not insurance_company or not policy_number:
        return None
    return frappe.db.get_value(
        "AT Policy",
        {"insurance_company": insurance_company, "policy_no": policy_number},
        "name",
    )
