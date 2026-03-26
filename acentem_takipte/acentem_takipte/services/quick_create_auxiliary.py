from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import add_days, nowdate

from acentem_takipte.acentem_takipte.api.quick_payloads import (
    QuickOwnershipAssignmentPayload,
)
from acentem_takipte.acentem_takipte.services.quick_create import (
    create_campaign as create_campaign_service,
    create_call_note as create_call_note_service,
    create_customer_relation as create_customer_relation_service,
    create_insured_asset as create_insured_asset_service,
    create_ownership_assignment as create_ownership_assignment_service,
    create_renewal_task as create_renewal_task_service,
    create_segment as create_segment_service,
)
from acentem_takipte.acentem_takipte.services.quick_create_helpers import (
    _as_check,
    _assert_create_permission,
    _normalize_date,
    _normalize_datetime,
    _normalize_link,
    _normalize_option,
    _resolve_office_branch,
)
from acentem_takipte.acentem_takipte.utils.notes import normalize_note_text
from acentem_takipte.acentem_takipte.utils.statuses import ATRenewalTaskStatus


@frappe.whitelist()
def create_quick_renewal_task(
    policy: str | None = None,
    customer: str | None = None,
    office_branch: str | None = None,
    renewal_date: str | None = None,
    due_date: str | None = None,
    status: str | None = None,
    lost_reason_code: str | None = None,
    competitor_name: str | None = None,
    assigned_to: str | None = None,
    notes: str | None = None,
    auto_created: int | None = 0,
) -> dict[str, str]:
    _assert_create_permission(
        "AT Renewal Task", _("You do not have permission to create renewal tasks.")
    )

    today = _normalize_date(nowdate())
    renewal = _normalize_date(renewal_date) or add_days(today, 30)
    due = _normalize_date(due_date) or add_days(renewal, -15)
    normalized_policy = _normalize_link("AT Policy", policy, required=True)
    normalized_customer = _normalize_link("AT Customer", customer, required=True)

    payload = {
        "doctype": "AT Renewal Task",
        "policy": normalized_policy,
        "customer": normalized_customer,
        "office_branch": _resolve_office_branch(
            office_branch, customer=normalized_customer, policy=normalized_policy
        ),
        "renewal_date": renewal,
        "due_date": due,
        "status": _normalize_option(
            status, set(ATRenewalTaskStatus.VALID), default=ATRenewalTaskStatus.OPEN
        ),
        "lost_reason_code": _normalize_option(
            lost_reason_code,
            {
                "Price",
                "Competitor",
                "Service",
                "Customer Declined",
                "Coverage Mismatch",
                "Other",
            },
            default="Competitor",
        )
        if (lost_reason_code or "").strip()
        else None,
        "competitor_name": (competitor_name or "").strip() or None,
        "assigned_to": (assigned_to or "").strip() or None,
        "notes": normalize_note_text(notes),
        "auto_created": 1 if str(auto_created or 0) in {"1", "true", "True"} else 0,
    }

    return create_renewal_task_service(payload)


