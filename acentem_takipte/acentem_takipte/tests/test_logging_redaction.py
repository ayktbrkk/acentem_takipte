from __future__ import annotations

from unittest.mock import patch

from frappe.tests import IntegrationTestCase

from acentem_takipte.acentem_takipte.api import security as security_api
from acentem_takipte.acentem_takipte.utils.logging import (
    build_redacted_log_message,
    log_redacted_error,
    redact_payload,
    redact_value,
)


class TestLoggingRedaction(IntegrationTestCase):
    def test_redact_value_masks_sensitive_keys(self):
        self.assertEqual(redact_value("tax_id", "12345678901"), "12*******01")
        self.assertEqual(redact_value("phone", "05321234567"), "05*******67")
        self.assertEqual(redact_value("email", "demo@example.com"), "de************om")
        self.assertEqual(redact_value("recipients", "ops@example.com"), "op***********om")

    def test_redact_payload_masks_nested_sensitive_fields(self):
        payload = {
            "policy_no": "POL-12345",
            "details": {
                "recipient": "05321234567",
                "email": "demo@example.com",
            },
        }

        redacted = redact_payload(payload)
        self.assertEqual(redacted["policy_no"], "PO*****45")
        self.assertEqual(redacted["details"]["recipient"], "05*******67")
        self.assertEqual(redacted["details"]["email"], "de************om")

    def test_audit_admin_action_logs_redacted_payload(self):
        with patch.object(security_api.frappe.session, "user", "manager@example.com"):
            with patch.object(security_api.frappe, "logger") as logger_mock:
                security_api.audit_admin_action(
                    "api.test.action",
                    {"tax_id": "12345678901", "email": "demo@example.com"},
                )

        args = logger_mock.return_value.info.call_args.args
        self.assertEqual(args[0], "AT admin action: %s")
        self.assertEqual(args[1]["details"]["tax_id"], "12*******01")
        self.assertEqual(args[1]["details"]["email"], "de************om")

    def test_build_redacted_log_message_masks_structured_details(self):
        message = build_redacted_log_message(
            "Scheduled Report Outbox Queue Error",
            {"recipient": "ops@example.com", "policy_no": "POL-12345"},
        )

        self.assertIn("Scheduled Report Outbox Queue Error", message)
        self.assertIn("op***********om", message)
        self.assertIn("PO*****45", message)
        self.assertNotIn("ops@example.com", message)
        self.assertNotIn("POL-12345", message)

    def test_log_redacted_error_uses_masked_message(self):
        with patch("frappe.log_error") as log_error_mock:
            with patch("frappe.get_traceback", return_value="trace"):
                log_redacted_error(
                    "AT Notification Outbox Insert Error",
                    details={"recipient": "05321234567", "email": "ops@example.com"},
                )

        args = log_error_mock.call_args.args
        self.assertEqual(args[0], "trace")
        self.assertIn("05*******67", args[1])
        self.assertIn("op***********om", args[1])
        self.assertNotIn("05321234567", args[1])
        self.assertNotIn("ops@example.com", args[1])

