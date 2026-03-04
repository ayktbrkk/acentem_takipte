from __future__ import annotations

import time

import frappe
from frappe import _
from frappe.utils import cint

from acentem_takipte.api.security import (
    assert_authenticated,
    assert_post_request,
    assert_roles,
    audit_admin_action,
)
from acentem_takipte.acentem_takipte import tasks as task_jobs

ADMIN_JOB_ROLES = ("System Manager", "Manager", "Accountant")
ADMIN_JOB_RATE_LIMIT_WINDOW_SECONDS = 60
ADMIN_JOB_RATE_LIMIT_MAX_REQUESTS = 12


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
    assert_post_request("Only POST requests are allowed for admin job triggers.")
    assert_roles(
        *ADMIN_JOB_ROLES,
        user=user,
        message="You do not have permission to trigger admin jobs.",
    )
    _assert_admin_job_rate_limit(user, action)
    audit_admin_action(action, details or {})


@frappe.whitelist()
def run_renewal_task_job() -> dict[str, int]:
    _assert_admin_job_access("api.admin_jobs.run_renewal_task_job")
    return task_jobs.run_renewal_task_job()


@frappe.whitelist()
def run_notification_queue_job(limit: int = 120) -> dict[str, dict[str, int]]:
    safe_limit = max(cint(limit), 1)
    _assert_admin_job_access("api.admin_jobs.run_notification_queue_job", {"limit": safe_limit})
    return task_jobs.run_notification_queue_job(limit=safe_limit)


@frappe.whitelist()
def run_accounting_sync_job(limit: int = 250) -> dict[str, int]:
    safe_limit = max(cint(limit), 1)
    _assert_admin_job_access("api.admin_jobs.run_accounting_sync_job", {"limit": safe_limit})
    return task_jobs.run_accounting_sync_job(limit=safe_limit)


@frappe.whitelist()
def run_accounting_reconciliation_job(limit: int = 400) -> dict[str, int]:
    safe_limit = max(cint(limit), 1)
    _assert_admin_job_access("api.admin_jobs.run_accounting_reconciliation_job", {"limit": safe_limit})
    return task_jobs.run_accounting_reconciliation_job(limit=safe_limit)