@frappe.whitelist()
def create_quick_customer_relation(
    customer: str | None = None,
    related_customer: str | None = None,
    relation_type: str | None = None,
    is_household: int | str | bool | None = 0,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_create_permission(
        "AT Customer Relation",
        _("You do not have permission to create customer relations."),
    )

    payload = {
        "doctype": "AT Customer Relation",
        "customer": _normalize_link("AT Customer", customer, required=True),
        "related_customer": _normalize_link(
            "AT Customer", related_customer, required=True
        ),
        "relation_type": _normalize_option(
            relation_type,
            {"Spouse", "Child", "Parent", "Sibling", "Partner", "Household", "Other"},
            default="Other",
        ),
        "is_household": _as_check(is_household, default=0),
        "notes": normalize_note_text(notes),
    }
    return create_customer_relation_service(payload)


@frappe.whitelist()
def create_quick_insured_asset(
    customer: str | None = None,
    policy: str | None = None,
    asset_type: str | None = None,
    asset_label: str | None = None,
    asset_identifier: str | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_create_permission(
        "AT Insured Asset", _("You do not have permission to create insured assets.")
    )

    normalized_customer = _normalize_link("AT Customer", customer, required=True)
    normalized_policy = _normalize_link("AT Policy", policy)
    payload = {
        "doctype": "AT Insured Asset",
        "customer": normalized_customer,
        "policy": normalized_policy,
        "asset_type": _normalize_option(
            asset_type,
            {
                "Vehicle",
                "Home",
                "Health Person",
                "Workplace",
                "Travel",
                "Boat",
                "Farm",
                "Other",
            },
            default="Other",
        ),
        "asset_label": (asset_label or "").strip(),
        "asset_identifier": (asset_identifier or "").strip() or None,
        "notes": normalize_note_text(notes),
    }
    return create_insured_asset_service(payload)


@frappe.whitelist()
def create_quick_call_note(
    customer: str | None = None,
    policy: str | None = None,
    claim: str | None = None,
    office_branch: str | None = None,
    channel: str | None = None,
    direction: str | None = None,
    call_status: str | None = None,
    call_outcome: str | None = None,
    note_at: str | None = None,
    next_follow_up_on: str | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_create_permission(
        "AT Call Note", _("You do not have permission to create call notes.")
    )

    normalized_customer = _normalize_link("AT Customer", customer, required=True)
    normalized_policy = _normalize_link("AT Policy", policy)
    payload = {
        "doctype": "AT Call Note",
        "customer": normalized_customer,
        "policy": normalized_policy,
        "claim": _normalize_link("AT Claim", claim),
        "office_branch": _resolve_office_branch(
            office_branch, customer=normalized_customer, policy=normalized_policy
        ),
        "channel": _normalize_option(
            channel,
            {"Phone Call", "WhatsApp Call", "Video Call", "Other"},
            default="Phone Call",
        ),
        "direction": _normalize_option(
            direction, {"Inbound", "Outbound"}, default="Outbound"
        ),
        "call_status": _normalize_option(
            call_status,
            {"Planned", "Completed", "Missed", "No Answer", "Cancelled"},
            default="Completed",
        ),
        "call_outcome": (call_outcome or "").strip() or None,
        "note_at": _normalize_datetime(note_at) or frappe.utils.now_datetime(),
        "next_follow_up_on": _normalize_date(next_follow_up_on)
        if next_follow_up_on
        else None,
        "notes": normalize_note_text(notes),
    }
    return create_call_note_service(payload)


@frappe.whitelist()
def create_quick_segment(
    segment_name: str | None = None,
    segment_type: str | None = None,
    channel_focus: str | None = None,
    office_branch: str | None = None,
    status: str | None = None,
    criteria_json: str | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_create_permission(
        "AT Segment", _("You do not have permission to create segments.")
    )

    payload = {
        "doctype": "AT Segment",
        "segment_name": (segment_name or "").strip(),
        "segment_type": _normalize_option(
            segment_type, {"Static", "Dynamic", "Operational"}, default="Static"
        ),
        "channel_focus": _normalize_option(
            channel_focus,
            {"WHATSAPP", "SMS", "Email", "Phone Call"},
            default="WHATSAPP",
        ),
        "office_branch": _resolve_office_branch(office_branch),
        "status": _normalize_option(
            status, {"Draft", "Active", "Archived"}, default="Draft"
        ),
        "criteria_json": (criteria_json or "").strip() or None,
        "notes": normalize_note_text(notes),
    }
    return create_segment_service(payload)


@frappe.whitelist()
def create_quick_campaign(
    campaign_name: str | None = None,
    segment: str | None = None,
    template: str | None = None,
    channel: str | None = None,
    office_branch: str | None = None,
    status: str | None = None,
    scheduled_for: str | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_create_permission(
        "AT Campaign", _("You do not have permission to create campaigns.")
    )

    payload = {
        "doctype": "AT Campaign",
        "campaign_name": (campaign_name or "").strip(),
        "segment": _normalize_link("AT Segment", segment, required=True),
        "template": _normalize_link("AT Notification Template", template),
        "channel": _normalize_option(
            channel, {"WHATSAPP", "SMS", "Email", "Phone Call"}, default="WHATSAPP"
        ),
        "office_branch": _resolve_office_branch(office_branch),
        "status": _normalize_option(
            status,
            {"Draft", "Planned", "Running", "Completed", "Cancelled"},
            default="Draft",
        ),
        "scheduled_for": _normalize_datetime(scheduled_for) if scheduled_for else None,
        "notes": normalize_note_text(notes),
    }
    return create_campaign_service(payload)


@frappe.whitelist()
def create_quick_ownership_assignment(
    payload: QuickOwnershipAssignmentPayload | None = None,
    **kwargs,
) -> dict[str, str]:
    quick_payload = QuickOwnershipAssignmentPayload.from_input(payload, **kwargs)
    _assert_create_permission(
        "AT Ownership Assignment",
        _("You do not have permission to create ownership assignments."),
    )

    normalized_source_doctype = _normalize_option(
        quick_payload.source_doctype,
        {"AT Customer", "AT Policy", "AT Claim", "AT Renewal Task", "AT Campaign"},
        default=None,
    )
    normalized_source_name = (quick_payload.source_name or "").strip() or None
    if (
        normalized_source_doctype
        and normalized_source_name
        and not frappe.db.exists(normalized_source_doctype, normalized_source_name)
    ):
        frappe.throw(_("Linked source record was not found"))
    normalized_customer = _normalize_link("AT Customer", quick_payload.customer)
    normalized_policy = _normalize_link("AT Policy", quick_payload.policy)

    payload = {
        "doctype": "AT Ownership Assignment",
        "source_doctype": normalized_source_doctype,
        "source_name": normalized_source_name,
        "customer": normalized_customer,
        "policy": normalized_policy,
        "office_branch": _resolve_office_branch(
            quick_payload.office_branch,
            customer=normalized_customer,
            policy=normalized_policy,
        ),
        "assigned_to": _normalize_link("User", quick_payload.assigned_to, required=True),
        "assignment_role": _normalize_option(
            quick_payload.assignment_role,
            {"Owner", "Assignee", "Reviewer", "Follower"},
            default="Owner",
        ),
        "status": _normalize_option(
            quick_payload.status,
            {"Open", "In Progress", "Blocked", "Done", "Cancelled"},
            default="Open",
        ),
        "priority": _normalize_option(
            quick_payload.priority, {"Low", "Normal", "High", "Critical"}, default="Normal"
        ),
        "due_date": _normalize_date(quick_payload.due_date)
        if quick_payload.due_date
        else None,
        "notes": normalize_note_text(quick_payload.notes),
    }
    return create_ownership_assignment_service(payload)
