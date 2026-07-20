from __future__ import annotations

from typing import Any

import frappe

from acentem_takipte.acentem_takipte.services.branches import (
    normalize_requested_office_branch,
)
from acentem_takipte.acentem_takipte.utils.commissions import commission_sql_expr


def normalize_report_filters(
    filters: dict[str, Any] | str | None = None,
) -> dict[str, Any]:
    payload = _coerce_filter_payload(filters)
    normalized = {
        "from_date": _as_text(payload.get("from_date")),
        "to_date": _as_text(payload.get("to_date")),
        "branch": _as_text(payload.get("branch")),
        "office_branch": normalize_requested_office_branch(
            payload.get("office_branch")
        ),
        "status": _as_text(payload.get("status")),
        "insurance_company": _as_text(payload.get("insurance_company")),
        "sales_entity": _as_text(payload.get("sales_entity")),
        "policy_no": _as_text(payload.get("policy_no")),
        "customer_tax_id": _as_text(payload.get("customer_tax_id")),
        "granularity": _as_text(payload.get("granularity")),
    }
    return {key: value for key, value in normalized.items() if value not in {None, ""}}


def build_policy_report_filters(
    filters: dict[str, Any] | None = None,
) -> dict[str, Any]:
    normalized = normalize_report_filters(filters)
    query_filters: dict[str, Any] = {}
    if normalized.get("branch"):
        query_filters["branch"] = normalized["branch"]
    if normalized.get("office_branch"):
        query_filters["office_branch"] = normalized["office_branch"]
    if normalized.get("status"):
        query_filters["status"] = normalized["status"]
    if normalized.get("insurance_company"):
        query_filters["insurance_company"] = normalized["insurance_company"]
    if normalized.get("sales_entity"):
        query_filters["sales_entity"] = normalized["sales_entity"]
    if normalized.get("from_date") and normalized.get("to_date"):
        query_filters["issue_date"] = [
            "between",
            [normalized["from_date"], normalized["to_date"]],
        ]
    elif normalized.get("from_date"):
        query_filters["issue_date"] = [">=", normalized["from_date"]]
    elif normalized.get("to_date"):
        query_filters["issue_date"] = ["<=", normalized["to_date"]]
    return query_filters


def build_payment_report_filters(
    filters: dict[str, Any] | None = None,
) -> dict[str, Any]:
    normalized = normalize_report_filters(filters)
    query_filters: dict[str, Any] = {}
    if normalized.get("office_branch"):
        query_filters["office_branch"] = normalized["office_branch"]
    if normalized.get("branch"):
        policy_names = _policy_names_for_branch(normalized["branch"])
        query_filters["policy"] = ["in", policy_names or ["__none__"]]
    if normalized.get("status"):
        query_filters["status"] = normalized["status"]
    if normalized.get("sales_entity"):
        query_filters["sales_entity"] = normalized["sales_entity"]
    if normalized.get("from_date") and normalized.get("to_date"):
        query_filters["due_date"] = [
            "between",
            [normalized["from_date"], normalized["to_date"]],
        ]
    elif normalized.get("from_date"):
        query_filters["due_date"] = [">=", normalized["from_date"]]
    elif normalized.get("to_date"):
        query_filters["due_date"] = ["<=", normalized["to_date"]]
    return query_filters


def _policy_names_for_branch(branch: str | None) -> list[str]:
    branch_name = _as_text(branch)
    if not branch_name:
        return []
    cache = getattr(frappe.local, "_at_reporting_policy_cache", None)
    if cache is None:
        cache = {}
        setattr(frappe.local, "_at_reporting_policy_cache", cache)
    if branch_name not in cache:
        # unbounded: policy names by branch for reporting cache, filtered by branch - expected max ~50k rows
        cache[branch_name] = frappe.get_all(
            "AT Policy",
            filters={"branch": branch_name},
            pluck="name",
            limit_page_length=0,
        )
    return list(cache.get(branch_name) or [])


