from __future__ import annotations

from typing import Any

import frappe

from acentem_takipte.acentem_takipte.services.branches import normalize_requested_office_branch
from acentem_takipte.acentem_takipte.utils.commissions import commission_sql_expr


def normalize_report_filters(filters: dict[str, Any] | str | None = None) -> dict[str, Any]:
    payload = _coerce_filter_payload(filters)
    normalized = {
        "from_date": _as_text(payload.get("from_date")),
        "to_date": _as_text(payload.get("to_date")),
        "branch": _as_text(payload.get("branch")),
        "office_branch": normalize_requested_office_branch(payload.get("office_branch")),
        "status": _as_text(payload.get("status")),
        "insurance_company": _as_text(payload.get("insurance_company")),
        "sales_entity": _as_text(payload.get("sales_entity")),
    }
    return {key: value for key, value in normalized.items() if value not in {None, ""}}


def build_policy_report_filters(filters: dict[str, Any] | None = None) -> dict[str, Any]:
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
        query_filters["issue_date"] = ["between", [normalized["from_date"], normalized["to_date"]]]
    elif normalized.get("from_date"):
        query_filters["issue_date"] = [">=", normalized["from_date"]]
    elif normalized.get("to_date"):
        query_filters["issue_date"] = ["<=", normalized["to_date"]]
    return query_filters


def build_payment_report_filters(filters: dict[str, Any] | None = None) -> dict[str, Any]:
    normalized = normalize_report_filters(filters)
    query_filters: dict[str, Any] = {}
    if normalized.get("office_branch"):
        query_filters["office_branch"] = normalized["office_branch"]
    if normalized.get("status"):
        query_filters["status"] = normalized["status"]
    if normalized.get("sales_entity"):
        query_filters["sales_entity"] = normalized["sales_entity"]
    if normalized.get("from_date") and normalized.get("to_date"):
        query_filters["due_date"] = ["between", [normalized["from_date"], normalized["to_date"]]]
    elif normalized.get("from_date"):
        query_filters["due_date"] = [">=", normalized["from_date"]]
    elif normalized.get("to_date"):
        query_filters["due_date"] = ["<=", normalized["to_date"]]
    return query_filters


def get_policy_list_report_rows(filters: dict[str, Any] | None = None, *, limit: int = 500) -> list[dict[str, Any]]:
    return frappe.get_all(
        "AT Policy",
        fields=[
            "name",
            "policy_no",
            "customer",
            "sales_entity",
            "insurance_company",
            "branch",
            "office_branch",
            "status",
            "issue_date",
            "start_date",
            "end_date",
            "gross_premium",
            "commission_amount",
        ],
        filters=build_policy_report_filters(filters),
        order_by="issue_date desc, modified desc",
        limit_page_length=max(int(limit or 500), 1),
    )


def get_payment_status_report_rows(filters: dict[str, Any] | None = None, *, limit: int = 500) -> list[dict[str, Any]]:
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


def get_renewal_performance_report_rows(filters: dict[str, Any] | None = None, *, limit: int = 500) -> list[dict[str, Any]]:
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


def get_claim_loss_ratio_report_rows(filters: dict[str, Any] | None = None, *, limit: int = 500) -> list[dict[str, Any]]:
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


