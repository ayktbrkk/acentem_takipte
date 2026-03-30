from __future__ import annotations

import hashlib
import json
from typing import Any

import frappe
from frappe import _
from frappe.utils import cint

from acentem_takipte.acentem_takipte.services.export_payload_utils import (
    coerce_columns,
    coerce_export_format,
    coerce_filters,
    coerce_locale,
    coerce_rows,
    coerce_string_list,
    normalize_export_key,
    normalize_title,
)
from acentem_takipte.acentem_takipte.services.report_exports import (
    build_export_filename,
    build_report_title,
    render_tabular_pdf,
    render_tabular_xlsx,
)
from acentem_takipte.acentem_takipte.services.report_registry import build_report_payload
from acentem_takipte.acentem_takipte.services.scheduled_reports import (
    delete_scheduled_report_config,
    summarize_scheduled_report_configs,
    upsert_scheduled_report_config,
)
from acentem_takipte.acentem_takipte.utils.logging import log_redacted_error
from acentem_takipte.acentem_takipte.utils.i18n import translate_text


def build_safe_report_payload(report_key: str, filters: dict | None, limit: int) -> dict[str, Any]:
    from acentem_takipte.acentem_takipte.services.branches import get_scope_hash

    safe_key = normalize_export_key(report_key)
    coerced_filters = _coerce_filters(filters)
    normalized_limit = max(cint(limit), 1)

    user = _safe_session_user()
    cache_key: str | None = None
    if user and user != "Guest":
        scope_hash = get_scope_hash(user)
        filters_digest = hashlib.sha256(
            json.dumps(coerced_filters, sort_keys=True, default=str).encode()
        ).hexdigest()[:12]
        cache_key = f"at_report::{safe_key}::{user}::{scope_hash}::{filters_digest}::{normalized_limit}"
        cached = frappe.cache().get_value(cache_key)
        if cached is not None:
            return cached

    try:
        result = build_report_payload(safe_key, filters=coerced_filters, limit=normalized_limit)
    except Exception:
        log_redacted_error(
            "Report payload build failed",
            details={"report_key": str(report_key or "").strip(), "filters": coerced_filters, "limit": normalized_limit},
        )
        frappe.throw(_("Report cannot be loaded. Please try again later."))
        return {}

    if cache_key:
        ttl = int((frappe.get_site_config() or {}).get("at_report_cache_ttl", 600))
        frappe.cache().set_value(cache_key, result, expires_in_sec=ttl)

    return result


def _safe_session_user() -> str:
    """Return session user safely when frappe local proxies are unbound in tests."""
    try:
        return str(getattr(frappe.session, "user", "") or "").strip()
    except RuntimeError:
        return ""


def build_report_download_response(
    *,
    report_key: str,
    columns: list[str],
    rows: list[dict],
    filters: dict,
    export_format: str,
) -> dict[str, Any]:
    locale = coerce_locale(getattr(frappe.local, "lang", "en"), "en")
    return _build_download_response(
        export_key=report_key,
        title=build_report_title(report_key, locale),
        columns=columns,
        rows=rows,
        filters=filters,
        export_format=export_format,
        locale=locale,
    )


def build_tabular_download_response(
    *,
    export_key: str,
    title: str | dict[str, str],
    columns: list[str],
    rows: list[dict],
    filters: dict,
    export_format: str,
) -> dict[str, Any]:
    locale = coerce_locale(getattr(frappe.local, "lang", "en"), "en")
    resolved_title = _resolve_tabular_title(title, locale, export_key)
    return _build_download_response(
        export_key=export_key,
        title=resolved_title,
        columns=columns,
        rows=rows,
        filters=filters,
        export_format=export_format,
        locale=locale,
    )


def _build_download_response(
    *,
    export_key: str,
    title: str,
    columns: list[str],
    rows: list[dict],
    filters: dict,
    export_format: str,
    locale: str,
) -> dict[str, Any]:
    normalized_format = normalize_export_format(export_format)
    filename = build_export_filename(export_key, normalized_format)
    safe_title = normalize_title(title, normalize_export_key(export_key))
    safe_columns = _coerce_columns(columns)
    safe_rows = _coerce_rows(rows)
    safe_filters = _coerce_filters(filters)

    if normalized_format == "pdf":
        content = render_tabular_pdf(
            title=safe_title,
            columns=safe_columns,
            rows=safe_rows,
            filters=safe_filters,
        )
        content_type = "application/pdf"
    else:
        content = render_tabular_xlsx(
            title=safe_title,
            columns=safe_columns,
            rows=safe_rows,
            filters=safe_filters,
        )
        content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    return {
        "filename": filename,
        "filecontent": content,
        "type": "download",
        "content_type": content_type,
    }