def get_policy_list_report_rows(
    filters: dict[str, Any] | None = None, *, limit: int = 500
) -> list[dict[str, Any]]:
    normalized_filters = normalize_report_filters(filters) if filters else {}
    granularity = normalized_filters.get("granularity", "")

    if granularity in ("daily", "monthly", "yearly"):
        # Return grouped data by time period
        return _get_policy_list_grouped_rows(normalized_filters, granularity, limit)

    # Default: return individual policy rows with linked customer/sales names
    where_parts = ["1=1"]
    params: list[Any] = []

    if normalized_filters.get("branch"):
        where_parts.append("p.branch = %s")
        params.append(normalized_filters["branch"])

    if normalized_filters.get("office_branch"):
        where_parts.append("p.office_branch = %s")
        params.append(normalized_filters["office_branch"])

    if normalized_filters.get("status"):
        where_parts.append("p.status = %s")
        params.append(normalized_filters["status"])

    if normalized_filters.get("insurance_company"):
        where_parts.append("p.insurance_company = %s")
        params.append(normalized_filters["insurance_company"])

    if normalized_filters.get("sales_entity"):
        where_parts.append("p.sales_entity = %s")
        params.append(normalized_filters["sales_entity"])

    if normalized_filters.get("policy_no"):
        where_parts.append("p.policy_no LIKE %s")
        params.append(f"%{normalized_filters['policy_no']}%")

    if normalized_filters.get("customer_tax_id"):
        where_parts.append("c.tax_id LIKE %s")
        params.append(f"%{normalized_filters['customer_tax_id']}%")

    if normalized_filters.get("from_date"):
        where_parts.append("p.issue_date >= %s")
        params.append(normalized_filters["from_date"])

    if normalized_filters.get("to_date"):
        where_parts.append("p.issue_date <= %s")
        params.append(normalized_filters["to_date"])

    where_clause = " AND ".join(where_parts)

    sql = f"""
        SELECT
            p.name,
            p.policy_no,
            p.customer,
            COALESCE(c.full_name, p.customer) AS customer_full_name,
            COALESCE(c.tax_id, '') AS customer_tax_id,
            p.sales_entity,
            COALESCE(se.full_name, p.sales_entity) AS sales_entity_full_name,
            p.insurance_company,
            p.branch,
            p.office_branch,
            p.status,
            p.issue_date,
            p.start_date,
            p.end_date,
            p.gross_premium,
            p.net_premium,
            p.commission_amount
        FROM `tabAT Policy` p
        LEFT JOIN `tabAT Customer` c ON c.name = p.customer
        LEFT JOIN `tabAT Sales Entity` se ON se.name = p.sales_entity
        WHERE {where_clause}
        ORDER BY p.issue_date DESC, p.modified DESC
        LIMIT {max(int(limit or 500), 1)}
    """

    return frappe.db.sql(sql, params, as_dict=True)


def _get_policy_list_grouped_rows(
    normalized_filters: dict[str, Any], granularity: str, limit: int = 500
) -> list[dict[str, Any]]:
    """Get policy list data grouped by date period (daily, monthly, yearly)."""

    # Determine SQL date format and label format
    if granularity == "daily":
        date_format = "%Y-%m-%d"
        label_format = "%d.%m.%Y"
    elif granularity == "monthly":
        date_format = "%Y-%m"
        label_format = "%m.%Y"
    else:  # yearly
        date_format = "%Y"
        label_format = "%Y"

    # Build WHERE clause filters
    where_parts = ["1=1"]
    params = []

    if normalized_filters.get("branch"):
        where_parts.append("`tabAT Policy`.branch = %s")
        params.append(normalized_filters["branch"])

    if normalized_filters.get("office_branch"):
        where_parts.append("`tabAT Policy`.office_branch = %s")
        params.append(normalized_filters["office_branch"])

    if normalized_filters.get("status"):
        where_parts.append("`tabAT Policy`.status = %s")
        params.append(normalized_filters["status"])

    if normalized_filters.get("insurance_company"):
        where_parts.append("`tabAT Policy`.insurance_company = %s")
        params.append(normalized_filters["insurance_company"])

    if normalized_filters.get("sales_entity"):
        where_parts.append("`tabAT Policy`.sales_entity = %s")
        params.append(normalized_filters["sales_entity"])

    if normalized_filters.get("policy_no"):
        where_parts.append("`tabAT Policy`.policy_no LIKE %s")
        params.append(f"%{normalized_filters['policy_no']}%")

    if normalized_filters.get("customer_tax_id"):
        where_parts.append("customer.tax_id LIKE %s")
        params.append(f"%{normalized_filters['customer_tax_id']}%")

    # Date range filters
    if normalized_filters.get("from_date"):
        where_parts.append("`tabAT Policy`.issue_date >= %s")
        params.append(normalized_filters["from_date"])

    if normalized_filters.get("to_date"):
        where_parts.append("`tabAT Policy`.issue_date <= %s")
        params.append(normalized_filters["to_date"])

    where_clause = " AND ".join(where_parts)

    # Build and execute query
    sql = f"""
        SELECT
            DATE_FORMAT(`tabAT Policy`.issue_date, '{date_format}') AS period,
            DATE_FORMAT(`tabAT Policy`.issue_date, '{label_format}') AS period_label,
            COUNT(*) AS policy_count,
            SUM(`tabAT Policy`.gross_premium) AS total_gross_premium,
            SUM(`tabAT Policy`.net_premium) AS total_net_premium,
            SUM(`tabAT Policy`.commission_amount) AS total_commission
        FROM `tabAT Policy`
        LEFT JOIN `tabAT Customer` customer ON customer.name = `tabAT Policy`.customer
        WHERE {where_clause}
        GROUP BY DATE_FORMAT(`tabAT Policy`.issue_date, '{date_format}')
        ORDER BY period DESC
        LIMIT {max(int(limit or 500), 1)}
    """

    return frappe.db.sql(sql, params, as_dict=True)


