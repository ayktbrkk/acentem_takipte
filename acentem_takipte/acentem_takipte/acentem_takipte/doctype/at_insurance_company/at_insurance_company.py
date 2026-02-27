from __future__ import annotations

import re

import frappe
from frappe import _
from frappe.model.document import Document


class ATInsuranceCompany(Document):
    def validate(self):
        self.company_name = (self.company_name or "").strip()
        self.company_code = (self.company_code or "").strip().upper()

        if not self.company_name:
            frappe.throw(_("Company Name is required."))

        if not self.company_code:
            self.company_code = _generate_company_code(self.company_name)

        if not re.fullmatch(r"[A-Z0-9_-]{2,12}", self.company_code or ""):
            frappe.throw(_("Company Code must be 2-12 chars and contain only A-Z, 0-9, '_' or '-'."))

        duplicate = frappe.db.exists(
            "AT Insurance Company",
            {
                "company_code": self.company_code,
                "name": ["!=", self.name],
            },
        )
        if duplicate:
            frappe.throw(_("Company Code must be unique."))


def _generate_company_code(company_name: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9]+", "", company_name.upper())
    return (normalized[:12] or "INS")
