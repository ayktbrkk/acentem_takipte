from __future__ import annotations

from dataclasses import dataclass
from datetime import date

import frappe
from frappe import _
from frappe.utils import add_days, date_diff, getdate, nowdate

from acentem_takipte.acentem_takipte.notifications import create_notification_drafts
from acentem_takipte.acentem_takipte.renewal.reminders import resolve_stage_for_days
from acentem_takipte.acentem_takipte.services.renewals import (
    build_renewal_stage_key,
    build_renewal_task_payload,
)
from acentem_takipte.acentem_takipte.utils.statuses import (
    ATPolicyStatus,
    ATRenewalTaskStatus,
)


@dataclass(frozen=True)
class RenewalCandidate:
    policy: str
    customer: str
    office_branch: str | None
    policy_end_date: date


RENEWAL_STATUS_TRANSITIONS = {
    ATRenewalTaskStatus.OPEN: frozenset(
        {
            ATRenewalTaskStatus.OPEN,
            ATRenewalTaskStatus.IN_PROGRESS,
            ATRenewalTaskStatus.DONE,
            ATRenewalTaskStatus.CANCELLED,
        }
    ),
    ATRenewalTaskStatus.IN_PROGRESS: frozenset(
        {
            ATRenewalTaskStatus.IN_PROGRESS,
            ATRenewalTaskStatus.DONE,
            ATRenewalTaskStatus.CANCELLED,
        }
    ),
    ATRenewalTaskStatus.DONE: frozenset({ATRenewalTaskStatus.DONE}),
    ATRenewalTaskStatus.CANCELLED: frozenset({ATRenewalTaskStatus.CANCELLED}),
    "Completed": frozenset({ATRenewalTaskStatus.DONE}),
}


def build_renewal_key(policy_name: str, due_date) -> str:
    return f"{policy_name}::{getdate(due_date).isoformat()}"


def normalize_renewal_status(value: str | None) -> str:
    normalized = str(value or "").strip() or ATRenewalTaskStatus.OPEN
    if normalized == "Completed":
        return ATRenewalTaskStatus.DONE
    if normalized not in ATRenewalTaskStatus.VALID:
        frappe.throw(_("Unsupported renewal status: {0}").format(normalized))
    return normalized


def assert_renewal_status_transition(
    previous_status: str | None, next_status: str | None
) -> str:
    normalized_previous = normalize_renewal_status(previous_status)
    normalized_next = normalize_renewal_status(next_status)
    allowed = RENEWAL_STATUS_TRANSITIONS.get(normalized_previous, frozenset())
    if normalized_next not in allowed:
        frappe.throw(
            _("Invalid renewal status transition: {0} -> {1}").format(
                normalized_previous, normalized_next
            )
        )
    return normalized_next


def get_renewal_candidates(
    *, business_date: date | None = None, lookahead_days: int = 90, limit: int = 2000
) -> list[RenewalCandidate]:
    today = getdate(business_date or nowdate())
    target_end_date = add_days(today, lookahead_days)
    policies = frappe.get_all(
        "AT Policy",
        filters={
            "status": ATPolicyStatus.ACTIVE,
            "end_date": ["between", [today, target_end_date]],
        },
        fields=["name", "customer", "office_branch", "end_date"],
        limit_page_length=limit,
    )

    candidates: list[RenewalCandidate] = []
    for policy in policies:
        if not policy.end_date:
            continue
        customer = policy.customer or frappe.db.get_value(
            "AT Policy", policy.name, "customer"
        )
        if not customer:
            continue
        candidates.append(
            RenewalCandidate(
                policy=policy.name,
                customer=customer,
                office_branch=(policy.office_branch or "").strip() or None,
                policy_end_date=getdate(policy.end_date),
            )
        )
    return candidates


def load_existing_renewal_keys(policy_names: list[str]) -> set[str]:
    if not policy_names:
        return set()

    # unbounded: existing renewal keys lookup, filtered by policy names batch - expected max ~10k rows
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


def build_task_unique_key(
    *, policy: str, customer: str | None, renewal_date, due_date
) -> str:
    renewal_day = getdate(renewal_date) if renewal_date else None
    due_day = getdate(due_date) if due_date else None
    stage = (
        resolve_stage_for_days(date_diff(renewal_day, due_day))
        if due_day and renewal_day
        else None
    )
    if stage:
        return build_renewal_stage_key(policy, customer, stage.code, due_day)
    return build_renewal_key(policy, due_day)