def get_payment_status_report_rows(
    filters: dict[str, Any] | None = None, *, limit: int = 500
) -> list[dict[str, Any]]:
    return frappe.get_all(
        "AT Payment",
        fields=[
            "name",
            "customer",
            "policy",
            "payment_direction",
            "payment_purpose",
            "sales_entity",
            "office_branch",
            "status",
            "payment_date",
            "due_date",
            "amount",
            "currency",
            "reference_no",
        ],
        filters=build_payment_report_filters(filters),
        order_by="due_date asc, modified desc",
        limit_page_length=max(int(limit or 500), 1),
    )


def get_renewal_performance_report_rows(
    filters: dict[str, Any] | None = None, *, limit: int = 500
) -> list[dict[str, Any]]:
    normalized = normalize_report_filters(filters)
    conditions = ["1=1"]
    values: dict[str, Any] = {}

    if normalized.get("office_branch"):
        conditions.append("rt.office_branch = %(office_branch)s")
        values["office_branch"] = normalized["office_branch"]
    if normalized.get("sales_entity"):
        conditions.append("rt.assigned_to = %(sales_entity)s")
        values["sales_entity"] = normalized["sales_entity"]
    if normalized.get("from_date"):
        conditions.append("rt.renewal_date >= %(from_date)s")
        values["from_date"] = normalized["from_date"]
    if normalized.get("to_date"):
        conditions.append("rt.renewal_date <= %(to_date)s")
        values["to_date"] = normalized["to_date"]

    where_clause = " and ".join(conditions)
    return frappe.db.sql(
        f"""
        select
            rt.name,
            rt.policy,
            rt.customer,
            rt.office_branch,
            rt.assigned_to,
            rt.status,
            rt.lost_reason_code,
            rt.competitor_name,
            rt.outcome_record,
            ro.outcome_status,
            ro.lost_reason_code as outcome_lost_reason_code,
            ro.competitor_name as outcome_competitor_name,
            rt.renewal_date,
            rt.due_date,
            rt.unique_key
        from `tabAT Renewal Task` rt
        left join `tabAT Renewal Outcome` ro on ro.name = rt.outcome_record
        where {where_clause}
        order by rt.renewal_date asc, rt.modified desc
        limit %(limit)s
        """,
        {**values, "limit": max(int(limit or 500), 1)},
        as_dict=True,
    )


