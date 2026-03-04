from __future__ import annotations

from typing import Any

import frappe


def create_notification_drafts(
    *,
    event_key: str,
    reference_doctype: str,
    reference_name: str,
    customer: str | None = None,
    context: dict[str, Any] | None = None,
    enqueue: bool = True,
) -> list[str]:
    templates = frappe.get_all(
        "AT Notification Template",
        filters={
            "event_key": event_key,
            "is_active": 1,
        },
        fields=["name", "channel", "language", "subject", "body_template"],
        limit_page_length=50,
        order_by="modified asc",
    )
    if not templates:
        return []

    customer_payload = _get_customer_payload(customer)
    render_context = {
        "customer": customer_payload,
        "reference_doctype": reference_doctype,
        "reference_name": reference_name,
    }
    render_context.update(context or {})

    created: list[str] = []
    for template in templates:
        subject = frappe.render_template(template.subject or "", render_context)
        body = frappe.render_template(template.body_template or "", render_context)

        for channel in _resolve_channels(template.channel):
            recipient = _resolve_recipient(
                channel=channel,
                customer_payload=customer_payload,
                context_payload=render_context,
            )
            draft = frappe.get_doc(
                {
                    "doctype": "AT Notification Draft",
                    "template": template.name,
                    "event_key": event_key,
                    "channel": channel,
                    "language": template.language or "tr",
                    "customer": customer,
                    "recipient": recipient,
                    "reference_doctype": reference_doctype,
                    "reference_name": reference_name,
                    "subject": subject,
                    "body": body,
                    "status": "Draft",
                }
            ).insert(ignore_permissions=True)
            created.append(draft.name)
            if enqueue:
                _enqueue_draft_safe(draft.name)

    return created


def _resolve_channels(channel: str) -> list[str]:
    if channel == "Both":
        return ["SMS", "Email"]
    if channel in {"SMS", "Email"}:
        return [channel]
    return ["SMS"]


def _resolve_recipient(channel: str, customer_payload: dict[str, Any], context_payload: dict[str, Any]) -> str | None:
    if channel == "SMS":
        return customer_payload.get("phone") or context_payload.get("phone")

    if channel == "Email":
        return customer_payload.get("email") or context_payload.get("email")

    return None


def _get_customer_payload(customer: str | None) -> dict[str, Any]:
    if not customer or not frappe.db.exists("AT Customer", customer):
        return {}

    customer_doc = frappe.get_doc("AT Customer", customer)
    return {
        "name": customer_doc.name,
        "full_name": customer_doc.full_name,
        "tax_id": customer_doc.tax_id,
        "phone": customer_doc.phone,
        "email": customer_doc.get("email"),
    }


def _enqueue_draft_safe(draft_name: str) -> None:
    try:
        from acentem_takipte.acentem_takipte.communication import enqueue_notification_draft

        enqueue_notification_draft(draft_name)
    except Exception:
        frappe.log_error(frappe.get_traceback(), f"AT Notification Draft Queue Error: {draft_name}")
