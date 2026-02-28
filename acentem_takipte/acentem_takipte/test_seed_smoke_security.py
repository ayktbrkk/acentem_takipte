from __future__ import annotations

from unittest.mock import patch

import frappe
from frappe.tests import IntegrationTestCase

from acentem_takipte.api import seed as seed_api
from acentem_takipte.api import smoke as smoke_api


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

