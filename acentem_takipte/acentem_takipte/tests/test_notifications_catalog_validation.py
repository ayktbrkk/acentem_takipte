from __future__ import annotations

from unittest.mock import patch

from frappe.tests.utils import FrappeTestCase as IntegrationTestCase

from acentem_takipte.acentem_takipte import notifications


class TestNotificationCatalogValidation(IntegrationTestCase):
    def test_create_notification_drafts_rejects_invalid_template_key_for_event(self):
        with patch.object(notifications.frappe, "get_all", return_value=[]):
            created = notifications.create_notification_drafts(
                event_key="payment_due",
                template_key="policy_delivery",
                reference_doctype="AT Payment",
                reference_name="PAY-0001",
                customer="CUS-0001",
                context={},
                enqueue=False,
            )

        self.assertEqual(created, [])




