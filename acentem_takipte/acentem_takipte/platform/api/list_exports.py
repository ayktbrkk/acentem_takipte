from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _
from frappe.utils import cint, get_datetime, now_datetime

from acentem_takipte.acentem_takipte.platform.api.security import (
    assert_authenticated,
    assert_doctype_permission,
    audit_admin_action,
)
from acentem_takipte.acentem_takipte.platform.permissions.branches import (
    get_allowed_office_branch_names,
    user_can_access_all_office_branches,
)
from acentem_takipte.acentem_takipte.platform.services.export_payload_utils import (
    coerce_columns,
    coerce_download_payload,
    coerce_filters,
    coerce_rows,
    coerce_string_list,
    normalize_export_key,
    normalize_title,
)
from acentem_takipte.acentem_takipte.platform.services.list_exports import (
    build_tabular_payload_export_response,
    build_screen_export_payload,
    build_screen_export_response,
    build_workbench_export_query,
    get_screen_export_definition,
)

EXPORT_FILE_ADMIN_ROLES = ("System Manager", "AT System Manager", "Administrator")


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
    office_branch: str = "",
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
            office_branch=str(office_branch or frappe.form_dict.get("office_branch") or "").strip(),
        )

    _audit_export_action(
        screen=screen,
        export_format=request_format,
        filters=_parse_filters_from_query(merged_query),
        branch=office_branch,
    )

    export_payload = build_screen_export_payload(
        screen,
        query=merged_query,
        limit=max(cint(limit), 1),
    )

    download_payload = _coerce_download_payload(
        build_screen_export_response(
            screen,
            query=merged_query,
            export_format=request_format,
            limit=max(cint(limit), 1),
        )
    )
    _apply_filename_override(
        download_payload,
        filename=str(filename or frappe.form_dict.get("filename") or "").strip(),
        export_format=request_format,
    )

    _record_export_job(
        screen=screen,
        export_format=request_format,
        filename=str(filename or frappe.form_dict.get("filename") or "").strip(),
        payload=export_payload,
        file_content=download_payload.get("filecontent"),
        file_name=download_payload.get("filename") or "",
    )

    frappe.response.update(download_payload)


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


def _audit_export_action(*, screen: str, export_format: str, filters: dict, branch: str) -> None:
    safe_filters = {str(k): str(v)[:200] for k, v in (filters or {}).items()}
    audit_admin_action(
        "api.list_exports.download_export",
        details={
            "screen": str(screen or ""),
            "format": str(export_format or ""),
            "filters": safe_filters,
            "branch": str(branch or ""),
        },
    )


def _parse_filters_from_query(query: dict | str | None) -> dict:
    if not query:
        return {}
    if isinstance(query, dict):
        return query.get("filters") or {}
    try:
        parsed = json.loads(str(query)) if isinstance(query, str) else {}
    except json.JSONDecodeError:
        return {}
    return parsed.get("filters") or {} if isinstance(parsed, dict) else {}


def _record_export_job(
    *,
    screen: str,
    export_format: str,
    filename: str,
    payload: dict,
    file_content: Any = None,
    file_name: str = "",
) -> None:
    try:
        from acentem_takipte.acentem_takipte.doctype.at_data_export_job.at_data_export_job import (
            ATDataExportJob,
        )

        applied_filters = payload.get("applied_filters") or {}
        job = ATDataExportJob.create_export_job(
            screen=str(payload.get("screen") or screen or ""),
            dataset_label=str(payload.get("title") or ""),
            export_format=export_format,
            office_branch=applied_filters.get("office_branch"),
            filters=applied_filters,
            row_count=int(payload.get("total_count") or 0),
            filename=filename,
        )
        if file_content:
            _store_export_file(
                job_name=job.name,
                filename=file_name or f"{job.name}.{export_format}",
                file_content=file_content,
            )
        if not frappe.flags.in_test:
            frappe.db.commit()
    except Exception as exc:  # pragma: no cover - best-effort audit record
        frappe.log_error(title="AT Export Job Record", message=str(exc))


def _store_export_file(*, job_name: str, filename: str, file_content: bytes) -> str:
    """Persist an export artifact as a private File attached to the export job."""
    safe_name = "".join(char if char.isalnum() or char in {".", "_", "-"} else "_" for char in str(filename or f"{job_name}.xlsx")) or f"{job_name}.xlsx"
    file_doc = frappe.get_doc(
        {
            "doctype": "File",
            "file_name": safe_name,
            "content": file_content,
            "is_private": 1,
            "folder": "Home/Attachments",
            "attached_to_doctype": "AT Data Export Job",
            "attached_to_name": job_name,
        }
    )
    file_doc.insert(ignore_permissions=True)

    job = frappe.get_doc("AT Data Export Job", job_name)
    job.file_url = file_doc.file_url
    job.downloaded_at = frappe.utils.now_datetime()
    job.save(ignore_permissions=True)
    return file_doc.file_url


