from __future__ import annotations

from typing import Any

import frappe
from frappe import _
from frappe.utils import cint

from acentem_takipte.acentem_takipte.api.security import assert_authenticated, assert_doctype_permission, assert_post_request, assert_roles
from acentem_takipte.acentem_takipte.services.export_payload_utils import (
    coerce_columns,
    coerce_download_payload,
    coerce_filters,
    coerce_rows,
    coerce_string_list,
    normalize_export_key,
)
from acentem_takipte.acentem_takipte.services.report_registry import get_report_definition
from acentem_takipte.acentem_takipte.services.reports_runtime import (
    build_report_download_response,
    build_safe_report_payload,
    get_scheduled_report_config_summary,
    remove_scheduled_report,
    save_scheduled_report,
)


def _get_report_payload(report_key: str, filters: dict | None = None, limit: int = 500) -> dict:
    safe_report_key = normalize_export_key(report_key)
    assert_authenticated()
    assert_doctype_permission(str(get_report_definition(safe_report_key)["permission_doctype"]), "read")
    return _coerce_report_payload(
        build_safe_report_payload(safe_report_key, filters=_coerce_filters(filters), limit=max(cint(limit), 1)),
        safe_report_key,
        _coerce_filters(filters),
    )


def _export_report_payload(report_key: str, filters: dict | None = None, export_format: str = "xlsx", limit: int = 1000):
    payload = _get_report_payload(report_key, filters=filters, limit=limit)
    _respond_with_report_file(
        report_key=payload.get("report_key"),
        columns=payload.get("columns"),
        rows=payload.get("rows"),
        filters=payload.get("filters"),
        export_format=export_format,
    )


@frappe.whitelist()
def get_policy_list_report(filters: dict | None = None, limit: int = 500) -> dict:
    return _get_report_payload("policy_list", filters=filters, limit=limit)


@frappe.whitelist()
def get_payment_status_report(filters: dict | None = None, limit: int = 500) -> dict:
    return _get_report_payload("payment_status", filters=filters, limit=limit)


@frappe.whitelist()
def get_renewal_performance_report(filters: dict | None = None, limit: int = 500) -> dict:
    return _get_report_payload("renewal_performance", filters=filters, limit=limit)


@frappe.whitelist()
def get_claim_loss_ratio_report(filters: dict | None = None, limit: int = 500) -> dict:
    return _get_report_payload("claim_loss_ratio", filters=filters, limit=limit)


@frappe.whitelist()
def get_agent_performance_report(filters: dict | None = None, limit: int = 500) -> dict:
    return _get_report_payload("agent_performance", filters=filters, limit=limit)


@frappe.whitelist()
def get_customer_segmentation_report(filters: dict | None = None, limit: int = 500) -> dict:
    return _get_report_payload("customer_segmentation", filters=filters, limit=limit)


@frappe.whitelist()
def get_communication_operations_report(filters: dict | None = None, limit: int = 500) -> dict:
    return _get_report_payload("communication_operations", filters=filters, limit=limit)


@frappe.whitelist()
def get_reconciliation_operations_report(filters: dict | None = None, limit: int = 500) -> dict:
    return _get_report_payload("reconciliation_operations", filters=filters, limit=limit)


@frappe.whitelist()
def get_claims_operations_report(filters: dict | None = None, limit: int = 500) -> dict:
    return _get_report_payload("claims_operations", filters=filters, limit=limit)


@frappe.whitelist()
def export_policy_list_report(filters: dict | None = None, export_format: str = "xlsx", limit: int = 1000):
    _export_report_payload("policy_list", filters=filters, export_format=export_format, limit=limit)


@frappe.whitelist()
def export_payment_status_report(filters: dict | None = None, export_format: str = "xlsx", limit: int = 1000):
    _export_report_payload("payment_status", filters=filters, export_format=export_format, limit=limit)


@frappe.whitelist()
def export_renewal_performance_report(filters: dict | None = None, export_format: str = "xlsx", limit: int = 1000):
    _export_report_payload("renewal_performance", filters=filters, export_format=export_format, limit=limit)


@frappe.whitelist()
def export_claim_loss_ratio_report(filters: dict | None = None, export_format: str = "xlsx", limit: int = 1000):
    _export_report_payload("claim_loss_ratio", filters=filters, export_format=export_format, limit=limit)


@frappe.whitelist()
def export_agent_performance_report(filters: dict | None = None, export_format: str = "xlsx", limit: int = 1000):
    _export_report_payload("agent_performance", filters=filters, export_format=export_format, limit=limit)


@frappe.whitelist()
def export_customer_segmentation_report(filters: dict | None = None, export_format: str = "xlsx", limit: int = 1000):
    _export_report_payload("customer_segmentation", filters=filters, export_format=export_format, limit=limit)


@frappe.whitelist()
def export_communication_operations_report(filters: dict | None = None, export_format: str = "xlsx", limit: int = 1000):
    _export_report_payload("communication_operations", filters=filters, export_format=export_format, limit=limit)


