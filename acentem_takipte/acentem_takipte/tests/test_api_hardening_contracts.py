from __future__ import annotations

from contextlib import contextmanager
from types import SimpleNamespace
from unittest.mock import ANY, patch

import frappe
from frappe.tests import IntegrationTestCase

from acentem_takipte.acentem_takipte import tasks as task_jobs
from acentem_takipte.acentem_takipte.api import admin_jobs as admin_jobs_api
from acentem_takipte.acentem_takipte.api import communication as communication_api
from acentem_takipte.acentem_takipte.api import quick_create as quick_create_api
from acentem_takipte.acentem_takipte.api import session as session_api
from acentem_takipte.acentem_takipte.doctype.at_policy_endorsement import (
    at_policy_endorsement as endorsement_api,
)


@contextmanager
def _request_method(method: str):
    previous_request = getattr(frappe.local, "request", None)
    frappe.local.request = SimpleNamespace(method=method)
    try:
        yield
    finally:
        frappe.local.request = previous_request


class TestApiHardeningContracts(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.local.request = None
        frappe.db.rollback()

    def test_apply_endorsement_requires_authentication(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "Guest"
        try:
            with self.assertRaises(Exception) as err:
                endorsement_api.apply_endorsement("TEST-ENDORSEMENT")
            self.assertIn("authentication", str(err.exception).lower())
        finally:
            frappe.session.user = previous_user

    def test_apply_endorsement_rejects_non_post(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "Administrator"
        try:
            with _request_method("GET"):
                with self.assertRaises(Exception) as err:
                    endorsement_api.apply_endorsement("TEST-ENDORSEMENT")
                self.assertIn("post", str(err.exception).lower())
        finally:
            frappe.session.user = previous_user

    def test_quick_create_rejects_non_post(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "Administrator"
        try:
            with _request_method("GET"):
                with self.assertRaises(Exception) as err:
                    quick_create_api.create_quick_customer(full_name="Test User", tax_id="1234567890")
                self.assertIn("post", str(err.exception).lower())
        finally:
            frappe.session.user = previous_user

    def test_quick_option_search_requires_authentication(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "Guest"
        try:
            with self.assertRaises(Exception) as err:
                quick_create_api.search_quick_options("customers", query="ay")
            self.assertIn("authentication", str(err.exception).lower())
        finally:
            frappe.session.user = previous_user

    def test_quick_option_search_returns_option_payload(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "Administrator"
        try:
            with patch.object(quick_create_api, "assert_doctype_permission") as permission_mock:
                with patch.object(
                    quick_create_api.frappe,
                    "get_list",
                    return_value=[{"name": "AT-CUST-0001", "full_name": "Ayse Yilmaz", "tax_id": "12345678901"}],
                ) as get_list_mock:
                    result = quick_create_api.search_quick_options("customers", query="ayse", limit=15)

            permission_mock.assert_called_once_with("AT Customer", "read", ANY)
            get_list_mock.assert_called_once()
            self.assertEqual(result, {"options": [{"value": "AT-CUST-0001", "label": "Ayse Yilmaz", "description": "12345678901"}]})
        finally:
            frappe.session.user = previous_user

    def test_set_session_locale_rejects_non_post(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "Administrator"
        try:
            with _request_method("GET"):
                with self.assertRaises(Exception) as err:
                    session_api.set_session_locale("en")
                self.assertIn("post", str(err.exception).lower())
        finally:
            frappe.session.user = previous_user

    def test_requeue_outbox_api_forwards_to_service(self):
        with patch.object(communication_api, "_assert_dispatch_mutation_access") as access_mock:
            with patch.object(communication_api, "assert_doc_permission") as doc_perm_mock:
                with patch.object(
                    communication_api.communication_logic,
                    "requeue_notification_outbox",
                    return_value={"status": "Queued", "outbox": "OUT-BOX-1"},
                ) as service_mock:
                    result = communication_api.requeue_outbox_item(" OUT-BOX-1 ")

        access_mock.assert_called_once()
        doc_perm_mock.assert_called_once_with("AT Notification Outbox", "OUT-BOX-1", "write")
        service_mock.assert_called_once_with("OUT-BOX-1")
        self.assertEqual(result.get("status"), "Queued")
        self.assertEqual(result.get("outbox"), "OUT-BOX-1")

    def test_task_enqueue_contract_shape(self):
        fake_job = SimpleNamespace(id="job-123")
        with patch.object(task_jobs.frappe, "enqueue", return_value=fake_job):
            renewal = task_jobs.run_renewal_task_job()
            queue_job = task_jobs.run_notification_queue_job(limit=12)
            sync_job = task_jobs.run_accounting_sync_job(limit=34)
            reconciliation_job = task_jobs.run_accounting_reconciliation_job(limit=56)

        self.assertTrue(renewal.get("queued"))
        self.assertEqual(renewal.get("job"), "job-123")
        self.assertEqual(renewal.get("queue"), "long")
        self.assertIn("method", renewal)

        self.assertTrue(queue_job.get("queued"))
        self.assertEqual(queue_job.get("queue"), "default")
        self.assertEqual(queue_job.get("limit"), 12)

        self.assertTrue(sync_job.get("queued"))
        self.assertEqual(sync_job.get("queue"), "long")
        self.assertEqual(sync_job.get("limit"), 34)

        self.assertTrue(reconciliation_job.get("queued"))
        self.assertEqual(reconciliation_job.get("queue"), "long")
        self.assertEqual(reconciliation_job.get("limit"), 56)

    def test_admin_jobs_api_returns_task_payload(self):
        expected = {
            "queued": True,
            "job": "job-999",
            "queue": "long",
            "method": "acentem_takipte.acentem_takipte.accounting.sync_accounting_entries",
            "limit": 1,
        }
        with patch.object(admin_jobs_api, "_assert_admin_job_access") as access_mock:
            with patch.object(admin_jobs_api.task_jobs, "run_accounting_sync_job", return_value=expected) as task_mock:
                result = admin_jobs_api.run_accounting_sync_job(limit=0)

        access_mock.assert_called_once()
        task_mock.assert_called_once_with(limit=1)
        self.assertEqual(result, expected)
