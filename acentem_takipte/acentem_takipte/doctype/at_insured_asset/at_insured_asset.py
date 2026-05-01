from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document


VALID_ASSET_TYPES = {"Vehicle", "Home", "Health Person", "Workplace", "Travel", "Boat", "Farm", "Other"}


class ATInsuredAsset(Document):
    def validate(self):
        if not self.customer:
            frappe.throw(_("Customer is required"))
        if str(self.asset_type or "") not in VALID_ASSET_TYPES:
            frappe.throw(_("Valid asset type is required"))
        if not str(self.asset_label or "").strip():
            frappe.throw(_("Asset label is required"))
