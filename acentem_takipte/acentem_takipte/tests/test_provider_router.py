from __future__ import annotations

from unittest.mock import patch

import frappe

from acentem_takipte.acentem_takipte.providers.base import ProviderMessage
from acentem_takipte.acentem_takipte.providers.router import get_provider_adapter, resolve_provider_name
from acentem_takipte.acentem_takipte.providers.whatsapp_meta import MetaWhatsAppAdapter


def test_resolve_provider_name_uses_default_channel_mapping():
    with patch.object(frappe.local, "conf", {}, create=True):
        assert resolve_provider_name("whatsapp") == "meta_whatsapp"


def test_resolve_provider_name_prefers_site_override():
    with patch.object(frappe.local, "conf", {"at_channel_providers": {"WHATSAPP": "custom_provider"}}, create=True):
        assert resolve_provider_name("WHATSAPP") == "custom_provider"


def test_get_provider_adapter_returns_meta_adapter_for_whatsapp():
    with patch.object(frappe.local, "conf", {}, create=True):
        adapter = get_provider_adapter("WHATSAPP")
    assert isinstance(adapter, MetaWhatsAppAdapter)


def test_meta_adapter_builds_template_payload():
    adapter = MetaWhatsAppAdapter()
    message = ProviderMessage(
        recipient="905551112233",
        subject=None,
        body="ignored",
        template_name="renewal_reminder_30",
        template_language="tr",
        components=[{"type": "body", "parameters": [{"type": "text", "text": "Aykut"}]}],
        metadata={"doctype": "AT Renewal Task"},
    )

    payload = adapter.build_payload(message)

    assert payload["type"] == "template"
    assert payload["template"]["name"] == "renewal_reminder_30"
    assert payload["template"]["language"]["code"] == "tr"


def test_meta_adapter_send_returns_provider_message_id():
    adapter = MetaWhatsAppAdapter()
    message = ProviderMessage(
        recipient="905551112233",
        subject=None,
        body="Merhaba",
        template_name=None,
        template_language=None,
        components=[],
        metadata={},
    )

    with patch.object(frappe.local, "conf", {
        "at_whatsapp_api_token": "token",
        "at_whatsapp_api_url": "https://graph.facebook.com/v20.0",
        "at_whatsapp_phone_number_id": "123456",
        "at_whatsapp_timeout_seconds": 9,
    }, create=True):
        with patch("frappe.integrations.utils.make_post_request", return_value={"messages": [{"id": "wamid.123"}]}) as post_request:
            result = adapter.send(message)

    assert result.ok is True
    assert result.provider == "meta_whatsapp"
    assert result.provider_message_id == "wamid.123"
    post_request.assert_called_once()