def create_renewal_task_doc(*, candidate: RenewalCandidate, business_date: date):
    task_payload = build_renewal_task_payload(
        policy_name=candidate.policy,
        customer=candidate.customer,
        office_branch=candidate.office_branch,
        policy_end_date=getdate(candidate.policy_end_date),
        business_date=business_date,
    )
    if not task_payload:
        return None

    return frappe.get_doc(
        {
            "doctype": "AT Renewal Task",
            "policy": task_payload.policy,
            "customer": task_payload.customer,
            "office_branch": task_payload.office_branch,
            "policy_end_date": task_payload.policy_end_date,
            "renewal_date": task_payload.renewal_date,
            "due_date": task_payload.due_date,
            "status": task_payload.status or ATRenewalTaskStatus.OPEN,
            "description": task_payload.description,
            "auto_created": task_payload.auto_created,
            "unique_key": task_payload.unique_key,
        }
    )


def create_renewal_notification_draft(task_doc) -> str | None:
    due_date = getdate(task_doc.due_date) if task_doc.due_date else None
    renewal_date = getdate(task_doc.renewal_date) if task_doc.renewal_date else None
    stage = (
        resolve_stage_for_days(date_diff(renewal_date, due_date))
        if due_date and renewal_date
        else None
    )
    drafts = create_notification_drafts(
        event_key="renewal_due",
        template_key=stage.template_key if stage else None,
        reference_doctype=task_doc.doctype,
        reference_name=task_doc.name,
        customer=task_doc.customer,
        context={
            "policy": task_doc.policy,
            "policy_end_date": task_doc.policy_end_date,
            "renewal_date": task_doc.renewal_date,
            "due_date": task_doc.due_date,
            "renewal_stage": stage.code if stage else None,
        },
    )
    if not drafts:
        return None
    first_draft = drafts[0]
    return str(getattr(first_draft, "name", None) or "").strip() or None


def remediate_stale_renewal_tasks(
    *, business_date: date | None = None, limit: int = 500
) -> dict[str, int]:
    today = getdate(business_date or nowdate())
    rows = frappe.get_all(
        "AT Renewal Task",
        filters={
            "status": [
                "in",
                [
                    ATRenewalTaskStatus.OPEN,
                    ATRenewalTaskStatus.IN_PROGRESS,
                    "Completed",
                ],
            ],
            "renewal_date": ["<", today],
            "auto_created": 1,
        },
        fields=["name"],
        order_by="renewal_date asc",
        limit_page_length=limit,
    )

    scanned = len(rows)
    updated = 0

    for row in rows:
        task = frappe.get_doc("AT Renewal Task", row.name)
        task.status = ATRenewalTaskStatus.CANCELLED
        existing_notes = str(task.notes or "").strip()
        remediation_note = _("System Note: Stale renewal task was automatically closed.")
        task.notes = (
            f"{existing_notes}\n{remediation_note}".strip()
            if existing_notes
            else remediation_note
        )
        # ignore_permissions: Renewal service internal operations; permission enforced at API layer.
        task.save(ignore_permissions=True)
        updated += 1

    if updated:
        frappe.db.commit()

    return {
        "scanned": scanned,
        "updated": updated,
        "skipped": max(scanned - updated, 0),
    }


def sync_renewal_outcome(task_doc) -> str | None:
    task_status = normalize_renewal_status(getattr(task_doc, "status", None))
    if task_status not in {ATRenewalTaskStatus.DONE, ATRenewalTaskStatus.CANCELLED}:
        return None

    lost_reason_code = (
        str(getattr(task_doc, "lost_reason_code", "") or "").strip() or None
    )
    competitor_name = (
        str(getattr(task_doc, "competitor_name", "") or "").strip() or None
    )
    if competitor_name and not lost_reason_code:
        lost_reason_code = "Competitor"

    outcome_status = "Renewed"
    if task_status == ATRenewalTaskStatus.CANCELLED:
        outcome_status = "Lost" if lost_reason_code else "Cancelled"

    outcome_name = str(getattr(task_doc, "outcome_record", None) or "").strip()
    payload = {
        "renewal_task": task_doc.name,
        "policy": task_doc.policy,
        "customer": task_doc.customer,
        "office_branch": task_doc.office_branch,
        "outcome_status": outcome_status,
        "lost_reason_code": lost_reason_code if outcome_status == "Lost" else None,
        "competitor_name": competitor_name if outcome_status == "Lost" else None,
        "notes": getattr(task_doc, "notes", None),
    }

    if outcome_name and frappe.db.exists("AT Renewal Outcome", outcome_name):
        outcome = frappe.get_doc("AT Renewal Outcome", outcome_name)
        outcome.update(payload)
        # ignore_permissions: Renewal service internal operations; permission enforced at API layer.
        outcome.save(ignore_permissions=True)
    else:
        outcome = frappe.get_doc({"doctype": "AT Renewal Outcome", **payload})
        # ignore_permissions: Renewal service internal operations; permission enforced at API layer.
        outcome.insert(ignore_permissions=True)
        task_doc.db_set("outcome_record", outcome.name, update_modified=False)

    return outcome.name
