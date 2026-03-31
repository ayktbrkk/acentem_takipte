from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase as IntegrationTestCase

from acentem_takipte.acentem_takipte.api import security as security_api


class TestSecurityHelpers(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.local.request = None
        frappe.db.rollback()

    def test_assert_post_request_rejects_blank_method(self):
        previous_request = getattr(frappe.local, "request", None)
        frappe.local.request = SimpleNamespace(method="")
        try:
            with self.assertRaises(Exception) as err:
                security_api.assert_post_request()
            self.assertIn("post", str(err.exception).lower())
        finally:
            frappe.local.request = previous_request

    def test_assert_doctype_permission_requires_authentication_before_permission_lookup(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "Guest"
        try:
            with patch.object(security_api.frappe, "has_permission") as permission_mock:
                with self.assertRaises(Exception) as err:
                    security_api.assert_doctype_permission("AT Customer", "read")
                self.assertIn("authentication", str(err.exception).lower())
                permission_mock.assert_not_called()
        finally:
            frappe.session.user = previous_user

    def test_assert_doc_permission_requires_authentication_before_doc_lookup(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "Guest"
        try:
            with patch.object(security_api.frappe, "get_doc") as get_doc_mock:
                with self.assertRaises(Exception) as err:
                    security_api.assert_doc_permission("AT Customer", "AT-CUST-0001")
                self.assertIn("authentication", str(err.exception).lower())
                get_doc_mock.assert_not_called()
        finally:
            frappe.session.user = previous_user


