from __future__ import annotations

import types
from unittest.mock import patch

from acentem_takipte.acentem_takipte.communication import _default_provider_for_channel, _send_outbox_notification
from acentem_takipte.acentem_takipte.providers.base import ProviderResult


def test_default_provider_for_channel_returns_meta_for_whatsapp():
    assert _default_provider_for_channel("WHATSAPP") == "meta_whatsapp"
    assert _default_provider_for_channel("Email") == "Email(Frappe)"


def test_send_outbox_notification_uses_email_path_for_email_channel():
    template_doc = types.SimpleNamespace(name="TPL-1")
    draft = types.SimpleNamespace(name="DRF-1")
    outbox = types.SimpleNamespace(channel="Email", provider=None)

    with patch("acentem_takipte.communication.build_provider_message_from_records") as build_message:
        build_message.return_value = types.SimpleNamespace(
            recipient="aykut@example.com",
            subject="Konu",
            body="Govde",
            template_name=None,
            template_language="tr",
            components=[],
            metadata={"event_key": "policy_delivery"},
        )
        with patch("acentem_takipte.communication._send_email") as send_email:
            send_email.return_value = types.SimpleNamespace(
                ok=True,
                provider="Email(Frappe)",
                message_id="mail-1",
                response_log="sent",
                error=None,
                provider_payload=None,
            )
            with patch("acentem_takipte.communication._get_outbox_attachments") as get_attachments:
                get_attachments.return_value = [{"fname": "rapor.xlsx", "fcontent": b"xlsx"}]
                result = _send_outbox_notification(outbox=outbox, draft=draft, template_doc=template_doc)

    assert result.ok is True
    assert result.provider == "Email(Frappe)"
    assert result.provider_payload is not None
    assert send_email.call_args.kwargs["attachments"] == [{"fname": "rapor.xlsx", "fcontent": b"xlsx"}]


def test_send_outbox_notification_uses_provider_adapter_for_whatsapp():
    template_doc = types.SimpleNamespace(name="TPL-2")
    draft = types.SimpleNamespace(name="DRF-2")
    outbox = types.SimpleNamespace(channel="WHATSAPP", provider="meta_whatsapp")

    with patch("acentem_takipte.communication.build_provider_message_from_records") as build_message:
        build_message.return_value = types.SimpleNamespace(
            recipient="905551112233",
            subject=None,
            body="Merhaba",
            template_name="renewal_reminder_30",
            template_language="tr",
            components=[{"type": "body", "parameters": []}],
            metadata={"event_key": "renewal_reminder"},
        )
        with patch("acentem_takipte.communication.get_provider_adapter") as get_adapter:
            adapter = types.SimpleNamespace()
            adapter.send.return_value = ProviderResult(
                ok=True,
                provider="meta_whatsapp",
                provider_message_id="wamid.123",
                status_code=200,
                error_code=None,
                error_message=None,
                response_payload={"messages": [{"id": "wamid.123"}]},
            )
            get_adapter.return_value = adapter

            result = _send_outbox_notification(outbox=outbox, draft=draft, template_doc=template_doc)

    assert result.ok is True
    assert result.provider == "meta_whatsapp"
    assert result.message_id == "wamid.123"
    assert result.provider_payload is not None

