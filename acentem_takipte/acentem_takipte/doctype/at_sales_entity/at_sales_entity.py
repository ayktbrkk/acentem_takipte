from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt

import acentem_takipte.acentem_takipte.platform.permissions.sales_entities as sales_entity_service


class ATSalesEntity(Document):
    def validate(self):
        self.is_active = int(self.get("is_active") or 0)
        self.is_pool = int(self.get("is_pool") or 0)
        self.is_root = int(self.get("is_root") or 0)
        self._validate_commission_share_pct()
        self._validate_root_constraints()
        self._validate_parent_constraints()
        self._validate_pool_constraints()

    def _validate_commission_share_pct(self) -> None:
        share_pct = flt(self.get("commission_share_pct") if self.get("commission_share_pct") is not None else 100)
        if share_pct < 0 or share_pct > 100:
            frappe.throw(_("Commission Share % must be between 0 and 100."))
        self.commission_share_pct = share_pct
        self._validate_share_pct_total()

    def _validate_share_pct_total(self) -> None:
        """Validate that total share_pct of all entities in the hierarchy <= 100%.

        Root entity's share_pct is not counted (it gets the remainder).
        Only siblings under the same parent are checked.
        """
        if self.is_root:
            return

        parent_name = (self.parent_entity or "").strip()
        office_branch = (self.office_branch or "").strip()

        if not parent_name and not office_branch:
            return

        # Get all siblings (entities with same parent, or all non-root in branch)
        filters = {"is_root": 0, "is_active": 1}
        if parent_name:
            filters["parent_entity"] = parent_name
        elif office_branch:
            filters["office_branch"] = office_branch
            filters["parent_entity"] = ["is", "set"]

        siblings = frappe.get_all(
            "AT Sales Entity",
            filters=filters,
            fields=["name", "commission_share_pct"],
            limit_page_length=0,
        )

        total_pct = sum(flt(s.get("commission_share_pct") or 0) for s in siblings)

        if total_pct > 100:
            frappe.throw(
                _("Total commission share of all entities under the same parent exceeds 100% ({0}%). "
                  "Please adjust the share percentages.").format(round(total_pct, 2))
            )
        self._validate_share_pct_total()

    def _validate_root_constraints(self) -> None:
        office_branch = (self.office_branch or "").strip()
        if not office_branch:
            if self.is_root:
                frappe.throw(_("Root entity must have an office branch."))
            return
        parent_name = (self.parent_entity or "").strip()
        if self.is_root and parent_name:
            frappe.throw(_("Root entity cannot have a parent entity."))
        existing_root = frappe.db.get_value(
            "AT Sales Entity",
            {"office_branch": office_branch, "is_root": 1, "name": ["!=", self.name or ""]},
            "name",
        )
        if self.is_root and existing_root:
            frappe.throw(_("Only one root sales entity is allowed per office branch. Existing root: {0}").format(existing_root))
        if not self.is_root and not existing_root and not frappe.flags.at_allow_rootless_branch:
            if not frappe.db.get_value("AT Sales Entity", {"office_branch": office_branch, "is_root": 1}, "name"):
                frappe.throw(_("Each office branch must have a root sales entity. Create the root entity first."))

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
