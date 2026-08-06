from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_datetime, now_datetime


class ATCampaign(Document):
    def validate(self):
        self.campaign_name = (self.campaign_name or "").strip()
        self.notes = (self.notes or "").strip() or None

        previous_status = None
        if self.get_doc_before_save():
            previous_status = self.get_doc_before_save().get("status")
        if previous_status in {"Completed", "Cancelled"} and self.status not in {"Completed", "Cancelled"}:
            frappe.throw(_("A completed or cancelled campaign cannot be reopened"))

        if self.status in {"Planned", "Running"} and not self.scheduled_for:
            frappe.throw(_("Scheduled For is required for planned or running campaigns."))

        if self.scheduled_for and get_datetime(self.scheduled_for) < now_datetime() and self.status == "Planned":
            frappe.throw(_("Scheduled For cannot be in the past for planned campaigns."))
