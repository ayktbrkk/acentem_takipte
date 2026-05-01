from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime


class ATActivity(Document):
    def validate(self):
        if not self.activity_at:
            self.activity_at = now_datetime()

        if self.customer and not frappe.db.exists("AT Customer", self.customer):
            frappe.throw(_("Customer not found."))
        if self.policy and not frappe.db.exists("AT Policy", self.policy):
            frappe.throw(_("Policy not found."))
        if self.claim and not frappe.db.exists("AT Claim", self.claim):
            frappe.throw(_("Claim not found."))
        if self.assigned_to and not frappe.db.exists("User", self.assigned_to):
            frappe.throw(_("Assigned user not found."))
        if self.source_doctype and self.source_name and not frappe.db.exists(self.source_doctype, self.source_name):
            frappe.throw(_("Source record not found."))
