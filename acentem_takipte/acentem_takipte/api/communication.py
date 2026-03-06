from __future__ import annotations

import frappe
from frappe.utils import cint

from acentem_takipte.acentem_takipte.api.security import (
    assert_authenticated,
    assert_doc_permission,
    assert_doctype_permission,
    assert_post_request,
    assert_roles,
    audit_admin_action,
)
from acentem_takipte.acentem_takipte.utils.statuses import ATNotificationDraftStatus
from acentem_takipte.acentem_takipte import communication as communication_logic


COMMUNICATION_ADMIN_ROLES = ("System Manager", "Manager", "Accountant")


def _assert_dispatch_mutation_access(action: str, *, details: dict | None = None) -> None:
    user = assert_authenticated()
    assert_post_request("Only POST requests are allowed for communication mutations.")
    assert_roles(
        *COMMUNICATION_ADMIN_ROLES,
        user=user,
        message="You do not have permission to run communication actions.",
    )
    assert_doctype_permission(
        "AT Notification Outbox",
        "write",
        "You do not have permission to modify notification outbox records.",
    )
    assert_doctype_permission(
        "AT Notification Draft",
        "write",
        "You do not have permission to modify notification drafts.",
    )
    audit_admin_action(action, details or {})


@frappe.whitelist()
def get_queue_snapshot(
    customer: str | None = None,
    status: str | None = None,
    channel: str | None = None,
    reference_doctype: str | None = None,
    reference_name: str | None = None,
    limit: int = 50,
) -> dict:
    assert_authenticated()
    
    # Filter for Outbox
    outbox_filters = {}
    if customer: outbox_filters["customer"] = customer
    if status: outbox_filters["status"] = status
    if channel: outbox_filters["channel"] = channel
    if reference_doctype: outbox_filters["reference_doctype"] = reference_doctype
    if reference_name: outbox_filters["reference_name"] = reference_name

    outbox = frappe.get_list(
        "AT Notification Outbox",
        fields=["name", "draft", "channel", "recipient", "status", "attempt_count", "max_attempts", "next_retry_on", "error_message", "reference_doctype", "reference_name"],
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
    
    drafts = frappe.get_list(
        "AT Notification Draft",
        fields=["name", "event_key", "channel", "recipient", "status", "error_message", "reference_doctype", "reference_name"],
        filters=draft_filters,
        order_by="modified desc",
        limit_page_length=max(cint(limit), 1)
    )

    # Status Breakdown
    breakdown = frappe.db.sql("""
        select status, count(*) as total
        from `tabAT Notification Outbox`
        group by status
    """, as_dict=True)

    return {
        "outbox": outbox,
        "drafts": drafts,
        "status_breakdown": breakdown
    }

@frappe.whitelist()
def run_dispatch_cycle(limit: int = 50, **kwargs) -> dict:
    # Accept kwargs to be resilient to frontend sending extra params like include_failed
    safe_limit = max(cint(limit), 1)
    _assert_dispatch_mutation_access("api.communication.run_dispatch_cycle", details={"limit": safe_limit})
    return communication_logic.process_notification_queue(limit=safe_limit)

@frappe.whitelist()
def send_draft_now(draft_name: str) -> dict:
    draft_name = str(draft_name or "").strip()
    _assert_dispatch_mutation_access("api.communication.send_draft_now", details={"draft": draft_name})
    assert_doc_permission("AT Notification Draft", draft_name, "write")
    return communication_logic.send_notification_draft_now(draft_name)

@frappe.whitelist()
def retry_outbox_item(outbox_name: str) -> dict:
    outbox_name = str(outbox_name or "").strip()
    _assert_dispatch_mutation_access("api.communication.retry_outbox_item", details={"outbox": outbox_name})
    assert_doc_permission("AT Notification Outbox", outbox_name, "write")
    return communication_logic.retry_notification_outbox(outbox_name)


@frappe.whitelist()
def requeue_outbox_item(outbox_name: str) -> dict:
    outbox_name = str(outbox_name or "").strip()
    _assert_dispatch_mutation_access("api.communication.requeue_outbox_item", details={"outbox": outbox_name})
    assert_doc_permission("AT Notification Outbox", outbox_name, "write")
    return communication_logic.requeue_notification_outbox(outbox_name)
