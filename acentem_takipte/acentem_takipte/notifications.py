from __future__ import annotations

from typing import Any

import frappe

from acentem_takipte.notifications_catalog import is_valid_template_key
from acentem_takipte.services.notifications import build_notification_draft_payloads
from acentem_takipte.utils.logging import log_redacted_error

def create_notification_drafts(
    *,
    event_key: str,
    template_key: str | None = None,
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
        fields=[
            "name",
            "template_key",
            "channel",
            "language",
            "subject",
            "body_template",
            "sms_body_template",
            "email_body_template",
            "whatsapp_body_template",
            "provider_template_name",
        ],
        limit_page_length=50,
        order_by="modified asc",
    )
    if not templates:
        return []

    if template_key:
        if not is_valid_template_key(event_key, template_key):
            frappe.throw(f"Unsupported template key '{template_key}' for event '{event_key}'")
        templates = [template for template in templates if template.template_key == template_key]
        if not templates:
            return []

    customer_payload = _get_customer_payload(customer)
    created: list[str] = []
    payloads = build_notification_draft_payloads(
        templates=templates,
        event_key=event_key,
        reference_doctype=reference_doctype,
        reference_name=reference_name,
        customer=customer,
        customer_payload=customer_payload,
        context=context or {},
        resolve_channels=_resolve_channels,
        resolve_recipient=_resolve_recipient,
        resolve_body_template_for_channel=_resolve_body_template_for_channel,
    )
    for payload in payloads:
        draft = frappe.get_doc(payload).insert(ignore_permissions=True)
        created.append(draft.name)
        if enqueue:
            _enqueue_draft_safe(draft.name)

    return created


def _resolve_channels(channel: str) -> list[str]:
    if channel == "Both":
        return ["SMS", "Email"]
    if channel in {"SMS", "Email", "WHATSAPP"}:
        return [channel]
    return ["SMS"]


def _resolve_body_template_for_channel(template: Any, channel: str) -> str:
    if channel == "SMS" and getattr(template, "sms_body_template", None):
        return template.sms_body_template
    if channel == "Email" and getattr(template, "email_body_template", None):
        return template.email_body_template
    if channel == "WHATSAPP" and getattr(template, "whatsapp_body_template", None):
        return template.whatsapp_body_template
    return template.body_template or ""


def _resolve_recipient(channel: str, customer_payload: dict[str, Any], context_payload: dict[str, Any]) -> str | None:
    if channel == "SMS":
        return customer_payload.get("phone") or context_payload.get("phone")

    if channel == "Email":
        return customer_payload.get("email") or context_payload.get("email")

    if channel == "WHATSAPP":
        return customer_payload.get("phone") or context_payload.get("phone")

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
        "office_branch": customer_doc.get("office_branch"),
    }


def _enqueue_draft_safe(draft_name: str) -> None:
    try:
        from acentem_takipte.communication import enqueue_notification_draft

        enqueue_notification_draft(draft_name)
    except Exception:
        log_redacted_error("AT Notification Draft Queue Error", details={"draft": draft_name})
