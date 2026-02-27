from __future__ import annotations

import frappe
from frappe.utils import cint
from frappe.query_builder import Query
from frappe.query_builder.functions import Count

from acentem_takipte.api.security import (
    assert_authenticated,
    assert_doc_permission,
    assert_doctype_permission,
    assert_post_request,
    audit_admin_action,
)
from acentem_takipte.communication import (
    process_notification_queue,
    queue_notification_drafts,
    retry_notification_outbox,
    send_notification_draft_now,
)


def _assert_customer_scope(customer_name: str | None) -> str | None:
    value = str(customer_name or "").strip() or None
    if not value:
        return None
    assert_doc_permission("AT Customer", value, "read")
    return value


def _status_breakdown_rows(
    *,
    status=None,
    channel=None,
    customer=None,
    reference_doctype=None,
    reference_name=None,
) -> list[dict]:
    # Build filters for status breakdown aggregation
    outbox_filters = {}
    if status:
        outbox_filters["status"] = status
    if channel:
        outbox_filters["channel"] = channel
    if reference_doctype:
        outbox_filters["reference_doctype"] = reference_doctype
    if reference_name:
        outbox_filters["reference_name"] = reference_name

    # If customer filter is provided, get draft names first and filter outbox by them
    if customer:
        draft_filters = {"customer": customer}
        if channel:
            draft_filters["channel"] = channel
        if reference_doctype:
            draft_filters["reference_doctype"] = reference_doctype
        if reference_name:
            draft_filters["reference_name"] = reference_name
        
        draft_names = frappe.get_list(
            "AT Notification Draft",
            filters=draft_filters,
            fields=["name"],
            limit_page_length=None,
        )
        draft_name_list = [d.name for d in draft_names if d.name]
        
        if not draft_name_list:
            return []
        
        outbox_filters["draft"] = ["in", draft_name_list]

    # Get outbox records and aggregate by status
    outbox_items = frappe.get_list(
        "AT Notification Outbox",
        filters=outbox_filters,
        fields=["status"],
        limit_page_length=None,
    )

    # Group by status and count
    status_count = {}
    for item in outbox_items:
        s = item.get("status", "Unknown")
        status_count[s] = status_count.get(s, 0) + 1

    # Return as list of dicts with status and total
    result = [{"status": k, "total": v} for k, v in sorted(status_count.items())]
    return result


@frappe.whitelist()
def get_queue_snapshot(
    status=None,
    channel=None,
    limit=60,
    customer=None,
    reference_doctype=None,
    reference_name=None,
) -> dict:
    assert_authenticated()
    assert_doctype_permission(
        "AT Notification Draft",
        "read",
        "You do not have permission to view notification drafts.",
    )
    assert_doctype_permission(
        "AT Notification Outbox",
        "read",
        "You do not have permission to view notification outbox records.",
    )

    customer = _assert_customer_scope(customer)
    limit = max(cint(limit), 1)

    outbox_filters = {}
    if status:
        outbox_filters["status"] = status
    if channel:
        outbox_filters["channel"] = channel
    if reference_doctype:
        outbox_filters["reference_doctype"] = reference_doctype
    if reference_name:
        outbox_filters["reference_name"] = reference_name

    draft_filters = {}
    if customer:
        draft_filters["customer"] = customer
    if channel:
        draft_filters["channel"] = channel
    if reference_doctype:
        draft_filters["reference_doctype"] = reference_doctype
    if reference_name:
        draft_filters["reference_name"] = reference_name

    draft_items = frappe.get_list(
        "AT Notification Draft",
        filters=draft_filters,
        fields=[
            "name",
            "event_key",
            "channel",
            "recipient",
            "status",
            "customer",
            "reference_doctype",
            "reference_name",
            "outbox_record",
            "error_message",
            "modified",
        ],
        order_by="modified desc",
        limit_page_length=limit,
    )

    if customer:
        draft_names = [d.name for d in draft_items if d.name]
        if not draft_names:
            outbox_items = []
        else:
            outbox_items = frappe.get_list(
                "AT Notification Outbox",
                filters={**outbox_filters, "draft": ["in", draft_names]},
                fields=[
                    "name",
                    "draft",
                    "channel",
                    "recipient",
                    "status",
                    "provider",
                    "reference_doctype",
                    "reference_name",
                    "attempt_count",
                    "max_attempts",
                    "next_retry_on",
                    "last_attempt_on",
                    "error_message",
                    "modified",
                ],
                order_by="modified desc",
                limit_page_length=limit,
            )
    else:
        outbox_items = frappe.get_list(
            "AT Notification Outbox",
            filters=outbox_filters,
            fields=[
                "name",
                "draft",
                "channel",
                "recipient",
                "status",
                "provider",
                "reference_doctype",
                "reference_name",
                "attempt_count",
                "max_attempts",
                "next_retry_on",
                "last_attempt_on",
                "error_message",
                "modified",
            ],
            order_by="modified desc",
            limit_page_length=limit,
        )

    status_breakdown = _status_breakdown_rows(
        status=status,
        channel=channel,
        customer=customer,
        reference_doctype=reference_doctype,
        reference_name=reference_name,
    )

    return {
        "outbox": outbox_items,
        "drafts": draft_items,
        "status_breakdown": status_breakdown,
        "customer": customer or None,
        "reference_doctype": reference_doctype or None,
        "reference_name": reference_name or None,
    }


