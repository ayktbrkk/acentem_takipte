from __future__ import annotations

from typing import Any

from frappe.utils import cint

from acentem_takipte.acentem_takipte import tasks as task_jobs


def dispatch_admin_job(action_key: str, **kwargs) -> dict[str, Any]:
    normalized_action = str(action_key or "").strip()

    if normalized_action == "run_renewal_task_job":
        return task_jobs.run_renewal_task_job()
    if normalized_action == "run_stale_renewal_task_job":
        return task_jobs.run_stale_renewal_task_job(limit=max(cint(kwargs.get("limit")), 1))
    if normalized_action == "run_notification_queue_job":
        return task_jobs.run_notification_queue_job(limit=max(cint(kwargs.get("limit")), 1))
    if normalized_action == "run_payment_due_job":
        return task_jobs.run_payment_due_job(limit=max(cint(kwargs.get("limit")), 1))
    if normalized_action == "run_scheduled_reports_job":
        safe_limit = max(cint(kwargs.get("limit")), 1)
        safe_frequency = str(kwargs.get("frequency") or "daily").strip().lower() or "daily"
        return task_jobs.run_scheduled_reports_job(frequency=safe_frequency, limit=safe_limit)
    if normalized_action == "run_accounting_sync_job":
        return task_jobs.run_accounting_sync_job(limit=max(cint(kwargs.get("limit")), 1))
    if normalized_action == "run_accounting_reconciliation_job":
        return task_jobs.run_accounting_reconciliation_job(limit=max(cint(kwargs.get("limit")), 1))

    raise ValueError(f"Unsupported admin job action: {normalized_action}")
