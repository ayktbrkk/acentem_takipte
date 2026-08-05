from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_datetime, now_datetime


class ATReminder(Document):
    def validate(self):
        if self.source_doctype and self.source_name and not frappe.db.exists(self.source_doctype, self.source_name):
            frappe.throw(_("Linked source record was not found"))

        if self.remind_at:
            self.remind_at = get_datetime(self.remind_at)

        previous_status = None
        if self.get_doc_before_save():
            previous_status = self.get_doc_before_save().get("status")

        if previous_status in {"Done", "Cancelled"} and self.status == "Open":
            frappe.throw(_("A completed reminder cannot be reopened"))

        if self.status in {"Done", "Cancelled"} and not self.completed_on:
            self.completed_on = now_datetime()
        elif self.status == "Open":
            self.completed_on = None
