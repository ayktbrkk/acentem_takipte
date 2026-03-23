from __future__ import annotations

from unittest.mock import patch

from frappe.tests import IntegrationTestCase

from acentem_takipte.doctype.at_renewal_task.at_renewal_task import ATRenewalTask


class TestRenewalTaskNotifications(IntegrationTestCase):
    def test_validate_uses_stage_aware_unique_key_when_dates_match_stage(self):
        doc = ATRenewalTask(
            {
                "doctype": "AT Renewal Task",
                "policy": "POL-0001",
                "customer": "CUS-0001",
                "renewal_date": "2026-04-05",
                "due_date": "2026-03-06",
            }
        )

        doc.validate()

        self.assertEqual(doc.unique_key, "POL-0001:CUS-0001:D30:2026-03-06")

    def test_after_insert_passes_stage_template_key_to_notifications(self):
        doc = ATRenewalTask(
            {
                "doctype": "AT Renewal Task",
                "name": "REN-0001",
                "policy": "POL-0001",
                "customer": "CUS-0001",
                "policy_end_date": "2026-04-05",
                "renewal_date": "2026-04-05",
                "due_date": "2026-03-06",
            }
        )

        with patch(
            "acentem_takipte.doctype.at_renewal_task.at_renewal_task.create_notification_drafts"
        ) as create_drafts:
            doc.after_insert()

        kwargs = create_drafts.call_args.kwargs
        self.assertEqual(kwargs["template_key"], "renewal_reminder_30")
        self.assertEqual(kwargs["context"]["renewal_stage"], "D30")
