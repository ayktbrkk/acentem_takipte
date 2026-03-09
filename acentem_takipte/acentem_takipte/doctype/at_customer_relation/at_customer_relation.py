from __future__ import annotations

import frappe
from frappe.model.document import Document


VALID_RELATION_TYPES = {"Spouse", "Child", "Parent", "Sibling", "Partner", "Household", "Other"}


class ATCustomerRelation(Document):
    def validate(self):
        if not self.customer:
            frappe.throw("Customer is required")
        if not self.related_customer:
            frappe.throw("Related customer is required")
        if self.customer == self.related_customer:
            frappe.throw("Customer and related customer must be different")
        if str(self.relation_type or "") not in VALID_RELATION_TYPES:
            frappe.throw("Valid relation type is required")
