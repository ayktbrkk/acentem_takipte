from __future__ import annotations

from typing import Any

import frappe
from frappe.utils import add_days, cint, getdate, nowdate
from frappe.exceptions import DuplicateEntryError

from acentem_takipte.acentem_takipte.communication import process_notification_queue, queue_notification_drafts

RENEWAL_LOOKAHEAD_DAYS = 30
MAX_POLICIES_PER_RUN = 2000


def build_renewal_key(policy_name: str, due_date) -> str:
    return f"{policy_name}::{getdate(due_date).isoformat()}"


def _extract_job_id(job: Any) -> str | None:
    if not job:
        return None
    return str(getattr(job, "id", None) or getattr(job, "job_id", None) or "").strip() or None


def _queued_response(*, job: Any, queue: str, method: str, limit: int | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "queued": True,
        "job": _extract_job_id(job),
        "queue": queue,
        "method": method,
    }
    if limit is not None:
        payload["limit"] = int(limit)
    return payload


def create_renewal_tasks() -> dict[str, Any]:
    job = frappe.enqueue(
        "acentem_takipte.acentem_takipte.tasks._create_renewal_tasks_logic",
        queue="long",
        timeout=1500,
    )
    return _queued_response(
        job=job,
        queue="long",
        method="acentem_takipte.acentem_takipte.tasks._create_renewal_tasks_logic",
    )

def _create_renewal_tasks_logic() -> dict[str, int]:
    today = getdate(nowdate())
    target_end_date = add_days(today, RENEWAL_LOOKAHEAD_DAYS)
    policies = frappe.get_all(
        "AT Policy",
        filters={
            "status": "Active",
            "end_date": ["between", [today, target_end_date]],
        },
        fields=["name", "customer", "end_date"],
        limit_page_length=MAX_POLICIES_PER_RUN,
    )

    policy_names = [policy.name for policy in policies]
    existing_keys = _load_existing_renewal_keys(policy_names)

    scanned = len(policies)
    created = 0
    skipped_existing = 0
    skipped_race = 0
    skipped_invalid = 0

    for policy in policies:
        if not policy.end_date:
            skipped_invalid += 1
            continue

        customer = policy.customer or frappe.db.get_value("AT Policy", policy.name, "customer")
        if not customer:
            skipped_invalid += 1
            continue

        due_date = add_days(getdate(policy.end_date), -RENEWAL_LOOKAHEAD_DAYS)
        unique_key = build_renewal_key(policy.name, due_date)

        if unique_key in existing_keys:
            skipped_existing += 1
            continue

        try:
            frappe.get_doc(
                {
                    "doctype": "AT Renewal Task",
                    "policy": policy.name,
                    "customer": customer,
                    "policy_end_date": policy.end_date,
                    "renewal_date": policy.end_date,
                    "due_date": due_date,
                    "status": "Open",
                    "auto_created": 1,
                    "unique_key": unique_key,
                }
            ).insert(ignore_permissions=True)
            existing_keys.add(unique_key)
            created += 1
        except DuplicateEntryError:
            skipped_race += 1

    if created:
        frappe.db.commit()

    summary = {
        "scanned": scanned,
        "created": created,
        "skipped_existing": skipped_existing,
        "skipped_race": skipped_race,
        "skipped_invalid": skipped_invalid,
    }
    frappe.logger("acentem_takipte").info("AT renewal task job summary: %s", summary)
    return summary


def run_renewal_task_job() -> dict[str, Any]:
    return create_renewal_tasks()


def run_notification_queue_job(limit: int = 120) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    job = frappe.enqueue(
        "acentem_takipte.acentem_takipte.tasks._run_notification_queue_logic",
        limit=safe_limit,
        queue="default",
        timeout=600,
    )
    return _queued_response(
        job=job,
        queue="default",
        method="acentem_takipte.acentem_takipte.tasks._run_notification_queue_logic",
        limit=safe_limit,
    )


def _run_notification_queue_logic(limit: int = 120) -> dict[str, dict[str, int]]:
    queued = queue_notification_drafts(limit=limit, include_failed=True)
    dispatched = process_notification_queue(limit=limit)
    return {"queued": queued, "dispatched": dispatched}


def run_accounting_sync_job(limit: int = 250) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    job = frappe.enqueue(
        "acentem_takipte.acentem_takipte.accounting.sync_accounting_entries",
        limit=safe_limit,
        queue="long",
        timeout=1500,
    )
    return _queued_response(
        job=job,
        queue="long",
        method="acentem_takipte.acentem_takipte.accounting.sync_accounting_entries",
        limit=safe_limit,
    )


def run_accounting_reconciliation_job(limit: int = 400) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    job = frappe.enqueue(
        "acentem_takipte.acentem_takipte.accounting.run_reconciliation",
        limit=safe_limit,
        queue="long",
        timeout=1500,
    )
    return _queued_response(
        job=job,
        queue="long",
        method="acentem_takipte.acentem_takipte.accounting.run_reconciliation",
        limit=safe_limit,
    )


def _build_renewal_key(policy_name: str, due_date) -> str:
    return build_renewal_key(policy_name, due_date)


def _load_existing_renewal_keys(policy_names: list[str]) -> set[str]:
    if not policy_names:
        return set()

    rows = frappe.get_all(
        "AT Renewal Task",
        filters={"policy": ["in", policy_names]},
        fields=["policy", "due_date", "unique_key"],
        limit_page_length=0,
    )
    keys: set[str] = set()
    for row in rows:
        if row.unique_key:
            keys.add(row.unique_key)
            continue

        if row.policy and row.due_date:
            keys.add(build_renewal_key(row.policy, row.due_date))

    return keys
