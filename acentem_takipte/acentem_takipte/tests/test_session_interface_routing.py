from __future__ import annotations

from unittest.mock import patch

import frappe
from frappe.tests import IntegrationTestCase

from acentem_takipte.acentem_takipte.api import session as session_api


def _fake_user_get_value(expected_user: str, field_values: dict[str, str | None]):
    def _resolver(doctype: str, name: str, fieldname: str):
        if doctype == "User" and name == expected_user:
            return field_values.get(fieldname)
        return None

    return _resolver


class TestSessionInterfaceRouting(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.db.rollback()

    def test_agent_session_context_prefers_spa(self):
        with patch.object(session_api, "resolve_current_user", return_value="agent@example.com"):
            with patch.object(session_api, "_build_session_capabilities", return_value={}):
                with patch.object(session_api.frappe, "get_roles", return_value=["Agent"]):
                    with patch.object(
                        session_api.frappe.db,
                        "get_value",
                        side_effect=_fake_user_get_value(
                            "agent@example.com",
                            {
                                "full_name": "Agent User",
                                "language": "tr",
                            },
                        ),
                    ):
                        with patch.object(session_api.frappe.defaults, "get_user_default", return_value="AT-Istanbul"):
                            result = session_api.get_session_context()

        self.assertEqual(result["user"], "agent@example.com")
        self.assertEqual(result["roles"], ["Agent"])
        self.assertEqual(result["preferred_home"], "/at")
        self.assertEqual(result["interface_mode"], "spa")
        self.assertEqual(result["branch"], "AT-Istanbul")

    def test_system_manager_session_context_prefers_desk(self):
        with patch.object(session_api, "resolve_current_user", return_value="manager@example.com"):
            with patch.object(session_api, "_build_session_capabilities", return_value={}):
                with patch.object(session_api.frappe, "get_roles", return_value=["System Manager"]):
                    with patch.object(
                        session_api.frappe.db,
                        "get_value",
                        side_effect=_fake_user_get_value(
                            "manager@example.com",
                            {
                                "full_name": "System Manager User",
                                "language": "en",
                            },
                        ),
                    ):
                        with patch.object(session_api.frappe.defaults, "get_user_default", return_value="AT-Ankara"):
                            result = session_api.get_session_context()

        self.assertEqual(result["user"], "manager@example.com")
        self.assertEqual(result["roles"], ["System Manager"])
        self.assertEqual(result["preferred_home"], "/app")
        self.assertEqual(result["interface_mode"], "desk")
        self.assertEqual(result["locale"], "en")
