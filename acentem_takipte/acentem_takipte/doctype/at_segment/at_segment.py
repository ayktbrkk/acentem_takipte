from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.model.document import Document


class ATSegment(Document):
    def validate(self):
        self.segment_name = (self.segment_name or "").strip()
        self.notes = (self.notes or "").strip() or None
        self.criteria_json = (self.criteria_json or "").strip() or None

        if self.criteria_json:
            try:
                parsed = json.loads(self.criteria_json)
            except json.JSONDecodeError as exc:
                frappe.throw(_("Criteria JSON is not valid JSON.")) from exc
            if not isinstance(parsed, (dict, list)):
                frappe.throw(_("Criteria JSON must be an object or array."))

