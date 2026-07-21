from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _

from acentem_takipte.acentem_takipte.domains.admin.services.alert_settings import _read_site_config, _write_json_atomically
from acentem_takipte.acentem_takipte.domains.admin.services.alerts import _resolve_environment, _resolve_site_name


def _log_settings_changed(user: str, changed_keys: list[str]) -> None:
    try:
        from acentem_takipte.acentem_takipte.doctype.at_access_log.at_access_log import log_decision_event
        log_decision_event(
            "General Settings",
            "site_config",
            action="Save",
            action_summary=f"Settings updated by {user}: {', '.join(changed_keys)}",
        )
    except Exception:
        pass


GENERAL_SETTINGS_KEYS = (
    "at_default_locale",
    "at_default_date_format",
    "at_follow_up_due_soon_days",
    "at_follow_up_preview_limit",
    "at_default_policy_term_days",
    "at_default_commission_rate",
    "at_default_currency",
    "at_renewal_reminder_lead_days",
    "at_kvkk_consent_default",
    "at_dashboard_refresh_seconds",
    "at_default_page_size",
)

SUPPORTED_LOCALES = {"tr", "en"}
SUPPORTED_DATE_FORMATS = {"DD.MM.YYYY", "MM/DD/YYYY", "YYYY-MM-DD"}
SUPPORTED_FOLLOW_UP_DUE_SOON_DAYS = {3, 5, 7, 10, 14}
SUPPORTED_FOLLOW_UP_PREVIEW_LIMITS = {5, 8, 12, 20}
SUPPORTED_POLICY_TERMS = {180, 365}
SUPPORTED_CURRENCIES = {"TRY", "EUR", "USD"}
SUPPORTED_RENEWAL_REMINDER_LEAD_DAYS = {0, 15, 30, 45, 60}
SUPPORTED_KVKK_CONSENT_DEFAULTS = {"Granted", "Unknown"}
SUPPORTED_DASHBOARD_REFRESH_SECONDS = {0, 60, 300, 600}
SUPPORTED_PAGE_SIZES = {10, 20, 50}

DEFAULT_FOLLOW_UP_DUE_SOON_DAYS = 7
DEFAULT_FOLLOW_UP_PREVIEW_LIMIT = 8
DEFAULT_POLICY_TERM_DAYS = 365
DEFAULT_COMMISSION_RATE = 10.0
DEFAULT_CURRENCY = "TRY"
DEFAULT_RENEWAL_REMINDER_LEAD_DAYS = 30
DEFAULT_KVKK_CONSENT = "Unknown"
DEFAULT_DASHBOARD_REFRESH_SECONDS = 0
DEFAULT_PAGE_SIZE = 20


def load_admin_general_settings() -> dict[str, Any]:
    site_config = frappe.get_site_config() or {}
    return _build_settings_payload(site_config)


def save_admin_general_settings(config: dict[str, Any] | str | None = None) -> dict[str, Any]:
    sanitized = _sanitize_settings_payload(config)
    site_config = _read_site_config()

    changed_keys = []
    for config_key in GENERAL_SETTINGS_KEYS:
        old_value = str(site_config.get(config_key, ""))
        new_value = str(sanitized[config_key])
        if old_value != new_value:
            changed_keys.append(config_key)
        site_config[config_key] = sanitized[config_key]
        setattr(frappe.conf, config_key, sanitized[config_key])

    _write_json_atomically(site_config)

    if changed_keys:
        _log_settings_changed(frappe.session.user, changed_keys)

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

    policy_term_days = _coerce_int_setting(
        config.get("default_policy_term_days") or config.get("at_default_policy_term_days"),
        default=DEFAULT_POLICY_TERM_DAYS,
    )
    if policy_term_days not in SUPPORTED_POLICY_TERMS:
        frappe.throw(_("Default policy term is not supported."))

    commission_rate_str = str(config.get("default_commission_rate") or config.get("at_default_commission_rate") or "15.0").strip()
    try:
        commission_rate = float(commission_rate_str)
    except (TypeError, ValueError):
        commission_rate = DEFAULT_COMMISSION_RATE
    if commission_rate < 0 or commission_rate > 100:
        frappe.throw(_("Commission rate must be between 0 and 100."))

    default_currency = str(config.get("default_currency") or config.get("at_default_currency") or DEFAULT_CURRENCY).strip().upper()
    if default_currency not in SUPPORTED_CURRENCIES:
        frappe.throw(_("Default currency is not supported."))

    renewal_reminder_lead_days = _coerce_int_setting(
        config.get("renewal_reminder_lead_days") or config.get("at_renewal_reminder_lead_days"),
        default=DEFAULT_RENEWAL_REMINDER_LEAD_DAYS,
    )
    if renewal_reminder_lead_days not in SUPPORTED_RENEWAL_REMINDER_LEAD_DAYS:
        frappe.throw(_("Renewal reminder lead days is not supported."))

    kvkk_consent_default = str(config.get("kvkk_consent_default") or config.get("at_kvkk_consent_default") or DEFAULT_KVKK_CONSENT).strip()
    if kvkk_consent_default not in SUPPORTED_KVKK_CONSENT_DEFAULTS:
        frappe.throw(_("KVKK consent default is not supported."))

    dashboard_refresh_seconds = _coerce_int_setting(
        config.get("dashboard_refresh_seconds") or config.get("at_dashboard_refresh_seconds"),
        default=DEFAULT_DASHBOARD_REFRESH_SECONDS,
    )
    if dashboard_refresh_seconds not in SUPPORTED_DASHBOARD_REFRESH_SECONDS:
        frappe.throw(_("Dashboard refresh interval is not supported."))

    default_page_size = _coerce_int_setting(
        config.get("default_page_size") or config.get("at_default_page_size"),
        default=DEFAULT_PAGE_SIZE,
    )
    if default_page_size not in SUPPORTED_PAGE_SIZES:
        frappe.throw(_("Default page size is not supported."))

    return {
        "at_default_locale": default_locale,
        "at_default_date_format": default_date_format,
        "at_follow_up_due_soon_days": follow_up_due_soon_days,
        "at_follow_up_preview_limit": follow_up_preview_limit,
        "at_default_policy_term_days": policy_term_days,
        "at_default_commission_rate": commission_rate,
        "at_default_currency": default_currency,
        "at_renewal_reminder_lead_days": renewal_reminder_lead_days,
        "at_kvkk_consent_default": kvkk_consent_default,
        "at_dashboard_refresh_seconds": dashboard_refresh_seconds,
        "at_default_page_size": default_page_size,
    }


