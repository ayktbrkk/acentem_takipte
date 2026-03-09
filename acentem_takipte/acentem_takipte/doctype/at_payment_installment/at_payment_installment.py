from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.naming import make_autoname
from frappe.utils import flt


VALID_INSTALLMENT_STATUSES = {"Scheduled", "Overdue", "Paid", "Cancelled"}


class ATPaymentInstallment(Document):
    def autoname(self):
        if self.name and str(self.name).strip():
            return
        self.name = make_autoname("AT-PINST-.YYYY.-.#####.")

    def validate(self):
        if self.payment and not frappe.db.exists("AT Payment", self.payment):
            frappe.throw(_("Payment not found."))

        if self.status and self.status not in VALID_INSTALLMENT_STATUSES:
            frappe.throw(_("Unsupported installment status: {0}").format(self.status))

        self.installment_no = int(self.installment_no or 0)
        self.installment_count = int(self.installment_count or 0)
        if self.installment_no <= 0 or self.installment_count <= 0:
            frappe.throw(_("Installment number and installment count must be greater than zero."))

        self.amount = flt(self.amount)
        self.amount_try = flt(self.amount_try or self.amount)
        if self.amount <= 0:
            frappe.throw(_("Installment amount must be greater than zero."))
