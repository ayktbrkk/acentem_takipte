from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _

from .session import resolve_current_user

ALLOWED_SCREENS = {
    "policy_list",
    "offer_list",
    "customer_list",
    "lead_list",
    "claims_board",
    "payments_board",
    "renewals_board",
    "reconciliation_workbench",
    "communication_center",
    "tasks",
    "notification_drafts",
    "notification_outbox",
    "companies",
    "branches",
    "sales_entities",
    "templates",
    "accounting_entries",
    "reconciliation_items",
}
DEFAULT_STATE = {"selected_key": "default", "custom_presets": []}


def _storage_key(screen: str) -> str:
    return f"AT Filter Presets::{screen}"


def _normalize_screen(screen: str | None) -> str:
    value = str(screen or "").strip().lower().replace("-", "_")
    if value not in ALLOWED_SCREENS:
        frappe.throw(_("Invalid preset screen"))
    return value


def _sanitize_scalar(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        return value[:240]
    return str(value)[:240]


def _sanitize_json_value(value: Any, depth: int = 0) -> Any:
    if depth > 4:
        return None
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for idx, (key, item) in enumerate(value.items()):
            if idx >= 40:
                break
            normalized_key = str(key or "").strip()[:64]
            if not normalized_key:
                continue
            out[normalized_key] = _sanitize_json_value(item, depth + 1)
        return out
    if isinstance(value, (list, tuple)):
        return [_sanitize_json_value(item, depth + 1) for item in list(value)[:20]]
    return _sanitize_scalar(value)


def _sanitize_custom_presets(raw_presets: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_presets, list):
        return []

    sanitized: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for item in raw_presets[:30]:
        if not isinstance(item, dict):
            continue
        preset_id = str(item.get("id") or "").strip()[:64]
        label = str(item.get("label") or "").strip()[:80]
        if not preset_id or not label or preset_id in seen_ids:
            continue
        payload = item.get("payload")
        if not isinstance(payload, dict):
            payload = {}
        sanitized.append(
            {
                "id": preset_id,
                "label": label,
                "payload": _sanitize_json_value(payload, depth=0),
            }
        )
        seen_ids.add(preset_id)
    return sanitized


def _parse_json_payload(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except Exception:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _normalize_state(payload: Any) -> dict[str, Any]:
    data = _parse_json_payload(payload)
    selected_key = str(data.get("selected_key") or "default").strip()[:128] or "default"
    custom_presets = _sanitize_custom_presets(data.get("custom_presets"))
    return {"selected_key": selected_key, "custom_presets": custom_presets}


def _read_state(user: str, screen: str) -> dict[str, Any]:
    raw = frappe.defaults.get_user_default(_storage_key(screen), user=user)
    if not raw:
        return DEFAULT_STATE.copy()
    return _normalize_state(raw)


def _write_state(user: str, screen: str, state: dict[str, Any]) -> dict[str, Any]:
    normalized = _normalize_state(state)
    frappe.defaults.set_user_default(_storage_key(screen), json.dumps(normalized, separators=(",", ":")), user=user)
    return normalized


@frappe.whitelist()
def get_filter_preset_state(screen: str) -> dict[str, Any]:
    user = resolve_current_user()
    if user == "Guest":
        frappe.throw(_("Authentication required"))
    normalized_screen = _normalize_screen(screen)
    return _read_state(user, normalized_screen)


@frappe.whitelist()
def set_filter_preset_state(
    screen: str,
    selected_key: str | None = None,
    custom_presets: Any = None,
) -> dict[str, Any]:
    user = resolve_current_user()
    if user == "Guest":
        frappe.throw(_("Authentication required"))

    normalized_screen = _normalize_screen(screen)
    current = _read_state(user, normalized_screen)

    if selected_key is not None:
        current["selected_key"] = str(selected_key or "default").strip()[:128] or "default"
    if custom_presets is not None:
        parsed = custom_presets
        if isinstance(custom_presets, str):
            try:
                parsed = json.loads(custom_presets)
            except Exception:
                parsed = []
        current["custom_presets"] = _sanitize_custom_presets(parsed)

    return _write_state(user, normalized_screen, current)
