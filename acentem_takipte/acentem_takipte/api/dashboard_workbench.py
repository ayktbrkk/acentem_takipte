from __future__ import annotations

import frappe
from frappe.utils import add_days, cint, getdate, nowdate

from acentem_takipte.acentem_takipte.api.dashboard_scopes import (
    _get_scoped_policy_names,
)
from acentem_takipte.acentem_takipte.utils.commissions import commission_sql_expr


def _get_request_cache_bucket(cache_name: str) -> dict:
    cache = getattr(frappe.local, cache_name, None)
    if cache is None:
        cache = {}
        setattr(frappe.local, cache_name, cache)
    return cache


def _build_offer_where(
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
        conditions.append("offer_date >= %(from_date)s")
        values["from_date"] = getdate(from_date)
    if to_date:
        conditions.append("offer_date <= %(to_date)s")
        values["to_date"] = getdate(to_date)
    if branch:
        conditions.append("branch = %(branch)s")
        values["branch"] = branch
    if office_branch:
        conditions.append(
            "customer in (select name from `tabAT Customer` where office_branch = %(office_branch)s)"
        )
        values["office_branch"] = office_branch
    if allowed_customers is not None:
        conditions.append("customer in %(customers)s")
        values["customers"] = tuple(allowed_customers)

    return " and ".join(conditions), values


def _build_offer_filters(
    *,
    from_date: str | None,
    to_date: str | None,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> list:
    filters: list = []
    if from_date:
        filters.append(["offer_date", ">=", getdate(from_date)])
    if to_date:
        filters.append(["offer_date", "<=", getdate(to_date)])
    if branch:
        filters.append(["branch", "=", branch])
    if office_branch:
        filters.append(
            [
                "customer",
                "in",
                _get_scoped_customer_names(
                    office_branch=office_branch, allowed_customers=allowed_customers
                )
                or ["__none__"],
            ]
        )
    elif allowed_customers is not None:
        filters.append(["customer", "in", allowed_customers or ["__none__"]])
    return filters


def _build_policy_filters(
    *,
    from_date: str | None,
    to_date: str | None,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> list:
    filters: list = []
    if from_date:
        filters.append(["issue_date", ">=", getdate(from_date)])
    if to_date:
        filters.append(["issue_date", "<=", getdate(to_date)])
    if branch:
        filters.append(["branch", "=", branch])
    if office_branch:
        filters.append(["office_branch", "=", office_branch])
    if allowed_customers is not None:
        filters.append(["customer", "in", allowed_customers or ["__none__"]])
    return filters


def _build_lead_filters(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> list:
    filters: list = []
    if branch:
        filters.append(["branch", "=", branch])
    if office_branch:
        filters.append(["office_branch", "=", office_branch])
    if allowed_customers is not None:
        filters.append(["customer", "in", allowed_customers or ["__none__"]])
    return filters


def _build_payment_filters(
    *,
    from_date: str | None,
    to_date: str | None,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> list:
    filters: list = []
    if from_date:
        filters.append(["payment_date", ">=", getdate(from_date)])
    if to_date:
        filters.append(["payment_date", "<=", getdate(to_date)])
    if office_branch:
        filters.append(["office_branch", "=", office_branch])
    if branch or allowed_customers is not None:
        policy_names = _get_scoped_policy_names(
            branch=branch,
            office_branch=office_branch,
            allowed_customers=allowed_customers,
        )
        filters.append(["policy", "in", policy_names or ["__none__"]])
    return filters


def _build_claim_filters(
    *,
    from_date: str | None,
    to_date: str | None,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
    open_only: bool = False,
) -> list:
    filters: list = []
    if from_date:
        filters.append(["reported_date", ">=", getdate(from_date)])
    if to_date:
        filters.append(["reported_date", "<=", getdate(to_date)])
    if office_branch:
        filters.append(["office_branch", "=", office_branch])
    if branch or allowed_customers is not None:
        policy_names = _get_scoped_policy_names(
            branch=branch,
            office_branch=office_branch,
            allowed_customers=allowed_customers,
        )
        filters.append(["policy", "in", policy_names or ["__none__"]])
    if open_only:
        filters.append(["claim_status", "in", ["Open", "Under Review", "Approved"]])
    return filters


def _get_offer_preview_rows(
    *,
    where_clause: str | None = None,
    values: dict | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    branch: str | None = None,
    office_branch: str | None = None,
    allowed_customers: list[str] | None = None,
    limit: int,
    ready_only: bool = False,
) -> list[dict]:
    if where_clause:
        extra_ready_filter = " and status in ('Sent', 'Accepted')" if ready_only else ""
        rows = frappe.db.sql(
            f"""
            select
                name,
                customer,
                insurance_company,
                status,
                currency,
                valid_until,
                gross_premium,
                converted_policy
            from `tabAT Offer`
            where {where_clause}{extra_ready_filter}
            order by modified desc
            limit %(limit)s
            """,
            values={
                **(values or {}),
                "limit": max(cint(limit), 1) * (3 if ready_only else 1),
            },
            as_dict=True,
        )
        if ready_only:
            rows = [row for row in rows if not row.get("converted_policy")]
        return rows[: max(cint(limit), 1)]

    filters = _build_offer_filters(
        from_date=from_date,
        to_date=to_date,
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )
    if ready_only:
        filters.append(["status", "in", ["Sent", "Accepted"]])
    rows = frappe.get_all(
        "AT Offer",
        filters=filters,
        fields=[
            "name",
            "customer",
            "insurance_company",
            "status",
            "currency",
            "valid_until",
            "gross_premium",
            "converted_policy",
        ],
        order_by="modified desc",
        limit_page_length=max(cint(limit), 1) * (3 if ready_only else 1),
    )
    if ready_only:
        rows = [row for row in rows if not row.get("converted_policy")]
    return rows[: max(cint(limit), 1)]


def _get_policy_preview_rows(
    *,
    where_clause: str | None = None,
    values: dict | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    branch: str | None = None,
    office_branch: str | None = None,
    allowed_customers: list[str] | None = None,
    limit: int,
) -> list[dict]:
    if where_clause:
        return frappe.db.sql(
            f"""
            select
                name,
                policy_no,
                customer,
                status,
                currency,
                issue_date,
                gross_premium,
                commission_amount,
                commission
            from `tabAT Policy`
            where {where_clause}
            order by modified desc
            limit %(limit)s
            """,
            values={**(values or {}), "limit": max(cint(limit), 1)},
            as_dict=True,
        )

    return frappe.get_all(
        "AT Policy",
        filters=_build_policy_filters(
            from_date=from_date,
            to_date=to_date,
            branch=branch,
            office_branch=office_branch,
            allowed_customers=allowed_customers,
        ),
        fields=[
            "name",
            "policy_no",
            "customer",
            "status",
            "currency",
            "issue_date",
            "gross_premium",
            "commission_amount",
            "commission",
        ],
        order_by="modified desc",
        limit_page_length=max(cint(limit), 1),
    )


def _get_top_companies_rows(
    *, where_clause: str, values: dict, limit: int = 5
) -> list[dict]:
    rows = frappe.db.sql(
        f"""
        select
            p.insurance_company as insurance_company,
            ifnull(ic.company_name, p.insurance_company) as company_name,
            count(p.name) as policy_count,
            ifnull(sum(p.gwp_try), 0) as total_gwp_try,
            ifnull(sum({commission_sql_expr("p.")}), 0) as total_commission
        from `tabAT Policy` p
        left join `tabAT Insurance Company` ic on ic.name = p.insurance_company
        where {where_clause}
        group by p.insurance_company, ic.company_name
        order by total_gwp_try desc
        limit %(limit)s
        """,
        values={**(values or {}), "limit": cint(limit)},
        as_dict=True,
    )
    return rows


def _get_lead_preview_rows(
    *,
    lead_where: str | None = None,
    values: dict | None = None,
    branch: str | None = None,
    office_branch: str | None = None,
    allowed_customers: list[str] | None = None,
    limit: int,
) -> list[dict]:
    if lead_where:
        return frappe.db.sql(
            f"""
            select
                name,
                first_name,
                last_name,
                email,
                status,
                estimated_gross_premium,
                notes
            from `tabAT Lead`
            where {lead_where}
            order by modified desc
            limit %(limit)s
            """,
            values={**(values or {}), "limit": max(cint(limit), 1)},
            as_dict=True,
        )

    return frappe.get_all(
        "AT Lead",
        filters=_build_lead_filters(
            branch=branch,
            office_branch=office_branch,
            allowed_customers=allowed_customers,
        ),
        fields=[
            "name",
            "first_name",
            "last_name",
            "email",
            "status",
            "estimated_gross_premium",
            "notes",
        ],
        order_by="modified desc",
        limit_page_length=max(cint(limit), 1),
    )


def _get_payment_preview_rows(
    *,
    where_clause: str | None = None,
    values: dict | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    branch: str | None = None,
    office_branch: str | None = None,
    allowed_customers: list[str] | None = None,
    limit: int,
    order_by: str = "modified desc",
) -> list[dict]:
    if where_clause:
        return frappe.db.sql(
            f"""
            select
                name,
                payment_no,
                payment_direction,
                payment_purpose,
                status,
                payment_date,
                due_date,
                amount_try,
                customer,
                policy
            from `tabAT Payment`
            where {where_clause}
            order by {order_by}
            limit %(limit)s
            """,
            values={**(values or {}), "limit": max(cint(limit), 1)},
            as_dict=True,
        )

    return frappe.get_all(
        "AT Payment",
        filters=_build_payment_filters(
            from_date=from_date,
            to_date=to_date,
            branch=branch,
            office_branch=office_branch,
            allowed_customers=allowed_customers,
        ),
        fields=[
            "name",
            "payment_no",
            "payment_direction",
            "payment_purpose",
            "status",
            "payment_date",
            "due_date",
            "amount_try",
            "customer",
            "policy",
        ],
        order_by=order_by,
        limit_page_length=max(cint(limit), 1),
    )


def _get_renewal_task_preview_rows(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
    statuses: list[str] | None = None,
    limit: int = 8,
) -> list[dict]:
    filters = {}
    if statuses:
        filters["status"] = ["in", statuses]
    if office_branch:
        filters["office_branch"] = office_branch
    if branch or allowed_customers is not None:
        policy_names = _get_scoped_policy_names(
            branch=branch,
            office_branch=None,
            allowed_customers=allowed_customers,
        )
        filters["policy"] = ["in", policy_names or ["__none__"]]

    return frappe.get_list(
        "AT Renewal Task",
        fields=[
            "name",
            "policy",
            "status",
            "due_date",
            "renewal_date",
            "customer",
            "assigned_to",
            "outcome_record",
        ],
        filters=filters,
        order_by="due_date asc",
        limit_page_length=max(cint(limit), 1),
    )


def _get_offer_waiting_renewal_summary(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
    limit: int = 20,
) -> dict:
    conditions = [
        "rt.status in ('Open', 'In Progress')",
        "(rt.outcome_record is null or ifnull(ro.offer, '') = '')",
    ]
    values: dict[str, object] = {"limit": max(cint(limit), 1)}

    if office_branch:
        conditions.append("rt.office_branch = %(office_branch)s")
        values["office_branch"] = office_branch
    if branch or allowed_customers is not None:
        policy_names = _get_scoped_policy_names(
            branch=branch,
            office_branch=None,
            allowed_customers=allowed_customers,
        )
        conditions.append("rt.policy in %(policies)s")
        values["policies"] = tuple(policy_names or ["__none__"])
    elif allowed_customers is not None:
        conditions.append("rt.customer in %(customers)s")
        values["customers"] = tuple(allowed_customers or ["__none__"])

    where_clause = " and ".join(["1=1", *conditions])
    count_row = frappe.db.sql(
        f"""
        select count(rt.name) as total
        from `tabAT Renewal Task` rt
        left join `tabAT Renewal Outcome` ro on ro.name = rt.outcome_record
        where {where_clause}
        """,
        values=values,
        as_dict=True,
    )
    rows = frappe.db.sql(
        f"""
        select
            rt.name,
            rt.policy,
            rt.customer,
            rt.status,
            rt.due_date,
            rt.renewal_date,
            rt.assigned_to,
            rt.outcome_record
        from `tabAT Renewal Task` rt
        left join `tabAT Renewal Outcome` ro on ro.name = rt.outcome_record
        where {where_clause}
        order by rt.due_date asc, rt.modified desc
        limit %(limit)s
        """,
        values=values,
        as_dict=True,
    )
    total = cint((count_row[0] or {}).get("total") if count_row else 0)
    return {
        "count": total,
        "rows": rows,
    }


def _renewal_status_and_buckets(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> dict:
    cache = _get_request_cache_bucket("at_dashboard_renewal_status_cache")
    cache_key = (
        str(branch or ""),
        str(office_branch or ""),
        tuple(allowed_customers or []) if allowed_customers is not None else None,
    )
    if cache_key in cache:
        return {
            "status_rows": [dict(item) for item in cache[cache_key]["status_rows"]],
            "buckets": dict(cache[cache_key]["buckets"]),
            "retention": dict(cache[cache_key]["retention"]),
        }

    filters = {}
    if office_branch:
        filters["office_branch"] = office_branch
    if branch or allowed_customers is not None:
        policy_names = _get_scoped_policy_names(
            branch=branch,
            office_branch=None,
            allowed_customers=allowed_customers,
        )
        filters["policy"] = ["in", policy_names or ["__none__"]]

    where_clause = ["1=1"]
    values = {}
    if office_branch:
        where_clause.append("rt.office_branch = %(office_branch)s")
        values["office_branch"] = office_branch
    if branch or allowed_customers is not None:
        where_clause.append("rt.policy in %(policies)s")
        values["policies"] = tuple(policy_names or ["__none__"])

    status_rows_raw = frappe.db.sql(
        f"""
        select rt.status, count(rt.name) as total
        from `tabAT Renewal Task` rt
        where {" and ".join(where_clause)}
        group by rt.status
        """,
        values=values,
        as_dict=True,
    )

    status_counts = {
        "Open": 0,
        "In Progress": 0,
        "Done": 0,
        "Cancelled": 0,
    }
    buckets = {"overdue": 0, "due7": 0, "due30": 0}
    retention = {"renewed": 0, "lost": 0, "cancelled": 0, "rate": 0.0}
    today = getdate(nowdate())

    for row in status_rows_raw:
        status = _normalize_renewal_status(row.get("status"))
        if status in status_counts:
            status_counts[status] += int(row.get("total") or 0)

    bucket_rows = frappe.db.sql(
        f"""
        select rt.due_date, rt.renewal_date
        from `tabAT Renewal Task` rt
        where {" and ".join(where_clause)}
          and rt.status in ('Open', 'In Progress')
        """,
        values=values,
        as_dict=True,
    )
    for row in bucket_rows:
        due_date = row.get("due_date")
        if due_date:
            days_left = (getdate(due_date) - today).days
            if days_left < 0:
                buckets["overdue"] += 1
            elif days_left <= 7:
                buckets["due7"] += 1
            elif days_left <= 30:
                buckets["due30"] += 1
        due_value = row.get("due_date") or row.get("renewal_date")
        if not due_value:
            continue
        try:
            due_date = getdate(due_value)
        except Exception:
            continue
        delta = (due_date - today).days
        if delta < 0:
            buckets["overdue"] += 1
        elif delta <= 7:
            buckets["due7"] += 1
        elif delta <= 30:
            buckets["due30"] += 1

    outcome_filters = {}
    if office_branch:
        outcome_filters["office_branch"] = office_branch
    if branch or allowed_customers is not None:
        policy_names = _get_scoped_policy_names(
            branch=branch,
            office_branch=None,
            allowed_customers=allowed_customers,
        )
        outcome_filters["policy"] = ["in", policy_names or ["__none__"]]

    outcome_agg = frappe.get_all(
        "AT Renewal Outcome",
        fields=["outcome_status", "count(name) as total"],
        filters=outcome_filters,
        group_by="outcome_status",
    )
    for row in outcome_agg:
        outcome_status = str(row.get("outcome_status") or "").strip()
        total = int(row.get("total") or 0)
        if outcome_status == "Renewed":
            retention["renewed"] += total
        elif outcome_status == "Lost":
            retention["lost"] += total
        elif outcome_status == "Cancelled":
            retention["cancelled"] += total

    retention_base = retention["renewed"] + retention["lost"]
    if retention_base > 0:
        retention["rate"] = round((retention["renewed"] / retention_base) * 100, 2)

    status_rows = [
        {"status": key, "total": value} for key, value in status_counts.items()
    ]
    result = {"status_rows": status_rows, "buckets": buckets, "retention": retention}
    cache[cache_key] = {
        "status_rows": [dict(item) for item in status_rows],
        "buckets": dict(buckets),
        "retention": dict(retention),
    }
    return result


def _normalize_renewal_status(value: str | None) -> str:
    normalized = str(value or "").strip()
    if normalized == "Completed":
        return "Done"
    return normalized or "Open"


def _get_scoped_customer_names(
    *,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> list[str]:
    if office_branch:
        return [
            row.get("name")
            for row in frappe.get_list(
                "AT Customer",
                filters={"office_branch": office_branch},
                fields=["name"],
                limit_page_length=5000,
            )
            if row.get("name")
        ]
    if allowed_customers is not None:
        return list(allowed_customers)
    return []