def get_agent_performance_report_rows(filters: dict[str, Any] | None = None, *, limit: int = 500) -> list[dict[str, Any]]:
    normalized = normalize_report_filters(filters)
    conditions = ["1=1"]
    values: dict[str, Any] = {}
    offer_conditions = ["o.sales_entity = p.sales_entity"]
    renewal_conditions = ["r.assigned_to = p.sales_entity"]

    if normalized.get("office_branch"):
        conditions.append("p.office_branch = %(office_branch)s")
        values["office_branch"] = normalized["office_branch"]
        offer_conditions.append("o.customer in (select name from `tabAT Customer` where office_branch = %(office_branch)s)")
        renewal_conditions.append("r.office_branch = %(office_branch)s")
    if normalized.get("branch"):
        conditions.append("p.branch = %(branch)s")
        values["branch"] = normalized["branch"]
        offer_conditions.append("o.branch = %(branch)s")
    if normalized.get("sales_entity"):
        conditions.append("p.sales_entity = %(sales_entity)s")
        values["sales_entity"] = normalized["sales_entity"]
    if normalized.get("from_date"):
        conditions.append("p.issue_date >= %(from_date)s")
        values["from_date"] = normalized["from_date"]
        offer_conditions.append("o.offer_date >= %(from_date)s")
        renewal_conditions.append("r.renewal_date >= %(from_date)s")
    if normalized.get("to_date"):
        conditions.append("p.issue_date <= %(to_date)s")
        values["to_date"] = normalized["to_date"]
        offer_conditions.append("o.offer_date <= %(to_date)s")
        renewal_conditions.append("r.renewal_date <= %(to_date)s")

    where_clause = " and ".join(conditions)
    offer_where_clause = " and ".join(offer_conditions)
    renewal_where_clause = " and ".join(renewal_conditions)
    return frappe.db.sql(
        f"""
        select
            p.sales_entity,
            max(p.office_branch) as office_branch,
            count(distinct p.name) as policy_count,
            ifnull(sum(ifnull(p.gross_premium, 0)), 0) as total_gross_premium,
            ifnull(sum({commission_sql_expr("p.")}), 0) as total_commission,
            (
                select count(name)
                from `tabAT Offer` o
                where {offer_where_clause}
            ) as offer_count,
            (
                select count(name)
                from `tabAT Offer` o
                where {offer_where_clause}
                  and o.status = 'Accepted'
            ) as accepted_offer_count,
            (
                select count(name)
                from `tabAT Offer` o
                where {offer_where_clause}
                  and ifnull(o.converted_policy, '') != ''
            ) as converted_offer_count,
            (
                case
                    when (
                        select count(name)
                        from `tabAT Offer` o
                        where {offer_where_clause}
                    ) = 0 then 0
                    else round(
                        (
                            (
                                select count(name)
                                from `tabAT Offer` o
                                where {offer_where_clause}
                                  and ifnull(o.converted_policy, '') != ''
                            ) / (
                                select count(name)
                                from `tabAT Offer` o
                                where {offer_where_clause}
                            )
                        ) * 100,
                        2
                    )
                end
            ) as offer_conversion_rate,
            (
                select count(name)
                from `tabAT Renewal Task` r
                where {renewal_where_clause}
            ) as renewal_task_count
            ,
            (
                select count(name)
                from `tabAT Renewal Task` r
                where {renewal_where_clause}
                  and r.status = 'Done'
            ) as completed_renewal_task_count,
            (
                select count(name)
                from `tabAT Renewal Task` r
                where {renewal_where_clause}
                  and r.status in ('Open', 'In Progress')
            ) as open_renewal_task_count,
            (
                case
                    when (
                        select count(name)
                        from `tabAT Renewal Task` r
                        where {renewal_where_clause}
                    ) = 0 then 0
                    else round(
                        (
                            (
                                select count(name)
                                from `tabAT Renewal Task` r
                                where {renewal_where_clause}
                                  and r.status = 'Done'
                            ) / (
                                select count(name)
                                from `tabAT Renewal Task` r
                                where {renewal_where_clause}
                            )
                        ) * 100,
                        2
                    )
                end
            ) as renewal_success_rate
        from `tabAT Policy` p
        where {where_clause}
        group by p.sales_entity
        order by total_gross_premium desc, total_commission desc
        limit %(limit)s
        """,
        {**values, "limit": max(int(limit or 500), 1)},
        as_dict=True,
    )


