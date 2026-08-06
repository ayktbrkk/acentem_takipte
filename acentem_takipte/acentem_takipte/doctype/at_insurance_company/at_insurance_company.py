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

    def on_update(self):
        if self.has_value_changed("is_active"):
            self._validate_active_state_transition()

    def _validate_active_state_transition(self) -> None:
        if self.is_active:
            return

        active_branches = frappe.db.get_value(
            "AT Branch",
            {"insurance_company": self.name, "is_active": 1},
            "name",
        )
        if active_branches:
            frappe.throw(
                _("Cannot deactivate insurance company '{0}' because it has active branches (e.g. {1}). "
                  "Deactivate the branches first.")
                .format(self.company_name, active_branches)
            )

    def on_trash(self):
        if self.docstatus == 2:
            return

        references = []
        referencing_pairs = [
            ("AT Branch", "insurance_company", "BRANCH"),
            ("AT Policy", "insurance_company", "POLICY"),
            ("AT Offer", "insurance_company", "OFFER"),
            ("AT Accounting Entry", "insurance_company", "ACCOUNTING_ENTRY"),
            ("AT Payment", "insurance_company", "PAYMENT"),
            ("AT Claim", "insurance_company", "CLAIM"),
        ]

        for dt, field, label in referencing_pairs:
            if frappe.db.has_column(dt, field):
                ref = frappe.db.get_value(dt, {field: self.name}, "name")
                if ref:
                    references.append(f"{label} {ref}")

        if references:
            frappe.throw(
                _("Cannot delete company '{0}' because it is referenced by: {1}")
                .format(self.company_name, ", ".join(references))
            )


def _generate_company_code(company_name: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9]+", "", company_name.upper())
    return (normalized[:12] or "INS")
