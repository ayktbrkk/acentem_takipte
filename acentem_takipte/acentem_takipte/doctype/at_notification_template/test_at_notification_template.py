from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase as IntegrationTestCase

from acentem_takipte.acentem_takipte.doctype.at_notification_template.at_notification_template import (
    render_notification_template,
)


class TestATNotificationTemplate(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.db.rollback()

    def test_render_notification_template_requires_authentication(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "Guest"
        try:
            with self.assertRaises(Exception) as error:
                render_notification_template("ANY_TEMPLATE", context={})
            self.assertIn("authentication", str(error.exception).lower())
        finally:
            frappe.session.user = previous_user



