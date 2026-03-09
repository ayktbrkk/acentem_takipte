from __future__ import annotations

import json
from typing import Any, Dict, List


CHANNEL_BODY_FIELDS = {
    "SMS": "sms_body_template",
    "EMAIL": "email_body_template",
    "WHATSAPP": "whatsapp_body_template",
}


def resolve_body_template(template_doc: Any, channel: str) -> str:
    normalized_channel = (channel or "").strip().upper()
    preferred_field = CHANNEL_BODY_FIELDS.get(normalized_channel)
    if preferred_field:
        preferred_value = getattr(template_doc, preferred_field, None)
        if preferred_value:
            return preferred_value
    return getattr(template_doc, "body_template", "") or ""


def resolve_subject_template(template_doc: Any, channel: str) -> str | None:
    normalized_channel = (channel or "").strip().upper()
    if normalized_channel == "EMAIL":
        return getattr(template_doc, "subject", None)
    return None


def parse_template_components(raw_value: str | None) -> List[Dict[str, Any]]:
    if not raw_value:
        return []
    parsed = json.loads(raw_value)
    if isinstance(parsed, list):
        return parsed
    raise ValueError("Template components JSON must decode to a list")
