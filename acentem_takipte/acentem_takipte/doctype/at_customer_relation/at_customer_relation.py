from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document


VALID_RELATION_TYPES = {"Spouse", "Child", "Parent", "Sibling", "Partner", "Household", "Other"}


class ATCustomerRelation(Document):
    def validate(self):
        if not self.customer:
            frappe.throw(_("Customer is required"))
        if not self.related_customer:
            frappe.throw(_("Related customer is required"))
        if self.customer == self.related_customer:
            frappe.throw(_("Customer and related customer must be different"))
        if str(self.relation_type or "") not in VALID_RELATION_TYPES:
            frappe.throw(_("Valid relation type is required"))
