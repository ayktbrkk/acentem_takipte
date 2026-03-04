from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate
from acentem_takipte.notifications import create_notification_drafts
from acentem_takipte.tasks import build_renewal_key


class ATRenewalTask(Document):
    def validate(self):
        if self.policy and not self.customer:
            self.customer = frappe.db.get_value("AT Policy", self.policy, "customer")

        if self.policy and not self.policy_end_date:
            self.policy_end_date = frappe.db.get_value("AT Policy", self.policy, "end_date")

        renewal_date = getdate(self.renewal_date) if self.renewal_date else None
        due_date = getdate(self.due_date) if self.due_date else None

        if due_date and renewal_date and due_date > renewal_date:
            frappe.throw(_("Due date cannot be later than renewal date."))

        if self.policy and self.due_date:
            self.unique_key = build_renewal_key(self.policy, self.due_date)

    def after_insert(self):
        try:
            create_notification_drafts(
                event_key="renewal_due",
                reference_doctype=self.doctype,
                reference_name=self.name,
                customer=self.customer,
                context={
                    "policy": self.policy,
                    "policy_end_date": self.policy_end_date,
                    "renewal_date": self.renewal_date,
                    "due_date": self.due_date,
                },
            )
        except Exception:
            frappe.log_error(frappe.get_traceback(), "AT Renewal Task Notification Draft Error")
