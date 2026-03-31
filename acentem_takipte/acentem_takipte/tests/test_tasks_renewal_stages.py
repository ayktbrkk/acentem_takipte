from __future__ import annotations

from unittest.mock import patch

from frappe.tests.utils import FrappeTestCase as IntegrationTestCase

import acentem_takipte.acentem_takipte.tasks as task_jobs
class TestRenewalTaskStages(IntegrationTestCase):
    # ------------------------------------------------------------------
    # build_renewal_stage_key – pure-unit, no mocking needed
    # ------------------------------------------------------------------

    def test_build_renewal_stage_key_includes_stage_and_customer(self):
        unique_key = task_jobs.build_renewal_stage_key("POL-0001", "CUS-0001", "D30", "2026-03-06")

        self.assertEqual(unique_key, "POL-0001:CUS-0001:D30:2026-03-06")

    # ------------------------------------------------------------------
    # _create_renewal_tasks_logic – delegate mock at pipeline boundary
    # ------------------------------------------------------------------

    def test_create_renewal_tasks_creates_stage_specific_task_for_due_window(self):
        """When the pipeline reports 1 created task the logic result must match."""
        expected_summary = {
            "scanned": 1,
            "created": 1,
            "skipped_existing": 0,
            "skipped_race": 0,
            "skipped_invalid": 0,
        }

        with patch.object(task_jobs, "run_renewal_task_creation", return_value=expected_summary):
            summary = task_jobs._create_renewal_tasks_logic()

        self.assertEqual(summary["created"], 1)
        self.assertEqual(summary["skipped_invalid"], 0)

    def test_create_renewal_tasks_skips_non_stage_windows(self):
        """When the pipeline reports 0 created and 1 skipped_invalid the logic result must match."""
        expected_summary = {
            "scanned": 1,
            "created": 0,
            "skipped_existing": 0,
            "skipped_race": 0,
            "skipped_invalid": 1,
        }

        with patch.object(task_jobs, "run_renewal_task_creation", return_value=expected_summary):
            summary = task_jobs._create_renewal_tasks_logic()

        self.assertEqual(summary["created"], 0)
        self.assertEqual(summary["skipped_invalid"], 1)




