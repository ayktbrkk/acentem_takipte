from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.utils import add_days, cint, getdate, nowdate


ACTIVE_POLICY_STATUSES = ("Active", "Renewal")
OPEN_RENEWAL_STATUSES = ("Open", "In Progress")


def build_segment_membership_preview(segment_name: str, *, limit: int = 50) -> dict[str, object]:
    segment_name = str(segment_name or "").strip()
    if not segment_name:
        frappe.throw(_("Segment is required."))

    segment = frappe.get_doc("AT Segment", segment_name)
    criteria = _parse_segment_criteria(segment.criteria_json)
    safe_limit = max(cint(limit or 50), 1)

    customers = _load_customer_candidates(segment, criteria)
    customer_names = [row["name"] for row in customers]
    active_policy_counts = _get_active_policy_counts(customer_names)
    overdue_installments = _get_overdue_installment_customers(customer_names)
    renewal_window_customers = _get_renewal_window_customers(customer_names, criteria)

    matched_rows: list[dict[str, object]] = []
    for row in customers:
        customer_name = row["name"]
        active_policy_count = cint(active_policy_counts.get(customer_name) or 0)
        has_overdue_installment = customer_name in overdue_installments
        in_renewal_window = customer_name in renewal_window_customers

        if not _matches_criteria(
            row,
            criteria,
            active_policy_count=active_policy_count,
            has_overdue_installment=has_overdue_installment,
            in_renewal_window=in_renewal_window,
        ):
            continue

        matched_rows.append(
            {
                "name": customer_name,
                "full_name": row.get("full_name") or customer_name,
                "office_branch": row.get("office_branch"),
                "consent_status": row.get("consent_status"),
                "assigned_agent": row.get("assigned_agent"),
                "active_policy_count": active_policy_count,
                "has_overdue_installment": has_overdue_installment,
                "in_renewal_window": in_renewal_window,
            }
        )

    return {
        "segment": {
            "name": segment.name,
            "segment_name": segment.segment_name,
            "segment_type": segment.segment_type,
            "channel_focus": segment.channel_focus,
            "status": segment.status,
        },
        "criteria": criteria,
        "summary": {
            "matched_count": len(matched_rows),
            "preview_count": min(len(matched_rows), safe_limit),
            "has_more": len(matched_rows) > safe_limit,
        },
        "customers": matched_rows[:safe_limit],
    }


def _parse_segment_criteria(criteria_json: str | None) -> dict[str, object]:
    raw = str(criteria_json or "").strip()
    if not raw:
        return {}
    parsed = json.loads(raw)
    if not isinstance(parsed, dict):
        frappe.throw(_("Criteria JSON must be an object."))
    return parsed


def _load_customer_candidates(segment, criteria: dict[str, object]) -> list[dict[str, object]]:
    filters: dict[str, object] = {}
    office_branch = str(criteria.get("office_branch") or segment.office_branch or "").strip()
    if office_branch:
        filters["office_branch"] = office_branch

    consent_status = str(criteria.get("consent_status") or "").strip()
    if consent_status:
        filters["consent_status"] = consent_status

    assigned_agent = str(criteria.get("assigned_agent") or "").strip()
    if assigned_agent:
        filters["assigned_agent"] = assigned_agent

    return frappe.get_all(
        "AT Customer",
        fields=["name", "full_name", "office_branch", "consent_status", "assigned_agent"],
        filters=filters or None,
        order_by="modified desc",
        limit_page_length=500,
    )


def _get_active_policy_counts(customer_names: list[str]) -> dict[str, int]:
    if not customer_names:
        return {}
    rows = frappe.db.sql(
        """
        select customer, count(name) as total
        from `tabAT Policy`
        where customer in %(customers)s
          and status in %(statuses)s
        group by customer
        """,
        {
            "customers": tuple(customer_names),
            "statuses": ACTIVE_POLICY_STATUSES,
        },
        as_dict=True,
    )
    return {row.customer: cint(row.total) for row in rows or [] if row.get("customer")}


def _get_overdue_installment_customers(customer_names: list[str]) -> set[str]:
    if not customer_names:
        return set()
    rows = frappe.get_all(
        "AT Payment Installment",
        fields=["customer"],
        filters={
            "customer": ["in", customer_names],
            "status": "Overdue",
        },
        limit_page_length=500,
    )
    return {str(row.get("customer") or "").strip() for row in rows or [] if row.get("customer")}


def _get_renewal_window_customers(customer_names: list[str], criteria: dict[str, object]) -> set[str]:
    window_days = cint(criteria.get("renewal_window_days") or 0)
    if not customer_names or window_days <= 0:
        return set()

    threshold = add_days(getdate(nowdate()), window_days)
    rows = frappe.get_all(
        "AT Renewal Task",
        fields=["customer"],
        filters={
            "customer": ["in", customer_names],
            "status": ["in", OPEN_RENEWAL_STATUSES],
            "renewal_date": ["<=", threshold],
        },
        limit_page_length=500,
    )
    return {str(row.get("customer") or "").strip() for row in rows or [] if row.get("customer")}


def _matches_criteria(
    customer_row: dict[str, object],
    criteria: dict[str, object],
    *,
    active_policy_count: int,
    has_overdue_installment: bool,
    in_renewal_window: bool,
) -> bool:
    min_active_policy_count = cint(criteria.get("min_active_policy_count") or 0)
    if min_active_policy_count and active_policy_count < min_active_policy_count:
        return False

    requires_active_policy = criteria.get("has_active_policy")
    if requires_active_policy is True and active_policy_count <= 0:
        return False
    if requires_active_policy is False and active_policy_count > 0:
        return False

    requires_overdue = criteria.get("has_overdue_installment")
    if requires_overdue is True and not has_overdue_installment:
        return False
    if requires_overdue is False and has_overdue_installment:
        return False

    renewal_window_days = cint(criteria.get("renewal_window_days") or 0)
    if renewal_window_days > 0 and not in_renewal_window:
        return False

    return True
