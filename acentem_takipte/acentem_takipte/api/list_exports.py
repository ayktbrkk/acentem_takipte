from __future__ import annotations

import frappe

from acentem_takipte.acentem_takipte.api.security import assert_authenticated, assert_doctype_permission
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
    return build_screen_export_payload(screen, query=query, limit=limit)


@frappe.whitelist()
def get_screen_export_payload(screen: str, query: dict | str | None = None, limit: int = 1000) -> dict:
    return _get_export_payload(screen, query=query, limit=limit)


@frappe.whitelist()
def export_screen_list(screen: str, query: dict | str | None = None, export_format: str = "xlsx", limit: int = 1000):
    assert_authenticated()
    definition = get_screen_export_definition(screen)
    assert_doctype_permission(str(definition["permission_doctype"]), "read")
    frappe.response.update(
        build_screen_export_response(
            screen,
            query=query,
            export_format=export_format,
            limit=limit,
        )
    )


def _normalize_permission_doctypes(permission_doctypes) -> list[str]:
    parsed = frappe.parse_json(permission_doctypes) if isinstance(permission_doctypes, str) else permission_doctypes
    if isinstance(parsed, str):
        parsed = [parsed]
    return [str(doctype or "").strip() for doctype in (parsed or []) if str(doctype or "").strip()]


@frappe.whitelist()
def export_tabular_payload(
    permission_doctypes=None,
    query: dict | str | None = None,
    export_format: str = "xlsx",
):
    assert_authenticated()
    for doctype in _normalize_permission_doctypes(permission_doctypes):
        assert_doctype_permission(doctype, "read")
    frappe.response.update(
        build_tabular_payload_export_response(
            query=query,
            export_format=export_format,
        )
    )
