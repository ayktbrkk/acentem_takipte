from __future__ import annotations

import types
from unittest.mock import patch

from frappe.tests import IntegrationTestCase

from acentem_takipte.acentem_takipte import tasks as task_jobs


class TestRenewalTaskStages(IntegrationTestCase):
    def test_build_renewal_stage_key_includes_stage_and_customer(self):
        unique_key = task_jobs.build_renewal_stage_key("POL-0001", "CUS-0001", "D30", "2026-03-06")

        self.assertEqual(unique_key, "POL-0001:CUS-0001:D30:2026-03-06")

    def test_create_renewal_tasks_creates_stage_specific_task_for_due_window(self):
        policy = types.SimpleNamespace(name="POL-0001", customer="CUS-0001", end_date="2026-04-05")

        inserted_docs = []

        class FakeInsertDoc:
            def __init__(self, payload):
                self.payload = payload

            def insert(self, ignore_permissions=True):
                inserted_docs.append(self.payload)
                return self

        with patch.object(task_jobs, "nowdate", return_value="2026-03-06"):
            with patch.object(task_jobs.frappe, "get_all", side_effect=[[policy], []]):
                with patch.object(task_jobs.frappe, "get_doc", side_effect=lambda payload: FakeInsertDoc(payload)):
                    with patch.object(task_jobs.frappe.db, "commit"):
                        summary = task_jobs._create_renewal_tasks_logic()

        self.assertEqual(summary["created"], 1)
        self.assertEqual(inserted_docs[0]["description"], "[D30] Auto renewal reminder for policy POL-0001")
        self.assertEqual(inserted_docs[0]["unique_key"], "POL-0001:CUS-0001:D30:2026-03-06")

    def test_create_renewal_tasks_skips_non_stage_windows(self):
        policy = types.SimpleNamespace(name="POL-0002", customer="CUS-0002", end_date="2026-04-20")

        with patch.object(task_jobs, "nowdate", return_value="2026-03-06"):
            with patch.object(task_jobs.frappe, "get_all", side_effect=[[policy], []]):
                with patch.object(task_jobs.frappe, "get_doc") as get_doc_mock:
                    summary = task_jobs._create_renewal_tasks_logic()

        self.assertEqual(summary["created"], 0)
        self.assertEqual(summary["skipped_invalid"], 1)
        get_doc_mock.assert_not_called()
