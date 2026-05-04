from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _

from acentem_takipte.acentem_takipte.services.ops_alert_settings import _read_site_config, _write_json_atomically
from acentem_takipte.acentem_takipte.services.ops_alerts import _resolve_environment, _resolve_site_name


GENERAL_SETTINGS_KEYS = (
    "at_default_locale",
    "at_default_date_format",
    "at_follow_up_due_soon_days",
    "at_follow_up_preview_limit",
)

SUPPORTED_LOCALES = {"tr", "en"}
SUPPORTED_DATE_FORMATS = {"DD.MM.YYYY", "MM/DD/YYYY", "YYYY-MM-DD"}
SUPPORTED_FOLLOW_UP_DUE_SOON_DAYS = {3, 5, 7, 10, 14}
SUPPORTED_FOLLOW_UP_PREVIEW_LIMITS = {5, 8, 12, 20}
DEFAULT_FOLLOW_UP_DUE_SOON_DAYS = 7
DEFAULT_FOLLOW_UP_PREVIEW_LIMIT = 8


def load_admin_general_settings() -> dict[str, Any]:
    site_config = frappe.get_site_config() or {}
    return _build_settings_payload(site_config)


def save_admin_general_settings(config: dict[str, Any] | str | None = None) -> dict[str, Any]:
    sanitized = _sanitize_settings_payload(config)
    site_config = _read_site_config()

    for config_key in GENERAL_SETTINGS_KEYS:
        site_config[config_key] = sanitized[config_key]
        setattr(frappe.conf, config_key, sanitized[config_key])

    _write_json_atomically(site_config)
    return _build_settings_payload(site_config)


def _sanitize_settings_payload(config: dict[str, Any] | str | None) -> dict[str, str]:
    if isinstance(config, str):
        try:
            config = json.loads(config)
        except json.JSONDecodeError as exc:
            frappe.throw(_("General settings payload must be a JSON object."), exc=exc)
    if config is None:
        config = {}
    if not isinstance(config, dict):
        frappe.throw(_("General settings payload must be a JSON object."))

    default_locale = str(config.get("default_locale") or config.get("at_default_locale") or "tr").strip().lower()
    if default_locale not in SUPPORTED_LOCALES:
        frappe.throw(_("Default locale must be either 'tr' or 'en'."))

    default_date_format = str(config.get("default_date_format") or config.get("at_default_date_format") or "DD.MM.YYYY").strip()
    if default_date_format not in SUPPORTED_DATE_FORMATS:
        frappe.throw(_("Default date format is not supported."))

    follow_up_due_soon_days = _coerce_int_setting(
        config.get("follow_up_due_soon_days") or config.get("at_follow_up_due_soon_days"),
        default=DEFAULT_FOLLOW_UP_DUE_SOON_DAYS,
    )
    if follow_up_due_soon_days not in SUPPORTED_FOLLOW_UP_DUE_SOON_DAYS:
        frappe.throw(_("Follow-up due soon window is not supported."))

    follow_up_preview_limit = _coerce_int_setting(
        config.get("follow_up_preview_limit") or config.get("at_follow_up_preview_limit"),
        default=DEFAULT_FOLLOW_UP_PREVIEW_LIMIT,
    )
    if follow_up_preview_limit not in SUPPORTED_FOLLOW_UP_PREVIEW_LIMITS:
        frappe.throw(_("Follow-up preview limit is not supported."))

    return {
        "at_default_locale": default_locale,
        "at_default_date_format": default_date_format,
        "at_follow_up_due_soon_days": follow_up_due_soon_days,
        "at_follow_up_preview_limit": follow_up_preview_limit,
    }


def _build_settings_payload(site_config: dict[str, Any]) -> dict[str, Any]:
    default_locale = str(site_config.get("at_default_locale") or "tr").strip().lower()
    if default_locale not in SUPPORTED_LOCALES:
        default_locale = "tr"

    default_date_format = str(site_config.get("at_default_date_format") or "DD.MM.YYYY").strip()
    if default_date_format not in SUPPORTED_DATE_FORMATS:
        default_date_format = "DD.MM.YYYY"

    operational_defaults = get_follow_up_defaults(site_config)

    return {
        "default_locale": default_locale,
        "default_date_format": default_date_format,
        "follow_up_due_soon_days": operational_defaults["follow_up_due_soon_days"],
        "follow_up_preview_limit": operational_defaults["follow_up_preview_limit"],
        "site_name": _resolve_site_name(site_config),
        "environment": _resolve_environment(site_config),
        "active_locale": str(getattr(frappe.local, "lang", default_locale) or default_locale).split("-", 1)[0].lower(),
    }


def get_follow_up_defaults(site_config: dict[str, Any] | None = None) -> dict[str, int]:
    source = site_config if site_config is not None else (frappe.get_site_config() or {})
    follow_up_due_soon_days = _coerce_int_setting(
        source.get("at_follow_up_due_soon_days"),
        default=DEFAULT_FOLLOW_UP_DUE_SOON_DAYS,
    )
    if follow_up_due_soon_days not in SUPPORTED_FOLLOW_UP_DUE_SOON_DAYS:
        follow_up_due_soon_days = DEFAULT_FOLLOW_UP_DUE_SOON_DAYS

    follow_up_preview_limit = _coerce_int_setting(
        source.get("at_follow_up_preview_limit"),
        default=DEFAULT_FOLLOW_UP_PREVIEW_LIMIT,
    )
    if follow_up_preview_limit not in SUPPORTED_FOLLOW_UP_PREVIEW_LIMITS:
        follow_up_preview_limit = DEFAULT_FOLLOW_UP_PREVIEW_LIMIT

    return {
        "follow_up_due_soon_days": follow_up_due_soon_days,
        "follow_up_preview_limit": follow_up_preview_limit,
    }


def _coerce_int_setting(value: Any, *, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default