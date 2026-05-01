from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
# audit(f401): `nowdate` is no longer needed after completion timestamps moved to
# `now_datetime()` so tasks keep time-of-day precision.
from frappe.utils import get_datetime, getdate, now_datetime


VALID_TASK_TYPES = {"Follow-up", "Visit", "Call", "Collection", "Claim", "Renewal", "Review", "Other"}
VALID_SOURCE_DOCTYPES = {"AT Customer", "AT Policy", "AT Claim", "AT Renewal Task", "AT Campaign", "AT Ownership Assignment", "AT Call Note"}
VALID_STATUSES = {"Open", "In Progress", "Blocked", "Done", "Cancelled"}
VALID_PRIORITIES = {"Low", "Normal", "High", "Critical"}


class ATTask(Document):
    def validate(self):
        if not (self.task_title or "").strip():
            frappe.throw(_("Task title is required"))
        if self.task_type not in VALID_TASK_TYPES:
            frappe.throw(_("Valid task type is required"))
        if not self.assigned_to:
            frappe.throw(_("Assigned user is required"))
        if self.status not in VALID_STATUSES:
            frappe.throw(_("Valid task status is required"))
        if self.priority not in VALID_PRIORITIES:
            frappe.throw(_("Valid priority is required"))
        if self.source_doctype and self.source_doctype not in VALID_SOURCE_DOCTYPES:
            frappe.throw(_("Valid source doctype is required"))
        if self.source_name and not self.source_doctype:
            frappe.throw(_("Source doctype is required when source name is set"))
        if self.source_doctype and not self.source_name:
            frappe.throw(_("Source name is required when source doctype is set"))
        if self.due_date and self.reminder_at and get_datetime(self.reminder_at).date() > getdate(self.due_date):
            frappe.throw(_("Reminder time must be on or before due date"))

        self._backfill_from_source()
        self._sync_completion_timestamp()
        if not self.customer and not self.policy and not self.claim and not self.source_name:
            frappe.throw(_("Task must be linked to a source, customer, policy or claim"))

    def _backfill_from_source(self):
        if self.source_doctype and self.source_name and not frappe.db.exists(self.source_doctype, self.source_name):
            frappe.throw(_("Linked source record was not found"))

        if self.source_doctype == "AT Customer" and self.source_name and not self.customer:
            self.customer = self.source_name
        elif self.source_doctype == "AT Policy" and self.source_name:
            if not self.policy:
                self.policy = self.source_name
            if not self.customer:
                self.customer = frappe.db.get_value("AT Policy", self.source_name, "customer")
        elif self.source_doctype == "AT Claim" and self.source_name:
            claim_row = frappe.db.get_value("AT Claim", self.source_name, ["customer", "policy", "office_branch"], as_dict=True) or {}
            if not self.claim:
                self.claim = self.source_name
            if not self.customer:
                self.customer = claim_row.get("customer")
            if not self.policy:
                self.policy = claim_row.get("policy")
            if not self.office_branch:
                self.office_branch = claim_row.get("office_branch")

        if not self.office_branch and self.policy:
            self.office_branch = frappe.db.get_value("AT Policy", self.policy, "office_branch")
        if not self.office_branch and self.customer:
            self.office_branch = frappe.db.get_value("AT Customer", self.customer, "office_branch")

    def _sync_completion_timestamp(self):
        if self.status == "Done" and not self.completed_on:
            self.completed_on = now_datetime()
        elif self.status != "Done":
            self.completed_on = None