def get_claim_loss_ratio_report_rows(
    filters: dict[str, Any] | None = None, *, limit: int = 500
) -> list[dict[str, Any]]:
    normalized = normalize_report_filters(filters)
    conditions = ["1=1"]
    values: dict[str, Any] = {}

    if normalized.get("office_branch"):
        conditions.append("c.office_branch = %(office_branch)s")
        values["office_branch"] = normalized["office_branch"]
    if normalized.get("branch"):
        conditions.append("p.branch = %(branch)s")
        values["branch"] = normalized["branch"]
    if normalized.get("insurance_company"):
        conditions.append("p.insurance_company = %(insurance_company)s")
        values["insurance_company"] = normalized["insurance_company"]
    if normalized.get("from_date"):
        conditions.append("cl.reported_date >= %(from_date)s")
        values["from_date"] = normalized["from_date"]
    if normalized.get("to_date"):
        conditions.append("cl.reported_date <= %(to_date)s")
        values["to_date"] = normalized["to_date"]

    where_clause = " and ".join(conditions)
    return frappe.db.sql(
        f"""
        select
            cl.name,
            cl.policy,
            cl.customer,
            c.office_branch,
            p.branch,
            p.insurance_company,
            cl.claim_status,
            cl.reported_date,
            ifnull(cl.estimated_amount, 0) as estimated_amount,
            ifnull(cl.approved_amount, 0) as approved_amount,
            ifnull(cl.paid_amount, 0) as paid_amount,
            ifnull(p.gross_premium, 0) as gross_premium,
            case
                when ifnull(p.gross_premium, 0) = 0 then null
                else round((ifnull(cl.paid_amount, 0) / p.gross_premium) * 100, 2)
            end as loss_ratio_percent
        from `tabAT Claim` cl
        left join `tabAT Policy` p on p.name = cl.policy
        left join `tabAT Customer` c on c.name = cl.customer
        where {where_clause}
        order by cl.reported_date desc, cl.modified desc
        limit %(limit)s
        """,
        {**values, "limit": max(int(limit or 500), 1)},
        as_dict=True,
    )


def get_agent_performance_report_rows(
    filters: dict[str, Any] | None = None, *, limit: int = 500
) -> list[dict[str, Any]]:
    normalized = normalize_report_filters(filters)
    policy_conditions = ["1=1"]
    values: dict[str, Any] = {}

    if normalized.get("office_branch"):
        policy_conditions.append("p.office_branch = %(office_branch)s")
        values["office_branch"] = normalized["office_branch"]
    if normalized.get("branch"):
        policy_conditions.append("p.branch = %(branch)s")
        values["branch"] = normalized["branch"]
    if normalized.get("sales_entity"):
        policy_conditions.append("p.sales_entity = %(sales_entity)s")
        values["sales_entity"] = normalized["sales_entity"]
    if normalized.get("from_date"):
        policy_conditions.append("p.issue_date >= %(from_date)s")
        values["from_date"] = normalized["from_date"]
    if normalized.get("to_date"):
        policy_conditions.append("p.issue_date <= %(to_date)s")
        values["to_date"] = normalized["to_date"]

    policy_where = " and ".join(policy_conditions)

    # Build offer/renewal join conditions
    offer_join_parts = ["o.sales_entity = p.sales_entity"]
    renewal_join_parts = ["r.assigned_to = p.sales_entity"]

    if normalized.get("office_branch"):
        offer_join_parts.append(
            "o.customer in (select name from `tabAT Customer` where office_branch = %(office_branch)s)"
        )
        renewal_join_parts.append("r.office_branch = %(office_branch)s")
    if normalized.get("branch"):
        offer_join_parts.append("o.branch = %(branch)s")
    if normalized.get("from_date"):
        offer_join_parts.append("o.offer_date >= %(from_date)s")
        renewal_join_parts.append("r.renewal_date >= %(from_date)s")
    if normalized.get("to_date"):
        offer_join_parts.append("o.offer_date <= %(to_date)s")
        renewal_join_parts.append("r.renewal_date <= %(to_date)s")

    offer_join = " and ".join(offer_join_parts)
    renewal_join = " and ".join(renewal_join_parts)

    return frappe.db.sql(
        f"""
        select
            p.sales_entity,
            max(p.office_branch) as office_branch,
            count(distinct p.name) as policy_count,
            ifnull(sum(ifnull(p.gross_premium, 0)), 0) as total_gross_premium,
            ifnull(sum({commission_sql_expr("p.")}), 0) as total_commission,
            count(distinct o.name) as offer_count,
            count(distinct case when o.status = 'Accepted' then o.name end) as accepted_offer_count,
            count(distinct case when o.converted_policy is not null and o.converted_policy != '' then o.name end) as converted_offer_count,
            round(
                case when count(distinct o.name) = 0 then 0
                else count(distinct case when o.converted_policy is not null and o.converted_policy != '' then o.name end) * 100.0
                     / count(distinct o.name)
                end, 2
            ) as offer_conversion_rate,
            count(distinct r.name) as renewal_task_count,
            count(distinct case when r.status = 'Done' then r.name end) as completed_renewal_task_count,
            count(distinct case when r.status in ('Open', 'In Progress') then r.name end) as open_renewal_task_count,
            round(
                case when count(distinct r.name) = 0 then 0
                else count(distinct case when r.status = 'Done' then r.name end) * 100.0
                     / count(distinct r.name)
                end, 2
            ) as renewal_success_rate
        from `tabAT Policy` p
        left join `tabAT Offer` o on {offer_join}
        left join `tabAT Renewal Task` r on {renewal_join}
        where {policy_where}
        group by p.sales_entity
        order by total_gross_premium desc, total_commission desc
        limit %(limit)s
        """,
        {**values, "limit": max(int(limit or 500), 1)},
        as_dict=True,
    )


