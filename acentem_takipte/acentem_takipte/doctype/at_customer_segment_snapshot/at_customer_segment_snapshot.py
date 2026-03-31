from __future__ import annotations

import json

import frappe
from frappe.model.document import Document
from frappe.utils import getdate


class ATCustomerSegmentSnapshot(Document):
    def validate(self):
        if not self.customer:
            frappe.throw(_("Customer is required"))
        if not self.snapshot_date:
            frappe.throw(_("Snapshot date is required"))

        self.snapshot_date = getdate(self.snapshot_date)
        self.score = max(0, min(100, int(self.score or 0)))

        self.strengths_json = _normalize_json_array(self.strengths_json)
        self.risks_json = _normalize_json_array(self.risks_json)
        self.score_reason_json = _normalize_json_object(self.score_reason_json)


def _normalize_json_array(value) -> str:
    if isinstance(value, str):
        try:
            parsed = frappe.parse_json(value)
        except Exception:
            parsed = []
    else:
        parsed = value
    if not isinstance(parsed, list):
        parsed = []
    return json.dumps(parsed, ensure_ascii=False)


def _normalize_json_object(value) -> str:
    if isinstance(value, str):
        try:
            parsed = frappe.parse_json(value)
        except Exception:
            parsed = {}
    else:
        parsed = value
    if not isinstance(parsed, dict):
        parsed = {}
    return json.dumps(parsed, ensure_ascii=False)

