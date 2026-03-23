from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint

from acentem_takipte.api.security import (
    assert_authenticated,
    assert_doctype_permission,
    assert_doc_permission,
)
from acentem_takipte.services.branches import (
    assert_office_branch_access,
    get_default_office_branch,
    normalize_requested_office_branch,
)
from acentem_takipte.services.campaigns import execute_campaign as execute_campaign_service
from acentem_takipte.services.segments import build_segment_membership_preview
from acentem_takipte.utils.statuses import ATNotificationDraftStatus
from acentem_takipte import communication as communication_logic
from acentem_takipte.utils.permissions import assert_mutation_access, build_doctype_permission_map


COMMUNICATION_ADMIN_ROLES = ("System Manager", "Manager", "Accountant")
COMMUNICATION_MUTATION_DOCTYPES = build_doctype_permission_map(
    create_quick_notification_draft=("AT Notification Draft",),
    execute_campaign=("AT Campaign", "AT Segment", "AT Notification Draft"),
    run_dispatch_cycle=("AT Notification Outbox",),
    send_draft_now=("AT Notification Draft",),
    retry_outbox_item=("AT Notification Outbox",),
    requeue_outbox_item=("AT Notification Outbox",),
)


def _assert_dispatch_mutation_access(
    action: str,
    *,
    details: dict | None = None,
    permission_targets: tuple[str, ...] | None = None,
) -> None:
    assert_mutation_access(
        action=action,
        roles=COMMUNICATION_ADMIN_ROLES,
        doctype_permissions=permission_targets or (),
        details=details,
        role_message="You do not have permission to run communication actions.",
        post_message="Only POST requests are allowed for communication mutations.",
    )


@frappe.whitelist()
def get_queue_snapshot(
    customer: str | None = None,
    status: str | None = None,
    channel: str | None = None,
    reference_doctype: str | None = None,
    reference_name: str | None = None,
    office_branch: str | None = None,
    limit: int = 50,
) -> dict:
    assert_authenticated()
    assert_doctype_permission(
        "AT Notification Outbox",
        "read",
        "You do not have permission to view notification outbox records.",
    )
    assert_doctype_permission(
        "AT Notification Draft",
        "read",
        "You do not have permission to view notification drafts.",
    )
    office_branch = normalize_requested_office_branch(office_branch)

    # Filter for Outbox
    outbox_filters = {}
    if customer: outbox_filters["customer"] = customer
    if status: outbox_filters["status"] = status
    if channel: outbox_filters["channel"] = channel
    if reference_doctype: outbox_filters["reference_doctype"] = reference_doctype
    if reference_name: outbox_filters["reference_name"] = reference_name
    if office_branch: outbox_filters["office_branch"] = office_branch

    outbox = frappe.get_list(
        "AT Notification Outbox",
        fields=["name", "draft", "channel", "recipient", "status", "attempt_count", "max_attempts", "next_retry_on", "error_message", "reference_doctype", "reference_name", "office_branch"],
        filters=outbox_filters,
        order_by="modified desc",
        limit_page_length=max(cint(limit), 1)
    )

    # Filter for Drafts (only showing recent drafts that aren't yet sent)
    draft_filters = {
        "status": ["in", [ATNotificationDraftStatus.DRAFT, ATNotificationDraftStatus.QUEUED, ATNotificationDraftStatus.FAILED]]
    }
    if customer: draft_filters["customer"] = customer
    if channel: draft_filters["channel"] = channel
    if office_branch: draft_filters["office_branch"] = office_branch

    drafts = frappe.get_list(
        "AT Notification Draft",
        fields=["name", "event_key", "channel", "recipient", "status", "error_message", "reference_doctype", "reference_name", "office_branch"],
        filters=draft_filters,
        order_by="modified desc",
        limit_page_length=max(cint(limit), 1)
    )

    # Status Breakdown
    breakdown_sql = """
        select status, count(*) as total
        from `tabAT Notification Outbox`
    """
    breakdown_params = {}
    if office_branch:
        breakdown_sql += " where office_branch = %(office_branch)s"
        breakdown_params["office_branch"] = office_branch
    breakdown_sql += " group by status"
    breakdown = frappe.db.sql(breakdown_sql, breakdown_params, as_dict=True)

    return {
        "outbox": outbox,
        "drafts": drafts,
        "status_breakdown": breakdown,
        "selected_office_branch": office_branch,
    }


