from __future__ import annotations

import frappe
from frappe import _

from acentem_takipte.acentem_takipte.services.quick_create_helpers import (
    _as_check,
    _assert_create_permission,
    _normalize_link,
    _normalize_option,
)


@frappe.whitelist()
def create_quick_insurance_company(
    company_name: str | None = None,
    company_code: str | None = None,
    is_active: int | str | bool | None = 1,
) -> dict[str, str]:
    _assert_create_permission(
        "AT Insurance Company",
        _("You do not have permission to create insurance companies."),
    )

    payload = {
        "doctype": "AT Insurance Company",
        "company_name": (company_name or "").strip(),
        "company_code": (company_code or "").strip() or None,
        "is_active": _as_check(is_active, default=1),
    }
    doc = frappe.get_doc(payload)
    doc.insert()
    frappe.db.commit()
    return {"company": doc.name}


@frappe.whitelist()
def create_quick_branch(
    branch_name: str | None = None,
    branch_code: str | None = None,
    insurance_company: str | None = None,
    is_active: int | str | bool | None = 1,
) -> dict[str, str]:
    _assert_create_permission("AT Branch", _("You do not have permission to create branches."))

    payload = {
        "doctype": "AT Branch",
        "branch_name": (branch_name or "").strip(),
        "branch_code": (branch_code or "").strip() or None,
        "insurance_company": _normalize_link("AT Insurance Company", insurance_company),
        "is_active": _as_check(is_active, default=1),
    }
    doc = frappe.get_doc(payload)
    doc.insert()
    frappe.db.commit()
    return {"branch": doc.name}


@frappe.whitelist()
def create_quick_sales_entity(
    entity_type: str | None = None,
    full_name: str | None = None,
    office_branch: str | None = None,
    parent_entity: str | None = None,
) -> dict[str, str]:
    _assert_create_permission(
        "AT Sales Entity", _("You do not have permission to create sales entities.")
    )

    payload = {
        "doctype": "AT Sales Entity",
        "entity_type": _normalize_option(
            entity_type, {"Agency", "Sub-Account", "Representative"}, default="Agency"
        ),
        "full_name": (full_name or "").strip(),
        "office_branch": _normalize_link("AT Office Branch", office_branch, required=True),
        "parent_entity": _normalize_link("AT Sales Entity", parent_entity),
    }
    doc = frappe.get_doc(payload)
    doc.insert()
    frappe.db.commit()
    return {"sales_entity": doc.name}
