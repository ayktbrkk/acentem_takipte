from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.naming import make_autoname
from frappe.utils import flt, getdate
from acentem_takipte.acentem_takipte.claims.notifications import resolve_claim_status_template_key
from acentem_takipte.acentem_takipte.notifications import create_notification_drafts
from acentem_takipte.acentem_takipte.utils.logging import log_redacted_error
from acentem_takipte.acentem_takipte.utils.statuses import ATClaimStatus


class ATClaim(Document):
    def autoname(self):
        self.claim_no = (self.claim_no or "").strip()
        if self.claim_no:
            self.name = self.claim_no
            return

        generated_name = make_autoname("AT-CLM-.YYYY.-.#####.")
        self.name = generated_name
        self.claim_no = generated_name

    def validate(self):
        if self.policy and not self.customer:
            self.customer = frappe.db.get_value("AT Policy", self.policy, "customer")

        self._validate_operational_fields()

        incident_date = getdate(self.incident_date) if self.incident_date else None
        reported_date = getdate(self.reported_date) if self.reported_date else None
        if incident_date and reported_date and incident_date > reported_date:
            frappe.throw(_("Incident date cannot be later than reported date."))

        estimated_amount = flt(self.estimated_amount)
        approved_amount = flt(self.approved_amount)

        if estimated_amount < 0:
            frappe.throw(_("Estimated amount cannot be negative."))
        if approved_amount < 0:
            frappe.throw(_("Approved amount cannot be negative."))
        if estimated_amount and approved_amount > estimated_amount:
            frappe.throw(_("Approved amount cannot be greater than estimated amount."))

        if frappe.db.exists("AT Claim", self.name):
            paid_totals = _get_paid_amount_totals(self.name, self.currency)
            self.paid_amount = paid_totals["paid_amount"]
            self.paid_amount_try = paid_totals["paid_amount_try"]
        else:
            self.paid_amount = 0
            self.paid_amount_try = 0
        if approved_amount and flt(self.paid_amount) > approved_amount:
            frappe.throw(_("Paid amount cannot be greater than approved amount."))

        if approved_amount and flt(self.paid_amount) >= approved_amount and self.claim_status in {
            ATClaimStatus.OPEN,
            ATClaimStatus.UNDER_REVIEW,
            ATClaimStatus.APPROVED,
        }:
            self.claim_status = ATClaimStatus.PAID

    def _validate_operational_fields(self):
        self.rejection_reason = (self.rejection_reason or "").strip()
        self.appeal_status = (self.appeal_status or "").strip()

        if self.claim_status == ATClaimStatus.REJECTED and not self.rejection_reason:
            frappe.throw(_("Rejection reason is required when claim status is Rejected."))

        if self.appeal_status and self.claim_status != ATClaimStatus.REJECTED:
            frappe.throw(_("Appeal status can only be set for rejected claims."))

        if self.next_follow_up_on and self.reported_date:
            next_follow_up_on = getdate(self.next_follow_up_on)
            reported_date = getdate(self.reported_date)
            if next_follow_up_on and reported_date and next_follow_up_on < reported_date:
                frappe.throw(_("Next follow up date cannot be earlier than reported date."))

    def on_update(self):
        if not self.has_value_changed("claim_status"):
            return

        template_key = resolve_claim_status_template_key(self.claim_status)
        if not template_key:
            return

        try:
            create_notification_drafts(
                event_key="claim_status_update",
                template_key=template_key,
                reference_doctype=self.doctype,
                reference_name=self.name,
                customer=self.customer,
                context={
                    "claim": self.name,
                    "claim_status": self.claim_status,
                    "policy": self.policy,
                    "rejection_reason": self.rejection_reason,
                    "appeal_status": self.appeal_status,
                    "next_follow_up_on": self.next_follow_up_on,
                    "approved_amount": self.approved_amount,
                    "paid_amount": self.paid_amount,
                },
            )
        except Exception:
            log_redacted_error(
                "AT Claim Notification Draft Error",
                details={"claim": self.name, "customer": self.customer, "policy": self.policy},
            )


def _get_paid_amount(claim_name: str, claim_currency: str | None = None) -> float:
    return _get_paid_amount_totals(claim_name, claim_currency).get("paid_amount", 0.0)


def _get_paid_amount_totals(claim_name: str, claim_currency: str | None = None) -> dict[str, float]:
    if not claim_name:
        return {"paid_amount": 0.0, "paid_amount_try": 0.0}

    normalized_claim_currency = str(claim_currency or "TRY").upper()
    rows = frappe.get_all(
        "AT Payment",
        filters={
            "claim": claim_name,
            "status": ATClaimStatus.PAID,
            "payment_direction": "Outbound",
        },
        fields=["currency", "amount", "amount_try"],
        limit_page_length=0,
    )

    paid_amount = 0.0
    paid_amount_try = 0.0
    for row in rows:
        payment_currency = str(row.get("currency") or "TRY").upper()
        amount = flt(row.get("amount"))
        amount_try = flt(row.get("amount_try"))
        paid_amount_try += amount_try

        # Claim payouts are expected to use claim currency. For legacy mismatches, keep TRY
        # total correct and only aggregate claim-currency rows into `paid_amount`.
        if normalized_claim_currency == "TRY":
            paid_amount += amount_try
        elif payment_currency == normalized_claim_currency:
            paid_amount += amount

    return {
        "paid_amount": flt(paid_amount),
        "paid_amount_try": flt(paid_amount_try),
    }

