from __future__ import annotations

from typing import Any

import frappe

from acentem_takipte.acentem_takipte.api.security import assert_authenticated, assert_post_request, assert_roles
from acentem_takipte.acentem_takipte.services.admin_general_settings import load_admin_general_settings, save_admin_general_settings


@frappe.whitelist()
def get_admin_general_settings() -> dict[str, Any]:
    assert_authenticated()
    assert_roles("System Manager", "Administrator", message="You do not have permission to view general settings.")
    return _coerce_general_settings_payload(load_admin_general_settings())


@frappe.whitelist()
def save_admin_general_settings_api(config: dict | str | None = None) -> dict[str, Any]:
    assert_authenticated()
    assert_post_request("Only POST requests are allowed for general settings changes.")
    assert_roles("System Manager", "Administrator", message="You do not have permission to manage general settings.")
    return _coerce_general_settings_payload(save_admin_general_settings(config=config))


def _coerce_general_settings_payload(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {
            "default_locale": "tr",
            "default_date_format": "DD.MM.YYYY",
            "follow_up_due_soon_days": 7,
            "follow_up_preview_limit": 8,
            "default_policy_term_days": 365,
            "default_commission_rate": 15.0,
            "default_currency": "TRY",
            "renewal_reminder_lead_days": 30,
            "kvkk_consent_default": "Unknown",
            "site_name": "",
            "environment": "production",
            "active_locale": "tr",
        }

    payload = dict(value)
    default_locale = str(payload.get("default_locale") or "tr").strip().lower()
    if default_locale not in {"tr", "en"}:
        default_locale = "tr"

    default_date_format = str(payload.get("default_date_format") or "DD.MM.YYYY").strip() or "DD.MM.YYYY"
    try:
        follow_up_due_soon_days = int(payload.get("follow_up_due_soon_days") or 7)
    except (TypeError, ValueError):
        follow_up_due_soon_days = 7
    if follow_up_due_soon_days not in {3, 5, 7, 10, 14}:
        follow_up_due_soon_days = 7

    try:
        follow_up_preview_limit = int(payload.get("follow_up_preview_limit") or 8)
    except (TypeError, ValueError):
        follow_up_preview_limit = 8
    if follow_up_preview_limit not in {5, 8, 12, 20}:
        follow_up_preview_limit = 8

    try:
        default_policy_term_days = int(payload.get("default_policy_term_days") or 365)
    except (TypeError, ValueError):
        default_policy_term_days = 365
    if default_policy_term_days not in {180, 365}:
        default_policy_term_days = 365

    commission_rate_str = str(payload.get("default_commission_rate") or "15.0").strip()
    try:
        default_commission_rate = float(commission_rate_str)
    except (TypeError, ValueError):
        default_commission_rate = 15.0

    default_currency = str(payload.get("default_currency") or "TRY").strip().upper()
    if default_currency not in {"TRY", "EUR", "USD"}:
        default_currency = "TRY"

    try:
        renewal_reminder_lead_days = int(payload.get("renewal_reminder_lead_days") or 30)
    except (TypeError, ValueError):
        renewal_reminder_lead_days = 30
    if renewal_reminder_lead_days not in {15, 30, 45, 60}:
        renewal_reminder_lead_days = 30

    kvkk_consent_default = str(payload.get("kvkk_consent_default") or "Unknown").strip()
    if kvkk_consent_default not in {"Granted", "Unknown"}:
        kvkk_consent_default = "Unknown"

    active_locale = str(payload.get("active_locale") or default_locale).strip().lower()
    if active_locale not in {"tr", "en"}:
        active_locale = default_locale

    return {
        "default_locale": default_locale,
        "default_date_format": default_date_format,
        "follow_up_due_soon_days": follow_up_due_soon_days,
        "follow_up_preview_limit": follow_up_preview_limit,
        "default_policy_term_days": default_policy_term_days,
        "default_commission_rate": default_commission_rate,
        "default_currency": default_currency,
        "renewal_reminder_lead_days": renewal_reminder_lead_days,
        "kvkk_consent_default": kvkk_consent_default,
        "site_name": str(payload.get("site_name") or "").strip(),
        "environment": str(payload.get("environment") or "production").strip(),
        "active_locale": active_locale,
    }
