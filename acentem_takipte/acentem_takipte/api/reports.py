from __future__ import annotations

import frappe
from frappe import _

from acentem_takipte.acentem_takipte.api.security import assert_authenticated, assert_doctype_permission, assert_post_request, assert_roles
from acentem_takipte.acentem_takipte.services.report_registry import get_report_definition
from acentem_takipte.acentem_takipte.services.reports_runtime import (
    build_report_download_response,
    build_safe_report_payload,
    get_scheduled_report_config_summary,
    remove_scheduled_report,
    save_scheduled_report,
)


def _get_report_payload(report_key: str, filters: dict | None = None, limit: int = 500) -> dict:
    assert_authenticated()
    assert_doctype_permission(str(get_report_definition(report_key)["permission_doctype"]), "read")
    return build_safe_report_payload(report_key, filters=filters, limit=limit)


def _export_report_payload(report_key: str, filters: dict | None = None, export_format: str = "xlsx", limit: int = 1000):
    payload = _get_report_payload(report_key, filters=filters, limit=limit)
    _respond_with_report_file(
        report_key=payload["report_key"],
        columns=payload["columns"],
        rows=payload["rows"],
        filters=payload["filters"],
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
    return get_scheduled_report_config_summary()


@frappe.whitelist()
def save_scheduled_report_config(index: int | None = None, config: dict | str | None = None) -> dict:
    assert_authenticated()
    assert_post_request("Only POST requests are allowed for scheduled report changes.")
    assert_roles("System Manager", "Administrator", message="You do not have permission to manage scheduled reports.")
    return save_scheduled_report(index=index, config=config)


@frappe.whitelist()
def remove_scheduled_report_config(index: int) -> dict:
    assert_authenticated()
    assert_post_request("Only POST requests are allowed for scheduled report changes.")
    assert_roles("System Manager", "Administrator", message="You do not have permission to manage scheduled reports.")
    return remove_scheduled_report(index)


def _respond_with_report_file(
    *,
    report_key: str,
    columns: list[str],
    rows: list[dict],
    filters: dict,
    export_format: str,
) -> None:
    response_payload = build_report_download_response(
        report_key=report_key,
        columns=columns,
        rows=rows,
        filters=filters,
        export_format=export_format,
    )
    frappe.response.update(response_payload)