def get_customer_segmentation_report_rows(
    filters: dict[str, Any] | None = None, *, limit: int = 500
) -> list[dict[str, Any]]:
    normalized = normalize_report_filters(filters)
    conditions = ["1=1"]
    values: dict[str, Any] = {}
    policy_join_parts = ["p.customer = c.name"]
    claim_join_parts = ["cl.customer = c.name"]

    if normalized.get("office_branch"):
        conditions.append("c.office_branch = %(office_branch)s")
        values["office_branch"] = normalized["office_branch"]
        policy_join_parts.append("p.office_branch = %(office_branch)s")
    if normalized.get("sales_entity"):
        conditions.append("c.assigned_agent = %(sales_entity)s")
        values["sales_entity"] = normalized["sales_entity"]
    if normalized.get("branch"):
        policy_join_parts.append("p.branch = %(branch)s")
        values["branch"] = normalized["branch"]
    if normalized.get("insurance_company"):
        policy_join_parts.append("p.insurance_company = %(insurance_company)s")
        values["insurance_company"] = normalized["insurance_company"]
    if normalized.get("from_date"):
        policy_join_parts.append("p.issue_date >= %(from_date)s")
        claim_join_parts.append("cl.reported_date >= %(from_date)s")
        values["from_date"] = normalized["from_date"]
    if normalized.get("to_date"):
        policy_join_parts.append("p.issue_date <= %(to_date)s")
        claim_join_parts.append("cl.reported_date <= %(to_date)s")
        values["to_date"] = normalized["to_date"]

    where_clause = " and ".join(conditions)
    policy_join = " and ".join(policy_join_parts)
    claim_join = " and ".join(claim_join_parts)

    return frappe.db.sql(
        f"""
        select
            c.name,
            c.full_name,
            c.office_branch,
            c.assigned_agent,
            count(distinct p.name) as policy_count,
            count(distinct case when p.status = 'Active' then p.name end) as active_policy_count,
            count(distinct case when p.status = 'IPT' then p.name end) as cancelled_policy_count,
            ifnull(sum(distinct case when p.name is not null then ifnull(p.gross_premium, 0) end), 0) as total_premium,
            count(distinct cl.name) as claim_count,
            case when count(distinct cl.name) > 0 then 'HAS_CLAIM' else 'NO_CLAIM' end as claim_history_segment,
            case
                when count(distinct case when p.status = 'Active' then p.name end) >= 3
                     and count(distinct cl.name) = 0 then 'LOYAL'
                when count(distinct p.name) >= 2 then 'GROWING'
                when count(distinct p.name) >= 1 then 'NEW'
                else 'DORMANT'
            end as loyalty_segment,
            case
                when count(distinct p.name) >= 5 then '5+'
                when count(distinct p.name) >= 2 then '2-5'
                when count(distinct p.name) >= 1 then '1'
                else '0'
            end as policy_segment,
            case
                when ifnull(sum(distinct case when p.name is not null then ifnull(p.gross_premium, 0) end), 0) >= 100000 then 'HIGH'
                when ifnull(sum(distinct case when p.name is not null then ifnull(p.gross_premium, 0) end), 0) >= 25000 then 'MID'
                when ifnull(sum(distinct case when p.name is not null then ifnull(p.gross_premium, 0) end), 0) > 0 then 'LOW'
                else 'NONE'
            end as premium_segment
        from `tabAT Customer` c
        left join `tabAT Policy` p on {policy_join}
        left join `tabAT Claim` cl on {claim_join}
        where {where_clause}
        group by c.name, c.full_name, c.office_branch, c.assigned_agent
        order by total_premium desc, policy_count desc, c.modified desc
        limit %(limit)s
        """,
        {**values, "limit": max(int(limit or 500), 1)},
        as_dict=True,
    )


