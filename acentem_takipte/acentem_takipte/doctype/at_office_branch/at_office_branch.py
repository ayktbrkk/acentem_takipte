from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document


class ATOfficeBranch(Document):
    def validate(self):
        self._validate_head_office_rules()
        self._validate_parent_constraints()
        self._validate_cycle()

    def _validate_head_office_rules(self) -> None:
        if not int(self.get("is_head_office") or 0):
            return

        existing = frappe.db.get_value(
            "AT Office Branch",
            {
                "is_head_office": 1,
                "name": ["!=", self.name],
            },
            "name",
        )
        if existing:
            frappe.throw(_("Only one head office branch is allowed."))

        if self.parent_office_branch:
            frappe.throw(_("Head office branch cannot have a parent office branch."))

    def _validate_parent_constraints(self) -> None:
        current_name = (self.name or self.office_branch_name or "").strip()
        parent_name = (self.parent_office_branch or "").strip()

        if not int(self.get("is_head_office") or 0):
            existing_head = frappe.db.get_value(
                "AT Office Branch",
                {
                    "is_head_office": 1,
                    "name": ["!=", self.name],
                },
                "name",
            )
            if existing_head and not parent_name:
                frappe.throw(_("Non-head office branches must reference a parent office branch."))

        if current_name and parent_name and current_name == parent_name:
            frappe.throw(_("A branch cannot be the parent of itself."))

    def _validate_cycle(self) -> None:
        current_name = (self.name or self.office_branch_name or "").strip()
        parent_name = (self.parent_office_branch or "").strip()
        if not current_name or not parent_name:
            return

        visited = {current_name}
        cursor = parent_name
        while cursor:
            if cursor in visited:
                frappe.throw(_("Branch hierarchy cannot contain cycles."))
            visited.add(cursor)
            cursor = (
                frappe.db.get_value("AT Office Branch", cursor, "parent_office_branch") or ""
            ).strip()
