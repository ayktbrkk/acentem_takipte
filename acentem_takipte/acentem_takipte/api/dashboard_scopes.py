from __future__ import annotations

import frappe
from frappe.utils import getdate, nowdate


def _qualified_field(fieldname: str, table_alias: str | None) -> str:
    if not table_alias:
        return fieldname
    return f"{table_alias}.{fieldname}"


def _build_policy_where(
    *,
    from_date: str | None,
    to_date: str | None,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
    table_alias: str | None = None,
) -> tuple[str, dict]:
    issue_date_field = _qualified_field("issue_date", table_alias)
    branch_field = _qualified_field("branch", table_alias)
    office_branch_field = _qualified_field("office_branch", table_alias)
    customer_field = _qualified_field("customer", table_alias)

    conditions = ["1=1"]
    values = {}

    if from_date:
        conditions.append(f"{issue_date_field} >= %(from_date)s")
        values["from_date"] = getdate(from_date)
    if to_date:
        conditions.append(f"{issue_date_field} <= %(to_date)s")
        values["to_date"] = getdate(to_date)
    if branch:
        conditions.append(f"{branch_field} = %(branch)s")
        values["branch"] = branch
    if office_branch:
        conditions.append(f"{office_branch_field} = %(office_branch)s")
        values["office_branch"] = office_branch
    if allowed_customers is not None:
        conditions.append(f"{customer_field} in %(customers)s")
        values["customers"] = tuple(allowed_customers)

    return " and ".join(conditions), values


def _build_lead_where(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> tuple[str, dict]:
    conditions = ["1=1"]
    values = {}

    if branch:
        conditions.append("branch = %(branch)s")
        values["branch"] = branch
    if office_branch:
        conditions.append("office_branch = %(office_branch)s")
        values["office_branch"] = office_branch
    if allowed_customers is not None:
        conditions.append("customer in %(customers)s")
        values["customers"] = tuple(allowed_customers)

    return " and ".join(conditions), values


def _build_payment_where(
    *,
    from_date: str | None,
    to_date: str | None,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> tuple[str, dict]:
    conditions = ["1=1"]
    values = {}

    if from_date:
        conditions.append("payment_date >= %(from_date)s")
        values["from_date"] = getdate(from_date)
    if to_date:
        conditions.append("payment_date <= %(to_date)s")
        values["to_date"] = getdate(to_date)
    if branch:
        conditions.append(
            "policy in (select name from `tabAT Policy` where branch = %(branch)s)"
        )
        values["branch"] = branch
    if office_branch:
        conditions.append("office_branch = %(office_branch)s")
        values["office_branch"] = office_branch
    if allowed_customers is not None:
        conditions.append("customer in %(customers)s")
        values["customers"] = tuple(allowed_customers)

    return " and ".join(conditions), values


def _build_payment_collection_where(
    *,
    anchor_date: str | None,
    due_state: str,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> tuple[str, dict]:
    conditions = [
        "status = 'Draft'",
        "payment_direction = 'Inbound'",
        "payment_purpose = 'Premium Collection'",
        "due_date is not null",
    ]
    values: dict[str, object] = {"anchor_date": getdate(anchor_date or nowdate())}

    if due_state == "due_today":
        conditions.append("due_date = %(anchor_date)s")
    else:
        conditions.append("due_date < %(anchor_date)s")

    if branch:
        conditions.append(
            "policy in (select name from `tabAT Policy` where branch = %(branch)s)"
        )
        values["branch"] = branch
    if office_branch:
        conditions.append("office_branch = %(office_branch)s")
        values["office_branch"] = office_branch
    if allowed_customers is not None:
        conditions.append("customer in %(customers)s")
        values["customers"] = tuple(allowed_customers or ["__none__"])

    return " and ".join(["1=1", *conditions]), values


def _build_claim_where(
    *,
    from_date: str | None,
    to_date: str | None,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> tuple[str, dict]:
    conditions = ["1=1"]
    values = {}

    if from_date:
        conditions.append("c.reported_date >= %(from_date)s")
        values["from_date"] = getdate(from_date)
    if to_date:
        conditions.append("c.reported_date <= %(to_date)s")
        values["to_date"] = getdate(to_date)
    if branch:
        conditions.append("p.branch = %(branch)s")
        values["branch"] = branch
    if office_branch:
        conditions.append("c.office_branch = %(office_branch)s")
        values["office_branch"] = office_branch
    if allowed_customers is not None:
        conditions.append("c.customer in %(customers)s")
        values["customers"] = tuple(allowed_customers)

    return " and ".join(conditions), values


def _get_scoped_policy_names(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> list[str]:
    cache = getattr(frappe.local, "at_dashboard_policy_scope_cache", None)
    if cache is None:
        cache = {}
        frappe.local.at_dashboard_policy_scope_cache = cache

    cache_key = (
        str(branch or ""),
        str(office_branch or ""),
        tuple(allowed_customers or []) if allowed_customers is not None else None,
    )
    if cache_key in cache:
        return cache[cache_key]

    filters = {}
    if branch:
        filters["branch"] = branch
    if office_branch:
        filters["office_branch"] = office_branch
    if allowed_customers is not None:
        filters["customer"] = ["in", allowed_customers or ["__none__"]]

    # unbounded: scoped policy names for dashboard, filtered by branch/customer scope - expected max ~50k rows
    policy_names = (
        frappe.get_list("AT Policy", filters=filters, pluck="name", limit_page_length=0)
        if filters
        else []
    )
    cache[cache_key] = policy_names
    return policy_names


def _get_scoped_customer_names(
    *,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> list[str]:
    cache = getattr(frappe.local, "at_dashboard_customer_scope_cache", None)
    if cache is None:
        cache = {}
        frappe.local.at_dashboard_customer_scope_cache = cache

    cache_key = (
        str(office_branch or ""),
        tuple(allowed_customers or []) if allowed_customers is not None else None,
    )
    if cache_key in cache:
        return cache[cache_key]

    filters = {}
    if office_branch:
        filters["office_branch"] = office_branch
    if allowed_customers is not None:
        filters["name"] = ["in", allowed_customers or ["__none__"]]

    # unbounded: scoped customer names for dashboard, filtered by office branch scope - expected max ~50k rows
    customer_names = (
        frappe.get_list(
            "AT Customer", filters=filters, pluck="name", limit_page_length=0
        )
        if filters
        else []
    )
    cache[cache_key] = customer_names
    return customer_names

