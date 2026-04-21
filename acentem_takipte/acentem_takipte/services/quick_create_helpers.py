from __future__ import annotations

import json
from datetime import date, datetime

import frappe
from frappe import _

from acentem_takipte.acentem_takipte.services.branches import (
    assert_office_branch_access,
    get_default_office_branch,
)
from acentem_takipte.acentem_takipte.utils.normalization import (
    as_check as shared_as_check,
    normalize_date as shared_normalize_date,
    normalize_datetime as shared_normalize_datetime,
    normalize_link as shared_normalize_link,
    normalize_option as shared_normalize_option,
)
from acentem_takipte.acentem_takipte.utils.permissions import assert_mutation_access


def _assert_create_permission(doctype: str, message: str) -> None:
    assert_mutation_access(
        action=f"api.quick_create.create_{doctype.lower().replace(' ', '_')}",
        roles=("System Manager", "Manager", "Agent", "Accountant"),
        doctype_permissions=(doctype,),
        permtype="create",
        details={"doctype": doctype, "permtype": "create"},
        role_message=message,
        post_message="Only POST requests are allowed for quick create/update operations.",
    )


def _assert_write_permission(doctype: str, message: str) -> None:
    assert_mutation_access(
        action=f"api.quick_create.update_{doctype.lower().replace(' ', '_')}",
        roles=("System Manager", "Manager", "Agent", "Accountant"),
        doctype_permissions=(doctype,),
        permtype="write",
        details={"doctype": doctype, "permtype": "write"},
        role_message=message,
        post_message="Only POST requests are allowed for quick create/update operations.",
    )


def _assert_delete_permission(doctype: str, message: str) -> None:
    assert_mutation_access(
        action=f"api.quick_create.delete_{doctype.lower().replace(' ', '_')}",
        roles=("System Manager", "Manager", "Agent", "Accountant"),
        doctype_permissions=(doctype,),
        permtype="delete",
        details={"doctype": doctype, "permtype": "delete"},
        role_message=message,
        post_message="Only POST requests are allowed for quick create/update operations.",
    )


def _digits_only(value: str | None) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _split_full_name(full_name: str | None) -> tuple[str, str | None]:
    cleaned = " ".join(str(full_name or "").strip().split())
    if not cleaned:
        frappe.throw(_("Full name is required."))
    parts = cleaned.split(" ")
    if len(parts) == 1:
        return parts[0], None
    return " ".join(parts[:-1]), parts[-1]


def _normalize_option(value: str | None, allowed: set[str], *, default: str) -> str:
    normalized = shared_normalize_option(value) or default
    if normalized not in allowed:
        frappe.throw(_("Unsupported option value: {0}").format(normalized))
    return normalized


def _normalize_link(
    doctype: str, value: str | None, *, required: bool = False
) -> str | None:
    normalized = shared_normalize_link(doctype, value)
    if not normalized:
        if required:
            frappe.throw(_("{0} is required.").format(frappe.bold(doctype)))
        return None
    return normalized


def _normalize_date(
    value: str | date | None, *, default: date | None = None
) -> date | None:
    if value is None or value == "":
        return default
    if isinstance(value, date) and not isinstance(value, datetime):
        return value

    normalized = str(value).strip()
    parsed = shared_normalize_date(normalized)
    if not parsed:
        frappe.throw(_("Invalid date value: {0}").format(normalized))
    return parsed


def _normalize_datetime(
    value: str | datetime | None, *, default: datetime | None = None
) -> datetime | None:
    if value is None or value == "":
        return default
    if isinstance(value, datetime):
        return value

    normalized = str(value).strip()
    parsed = shared_normalize_datetime(normalized)
    if not parsed:
        frappe.throw(_("Invalid datetime value: {0}").format(normalized))
    return parsed


def _resolve_office_branch(
    office_branch: str | None = None,
    *,
    customer: str | None = None,
    policy: str | None = None,
) -> str | None:
    explicit_branch = (
        _normalize_link("AT Office Branch", office_branch) if office_branch else None
    )
    if explicit_branch:
        return assert_office_branch_access(explicit_branch)

    policy_name = (policy or "").strip()
    if policy_name and frappe.db.exists("AT Policy", policy_name):
        policy_branch = frappe.db.get_value("AT Policy", policy_name, "office_branch")
        if policy_branch:
            # Derived office branch must also be access-checked:
            # the caller might provide a policy from a different tenant/scope.
            return assert_office_branch_access(policy_branch)

    customer_name = (customer or "").strip()
    if customer_name and frappe.db.exists("AT Customer", customer_name):
        customer_branch = frappe.db.get_value(
            "AT Customer", customer_name, "office_branch"
        )
        if customer_branch:
            # Derived office branch must also be access-checked:
            # the caller might provide a customer from a different tenant/scope.
            return assert_office_branch_access(customer_branch)

    return get_default_office_branch()


def _assert_doc_exists(doctype: str, name: str) -> None:
    if not frappe.db.exists(doctype, name):
        frappe.throw(_("{0} not found: {1}").format(frappe.bold(doctype), name))


def _as_check(value, *, default: int = 0) -> int:
    if value in {None, ""}:
        return 1 if default else 0
    normalized = str(value).strip().lower()
    return shared_as_check(normalized in {"1", "true", "yes", "on"})


def _normalize_doctype_or_blank(value: str | None) -> str | None:
    normalized = (value or "").strip()
    if not normalized:
        return None
    _assert_doc_exists("DocType", normalized)
    return normalized


