from __future__ import annotations

from unittest.mock import patch

import frappe
from frappe.tests import IntegrationTestCase

from acentem_takipte.acentem_takipte.api import dashboard as dashboard_api


class TestDashboardScope(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.db.rollback()

    def test_agent_without_assignments_gets_empty_scope_by_default(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "agent.scope@example.com"
        try:
            with patch.object(dashboard_api.frappe, "get_site_config", return_value={}):
                with patch.object(dashboard_api.frappe, "get_roles", return_value=["Agent"]):
                    with patch.object(dashboard_api.dashboard_security, "user_can_access_all_office_branches", return_value=False):
                        with patch.object(dashboard_api.dashboard_security, "get_allowed_office_branch_names", return_value=set()):
                            with patch.object(dashboard_api.frappe, "get_all", return_value=[]):
                                allowed_customers, meta = dashboard_api._allowed_customers_for_user(include_meta=True)
        finally:
            frappe.session.user = previous_user

        self.assertEqual(allowed_customers, [])
        self.assertEqual(meta.get("access_scope"), "empty")
        self.assertEqual(meta.get("scope_reason"), "agent_unassigned")

    def test_dashboard_tab_payload_returns_scope_meta_for_empty_scope(self):
        expected_meta = {"access_scope": "empty", "scope_reason": "agent_unassigned"}
        with patch.object(dashboard_api, "_allowed_customers_for_user", return_value=([], expected_meta)):
            payload = dashboard_api.get_dashboard_tab_payload(tab="daily", filters={})

        self.assertEqual(payload.get("tab"), "daily")
        self.assertEqual(payload.get("meta"), expected_meta)
        self.assertEqual(payload.get("series"), {})
        self.assertEqual(payload.get("previews"), {})

    def test_unmapped_system_user_is_denied_without_fallback_flag(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "no.role@example.com"
        try:
            with patch.object(dashboard_api.frappe, "get_site_config", return_value={}):
                with patch.object(dashboard_api.frappe, "get_roles", return_value=[]):
                    with patch.object(dashboard_api.frappe.db, "get_value", return_value="System User"):
                        with self.assertRaises(frappe.PermissionError):
                            dashboard_api._allowed_customers_for_user()
        finally:
            frappe.session.user = previous_user

    def test_fallback_flag_restores_global_scope_for_unassigned_agent(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "agent.scope@example.com"
        try:
            with patch.object(
                dashboard_api.frappe,
                "get_site_config",
                return_value={"at_dashboard_allow_bootstrap_global_fallback": 1},
            ):
                with patch.object(dashboard_api.frappe, "get_roles", return_value=["Agent"]):
                    with patch.object(dashboard_api.dashboard_security, "user_can_access_all_office_branches", return_value=False):
                        with patch.object(dashboard_api.dashboard_security, "get_allowed_office_branch_names", return_value=set()):
                            with patch.object(dashboard_api.frappe, "get_all", return_value=[]):
                                allowed_customers, meta = dashboard_api._allowed_customers_for_user(include_meta=True)
        finally:
            frappe.session.user = previous_user

        self.assertIsNone(allowed_customers)
        self.assertEqual(meta.get("access_scope"), "global")
        self.assertEqual(meta.get("scope_reason"), "bootstrap_fallback_enabled")

    def test_manager_with_branch_assignment_gets_branch_scoped_customers(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "manager.scope@example.com"
        try:
            with patch.object(dashboard_api.frappe, "get_site_config", return_value={}):
                with patch.object(dashboard_api.frappe, "get_roles", return_value=["Manager"]):
                    with patch.object(dashboard_api.dashboard_security, "user_can_access_all_office_branches", return_value=False):
                        with patch.object(dashboard_api.dashboard_security, "get_allowed_office_branch_names", return_value={"ANK"}):
                            with patch.object(dashboard_api.frappe, "get_all", return_value=["CUST-0001"]):
                                allowed_customers, meta = dashboard_api._allowed_customers_for_user(include_meta=True)
        finally:
            frappe.session.user = previous_user

        self.assertEqual(allowed_customers, ["CUST-0001"])
        self.assertEqual(meta.get("access_scope"), "scoped")
        self.assertEqual(meta.get("scope_reason"), "branch_assignment")

    def test_agent_scope_intersects_assigned_customers_with_branch_scope(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "agent.scope@example.com"
        captured = {}
        try:
            with patch.object(dashboard_api.frappe, "get_site_config", return_value={}):
                with patch.object(dashboard_api.frappe, "get_roles", return_value=["Agent"]):
                    with patch.object(dashboard_api.dashboard_security, "user_can_access_all_office_branches", return_value=False):
                        with patch.object(dashboard_api.dashboard_security, "get_allowed_office_branch_names", return_value={"ANK"}):
                            def _fake_get_all(doctype, filters=None, pluck=None, limit_page_length=0):
                                captured["filters"] = filters
                                return ["CUST-0002"]

                            with patch.object(
                                dashboard_api.frappe,
                                "get_all",
                                side_effect=_fake_get_all,
                            ):
                                allowed_customers, meta = dashboard_api._allowed_customers_for_user(include_meta=True)
        finally:
            frappe.session.user = previous_user

        self.assertEqual(allowed_customers, ["CUST-0002"])
        self.assertEqual(captured["filters"]["assigned_agent"], "agent.scope@example.com")
        self.assertEqual(captured["filters"]["office_branch"], ["in", ["ANK"]])
        self.assertEqual(meta.get("scope_reason"), "agent_assignment")


