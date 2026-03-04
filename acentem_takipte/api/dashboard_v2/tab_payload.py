from __future__ import annotations

import frappe
from frappe.utils import cint, flt


def build_dashboard_tab_sections(
    *,
    tab_key: str,
    from_date,
    to_date,
    branch,
    months: int,
    allowed_customers,
    build_offer_where_fn,
    build_lead_where_fn,
    build_policy_where_fn,
    build_payment_where_fn,
    get_offer_preview_rows_fn,
    get_lead_preview_rows_fn,
    get_policy_preview_rows_fn,
    get_top_companies_rows_fn,
    get_renewal_task_preview_rows_fn,
    get_payment_preview_rows_fn,
    get_reconciliation_open_rows_preview_fn,
    monthly_commission_trend_fn,
    renewal_status_and_buckets_fn,
    reconciliation_open_summary_fn,
) -> dict:
    metrics: dict = {}
    series: dict = {}
    previews: dict = {}

    if tab_key in {"daily", "sales"}:
        offer_where, offer_values = build_offer_where_fn(
            from_date=from_date,
            to_date=to_date,
            branch=branch,
            allowed_customers=allowed_customers,
        )
        offer_status_rows = frappe.db.sql(
            f"""
            select status, count(name) as total
            from `tabAT Offer`
            where {offer_where}
            group by status
            order by status asc
            """,
            values=offer_values,
            as_dict=True,
        )
        offer_status_map = {str(row.get("status") or ""): cint(row.get("total") or 0) for row in offer_status_rows}
        converted_count = cint(offer_status_map.get("Converted") or 0)
        accepted_count = cint(offer_status_map.get("Accepted") or 0)
        sent_count = cint(offer_status_map.get("Sent") or 0)
        rejected_count = cint(offer_status_map.get("Rejected") or 0)
        ready_offer_count = sent_count + accepted_count
        acceptance_denominator = sent_count + accepted_count + rejected_count
        conversion_denominator = ready_offer_count + converted_count
        metrics.update(
            {
                "ready_offer_count": ready_offer_count,
                "accepted_offer_count": accepted_count,
                "converted_offer_count": converted_count,
                "offer_acceptance_rate": round((accepted_count / acceptance_denominator) * 100, 2)
                if acceptance_denominator
                else 0.0,
                "offer_conversion_rate": round((converted_count / conversion_denominator) * 100, 2)
                if conversion_denominator
                else 0.0,
            }
        )
        series["offer_status"] = offer_status_rows
        if tab_key == "daily":
            previews["action_offers"] = get_offer_preview_rows_fn(
                where_clause=offer_where,
                values=offer_values,
                limit=5,
                ready_only=True,
            )
        if tab_key == "sales":
            previews["offers"] = get_offer_preview_rows_fn(
                where_clause=offer_where,
                values=offer_values,
                limit=8,
            )
            lead_where, lead_values = build_lead_where_fn(branch=branch, allowed_customers=allowed_customers)
            previews["leads"] = get_lead_preview_rows_fn(lead_where=lead_where, values=lead_values, limit=8)
            policy_where, policy_values = build_policy_where_fn(
                from_date=from_date,
                to_date=to_date,
                branch=branch,
                allowed_customers=allowed_customers,
            )
            previews["policies"] = get_policy_preview_rows_fn(
                where_clause=policy_where,
                values=policy_values,
                limit=6,
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
            series["lead_status"] = lead_status_rows
            company_policy_where, company_policy_values = build_policy_where_fn(
                from_date=from_date,
                to_date=to_date,
                branch=branch,
                allowed_customers=allowed_customers,
                table_alias="p",
            )
            series["top_companies"] = get_top_companies_rows_fn(
                where_clause=company_policy_where,
                values=company_policy_values,
                limit=5,
            )
            series["commission_trend"] = monthly_commission_trend_fn(
                months=months,
                branch=branch,
                allowed_customers=allowed_customers,
            )

    if tab_key in {"daily", "renewals"}:
        renewal_payload = renewal_status_and_buckets_fn(branch=branch, allowed_customers=allowed_customers)
        metrics.update(
            {
                "renewal_overdue_count": cint(renewal_payload["buckets"].get("overdue") or 0),
                "renewal_due7_count": cint(renewal_payload["buckets"].get("due7") or 0),
                "renewal_due30_count": cint(renewal_payload["buckets"].get("due30") or 0),
            }
        )
        series["renewal_status"] = renewal_payload["status_rows"]
        series["renewal_buckets"] = renewal_payload["buckets"]
        previews["renewal_tasks"] = get_renewal_task_preview_rows_fn(
            branch=branch,
            allowed_customers=allowed_customers,
            statuses=["Open", "In Progress"],
            limit=8 if tab_key == "renewals" else 6,
        )

    if tab_key in {"daily", "collections"}:
        payment_where, payment_values = build_payment_where_fn(
            from_date=from_date,
            to_date=to_date,
            branch=branch,
            allowed_customers=allowed_customers,
        )
        payment_status_rows = frappe.db.sql(
            f"""
            select status, count(name) as total
            from `tabAT Payment`
            where {payment_where}
            group by status
            order by status asc
            """,
            values=payment_values,
            as_dict=True,
        )
        payment_direction_rows = frappe.db.sql(
            f"""
            select payment_direction, count(name) as total,
                   ifnull(sum(case when status = 'Paid' then amount_try else 0 end), 0) as paid_amount_try
            from `tabAT Payment`
            where {payment_where}
            group by payment_direction
            order by payment_direction asc
            """,
            values=payment_values,
            as_dict=True,
        )
        reco_open = reconciliation_open_summary_fn(branch=branch, allowed_customers=allowed_customers)
        metrics.update(
            {
                "reconciliation_open_count": cint(reco_open.get("open_count") or 0),
                "reconciliation_open_difference_try": flt(reco_open.get("open_difference_try") or 0),
            }
        )
        series["payment_status"] = payment_status_rows
        series["payment_direction"] = payment_direction_rows
        previews["payments"] = get_payment_preview_rows_fn(
            where_clause=payment_where,
            values=payment_values,
            limit=8,
        )
        previews["reconciliation_rows"] = get_reconciliation_open_rows_preview_fn(
            branch=branch,
            allowed_customers=allowed_customers,
            limit=8,
        )

    return {
        "metrics": metrics,
        "series": series,
        "previews": previews,
    }

