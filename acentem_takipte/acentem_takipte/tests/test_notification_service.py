from __future__ import annotations

import frappe

from acentem_takipte.acentem_takipte.services.notifications import build_notification_draft_payloads


def test_build_notification_draft_payloads_renders_channel_specific_payload():
    templates = [
        frappe._dict(
            name="TPL-0001",
            channel="WHATSAPP",
            language="tr",
            subject="",
            body_template="Genel {{ policy }}",
            whatsapp_body_template="WhatsApp {{ policy }}",
            provider_template_name="renewal_reminder_30",
        )
    ]

    payloads = build_notification_draft_payloads(
        templates=templates,
        event_key="renewal_due",
        reference_doctype="AT Renewal Task",
        reference_name="REN-0001",
        customer="CUS-0001",
        customer_payload={"phone": "905551112233"},
        context={"policy": "POL-0001"},
        resolve_channels=lambda channel: [channel],
        resolve_recipient=lambda channel, customer_payload, context_payload: customer_payload.get("phone"),
        resolve_body_template_for_channel=lambda template, channel: template.whatsapp_body_template,
    )

    assert payloads[0]["channel"] == "WHATSAPP"
    assert payloads[0]["recipient"] == "905551112233"
    assert payloads[0]["body"] == "WhatsApp POL-0001"
    assert payloads[0]["provider_template_name"] == "renewal_reminder_30"


def test_build_notification_draft_payloads_expands_both_channel_template():
    templates = [
        frappe._dict(
            name="TPL-0002",
            channel="Both",
            language="tr",
            subject="Konu",
            body_template="Govde",
            provider_template_name=None,
        )
    ]

    payloads = build_notification_draft_payloads(
        templates=templates,
        event_key="policy_created",
        reference_doctype="AT Policy",
        reference_name="POL-0002",
        customer="CUS-0002",
        customer_payload={"phone": "905551112233", "email": "aykut@example.com"},
        context={},
        resolve_channels=lambda channel: ["SMS", "Email"],
        resolve_recipient=lambda channel, customer_payload, context_payload: customer_payload.get("email") if channel == "Email" else customer_payload.get("phone"),
        resolve_body_template_for_channel=lambda template, channel: template.body_template,
    )

    assert len(payloads) == 2
    assert payloads[0]["channel"] == "SMS"
    assert payloads[1]["channel"] == "Email"

