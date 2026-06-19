"""Shared helpers for WSL data-import smoke scripts."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable


def fixture_path(frappe, *parts: str) -> str:
    return frappe.get_app_path("acentem_takipte", "acentem_takipte", "tests", "fixtures", "data_import", *parts)


def ensure_smoke_reference_data() -> None:
    """Create link targets used by offer/policy import fixtures."""
    import frappe

    if not frappe.db.exists("AT Insurance Company", "IC-001"):
        frappe.get_doc(
            {
                "doctype": "AT Insurance Company",
                "company_name": "IC-001",
                "company_code": "IC001",
                "is_active": 1,
            }
        ).insert(ignore_permissions=True)

    if not frappe.db.exists("AT Branch", "BR-001"):
        frappe.get_doc(
            {
                "doctype": "AT Branch",
                "branch_name": "BR-001",
                "branch_code": "BR001",
                "insurance_company": "IC-001",
                "is_active": 1,
            }
        ).insert(ignore_permissions=True)

    if not frappe.db.get_value("AT Sales Entity", {"full_name": "SE-001"}, "name"):
        office_branch = frappe.db.get_value("AT Office Branch", {"is_active": 1}, "name")
        if not office_branch:
            office_branch = frappe.get_doc(
                {
                    "doctype": "AT Office Branch",
                    "office_branch_name": "Smoke Office",
                    "office_branch_code": "SMOKE",
                    "city": "Istanbul",
                    "is_active": 1,
                    "is_head_office": 1,
                }
            ).insert(ignore_permissions=True).name

        frappe.get_doc(
            {
                "doctype": "AT Sales Entity",
                "entity_type": "Agency",
                "full_name": "SE-001",
                "office_branch": office_branch,
            }
        ).insert(ignore_permissions=True)


def run_dataset_smoke(
    *,
    dataset: str,
    fixture_file: str,
    verify: Callable[[dict[str, Any]], bool],
    import_options: dict[str, Any] | None = None,
) -> dict[str, Any]:
    import frappe
    from frappe.utils.file_manager import save_file

    from acentem_takipte.acentem_takipte.api.data_import import (
        create_import_job_draft,
        get_import_job_status,
        preview_data_import,
    )
    from acentem_takipte.acentem_takipte.tasks import _process_data_import_job_logic

    path = fixture_path(frappe, fixture_file)
    with Path(path).open("rb") as handle:
        content = handle.read()

    file_doc = save_file(f"smoke_{dataset}.csv", content, None, None, is_private=1)
    draft = create_import_job_draft(dataset, file_name=file_doc.name)
    job_name = draft["job_name"]
    mapping = {header: header for header in draft.get("headers", [])}
    preview = preview_data_import(
        job_name,
        column_mapping=mapping,
        import_options=import_options or {"duplicate_policy": "skip"},
    )
    summary = preview.get("summary") or {}
    ready = int(summary.get("ready") or 0)
    skipped = int(summary.get("skipped") or 0)

    payload: dict[str, Any] = {
        "dataset": dataset,
        "job_name": job_name,
        "preview_summary": summary,
    }

    if ready <= 0 and skipped <= 0:
        payload["error"] = "preview has no importable rows"
        return payload

    job_doc = frappe.get_doc("AT Data Import Job", job_name)
    job_doc.status = "Queued"
    job_doc.save(ignore_permissions=True)

    previous_in_test = bool(getattr(frappe.flags, "in_test", False))
    frappe.flags.in_test = True
    try:
        result = _process_data_import_job_logic(job_name, frappe.session.user or "Administrator")
    finally:
        frappe.flags.in_test = previous_in_test
    status = get_import_job_status(job_name)
    payload.update(
        {
            "result": result,
            "final_status": status.get("status"),
        }
    )

    if status.get("status") != "Completed" or not verify(payload):
        payload["error"] = "import verification failed"
    return payload


def print_payload(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False))
