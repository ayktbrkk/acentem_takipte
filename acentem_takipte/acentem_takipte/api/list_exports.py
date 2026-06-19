from __future__ import annotations

from typing import Any

import frappe
from frappe import _
from frappe.utils import cint

from acentem_takipte.acentem_takipte.api.security import assert_authenticated, assert_doctype_permission
from acentem_takipte.acentem_takipte.services.export_payload_utils import (
    coerce_columns,
    coerce_download_payload,
    coerce_filters,
    coerce_rows,
    coerce_string_list,
    normalize_export_key,
    normalize_title,
)
from acentem_takipte.acentem_takipte.services.list_exports import (
    build_tabular_payload_export_response,
    build_screen_export_payload,
    build_screen_export_response,
    build_workbench_export_query,
    get_screen_export_definition,
)


def _get_export_payload(screen: str, query: dict | str | None = None, limit: int = 1000) -> dict:
    assert_authenticated()
    definition = get_screen_export_definition(screen)
    assert_doctype_permission(str(definition["permission_doctype"]), "read")
    return _coerce_screen_payload(
        build_screen_export_payload(screen, query=query, limit=max(cint(limit), 1))
    )


@frappe.whitelist()
def get_screen_export_payload(screen: str, query: dict | str | None = None, limit: int = 1000) -> dict:
    # audit(whitelist-usage): No direct `frontend/src` caller was found in the
    # May 2026 audit. Retain the payload endpoint for tests/manual export tooling
    # so export schema inspection does not depend on download side effects.
    return _get_export_payload(screen, query=query, limit=limit)


@frappe.whitelist()
def export_screen_list(
    screen: str,
    query: dict | str | None = None,
    export_format: str = "xlsx",
    limit: int = 1000,
    filename: str = "",
):
    assert_authenticated()
    definition = get_screen_export_definition(screen)
    assert_doctype_permission(str(definition["permission_doctype"]), "read")
    download_payload = _coerce_download_payload(
        build_screen_export_response(
            screen,
            query=query,
            export_format=export_format,
            limit=max(cint(limit), 1),
        )
    )
    _apply_filename_override(download_payload, filename=filename, export_format=export_format)
    frappe.response.update(download_payload)


@frappe.whitelist()
def download_export(
    screen: str,
    query: dict | str | None = None,
    export_format: str = "",
    limit: int = 1000,
    filename: str = "",
    start_date: str = "",
    end_date: str = "",
    status: str = "",
):
    """Compatibility entrypoint used by /at/data-export before export_screen_list wiring."""
    request_format = str(export_format or frappe.form_dict.get("format") or "xlsx").strip()
    merged_query = query
    if merged_query in (None, "", {}):
        merged_query = build_workbench_export_query(
            screen,
            start_date=str(start_date or frappe.form_dict.get("start_date") or "").strip(),
            end_date=str(end_date or frappe.form_dict.get("end_date") or "").strip(),
            status=str(status or frappe.form_dict.get("status") or "").strip(),
        )
    export_screen_list(
        screen=screen,
        query=merged_query,
        export_format=request_format,
        limit=limit,
        filename=str(filename or frappe.form_dict.get("filename") or "").strip(),
    )


def _normalize_permission_doctypes(permission_doctypes) -> list[str]:
    parsed = permission_doctypes
    if isinstance(permission_doctypes, str):
        raw_value = permission_doctypes.strip()
        if not raw_value:
            return []
        try:
            parsed = frappe.parse_json(permission_doctypes)
        except Exception:
            parsed = raw_value
    return coerce_string_list(parsed)


@frappe.whitelist()
def export_tabular_payload(
    permission_doctypes=None,
    query: dict | str | None = None,
    export_format: str = "xlsx",
):
    assert_authenticated()
    normalized_doctypes = _normalize_permission_doctypes(permission_doctypes)
    if not normalized_doctypes:
        frappe.throw(_("At least one permission doctype is required for tabular export."))
    for doctype in normalized_doctypes:
        assert_doctype_permission(doctype, "read")
    frappe.response.update(
        _coerce_download_payload(
            build_tabular_payload_export_response(
            query=query,
            export_format=export_format,
        )
        )
    )


def _coerce_screen_payload(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {
            "screen": "",
            "export_key": "report",
            "title": "Report",
            "columns": [],
            "rows": [],
            "filters": {},
        }
    return {
        "screen": str(value.get("screen") or "").strip(),
        "export_key": normalize_export_key(value.get("export_key"), "report"),
        "title": normalize_title(value.get("title"), normalize_export_key(value.get("export_key"), "report")),
        "columns": coerce_columns(value.get("columns")),
        "rows": coerce_rows(value.get("rows")),
        "filters": coerce_filters(value.get("filters")),
    }


def _coerce_download_payload(value: Any) -> dict[str, Any]:
    return coerce_download_payload(value, default_filename="report.xlsx", default_type="download")


def _apply_filename_override(payload: dict[str, Any], *, filename: str, export_format: str) -> None:
    safe_filename = str(filename or "").strip()
    if not safe_filename:
        return
    fmt = str(export_format or "").strip().lower()
    if fmt == "pdf":
        extension = "pdf"
    elif fmt == "csv":
        extension = "csv"
    else:
        extension = "xlsx"
    stem = "".join(char if char.isalnum() or char in {"_", "-"} else "_" for char in safe_filename) or "export"
    payload["filename"] = f"{stem}.{extension}"

