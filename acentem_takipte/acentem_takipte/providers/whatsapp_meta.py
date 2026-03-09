from __future__ import annotations

from typing import Dict

import frappe

from acentem_takipte.acentem_takipte.providers.base import ProviderAdapter, ProviderMessage, ProviderResult
from acentem_takipte.acentem_takipte.utils.logging import log_redacted_error, redact_payload


class MetaWhatsAppAdapter(ProviderAdapter):
    provider_name = "meta_whatsapp"
    channel = "WHATSAPP"

    def get_timeout_seconds(self) -> int:
        return int(frappe.conf.get("at_whatsapp_timeout_seconds") or 8)

    def build_headers(self) -> Dict[str, str]:
        api_token = frappe.conf.get("at_whatsapp_api_token")
        if not api_token:
            raise frappe.ValidationError("Missing WhatsApp API token in site config")
        return {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
        }

    def build_endpoint(self) -> str:
        api_url = (frappe.conf.get("at_whatsapp_api_url") or "").strip()
        phone_number_id = (frappe.conf.get("at_whatsapp_phone_number_id") or "").strip()
        if not api_url or not phone_number_id:
            raise frappe.ValidationError("Missing WhatsApp API url or phone number id in site config")
        return f"{api_url.rstrip('/')}/{phone_number_id}/messages"

    def build_payload(self, message: ProviderMessage) -> Dict[str, object]:
        template_name = (message.template_name or "").strip()
        language = (message.template_language or "tr").strip()
        components = message.components or []

        if template_name:
            return {
                "messaging_product": "whatsapp",
                "to": message.recipient,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {"code": language},
                    "components": components,
                },
            }

        return {
            "messaging_product": "whatsapp",
            "to": message.recipient,
            "type": "text",
            "text": {
                "preview_url": False,
                "body": message.body or "",
            },
        }

    def send(self, message: ProviderMessage) -> ProviderResult:
        endpoint = self.build_endpoint()
        payload = self.build_payload(message)
        headers = self.build_headers()

        try:
            response = frappe.integrations.utils.make_post_request(
                endpoint,
                headers=headers,
                data=payload,
                timeout=self.get_timeout_seconds(),
            )
        except Exception as exc:
            log_redacted_error(
                "WhatsApp Meta dispatch failed",
                details={
                    "provider": self.provider_name,
                    "channel": self.channel,
                    "endpoint": endpoint,
                    "payload": redact_payload(payload),
                    "error": str(exc),
                },
            )
            return ProviderResult(
                ok=False,
                provider=self.provider_name,
                provider_message_id=None,
                status_code=None,
                error_code="dispatch_failed",
                error_message=str(exc),
                response_payload=None,
            )

        provider_message_id = None
        if isinstance(response, dict):
            messages = response.get("messages") or []
            if messages and isinstance(messages[0], dict):
                provider_message_id = messages[0].get("id")

        return ProviderResult(
            ok=True,
            provider=self.provider_name,
            provider_message_id=provider_message_id,
            status_code=200,
            error_code=None,
            error_message=None,
            response_payload=response,
        )
