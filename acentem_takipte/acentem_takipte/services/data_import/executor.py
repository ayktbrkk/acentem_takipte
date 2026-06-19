from __future__ import annotations

import csv
import io
from typing import Any

import frappe
from frappe import _

from acentem_takipte.acentem_takipte.services.data_import.preview import build_import_rows_for_job
from acentem_takipte.acentem_takipte.services.data_import.registry import (
    BATCH_COMMIT_SIZE,
    assert_dataset_supported,
)


def execute_data_import_job(job_name: str) -> dict[str, Any]:
    job = frappe.get_doc("AT Data Import Job", job_name)
    assert_dataset_supported(job.dataset, for_execute=True)

    if job.status not in {"Queued", "Running"}:
        frappe.throw(_("Import job is not queued for execution."))

    job.mark_running()
    frappe.flags.in_import = True

    created = 0
    skipped = 0
    failed = 0
    error_rows: list[dict[str, Any]] = []

    try:
        import_rows = build_import_rows_for_job(job.name)
        inserters = {
            "customers": _insert_customer_row,
            "offers": _insert_offer_row,
            "policies": _insert_policy_row,
        }
        insert_row = inserters.get(job.dataset)
        if not insert_row:
            frappe.throw(_("Dataset is not supported yet: {0}").format(job.dataset))

        for row in import_rows:
            status = str(row.get("row_status") or "")
            if status == "skipped":
                skipped += 1
                continue
            if status != "ready":
                if status == "error":
                    failed += 1
                    error_rows.append(_error_row_from_preview(row, row.get("error_message"), job.dataset))
                continue

            try:
                insert_row(row)
                created += 1
            except Exception as exc:
                failed += 1
                error_rows.append(_error_row_from_preview(row, str(exc), job.dataset))

            if (created + skipped + failed) % BATCH_COMMIT_SIZE == 0 and not frappe.flags.in_test:
                frappe.db.commit()

        error_file_url = _write_error_log(job.name, error_rows, job.dataset)
        result_summary = {
            "created": created,
            "skipped": skipped,
            "failed": failed,
            "total_rows": created + skipped + failed,
        }
        if error_file_url:
            job.error_log_file = error_file_url
        job.mark_completed(result_summary)
        if not frappe.flags.in_test:
            frappe.db.commit()
        return result_summary
    except Exception as exc:
        job.mark_failed(str(exc))
        if not frappe.flags.in_test:
            frappe.db.commit()
        raise
    finally:
        frappe.flags.in_import = False


def _insert_customer_row(row: dict[str, Any]) -> str:
    values = row.get("values") or {}
    office_branch = row.get("office_branch")
    customer_doc = frappe.get_doc(
        {
            "doctype": "AT Customer",
            "full_name": values.get("full_name"),
            "tax_id": values.get("tax_id"),
            "customer_type": values.get("customer_type") or "Individual",
            "phone": values.get("phone"),
            "email": values.get("email"),
            "office_branch": office_branch,
            "origin_office_branch": office_branch,
            "current_office_branch": office_branch,
        }
    )
    customer_doc.insert(ignore_permissions=True)
    return customer_doc.name


def _insert_offer_row(row: dict[str, Any]) -> str:
    values = row.get("values") or {}
    office_branch = row.get("office_branch")
    offer_doc = frappe.get_doc(
        {
            "doctype": "AT Offer",
            **values,
            "office_branch": office_branch,
            "origin_office_branch": office_branch,
            "current_office_branch": office_branch,
        }
    )
    offer_doc.insert(ignore_permissions=True)
    return offer_doc.name


def _insert_policy_row(row: dict[str, Any]) -> str:
    values = row.get("values") or {}
    office_branch = row.get("office_branch")
    policy_doc = frappe.get_doc(
        {
            "doctype": "AT Policy",
            **values,
            "office_branch": office_branch,
            "origin_office_branch": office_branch,
            "current_office_branch": office_branch,
        }
    )
    policy_doc.insert(ignore_permissions=True)
    return policy_doc.name


def _error_row_from_preview(row: dict[str, Any], message: Any, dataset: str) -> dict[str, Any]:
    values = row.get("values") or {}
    payload = {
        "row_number": row.get("row_number"),
        "message": str(message or "").strip(),
    }
    if dataset == "customers":
        payload.update({"tax_id": values.get("tax_id"), "full_name": values.get("full_name")})
    elif dataset == "offers":
        payload.update(
            {
                "customer": values.get("customer"),
                "insurance_company": values.get("insurance_company"),
                "offer_date": values.get("offer_date"),
            }
        )
    else:
        payload.update(
            {
                "policy_no": values.get("policy_no"),
                "insurance_company": values.get("insurance_company"),
                "customer": values.get("customer"),
            }
        )
    return payload


def _write_error_log(job_name: str, error_rows: list[dict[str, Any]], dataset: str) -> str | None:
    if not error_rows:
        return None

    fieldnames = list(error_rows[0].keys())
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for row in error_rows:
        writer.writerow(row)

    file_doc = frappe.get_doc(
        {
            "doctype": "File",
            "file_name": f"{job_name}-{dataset}-errors.csv",
            "content": buffer.getvalue(),
            "is_private": 1,
            "folder": "Home/Attachments",
        }
    )
    file_doc.insert(ignore_permissions=True)
    return file_doc.file_url
