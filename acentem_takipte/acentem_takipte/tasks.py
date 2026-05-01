from __future__ import annotations

from typing import Any

import frappe
from frappe.utils import add_days, cint, getdate, nowdate

from acentem_takipte.acentem_takipte.communication import (
    process_notification_queue,
    queue_notification_drafts,
)
from acentem_takipte.acentem_takipte.notifications import create_notification_drafts
from acentem_takipte.acentem_takipte.renewal.pipeline import (
    run_renewal_task_creation,
    run_stale_renewal_task_remediation,
)
from acentem_takipte.acentem_takipte.services.campaigns import execute_due_campaigns
from acentem_takipte.acentem_takipte.services.customer_segments import refresh_due_customer_segment_snapshots
from acentem_takipte.acentem_takipte.services.report_snapshots import refresh_report_snapshots
from acentem_takipte.acentem_takipte.services.payments import build_payment_reminder_payload
from acentem_takipte.acentem_takipte.services.scheduled_reports import dispatch_scheduled_reports
from acentem_takipte.acentem_takipte.utils.metrics import build_metric_event
from acentem_takipte.acentem_takipte.utils.statuses import ATPaymentStatus
from acentem_takipte.acentem_takipte.renewal.service import (
    RENEWAL_LOOKAHEAD_DAYS,
    MAX_POLICIES_PER_RUN,
)

# audit(f401): `build_renewal_key`, `build_renewal_stage_key`, and
# `MAX_PAYMENTS_PER_RUN` belonged to the older inline renewal/payment loops. The
# current task runner delegates those details to service-layer helpers.


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
        "acentem_takipte.tasks._create_renewal_tasks_logic",
        queue="long",
        timeout=1500,
    )
    return _queued_response(
        job=job,
        queue="long",
        method="acentem_takipte.tasks._create_renewal_tasks_logic",
    )

def _create_renewal_tasks_logic() -> dict[str, int]:
    return run_renewal_task_creation(
        business_date=getdate(nowdate()),
        lookahead_days=RENEWAL_LOOKAHEAD_DAYS,
        limit=MAX_POLICIES_PER_RUN,
    )


def run_renewal_task_job() -> dict[str, Any]:
    return create_renewal_tasks()


def run_stale_renewal_task_job(limit: int = 500) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    job = frappe.enqueue(
        "acentem_takipte.tasks._run_stale_renewal_task_logic",
        limit=safe_limit,
        queue="long",
        timeout=1500,
    )
    return _queued_response(
        job=job,
        queue="long",
        method="acentem_takipte.tasks._run_stale_renewal_task_logic",
        limit=safe_limit,
    )


def _run_stale_renewal_task_logic(limit: int = 500) -> dict[str, int]:
    return run_stale_renewal_task_remediation(
        business_date=getdate(nowdate()),
        limit=max(cint(limit), 1),
    )


def run_notification_queue_job(limit: int = 120) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    job = frappe.enqueue(
        "acentem_takipte.tasks._run_notification_queue_logic",
        limit=safe_limit,
        queue="default",
        timeout=600,
    )
    return _queued_response(
        job=job,
        queue="default",
        method="acentem_takipte.tasks._run_notification_queue_logic",
        limit=safe_limit,
    )


def run_payment_due_job(limit: int = 250) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    job = frappe.enqueue(
        "acentem_takipte.tasks._run_payment_due_logic",
        limit=safe_limit,
        queue="default",
        timeout=600,
    )
    return _queued_response(
        job=job,
        queue="default",
        method="acentem_takipte.tasks._run_payment_due_logic",
        limit=safe_limit,
    )


def run_scheduled_reports_job(frequency: str = "daily", limit: int = 10) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    safe_frequency = str(frequency or "daily").strip().lower() or "daily"
    job = frappe.enqueue(
        "acentem_takipte.tasks._run_scheduled_reports_logic",
        frequency=safe_frequency,
        limit=safe_limit,
        queue="long",
        timeout=1500,
    )
    return _queued_response(
        job=job,
        queue="long",
        method="acentem_takipte.tasks._run_scheduled_reports_logic",
        limit=safe_limit,
    )


def run_due_campaigns_job(limit: int = 25, member_limit: int = 200) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    safe_member_limit = max(cint(member_limit), 1)
    job = frappe.enqueue(
        "acentem_takipte.tasks._run_due_campaigns_logic",
        limit=safe_limit,
        member_limit=safe_member_limit,
        queue="long",
        timeout=1500,
    )
    return _queued_response(
        job=job,
        queue="long",
        method="acentem_takipte.tasks._run_due_campaigns_logic",
        limit=safe_limit,
    )


def run_customer_segment_snapshot_job(limit: int = 250) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    job = frappe.enqueue(
        "acentem_takipte.tasks._run_customer_segment_snapshot_logic",
        limit=safe_limit,
        queue="long",
        timeout=1500,
    )
    return _queued_response(
        job=job,
        queue="long",
        method="acentem_takipte.tasks._run_customer_segment_snapshot_logic",
        limit=safe_limit,
    )


def run_report_snapshot_job(limit: int = 1000) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    job = frappe.enqueue(
        "acentem_takipte.tasks._run_report_snapshot_logic",
        limit=safe_limit,
        queue="long",
        timeout=1500,
    )
    return _queued_response(
        job=job,
        queue="long",
        method="acentem_takipte.tasks._run_report_snapshot_logic",
        limit=safe_limit,
    )


