from __future__ import annotations

from typing import Any

from acentem_takipte.acentem_takipte.notifications_templateing import (
    parse_template_components,
    resolve_body_template,
    resolve_subject_template,
)
from acentem_takipte.acentem_takipte.providers.base import ProviderMessage


def build_provider_message_from_records(template_doc: Any, draft_doc: Any, outbox_doc: Any) -> ProviderMessage:
    channel = getattr(outbox_doc, "channel", None) or getattr(draft_doc, "channel", None) or getattr(template_doc, "channel", None)
    provider_template_name = (
        getattr(draft_doc, "provider_template_name", None)
        or getattr(template_doc, "provider_template_name", None)
        or None
    )
    raw_components = getattr(draft_doc, "template_components_json", None)

    return ProviderMessage(
        recipient=getattr(outbox_doc, "recipient", None) or getattr(draft_doc, "recipient", None) or "",
        subject=getattr(draft_doc, "subject", None) or resolve_subject_template(template_doc, channel),
        body=getattr(draft_doc, "body", None) or resolve_body_template(template_doc, channel),
        template_name=provider_template_name,
        template_language=getattr(draft_doc, "language", None) or getattr(template_doc, "language", None) or "en",
        components=parse_template_components(raw_components),
        metadata={
            "channel": channel,
            "event_key": getattr(outbox_doc, "event_key", None) or getattr(draft_doc, "event_key", None),
            "customer": getattr(outbox_doc, "customer", None) or getattr(draft_doc, "customer", None),
            "reference_doctype": getattr(outbox_doc, "reference_doctype", None) or getattr(draft_doc, "reference_doctype", None),
            "reference_name": getattr(outbox_doc, "reference_name", None) or getattr(draft_doc, "reference_name", None),
            "outbox": getattr(outbox_doc, "name", None),
            "draft": getattr(draft_doc, "name", None),
            "template": getattr(template_doc, "name", None),
        },
    )

