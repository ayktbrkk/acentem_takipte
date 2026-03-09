from __future__ import annotations

import types
from unittest.mock import patch

from frappe.tests import IntegrationTestCase

from acentem_takipte.acentem_takipte import tasks as task_jobs


class TestPaymentDueTasks(IntegrationTestCase):
    def test_run_payment_due_logic_creates_notification_for_due_stage(self):
        payment = types.SimpleNamespace(
            name="PAY-0001",
            customer="CUS-0001",
            due_date="2026-03-13",
            policy="POL-0001",
        )

        with patch.object(task_jobs, "nowdate", return_value="2026-03-06"):
            with patch.object(task_jobs.frappe, "get_all", side_effect=[[payment], []]):
                with patch.object(task_jobs, "create_notification_drafts") as create_drafts:
                    summary = task_jobs._run_payment_due_logic(limit=10)

        self.assertEqual(summary["created"], 1)
        kwargs = create_drafts.call_args.kwargs
        self.assertEqual(kwargs["template_key"], "payment_due_7")
        self.assertEqual(kwargs["context"]["payment_stage"], "D7")

    def test_run_payment_due_logic_skips_duplicate_same_day_notification(self):
        payment = types.SimpleNamespace(
            name="PAY-0002",
            customer="CUS-0002",
            due_date="2026-03-07",
            policy="POL-0002",
        )
        existing_draft = types.SimpleNamespace(name="DRF-1", body="PAY-0002:D1:2026-03-06")

        with patch.object(task_jobs, "nowdate", return_value="2026-03-06"):
            with patch.object(task_jobs.frappe, "get_all", side_effect=[[payment], [existing_draft]]):
                with patch.object(task_jobs, "create_notification_drafts") as create_drafts:
                    summary = task_jobs._run_payment_due_logic(limit=10)

        self.assertEqual(summary["created"], 0)
        self.assertEqual(summary["skipped_duplicate"], 1)
        create_drafts.assert_not_called()