@frappe.whitelist()
def create_quick_notification_draft(
    template: str,
    recipient: str,
    *,
    channel: str | None = None,
    language: str | None = None,
    customer: str | None = None,
    office_branch: str | None = None,
    reference_doctype: str | None = None,
    reference_name: str | None = None,
    subject: str | None = None,
    body: str | None = None,
    send_now: int | bool = 0,
) -> dict:
    _assert_dispatch_mutation_access(
        "api.communication.create_quick_notification_draft",
        details={"template": template, "customer": customer},
        permission_targets=COMMUNICATION_MUTATION_DOCTYPES["create_quick_notification_draft"],
    )

    template_name = str(template or "").strip()
    if not template_name or not frappe.db.exists("AT Notification Template", template_name):
        frappe.throw(_("Notification template is required."))

    recipient_value = str(recipient or "").strip()
    if not recipient_value:
        frappe.throw(_("Recipient is required."))

    customer_name = str(customer or "").strip() or None
    if customer_name and not frappe.db.exists("AT Customer", customer_name):
        frappe.throw(_("Customer not found."))
    if customer_name:
        assert_doc_permission("AT Customer", customer_name, "read")

    reference_doctype_value = str(reference_doctype or "").strip() or None
    reference_name_value = str(reference_name or "").strip() or None
    if reference_doctype_value and reference_name_value and not frappe.db.exists(reference_doctype_value, reference_name_value):
        frappe.throw(_("Reference record not found."))
    if reference_doctype_value and reference_name_value:
        assert_doc_permission(reference_doctype_value, reference_name_value, "read")

    template_doc = frappe.get_doc("AT Notification Template", template_name)
    resolved_channel = str(channel or template_doc.channel or "").strip() or "SMS"
    if resolved_channel == "Both":
        frappe.throw(_("Quick communication requires a single delivery channel."))
    if resolved_channel not in {"SMS", "Email", "WHATSAPP"}:
        frappe.throw(_("Unsupported notification channel."))

    resolved_office_branch = _resolve_notification_office_branch(
        office_branch=office_branch,
        customer=customer_name,
        reference_doctype=reference_doctype_value,
        reference_name=reference_name_value,
    )

    draft = frappe.get_doc(
        {
            "doctype": "AT Notification Draft",
            "template": template_name,
            "event_key": template_doc.event_key,
            "channel": resolved_channel,
            "language": str(language or template_doc.language or "tr").strip() or "tr",
            "provider_template_name": getattr(template_doc, "provider_template_name", None),
            "customer": customer_name,
            "office_branch": resolved_office_branch,
            "recipient": recipient_value,
            "reference_doctype": reference_doctype_value,
            "reference_name": reference_name_value,
            "subject": str(subject or "").strip() or None,
            "body": str(body or "").strip() or template_doc.get("body_template") or " ",
            "status": ATNotificationDraftStatus.DRAFT,
        }
    ).insert()

    if cint(send_now):
        communication_logic.enqueue_notification_draft(draft.name)
        communication_logic.send_notification_draft_now(draft.name)
    else:
        communication_logic.enqueue_notification_draft(draft.name)

    return {"draft": draft.name}

@frappe.whitelist()
def run_dispatch_cycle(limit: int = 50, **kwargs) -> dict:
    # Accept kwargs to be resilient to frontend sending extra params like include_failed
    safe_limit = max(cint(limit), 1)
    _assert_dispatch_mutation_access(
        "api.communication.run_dispatch_cycle",
        details={"limit": safe_limit},
        permission_targets=COMMUNICATION_MUTATION_DOCTYPES["run_dispatch_cycle"],
    )
    return communication_logic.process_notification_queue(limit=safe_limit)

@frappe.whitelist()
def send_draft_now(draft_name: str) -> dict:
    draft_name = str(draft_name or "").strip()
    _assert_dispatch_mutation_access(
        "api.communication.send_draft_now",
        details={"draft": draft_name},
        permission_targets=COMMUNICATION_MUTATION_DOCTYPES["send_draft_now"],
    )
    assert_doc_permission("AT Notification Draft", draft_name, "write")
    return communication_logic.send_notification_draft_now(draft_name)

@frappe.whitelist()
def retry_outbox_item(outbox_name: str) -> dict:
    outbox_name = str(outbox_name or "").strip()
    _assert_dispatch_mutation_access(
        "api.communication.retry_outbox_item",
        details={"outbox": outbox_name},
        permission_targets=COMMUNICATION_MUTATION_DOCTYPES["retry_outbox_item"],
    )
    assert_doc_permission("AT Notification Outbox", outbox_name, "write")
    return communication_logic.retry_notification_outbox(outbox_name)


@frappe.whitelist()
def requeue_outbox_item(outbox_name: str) -> dict:
    outbox_name = str(outbox_name or "").strip()
    _assert_dispatch_mutation_access(
        "api.communication.requeue_outbox_item",
        details={"outbox": outbox_name},
        permission_targets=COMMUNICATION_MUTATION_DOCTYPES["requeue_outbox_item"],
    )
    assert_doc_permission("AT Notification Outbox", outbox_name, "write")
    return communication_logic.requeue_notification_outbox(outbox_name)


@frappe.whitelist()
def preview_segment_members(segment_name: str, limit: int = 50) -> dict[str, object]:
    segment_name = str(segment_name or "").strip()
    assert_authenticated()
    assert_doctype_permission(
        "AT Segment",
        "read",
        "You do not have permission to view segments.",
    )
    assert_doctype_permission(
        "AT Customer",
        "read",
        "You do not have permission to view customers.",
    )
    assert_doc_permission("AT Segment", segment_name, "read")
    return build_segment_membership_preview(segment_name, limit=max(cint(limit), 1))


@frappe.whitelist()
def execute_campaign(campaign_name: str, limit: int = 200) -> dict[str, object]:
    campaign_name = str(campaign_name or "").strip()
    _assert_dispatch_mutation_access(
        "api.communication.execute_campaign",
        details={"campaign": campaign_name, "limit": max(cint(limit), 1)},
        permission_targets=COMMUNICATION_MUTATION_DOCTYPES["execute_campaign"],
    )
    assert_doc_permission("AT Campaign", campaign_name, "write")
    return execute_campaign_service(campaign_name, limit=max(cint(limit), 1))


def _resolve_notification_office_branch(
    *,
    office_branch: str | None = None,
    customer: str | None = None,
    reference_doctype: str | None = None,
    reference_name: str | None = None,
) -> str | None:
    explicit_branch = str(office_branch or "").strip() or None
    if explicit_branch:
        return assert_office_branch_access(explicit_branch)

    if customer:
        customer_branch = frappe.db.get_value("AT Customer", customer, "office_branch")
        if customer_branch:
            return assert_office_branch_access(str(customer_branch).strip() or None)

    if reference_doctype and reference_name and frappe.db.exists(reference_doctype, reference_name):
        reference_branch = frappe.db.get_value(reference_doctype, reference_name, "office_branch")
        if reference_branch:
            return assert_office_branch_access(str(reference_branch).strip() or None)

    return get_default_office_branch()
