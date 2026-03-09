from __future__ import annotations

import json
from collections.abc import Mapping, Sequence

SENSITIVE_KEYS = {
    "tax_id",
    "taxid",
    "tc_kimlik_no",
    "tckn",
    "kimlik_no",
    "identity_no",
    "policy_no",
    "policy_number",
    "iban",
    "account_iban",
    "phone",
    "phone_number",
    "gsm",
    "telefon",
    "email",
    "recipient",
    "recipients",
    "recipient_email",
    "recipient_phone",
    "to",
    "reference_no",
}


def redact_value(key: str, value):
    normalized_key = str(key or "").strip().lower()
    if value in {None, ""}:
        return value
    if normalized_key not in SENSITIVE_KEYS:
        return value

    raw = str(value).strip()
    if not raw:
        return raw
    if len(raw) <= 4:
        return "*" * len(raw)
    return f"{raw[:2]}{'*' * (len(raw) - 4)}{raw[-2:]}"


def redact_payload(payload):
    if isinstance(payload, Mapping):
        return {key: redact_value(str(key), redact_payload(value)) for key, value in payload.items()}
    if isinstance(payload, Sequence) and not isinstance(payload, (str, bytes, bytearray)):
        return [redact_payload(item) for item in payload]
    return payload


def build_redacted_log_message(message: str, details=None) -> str:
    base_message = str(message or "").strip() or "Application error"
    if details in (None, "", {}, []):
        return base_message
    serialized = json.dumps(redact_payload(details), ensure_ascii=False, default=str, sort_keys=True)
    return f"{base_message} | {serialized}"


def log_redacted_error(message: str, details=None, traceback_text: str | None = None) -> None:
    import frappe

    frappe.log_error(traceback_text or frappe.get_traceback(), build_redacted_log_message(message, details))
