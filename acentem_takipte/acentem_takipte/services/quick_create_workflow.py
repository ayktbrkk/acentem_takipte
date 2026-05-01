from __future__ import annotations

import frappe
from frappe import _

from acentem_takipte.acentem_takipte.services.quick_create import (
    create_activity as create_activity_service,
    create_reminder as create_reminder_service,
)
from acentem_takipte.acentem_takipte.services.quick_create_helpers import (
    _assert_create_permission,
    _normalize_datetime,
    _normalize_doctype_or_blank,
    _normalize_link,
    _normalize_option,
    _normalize_source_name,
    _resolve_office_branch,
)
from acentem_takipte.acentem_takipte.utils.notes import normalize_note_text


@frappe.whitelist()
def create_quick_activity(
    activity_title: str | None = None,
    activity_type: str | None = None,
    source_doctype: str | None = None,
    source_name: str | None = None,
    customer: str | None = None,
    policy: str | None = None,
    claim: str | None = None,
    office_branch: str | None = None,
    assigned_to: str | None = None,
    activity_at: str | None = None,
    status: str | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_create_permission(
        "AT Activity", _("You do not have permission to create activities.")
    )

    normalized_customer = _normalize_link("AT Customer", customer)
    normalized_policy = _normalize_link("AT Policy", policy)
    normalized_claim = _normalize_link("AT Claim", claim)
    normalized_assigned_to = _normalize_link("User", assigned_to)
    payload = {
        "doctype": "AT Activity",
        "activity_title": (activity_title or "").strip(),
        "activity_type": _normalize_option(
            activity_type,
            {
                "Call",
                "Visit",
                "Note",
                "Claim Update",
                "Renewal Update",
                "Collection",
                "Campaign",
                "Review",
                "Other",
            },
            default="Note",
        ),
        "source_doctype": _normalize_doctype_or_blank(source_doctype),
        "source_name": _normalize_source_name(source_doctype, source_name),
        "customer": normalized_customer,
        "policy": normalized_policy,
        "claim": normalized_claim,
        "office_branch": _resolve_office_branch(
            office_branch, customer=normalized_customer, policy=normalized_policy
        ),
        "assigned_to": normalized_assigned_to,
        "activity_at": _normalize_datetime(activity_at) or frappe.utils.now_datetime(),
        "status": _normalize_option(
            status, {"Logged", "Shared", "Archived"}, default="Logged"
        ),
        "notes": normalize_note_text(notes),
    }
    return create_activity_service(payload)


@frappe.whitelist()
def create_quick_reminder(
    reminder_title: str | None = None,
    source_doctype: str | None = None,
    source_name: str | None = None,
    customer: str | None = None,
    policy: str | None = None,
    claim: str | None = None,
    office_branch: str | None = None,
    assigned_to: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    remind_at: str | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_create_permission(
        "AT Reminder", _("You do not have permission to create reminders.")
    )

    normalized_source_doctype = _normalize_option(
        source_doctype,
        {
            "AT Customer",
            "AT Policy",
            "AT Claim",
            "AT Renewal Task",
            "AT Campaign",
            "AT Ownership Assignment",
            "AT Call Note",
            "AT Task",
        },
        default=None,
    )
    normalized_source_name = (source_name or "").strip() or None
    if (
        normalized_source_doctype
        and normalized_source_name
        and not frappe.db.exists(normalized_source_doctype, normalized_source_name)
    ):
        frappe.throw(_("Linked source record was not found"))
    normalized_customer = _normalize_link("AT Customer", customer)
    normalized_policy = _normalize_link("AT Policy", policy)
    normalized_claim = _normalize_link("AT Claim", claim)

    payload = {
        "doctype": "AT Reminder",
        "reminder_title": (reminder_title or "").strip(),
        "source_doctype": normalized_source_doctype,
        "source_name": normalized_source_name,
        "customer": normalized_customer,
        "policy": normalized_policy,
        "claim": normalized_claim,
        "office_branch": _resolve_office_branch(
            office_branch, customer=normalized_customer, policy=normalized_policy
        ),
        "assigned_to": _normalize_link("User", assigned_to, required=True),
        "status": _normalize_option(
            status, {"Open", "Done", "Cancelled"}, default="Open"
        ),
        "priority": _normalize_option(
            priority, {"Low", "Normal", "High", "Critical"}, default="Normal"
        ),
        "remind_at": _normalize_datetime(remind_at) or frappe.utils.now_datetime(),
        "notes": normalize_note_text(notes),
    }
    return create_reminder_service(payload)
