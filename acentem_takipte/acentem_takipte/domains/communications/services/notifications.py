from __future__ import annotations

from typing import Any

import frappe


def build_notification_draft_payloads(
    *,
    templates: list[Any],
    event_key: str,
    reference_doctype: str,
    reference_name: str,
    customer: str | None,
    customer_payload: dict[str, Any],
    context: dict[str, Any],
    resolve_channels,
    resolve_recipient,
    resolve_body_template_for_channel,
) -> list[dict[str, Any]]:
    render_context = {
        "customer": customer_payload,
        "reference_doctype": reference_doctype,
        "reference_name": reference_name,
    }
    render_context.update(context or {})

    payloads: list[dict[str, Any]] = []
    for template in templates:
        subject = frappe.render_template(template.subject or "", render_context)

        for channel in resolve_channels(template.channel):
            body_template = resolve_body_template_for_channel(template, channel)
            body = frappe.render_template(body_template or "", render_context)
            recipient = resolve_recipient(
                channel=channel,
                customer_payload=customer_payload,
                context_payload=render_context,
            )
            payloads.append(
                {
                    "doctype": "AT Notification Draft",
                    "template": template.name,
                    "event_key": event_key,
                    "channel": channel,
                    "language": template.language or "en",
                    "customer": customer,
                    "office_branch": customer_payload.get("office_branch") or render_context.get("office_branch"),
                    "recipient": recipient,
                    "reference_doctype": reference_doctype,
                    "reference_name": reference_name,
                    "provider_template_name": getattr(template, "provider_template_name", None),
                    "subject": subject,
                    "body": body,
                    "status": "Draft",
                }
            )
    return payloads
