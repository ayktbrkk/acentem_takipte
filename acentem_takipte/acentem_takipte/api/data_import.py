from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _
from frappe.utils import cint, now_datetime

from acentem_takipte.acentem_takipte.platform.api.documents import _resolve_uploaded_file_name
from acentem_takipte.acentem_takipte.platform.api.mutation_access import assert_role_based_write_access
from acentem_takipte.acentem_takipte.platform.api.security import assert_authenticated, assert_doc_permission, assert_doctype_permission
from acentem_takipte.acentem_takipte.platform.import_export.data_import.preview import build_data_import_preview
from acentem_takipte.acentem_takipte.platform.import_export.data_import.registry import (
    DATASET_TARGET_DOCTYPE,
    SUPPORTED_PREVIEW_DATASETS,
)
from acentem_takipte.acentem_takipte.utils.permissions import build_doctype_permission_map

DATA_IMPORT_ADMIN_ROLES = ("System Manager", "AT System Manager", "Administrator")

DATA_IMPORT_MUTATION_DOCTYPES = build_doctype_permission_map(
    create_import_job_draft=("AT Data Import Job", "AT Customer", "AT Offer", "AT Policy"),
    preview_data_import=("AT Data Import Job", "AT Customer", "AT Offer", "AT Policy"),
    enqueue_data_import=("AT Data Import Job", "AT Customer", "AT Offer", "AT Policy"),
    cancel_import_job=("AT Data Import Job",),
)


def _assert_data_import_mutation_access(action: str, *, dataset: str, details: dict | None = None) -> None:
    targets = list(DATA_IMPORT_MUTATION_DOCTYPES.get(action, ("AT Data Import Job",)))
    target_doctype = DATASET_TARGET_DOCTYPE.get(dataset)
    if target_doctype and target_doctype not in targets:
        targets.append(target_doctype)
    assert_role_based_write_access(
        action=f"api.data_import.{action}",
        roles=DATA_IMPORT_ADMIN_ROLES,
        permission_targets=tuple(targets),
        details=details,
        role_message="You do not have permission to run data import operations.",
        post_message="Only POST requests are allowed for data import mutations.",
    )


def _parse_json_dict(raw: Any) -> dict[str, Any]:
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            loaded = json.loads(raw)
        except json.JSONDecodeError:
            frappe.throw(_("Invalid JSON payload."))
        return loaded if isinstance(loaded, dict) else {}
    frappe.throw(_("Invalid JSON payload."))


@frappe.whitelist()
def create_import_job_draft(
    dataset: str,
    file_name: str = "",
    file_url: str = "",
) -> dict[str, Any]:
    safe_dataset = str(dataset or "").strip()
    if safe_dataset not in SUPPORTED_PREVIEW_DATASETS:
        frappe.throw(_("Dataset is not supported yet: {0}").format(safe_dataset or "unknown"))

    _assert_data_import_mutation_access(
        "create_import_job_draft",
        dataset=safe_dataset,
        details={"dataset": safe_dataset, "file_name": file_name, "file_url": file_url},
    )

    resolved_file_name = _resolve_uploaded_file_name(file_name=file_name, file_url=file_url)
    file_doc = frappe.get_doc("File", resolved_file_name)
    source_file = file_doc.file_url
    if not source_file:
        frappe.throw(_("Uploaded file URL is missing."))

    job = frappe.get_doc(
        {
            "doctype": "AT Data Import Job",
            "dataset": safe_dataset,
            "status": "Draft",
            "source_file": source_file,
            "requested_by": frappe.session.user,
            "import_options": json.dumps({"duplicate_policy": "skip"}, ensure_ascii=False),
        }
    )
    job.insert(ignore_permissions=True)

    sheet_names = _list_file_sheets(source_file)
    headers = _read_headers_from_file(source_file, sheet_name=sheet_names[0] if sheet_names else None)

    return {
        "job_name": job.name,
        "source_file": source_file,
        "headers": headers,
        "sheet_names": sheet_names,
        "active_sheet": sheet_names[0] if sheet_names else None,
    }


@frappe.whitelist()
def preview_data_import(
    job_name: str,
    column_mapping: str | dict | None = None,
    import_options: str | dict | None = None,
    limit: int = 200,
) -> dict[str, Any]:
    safe_job_name = str(job_name or "").strip()
    _assert_data_import_mutation_access(
        "preview_data_import",
        dataset=_dataset_for_job(safe_job_name),
        details={"job_name": safe_job_name, "limit": max(cint(limit), 1)},
    )
    assert_doc_permission("AT Data Import Job", safe_job_name, "write")

    return build_data_import_preview(
        job_name=safe_job_name,
        column_mapping=_parse_json_dict(column_mapping),
        import_options=_parse_json_dict(import_options),
        limit=max(cint(limit), 1),
    )


