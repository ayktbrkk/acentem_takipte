from __future__ import annotations

import unittest
from unittest.mock import patch

import frappe

from acentem_takipte.acentem_takipte.doctype.at_claim.at_claim import ATClaim


class TestATClaimOperationalFields(unittest.TestCase):
    def _build_doc(self, **overrides):
        payload = {
            "doctype": "AT Claim",
            "name": "AT-CLM-TEST",
            "policy": "POL-001",
            "customer": "CUS-001",
            "claim_status": "Open",
            "incident_date": "2026-03-01",
            "reported_date": "2026-03-02",
            "currency": "TRY",
            "estimated_amount": 1000,
            "approved_amount": 0,
        }
        payload.update(overrides)
        return ATClaim(payload)

    @patch("acentem_takipte.acentem_takipte.doctype.at_claim.at_claim._get_paid_amount_totals", return_value={"paid_amount": 0, "paid_amount_try": 0})
    @patch("acentem_takipte.acentem_takipte.doctype.at_claim.at_claim.frappe.db.exists", return_value=False)
    def test_rejected_claim_requires_rejection_reason(self, _exists, _paid_totals):
        doc = self._build_doc(claim_status="Rejected", rejection_reason="")

        with self.assertRaises(frappe.ValidationError):
            doc.validate()

    @patch("acentem_takipte.acentem_takipte.doctype.at_claim.at_claim._get_paid_amount_totals", return_value={"paid_amount": 0, "paid_amount_try": 0})
    @patch("acentem_takipte.acentem_takipte.doctype.at_claim.at_claim.frappe.db.exists", return_value=False)
    def test_appeal_status_is_only_allowed_for_rejected_claims(self, _exists, _paid_totals):
        doc = self._build_doc(claim_status="Under Review", appeal_status="Appeal Pending")

        with self.assertRaises(frappe.ValidationError):
            doc.validate()

    @patch("acentem_takipte.acentem_takipte.doctype.at_claim.at_claim._get_paid_amount_totals", return_value={"paid_amount": 0, "paid_amount_try": 0})
    @patch("acentem_takipte.acentem_takipte.doctype.at_claim.at_claim.frappe.db.exists", return_value=False)
    def test_follow_up_date_cannot_be_earlier_than_reported_date(self, _exists, _paid_totals):
        doc = self._build_doc(next_follow_up_on="2026-03-01")

        with self.assertRaises(frappe.ValidationError):
            doc.validate()

    @patch("acentem_takipte.acentem_takipte.doctype.at_claim.at_claim._get_paid_amount_totals", return_value={"paid_amount": 0, "paid_amount_try": 0})
    @patch("acentem_takipte.acentem_takipte.doctype.at_claim.at_claim.frappe.db.exists", return_value=False)
    def test_rejected_claim_accepts_operational_fields(self, _exists, _paid_totals):
        doc = self._build_doc(
            claim_status="Rejected",
            rejection_reason="Eksik evrak",
            appeal_status="Appeal Pending",
            next_follow_up_on="2026-03-05",
        )

        doc.validate()

        self.assertEqual(doc.rejection_reason, "Eksik evrak")
        self.assertEqual(doc.appeal_status, "Appeal Pending")


if __name__ == "__main__":
    unittest.main()
