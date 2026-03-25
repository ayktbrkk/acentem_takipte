from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document

from acentem_takipte.acentem_takipte.services import sales_entities as sales_entity_service


class ATSalesEntity(Document):
    def validate(self):
        self.is_active = int(self.get("is_active") or 0)
        self.is_pool = int(self.get("is_pool") or 0)
        self._validate_parent_constraints()
        self._validate_pool_constraints()

    def _validate_parent_constraints(self) -> None:
        current_name = (self.name or "").strip()
        parent_name = (self.parent_entity or "").strip()
        office_branch = (self.office_branch or "").strip()

        if current_name and parent_name and current_name == parent_name:
            frappe.throw(_("A sales entity cannot be the parent of itself."))

        if not parent_name:
            return

        parent_branch = (
            frappe.db.get_value("AT Sales Entity", parent_name, "office_branch") or ""
        ).strip()
        if parent_branch and office_branch and parent_branch != office_branch:
            frappe.throw(_("Parent sales entity must belong to the same office branch."))

    def _validate_pool_constraints(self) -> None:
        if not frappe.db.has_column("AT Sales Entity", "is_pool"):
            return

        office_branch = (self.office_branch or "").strip()
        if not office_branch:
            return

        branch_is_active = sales_entity_service.is_office_branch_active(office_branch)
        existing_pool = sales_entity_service.get_pool_sales_entity_name(
            office_branch,
            include_inactive=True,
            exclude_sales_entity=self.name,
        )

        if self.is_pool and existing_pool:
            frappe.throw(_("Only one pool sales entity is allowed per office branch."))

        if self.is_pool and not self.is_active and branch_is_active:
            if not bool(getattr(frappe.flags, "at_allow_inactive_pool_transition", False)):
                frappe.throw(
                    _(
                        "Pool sales entity cannot be deactivated while its office branch is active."
                    )
                )

        if branch_is_active and not self.is_pool and not existing_pool:
            frappe.throw(
                _("Each active office branch must have exactly one pool sales entity.")
            )
