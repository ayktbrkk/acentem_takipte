from __future__ import annotations

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase as IntegrationTestCase
from frappe.utils import add_days, now_datetime, nowdate

from acentem_takipte import hooks as app_hooks
import acentem_takipte.acentem_takipte.tasks as task_jobs
from acentem_takipte.acentem_takipte.doctype.at_access_log.at_access_log import (
    resolve_access_log_retention_cutoff,
    resolve_access_log_retention_days,
    run_access_log_retention_purge,
)
import acentem_takipte.acentem_takipte.doctype.at_access_log.at_access_log as access_log_module

RETENTION_KEY = "at_access_log_retention_days"
PURGE_JOB_PATH = "acentem_takipte.acentem_takipte.tasks.run_purge_access_logs_job"


class TestAccessLogRetentionConfig(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.db.rollback()

    def test_missing_config_uses_default_365(self):
        self.assertEqual(resolve_access_log_retention_days({}), 365)

    def test_numeric_string_config_is_coerced(self):
        self.assertEqual(resolve_access_log_retention_days({RETENTION_KEY: "365"}), 365)
        self.assertEqual(resolve_access_log_retention_days({RETENTION_KEY: 730}), 730)

    def test_zero_config_returns_none(self):
        self.assertIsNone(resolve_access_log_retention_days({RETENTION_KEY: 0}))

    def test_negative_config_returns_none(self):
        self.assertIsNone(resolve_access_log_retention_days({RETENTION_KEY: -30}))

    def test_non_numeric_config_returns_none(self):
        self.assertIsNone(resolve_access_log_retention_days({RETENTION_KEY: "abc"}))
        self.assertIsNone(resolve_access_log_retention_days({RETENTION_KEY: "12.5"}))

    def test_excessive_config_returns_none(self):
        self.assertIsNone(resolve_access_log_retention_days({RETENTION_KEY: 999999}))


class TestAccessLogRetentionPurge(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.flags.pop("at_access_log_privileged", None)
        frappe.db.rollback()

    def _create_log(self, *, viewed_on=None, reference_name="CUST-001") -> str:
        log = frappe.get_doc(
            {
                "doctype": "AT Access Log",
                "reference_doctype": "AT Customer",
                "reference_name": reference_name,
                "viewed_by": frappe.session.user or "Administrator",
                "action": "View",
                "action_summary": "viewed",
                "viewed_on": viewed_on or now_datetime(),
            }
        )
        log.insert(ignore_permissions=True, ignore_links=True)
        return log.name

    def test_cutoff_future_skips_purge(self):
        future = add_days(nowdate(), 5)
        with patch.object(access_log_module, "purge_access_logs") as purge_mock:
            with patch.object(access_log_module, "add_days", return_value=future):
                result = run_access_log_retention_purge({RETENTION_KEY: 365})
        self.assertEqual(result["deleted"], 0)
        self.assertTrue(result["skipped"])
        purge_mock.assert_not_called()

    def test_invalid_config_skips_purge_without_deleting(self):
        with patch.object(access_log_module, "purge_access_logs") as purge_mock:
            result = run_access_log_retention_purge({RETENTION_KEY: 0})
        self.assertEqual(result["deleted"], 0)
        self.assertTrue(result["skipped"])
        purge_mock.assert_not_called()

    def test_valid_default_purges_only_old_records_and_audits(self):
        old = self._create_log(
            viewed_on=f"{add_days(nowdate(), -400)} 00:00:00", reference_name="OLD-365"
        )
        recent = self._create_log(reference_name="RECENT-365")

        result = run_access_log_retention_purge({})

        self.assertEqual(result["deleted"], 1)
        self.assertFalse(result["skipped"])
        self.assertFalse(frappe.db.exists("AT Access Log", old))
        self.assertTrue(frappe.db.exists("AT Access Log", recent))
        self.assertTrue(
            frappe.db.exists("AT Access Log", {"decision_context": "access_log_retention_purge"})
        )

    def test_audit_record_is_not_recursively_purged(self):
        self._create_log(
            viewed_on=f"{add_days(nowdate(), -400)} 00:00:00", reference_name="OLD-AUDIT"
        )

        run_access_log_retention_purge({})
        self.assertTrue(
            frappe.db.exists("AT Access Log", {"decision_context": "access_log_retention_purge"})
        )

        second = run_access_log_retention_purge({})
        self.assertEqual(second["deleted"], 0)
        self.assertTrue(
            frappe.db.exists("AT Access Log", {"decision_context": "access_log_retention_purge"})
        )


class TestAccessLogRetentionScheduler(IntegrationTestCase):
    def test_daily_scheduler_contains_purge_job(self):
        daily = app_hooks.scheduler_events["daily"]
        self.assertIn(PURGE_JOB_PATH, daily)

    def test_daily_scheduler_preserves_existing_jobs(self):
        daily = app_hooks.scheduler_events["daily"]
        for existing in (
            "acentem_takipte.acentem_takipte.tasks.create_renewal_tasks",
            "acentem_takipte.acentem_takipte.tasks.expire_active_policies",
            "acentem_takipte.acentem_takipte.tasks.run_policy_renewal_reminder_job",
            "acentem_takipte.acentem_takipte.tasks.run_stale_renewal_task_job",
            "acentem_takipte.acentem_takipte.tasks.run_payment_due_job",
            "acentem_takipte.acentem_takipte.tasks.cleanup_expired_export_jobs",
        ):
            self.assertIn(existing, daily)

    def test_purge_job_wrapper_delegates_to_orchestrator(self):
        with patch.object(
            access_log_module,
            "run_access_log_retention_purge",
            return_value={"deleted": 2, "skipped": False},
        ) as orchestrator_mock:
            result = task_jobs.run_purge_access_logs_job()
        self.assertEqual(result["deleted"], 2)
        orchestrator_mock.assert_called_once_with()

    def test_purge_job_path_resolves(self):
        module_name, _, attr = PURGE_JOB_PATH.rpartition(".")
        module = __import__(module_name, fromlist=[attr])
        self.assertTrue(callable(getattr(module, attr)))