@frappe.whitelist()
def run_dispatch_cycle(limit=60, include_failed=1) -> dict:
    assert_authenticated()
    assert_post_request()
    assert_doctype_permission(
        "AT Notification Outbox",
        "write",
        "You do not have permission to run notification dispatch operations.",
    )
    audit_admin_action(
        "api.communication.run_dispatch_cycle",
        {
            "limit": max(cint(limit), 1),
            "include_failed": bool(cint(include_failed)),
        },
    )

    queued = queue_notification_drafts(limit=max(cint(limit), 1), include_failed=bool(cint(include_failed)))
    dispatched = process_notification_queue(limit=max(cint(limit), 1))
    return {
        "queued": queued,
        "dispatched": dispatched,
    }


@frappe.whitelist()
def create_quick_notification_draft(
    template=None,
    channel=None,
    language=None,
    customer=None,
    recipient=None,
    reference_doctype=None,
    reference_name=None,
    subject=None,
    body=None,
    status=None,
    send_now=0,
) -> dict[str, str]:
    assert_authenticated()
    assert_post_request()
    assert_doctype_permission(
        "AT Notification Draft",
        "create",
        "You do not have permission to create notification drafts.",
    )

    template_name = (template or "").strip()
    if not template_name or not frappe.db.exists("AT Notification Template", template_name):
        frappe.throw(frappe._("AT Notification Template is required."))

    tmpl = frappe.get_doc("AT Notification Template", template_name)
    if cint(getattr(tmpl, "is_active", 0)) != 1:
        frappe.throw(frappe._("Selected notification template is inactive."))

    selected_channel = (channel or "").strip()
    template_channel = (getattr(tmpl, "channel", "") or "").strip() or "SMS"
    if template_channel == "Both":
        draft_channel = selected_channel or "SMS"
        if draft_channel not in {"SMS", "Email"}:
            frappe.throw(frappe._("Channel is required for templates supporting both channels."))
    else:
        if selected_channel and selected_channel != template_channel:
            frappe.throw(frappe._("Selected channel does not match template channel."))
        draft_channel = template_channel

    draft_language = (language or "").strip() or (getattr(tmpl, "language", "") or "").strip() or "tr"
    if draft_language not in {"tr", "en"}:
        frappe.throw(frappe._("Unsupported language: {0}").format(draft_language))

    customer_name = (customer or "").strip() or None
    if customer_name and not frappe.db.exists("AT Customer", customer_name):
        frappe.throw(frappe._("AT Customer not found: {0}").format(customer_name))
    customer_name = _assert_customer_scope(customer_name)

    reference_dt = (reference_doctype or "").strip() or None
    reference_nm = (reference_name or "").strip() or None
    if reference_dt and not frappe.db.exists("DocType", reference_dt):
        frappe.throw(frappe._("Reference DocType not found: {0}").format(reference_dt))
    if reference_nm and not reference_dt:
        frappe.throw(frappe._("Reference DocType is required when Reference Name is provided."))
    if reference_dt and reference_nm and not frappe.db.exists(reference_dt, reference_nm):
        frappe.throw(frappe._("Reference record not found: {0} {1}").format(reference_dt, reference_nm))

    recipient_value = (recipient or "").strip()
    if not recipient_value and customer_name:
        recipient_field = "email" if draft_channel == "Email" else "phone"
        recipient_value = (frappe.db.get_value("AT Customer", customer_name, recipient_field) or "").strip()
    if not recipient_value:
        frappe.throw(frappe._("Recipient is required."))

    body_value = (body or "").strip() or (getattr(tmpl, "body_template", "") or "").strip()
    if not body_value:
        frappe.throw(frappe._("Body is required."))

    subject_value = (subject or "").strip() or (getattr(tmpl, "subject", "") or "").strip() or None
    status_value = (status or "").strip() or "Draft"
    if status_value not in {"Draft", "Queued", "Failed"}:
        frappe.throw(frappe._("Unsupported draft status: {0}").format(status_value))

    draft = frappe.get_doc(
        {
            "doctype": "AT Notification Draft",
            "template": tmpl.name,
            "event_key": (getattr(tmpl, "event_key", "") or "").strip() or "manual_message",
            "channel": draft_channel,
            "language": draft_language,
            "customer": customer_name,
            "recipient": recipient_value,
            "reference_doctype": reference_dt,
            "reference_name": reference_nm,
            "subject": subject_value,
            "body": body_value,
            "status": status_value,
        }
    )
    draft.insert(ignore_permissions=True)
    frappe.db.commit()

    result: dict[str, str] = {"draft": draft.name}
    if str(send_now or 0) in {"1", "true", "True"}:
        assert_doctype_permission(
            "AT Notification Draft",
            "write",
            "You do not have permission to send notification drafts.",
        )
        assert_doctype_permission(
            "AT Notification Outbox",
            "write",
            "You do not have permission to queue notification deliveries.",
        )
        send_result = send_notification_draft_now(draft.name)
        if isinstance(send_result, dict):
            result.update({k: v for k, v in send_result.items() if isinstance(k, str)})
    return result


