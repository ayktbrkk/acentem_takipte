from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.naming import make_autoname
from frappe.utils import add_days, flt, getdate, nowdate
from acentem_takipte.utils.statuses import ATPaymentStatus

from acentem_takipte.doctype.at_policy.at_policy import fetch_tcmb_rate


class ATPayment(Document):
    def autoname(self):
        self.payment_no = (self.payment_no or "").strip()
        if self.payment_no:
            self.name = self.payment_no
            return

        generated_name = make_autoname("AT-PAY-.YYYY.-.#####.")
        self.name = generated_name
        self.payment_no = generated_name

    def validate(self):
        if self.policy and not self.customer:
            self.customer = frappe.db.get_value("AT Policy", self.policy, "customer")

        self._validate_status()
        self._validate_claim_links()
        self._validate_amounts()
        self._validate_installments()
        self._set_exchange_rate()
        self.amount_try = flt(self.amount) * flt(self.fx_rate)

        if self.status == ATPaymentStatus.PAID and not self.payment_date:
            self.payment_date = nowdate()

    def after_insert(self):
        self._sync_installment_schedule()
        self._sync_claim_totals()

    def on_update(self):
        self._sync_installment_schedule()
        self._sync_claim_totals()

    def on_trash(self):
        frappe.db.delete("AT Payment Installment", {"payment": self.name})
        self._sync_claim_totals()

    def _validate_claim_links(self):
        if not self.claim:
            return

        if not frappe.db.exists("AT Claim", self.claim):
            frappe.throw(_("Claim not found."))

        claim_data = frappe.db.get_value(
            "AT Claim",
            self.claim,
            ["customer", "policy", "currency"],
            as_dict=True,
        )

        if not self.customer:
            self.customer = claim_data.customer
        elif claim_data.customer and self.customer != claim_data.customer:
            frappe.throw(_("Payment customer must match claim customer."))

        if not self.policy:
            self.policy = claim_data.policy
        elif claim_data.policy and self.policy != claim_data.policy:
            frappe.throw(_("Payment policy must match claim policy."))

        claim_currency = str((claim_data.currency or "TRY")).upper()
        payment_currency = str((self.currency or claim_currency or "TRY")).upper()
        self.currency = payment_currency
        if claim_currency and payment_currency != claim_currency:
            frappe.throw(_("Claim payout currency must match claim currency ({0}).").format(claim_currency))

        if self.payment_direction != "Outbound":
            frappe.throw(_("Claim payments must be outbound."))

        if self.payment_purpose != "Claim Payout":
            self.payment_purpose = "Claim Payout"

    def _validate_amounts(self):
        self.amount = flt(self.amount)
        if self.amount <= 0:
            frappe.throw(_("Payment amount must be greater than zero."))

        due_date = getdate(self.due_date) if self.due_date else None
        payment_date = getdate(self.payment_date) if self.payment_date else None
        if due_date and payment_date and due_date > payment_date and self.status == ATPaymentStatus.PAID:
            frappe.msgprint(_("Payment is marked as paid before due date."), alert=True)

    def _validate_status(self):
        if self.status and self.status not in ATPaymentStatus.VALID:
            frappe.throw(
                _("Unsupported payment status: {0}").format(self.status),
            )

    def _validate_installments(self):
        self.installment_count = int(self.installment_count or 1)
        self.installment_interval_days = int(self.installment_interval_days or 30)
        if self.installment_count <= 0:
            frappe.throw(_("Installment count must be greater than zero."))
        if self.installment_interval_days <= 0:
            frappe.throw(_("Installment interval must be greater than zero."))

    def _set_exchange_rate(self):
        self.currency = (self.currency or "TRY").upper()
        self.fx_rate = flt(self.fx_rate)

        if self.currency == "TRY":
            self.fx_rate = 1
            self.fx_date = self.payment_date or self.due_date or nowdate()
            return

        if self.fx_rate > 0:
            if not self.fx_date:
                self.fx_date = self.payment_date or self.due_date or nowdate()
            return

        reference_date = getdate(self.payment_date or self.due_date or nowdate())
        rate, rate_date = fetch_tcmb_rate(self.currency, reference_date)

        if not rate:
            frappe.throw(_("TCMB exchange rate is unavailable. Enter FX Rate manually."))

        self.fx_rate = rate
        self.fx_date = rate_date

    def _sync_claim_totals(self):
        if not self.claim or not frappe.db.exists("AT Claim", self.claim):
            return
        claim_doc = frappe.get_doc("AT Claim", self.claim)
        claim_doc.save(ignore_permissions=True)

    def _sync_installment_schedule(self):
        frappe.db.delete("AT Payment Installment", {"payment": self.name})

        installment_count = int(self.installment_count or 1)
        base_date = getdate(self.due_date or self.payment_date or nowdate())
        interval_days = int(self.installment_interval_days or 30)
        total_amount = flt(self.amount)
        fx_rate = flt(self.fx_rate or 1)
        base_installment_amount = round(total_amount / installment_count, 2)
        allocated = 0.0

        for index in range(installment_count):
            installment_no = index + 1
            due_date = add_days(base_date, index * interval_days)
            if installment_no == installment_count:
                amount = round(total_amount - allocated, 2)
            else:
                amount = base_installment_amount
                allocated += amount

            status = "Scheduled"
            if self.status == ATPaymentStatus.PAID:
                status = "Paid"
            elif self.status == ATPaymentStatus.CANCELLED:
                status = "Cancelled"
            elif due_date < getdate(nowdate()):
                status = "Overdue"

            frappe.get_doc(
                {
                    "doctype": "AT Payment Installment",
                    "payment": self.name,
                    "customer": self.customer,
                    "policy": self.policy,
                    "office_branch": self.office_branch,
                    "installment_no": installment_no,
                    "installment_count": installment_count,
                    "status": status,
                    "due_date": due_date,
                    "paid_on": self.payment_date if status == "Paid" else None,
                    "currency": self.currency,
                    "amount": amount,
                    "amount_try": round(amount * fx_rate, 2),
                    "notes": self.notes,
                }
            ).insert(ignore_permissions=True)
