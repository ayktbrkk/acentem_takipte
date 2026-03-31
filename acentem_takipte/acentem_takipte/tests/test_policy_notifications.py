from __future__ import annotations

from unittest.mock import patch

from frappe.tests.utils import FrappeTestCase as IntegrationTestCase

from acentem_takipte.acentem_takipte.doctype.at_policy.at_policy import ATPolicy


class TestPolicyNotifications(IntegrationTestCase):
    def test_after_insert_uses_policy_delivery_template_key(self):
        doc = ATPolicy(
            {
                "doctype": "AT Policy",
                "name": "POL-0001",
                "policy_no": "POL-0001",
                "customer": "CUS-0001",
                "issue_date": "2026-03-06",
                "start_date": "2026-03-06",
                "end_date": "2027-03-06",
                "currency": "TRY",
                "net_premium": 1000,
                "tax_amount": 50,
                "commission_amount": 100,
                "gross_premium": 1150,
                "commission": 100,
                "insurance_company": "ACME Sigorta",
                "branch": "Kasko",
            }
        )

        with patch(
            "acentem_takipte.doctype.at_policy.at_policy.create_policy_snapshot"
        ) as create_snapshot:
            create_snapshot.return_value = type("Snapshot", (), {"snapshot_version": 1})()
            with patch.object(doc, "db_set"):
                with patch(
                    "acentem_takipte.doctype.at_policy.at_policy.create_notification_drafts"
                ) as create_drafts:
                    with patch(
                        "acentem_takipte.doctype.at_policy.at_policy.attach_policy_pdf_to_customer_folder"
                    ):
                        doc.after_insert()

        kwargs = create_drafts.call_args.kwargs
        self.assertEqual(kwargs["event_key"], "policy_created")
        self.assertEqual(kwargs["template_key"], "policy_delivery")
        self.assertEqual(kwargs["reference_name"], "POL-0001")