@frappe.whitelist()
def list_export_jobs(limit: int = 20) -> list[dict[str, Any]]:
    assert_authenticated()
    assert_doctype_permission("AT Data Export Job", "read")

    rows = frappe.get_all(
        "AT Data Export Job",
        fields=[
            "name",
            "screen",
            "dataset_label",
            "status",
            "export_format",
            "office_branch",
            "row_count",
            "filename",
            "file_url",
            "expiry_at",
            "requested_by",
            "exported_at",
            "modified",
        ],
        order_by="modified desc",
        limit_page_length=max(cint(limit), 1),
    )
    return [
        {
            "export_job_name": row.get("name") or "",
            "screen": row.get("screen") or "",
            "dataset_label": row.get("dataset_label") or "",
            "status": row.get("status") or "",
            "export_format": row.get("export_format") or "",
            "office_branch": row.get("office_branch") or "",
            "row_count": row.get("row_count") or 0,
            "filename": row.get("filename") or "",
            "file_url": row.get("file_url") or "",
            "expiry_at": row.get("expiry_at"),
            "requested_by": row.get("requested_by") or "",
            "exported_at": row.get("exported_at"),
        }
        for row in rows
    ]


def _get_export_job_or_throw(job_name: str):
    safe_name = str(job_name or "").strip()
    if not safe_name:
        frappe.throw(_("Export job name is required."))
    if not frappe.db.exists("AT Data Export Job", safe_name):
        frappe.throw(_("Export job not found."))
    return frappe.get_doc("AT Data Export Job", safe_name)


def _assert_export_job_access(job) -> None:
    user = assert_authenticated()
    assert_doctype_permission("AT Data Export Job", "read")

    if user == "Administrator":
        return
    if user_can_access_all_office_branches(user):
        return

    current_roles = set(frappe.get_roles(user) or [])
    if current_roles.intersection(EXPORT_FILE_ADMIN_ROLES):
        return

    if str(job.get("requested_by") or "").strip() == user:
        allowed_branches = get_allowed_office_branch_names(user)
        job_branch = str(job.get("office_branch") or "").strip()
        if not job_branch or job_branch in allowed_branches:
            return

    frappe.throw(_("You are not authorized to download this export file."))


def _assert_export_job_available(job) -> None:
    expiry_at = job.get("expiry_at")
    if expiry_at:
        try:
            expired = get_datetime(expiry_at) < now_datetime()
        except Exception:
            expired = False
        if expired:
            frappe.throw(_("This export has expired and is no longer available."))

    if not str(job.get("file_url") or "").strip():
        frappe.throw(_("No export file is attached to this job."))


def _find_export_file_doc(job):
    """Resolve the private File document backing an export job, or None."""
    file_url = str(job.get("file_url") or "").strip()
    if not file_url:
        return None
    if not frappe.db.exists("File", {"file_url": file_url}):
        return None
    return frappe.get_cached_doc("File", {"file_url": file_url})


@frappe.whitelist()
def download_export_file(export_job_name: str = "") -> None:
    """Securely serve an export artifact.

    Enforces ownership / role / branch-scope authorization, rejects expired
    jobs, and serves the private File content instead of relying on a raw URL.
    """
    job = _get_export_job_or_throw(export_job_name)
    _assert_export_job_access(job)
    _assert_export_job_available(job)

    file_doc = _find_export_file_doc(job)

    if not file_doc:
        frappe.throw(_("The export file could not be found."))

    content = file_doc.get_content()
    filename = str(job.get("filename") or file_doc.get("file_name") or f"{job.name}.xlsx")
    content_type = _content_type_for_filename(filename)

    audit_admin_action(
        "api.list_exports.download_export_file",
        details={
            "export_job_name": job.name,
            "screen": str(job.get("screen") or ""),
            "branch": str(job.get("office_branch") or ""),
        },
    )

    frappe.response["filecontent"] = content
    frappe.response["filename"] = filename
    frappe.response["content_type"] = content_type
    frappe.response["type"] = "download"


_CONTENT_TYPES = {
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xls": "application/vnd.ms-excel",
    "csv": "text/csv",
    "pdf": "application/pdf",
}


def _content_type_for_filename(filename: str) -> str:
    lower = str(filename or "").strip().lower()
    for extension, content_type in _CONTENT_TYPES.items():
        if lower.endswith(f".{extension}"):
            return content_type
    return "application/octet-stream"


def cleanup_expired_export_jobs() -> dict[str, int]:
    """Delete expired export jobs and their private File artifacts.

    Idempotent: already-deleted rows/files are skipped silently. Returns counts.
    """
    now_value = now_datetime()
    expired_names = [
        row.get("name")
        for row in frappe.get_all(
            "AT Data Export Job",
            fields=["name", "expiry_at", "file_url"],
            filters=[["expiry_at", "<", now_value]],
            limit_page_length=0,
        )
        if row.get("expiry_at")
    ]

    deleted_jobs = 0
    deleted_files = 0
    for name in expired_names:
        job = frappe.get_doc("AT Data Export Job", name)
        file_url = str(job.get("file_url") or "").strip()
        if file_url:
            file_name = frappe.db.exists("File", {"file_url": file_url})
            if file_name:
                try:
                    _delete_export_doc("File", file_name)
                    deleted_files += 1
                except Exception:
                    pass
        if frappe.db.exists("AT Data Export Job", name):
            try:
                _delete_export_doc("AT Data Export Job", name)
                deleted_jobs += 1
            except Exception:
                pass

    if not frappe.flags.in_test:
        frappe.db.commit()
    return {"deleted_jobs": deleted_jobs, "deleted_files": deleted_files}


def _delete_export_doc(doctype: str, name: str) -> None:
    frappe.delete_doc(doctype, name, force=True)