def get_communication_operations_report_rows(
    filters: dict[str, Any] | None = None, *, limit: int = 500
) -> list[dict[str, Any]]:
    normalized = normalize_report_filters(filters)
    conditions = ["1=1"]
    values: dict[str, Any] = {}

    if normalized.get("office_branch"):
        conditions.append("c.office_branch = %(office_branch)s")
        values["office_branch"] = normalized["office_branch"]
    if normalized.get("branch"):
        conditions.append("c.branch = %(branch)s")
        values["branch"] = normalized["branch"]
    if normalized.get("status"):
        conditions.append("c.status = %(status)s")
        values["status"] = normalized["status"]
    if normalized.get("from_date"):
        conditions.append("ifnull(c.last_run_on, c.scheduled_for) >= %(from_date)s")
        values["from_date"] = normalized["from_date"]
    if normalized.get("to_date"):
        conditions.append("ifnull(c.last_run_on, c.scheduled_for) <= %(to_date)s")
        values["to_date"] = normalized["to_date"]

    where_clause = " and ".join(conditions)
    return frappe.db.sql(
        f"""
        select
            c.name,
            c.campaign_name,
            c.segment,
            c.channel,
            c.office_branch,
            c.status,
            c.scheduled_for,
            c.last_run_on,
            ifnull(c.matched_customer_count, 0) as matched_customer_count,
            ifnull(c.sent_count, 0) as sent_count,
            ifnull(c.skipped_count, 0) as skipped_count,
            ifnull(draft_agg.draft_count, 0) as draft_count,
            ifnull(outbox_agg.sent_outbox_count, 0) as sent_outbox_count,
            ifnull(outbox_agg.failed_outbox_count, 0) as failed_outbox_count
        from `tabAT Campaign` c
        left join (
            select reference_name, count(name) as draft_count
            from `tabAT Notification Draft`
            where reference_doctype = 'AT Campaign'
            group by reference_name
        ) draft_agg on draft_agg.reference_name = c.name
        left join (
            select reference_name,
                count(case when status = 'Sent' then name end) as sent_outbox_count,
                count(case when status in ('Failed', 'Dead') then name end) as failed_outbox_count
            from `tabAT Notification Outbox`
            where reference_doctype = 'AT Campaign'
            group by reference_name
        ) outbox_agg on outbox_agg.reference_name = c.name
        where {where_clause}
        order by ifnull(c.last_run_on, c.scheduled_for) desc, c.modified desc
        limit %(limit)s
        """,
        {**values, "limit": max(int(limit or 500), 1)},
        as_dict=True,
    )


def get_reconciliation_operations_report_rows(
    filters: dict[str, Any] | None = None, *, limit: int = 500
) -> list[dict[str, Any]]:
    normalized = normalize_report_filters(filters)
    conditions = ["1=1"]
    values: dict[str, Any] = {}

    if normalized.get("office_branch"):
        conditions.append("ae.office_branch = %(office_branch)s")
        values["office_branch"] = normalized["office_branch"]
    if normalized.get("sales_entity"):
        conditions.append("ae.sales_entity = %(sales_entity)s")
        values["sales_entity"] = normalized["sales_entity"]
    if normalized.get("status"):
        conditions.append("ri.status = %(status)s")
        values["status"] = normalized["status"]
    if normalized.get("branch"):
        conditions.append("p.branch = %(branch)s")
        values["branch"] = normalized["branch"]
    if normalized.get("from_date"):
        conditions.append("ifnull(ri.resolved_on, ri.modified) >= %(from_date)s")
        values["from_date"] = normalized["from_date"]
    if normalized.get("to_date"):
        conditions.append("ifnull(ri.resolved_on, ri.modified) <= %(to_date)s")
        values["to_date"] = normalized["to_date"]

    where_clause = " and ".join(conditions)
    return frappe.db.sql(
        f"""
        select
            ri.name,
            ae.office_branch,
            ri.accounting_entry,
            ae.source_doctype,
            ae.source_name,
            ae.policy,
            ae.customer,
            ae.sales_entity,
            ri.status,
            ri.mismatch_type,
            ifnull(ri.difference_try, 0) as difference_try,
            ri.resolution_action,
            ri.resolved_on,
            ifnull(ri.needs_reconciliation, 0) as needs_reconciliation
        from `tabAT Reconciliation Item` ri
        left join `tabAT Accounting Entry` ae on ae.name = ri.accounting_entry
        left join `tabAT Policy` p on p.name = ae.policy
        where {where_clause}
        order by ifnull(ri.resolved_on, ri.modified) desc, ri.modified desc
        limit %(limit)s
        """,
        {**values, "limit": max(int(limit or 500), 1)},
        as_dict=True,
    )