@frappe.whitelist()
def export_reconciliation_operations_report(filters: dict | None = None, export_format: str = "xlsx", limit: int = 1000):
    _export_report_payload("reconciliation_operations", filters=filters, export_format=export_format, limit=limit)


@frappe.whitelist()
def export_claims_operations_report(filters: dict | None = None, export_format: str = "xlsx", limit: int = 1000):
    _export_report_payload("claims_operations", filters=filters, export_format=export_format, limit=limit)


@frappe.whitelist()
def get_scheduled_report_configs() -> dict:
    assert_authenticated()
    assert_roles("System Manager", "Administrator", message="You do not have permission to view scheduled reports.")
    return _coerce_summary_payload(get_scheduled_report_config_summary())


@frappe.whitelist()
def save_scheduled_report_config(index: int | None = None, config: dict | str | None = None) -> dict:
    assert_authenticated()
    assert_post_request("Only POST requests are allowed for scheduled report changes.")
    assert_roles("System Manager", "Administrator", message="You do not have permission to manage scheduled reports.")
    return _coerce_scheduled_mutation_payload(save_scheduled_report(index=_coerce_index(index), config=config))


@frappe.whitelist()
def remove_scheduled_report_config(index: int) -> dict:
    assert_authenticated()
    assert_post_request("Only POST requests are allowed for scheduled report changes.")
    assert_roles("System Manager", "Administrator", message="You do not have permission to manage scheduled reports.")
    return _coerce_scheduled_mutation_payload(remove_scheduled_report(_coerce_index(index) or 0))


def _respond_with_report_file(
    *,
    report_key: str,
    columns: list[str],
    rows: list[dict],
    filters: dict,
    export_format: str,
) -> None:
    response_payload = _coerce_download_payload(
        build_report_download_response(
        report_key=report_key,
        columns=columns,
        rows=rows,
        filters=filters,
        export_format=export_format,
        )
    )
    frappe.response.update(response_payload)


def _coerce_filters(value: Any) -> dict[str, Any]:
    return coerce_filters(value)


def _coerce_index(value: Any) -> int | None:
    if value in (None, ""):
        return None
    return max(cint(value), 0)


def _coerce_summary_payload(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {"items": [], "total": 0}
    items = value.get("items")
    if not isinstance(items, list):
        items = []
    normalized_items = [_coerce_summary_item(item) for item in items if isinstance(item, dict)]
    total = cint(value.get("total"))
    return {
        "items": normalized_items,
        "total": max(total, len(normalized_items)),
    }


def _coerce_download_payload(value: Any) -> dict[str, Any]:
    return coerce_download_payload(value, default_filename="report.xlsx", default_type="download")


def _coerce_report_payload(value: Any, report_key: str, filters: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {
            "report_key": report_key,
            "columns": [],
            "rows": [],
            "filters": filters,
        }
    payload = dict(value)
    return {
        "report_key": normalize_export_key(payload.get("report_key"), report_key),
        "columns": coerce_columns(payload.get("columns")),
        "rows": coerce_rows(payload.get("rows")),
        "filters": coerce_filters(payload.get("filters")) or filters,
    }


def _coerce_scheduled_mutation_payload(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {"ok": False}
    payload = dict(value)
    normalized = {"ok": bool(payload.get("ok", True))}
    if "index" in payload:
        normalized["index"] = _coerce_index(payload.get("index"))
    if "remaining" in payload:
        normalized["remaining"] = max(cint(payload.get("remaining")), 0)
    if isinstance(payload.get("config"), dict):
        normalized["config"] = dict(payload.get("config"))
    return normalized


def _coerce_summary_item(value: dict[str, Any]) -> dict[str, Any]:
    return {
        "index": max(cint(value.get("index")), 0),
        "enabled": bool(cint(value.get("enabled", 0))),
        "report_key": str(value.get("report_key") or "").strip(),
        "frequency": str(value.get("frequency") or "daily").strip().lower() or "daily",
        "format": str(value.get("format") or "xlsx").strip().lower() or "xlsx",
        "delivery_channel": str(value.get("delivery_channel") or "email").strip().lower() or "email",
        "locale": str(value.get("locale") or "tr").strip() or "tr",
        "recipients": _coerce_string_list(value.get("recipients")),
        "filters": _coerce_filters(value.get("filters")),
        "limit": max(cint(value.get("limit")) or 1, 1),
        "weekday": max(cint(value.get("weekday")), 0),
        "day_of_month": max(cint(value.get("day_of_month")) or 1, 1),
        "is_valid_report_key": bool(value.get("is_valid_report_key")),
        "last_run_at": value.get("last_run_at"),
        "last_status": str(value.get("last_status") or "").strip().lower() or None,
        "last_summary": _coerce_filters(value.get("last_summary")),
    }


def _coerce_string_list(value: Any) -> list[str]:
    return coerce_string_list(value)


def _coerce_content_type(value: Any, filename: str) -> str:
    return coerce_download_payload({"filename": filename, "content_type": value})["content_type"]

