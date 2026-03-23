from __future__ import annotations

from typing import Callable

from frappe.utils import cint

from acentem_takipte.acentem_takipte.services.reporting import (
    get_communication_operations_report_rows,
    get_agent_performance_report_rows,
    get_claim_loss_ratio_report_rows,
    get_claims_operations_report_rows,
    get_customer_segmentation_report_rows,
    get_payment_status_report_rows,
    get_policy_list_report_rows,
    get_reconciliation_operations_report_rows,
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
            "customer_full_name",
            "customer_tax_id",
            "sales_entity_full_name",
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
        "granularity_columns": [
            "period",
            "period_label",
            "policy_count",
            "total_gross_premium",
            "total_commission",
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
    "communication_operations": {
        "permission_doctype": "AT Campaign",
        "columns": [
            "name",
            "campaign_name",
            "segment",
            "channel",
            "office_branch",
            "status",
            "scheduled_for",
            "last_run_on",
            "matched_customer_count",
            "sent_count",
            "skipped_count",
            "draft_count",
            "sent_outbox_count",
            "failed_outbox_count",
        ],
        "rows_fn": get_communication_operations_report_rows,
    },
    "reconciliation_operations": {
        "permission_doctype": "AT Reconciliation Item",
        "columns": [
            "name",
            "office_branch",
            "accounting_entry",
            "source_doctype",
            "source_name",
            "policy",
            "customer",
            "status",
            "mismatch_type",
            "difference_try",
            "resolution_action",
            "resolved_on",
            "needs_reconciliation",
        ],
        "rows_fn": get_reconciliation_operations_report_rows,
    },
    "claims_operations": {
        "permission_doctype": "AT Claim",
        "columns": [
            "name",
            "claim_no",
            "customer",
            "policy",
            "office_branch",
            "branch",
            "insurance_company",
            "claim_status",
            "assigned_expert",
            "rejection_reason",
            "appeal_status",
            "next_follow_up_on",
            "reported_date",
            "estimated_amount",
            "approved_amount",
            "paid_amount",
            "draft_count",
            "sent_outbox_count",
            "failed_outbox_count",
        ],
        "rows_fn": get_claims_operations_report_rows,
    },
}


def get_report_definition(report_key: str) -> dict[str, object]:
    return REPORT_DEFINITIONS[str(report_key or "").strip()]


def build_report_payload(report_key: str, filters: dict | None = None, limit: int = 500) -> dict:
    definition = get_report_definition(report_key)
    normalized_filters = normalize_report_filters(filters)
    columns = list(definition["columns"])

    if report_key == "policy_list" and normalized_filters.get("granularity"):
        columns = list(definition.get("granularity_columns") or columns)

    rows_fn: ReportRowsFn = definition["rows_fn"]  # type: ignore[assignment]
    rows = rows_fn(normalized_filters, limit=max(cint(limit), 1))
    return {
        "report_key": report_key,
        "columns": columns,
        "rows": rows,
        "filters": normalized_filters,
        "total": len(rows),
    }

