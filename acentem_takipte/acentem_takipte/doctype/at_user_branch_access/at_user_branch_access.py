from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, today


SCOPE_MODES = {"self_only", "self_and_descendants"}


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

        scope_mode = (self.scope_mode or "").strip() or "self_only"
        if scope_mode not in SCOPE_MODES:
            frappe.throw(_("Scope Mode must be either self_only or self_and_descendants."))
        self.scope_mode = scope_mode

        if self.valid_until and getdate(self.valid_until) < getdate(today()):
            self.is_active = 0
            self.is_default = 0

        if self.is_default and not self.is_active:
            frappe.throw(_("Default office branch access must be active."))

        if self.is_default:
            existing = frappe.db.get_value(
                "AT User Branch Access",
                {
                    "user": user,
                    "is_default": 1,
                    "is_active": 1,
                    "name": ["!=", self.name],
                },
                "name",
            )
            if existing:
                frappe.throw(_("Only one default office branch is allowed per user."))
