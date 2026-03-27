from __future__ import annotations

import frappe
from frappe.utils import add_days, cint, flt, nowdate

from acentem_takipte.acentem_takipte.utils.commissions import commission_sql_expr


def _get_request_cache_bucket(cache_name: str) -> dict:
    cache = getattr(frappe.local, cache_name, None)
    if cache is None:
        cache = {}
        setattr(frappe.local, cache_name, cache)
    return cache


def _customer_portfolio_summary_for_names(customer_names: list[str]) -> dict[str, dict]:
    requested = []
    seen = set()
    for item in list(customer_names or [])[:200]:
        name = str(item or "").strip()
        if not name or name in seen:
            continue
        requested.append(name)
        seen.add(name)
    if not requested:
        return {}

    summary_map: dict[str, dict] = {
        name: {
            "active_policy_count": 0,
            "open_offer_count": 0,
            "active_policy_gross_premium": 0.0,
        }
        for name in requested
    }

    values = {"customers": tuple(requested)}

    policy_rows = frappe.db.sql(
        """
        select
            customer,
            count(name) as active_policy_count,
            ifnull(sum(gross_premium), 0) as active_policy_gross_premium
        from `tabAT Policy`
        where customer in %(customers)s
            and status in ('Active', 'KYT')
        group by customer
        """,
        values=values,
        as_dict=True,
    )
    for row in policy_rows:
        customer = row.get("customer")
        if customer not in summary_map:
            continue
        summary_map[customer]["active_policy_count"] = cint(
            row.get("active_policy_count")
        )
        summary_map[customer]["active_policy_gross_premium"] = flt(
            row.get("active_policy_gross_premium")
        )

    offer_rows = frappe.db.sql(
        """
        select
            customer,
            count(name) as open_offer_count
        from `tabAT Offer`
        where customer in %(customers)s
            and status in ('Draft', 'Sent', 'Accepted')
            and ifnull(converted_policy, '') = ''
        group by customer
        """,
        values=values,
        as_dict=True,
    )
    for row in offer_rows:
        customer = row.get("customer")
        if customer not in summary_map:
            continue
        summary_map[customer]["open_offer_count"] = cint(row.get("open_offer_count"))

    return summary_map


