from __future__ import annotations

import types
from unittest.mock import patch

from frappe.tests.utils import FrappeTestCase as IntegrationTestCase

import acentem_takipte.acentem_takipte.tasks as task_jobs


class TestPolicyRenewalReminderTasks(IntegrationTestCase):
    def test_run_policy_renewal_logic_creates_notification_for_matching_window(self):
        policy = types.SimpleNamespace(
            name="POL-0001",
            customer="CUS-0001",
            end_date="2026-04-05",
        )

        with patch.object(task_jobs, "nowdate", return_value="2026-03-06"):
            with patch.object(task_jobs.frappe, "get_list", side_effect=[[policy], [], []]):
                with patch.object(task_jobs.frappe, "get_all", return_value=[]):
                    with patch.object(task_jobs, "create_notification_drafts") as create_drafts:
                        summary = task_jobs._run_policy_renewal_reminder_logic(limit=10)

        self.assertEqual(summary["created"], 1)
        kwargs = create_drafts.call_args.kwargs
        self.assertEqual(kwargs["template_key"], "renewal_reminder_30")
        self.assertEqual(kwargs["context"]["renewal_stage"], "D30")
        self.assertEqual(kwargs["context"]["renewal_dedupe_key"], "POL-0001:CUS-0001:D30:2026-03-06")

    def test_run_policy_renewal_logic_skips_duplicate_same_day_notification(self):
        policy = types.SimpleNamespace(
            name="POL-0002",
            customer="CUS-0002",
            end_date="2026-03-21",
        )
        existing_draft = types.SimpleNamespace(name="DRF-1")

        with patch.object(task_jobs, "nowdate", return_value="2026-03-06"):
            with patch.object(task_jobs.frappe, "get_list", side_effect=[[], [policy], []]):
                with patch.object(task_jobs.frappe, "get_all", return_value=[existing_draft]):
                    with patch.object(task_jobs, "create_notification_drafts") as create_drafts:
                        summary = task_jobs._run_policy_renewal_reminder_logic(limit=10)

        self.assertEqual(summary["created"], 0)
        self.assertEqual(summary["skipped_duplicate"], 1)
        create_drafts.assert_not_called()