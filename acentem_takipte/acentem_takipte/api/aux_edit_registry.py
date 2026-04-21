"""Data-driven field handler registry for aux edit payload processing.

Replaces the 233-line if/elif chain in _apply_aux_edit_payload with a
lookup table. Each entry maps (doctype, field) to a handler tuple.

Handler format: (handler_type, *handler_args)
  - ("strip",)                    → (value or "").strip() or None
  - ("option", allowed_set, def)  → _normalize_option(value, allowed_set, default=def)
  - ("link", doctype)             → _normalize_link(doctype, value)
  - ("link_req", doctype)         → _normalize_link(doctype, value, required=True)
  - ("date",)                     → _normalize_date(value)
  - ("datetime",)                 → _normalize_datetime(value)
  - ("check",)                    → _as_check(value)
  - ("float",)                    → flt(value) if value not in {None, ""} else 0
  - ("currency",)                 → ((value or "TRY").strip() or "TRY").upper()
  - ("source_name",)              → _normalize_source_name(doc.source_doctype, value)
  - ("source_doctype",)           → _normalize_doctype_or_blank(value)
  - ("recon_action",)             → _normalize_reconciliation_action(value)
"""

from __future__ import annotations

import frappe
from frappe.utils import flt

from acentem_takipte.acentem_takipte.utils.statuses import (
    ATAccountingEntryStatus,
    ATClaimStatus,
    ATReconciliationItemStatus,
)

# Fallback values
_ANY = "*"

