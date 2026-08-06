from __future__ import annotations

import json
from typing import Any

import frappe
from frappe.model.document import Document
from frappe.utils import add_to_date, now_datetime

EXPORT_FILE_RETENTION_DAYS = 7


class ATDataExportJob(Document):
    def autoname(self):
        self.name = frappe.model.naming.make_autoname("AT-EXP-.YYYY.-.######")

    def validate(self):
        for field in ("filters_json",):
            value = self.get(field)
            if value and isinstance(value, str):
                try:
                    json.loads(value)
                except json.JSONDecodeError:
                    frappe.throw(frappe._("Invalid JSON in {0}.").format(frappe.bold(self.meta.get_field(field).label or field)))

    @staticmethod
    def create_export_job(
        *,
        screen: str,
        dataset_label: str,
        export_format: str,
        office_branch: str | None,
        filters: dict[str, Any],
        row_count: int,
        filename: str,
        file_url: str = "",
        user: str | None = None,
    ) -> "ATDataExportJob":
        job = frappe.get_doc(
            {
                "doctype": "AT Data Export Job",
                "screen": str(screen or "").strip(),
                "dataset_label": str(dataset_label or "").strip(),
                "status": "Completed",
                "export_format": str(export_format or "xlsx").strip().lower(),
                "office_branch": office_branch or None,
                "filters_json": json.dumps(filters or {}, ensure_ascii=False),
                "row_count": int(row_count or 0),
                "filename": str(filename or "").strip(),
                "file_url": str(file_url or "").strip(),
                "expiry_at": add_to_date(now_datetime(), days=EXPORT_FILE_RETENTION_DAYS),
                "requested_by": user or frappe.session.user,
                "exported_at": now_datetime(),
            }
        )
        job.insert(ignore_permissions=True)
        return job

    @staticmethod
    def mark_failed(job_name: str, message: str) -> None:
        job = frappe.get_doc("AT Data Export Job", job_name)
        job.status = "Failed"
        job.error_message = str(message or "")[:500]
        job.finished_at = now_datetime()
        job.save(ignore_permissions=True)
