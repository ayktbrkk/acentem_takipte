from __future__ import annotations

from typing import Any

import frappe
from frappe import _
from frappe.utils import cint

from acentem_takipte.acentem_takipte.services.report_exports import (
    build_report_filename,
    render_report_pdf,
    render_report_xlsx,
)
from acentem_takipte.acentem_takipte.services.report_registry import build_report_payload
from acentem_takipte.acentem_takipte.services.scheduled_reports import (
    delete_scheduled_report_config,
    summarize_scheduled_report_configs,
    upsert_scheduled_report_config,
)
from acentem_takipte.acentem_takipte.utils.logging import log_redacted_error


def build_safe_report_payload(report_key: str, filters: dict | None, limit: int) -> dict[str, Any]:
    try:
        normalized_limit = max(cint(limit), 1)
        return build_report_payload(report_key, filters=filters, limit=normalized_limit)
    except Exception:
        log_redacted_error(
            "Report payload build failed",
            details={"report_key": report_key, "filters": filters or {}, "limit": max(cint(limit), 1)},
        )
        frappe.throw(_("Report cannot be loaded. Please try again later."))
    return {}


def build_report_download_response(
    *,
    report_key: str,
    columns: list[str],
    rows: list[dict],
    filters: dict,
    export_format: str,
) -> dict[str, Any]:
    locale = str(getattr(frappe.local, "lang", "tr") or "tr").split("-")[0]
    normalized_format = normalize_export_format(export_format)
    filename = build_report_filename(report_key, normalized_format)

    if normalized_format == "pdf":
        content = render_report_pdf(
            report_key=report_key,
            columns=columns,
            rows=rows,
            filters=filters,
            locale=locale,
        )
        content_type = "application/pdf"
    else:
        content = render_report_xlsx(
            report_key=report_key,
            columns=columns,
            rows=rows,
            filters=filters,
            locale=locale,
        )
        content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    return {
        "filename": filename,
        "filecontent": content,
        "type": "download",
        "content_type": content_type,
    }


def get_scheduled_report_config_summary() -> dict[str, Any]:
    configs = summarize_scheduled_report_configs()
    return {
        "items": configs,
        "total": len(configs),
    }


def save_scheduled_report(index: int | None = None, config: dict | str | None = None) -> dict[str, Any]:
    normalized_config = frappe.parse_json(config) if isinstance(config, str) else (config or {})
    result = upsert_scheduled_report_config(index, normalized_config)
    return {
        "ok": True,
        "index": result["index"],
        "config": result["config"],
    }


def remove_scheduled_report(index: int) -> dict[str, Any]:
    result = delete_scheduled_report_config(index)
    return {
        "ok": True,
        "remaining": result["remaining"],
    }


def normalize_export_format(export_format: str | None) -> str:
    value = str(export_format or "xlsx").strip().lower()
    return "pdf" if value == "pdf" else "xlsx"
