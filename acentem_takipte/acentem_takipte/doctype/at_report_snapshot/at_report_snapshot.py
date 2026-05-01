from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, getdate


class ATReportSnapshot(Document):
    def validate(self):
        if not self.report_key:
            frappe.throw(_("Report key is required"))
        if not self.snapshot_date:
            frappe.throw(_("Snapshot date is required"))
        if not str(self.scope_hash or "").strip():
            frappe.throw(_("Scope hash is required"))

        self.snapshot_date = getdate(self.snapshot_date)
        self.row_count = max(cint(self.row_count), 0)
        self.filters_json = _normalize_json_object(self.filters_json)
        self.columns_json = _normalize_json_array(self.columns_json)
        self.rows_json = _normalize_json_array_of_objects(self.rows_json)
        self.source_version = str(self.source_version or "v1").strip() or "v1"
        self.generated_by = str(self.generated_by or "").strip() or None
        self.notes = str(self.notes or "").strip() or None


def _normalize_json_array(value) -> str:
    parsed = _parse_json(value)
    if not isinstance(parsed, list):
        parsed = []
    return json.dumps(parsed, ensure_ascii=False)


def _normalize_json_array_of_objects(value) -> str:
    parsed = _parse_json(value)
    if not isinstance(parsed, list):
        parsed = []
    normalized = [item for item in parsed if isinstance(item, dict)]
    return json.dumps(normalized, ensure_ascii=False)


def _normalize_json_object(value) -> str:
    parsed = _parse_json(value)
    if not isinstance(parsed, dict):
        parsed = {}
    return json.dumps(parsed, ensure_ascii=False)


def _parse_json(value):
    if isinstance(value, str):
        try:
            return frappe.parse_json(value)
        except Exception:
            return []
    return value
