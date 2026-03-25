from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, today


SCOPE_MODES = {"self_only", "self_and_descendants"}


class ATUserSalesEntityAccess(Document):
    def autoname(self):
        user = (self.user or "").strip()
        sales_entity = (self.sales_entity or "").strip()
        if user and sales_entity:
            self.name = f"{user}::{sales_entity}"

    def validate(self):
        user = (self.user or "").strip()
        sales_entity = (self.sales_entity or "").strip()
        if not user or not sales_entity:
            return

        scope_mode = (self.scope_mode or "").strip() or "self_only"
        if scope_mode not in SCOPE_MODES:
            frappe.throw(_("Scope Mode must be either self_only or self_and_descendants."))
        self.scope_mode = scope_mode

        if self.valid_until and getdate(self.valid_until) < getdate(today()):
            self.is_active = 0
            self.is_default = 0

        if self.is_default and not self.is_active:
            frappe.throw(_("Default sales entity access must be active."))

        if self.is_default:
            existing = frappe.db.get_value(
                "AT User Sales Entity Access",
                {
                    "user": user,
                    "is_default": 1,
                    "is_active": 1,
                    "name": ["!=", self.name],
                },
                "name",
            )
            if existing:
                frappe.throw(_("Only one default sales entity access is allowed per user."))
