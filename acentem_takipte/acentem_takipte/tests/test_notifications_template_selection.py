from __future__ import annotations

from unittest.mock import patch

import frappe
from frappe.tests import IntegrationTestCase

from acentem_takipte.acentem_takipte import notifications


class TestNotificationTemplateSelection(IntegrationTestCase):
    def test_create_notification_drafts_filters_by_template_key(self):
        templates = [
            frappe._dict(
                name="TPL-30",
                template_key="renewal_reminder_30",
                channel="WHATSAPP",
                language="tr",
                subject="Hatirlatma",
                body_template="Genel",
                sms_body_template=None,
                email_body_template=None,
                whatsapp_body_template="WhatsApp 30",
                provider_template_name="renewal_reminder_30",
            ),
            frappe._dict(
                name="TPL-15",
                template_key="renewal_reminder_15",
                channel="WHATSAPP",
                language="tr",
                subject="Hatirlatma",
                body_template="Genel",
                sms_body_template=None,
                email_body_template=None,
                whatsapp_body_template="WhatsApp 15",
                provider_template_name="renewal_reminder_15",
            ),
        ]

        inserted_payloads = []

        class FakeDraftDoc:
            def __init__(self, payload):
                self.payload = payload
                self.name = payload["template"]

            def insert(self, ignore_permissions=True):
                inserted_payloads.append(self.payload)
                return self

        with patch.object(notifications.frappe, "get_all", return_value=templates):
            with patch.object(notifications, "_get_customer_payload", return_value={"phone": "905551112233"}):
                with patch.object(notifications, "_enqueue_draft_safe"):
                    with patch.object(notifications.frappe, "get_doc", side_effect=lambda payload: FakeDraftDoc(payload)):
                        created = notifications.create_notification_drafts(
                            event_key="renewal_due",
                            template_key="renewal_reminder_15",
                            reference_doctype="AT Renewal Task",
                            reference_name="REN-0001",
                            customer="CUS-0001",
                            context={},
                        )

        self.assertEqual(created, ["TPL-15"])
        self.assertEqual(inserted_payloads[0]["provider_template_name"], "renewal_reminder_15")
        self.assertEqual(inserted_payloads[0]["body"], "WhatsApp 15")

    def test_resolve_body_template_for_channel_prefers_whatsapp_template(self):
        template = frappe._dict(
            body_template="Genel",
            whatsapp_body_template="WhatsApp Govde",
            sms_body_template=None,
            email_body_template=None,
        )

        self.assertEqual(
            notifications._resolve_body_template_for_channel(template, "WHATSAPP"),
            "WhatsApp Govde",
        )
