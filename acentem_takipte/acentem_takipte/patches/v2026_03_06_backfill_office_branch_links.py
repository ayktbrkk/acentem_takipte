from __future__ import annotations

import frappe


def execute():
    _backfill_from_customer("AT Offer")
    _backfill_from_customer("AT Lead")
    _backfill_from_customer("AT Policy")
    _backfill_from_policy_then_customer("AT Payment")
    _backfill_from_policy_then_customer("AT Claim")
    _backfill_from_policy_then_customer("AT Renewal Task")
    _backfill_from_policy_then_customer("AT Accounting Entry")


def _backfill_from_customer(doctype: str) -> None:
    rows = frappe.get_all(
        doctype,
        filters={"office_branch": ["in", ["", None]]},
        fields=["name", "customer"],
        limit_page_length=0,
    )
    if not rows:
        return

    customer_names = sorted({row.customer for row in rows if row.customer})
    customer_branch_map = _get_field_map("AT Customer", customer_names, "office_branch")

    for row in rows:
        office_branch = customer_branch_map.get(row.customer)
        if office_branch:
            frappe.db.set_value(doctype, row.name, "office_branch", office_branch, update_modified=False)


def _backfill_from_policy_then_customer(doctype: str) -> None:
    rows = frappe.get_all(
        doctype,
        filters={"office_branch": ["in", ["", None]]},
        fields=["name", "policy", "customer"],
        limit_page_length=0,
    )
    if not rows:
        return

    policy_names = sorted({row.policy for row in rows if row.policy})
    customer_names = sorted({row.customer for row in rows if row.customer})
    policy_branch_map = _get_field_map("AT Policy", policy_names, "office_branch")
    customer_branch_map = _get_field_map("AT Customer", customer_names, "office_branch")

    for row in rows:
        office_branch = policy_branch_map.get(row.policy) or customer_branch_map.get(row.customer)
        if office_branch:
            frappe.db.set_value(doctype, row.name, "office_branch", office_branch, update_modified=False)


def _get_field_map(doctype: str, names: list[str], fieldname: str) -> dict[str, str]:
    if not names:
        return {}
    rows = frappe.get_all(
        doctype,
        filters={"name": ["in", names]},
        fields=["name", fieldname],
        limit_page_length=0,
    )
    return {
        row.name: row.get(fieldname)
        for row in rows
        if row.get(fieldname)
    }
