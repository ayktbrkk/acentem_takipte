from __future__ import annotations

import frappe
from frappe.utils import cint

def _reconciliation_filter_conditions(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> tuple[list[str], dict]:
    conditions = ["ri.status = 'Open'"]
    values = {}
    if branch:
        conditions.append(
            "((ae.policy is not null and p.branch = %(branch)s) or (ae.policy is null and 1=1))"
        )
        values["branch"] = branch
    if office_branch:
        conditions.append(
            "ae.customer in (select name from `tabAT Customer` where office_branch = %(office_branch)s)"
        )
        values["office_branch"] = office_branch
    if allowed_customers is not None:
        conditions.append("ae.customer in %(customers)s")
        values["customers"] = tuple(allowed_customers)
    return conditions, values


def _reconciliation_open_summary(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> dict:
    cache = _get_request_cache_bucket("at_dashboard_reconciliation_summary_cache")
    cache_key = (
        str(branch or ""),
        str(office_branch or ""),
        tuple(allowed_customers or []) if allowed_customers is not None else None,
    )
    if cache_key in cache:
        return dict(cache[cache_key])

    conditions = ["ri.status = 'Open'"]
    values = {}

    if branch:
        conditions.append(
            "((ae.policy is not null and p.branch = %(branch)s) or (ae.policy is null and 1=1))"
        )
        values["branch"] = branch
    if office_branch:
        conditions.append(
            "ae.customer in (select name from `tabAT Customer` where office_branch = %(office_branch)s)"
        )
        values["office_branch"] = office_branch
    if allowed_customers is not None:
        conditions.append("ae.customer in %(customers)s")
        values["customers"] = tuple(allowed_customers)

    row = frappe.db.sql(
        f"""
        select
            count(ri.name) as open_count,
            ifnull(sum(ri.difference_try), 0) as open_difference_try
        from `tabAT Reconciliation Item` ri
        left join `tabAT Accounting Entry` ae on ae.name = ri.accounting_entry
        left join `tabAT Policy` p on p.name = ae.policy
        where {" and ".join(conditions)}
        """,
        values=values,
        as_dict=True,
    )[0]
    result = row or {"open_count": 0, "open_difference_try": 0}
    cache[cache_key] = dict(result)
    return result


def _get_reconciliation_open_rows_preview(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
    limit: int = 8,
) -> list[dict]:
    conditions, values = _reconciliation_filter_conditions(
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )
    rows = frappe.db.sql(
        f"""
        select
            ri.name,
            ri.source_doctype,
            ri.source_name,
            ri.status,
            ri.mismatch_type,
            ri.difference_try
        from `tabAT Reconciliation Item` ri
        left join `tabAT Accounting Entry` ae on ae.name = ri.accounting_entry
        left join `tabAT Policy` p on p.name = ae.policy
        where {" and ".join(conditions)}
        order by ri.modified desc
        limit %(limit)s
        """,
        values={**values, "limit": cint(limit)},
        as_dict=True,
    )
    return rows


def _get_request_cache_bucket(cache_name: str) -> dict:
    cache = getattr(frappe.local, cache_name, None)
    if cache is None:
        cache = {}
        setattr(frappe.local, cache_name, cache)
    return cache
