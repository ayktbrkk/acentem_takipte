from __future__ import annotations

import frappe
from frappe import _

from acentem_takipte.acentem_takipte.doctype.at_customer.at_customer import (
    normalize_customer_type,
    normalize_identity_number,
)


def resolve_or_create_quick_customer(
    *,
    customer: str | None = None,
    full_name: str | None = None,
    customer_type: str | None = None,
    tax_id: str | None = None,
    phone: str | None = None,
    email: str | None = None,
    office_branch: str | None = None,
    birth_date: str | None = None,
    gender: str | None = None,
    marital_status: str | None = None,
    occupation: str | None = None,
    require_customer: bool = False,
) -> tuple[str | None, bool]:
    normalized_customer = str(customer or "").strip()
    if normalized_customer:
        if not frappe.db.exists("AT Customer", normalized_customer):
            frappe.throw(_("Customer not found: {0}").format(normalized_customer))
        return normalized_customer, False

    normalized_name = str(full_name or "").strip()
    identity_number = normalize_identity_number(tax_id)

    if not normalized_name:
        if require_customer:
            frappe.throw(_("Customer is required."))
        return None, False

    if not identity_number:
        if require_customer:
            frappe.throw(_("Customer identity number is required to create a new customer."))
        return None, False

    existing_by_identity = frappe.db.get_value("AT Customer", {"tax_id": identity_number}, "name")
    if existing_by_identity:
        return existing_by_identity, False

    customer_doc = frappe.get_doc(
        {
            "doctype": "AT Customer",
            "full_name": normalized_name,
            "customer_type": normalize_customer_type(customer_type, identity_number),
            "tax_id": identity_number,
            "phone": str(phone or "").strip() or None,
            "email": str(email or "").strip() or None,
            "office_branch": str(office_branch or "").strip() or None,
            "birth_date": birth_date or None,
            "gender": str(gender or "").strip() or None,
            "marital_status": str(marital_status or "").strip() or None,
            "occupation": str(occupation or "").strip() or None,
        }
    )
    customer_doc.insert(ignore_permissions=True)
    return customer_doc.name, True
