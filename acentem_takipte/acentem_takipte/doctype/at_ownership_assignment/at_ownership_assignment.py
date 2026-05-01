from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, nowdate


VALID_SOURCE_DOCTYPES = {"AT Customer", "AT Policy", "AT Claim", "AT Renewal Task", "AT Campaign"}
VALID_ASSIGNMENT_ROLES = {"Owner", "Assignee", "Reviewer", "Follower"}
VALID_STATUSES = {"Open", "In Progress", "Blocked", "Done", "Cancelled"}
VALID_PRIORITIES = {"Low", "Normal", "High", "Critical"}


class ATOwnershipAssignment(Document):
    def validate(self):
        if not self.assigned_to:
            frappe.throw(_("Assigned user is required"))
        if self.source_doctype and self.source_doctype not in VALID_SOURCE_DOCTYPES:
            frappe.throw(_("Valid source doctype is required"))
        if self.source_name and not self.source_doctype:
            frappe.throw(_("Source doctype is required when source name is set"))
        if self.source_doctype and not self.source_name:
            frappe.throw(_("Source name is required when source doctype is set"))
        if self.assignment_role not in VALID_ASSIGNMENT_ROLES:
            frappe.throw(_("Valid assignment role is required"))
        if self.status not in VALID_STATUSES:
            frappe.throw(_("Valid assignment status is required"))
        if self.priority not in VALID_PRIORITIES:
            frappe.throw(_("Valid priority is required"))
        if self.due_date and getdate(self.due_date) < getdate(nowdate()) and self.status in {"Open", "In Progress"}:
            self.add_comment("Comment", "Assignment due date is in the past.")

        self._backfill_from_source()
        if not self.customer and not self.policy and not self.source_name:
            frappe.throw(_("Assignment must be linked to a source, customer or policy"))

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
