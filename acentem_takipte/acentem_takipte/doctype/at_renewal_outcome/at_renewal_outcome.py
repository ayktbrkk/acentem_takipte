from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime


class ATRenewalOutcome(Document):
    def validate(self):
        if self.renewal_task and not frappe.db.exists("AT Renewal Task", self.renewal_task):
            frappe.throw(_("Renewal Task not found."))
        if self.policy and not frappe.db.exists("AT Policy", self.policy):
            frappe.throw(_("Policy not found."))
        if self.customer and not frappe.db.exists("AT Customer", self.customer):
            frappe.throw(_("Customer not found."))

        status = str(self.outcome_status or "").strip()
        if status not in {"Renewed", "Lost", "Cancelled"}:
            frappe.throw(_("Unsupported renewal outcome status: {0}").format(status or "-"))
        self.outcome_status = status

        if self.outcome_status == "Lost" and not str(self.lost_reason_code or "").strip():
            frappe.throw(_("Lost renewal outcomes require a lost reason code."))

    def before_insert(self):
        if not self.recorded_on:
            self.recorded_on = now_datetime()
        if not self.recorded_by:
            self.recorded_by = frappe.session.user
