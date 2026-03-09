from __future__ import annotations

from typing import Callable

from acentem_takipte.acentem_takipte.services.reporting import (
    get_agent_performance_report_rows,
    get_claim_loss_ratio_report_rows,
    get_customer_segmentation_report_rows,
    get_payment_status_report_rows,
    get_policy_list_report_rows,
    get_renewal_performance_report_rows,
    normalize_report_filters,
)

ReportRowsFn = Callable[[dict, int], list[dict]]


REPORT_DEFINITIONS: dict[str, dict[str, object]] = {
    "policy_list": {
        "permission_doctype": "AT Policy",
        "columns": [
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
        "rows_fn": get_policy_list_report_rows,
    },
    "payment_status": {
        "permission_doctype": "AT Payment",
        "columns": [
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
        "rows_fn": get_payment_status_report_rows,
    },
    "renewal_performance": {
        "permission_doctype": "AT Renewal Task",
        "columns": [
            "name",
            "policy",
            "customer",
            "office_branch",
            "assigned_to",
            "status",
            "lost_reason_code",
            "competitor_name",
            "outcome_record",
            "outcome_status",
            "outcome_lost_reason_code",
            "outcome_competitor_name",
            "renewal_date",
            "due_date",
            "unique_key",
        ],
        "rows_fn": get_renewal_performance_report_rows,
    },
    "claim_loss_ratio": {
        "permission_doctype": "AT Claim",
        "columns": [
            "name",
            "policy",
            "customer",
            "office_branch",
            "branch",
            "insurance_company",
            "claim_status",
            "reported_date",
            "estimated_amount",
            "approved_amount",
            "paid_amount",
            "gross_premium",
            "loss_ratio_percent",
        ],
        "rows_fn": get_claim_loss_ratio_report_rows,
    },
    "agent_performance": {
        "permission_doctype": "AT Policy",
        "columns": [
            "sales_entity",
            "office_branch",
            "policy_count",
            "total_gross_premium",
            "total_commission",
            "offer_count",
            "accepted_offer_count",
            "converted_offer_count",
            "offer_conversion_rate",
            "renewal_task_count",
            "completed_renewal_task_count",
            "open_renewal_task_count",
            "renewal_success_rate",
        ],
        "rows_fn": get_agent_performance_report_rows,
    },
    "customer_segmentation": {
        "permission_doctype": "AT Customer",
        "columns": [
            "name",
            "full_name",
            "office_branch",
            "assigned_agent",
            "policy_count",
            "active_policy_count",
            "cancelled_policy_count",
            "total_premium",
            "claim_count",
            "claim_history_segment",
            "loyalty_segment",
            "policy_segment",
            "premium_segment",
        ],
        "rows_fn": get_customer_segmentation_report_rows,
    },
}


def get_report_definition(report_key: str) -> dict[str, object]:
    return REPORT_DEFINITIONS[str(report_key or "").strip()]


def build_report_payload(report_key: str, filters: dict | None = None, limit: int = 500) -> dict:
    definition = get_report_definition(report_key)
    normalized_filters = normalize_report_filters(filters)
    rows_fn: ReportRowsFn = definition["rows_fn"]  # type: ignore[assignment]
    rows = rows_fn(normalized_filters, limit=max(int(limit or 0), 1))
    return {
        "report_key": report_key,
        "columns": list(definition["columns"]),
        "rows": rows,
        "filters": normalized_filters,
        "total": len(rows),
    }
