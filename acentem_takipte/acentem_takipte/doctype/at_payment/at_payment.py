from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.naming import make_autoname
from frappe.utils import add_days, flt, getdate, nowdate
from acentem_takipte.acentem_takipte.utils.statuses import ATClaimStatus, ATPaymentStatus

from acentem_takipte.acentem_takipte.doctype.at_policy.at_policy import fetch_tcmb_rate


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
        # Resolve fx_rate/amount_try before commission cap checks so non-TRY
        # payouts compare against the TRY-equivalent allocation.
        self._set_exchange_rate()
        self.amount_try = flt(self.amount) * flt(self.fx_rate)
        self._validate_commission_payout()
        self._validate_amounts()
        self._validate_installments()
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
            frappe.throw(
                _("Claim payout currency must match claim currency ({0}).").format(
                    claim_currency
                )
            )

        if self.payment_direction != "Outbound":
            frappe.throw(_("Claim payments must be outbound."))

        if self.payment_purpose != "Claim Payout":
            self.payment_purpose = "Claim Payout"

        self._validate_claim_payout_eligibility()

    def _validate_claim_payout_eligibility(self):
        """A Claim Payout may only be created for an Approved claim with remaining
        approved amount. Terminal (Rejected/Cancelled/Closed) and already-paid
        claims cannot receive further payouts; committed payouts (Draft + Paid,
        excluding Cancelled) must not exceed the approved amount. The cap is
        compared in the claim currency (TRY claims use the TRY equivalent)."""
        claim = frappe.db.get_value(
            "AT Claim",
            self.claim,
            ["claim_status", "approved_amount", "currency"],
            as_dict=True,
        ) or {}
        claim_status = str(claim.get("claim_status") or "").strip()
        approved_amount = flt(claim.get("approved_amount") or 0)
        claim_currency = str(claim.get("currency") or "TRY").strip().upper() or "TRY"

        if claim_status == ATClaimStatus.PAID:
            frappe.throw(_("Claim is already paid; no further payouts are allowed."))
        if claim_status != ATClaimStatus.APPROVED:
            frappe.throw(
                _("Only approved claims can receive payouts; claim is currently {0}.").format(
                    claim_status or "unknown"
                )
            )

        # Resolve this payment's amount in the claim currency. Payment currency
        # already matches the claim currency (enforced in _validate_claim_links);
        # TRY claims use the TRY equivalent, non-TRY claims use the raw amount.
        payment_currency = str((self.currency or claim_currency or "TRY")).strip().upper()
        if payment_currency == "TRY" or claim_currency == "TRY":
            new_committed = flt(self.amount) * flt(self.fx_rate or 1)
        else:
            new_committed = flt(self.amount)

        committed_rows = frappe.db.sql(
            """
            select currency, amount, amount_try
            from `tabAT Payment`
            where claim = %s
              and payment_purpose = 'Claim Payout'
              and status != 'Cancelled'
              and name != %s
            """,
            (self.claim, self.name or ""),
            as_dict=True,
        )
        already_committed = 0.0
        for row in committed_rows or []:
            row_currency = str(row.get("currency") or "TRY").strip().upper() or "TRY"
            if row_currency == "TRY" or claim_currency == "TRY":
                already_committed += flt(row.get("amount_try") or 0)
            elif row_currency == claim_currency:
                already_committed += flt(row.get("amount") or 0)

        total_with_new = already_committed + new_committed
        if approved_amount > 0 and total_with_new > approved_amount + 0.01:
            frappe.throw(
                _(
                    "Cumulative claim payouts ({0} + {1} = {2}) would exceed the approved amount ({3})."
                ).format(
                    round(already_committed, 2),
                    round(new_committed, 2),
                    round(total_with_new, 2),
                    round(approved_amount, 2),
                )
            )

    def _validate_commission_payout(self):
        if self.payment_purpose != "Commission Payout":
            return
        if self.payment_direction != "Outbound":
            self.payment_direction = "Outbound"
        if not self.policy:
            frappe.throw(_("A policy must be linked for commission payouts."))
        if not self.sales_entity:
            frappe.throw(_("A sales entity must be linked for commission payouts."))
        self._validate_commission_period_lock()
        policy_data = frappe.db.get_value(
            "AT Policy",
            self.policy,
            ["commission_amount", "commission_distribution", "sales_entity"],
            as_dict=True,
        ) or {}
        policy_commission = flt(policy_data.get("commission_amount") or 0)
        if self.amount <= 0 and policy_commission > 0:
            self.amount = policy_commission

        # fx_rate is resolved in validate() before this runs; amount_try is the
        # TRY-equivalent used for every cap comparison below.
        self.amount_try = flt(self.amount) * flt(self.fx_rate or 1)
        amount_try = self.amount_try

        # The payout entity must actually appear in the policy distribution.
        distribution_raw = str(policy_data.get("commission_distribution") or "[]")
        entity_allocation_try = 0.0
        entity_found = False
        try:
            import json
            distribution = json.loads(distribution_raw) if distribution_raw else []
        except (json.JSONDecodeError, TypeError):
            distribution = []
        for entry in distribution or []:
            if str(entry.get("entity") or "").strip() == str(self.sales_entity or "").strip():
                entity_found = True
                entity_allocation_try = flt(entry.get("amount_try") or 0)
                break
        if not entity_found:
            frappe.throw(
                _(
                    "Sales entity {0} is not part of the commission distribution of policy {1}."
                ).format(self.sales_entity, self.policy)
            )
        if entity_allocation_try <= 0:
            frappe.throw(
                _(
                    "Sales entity {0} has no commission allocation for policy {1}; payouts are not allowed."
                ).format(self.sales_entity, self.policy)
            )

        # Policy-level cap (TRY): total committed payouts must not exceed the
        # policy commission. Cancelled payouts are excluded.
        already_paid = flt(
            frappe.db.sql(
                """
                select ifnull(sum(amount_try), 0)
                from `tabAT Payment`
                where policy = %s
                  and payment_purpose = 'Commission Payout'
                  and status != 'Cancelled'
                  and name != %s
                """,
                (self.policy, self.name or ""),
            )[0][0]
        )
        total_with_new = already_paid + amount_try
        if total_with_new > policy_commission + 0.01:
            frappe.throw(
                _(
                    "Cumulative commission payouts ({0} + {1} = {2}) would exceed policy commission ({3})."
                ).format(
                    round(already_paid, 2),
                    round(amount_try, 2),
                    round(total_with_new, 2),
                    round(policy_commission, 2),
                )
            )

        # Entity-level allocation cap (TRY): committed (Draft + Paid) payouts to
        # this entity must not exceed its share of the policy distribution.
        already_paid_entity = flt(
            frappe.db.sql(
                """
                select ifnull(sum(amount_try), 0)
                from `tabAT Payment`
                where policy = %s
                  and sales_entity = %s
                  and payment_purpose = 'Commission Payout'
                  and status != 'Cancelled'
                  and name != %s
                """,
                (self.policy, self.sales_entity, self.name or ""),
            )[0][0]
        )
        entity_total_with_new = already_paid_entity + amount_try
        if entity_total_with_new > entity_allocation_try + 0.01:
            frappe.throw(
                _(
                    "Cumulative payouts to {0} for policy {1} ({2} + {3} = {4}) would exceed its commission allocation ({5})."
                ).format(
                    self.sales_entity,
                    self.policy,
                    round(already_paid_entity, 2),
                    round(amount_try, 2),
                    round(entity_total_with_new, 2),
                    round(entity_allocation_try, 2),
                )
            )

    def _validate_commission_period_lock(self) -> None:
        if self.payment_purpose != "Commission Payout" or not self.policy:
            return
        policy_data = frappe.db.get_value(
            "AT Policy", self.policy, ["insurance_company", "issue_date"], as_dict=True,
        )
        policy_ic = policy_data.insurance_company if policy_data else None
        policy_issue = policy_data.issue_date if policy_data else None
        if not policy_ic or not policy_issue:
            return
        from acentem_takipte.acentem_takipte.doctype.at_commission_period.at_commission_period import (
            is_commission_period_locked,
        )
        if is_commission_period_locked(policy_ic, policy_issue):
            frappe.throw(
                _("Cannot create or modify a commission payout for a locked commission period.")
            )

    def _validate_amounts(self):
        self.amount = flt(self.amount)
        if self.amount <= 0:
            frappe.throw(_("Payment amount must be greater than zero."))

        due_date = getdate(self.due_date) if self.due_date else None
        payment_date = getdate(self.payment_date) if self.payment_date else None
        if (
            due_date
            and payment_date
            and due_date > payment_date
            and self.status == ATPaymentStatus.PAID
        ):
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
            frappe.throw(
                _("TCMB exchange rate is unavailable. Enter FX Rate manually.")
            )

        self.fx_rate = rate
        self.fx_date = rate_date

    def _sync_claim_totals(self):
        if not self.claim or not frappe.db.exists("AT Claim", self.claim):
            return
        claim_doc = frappe.get_doc("AT Claim", self.claim)
        # ignore_permissions: Claim update triggered by payment status change; doc-level permission in effect.
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

            doc = frappe.get_doc(
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
            )
            # ignore_permissions: Claim update triggered by payment status change; doc-level permission in effect.
            doc.insert(ignore_permissions=True)