def _normalize_source_name(
    source_doctype: str | None, source_name: str | None
) -> str | None:
    sd = (source_doctype or "").strip()
    sn = (source_name or "").strip()
    if not sn:
        return None
    if not sd:
        frappe.throw(_("Source DocType is required when Source Name is provided."))
    _assert_doc_exists(sd, sn)
    return sn


def _normalize_reconciliation_action(value: str | None) -> str | None:
    normalized = (value or "").strip()
    if not normalized:
        return None
    allowed = {"Matched", "Adjusted", "Manual Override", "Ignored"}
    if normalized not in allowed:
        frappe.throw(_("Unsupported option value: {0}").format(normalized))
    return normalized


ALLOWED_AUX_EDIT_FIELDS: dict[str, set[str]] = {
    "AT Call Note": {
        "customer",
        "policy",
        "claim",
        "office_branch",
        "channel",
        "direction",
        "call_status",
        "call_outcome",
        "note_at",
        "next_follow_up_on",
        "notes",
    },
    "AT Segment": {
        "segment_name",
        "segment_type",
        "channel_focus",
        "office_branch",
        "status",
        "criteria_json",
        "notes",
    },
    "AT Campaign": {
        "campaign_name",
        "segment",
        "template",
        "channel",
        "office_branch",
        "status",
        "scheduled_for",
        "notes",
    },
    "AT Claim": {
        "assigned_expert",
        "claim_status",
        "rejection_reason",
        "appeal_status",
        "next_follow_up_on",
        "approved_amount",
        "notes",
    },
    "AT Customer Relation": {
        "customer",
        "related_customer",
        "relation_type",
        "is_household",
        "notes",
    },
    "AT Insured Asset": {
        "customer",
        "policy",
        "asset_type",
        "asset_label",
        "asset_identifier",
        "notes",
    },
    "AT Ownership Assignment": {
        "source_doctype",
        "source_name",
        "customer",
        "policy",
        "office_branch",
        "assigned_to",
        "assignment_role",
        "status",
        "priority",
        "due_date",
        "notes",
    },
    "AT Task": {
        "task_title",
        "task_type",
        "source_doctype",
        "source_name",
        "customer",
        "policy",
        "claim",
        "office_branch",
        "assigned_to",
        "status",
        "priority",
        "due_date",
        "reminder_at",
        "notes",
    },
    "AT Activity": {
        "activity_title",
        "activity_type",
        "source_doctype",
        "source_name",
        "customer",
        "policy",
        "claim",
        "office_branch",
        "assigned_to",
        "activity_at",
        "status",
        "notes",
    },
    "AT Reminder": {
        "reminder_title",
        "source_doctype",
        "source_name",
        "customer",
        "policy",
        "claim",
        "office_branch",
        "assigned_to",
        "status",
        "priority",
        "remind_at",
        "notes",
    },
    "AT Insurance Company": {"company_name", "company_code", "is_active"},
    "AT Branch": {"branch_name", "branch_code", "insurance_company", "is_active"},
    "AT Sales Entity": {"entity_type", "full_name", "office_branch", "parent_entity"},
    "AT Notification Template": {
        "template_key",
        "event_key",
        "channel",
        "content_mode",
        "language",
        "provider_template_name",
        "provider_template_category",
        "variables_schema_json",
        "subject",
        "body_template",
        "sms_body_template",
        "email_body_template",
        "whatsapp_body_template",
        "is_active",
    },
    "AT Accounting Entry": {
        "source_doctype",
        "source_name",
        "entry_type",
        "status",
        "policy",
        "customer",
        "office_branch",
        "sales_entity",
        "insurance_company",
        "currency",
        "local_amount",
        "local_amount_try",
        "external_amount",
        "external_amount_try",
        "external_ref",
    },
    "AT Reconciliation Item": {
        "accounting_entry",
        "source_doctype",
        "source_name",
        "status",
        "mismatch_type",
        "local_amount_try",
        "external_amount_try",
        "resolution_action",
        "notes",
    },
    "AT Document": {
        "secondary_file_name",
        "notes",
    },
}


def _normalize_aux_edit_doctype(doctype: str | None) -> str:
    value = (doctype or "").strip()
    if value not in ALLOWED_AUX_EDIT_FIELDS:
        frappe.throw(_("Unsupported quick edit doctype: {0}").format(value))
    return value


def _normalize_aux_delete_doctype(doctype: str | None) -> str:
    value = (doctype or "").strip()
    if value not in {
        "AT Customer Relation",
        "AT Insured Asset",
        "AT Ownership Assignment",
    }:
        frappe.throw(_("Unsupported quick delete doctype: {0}").format(value))
    return value


def _parse_update_payload(data) -> dict:
    if data is None:
        return {}
    if isinstance(data, dict):
        return data
    if isinstance(data, str):
        try:
            parsed = json.loads(data)
        except json.JSONDecodeError:
            frappe.throw(_("Invalid update payload"))
        if not isinstance(parsed, dict):
            frappe.throw(_("Invalid update payload"))
        return parsed
    frappe.throw(_("Invalid update payload"))


def _apply_aux_edit_payload(doc, payload: dict) -> None:
    from acentem_takipte.acentem_takipte.api.aux_edit_registry import (
        apply_field_value,
        resolve_handler,
    )

    allowed_fields = ALLOWED_AUX_EDIT_FIELDS.get(doc.doctype, set())
    for field, value in (payload or {}).items():
        if field not in allowed_fields:
            continue

        handler_spec = resolve_handler(doc.doctype, field)
        if handler_spec:
            apply_field_value(doc, field, value, handler_spec)
        else:
            # Fallback: treat unknown fields as strip-string
            setattr(doc, field, (value or "").strip() or None)