@frappe.whitelist()
def send_draft_now(draft_name: str) -> dict[str, str]:
    assert_authenticated()
    assert_post_request()
    assert_doctype_permission(
        "AT Notification Draft",
        "write",
        "You do not have permission to send notification drafts.",
    )
    assert_doctype_permission(
        "AT Notification Outbox",
        "write",
        "You do not have permission to queue notification deliveries.",
    )
    assert_doc_permission("AT Notification Draft", str(draft_name or "").strip(), "write")
    audit_admin_action("api.communication.send_draft_now", {"draft_name": draft_name})
    return send_notification_draft_now(draft_name)


@frappe.whitelist()
def retry_outbox_item(outbox_name: str) -> dict[str, str]:
    assert_authenticated()
    assert_post_request()
    assert_doctype_permission(
        "AT Notification Outbox",
        "write",
        "You do not have permission to retry notification outbox items.",
    )
    assert_doc_permission("AT Notification Outbox", str(outbox_name or "").strip(), "write")
    audit_admin_action("api.communication.retry_outbox_item", {"outbox_name": outbox_name})
    return retry_notification_outbox(outbox_name)


@frappe.whitelist()
def requeue_outbox_item(outbox_name: str) -> dict[str, str]:
    assert_authenticated()
    assert_post_request()
    assert_doctype_permission(
        "AT Notification Outbox",
        "write",
        "You do not have permission to requeue notification outbox items.",
    )
    assert_doc_permission("AT Notification Outbox", str(outbox_name or "").strip(), "write")
    audit_admin_action("api.communication.requeue_outbox_item", {"outbox_name": outbox_name})
    # Requeue is an alias of retry for a queue-first user mental model.
    return retry_notification_outbox(outbox_name)
