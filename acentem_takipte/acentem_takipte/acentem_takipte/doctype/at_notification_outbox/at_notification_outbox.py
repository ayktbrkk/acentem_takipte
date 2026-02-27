from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, now_datetime


class ATNotificationOutbox(Document):
    def validate(self):
        self.channel = (self.channel or "").strip() or "SMS"
        self.recipient = (self.recipient or "").strip()
        if not self.recipient:
            frappe.throw(_("Recipient is required."))

        self.max_attempts = max(cint(self.max_attempts), 1)
        self.attempt_count = max(cint(self.attempt_count), 0)
        self.priority = max(cint(self.priority), 0)

        if self.status in {"Queued", "Failed"} and not self.next_retry_on:
            self.next_retry_on = now_datetime()

