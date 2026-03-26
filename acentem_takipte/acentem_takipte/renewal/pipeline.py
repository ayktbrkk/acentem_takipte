from __future__ import annotations

from frappe.exceptions import DuplicateEntryError
from frappe.utils import getdate, nowdate

from acentem_takipte.acentem_takipte.renewal.service import (
    create_renewal_notification_draft,
    create_renewal_task_doc,
    get_renewal_candidates,
    load_existing_renewal_keys,
    remediate_stale_renewal_tasks,
)
from acentem_takipte.acentem_takipte.renewal.telemetry import (
    log_renewal_job_summary,
    log_renewal_remediation_summary,
)


def run_renewal_task_creation(
    *, business_date=None, lookahead_days: int = 90, limit: int = 2000
) -> dict[str, int]:
    today = getdate(business_date or nowdate())
    candidates = get_renewal_candidates(
        business_date=today, lookahead_days=lookahead_days, limit=limit
    )
    existing_keys = load_existing_renewal_keys(
        [candidate.policy for candidate in candidates]
    )

    scanned = len(candidates)
    created = 0
    skipped_existing = 0
    skipped_race = 0
    skipped_invalid = 0

    for candidate in candidates:
        doc = create_renewal_task_doc(candidate=candidate, business_date=today)
        if not doc:
            skipped_invalid += 1
            continue

        unique_key = str(getattr(doc, "unique_key", None) or "").strip()
        if unique_key and unique_key in existing_keys:
            skipped_existing += 1
            continue

        try:
            # ignore_permissions: Renewal task creation pipeline; runs from scheduler job.
            doc.insert(ignore_permissions=True)
            if unique_key:
                existing_keys.add(unique_key)
            created += 1
        except DuplicateEntryError:
            skipped_race += 1

    if created:
        import frappe

        frappe.db.commit()

    summary = {
        "scanned": scanned,
        "created": created,
        "skipped_existing": skipped_existing,
        "skipped_race": skipped_race,
        "skipped_invalid": skipped_invalid,
    }
    log_renewal_job_summary(summary)
    return summary


def queue_renewal_task_notification(task_doc) -> str | None:
    return create_renewal_notification_draft(task_doc)


def run_stale_renewal_task_remediation(
    *, business_date=None, limit: int = 500
) -> dict[str, int]:
    summary = remediate_stale_renewal_tasks(business_date=business_date, limit=limit)
    log_renewal_remediation_summary(summary)
    return summary
