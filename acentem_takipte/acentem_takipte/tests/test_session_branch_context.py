from __future__ import annotations

from unittest.mock import patch

from frappe.tests import IntegrationTestCase

from acentem_takipte.api import session as session_api


class TestSessionBranchContext(IntegrationTestCase):
    def test_get_session_context_includes_office_branch_payload(self):
        with patch.object(session_api, "resolve_current_user", return_value="agent@example.com"):
            with patch.object(session_api.frappe, "get_site_config", return_value={}):
            with patch.object(session_api.frappe.db, "get_value", side_effect=["Agent User", "tr"]):
                with patch.object(session_api, "_resolve_session_interface", return_value={"roles": ["Agent"], "preferred_home": "/at", "interface_mode": "spa"}):
                    with patch.object(session_api, "get_user_office_branches", return_value=[{"name": "BR-1"}]):
                        with patch.object(session_api, "get_default_office_branch", return_value="BR-1"):
                            with patch.object(session_api, "user_can_access_all_office_branches", return_value=False):
                                with patch.object(session_api.frappe.defaults, "get_user_default", return_value=None):
                                    with patch.object(session_api, "_build_session_capabilities", return_value={}):
                                        payload = session_api.get_session_context()

        self.assertEqual(payload["office_branches"], [{"name": "BR-1"}])
        self.assertEqual(payload["default_office_branch"], "BR-1")
        self.assertEqual(payload["can_access_all_office_branches"], False)
        self.assertEqual(payload["realtime"], {"enabled": False, "port": None})

    def test_get_session_context_includes_enabled_realtime_config(self):
        site_config = {"at_realtime_enabled": True, "at_realtime_port": 9100}

        with patch.object(session_api, "resolve_current_user", return_value="agent@example.com"):
            with patch.object(session_api.frappe, "get_site_config", return_value=site_config):
                with patch.object(session_api.frappe.db, "get_value", side_effect=["Agent User", "tr"]):
                    with patch.object(session_api, "_resolve_session_interface", return_value={"roles": ["Agent"], "preferred_home": "/at", "interface_mode": "spa"}):
                        with patch.object(session_api, "get_user_office_branches", return_value=[]):
                            with patch.object(session_api, "get_default_office_branch", return_value=None):
                                with patch.object(session_api, "user_can_access_all_office_branches", return_value=False):
                                    with patch.object(session_api.frappe.defaults, "get_user_default", return_value=None):
                                        with patch.object(session_api, "_build_session_capabilities", return_value={}):
                                            payload = session_api.get_session_context()

        self.assertEqual(payload["realtime"], {"enabled": True, "port": 9100})
