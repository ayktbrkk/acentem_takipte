from __future__ import annotations

from typing import Any

from frappe.utils import cint

from acentem_takipte.acentem_takipte import tasks as task_jobs
from acentem_takipte.acentem_takipte.doctype.at_access_log.at_access_log import log_decision_event


def dispatch_admin_job(action_key: str, **kwargs) -> dict[str, Any]:
    normalized_action = str(action_key or "").strip()
    reference_doctype, reference_name = _get_admin_job_audit_target(normalized_action)

    if normalized_action == "run_renewal_task_job":
        result = task_jobs.run_renewal_task_job()
        _log_admin_job_run(reference_doctype, reference_name, normalized_action)
        return result
    if normalized_action == "run_stale_renewal_task_job":
        result = task_jobs.run_stale_renewal_task_job(limit=max(cint(kwargs.get("limit")), 1))
        _log_admin_job_run(reference_doctype, reference_name, normalized_action)
        return result
    if normalized_action == "run_notification_queue_job":
        result = task_jobs.run_notification_queue_job(limit=max(cint(kwargs.get("limit")), 1))
        _log_admin_job_run(reference_doctype, reference_name, normalized_action)
        return result
    if normalized_action == "run_payment_due_job":
        result = task_jobs.run_payment_due_job(limit=max(cint(kwargs.get("limit")), 1))
        _log_admin_job_run(reference_doctype, reference_name, normalized_action)
        return result
    if normalized_action == "run_scheduled_reports_job":
        safe_limit = max(cint(kwargs.get("limit")), 1)
        safe_frequency = str(kwargs.get("frequency") or "daily").strip().lower() or "daily"
        result = task_jobs.run_scheduled_reports_job(frequency=safe_frequency, limit=safe_limit)
        _log_admin_job_run(reference_doctype, reference_name, normalized_action)
        return result
    if normalized_action == "run_customer_segment_snapshot_job":
        result = task_jobs.run_customer_segment_snapshot_job(limit=max(cint(kwargs.get("limit")), 1))
        _log_admin_job_run(reference_doctype, reference_name, normalized_action)
        return result
    if normalized_action == "run_accounting_sync_job":
        result = task_jobs.run_accounting_sync_job(limit=max(cint(kwargs.get("limit")), 1))
        _log_admin_job_run(reference_doctype, reference_name, normalized_action)
        return result
    if normalized_action == "run_accounting_reconciliation_job":
        result = task_jobs.run_accounting_reconciliation_job(limit=max(cint(kwargs.get("limit")), 1))
        _log_admin_job_run(reference_doctype, reference_name, normalized_action)
        return result

    raise ValueError(f"Unsupported admin job action: {normalized_action}")


def _get_admin_job_audit_target(action_key: str) -> tuple[str, str]:
    mapping = {
        "run_renewal_task_job": ("DocType", "AT Renewal Task"),
        "run_stale_renewal_task_job": ("DocType", "AT Renewal Task"),
        "run_notification_queue_job": ("DocType", "AT Notification Outbox"),
        "run_payment_due_job": ("DocType", "AT Payment"),
        "run_scheduled_reports_job": ("DocType", "AT Scheduled Report Config"),
        "run_customer_segment_snapshot_job": ("DocType", "AT Customer Segment Snapshot"),
        "run_accounting_sync_job": ("DocType", "AT Accounting Entry"),
        "run_accounting_reconciliation_job": ("DocType", "AT Reconciliation Item"),
    }
    return mapping.get(action_key, ("DocType", "DocType"))


def _log_admin_job_run(reference_doctype: str, reference_name: str, action_key: str) -> None:
    log_decision_event(
        reference_doctype,
        reference_name,
        action="Run",
        action_summary=f"Admin job executed: {action_key}",
        decision_context="admin_job_dispatch",
    )

