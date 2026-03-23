from __future__ import annotations

from unittest.mock import patch

from frappe.tests import IntegrationTestCase

from acentem_takipte.acentem_takipte import accounting as accounting_logic
from acentem_takipte.acentem_takipte import communication as communication_logic
from acentem_takipte.acentem_takipte import tasks as task_jobs
from acentem_takipte.utils.metrics import build_metric_event


class TestObservabilityMetrics(IntegrationTestCase):
    def test_build_metric_event_shape(self):
        event = build_metric_event(
            "notification.dispatch",
            dimensions={"component": "communication"},
            values={"sent": 2},
        )
        self.assertEqual(event["metric"], "notification.dispatch")
        self.assertEqual(event["status"], "ok")
        self.assertEqual(event["dimensions"]["component"], "communication")
        self.assertEqual(event["values"]["sent"], 2)

    def test_renewal_task_job_logs_metric_event(self):
        with patch.object(task_jobs.frappe, "get_all", return_value=[]):
            with patch.object(task_jobs.frappe, "logger") as logger_mock:
                summary = task_jobs._create_renewal_tasks_logic()

        self.assertEqual(summary["scanned"], 0)
        payload = logger_mock.return_value.info.call_args.args[1]
        self.assertEqual(payload["metric"], "renewal.task_job")

    def test_notification_queue_logs_metric_event(self):
        with patch.object(communication_logic.frappe, "get_all", return_value=[]):
            with patch.object(communication_logic.frappe, "logger") as logger_mock:
                summary = communication_logic.queue_notification_drafts(limit=5, include_failed=False)

        self.assertEqual(summary["scanned"], 0)
        payload = logger_mock.return_value.info.call_args.args[1]
        self.assertEqual(payload["metric"], "notification.queue")

    def test_accounting_log_uses_metric_envelope(self):
        with patch.object(accounting_logic, "_collect_sync_candidates", return_value=[]):
            with patch.object(accounting_logic.frappe, "logger") as logger_mock:
                result = accounting_logic.sync_accounting_entries(limit=5)

        self.assertEqual(result["synced"], 0)
        payload = logger_mock.return_value.info.call_args.args[1]
        self.assertEqual(payload["metric"], "accounting.sync")
