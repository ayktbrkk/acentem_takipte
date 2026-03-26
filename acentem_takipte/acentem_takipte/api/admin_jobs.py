from __future__ import annotations

import time
from typing import Any

import frappe
from frappe import _
from frappe.utils import cint

from acentem_takipte.acentem_takipte.api.security import assert_authenticated
from acentem_takipte.acentem_takipte.api.mutation_access import assert_role_based_write_access
from acentem_takipte.acentem_takipte.services.admin_jobs import dispatch_admin_job
from acentem_takipte.acentem_takipte.utils.permissions import build_doctype_permission_map

ADMIN_JOB_ROLES = ("System Manager", "Manager", "Accountant")
ADMIN_JOB_RATE_LIMIT_WINDOW_SECONDS = 60
ADMIN_JOB_RATE_LIMIT_MAX_REQUESTS = 12
ADMIN_JOB_PERMISSION_DOCTYPES = build_doctype_permission_map(
    run_renewal_task_job=("AT Renewal Task",),
    run_stale_renewal_task_job=("AT Renewal Task",),
    run_notification_queue_job=("AT Notification Outbox",),
    run_payment_due_job=("AT Payment", "AT Notification Draft"),
    run_scheduled_reports_job=(),
    run_customer_segment_snapshot_job=("AT Customer Segment Snapshot",),
    run_report_snapshot_job=("AT Report Snapshot",),
    run_accounting_sync_job=("AT Accounting Entry",),
    run_accounting_reconciliation_job=("AT Reconciliation Item",),
)


def _admin_job_rate_limit_key(user: str, action: str) -> str:
    safe_action = str(action or "").strip().replace("/", ":")
    return f"at:admin_jobs:rate:{user}:{safe_action}"


def _assert_admin_job_rate_limit(user: str, action: str) -> None:
    if not user or user in {"Guest", "Administrator"}:
        return

    cache = frappe.cache()
    key = _admin_job_rate_limit_key(user, action)
    now_ts = int(time.time())

    try:
        state = cache.get_value(key) or {}
        if isinstance(state, str):
            state = frappe.parse_json(state) or {}
        if not isinstance(state, dict):
            state = {}
    except Exception:
        state = {}

    window_start = cint(state.get("window_start")) or now_ts
    count = cint(state.get("count")) or 0
    if now_ts - window_start >= ADMIN_JOB_RATE_LIMIT_WINDOW_SECONDS:
        window_start = now_ts
        count = 0

    if count >= ADMIN_JOB_RATE_LIMIT_MAX_REQUESTS:
        frappe.throw(_("Too many admin job trigger requests. Please retry shortly."))

    try:
        cache.set_value(key, {"window_start": window_start, "count": count + 1})
    except Exception:
        # Best-effort abuse guard: do not block valid operations if cache is unavailable.
        pass


def _assert_admin_job_access(action: str, details: dict | None = None) -> None:
    user = assert_authenticated()
    action_key = str(action or "").rsplit(".", 1)[-1]
    assert_role_based_write_access(
        action=action,
        roles=ADMIN_JOB_ROLES,
        permission_targets=ADMIN_JOB_PERMISSION_DOCTYPES.get(action_key, ()),
        details=details,
        role_message="You do not have permission to trigger admin jobs.",
        post_message="Only POST requests are allowed for admin job triggers.",
    )
    _assert_admin_job_rate_limit(user, action)


@frappe.whitelist()
def run_renewal_task_job() -> dict[str, Any]:
    _assert_admin_job_access("api.admin_jobs.run_renewal_task_job")
    return dispatch_admin_job("run_renewal_task_job")


@frappe.whitelist()
def run_stale_renewal_task_job(limit: int = 500) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    _assert_admin_job_access("api.admin_jobs.run_stale_renewal_task_job", {"limit": safe_limit})
    return dispatch_admin_job("run_stale_renewal_task_job", limit=safe_limit)


@frappe.whitelist()
def run_notification_queue_job(limit: int = 120) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    _assert_admin_job_access("api.admin_jobs.run_notification_queue_job", {"limit": safe_limit})
    return dispatch_admin_job("run_notification_queue_job", limit=safe_limit)


@frappe.whitelist()
def run_payment_due_job(limit: int = 250) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    _assert_admin_job_access("api.admin_jobs.run_payment_due_job", {"limit": safe_limit})
    return dispatch_admin_job("run_payment_due_job", limit=safe_limit)


@frappe.whitelist()
def run_scheduled_reports_job(frequency: str = "daily", limit: int = 10) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    safe_frequency = str(frequency or "daily").strip().lower() or "daily"
    _assert_admin_job_access(
        "api.admin_jobs.run_scheduled_reports_job",
        {"limit": safe_limit, "frequency": safe_frequency},
    )
    return dispatch_admin_job("run_scheduled_reports_job", frequency=safe_frequency, limit=safe_limit)


@frappe.whitelist()
def run_customer_segment_snapshot_job(limit: int = 250) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    _assert_admin_job_access("api.admin_jobs.run_customer_segment_snapshot_job", {"limit": safe_limit})
    return dispatch_admin_job("run_customer_segment_snapshot_job", limit=safe_limit)


@frappe.whitelist()
def run_report_snapshot_job(limit: int = 1000) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    _assert_admin_job_access("api.admin_jobs.run_report_snapshot_job", {"limit": safe_limit})
    return dispatch_admin_job("run_report_snapshot_job", limit=safe_limit)


@frappe.whitelist()
def run_accounting_sync_job(limit: int = 250) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    _assert_admin_job_access("api.admin_jobs.run_accounting_sync_job", {"limit": safe_limit})
    return dispatch_admin_job("run_accounting_sync_job", limit=safe_limit)


@frappe.whitelist()
def run_accounting_reconciliation_job(limit: int = 400) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    _assert_admin_job_access("api.admin_jobs.run_accounting_reconciliation_job", {"limit": safe_limit})
    return dispatch_admin_job("run_accounting_reconciliation_job", limit=safe_limit)