def get_scheduled_report_config_summary() -> dict[str, Any]:
    try:
        return _coerce_scheduled_summary_payload(summarize_scheduled_report_configs())
    except Exception:
        log_redacted_error("Scheduled report config summary failed", details={})
        return {
            "items": [],
            "total": 0,
        }


def save_scheduled_report(index: int | None = None, config: dict | str | None = None) -> dict[str, Any]:
    normalized_config = _coerce_config_payload(config)
    result = upsert_scheduled_report_config(index, normalized_config)
    return _coerce_scheduled_mutation_payload(result, include_config=True)


def remove_scheduled_report(index: int) -> dict[str, Any]:
    result = delete_scheduled_report_config(index)
    return _coerce_scheduled_mutation_payload(result)


def normalize_export_format(export_format: str | None) -> str:
    return coerce_export_format(export_format)


def _resolve_tabular_title(title: str | dict[str, str], locale: str, export_key: str) -> str:
    safe_export_key = normalize_export_key(export_key)
    if not isinstance(title, dict):
        return translate_text(normalize_title(title, safe_export_key), locale)
    base_locale = locale.split("-")[0]
    for key in (locale, base_locale, "en"):
        value = str(title.get(key) or "").strip()
        if value:
            return translate_text(value, locale)
    return safe_export_key


def _coerce_columns(columns: Any) -> list[str]:
    return coerce_columns(columns)


def _coerce_rows(rows: Any) -> list[dict[str, Any]]:
    return coerce_rows(rows)


def _coerce_filters(filters: Any) -> dict[str, Any]:
    return coerce_filters(filters)


def _coerce_config_payload(config: dict | str | None) -> dict[str, Any]:
    if isinstance(config, str):
        if not config.strip():
            return {}
        try:
            parsed = frappe.parse_json(config) or {}
        except Exception:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    if isinstance(config, dict):
        return dict(config)
    if hasattr(config, "items"):
        return {key: value for key, value in config.items()}
    return {}


def _coerce_scheduled_summary_payload(value: Any) -> dict[str, Any]:
    items = value if isinstance(value, list) else []
    normalized_items: list[dict[str, Any]] = []
    for item in items:
        payload = item if isinstance(item, dict) else {}
        normalized_items.append(
            {
                "report_key": normalize_export_key(payload.get("report_key")),
                "label": normalize_title(payload.get("label") or payload.get("report_key"), normalize_export_key(payload.get("report_key"))),
                "frequency": str(payload.get("frequency") or "daily").strip() or "daily",
                "channel": str(payload.get("channel") or payload.get("delivery_channel") or "email").strip() or "email",
                "enabled": bool(payload.get("enabled")),
                "recipients": coerce_string_list(payload.get("recipients")),
                "locale": coerce_locale(payload.get("locale")),
                "last_status": str(payload.get("last_status") or "").strip(),
            }
        )
    return {"items": normalized_items, "total": len(normalized_items)}


def _coerce_scheduled_mutation_payload(value: Any, include_config: bool = False) -> dict[str, Any]:
    payload = value if isinstance(value, dict) else {}
    response: dict[str, Any] = {
        "ok": True,
        "index": max(cint(payload.get("index")), 0),
        "remaining": max(cint(payload.get("remaining")), 0),
    }
    if include_config:
        config = payload.get("config") if isinstance(payload.get("config"), dict) else {}
        response["config"] = {
            "report_key": normalize_export_key(config.get("report_key")),
            "label": normalize_title(config.get("label") or config.get("report_key"), normalize_export_key(config.get("report_key"))),
            "frequency": str(config.get("frequency") or "daily").strip() or "daily",
            "channel": str(config.get("channel") or config.get("delivery_channel") or "email").strip() or "email",
            "enabled": bool(config.get("enabled")),
            "recipients": coerce_string_list(config.get("recipients")),
            "filters": coerce_filters(config.get("filters")),
            "format": coerce_export_format(config.get("format")),
            "locale": coerce_locale(config.get("locale")),
        }
    return response