def _monthly_commission_trend(
    months: int,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> list[dict]:
    cache = _get_request_cache_bucket("at_dashboard_monthly_commission_trend_cache")
    cache_key = (
        months,
        str(branch or ""),
        str(office_branch or ""),
        tuple(allowed_customers or []) if allowed_customers is not None else None,
    )
    if cache_key in cache:
        return list(cache[cache_key])

    conditions = []
    values = {"months": months}

    if branch:
        conditions.append("branch = %(branch)s")
        values["branch"] = branch
    if office_branch:
        conditions.append("office_branch = %(office_branch)s")
        values["office_branch"] = office_branch

    if allowed_customers is not None:
        if not allowed_customers:
            return []
        conditions.append("customer in %(customers)s")
        values["customers"] = tuple(allowed_customers)

    where_clause = " and ".join(conditions)
    if where_clause:
        where_clause = f"and {where_clause}"

    rows = frappe.db.sql(
        f"""
        select
            date_format(issue_date, '%%Y-%%m') as month_key,
            ifnull(sum({commission_sql_expr()}), 0) as total_commission,
            ifnull(sum(gwp_try), 0) as total_gwp_try
        from `tabAT Policy`
        where issue_date >= date_sub(curdate(), interval %(months)s month)
            {where_clause}
        group by month_key
        order by month_key asc
        """,
        values=values,
        as_dict=True,
    )
    cache[cache_key] = list(rows)
    return rows


def _dashboard_cards_summary(
    *,
    from_date: str | None,
    to_date: str | None,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
    build_policy_where_fn,
    build_payment_filters_fn,
    build_claim_filters_fn,
    get_scoped_policy_names_fn,
    get_request_cache_bucket_fn=None,
) -> dict:
    get_request_cache_bucket_fn = get_request_cache_bucket_fn or _get_request_cache_bucket
    cache = get_request_cache_bucket_fn("at_dashboard_cards_summary_cache")
    cache_key = (
        str(from_date or ""),
        str(to_date or ""),
        str(branch or ""),
        str(office_branch or ""),
        tuple(allowed_customers or []) if allowed_customers is not None else None,
    )
    if cache_key in cache:
        return dict(cache[cache_key])

    # Redis cross-request cache (60s TTL) for KPI cards
    redis_key = f"at_dashboard_kpi::{frappe.session.user}::{hash(cache_key)}"
    redis_cached = frappe.cache().get_value(redis_key)
    if redis_cached:
        cache[cache_key] = dict(redis_cached)
        return dict(redis_cached)

    policy_where, policy_values = build_policy_where_fn(
        from_date=from_date,
        to_date=to_date,
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )
    totals = frappe.db.sql(
        f"""
        select
            ifnull(sum(gwp_try), 0) as total_gwp_try,
            ifnull(sum({commission_sql_expr()}), 0) as total_commission,
            ifnull(avg(case when gross_premium > 0 then ({commission_sql_expr()} / gross_premium) * 100 else null end), 0) as avg_commission_rate,
            count(name) as total_policies
        from `tabAT Policy`
        where {policy_where}
        """,
        values=policy_values,
        as_dict=True,
    )[0]

    renewal_filters = {
        "status": ["in", ["Open", "In Progress"]],
        "renewal_date": ["<=", add_days(nowdate(), 30)],
    }
    if office_branch:
        renewal_filters["office_branch"] = office_branch
    policy_names = get_scoped_policy_names_fn(
        branch=branch,
        office_branch=None,
        allowed_customers=allowed_customers,
    )
    if branch or allowed_customers is not None:
        renewal_filters["policy"] = ["in", policy_names or ["__none__"]]
    pending_renewals = frappe.db.count("AT Renewal Task", filters=renewal_filters)

    payment_rows = frappe.get_all(
        "AT Payment",
        filters=build_payment_filters_fn(
            from_date=from_date,
            to_date=to_date,
            branch=branch,
            office_branch=office_branch,
            allowed_customers=allowed_customers,
        ),
        fields=[
            "payment_direction",
            "status",
            "sum(amount_try) as total_amount",
        ],
        group_by="payment_direction, status",
    )
    payment_totals = {
        "collected_try": sum(
            flt(row.get("total_amount") or 0)
            for row in payment_rows
            if row.get("payment_direction") == "Inbound" and row.get("status") == "Paid"
        ),
        "payout_try": sum(
            flt(row.get("total_amount") or 0)
            for row in payment_rows
            if row.get("payment_direction") == "Outbound"
            and row.get("status") == "Paid"
        ),
    }

    open_claims = frappe.db.count(
        "AT Claim",
        filters=build_claim_filters_fn(
            from_date=from_date,
            to_date=to_date,
            branch=branch,
            office_branch=office_branch,
            allowed_customers=allowed_customers,
            open_only=True,
        ),
    )

    result = {
        "total_gwp_try": float(totals.get("total_gwp_try") or 0),
        "total_commission": float(totals.get("total_commission") or 0),
        "avg_commission_rate": float(totals.get("avg_commission_rate") or 0),
        "total_policies": int(totals.get("total_policies") or 0),
        "pending_renewals": int(pending_renewals or 0),
        "collected_try": float(payment_totals.get("collected_try") or 0),
        "payout_try": float(payment_totals.get("payout_try") or 0),
        "open_claims": int(open_claims or 0),
    }
    cache[cache_key] = dict(result)
    # Redis cross-request cache (60s TTL) for KPI cards
    frappe.cache().set_value(redis_key, result, expires_in_sec=60)
    return result
