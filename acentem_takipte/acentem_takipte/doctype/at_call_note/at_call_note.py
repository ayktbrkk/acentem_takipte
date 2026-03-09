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
