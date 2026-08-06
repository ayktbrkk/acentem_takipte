from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_datetime, getdate


class ATCallNote(Document):
    def validate(self):
        if self.policy and not self.customer:
            self.customer = frappe.db.get_value("AT Policy", self.policy, "customer")

        if self.claim and not self.customer:
            self.customer = frappe.db.get_value("AT Claim", self.claim, "customer")

        if self.next_follow_up_on and self.note_at:
            if getdate(self.next_follow_up_on) < getdate(get_datetime(self.note_at)):
                frappe.throw(_("Next follow up date cannot be earlier than note date."))

        self._autoset_office_branch()

    def _autoset_office_branch(self):
        if not self.office_branch:
            if self.claim:
                self.office_branch = frappe.db.get_value("AT Claim", self.claim, "office_branch")
            if not self.office_branch and self.policy:
                self.office_branch = frappe.db.get_value("AT Policy", self.policy, "office_branch")
            if not self.office_branch and self.customer:
                self.office_branch = frappe.db.get_value("AT Customer", self.customer, "office_branch")

        if not self.origin_office_branch:
            self.origin_office_branch = self.office_branch

        if not self.current_office_branch:
            self.current_office_branch = self.office_branch
