from __future__ import annotations

from unittest.mock import patch

from frappe.tests.utils import FrappeTestCase as IntegrationTestCase

from acentem_takipte.acentem_takipte.doctype.at_claim.at_claim import ATClaim


class TestClaimNotificationTrigger(IntegrationTestCase):
    def test_on_update_skips_when_claim_status_not_changed(self):
        doc = ATClaim(
            {
                "doctype": "AT Claim",
                "name": "CLM-0001",
                "claim_status": "Open",
                "customer": "CUS-0001",
            }
        )

        with patch.object(doc, "has_value_changed", return_value=False):
            with patch(
                "acentem_takipte.doctype.at_claim.at_claim.create_notification_drafts"
            ) as create_drafts:
                doc.on_update()

        create_drafts.assert_not_called()

    def test_on_update_creates_claim_status_notification_for_known_status(self):
        doc = ATClaim(
            {
                "doctype": "AT Claim",
                "name": "CLM-0002",
                "claim_status": "Approved",
                "customer": "CUS-0002",
                "policy": "POL-0002",
                "approved_amount": 1250,
                "paid_amount": 250,
            }
        )

        with patch.object(doc, "has_value_changed", return_value=True):
            with patch(
                "acentem_takipte.doctype.at_claim.at_claim.create_notification_drafts"
            ) as create_drafts:
                doc.on_update()

        kwargs = create_drafts.call_args.kwargs
        self.assertEqual(kwargs["event_key"], "claim_status_update")
        self.assertEqual(kwargs["template_key"], "claim_status_approved")
        self.assertEqual(kwargs["context"]["claim_status"], "Approved")


