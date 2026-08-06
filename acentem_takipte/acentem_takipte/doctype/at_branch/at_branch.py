from __future__ import annotations

import re

import frappe
from frappe import _
from frappe.model.document import Document


class ATBranch(Document):
    def validate(self):
        self.branch_name = (self.branch_name or "").strip()
        self.branch_code = (self.branch_code or "").strip().upper()

        if not self.branch_name:
            frappe.throw(_("Branch Name is required."))

        if not self.branch_code:
            self.branch_code = _generate_branch_code(self.branch_name)

        if not re.fullmatch(r"[A-Z0-9_-]{2,12}", self.branch_code or ""):
            frappe.throw(_("Branch Code must be 2-12 chars and contain only A-Z, 0-9, '_' or '-'."))

        duplicate_code = frappe.db.exists(
            "AT Branch",
            {"branch_code": self.branch_code, "name": ["!=", self.name]},
        )
        if duplicate_code:
            frappe.throw(_("Branch Code must be unique."))

        self._validate_insurance_company()

    def _validate_insurance_company(self) -> None:
        insurance_company = (self.insurance_company or "").strip()
        if not insurance_company:
            return

        if not frappe.db.exists("AT Insurance Company", insurance_company):
            frappe.throw(_("Referenced Insurance Company '{0}' does not exist.").format(insurance_company))

        company_is_active = frappe.db.get_value("AT Insurance Company", insurance_company, "is_active")
        if self.is_active and not int(company_is_active or 0):
            frappe.throw(
                _("Cannot activate branch '{0}' because its insurance company '{1}' is inactive.")
                .format(self.branch_name, insurance_company)
            )

    def on_trash(self):
        if self.docstatus == 2:
            return

        referencing_doctypes = [
            ("AT Policy", "branch"),
            ("AT Offer", "branch"),
            ("AT Accounting Entry", "branch"),
        ]
        for dt, field in referencing_doctypes:
            if frappe.db.has_column(dt, field):
                ref = frappe.db.get_value(dt, {field: self.name}, "name")
                if ref:
                    frappe.throw(
                        _("Cannot delete branch '{0}' because it is referenced by {1} {2}.")
                        .format(self.branch_name, dt, ref)
                    )


def _generate_branch_code(branch_name: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9]+", "", branch_name.upper())
    return (normalized[:12] or "BR")