def get_customer_segmentation_report_rows(filters: dict[str, Any] | None = None, *, limit: int = 500) -> list[dict[str, Any]]:
    normalized = normalize_report_filters(filters)
    conditions = ["1=1"]
    values: dict[str, Any] = {}
    policy_conditions = ["p.customer = c.name"]
    claim_conditions = ["cl.customer = c.name"]

    if normalized.get("office_branch"):
        conditions.append("c.office_branch = %(office_branch)s")
        values["office_branch"] = normalized["office_branch"]
        policy_conditions.append("p.office_branch = %(office_branch)s")
    if normalized.get("sales_entity"):
        conditions.append("c.assigned_agent = %(sales_entity)s")
        values["sales_entity"] = normalized["sales_entity"]
    if normalized.get("branch"):
        policy_conditions.append("p.branch = %(branch)s")
        values["branch"] = normalized["branch"]
    if normalized.get("insurance_company"):
        policy_conditions.append("p.insurance_company = %(insurance_company)s")
        values["insurance_company"] = normalized["insurance_company"]
    if normalized.get("from_date"):
        policy_conditions.append("p.issue_date >= %(from_date)s")
        claim_conditions.append("cl.reported_date >= %(from_date)s")
        values["from_date"] = normalized["from_date"]
    if normalized.get("to_date"):
        policy_conditions.append("p.issue_date <= %(to_date)s")
        claim_conditions.append("cl.reported_date <= %(to_date)s")
        values["to_date"] = normalized["to_date"]

    where_clause = " and ".join(conditions)
    policy_where_clause = " and ".join(policy_conditions)
    claim_where_clause = " and ".join(claim_conditions)
    return frappe.db.sql(
        f"""
        select
            c.name,
            c.full_name,
            c.office_branch,
            c.assigned_agent,
            (
                select count(p.name)
                from `tabAT Policy` p
                where {policy_where_clause}
            ) as policy_count,
            (
                select count(p.name)
                from `tabAT Policy` p
                where {policy_where_clause}
                  and p.status = 'Active'
            ) as active_policy_count,
            (
                select count(p.name)
                from `tabAT Policy` p
                where {policy_where_clause}
                  and p.status = 'IPT'
            ) as cancelled_policy_count,
            (
                select ifnull(sum(ifnull(p.gross_premium, 0)), 0)
                from `tabAT Policy` p
                where {policy_where_clause}
            ) as total_premium,
            (
                select count(cl.name)
                from `tabAT Claim` cl
                where {claim_where_clause}
            ) as claim_count,
            case
                when (
                    select count(cl.name) from `tabAT Claim` cl where {claim_where_clause}
                ) > 0 then 'HAS_CLAIM'
                else 'NO_CLAIM'
            end as claim_history_segment,
            case
                when (
                    select count(p.name) from `tabAT Policy` p where {policy_where_clause} and p.status = 'Active'
                ) >= 3
                and (
                    select count(cl.name) from `tabAT Claim` cl where {claim_where_clause}
                ) = 0 then 'LOYAL'
                when (
                    select count(p.name) from `tabAT Policy` p where {policy_where_clause}
                ) >= 2 then 'GROWING'
                when (
                    select count(p.name) from `tabAT Policy` p where {policy_where_clause}
                ) >= 1 then 'NEW'
                else 'DORMANT'
            end as loyalty_segment,
            case
                when (
                    select count(p.name) from `tabAT Policy` p where {policy_where_clause}
                ) >= 5 then '5+'
                when (
                    select count(p.name) from `tabAT Policy` p where {policy_where_clause}
                ) >= 2 then '2-5'
                when (
                    select count(p.name) from `tabAT Policy` p where {policy_where_clause}
                ) >= 1 then '1'
                else '0'
            end as policy_segment,
            case
                when (
                    select ifnull(sum(ifnull(p.gross_premium, 0)), 0) from `tabAT Policy` p where {policy_where_clause}
                ) >= 100000 then 'HIGH'
                when (
                    select ifnull(sum(ifnull(p.gross_premium, 0)), 0) from `tabAT Policy` p where {policy_where_clause}
                ) >= 25000 then 'MID'
                when (
                    select ifnull(sum(ifnull(p.gross_premium, 0)), 0) from `tabAT Policy` p where {policy_where_clause}
                ) > 0 then 'LOW'
                else 'NONE'
            end as premium_segment
        from `tabAT Customer` c
        where {where_clause}
        order by total_premium desc, policy_count desc, c.modified desc
        limit %(limit)s
        """,
        {**values, "limit": max(int(limit or 500), 1)},
        as_dict=True,
    )


def _as_text(value: Any) -> str | None:
    text = str(value or "").strip()
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
