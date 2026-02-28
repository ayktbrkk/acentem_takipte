from __future__ import annotations

import frappe
from frappe.utils import cint

from acentem_takipte.api.security import (
    assert_authenticated,
    assert_roles,
)
from acentem_takipte import communication as communication_logic

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
    draft_filters = {"status": ["in", ["Draft", "Queued", "Failed"]]}
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
    assert_roles("System Manager", "Manager")
    return communication_logic.process_notification_queue(limit=cint(limit))

@frappe.whitelist()
def send_draft_now(draft_name: str) -> dict:
    assert_authenticated()
    return communication_logic.send_notification_draft_now(draft_name)

@frappe.whitelist()
def retry_outbox_item(outbox_name: str) -> dict:
    assert_authenticated()
    return communication_logic.retry_notification_outbox(outbox_name)