# Registry: (doctype, field) → (handler_type, *args)
# Use _ANY as doctype for cross-doctype defaults
FIELD_REGISTRY: dict[tuple[str, str], tuple] = {
    # ── Strip (text) fields ──
    (_ANY, "company_name"): ("strip",),
    (_ANY, "company_code"): ("strip",),
    (_ANY, "branch_name"): ("strip",),
    (_ANY, "branch_code"): ("strip",),
    (_ANY, "full_name"): ("strip",),
    (_ANY, "template_key"): ("strip",),
    (_ANY, "event_key"): ("strip",),
    (_ANY, "provider_template_name"): ("strip",),
    (_ANY, "variables_schema_json"): ("strip",),
    (_ANY, "subject"): ("strip",),
    (_ANY, "body_template"): ("strip",),
    (_ANY, "sms_body_template"): ("strip",),
    (_ANY, "email_body_template"): ("strip",),
    (_ANY, "whatsapp_body_template"): ("strip",),
    (_ANY, "external_ref"): ("strip",),
    (_ANY, "notes"): ("strip",),
    (_ANY, "secondary_file_name"): ("strip",),
    (_ANY, "criteria_json"): ("strip",),
    (_ANY, "asset_label"): ("strip",),
    (_ANY, "asset_identifier"): ("strip",),
    ("AT Ownership Assignment", "source_name"): ("strip",),
    ("AT Task", "source_name"): ("strip",),
    ("AT Reminder", "source_name"): ("strip",),
    # ── Checkbox fields ──
    (_ANY, "is_active"): ("check",),
    # ── Link fields (generic) ──
    (_ANY, "insurance_company"): ("link", "AT Insurance Company"),
    (_ANY, "segment"): ("link_req", "AT Segment"),
    (_ANY, "template"): ("link", "AT Notification Template"),
    (_ANY, "parent_entity"): ("link", "AT Sales Entity"),
    (_ANY, "policy"): ("link", "AT Policy"),
    (_ANY, "claim"): ("link", "AT Claim"),
    (_ANY, "customer"): ("link", "AT Customer"),
    (_ANY, "office_branch"): ("link", "AT Office Branch"),
    (_ANY, "accounting_entry"): ("link_req", "AT Accounting Entry"),
    # ── Link fields (doctype-specific) ──
    ("AT Customer Relation", "customer"): ("link_req", "AT Customer"),
    ("AT Customer Relation", "related_customer"): ("link_req", "AT Customer"),
    ("AT Customer Relation", "is_household"): ("check",),
    ("AT Insured Asset", "customer"): ("link_req", "AT Customer"),
    ("AT Insured Asset", "policy"): ("link", "AT Policy"),
    ("AT Ownership Assignment", "customer"): ("link", "AT Customer"),
    ("AT Ownership Assignment", "policy"): ("link", "AT Policy"),
    ("AT Ownership Assignment", "assigned_to"): ("link_req", "User"),
    ("AT Ownership Assignment", "office_branch"): ("link", "AT Office Branch"),
    ("AT Task", "assigned_to"): ("link_req", "User"),
    ("AT Task", "office_branch"): ("link", "AT Office Branch"),
    ("AT Reminder", "assigned_to"): ("link_req", "User"),
    ("AT Reminder", "office_branch"): ("link", "AT Office Branch"),
    ("AT Sales Entity", "office_branch"): ("link_req", "AT Office Branch"),
    ("AT Activity", "assigned_to"): ("link", "User"),
    ("AT Claim", "assigned_expert"): ("link", "User"),
    # ── Option fields ──
    (_ANY, "relation_type"): (
        "option",
        {"Spouse", "Child", "Parent", "Sibling", "Partner", "Household", "Other"},
        "Other",
    ),
    (_ANY, "asset_type"): (
        "option",
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
        "Other",
    ),
    (_ANY, "entity_type"): (
        "option",
        {"Agency", "Sub-Account", "Representative"},
        "Agency",
    ),
    (_ANY, "channel"): ("option", {"SMS", "Email", "WHATSAPP", "Both"}, "Both"),
    (_ANY, "content_mode"): ("option", {"freeform", "template"}, "freeform"),
    (_ANY, "language"): ("option", {"tr", "en"}, "en"),
    (_ANY, "provider_template_category"): (
        "option",
        {"UTILITY", "MARKETING", "AUTHENTICATION"},
        "UTILITY",
    ),
    (_ANY, "segment_type"): ("option", {"Static", "Dynamic", "Operational"}, "Static"),
    (_ANY, "channel_focus"): (
        "option",
        {"WHATSAPP", "SMS", "Email", "Phone Call"},
        "WHATSAPP",
    ),
    (_ANY, "assignment_role"): (
        "option",
        {"Owner", "Assignee", "Reviewer", "Follower"},
        "Owner",
    ),
    (_ANY, "task_type"): (
        "option",
        {
            "Follow-up",
            "Visit",
            "Call",
            "Collection",
            "Claim",
            "Renewal",
            "Review",
            "Other",
        },
        "Follow-up",
    ),
    (_ANY, "priority"): ("option", {"Low", "Normal", "High", "Critical"}, "Normal"),
    (_ANY, "entry_type"): ("option", {"Policy", "Payment", "Claim"}, "Policy"),
    (_ANY, "mismatch_type"): (
        "option",
        {"Amount", "Currency", "Missing External", "Missing Local", "Status", "Other"},
        "Amount",
    ),
    ("AT Call Note", "channel"): (
        "option",
        {"Phone Call", "WhatsApp Call", "Video Call", "Other"},
        "Phone Call",
    ),
    ("AT Call Note", "direction"): ("option", {"Inbound", "Outbound"}, "Outbound"),
    ("AT Call Note", "call_status"): (
        "option",
        {"Planned", "Completed", "Missed", "No Answer", "Cancelled"},
        "Completed",
    ),
    ("AT Activity", "activity_type"): (
        "option",
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
        "Note",
    ),
    ("AT Activity", "status"): ("option", {"Logged", "Shared", "Archived"}, "Logged"),
    ("AT Claim", "claim_status"): (
        "option",
        set(ATClaimStatus.VALID),
        ATClaimStatus.OPEN,
    ),
    ("AT Claim", "appeal_status"): (
        "option",
        {"", "No Appeal", "Appeal Pending", "Appeal Accepted", "Appeal Rejected"},
        "",
    ),
    ("AT Claim", "next_follow_up_on"): ("date",),
    ("AT Claim", "approved_amount"): ("float",),
    # ── Option fields (doctype-specific status) ──
    ("AT Ownership Assignment", "status"): (
        "option",
        {"Open", "In Progress", "Blocked", "Done", "Cancelled"},
        "Open",
    ),
    ("AT Task", "status"): (
        "option",
        {"Open", "In Progress", "Blocked", "Done", "Cancelled"},
        "Open",
    ),
    ("AT Reminder", "status"): ("option", {"Open", "Done", "Cancelled"}, "Open"),
    ("AT Accounting Entry", "status"): (
        "option",
        set(ATAccountingEntryStatus.VALID),
        ATAccountingEntryStatus.DRAFT,
    ),
    ("AT Reconciliation Item", "status"): (
        "option",
        set(
            ATReconciliationItemStatus.RESOLUTION_REQUIRED
            | ATReconciliationItemStatus.CLOSED
        ),
        ATReconciliationItemStatus.OPEN,
    ),
    ("AT Segment", "status"): ("option", {"Draft", "Active", "Archived"}, "Draft"),
    ("AT Campaign", "status"): (
        "option",
        {"Draft", "Planned", "Running", "Completed", "Cancelled"},
        "Draft",
    ),
    ("AT Campaign", "channel"): (
        "option",
        {"WHATSAPP", "SMS", "Email", "Phone Call"},
        "WHATSAPP",
    ),
    ("AT Notification Template", "channel"): (
        "option",
        {"SMS", "Email", "WHATSAPP", "Both"},
        "Both",
    ),
    # ── Source doctype fields (doctype-specific) ──
    ("AT Ownership Assignment", "source_doctype"): (
        "option",
        {"AT Customer", "AT Policy", "AT Claim", "AT Renewal Task", "AT Campaign"},
        None,
    ),
    ("AT Task", "source_doctype"): (
        "option",
        {
            "AT Customer",
            "AT Policy",
            "AT Claim",
            "AT Renewal Task",
            "AT Campaign",
            "AT Ownership Assignment",
            "AT Call Note",
        },
        None,
    ),
    ("AT Reminder", "source_doctype"): (
        "option",
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
        None,
    ),
    # ── Date fields ──
    ("AT Call Note", "next_follow_up_on"): ("date",),
    ("AT Claim", "next_follow_up_on"): ("date",),
    ("AT Ownership Assignment", "due_date"): ("date",),
    ("AT Task", "due_date"): ("date",),
    # ── Datetime fields ──
    ("AT Call Note", "note_at"): ("datetime",),
    ("AT Task", "reminder_at"): ("datetime",),
    ("AT Reminder", "remind_at"): ("datetime",),
    ("AT Activity", "activity_at"): ("datetime",),
    ("AT Campaign", "scheduled_for"): ("datetime",),
    # ── Fallback source handling ──
    (_ANY, "source_doctype"): ("source_doctype",),
    (_ANY, "source_name"): ("source_name",),
    # ── Reconciliation ──
    (_ANY, "resolution_action"): ("recon_action",),
    # ── Float / Currency ──
    (_ANY, "local_amount"): ("float",),
    (_ANY, "local_amount_try"): ("float",),
    (_ANY, "external_amount"): ("float",),
    (_ANY, "external_amount_try"): ("float",),
    (_ANY, "currency"): ("currency",),
}


