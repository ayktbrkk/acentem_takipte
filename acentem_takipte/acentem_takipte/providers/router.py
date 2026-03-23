from __future__ import annotations

from typing import Optional

import frappe

from acentem_takipte.providers.base import ProviderAdapter
from acentem_takipte.providers.whatsapp_meta import MetaWhatsAppAdapter


DEFAULT_CHANNEL_PROVIDERS = {
    "WHATSAPP": "meta_whatsapp",
}


def resolve_provider_name(channel: str, explicit_provider: Optional[str] = None) -> Optional[str]:
    if explicit_provider:
        return explicit_provider

    normalized_channel = (channel or "").strip().upper()
    if not normalized_channel:
        return None

    site_override = frappe.conf.get("at_channel_providers") or {}
    if isinstance(site_override, dict) and site_override.get(normalized_channel):
        return site_override[normalized_channel]

    return DEFAULT_CHANNEL_PROVIDERS.get(normalized_channel)


def get_provider_adapter(channel: str, explicit_provider: Optional[str] = None) -> Optional[ProviderAdapter]:
    provider_name = resolve_provider_name(channel, explicit_provider=explicit_provider)
    if not provider_name:
        return None

    if provider_name == "meta_whatsapp":
        return MetaWhatsAppAdapter()

    raise frappe.ValidationError(f"Unsupported provider '{provider_name}' for channel '{channel}'")
