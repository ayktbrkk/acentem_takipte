from __future__ import annotations

from frappe.utils import cstr


def normalize_note_text(value, *, max_length: int | None = None) -> str | None:
    text = cstr(value or "").strip()
    if not text:
        return None
    if max_length and max_length > 0:
        return text[:max_length]
    return text