def resolve_handler(doctype: str, field: str) -> tuple | None:
    """Look up handler for (doctype, field) with fallback to (_ANY, field)."""
    return FIELD_REGISTRY.get((doctype, field)) or FIELD_REGISTRY.get((_ANY, field))


def apply_field_value(doc, field: str, value, handler_spec: tuple) -> None:
    """Apply a field value to a document using the handler spec."""
    from acentem_takipte.acentem_takipte.services.quick_create_helpers import (
        _normalize_date,
        _normalize_datetime,
        _normalize_doctype_or_blank,
        _normalize_link,
        _normalize_option,
        _normalize_reconciliation_action,
        _normalize_source_name,
        _as_check,
    )

    handler_type = handler_spec[0]

    if handler_type == "strip":
        setattr(doc, field, (value or "").strip() or None)
    elif handler_type == "option":
        allowed, default = handler_spec[1], handler_spec[2]
        setattr(doc, field, _normalize_option(value, allowed, default=default))
    elif handler_type == "link":
        setattr(doc, field, _normalize_link(handler_spec[1], value))
    elif handler_type == "link_req":
        setattr(doc, field, _normalize_link(handler_spec[1], value, required=True))
    elif handler_type == "date":
        setattr(doc, field, _normalize_date(value) if value else None)
    elif handler_type == "datetime":
        setattr(doc, field, _normalize_datetime(value) if value else None)
    elif handler_type == "check":
        setattr(doc, field, _as_check(value))
    elif handler_type == "float":
        setattr(doc, field, flt(value) if value not in {None, ""} else 0)
    elif handler_type == "currency":
        setattr(doc, field, ((value or "TRY").strip() or "TRY").upper())
    elif handler_type == "source_doctype":
        setattr(doc, field, _normalize_doctype_or_blank(value))
    elif handler_type == "source_name":
        setattr(
            doc,
            field,
            _normalize_source_name(getattr(doc, "source_doctype", None), value),
        )
    elif handler_type == "recon_action":
        setattr(doc, field, _normalize_reconciliation_action(value))
