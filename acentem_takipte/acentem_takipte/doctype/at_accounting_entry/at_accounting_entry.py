from __future__ import annotations

import frappe
from frappe.model.document import Document
from frappe.utils import flt
from acentem_takipte.acentem_takipte.utils.statuses import ATAccountingEntryStatus

RECONCILIATION_TOLERANCE = 0.01


class ATAccountingEntry(Document):
    def validate(self):
        self._ensure_dimensions_consistency()

        local_try = flt(self.local_amount_try)
        external_try = flt(self.external_amount_try)
        difference = external_try - local_try

        self.difference_try = difference
        self.needs_reconciliation = (
            1
            if abs(difference) > RECONCILIATION_TOLERANCE or self.status == ATAccountingEntryStatus.FAILED
            else 0
        )

    def _ensure_dimensions_consistency(self):
        policy_name = str(self.policy or "").strip()
        customer_name = str(self.customer or "").strip()
        sales_entity_name = str(self.sales_entity or "").strip()

        if policy_name:
            policy_row = frappe.db.get_value(
                "AT Policy",
                policy_name,
                ["customer", "office_branch", "sales_entity"],
                as_dict=True,
            )
            if policy_row:
                if not customer_name and policy_row.get("customer"):
                    self.customer = policy_row.get("customer")
                    customer_name = str(self.customer or "").strip()
                if not str(self.office_branch or "").strip() and policy_row.get("office_branch"):
                    self.office_branch = policy_row.get("office_branch")
                if not sales_entity_name and policy_row.get("sales_entity"):
                    self.sales_entity = policy_row.get("sales_entity")
                    sales_entity_name = str(self.sales_entity or "").strip()

                if customer_name and policy_row.get("customer") and customer_name != str(policy_row.get("customer") or "").strip():
                    frappe.throw(frappe._("Customer must match selected Policy"))

        if customer_name and not str(self.office_branch or "").strip():
            customer_branch = frappe.db.get_value("AT Customer", customer_name, "office_branch")
            if customer_branch:
                self.office_branch = customer_branch

        if sales_entity_name:
            entity_branch = frappe.db.get_value("AT Sales Entity", sales_entity_name, "office_branch")
            if entity_branch and not str(self.office_branch or "").strip():
                self.office_branch = entity_branch

            if entity_branch and str(self.office_branch or "").strip() and str(entity_branch).strip() != str(self.office_branch).strip():
                frappe.throw(frappe._("Sales Entity must belong to the selected Office Branch"))

