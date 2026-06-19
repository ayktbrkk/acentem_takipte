from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.naming import make_autoname
from frappe.utils import now_datetime


class ATDataImportJob(Document):
    def autoname(self):
        if self.name:
            return
        self.name = make_autoname("AT-IMP-.YYYY.-.######")

    def validate(self):
        self.requested_by = self.requested_by or frappe.session.user
        self._validate_json_field("column_mapping")
        self._validate_json_field("import_options")
        self._validate_json_field("preview_summary")
        self._validate_json_field("result_summary")

    def _validate_json_field(self, fieldname: str) -> None:
        raw = getattr(self, fieldname, None)
        if not raw:
            setattr(self, fieldname, None)
            return
        if isinstance(raw, dict):
            setattr(self, fieldname, json.dumps(raw, ensure_ascii=False))
            return
        try:
            json.loads(str(raw))
        except json.JSONDecodeError:
            frappe.throw(_("{0} must be valid JSON.").format(fieldname))

    def mark_running(self) -> None:
        self.status = "Running"
        self.started_at = self.started_at or now_datetime()
        self.save(ignore_permissions=True)

    def mark_completed(self, result_summary: dict) -> None:
        self.status = "Completed"
        self.result_summary = json.dumps(result_summary, ensure_ascii=False)
        self.finished_at = now_datetime()
        self.save(ignore_permissions=True)

    def mark_failed(self, message: str) -> None:
        self.status = "Failed"
        self.result_summary = json.dumps({"error": message}, ensure_ascii=False)
        self.finished_at = now_datetime()
        self.save(ignore_permissions=True)