def _build_settings_payload(site_config: dict[str, Any]) -> dict[str, Any]:
    default_locale = str(site_config.get("at_default_locale") or "tr").strip().lower()
    if default_locale not in SUPPORTED_LOCALES:
        default_locale = "tr"

    default_date_format = str(site_config.get("at_default_date_format") or "DD.MM.YYYY").strip()
    if default_date_format not in SUPPORTED_DATE_FORMATS:
        default_date_format = "DD.MM.YYYY"

    operational_defaults = get_follow_up_defaults(site_config)
    insurance_defaults = get_insurance_defaults(site_config)

    return {
        "default_locale": default_locale,
        "default_date_format": default_date_format,
        "follow_up_due_soon_days": operational_defaults["follow_up_due_soon_days"],
        "follow_up_preview_limit": operational_defaults["follow_up_preview_limit"],
        "default_policy_term_days": insurance_defaults["default_policy_term_days"],
        "default_commission_rate": insurance_defaults["default_commission_rate"],
        "default_currency": insurance_defaults["default_currency"],
        "renewal_reminder_lead_days": insurance_defaults["renewal_reminder_lead_days"],
        "kvkk_consent_default": insurance_defaults["kvkk_consent_default"],
        "dashboard_refresh_seconds": insurance_defaults["dashboard_refresh_seconds"],
        "default_page_size": insurance_defaults["default_page_size"],
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


def get_insurance_defaults(site_config: dict[str, Any] | None = None) -> dict[str, Any]:
    source = site_config if site_config is not None else (frappe.get_site_config() or {})

    policy_term_days = _coerce_int_setting(
        source.get("at_default_policy_term_days"),
        default=DEFAULT_POLICY_TERM_DAYS,
    )
    if policy_term_days not in SUPPORTED_POLICY_TERMS:
        policy_term_days = DEFAULT_POLICY_TERM_DAYS

    commission_rate_str = str(source.get("at_default_commission_rate") or DEFAULT_COMMISSION_RATE).strip()
    try:
        commission_rate = float(commission_rate_str)
    except (TypeError, ValueError):
        commission_rate = DEFAULT_COMMISSION_RATE

    default_currency = str(source.get("at_default_currency") or DEFAULT_CURRENCY).strip().upper()
    if default_currency not in SUPPORTED_CURRENCIES:
        default_currency = DEFAULT_CURRENCY

    renewal_reminder_lead_days = _coerce_int_setting(
        source.get("at_renewal_reminder_lead_days"),
        default=DEFAULT_RENEWAL_REMINDER_LEAD_DAYS,
    )
    if renewal_reminder_lead_days not in SUPPORTED_RENEWAL_REMINDER_LEAD_DAYS:
        renewal_reminder_lead_days = DEFAULT_RENEWAL_REMINDER_LEAD_DAYS

    kvkk_consent_default = str(source.get("at_kvkk_consent_default") or DEFAULT_KVKK_CONSENT).strip()
    if kvkk_consent_default not in SUPPORTED_KVKK_CONSENT_DEFAULTS:
        kvkk_consent_default = DEFAULT_KVKK_CONSENT

    dashboard_refresh_seconds = _coerce_int_setting(
        source.get("at_dashboard_refresh_seconds"),
        default=DEFAULT_DASHBOARD_REFRESH_SECONDS,
    )
    if dashboard_refresh_seconds not in SUPPORTED_DASHBOARD_REFRESH_SECONDS:
        dashboard_refresh_seconds = DEFAULT_DASHBOARD_REFRESH_SECONDS

    default_page_size = _coerce_int_setting(
        source.get("at_default_page_size"),
        default=DEFAULT_PAGE_SIZE,
    )
    if default_page_size not in SUPPORTED_PAGE_SIZES:
        default_page_size = DEFAULT_PAGE_SIZE

    return {
        "default_policy_term_days": policy_term_days,
        "default_commission_rate": commission_rate,
        "default_currency": default_currency,
        "renewal_reminder_lead_days": renewal_reminder_lead_days,
        "kvkk_consent_default": kvkk_consent_default,
        "dashboard_refresh_seconds": dashboard_refresh_seconds,
        "default_page_size": default_page_size,
    }


def _coerce_int_setting(value: Any, *, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default
