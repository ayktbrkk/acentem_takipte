from __future__ import annotations

import re

import frappe
from frappe import _
from frappe.model.document import Document


class ATOfficeBranch(Document):
    def validate(self):
        self.office_branch_name = (self.office_branch_name or "").strip()
        self.office_branch_code = (self.office_branch_code or "").strip().upper()

        if not self.office_branch_name:
            frappe.throw(_("Office Branch Name is required."))

        if not self.office_branch_code:
            self.office_branch_code = _generate_office_branch_code(self.office_branch_name)

        if not re.fullmatch(r"[A-Z0-9_-]{2,12}", self.office_branch_code or ""):
            frappe.throw(_("Office Branch Code must be 2-12 chars and contain only A-Z, 0-9, '_' or '-'."))

        duplicate_code = frappe.db.exists(
            "AT Office Branch",
            {"office_branch_code": self.office_branch_code, "name": ["!=", self.name]},
        )
        if duplicate_code:
            frappe.throw(_("Office Branch Code must be unique."))

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

    def on_update(self):
        if self.has_value_changed("is_active"):
            self._validate_active_state_transition()

    def _validate_active_state_transition(self) -> None:
        if self.is_active:
            parent = (self.parent_office_branch or "").strip()
            if parent and not frappe.db.get_value("AT Office Branch", parent, "is_active"):
                frappe.throw(
                    _("Cannot activate branch '{0}' because its parent branch '{1}' is inactive.")
                    .format(self.office_branch_name, parent)
                )
            return

        child_branches = frappe.get_all(
            "AT Office Branch",
            filters={"parent_office_branch": self.name, "is_active": 1},
            fields=["office_branch_name"],
            limit_page_length=1,
        )
        if child_branches:
            frappe.throw(
                _("Cannot deactivate branch '{0}' because it has active child branches (e.g. {1}). "
                  "Deactivate the child branches first.")
                .format(self.office_branch_name, child_branches[0]["office_branch_name"])
            )

        active_entities = frappe.get_all(
            "AT Sales Entity",
            filters={"office_branch": self.name, "is_active": 1},
            fields=["full_name"],
            limit_page_length=1,
        )
        if active_entities:
            frappe.throw(
                _("Cannot deactivate branch '{0}' because it has active sales entities (e.g. {1}). "
                  "Deactivate the sales entities first.")
                .format(self.office_branch_name, active_entities[0]["full_name"])
            )

    def on_trash(self):
        if self.docstatus == 2:
            return

        references = []
        pairs = [
            ("AT Sales Entity", "office_branch"),
            ("AT Policy", "office_branch"),
            ("AT Offer", "office_branch"),
            ("AT Payment", "office_branch"),
            ("AT Claim", "office_branch"),
            ("AT Customer", "office_branch"),
        ]
        for dt, field in pairs:
            if frappe.db.has_column(dt, field):
                ref = frappe.db.get_value(dt, {field: self.name}, "name")
                if ref:
                    references.append(f"{dt} {ref}")

        if references:
            frappe.throw(
                _("Cannot delete office branch '{0}' because it is referenced by: {1}")
                .format(self.office_branch_name, ", ".join(references))
            )


def _generate_office_branch_code(branch_name: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9]+", "", branch_name.upper())
    return (normalized[:12] or "OB")
