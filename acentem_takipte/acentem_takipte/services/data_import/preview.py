from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _
from frappe.utils import getdate

from acentem_takipte.acentem_takipte.platform.permissions.branches import assert_office_branch_access
from acentem_takipte.acentem_takipte.platform.import_export.data_import.file_loader import parse_job_file
from acentem_takipte.acentem_takipte.platform.import_export.data_import.normalizers import (
    apply_column_mapping,
    normalize_customer_row,
    normalize_offer_row,
    normalize_policy_row,
    validate_customer_row,
)
from acentem_takipte.acentem_takipte.platform.import_export.data_import.registry import (
    IMPORT_ROW_LIMIT,
    PREVIEW_ROW_LIMIT,
    assert_dataset_supported,
    get_required_fields,
    normalize_field_key,
)
from acentem_takipte.acentem_takipte.platform.import_export.data_import.resolvers import (
    offer_duplicate_exists,
    policy_duplicate_exists,
)
from acentem_takipte.acentem_takipte.utils.statuses import ATOfferStatus


POLICY_IMPORT_STATUSES = frozenset({"Draft", "Active", "Cancelled", "IPT", "KYT"})


def build_data_import_preview(
    *,
    job_name: str,
    column_mapping: dict[str, str] | None = None,
    import_options: dict[str, Any] | None = None,
    limit: int = PREVIEW_ROW_LIMIT,
) -> dict[str, Any]:
    job = frappe.get_doc("AT Data Import Job", job_name)
    assert_dataset_supported(job.dataset, for_execute=False)

    mapping = column_mapping if column_mapping is not None else _load_json(job.column_mapping)
    options = import_options if import_options is not None else _load_json(job.import_options)
    office_branch = assert_office_branch_access(options.get("office_branch"))
    delimiter = str(options.get("delimiter") or ",")
    sheet_name = str(options.get("sheet_name") or "").strip() or None

    parsed = parse_job_file(
        file_url=job.source_file,
        delimiter=delimiter,
        sheet_name=sheet_name,
        limit=limit,
    )
    rows = build_preview_rows(
        job.dataset,
        parsed.rows,
        mapping,
        office_branch=office_branch,
    )
    summary = _summarize_rows(rows)

    job.column_mapping = json.dumps(mapping, ensure_ascii=False)
    job.import_options = json.dumps(
        {**(options or {}), "office_branch": office_branch, "sheet_name": parsed.active_sheet or sheet_name},
        ensure_ascii=False,
    )
    job.preview_summary = json.dumps(summary, ensure_ascii=False)
    job.preview_rows_json = json.dumps(rows[:PREVIEW_ROW_LIMIT], ensure_ascii=False)
    job.status = "Previewed"
    job.save(ignore_permissions=True)

    return {
        "job_name": job.name,
        "headers": parsed.headers,
        "rows": rows,
        "summary": summary,
        "dataset": job.dataset,
        "sheet_names": parsed.sheet_names,
        "active_sheet": parsed.active_sheet,
    }


def build_import_rows_for_job(job_name: str, *, limit: int = IMPORT_ROW_LIMIT) -> list[dict[str, Any]]:
    job = frappe.get_doc("AT Data Import Job", job_name)
    mapping = _load_json(job.column_mapping)
    options = _load_json(job.import_options)
    office_branch = options.get("office_branch")
    delimiter = str(options.get("delimiter") or ",")
    sheet_name = str(options.get("sheet_name") or "").strip() or None
    parsed = parse_job_file(
        file_url=job.source_file,
        delimiter=delimiter,
        sheet_name=sheet_name,
        limit=limit,
    )
    return build_preview_rows(job.dataset, parsed.rows, mapping, office_branch=office_branch)


def build_preview_rows(
    dataset: str,
    raw_rows: list[dict[str, str]],
    column_mapping: dict[str, str],
    *,
    office_branch: str | None,
) -> list[dict[str, Any]]:
    _assert_required_mapping(dataset, column_mapping)
    builders = {
        "customers": _build_customer_preview_rows,
        "offers": _build_offer_preview_rows,
        "policies": _build_policy_preview_rows,
    }
    builder = builders.get(dataset)
    if not builder:
        frappe.throw(_("Dataset is not supported yet: {0}").format(dataset))
    return builder(raw_rows, column_mapping, office_branch=office_branch)


def _assert_required_mapping(dataset: str, column_mapping: dict[str, str]) -> None:
    required = set(get_required_fields(dataset))
    mapped_targets = {
        normalize_field_key(value)
        for value in column_mapping.values()
        if normalize_field_key(value)
    }
    if not required.issubset(mapped_targets):
        missing = sorted(required - mapped_targets)
        frappe.throw(_("Required fields are not mapped: {0}").format(", ".join(missing)))