@frappe.whitelist()
def enqueue_data_import(job_name: str) -> dict[str, Any]:
    safe_job_name = str(job_name or "").strip()
    dataset = _dataset_for_job(safe_job_name)
    _assert_data_import_mutation_access(
        "enqueue_data_import",
        dataset=dataset,
        details={"job_name": safe_job_name},
    )
    job = assert_doc_permission("AT Data Import Job", safe_job_name, "write")

    if job.status != "Previewed":
        frappe.throw(_("Import job must be previewed before enqueueing."))

    summary = _parse_json_dict(job.preview_summary)
    if int(summary.get("ready") or 0) <= 0:
        frappe.throw(_("There are no importable rows in the preview."))

    job.status = "Queued"
    job.save(ignore_permissions=True)

    from acentem_takipte.acentem_takipte.tasks import enqueue_data_import_job

    queued = enqueue_data_import_job(safe_job_name)
    job.queue_job_id = queued.get("job") or ""
    job.save(ignore_permissions=True)

    return {
        "job_name": safe_job_name,
        "status": job.status,
        "queue_job_id": job.queue_job_id,
    }


@frappe.whitelist()
def get_import_job_status(job_name: str) -> dict[str, Any]:
    assert_authenticated()
    safe_job_name = str(job_name or "").strip()
    job = assert_doc_permission("AT Data Import Job", safe_job_name, "read")
    return _serialize_job(job)


@frappe.whitelist()
def get_import_file_headers(job_name: str, sheet_name: str = "") -> dict[str, Any]:
    assert_authenticated()
    safe_job_name = str(job_name or "").strip()
    job = assert_doc_permission("AT Data Import Job", safe_job_name, "read")
    safe_sheet = str(sheet_name or "").strip() or None
    headers = _read_headers_from_file(job.source_file, sheet_name=safe_sheet)
    sheets = _list_file_sheets(job.source_file)
    return {
        "headers": headers,
        "sheet_names": sheets,
        "active_sheet": safe_sheet or (sheets[0] if sheets else None),
    }


@frappe.whitelist()
def list_import_jobs(limit: int = 20) -> list[dict[str, Any]]:
    assert_authenticated()
    assert_doctype_permission("AT Data Import Job", "read")

    rows = frappe.get_all(
        "AT Data Import Job",
        fields=[
            "name",
            "dataset",
            "status",
            "requested_by",
            "modified",
            "finished_at",
            "result_summary",
        ],
        order_by="modified desc",
        limit_page_length=max(cint(limit), 1),
    )
    return [
        {
            "job_name": row.name,
            "dataset": row.dataset,
            "status": row.status,
            "requested_by": row.requested_by,
            "modified": row.modified,
            "finished_at": row.finished_at,
            "result_summary": _parse_json_dict(row.result_summary),
        }
        for row in rows
    ]


@frappe.whitelist()
def cancel_import_job(job_name: str) -> dict[str, str]:
    safe_job_name = str(job_name or "").strip()
    dataset = _dataset_for_job(safe_job_name)
    _assert_data_import_mutation_access(
        "cancel_import_job",
        dataset=dataset,
        details={"job_name": safe_job_name},
    )
    job = assert_doc_permission("AT Data Import Job", safe_job_name, "write")

    if job.status not in {"Draft", "Previewed", "Queued"}:
        frappe.throw(_("Only draft, previewed or queued import jobs can be cancelled."))

    job.status = "Cancelled"
    job.finished_at = now_datetime()
    job.save(ignore_permissions=True)
    return {"job_name": safe_job_name, "status": job.status}


def _dataset_for_job(job_name: str) -> str:
    if not job_name:
        frappe.throw(_("Job name is required."))
    dataset = frappe.db.get_value("AT Data Import Job", job_name, "dataset")
    if not dataset:
        frappe.throw(_("Import job not found."))
    return str(dataset)


def _serialize_job(job) -> dict[str, Any]:
    return {
        "job_name": job.name,
        "dataset": job.dataset,
        "status": job.status,
        "preview_summary": _parse_json_dict(job.preview_summary),
        "result_summary": _parse_json_dict(job.result_summary),
        "error_log_file": job.error_log_file,
        "queue_job_id": job.queue_job_id,
        "started_at": job.started_at,
        "finished_at": job.finished_at,
    }


def _list_file_sheets(source_file: str) -> list[str]:
    from acentem_takipte.acentem_takipte.platform.import_export.data_import.file_loader import list_job_file_sheets

    return list_job_file_sheets(source_file)


def _read_headers_from_file(source_file: str, sheet_name: str | None = None) -> list[str]:
    from acentem_takipte.acentem_takipte.platform.import_export.data_import.file_loader import parse_job_file

    parsed = parse_job_file(file_url=source_file, sheet_name=sheet_name, limit=1)
    return parsed.headers
