from __future__ import annotations

try:
    from frappe.tests import IntegrationTestCase
except ImportError:  # pragma: no cover - bench environments may not expose this helper
    from unittest import TestCase as IntegrationTestCase

from acentem_takipte.acentem_takipte.providers.base import ProviderAdapter, ProviderMessage, ProviderResult


class FakeWhatsAppProvider(ProviderAdapter):
    provider_name = "fake_whatsapp"
    supported_channels = ("WHATSAPP",)

    def send(self, message: ProviderMessage) -> ProviderResult:
        return ProviderResult(
            ok=True,
            provider=self.provider_name,
            message_id=f"msg:{message.recipient}",
            response_log="queued",
        )


class TestProviderContracts(IntegrationTestCase):
    def test_provider_message_shape(self):
        message = ProviderMessage(
            channel="WHATSAPP",
            recipient="905321234567",
            body="Test message",
            metadata={"template": "renewal_due"},
        )
        self.assertEqual(message.channel, "WHATSAPP")
        self.assertEqual(message.metadata["template"], "renewal_due")

    def test_provider_adapter_supports_known_channel(self):
        adapter = FakeWhatsAppProvider()
        self.assertTrue(adapter.supports("WHATSAPP"))
        self.assertFalse(adapter.supports("EMAIL"))

    def test_provider_adapter_send_returns_contract_result(self):
        adapter = FakeWhatsAppProvider()
        result = adapter.send(
            ProviderMessage(
                channel="WHATSAPP",
                recipient="905321234567",
                body="Renewal reminder",
            )
        )
        self.assertTrue(result.ok)
        self.assertEqual(result.provider, "fake_whatsapp")
        self.assertEqual(result.message_id, "msg:905321234567")

