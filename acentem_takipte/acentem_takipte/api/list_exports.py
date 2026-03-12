from __future__ import annotations

from typing import Any

import frappe
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
    return _get_export_payload(screen, query=query, limit=limit)


@frappe.whitelist()
def export_screen_list(screen: str, query: dict | str | None = None, export_format: str = "xlsx", limit: int = 1000):
    assert_authenticated()
    definition = get_screen_export_definition(screen)
    assert_doctype_permission(str(definition["permission_doctype"]), "read")
    frappe.response.update(
        _coerce_download_payload(
            build_screen_export_response(
            screen,
            query=query,
            export_format=export_format,
            limit=max(cint(limit), 1),
        )
        )
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
        frappe.throw("At least one permission doctype is required for tabular export.")
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
