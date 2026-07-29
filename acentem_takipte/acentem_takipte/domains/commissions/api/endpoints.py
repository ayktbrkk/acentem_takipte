from __future__ import annotations

import frappe
from frappe.utils import cint

from acentem_takipte.acentem_takipte.platform.api.security import (
    assert_authenticated,
    assert_doctype_permission,
)
from acentem_takipte.acentem_takipte.domains.commissions.services.balance import (
    compute_commission_balances,
    compute_commission_policy_detail,
    compute_entity_detail,
)


@frappe.whitelist()
def get_commission_balances(
    office_branch: str | None = None,
    aging_bucket: str = "all",
    limit: int = 100,
) -> dict:
    assert_authenticated()
    assert_doctype_permission(
        "AT Policy",
        "read",
        "You do not have permission to view commission balances.",
    )
    assert_doctype_permission(
        "AT Payment",
        "read",
        "You do not have permission to view commission balances.",
    )
    return compute_commission_balances(
        office_branch=office_branch,
        aging_bucket=aging_bucket,
        limit=max(cint(limit), 1),
    )


@frappe.whitelist()
def get_commission_entity_detail(
    entity_name: str,
    limit: int = 50,
) -> dict:
    assert_authenticated()
    assert_doctype_permission(
        "AT Policy",
        "read",
        "You do not have permission to view commission details.",
    )
    return compute_entity_detail(entity_name, limit=max(cint(limit), 1))


@frappe.whitelist()
def get_commission_policy_detail(
    entity_name: str,
    insurance_company: str | None = None,
    limit: int = 50,
) -> dict:
    assert_authenticated()
    assert_doctype_permission(
        "AT Policy",
        "read",
        "You do not have permission to view commission details.",
    )
    return compute_commission_policy_detail(
        entity_name=entity_name,
        insurance_company=insurance_company,
        limit=max(cint(limit), 1),
    )
