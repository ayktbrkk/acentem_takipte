from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate
from acentem_takipte.acentem_takipte.renewal.pipeline import queue_renewal_task_notification
from acentem_takipte.acentem_takipte.renewal.service import (
    assert_renewal_status_transition,
    build_task_unique_key,
    normalize_renewal_status,
    sync_renewal_outcome,
)
from acentem_takipte.acentem_takipte.utils.logging import log_redacted_error


class ATRenewalTask(Document):
    def validate(self):
        self.status = normalize_renewal_status(self.status)
        self._validate_outcome_inputs()
        if self.policy and not self.customer:
            self.customer = frappe.db.get_value("AT Policy", self.policy, "customer")

        if self.policy and not self.policy_end_date:
            self.policy_end_date = frappe.db.get_value("AT Policy", self.policy, "end_date")

        renewal_date = getdate(self.renewal_date) if self.renewal_date else None
        due_date = getdate(self.due_date) if self.due_date else None

        if due_date and renewal_date and due_date > renewal_date:
            frappe.throw(_("Due date cannot be later than renewal date."))

        if self.policy and self.due_date:
            self.unique_key = build_task_unique_key(
                policy=self.policy,
                customer=self.customer,
                renewal_date=renewal_date,
                due_date=due_date,
            )

        if not self.is_new():
            previous = self.get_doc_before_save()
            if previous:
                self.status = assert_renewal_status_transition(previous.status, self.status)

    def after_insert(self):
        try:
            queue_renewal_task_notification(self)
        except Exception:
            log_redacted_error(
                "AT Renewal Task Notification Draft Error",
                details={"renewal_task": self.name, "policy": self.policy, "customer": self.customer},
            )

    def on_update(self):
        try:
            sync_renewal_outcome(self)
        except Exception:
            log_redacted_error(
                "AT Renewal Task Outcome Sync Error",
                details={"renewal_task": self.name, "policy": self.policy, "customer": self.customer},
            )

    def _validate_outcome_inputs(self):
        self.lost_reason_code = str(getattr(self, "lost_reason_code", "") or "").strip() or None
        self.competitor_name = str(getattr(self, "competitor_name", "") or "").strip() or None

        if self.status != "Cancelled":
            self.lost_reason_code = None
            self.competitor_name = None
            return

        if self.competitor_name and not self.lost_reason_code:
            self.lost_reason_code = "Competitor"

        if self.lost_reason_code == "Competitor" and not self.competitor_name:
            frappe.throw(_("Competitor name is required when lost reason is competitor."))