def get_claims_operations_report_rows(
    filters: dict[str, Any] | None = None, *, limit: int = 500
) -> list[dict[str, Any]]:
    normalized = normalize_report_filters(filters)
    conditions = ["1=1"]
    values: dict[str, Any] = {}

    if normalized.get("office_branch"):
        conditions.append("cl.office_branch = %(office_branch)s")
        values["office_branch"] = normalized["office_branch"]
    if normalized.get("status"):
        conditions.append("cl.claim_status = %(status)s")
        values["status"] = normalized["status"]
    if normalized.get("branch"):
        conditions.append("p.branch = %(branch)s")
        values["branch"] = normalized["branch"]
    if normalized.get("insurance_company"):
        conditions.append("p.insurance_company = %(insurance_company)s")
        values["insurance_company"] = normalized["insurance_company"]
    if normalized.get("from_date"):
        conditions.append("cl.reported_date >= %(from_date)s")
        values["from_date"] = normalized["from_date"]
    if normalized.get("to_date"):
        conditions.append("cl.reported_date <= %(to_date)s")
        values["to_date"] = normalized["to_date"]

    where_clause = " and ".join(conditions)
    return frappe.db.sql(
        f"""
        select
            cl.name,
            cl.claim_no,
            cl.customer,
            cl.policy,
            cl.office_branch,
            p.branch,
            p.insurance_company,
            cl.claim_status,
            cl.assigned_expert,
            cl.rejection_reason,
            cl.appeal_status,
            cl.next_follow_up_on,
            cl.reported_date,
            ifnull(cl.estimated_amount, 0) as estimated_amount,
            ifnull(cl.approved_amount, 0) as approved_amount,
            ifnull(cl.paid_amount, 0) as paid_amount,
            ifnull(draft_agg.draft_count, 0) as draft_count,
            ifnull(outbox_agg.sent_outbox_count, 0) as sent_outbox_count,
            ifnull(outbox_agg.failed_outbox_count, 0) as failed_outbox_count
        from `tabAT Claim` cl
        left join `tabAT Policy` p on p.name = cl.policy
        left join (
            select reference_name, count(name) as draft_count
            from `tabAT Notification Draft`
            where reference_doctype = 'AT Claim'
            group by reference_name
        ) draft_agg on draft_agg.reference_name = cl.name
        left join (
            select reference_name,
                count(case when status = 'Sent' then name end) as sent_outbox_count,
                count(case when status in ('Failed', 'Dead') then name end) as failed_outbox_count
            from `tabAT Notification Outbox`
            where reference_doctype = 'AT Claim'
            group by reference_name
        ) outbox_agg on outbox_agg.reference_name = cl.name
        where {where_clause}
        order by cl.reported_date desc, cl.modified desc
        limit %(limit)s
        """,
        {**values, "limit": max(int(limit or 500), 1)},
        as_dict=True,
    )


def _as_text(value: Any) -> str | None:
    text = str(value or "").strip()
    if text.lower() in {"null", "none"}:
        return None
    return text or None


def _coerce_filter_payload(filters: dict[str, Any] | str | None) -> dict[str, Any]:
    if filters is None:
        return {}
    if isinstance(filters, str):
        if not filters.strip():
            return {}
        try:
            parsed = frappe.parse_json(filters) or {}
        except Exception:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    if isinstance(filters, dict):
        return dict(filters)
    if hasattr(filters, "items"):
        return {key: value for key, value in filters.items()}
    return {}