def _build_customer_preview_rows(
    raw_rows: list[dict[str, str]],
    column_mapping: dict[str, str],
    *,
    office_branch: str | None,
) -> list[dict[str, Any]]:
    preview_rows: list[dict[str, Any]] = []
    for index, raw_row in enumerate(raw_rows, start=2):
        mapped = apply_column_mapping(raw_row, column_mapping)
        payload = normalize_customer_row(mapped)
        error_message = validate_customer_row(payload)
        duplicate_of = None
        if error_message:
            row_status = "error"
        elif frappe.db.exists("AT Customer", {"tax_id": payload["tax_id"]}):
            row_status = "skipped"
            duplicate_of = frappe.db.get_value("AT Customer", {"tax_id": payload["tax_id"]}, "name")
            error_message = "Duplicate customer"
        else:
            row_status = "ready"
            error_message = None

        preview_rows.append(_preview_row(index, row_status, error_message, payload, raw_row, office_branch, duplicate_of))
    return preview_rows


def _build_offer_preview_rows(
    raw_rows: list[dict[str, str]],
    column_mapping: dict[str, str],
    *,
    office_branch: str | None,
) -> list[dict[str, Any]]:
    preview_rows: list[dict[str, Any]] = []
    for index, raw_row in enumerate(raw_rows, start=2):
        mapped = apply_column_mapping(raw_row, column_mapping)
        status_value = str(mapped.get("status") or ATOfferStatus.DRAFT).strip() or ATOfferStatus.DRAFT
        if status_value not in ATOfferStatus.CREATION_ALLOWED:
            preview_rows.append(
                _preview_row(index, "error", f"Unsupported offer status: {status_value}", {}, raw_row, office_branch)
            )
            continue

        payload, error_message = normalize_offer_row(mapped, office_branch=office_branch)
        duplicate_of = None
        if error_message:
            row_status = "error"
        else:
            duplicate_of = offer_duplicate_exists(
                customer=payload["customer"],
                insurance_company=payload["insurance_company"],
                offer_date=payload["offer_date"],
            )
            if duplicate_of:
                row_status = "skipped"
                error_message = "Duplicate offer"
            else:
                row_status = "ready"
                error_message = None

        preview_rows.append(_preview_row(index, row_status, error_message, payload, raw_row, office_branch, duplicate_of))
    return preview_rows


def _build_policy_preview_rows(
    raw_rows: list[dict[str, str]],
    column_mapping: dict[str, str],
    *,
    office_branch: str | None,
) -> list[dict[str, Any]]:
    preview_rows: list[dict[str, Any]] = []
    for index, raw_row in enumerate(raw_rows, start=2):
        mapped = apply_column_mapping(raw_row, column_mapping)
        status_value = str(mapped.get("status") or "Active").strip() or "Active"
        if status_value not in POLICY_IMPORT_STATUSES:
            preview_rows.append(
                _preview_row(index, "error", f"Unsupported policy status: {status_value}", {}, raw_row, office_branch)
            )
            continue

        payload, error_message = normalize_policy_row(mapped, office_branch=office_branch)
        duplicate_of = None
        if error_message:
            row_status = "error"
        else:
            duplicate_of = policy_duplicate_exists(
                insurance_company=payload["insurance_company"],
                policy_no=payload["policy_no"],
            )
            if duplicate_of:
                row_status = "skipped"
                error_message = "Duplicate policy"
            else:
                row_status = "ready"
                error_message = None

        preview_rows.append(_preview_row(index, row_status, error_message, payload, raw_row, office_branch, duplicate_of))
    return preview_rows


def _preview_row(
    row_number: int,
    row_status: str,
    error_message: str | None,
    values: dict,
    raw_row: dict[str, str],
    office_branch: str | None,
    duplicate_of: str | None = None,
) -> dict[str, Any]:
    return {
        "row_number": row_number,
        "row_status": row_status,
        "error_message": error_message,
        "duplicate_of": duplicate_of,
        "office_branch": office_branch,
        "values": values,
        "raw": raw_row,
    }


def _summarize_rows(rows: list[dict[str, Any]]) -> dict[str, int]:
    summary = {"total_rows": len(rows), "ready": 0, "skipped": 0, "error": 0}
    for row in rows:
        status = str(row.get("row_status") or "error")
        if status in summary:
            summary[status] += 1
        else:
            summary["error"] += 1
    return summary


def _load_json(raw: Any) -> dict[str, Any]:
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    try:
        loaded = json.loads(str(raw))
    except json.JSONDecodeError:
        return {}
    return loaded if isinstance(loaded, dict) else {}
