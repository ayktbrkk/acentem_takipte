from __future__ import annotations

import types

from acentem_takipte.notification_dispatch import build_provider_message_from_records


def test_build_provider_message_prefers_draft_values():
    template_doc = types.SimpleNamespace(
        name="TPL-0001",
        channel="WHATSAPP",
        language="tr",
        provider_template_name="renewal_reminder_30",
        body_template="Genel",
        whatsapp_body_template="WhatsApp Genel",
    )
    draft_doc = types.SimpleNamespace(
        name="DRF-0001",
        channel="WHATSAPP",
        language="tr",
        recipient="905551112233",
        subject=None,
        body="Taslak Govde",
        provider_template_name="renewal_reminder_custom",
        template_components_json='[{"type":"body","parameters":[{"type":"text","text":"Aykut"}]}]',
        event_key="renewal_reminder",
        customer="CUS-0001",
        reference_doctype="AT Renewal Task",
        reference_name="REN-0001",
    )
    outbox_doc = types.SimpleNamespace(
        name="OUT-0001",
        channel="WHATSAPP",
        recipient="905551112233",
        event_key="renewal_reminder",
        customer="CUS-0001",
        reference_doctype="AT Renewal Task",
        reference_name="REN-0001",
    )

    message = build_provider_message_from_records(template_doc, draft_doc, outbox_doc)

    assert message.template_name == "renewal_reminder_custom"
    assert message.body == "Taslak Govde"
    assert message.components[0]["type"] == "body"
    assert message.metadata["outbox"] == "OUT-0001"


def test_build_provider_message_falls_back_to_template_values():
    template_doc = types.SimpleNamespace(
        name="TPL-0002",
        channel="EMAIL",
        language="tr",
        provider_template_name=None,
        subject="Email Başlık",
        body_template="Genel",
        email_body_template="Email Govde",
    )
    draft_doc = types.SimpleNamespace(
        name="DRF-0002",
        channel="EMAIL",
        language="tr",
        recipient=None,
        subject=None,
        body=None,
        provider_template_name=None,
        template_components_json=None,
        event_key="claim_update",
        customer=None,
        reference_doctype=None,
        reference_name=None,
    )
    outbox_doc = types.SimpleNamespace(
        name="OUT-0002",
        channel="EMAIL",
        recipient="aykut@example.com",
        event_key="claim_update",
        customer=None,
        reference_doctype=None,
        reference_name=None,
    )

    message = build_provider_message_from_records(template_doc, draft_doc, outbox_doc)

    assert message.subject == "Email Başlık"
    assert message.body == "Email Govde"
    assert message.recipient == "aykut@example.com"
    assert message.template_name is None
