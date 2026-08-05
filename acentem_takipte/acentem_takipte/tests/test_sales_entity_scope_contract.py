from __future__ import annotations

import frappe
import pytest
from frappe.utils import add_days, nowdate

from acentem_takipte.acentem_takipte.domains.commissions.services.balance import compute_commission_balances


def _random_tax_id() -> str:
    raw = "".join(c for c in frappe.generate_hash(length=12) if c.isdigit())[:9].ljust(9, "1")
    if raw.startswith("0"):
        raw = f"1{raw[1:]}"
    digits = [int(ch) for ch in raw]
    tenth = ((sum(digits[0:9:2]) * 7) - sum(digits[1:8:2])) % 10
    eleventh = (sum(digits) + tenth) % 10
    return f"{raw}{tenth}{eleventh}"


def _deps():
    frappe.set_user("Administrator")
    from acentem_takipte.acentem_takipte.tests.test_utils import ensure_test_office_branch

    suffix = frappe.generate_hash(length=8)
    office_branch = ensure_test_office_branch(suffix)
    insurance_company = frappe.get_doc(
        {"doctype": "AT Insurance Company", "company_name": f"Scope Ins {suffix}", "company_code": f"S{suffix[:4]}"}
    ).insert(ignore_permissions=True)
    branch = frappe.get_doc(
        {"doctype": "AT Branch", "branch_name": f"Scope B {suffix}", "branch_code": f"SB{suffix[:4]}", "insurance_company": insurance_company.name}
    ).insert(ignore_permissions=True)
    sales_entity = frappe.get_doc(
        {"doctype": "AT Sales Entity", "entity_type": "Agency", "full_name": f"Scope Agency {suffix}", "office_branch": office_branch}
    ).insert(ignore_permissions=True)
    customer = frappe.get_doc(
        {"doctype": "AT Customer", "tax_id": _random_tax_id(), "full_name": f"Scope Customer {suffix}", "customer_type": "Individual"}
    ).insert(ignore_permissions=True)
    today = nowdate()
    policy = frappe.get_doc(
        {
            "doctype": "AT Policy",
            "customer": customer.name,
            "sales_entity": sales_entity.name,
            "insurance_company": insurance_company.name,
            "branch": branch.name,
            "office_branch": office_branch,
            "status": "Active",
            "issue_date": today,
            "start_date": today,
            "end_date": add_days(today, 365),
            "currency": "TRY",
            "net_premium": 1200,
            "tax_amount": 120,
            "commission_amount": 120,
            "commission_distribution": [
                {"entity": sales_entity.name, "share_pct": 100, "amount_try": 120, "amount": 120}
            ],
        }
    ).insert(ignore_permissions=True)
    return {"office_branch": office_branch, "sales_entity": sales_entity.name, "policy": policy.name}


def test_sales_entities_scope_query_matches_office_branch():
    deps = _deps()
    # The aux workbench list query scopes AT Sales Entity by office_branch.
    # Creating an agency in a fresh branch auto-creates its root + pool, so the
    # branch scope contains at least the created entity (and its root/pool).
    rows = frappe.get_all(
        "AT Sales Entity",
        filters={"office_branch": deps["office_branch"]},
        fields=["name"],
        limit_page_length=100,
    )
    names = [r["name"] for r in rows]
    assert deps["sales_entity"] in names
    total = frappe.db.count("AT Sales Entity", {"office_branch": deps["office_branch"]})
    assert total >= 1
    frappe.db.rollback()


def test_commission_balance_entities_are_within_sales_entity_scope():
    deps = _deps()
    result = compute_commission_balances(office_branch=deps["office_branch"])
    # Entities with accrued commission for the branch must belong to the
    # branch's sales-entity scope (the admin aux list uses the same office
    # branch filter), so both screens agree for the same scope.
    entity_scope = {
        r["name"] for r in frappe.get_all("AT Sales Entity", filters={"office_branch": deps["office_branch"]}, fields=["name"], limit_page_length=0)
    }
    balance_entities = {
        str(item.get("name") or "").strip()
        for item in result.get("entities", [])
        if item.get("name")
    }
    if balance_entities:
        assert balance_entities.issubset(entity_scope), (
            f"commission entities {balance_entities - entity_scope} outside sales-entity scope"
        )
    frappe.db.rollback()
