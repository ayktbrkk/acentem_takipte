from __future__ import annotations

import frappe
from frappe.utils import add_days, getdate
from acentem_takipte.acentem_takipte.utils.commissions import commission_sql_expr


def build_dashboard_kpis_payload(
    *,
    from_date,
    to_date,
    compare_from_date=None,
    compare_to_date=None,
    period_comparison: str | None = None,
    branch,
    office_branch=None,
    months: int,
    allowed_customers,
    scope_meta: dict,
    build_policy_where_fn,
    dashboard_cards_summary_fn,
    build_lead_where_fn,
    monthly_commission_trend_fn,
) -> dict:
    policy_scope_cache: dict[str, tuple[str, dict]] = {}

    def get_policy_scope(table_alias: str | None = None) -> tuple[str, dict]:
        cache_key = str(table_alias or "")
        cached = policy_scope_cache.get(cache_key)
        if cached:
            return cached
        scope = build_policy_where_fn(
            from_date=from_date,
            to_date=to_date,
            branch=branch,
            office_branch=office_branch,
            allowed_customers=allowed_customers,
            table_alias=table_alias,
        )
        policy_scope_cache[cache_key] = scope
        return scope

    policy_where, policy_values = get_policy_scope()

    policy_status_rows = frappe.db.sql(
        f"""
        select
            status,
            count(name) as total,
            ifnull(sum(gwp_try), 0) as total_gwp_try
        from `tabAT Policy`
        where {policy_where}
        group by status
        order by status asc
        """,
        values=policy_values,
        as_dict=True,
    )

    company_policy_where, company_policy_values = get_policy_scope("p")
    top_companies = frappe.db.sql(
        f"""
        select
            p.insurance_company as insurance_company,
            ifnull(ic.company_name, p.insurance_company) as company_name,
            count(p.name) as policy_count,
            ifnull(sum(p.gwp_try), 0) as total_gwp_try,
            ifnull(sum({commission_sql_expr("p.")}), 0) as total_commission
        from `tabAT Policy` p
        left join `tabAT Insurance Company` ic on ic.name = p.insurance_company
        where {company_policy_where}
        group by p.insurance_company, ic.company_name
        order by total_gwp_try desc
        limit 5
        """,
        values=company_policy_values,
        as_dict=True,
    )

    cards = dashboard_cards_summary_fn(
        from_date=from_date,
        to_date=to_date,
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )

    lead_where, lead_values = build_lead_where_fn(
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )
    lead_status_rows = frappe.db.sql(
        f"""
        select status, count(name) as total
        from `tabAT Lead`
        where {lead_where}
        group by status
        order by status asc
        """,
        values=lead_values,
        as_dict=True,
    )

    trend = monthly_commission_trend_fn(
        months=months,
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )

    comparison = _build_kpi_comparison_payload(
        from_date=from_date,
        to_date=to_date,
        compare_from_date=compare_from_date,
        compare_to_date=compare_to_date,
        period_comparison=period_comparison,
        current_cards=cards,
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
        dashboard_cards_summary_fn=dashboard_cards_summary_fn,
    )

    return {
        "cards": {**cards},
        "lead_status": lead_status_rows,
        "policy_status": policy_status_rows,
        "top_companies": top_companies,
        "commission_trend": trend,
        "comparison": comparison,
        "meta": scope_meta,
    }


def _build_kpi_comparison_payload(
    *,
    from_date,
    to_date,
    compare_from_date=None,
    compare_to_date=None,
    period_comparison: str | None,
    current_cards: dict,
    branch,
    office_branch,
    allowed_customers,
    dashboard_cards_summary_fn,
) -> dict:
    window = _resolve_comparison_window(
        from_date=from_date,
        to_date=to_date,
        compare_from_date=compare_from_date,
        compare_to_date=compare_to_date,
        period_comparison=period_comparison,
    )
    if not window:
        return {}

    compare_cards = dashboard_cards_summary_fn(
        from_date=window["from_date"],
        to_date=window["to_date"],
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )
    return {
        "mode": window["mode"],
        "label": window["label"],
        "from_date": window["from_date"],
        "to_date": window["to_date"],
        "cards": compare_cards,
        "delta": _build_card_delta_map(current_cards=current_cards, compare_cards=compare_cards),
    }


def _resolve_comparison_window(
    *,
    from_date,
    to_date,
    compare_from_date=None,
    compare_to_date=None,
    period_comparison: str | None,
) -> dict | None:
    if compare_from_date and compare_to_date:
        return {
            "mode": "custom",
            "label": "Custom comparison",
            "from_date": str(compare_from_date),
            "to_date": str(compare_to_date),
        }

    comparison_mode = str(period_comparison or "").strip().lower()
    if not comparison_mode or not from_date or not to_date:
        return None

    start_date = getdate(from_date)
    end_date = getdate(to_date)
    day_span = max((end_date - start_date).days, 0)

    if comparison_mode == "previous_period":
        compare_end = add_days(start_date, -1)
        compare_start = add_days(compare_end, -day_span)
        return {
            "mode": comparison_mode,
            "label": "Previous period",
            "from_date": compare_start.isoformat(),
            "to_date": compare_end.isoformat(),
        }

    if comparison_mode == "previous_month":
        previous_month_end = add_days(start_date.replace(day=1), -1)
        previous_month_start = previous_month_end.replace(day=1)
        return {
            "mode": comparison_mode,
            "label": "Previous month",
            "from_date": previous_month_start.isoformat(),
            "to_date": previous_month_end.isoformat(),
        }

    if comparison_mode == "previous_year":
        return {
            "mode": comparison_mode,
            "label": "Previous year",
            "from_date": start_date.replace(year=start_date.year - 1).isoformat(),
            "to_date": end_date.replace(year=end_date.year - 1).isoformat(),
        }

    return None


def _build_card_delta_map(*, current_cards: dict, compare_cards: dict) -> dict:
    delta_map: dict[str, dict] = {}
    for key, current_value in (current_cards or {}).items():
        if not isinstance(current_value, (int, float)):
            continue
        compare_value = compare_cards.get(key)
        if not isinstance(compare_value, (int, float)):
            continue
        delta_value = round(float(current_value) - float(compare_value), 2)
        delta_percent = None
        if compare_value:
            delta_percent = round((delta_value / float(compare_value)) * 100, 2)
        direction = "flat"
        if delta_value > 0:
            direction = "up"
        elif delta_value < 0:
            direction = "down"
        delta_map[key] = {
            "current": float(current_value),
            "previous": float(compare_value),
            "delta": delta_value,
            "delta_percent": delta_percent,
            "direction": direction,
        }
    return delta_map