def _run_notification_queue_logic(limit: int = 120) -> dict[str, dict[str, int]]:
    queued = queue_notification_drafts(limit=limit, include_failed=True)
    dispatched = process_notification_queue(limit=limit)
    return {"queued": queued, "dispatched": dispatched}


def _run_payment_due_logic(limit: int = 250) -> dict[str, int]:
    today = getdate(nowdate())
    target_due_date = add_days(today, 7)
    payments = frappe.get_all(
        "AT Payment",
        filters={
            "status": ATPaymentStatus.DRAFT,
            "due_date": ["<=", target_due_date],
        },
        fields=["name", "customer", "due_date", "policy"],
        order_by="due_date asc",
        limit_page_length=max(cint(limit), 1),
    )

    scanned = len(payments)
    created = 0
    skipped_duplicate = 0
    skipped_invalid = 0

    for payment in payments:
        if not payment.due_date or not payment.customer:
            skipped_invalid += 1
            continue

        reminder_payload = build_payment_reminder_payload(
            payment_name=payment.name,
            customer=payment.customer,
            policy=payment.policy,
            due_date=getdate(payment.due_date),
            business_date=today,
        )
        if not reminder_payload:
            skipped_invalid += 1
            continue

        if _payment_notification_exists_today(payment.name, today):
            skipped_duplicate += 1
            continue

        create_notification_drafts(
            event_key="payment_due",
            template_key=reminder_payload.template_key,
            reference_doctype="AT Payment",
            reference_name=payment.name,
            customer=payment.customer,
            context={
                "payment": reminder_payload.payment,
                "policy": reminder_payload.policy,
                "due_date": reminder_payload.due_date,
                "payment_stage": reminder_payload.stage_code,
                "payment_dedupe_key": reminder_payload.dedupe_key,
            },
        )
        created += 1

    summary = {
        "scanned": scanned,
        "created": created,
        "skipped_duplicate": skipped_duplicate,
        "skipped_invalid": skipped_invalid,
    }
    frappe.logger("acentem_takipte").info(
        "AT payment due reminder job summary: %s",
        build_metric_event(
            "payment.due_job",
            dimensions={"component": "tasks"},
            values=summary,
        ),
    )
    return summary


def _run_scheduled_reports_logic(frequency: str = "daily", limit: int = 10) -> dict[str, Any]:
    summary = dispatch_scheduled_reports(frequency=frequency, limit=limit)
    outbox_names = [str(item).strip() for item in (summary.pop("outboxes", []) or []) if str(item).strip()]
    fanout = _enqueue_outbox_dispatch_jobs(outbox_names)
    summary["outbox_enqueued"] = fanout["queued"]
    summary["outbox_queue_failed"] = fanout["failed"]
    summary["outbox_sent"] = 0
    summary["outbox_failed"] = 0
    summary["outbox_dead"] = 0
    summary["outbox_skipped"] = fanout["skipped"]
    return summary


def _run_due_campaigns_logic(limit: int = 25, member_limit: int = 200) -> dict[str, Any]:
    return execute_due_campaigns(limit=limit, member_limit=member_limit)


def _run_customer_segment_snapshot_logic(limit: int = 250) -> dict[str, Any]:
    return refresh_due_customer_segment_snapshots(limit=limit)


def _run_report_snapshot_logic(limit: int = 1000) -> dict[str, Any]:
    return refresh_report_snapshots(limit=max(cint(limit), 1))


def _enqueue_outbox_dispatch_jobs(outbox_names: list[str]) -> dict[str, int]:
    queued = 0
    failed = 0
    skipped = 0

    for outbox_name in outbox_names:
        normalized_name = str(outbox_name or "").strip()
        if not normalized_name:
            skipped += 1
            continue
        try:
            frappe.enqueue(
                "acentem_takipte.communication.dispatch_notification_outbox",
                outbox_name=normalized_name,
                queue="default",
                timeout=600,
            )
            queued += 1
        except Exception:
            failed += 1

    return {
        "queued": queued,
        "failed": failed,
        "skipped": skipped,
    }


def run_accounting_sync_job(limit: int = 250) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    job = frappe.enqueue(
        "acentem_takipte.accounting.sync_accounting_entries",
        limit=safe_limit,
        queue="long",
        timeout=1500,
    )
    return _queued_response(
        job=job,
        queue="long",
        method="acentem_takipte.accounting.sync_accounting_entries",
        limit=safe_limit,
    )


def run_accounting_reconciliation_job(limit: int = 400) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    job = frappe.enqueue(
        "acentem_takipte.accounting.run_reconciliation",
        limit=safe_limit,
        queue="long",
        timeout=1500,
    )
    return _queued_response(
        job=job,
        queue="long",
        method="acentem_takipte.accounting.run_reconciliation",
        limit=safe_limit,
    )


def _payment_notification_exists_today(payment_name: str, business_date) -> bool:
    start_of_day = f"{business_date} 00:00:00"
    end_of_day = f"{business_date} 23:59:59"
    rows = frappe.get_all(
        "AT Notification Draft",
        filters={
            "reference_doctype": "AT Payment",
            "reference_name": payment_name,
            "event_key": "payment_due",
            "creation": ["between", [start_of_day, end_of_day]],
        },
        fields=["name"],
        limit_page_length=5,
    )
    return bool(rows)

