from __future__ import annotations

import frappe


def build_dashboard_kpis_payload(
    *,
    from_date,
    to_date,
    branch,
    months: int,
    allowed_customers,
    scope_meta: dict,
    build_policy_where_fn,
    dashboard_cards_summary_fn,
    build_lead_where_fn,
    monthly_commission_trend_fn,
) -> dict:
    policy_where, policy_values = build_policy_where_fn(
        from_date=from_date,
        to_date=to_date,
        branch=branch,
        allowed_customers=allowed_customers,
    )

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

    company_policy_where, company_policy_values = build_policy_where_fn(
        from_date=from_date,
        to_date=to_date,
        branch=branch,
        allowed_customers=allowed_customers,
        table_alias="p",
    )
    top_companies = frappe.db.sql(
        f"""
        select
            p.insurance_company as insurance_company,
            ifnull(ic.company_name, p.insurance_company) as company_name,
            count(p.name) as policy_count,
            ifnull(sum(p.gwp_try), 0) as total_gwp_try,
            ifnull(sum(ifnull(p.commission_amount, p.commission)), 0) as total_commission
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
        allowed_customers=allowed_customers,
    )

    lead_where, lead_values = build_lead_where_fn(branch=branch, allowed_customers=allowed_customers)
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

    trend = monthly_commission_trend_fn(months=months, branch=branch, allowed_customers=allowed_customers)

    return {
        "cards": {**cards},
        "lead_status": lead_status_rows,
        "policy_status": policy_status_rows,
        "top_companies": top_companies,
        "commission_trend": trend,
        "meta": scope_meta,
    }

