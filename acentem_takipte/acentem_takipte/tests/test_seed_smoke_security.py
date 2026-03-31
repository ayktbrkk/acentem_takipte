from __future__ import annotations

from unittest.mock import MagicMock, patch

import frappe
from frappe.tests.utils import FrappeTestCase as IntegrationTestCase

from acentem_takipte.acentem_takipte.api import seed as seed_api
from acentem_takipte.acentem_takipte.api import smoke as smoke_api
from acentem_takipte.acentem_takipte.api import quick_create as quick_create_api
from acentem_takipte.acentem_takipte.services import quick_create_customer_flow


class TestSeedSmokeSecurity(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.db.rollback()

    def test_seed_demo_data_requires_system_manager(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "restricted.user@example.com"
        try:
            with patch.object(seed_api.frappe, "get_roles", return_value=["Agent"]):
                with self.assertRaises(Exception) as err:
                    seed_api.seed_demo_data(reset_existing=0)
                self.assertIn("system manager", str(err.exception).lower())
        finally:
            frappe.session.user = previous_user

    def test_run_backend_smoke_test_requires_system_manager(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "restricted.user@example.com"
        try:
            with patch.object(smoke_api.frappe, "get_roles", return_value=["Agent"]):
                with self.assertRaises(Exception) as err:
                    smoke_api.run_backend_smoke_test()
                self.assertIn("system manager", str(err.exception).lower())
        finally:
            frappe.session.user = previous_user

    def test_inspect_at_doctype_modules_requires_system_manager(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "restricted.user@example.com"
        try:
            with patch.object(smoke_api.frappe, "get_roles", return_value=["Agent"]):
                with self.assertRaises(Exception) as err:
                    smoke_api.inspect_at_doctype_modules()
                self.assertIn("system manager", str(err.exception).lower())
        finally:
            frappe.session.user = previous_user

    def test_demo_seed_access_checks_create_and_reset_delete_permissions(self):
        with patch.object(seed_api, "assert_non_production_or_feature_flag"):
            with patch.object(seed_api, "assert_mutation_access") as mutation_access:
                with patch.object(seed_api, "assert_doctype_permission") as permission_mock:
                    seed_api._assert_demo_seed_access(reset_existing=1)

        delete_calls = [
            call for call in permission_mock.call_args_list if call.args[1] == "delete"
        ]
        mutation_access.assert_called_once_with(
            action="api.seed.seed_demo_data",
            roles=seed_api.DEMO_SEED_ADMIN_ROLES,
            doctype_permissions=seed_api.SEED_CREATE_DOCTYPES,
            permtype="create",
            details={"reset_existing": True},
            role_message="Only System Manager can run demo seed operations.",
            post_message="Only POST requests are allowed for demo seed operations.",
        )
        self.assertEqual(len(delete_calls), len(seed_api.SEED_DELETE_DOCTYPES))

    def test_smoke_write_access_checks_create_and_delete_permissions(self):
        with patch.object(smoke_api, "assert_non_production_or_feature_flag"):
            with patch.object(smoke_api, "assert_mutation_access") as mutation_access:
                with patch.object(smoke_api, "assert_doctype_permission") as permission_mock:
                    smoke_api._assert_smoke_write_access()

        delete_calls = [
            call for call in permission_mock.call_args_list if call.args[1] == "delete"
        ]
        mutation_access.assert_called_once_with(
            action="api.smoke.run_backend_smoke_test",
            roles=smoke_api.SMOKE_ADMIN_ROLES,
            doctype_permissions=smoke_api.SMOKE_MUTATION_DOCTYPES,
            permtype="create",
            role_message="Only System Manager can run backend smoke tests.",
            post_message="Only POST requests are allowed for backend smoke tests.",
        )
        self.assertEqual(len(delete_calls), len(smoke_api.SMOKE_MUTATION_DOCTYPES))

    def test_quick_create_customer_inserts_without_ignore_permissions(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "manager@example.com"
        try:
            fake_doc = MagicMock()
            fake_doc.name = "AT-CUST-0001"
            with patch.object(quick_create_customer_flow, "_assert_create_permission"):
                with patch.object(quick_create_customer_flow.frappe, "get_doc", return_value=fake_doc):
                    with patch.object(quick_create_customer_flow.frappe.db, "commit"):
                        quick_create_customer_flow.create_quick_customer(full_name="Test User", tax_id="12345678901")

            fake_doc.insert.assert_called_once_with()
        finally:
            frappe.session.user = previous_user

    def test_seed_demo_data_includes_notification_template_summary(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "Administrator"
        try:
            with patch.object(seed_api, "_assert_demo_seed_access"):
                with patch.object(seed_api, "_pick_demo_agent", return_value="Administrator"):
                    with patch.object(seed_api, "upsert_default_notification_templates", return_value={"created": 2, "updated": 0, "total": 2}):
                        with patch.object(seed_api, "_upsert_by_name"):
                            with patch.object(seed_api, "_upsert_sales_entity", side_effect=[
                                frappe._dict(name="MAIN"),
                                frappe._dict(name="ALPHA"),
                                frappe._dict(name="REP"),
                            ]):
                                with patch.object(seed_api, "_upsert_lead"):
                                    with patch.object(seed_api, "_upsert_renewal_task"):
                                        with patch.object(seed_api.frappe.db, "commit"):
                                            with patch.object(seed_api.frappe, "get_attr", return_value=lambda: {"ok": True}):
                                                summary = seed_api.seed_demo_data(reset_existing=0)

            self.assertEqual(summary["notification_templates"], 2)
            self.assertEqual(summary["dashboard"], {"ok": True})
        finally:
            frappe.session.user = previous_user

    def test_upsert_renewal_task_builds_stage_aware_unique_key(self):
        values = {
            "policy": "POL-0001",
            "customer": "CUS-0001",
            "renewal_date": "2026-03-13",
            "due_date": "2026-03-06",
        }
        fake_doc = MagicMock()

        with patch.object(seed_api.frappe.db, "get_value", return_value=None):
            with patch.object(seed_api.frappe, "get_doc", return_value=fake_doc) as get_doc_mock:
                seed_api._upsert_renewal_task(values)
                get_doc_mock.assert_called_once()

        self.assertEqual(values["unique_key"], "POL-0001:CUS-0001:D7:2026-03-06")



