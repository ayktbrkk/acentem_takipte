from __future__ import annotations

import frappe
from frappe.model.document import Document
from frappe.utils import flt, now_datetime


class ATReconciliationItem(Document):
    def validate(self):
        if self.accounting_entry and not self.source_doctype:
            self.source_doctype = frappe.db.get_value("AT Accounting Entry", self.accounting_entry, "source_doctype")
        if self.accounting_entry and not self.source_name:
            self.source_name = frappe.db.get_value("AT Accounting Entry", self.accounting_entry, "source_name")

        if self.accounting_entry and self.mismatch_type and not self.unique_key:
            self.unique_key = f"{self.accounting_entry}::{self.mismatch_type}"

        self.difference_try = flt(self.external_amount_try) - flt(self.local_amount_try)

        if self.status in {"Resolved", "Ignored"}:
            if not self.resolved_by:
                self.resolved_by = frappe.session.user
            if not self.resolved_on:
                self.resolved_on = now_datetime()
            if self.status == "Ignored" and not self.resolution_action:
                self.resolution_action = "Ignored"
            if self.status == "Resolved" and not self.resolution_action:
                self.resolution_action = "Matched"
        else:
            self.resolved_by = None
            self.resolved_on = None

