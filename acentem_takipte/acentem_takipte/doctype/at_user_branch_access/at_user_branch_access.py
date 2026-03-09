from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document


class ATUserBranchAccess(Document):
    def autoname(self):
        user = (self.user or "").strip()
        office_branch = (self.office_branch or "").strip()
        if user and office_branch:
            self.name = f"{user}::{office_branch}"

    def validate(self):
        user = (self.user or "").strip()
        office_branch = (self.office_branch or "").strip()
        if not user or not office_branch:
            return

        if self.is_default:
            existing = frappe.db.get_value(
                "AT User Branch Access",
                {
                    "user": user,
                    "is_default": 1,
                    "name": ["!=", self.name],
                },
                "name",
            )
            if existing:
                frappe.throw(_("Only one default office branch is allowed per user."))
