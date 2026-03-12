from __future__ import annotations

from typing import Any

import frappe


def coerce_columns(columns: Any) -> list[str]:
    if isinstance(columns, str):
        columns = [part.strip() for part in columns.split(",")]
    if not isinstance(columns, (list, tuple, set)):
        return []
    normalized: list[str] = []
    for column in columns:
        value = str(column).strip()
        if value and value not in normalized:
            normalized.append(value)
    return normalized


def coerce_rows(rows: Any) -> list[dict[str, Any]]:
    if not isinstance(rows, (list, tuple)):
        return []
    normalized: list[dict[str, Any]] = []
    for row in rows:
        if isinstance(row, dict):
            normalized.append(row)
        elif hasattr(row, "items"):
            normalized.append({key: value for key, value in row.items()})
    return normalized


def coerce_filters(filters: Any) -> dict[str, Any]:
    if isinstance(filters, str):
        if not filters.strip():
            return {}
        try:
            parsed = frappe.parse_json(filters) or {}
        except Exception:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    if isinstance(filters, dict):
        return dict(filters)
    if hasattr(filters, "items"):
        return {key: value for key, value in filters.items()}
    return {}


def coerce_string_list(value: Any) -> list[str]:
    if isinstance(value, str):
        raw_items = [part.strip() for part in value.split(",")]
    elif isinstance(value, (list, tuple, set)):
        raw_items = [str(item).strip() for item in value]
    else:
        raw_items = []

    items: list[str] = []
    for item in raw_items:
        if item and item not in items:
            items.append(item)
    return items


def normalize_title(title: Any, fallback: str = "Report") -> str:
    value = str(title or "").strip()
    return value or str(fallback or "Report").strip() or "Report"


def normalize_export_key(value: Any, fallback: str = "report") -> str:
    normalized = str(value or "").strip()
    return normalized or str(fallback or "report").strip() or "report"


def coerce_locale(value: Any, fallback: str = "tr") -> str:
    normalized = str(value or "").strip()
    return normalized or str(fallback or "tr").strip() or "tr"


def coerce_export_format(value: Any, fallback: str = "xlsx") -> str:
    normalized = str(value or fallback).strip().lower()
    if normalized in {
        "xls",
        "xlsm",
        "xlsb",
        "excel",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }:
        return "xlsx"
    if normalized in {"application/pdf", "application/x-pdf"}:
        return "pdf"
    return "pdf" if normalized == "pdf" else "xlsx"


def infer_content_type(filename: Any, content_type: Any = None) -> str:
    normalized = str(content_type or "").strip()
    if normalized:
        return normalized
    safe_filename = str(filename or "").strip().lower()
    if safe_filename.endswith(".pdf"):
        return "application/pdf"
    if safe_filename.endswith(".xlsx"):
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return "application/octet-stream"


def coerce_download_payload(value: Any, default_filename: str = "export.xlsx", default_type: str = "download") -> dict[str, Any]:
    payload = value if isinstance(value, dict) else {}
    filename = str(payload.get("filename") or "").strip() or default_filename
    filecontent = payload.get("filecontent")
    if isinstance(filecontent, str):
        filecontent = filecontent.encode("utf-8")
    elif isinstance(filecontent, bytearray):
        filecontent = bytes(filecontent)
    elif not isinstance(filecontent, bytes):
        filecontent = b""
    return {
        "type": str(payload.get("type") or "").strip() or default_type,
        "filename": filename,
        "content_type": infer_content_type(filename, payload.get("content_type")),
        "filecontent": filecontent,
    }
