from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

from frappe.tests.utils import FrappeTestCase as IntegrationTestCase

import acentem_takipte.acentem_takipte.services.ops_alerts as ops_alerts


class TestOpsAlerts(IntegrationTestCase):
    def test_run_error_log_alert_monitor_sends_slack_and_telegram(self):
        rows = [
            SimpleNamespace(
                name="ERR-0001",
                method="[Break-Glass Audit] APPROVED | AT0001",
                error="Break-glass provider integration failed after approval.",
                creation="2026-05-04 10:00:00",
            )
        ]
        sent = []
        cache = SimpleNamespace(store={})
        cache.get_value = lambda key: cache.store.get(key)
        cache.set_value = lambda key, value: cache.store.__setitem__(key, value)

        with patch.object(ops_alerts.frappe, "get_site_config", return_value={
            "at_ops_alert_slack_webhook_url": "https://hooks.slack.test/services/demo",
            "at_ops_alert_telegram_bot_token": "bot-token",
            "at_ops_alert_telegram_chat_id": "1234",
            "sentry_environment": "staging",
        }), patch.object(ops_alerts.frappe, "get_all", return_value=rows), patch.object(
            ops_alerts.frappe, "cache", return_value=cache
        ), patch.object(
            ops_alerts.frappe, "local", SimpleNamespace(site="at.localhost")
        ), patch.object(
            ops_alerts, "get_url", side_effect=lambda path: f"https://at.localhost:8000{path}"
        ), patch.object(
            ops_alerts,
            "make_post_request",
            side_effect=lambda url, data=None, **kwargs: sent.append({"url": url, "data": data}),
        ):
            summary = ops_alerts.run_error_log_alert_monitor()

        self.assertEqual(summary["matched"], 1)
        self.assertTrue(summary["alerted"])
        self.assertEqual(summary["channels"], ["slack", "telegram"])
        self.assertEqual(len(sent), 2)
        self.assertTrue(sent[0]["data"]["text"].startswith("AT ops alert: 1 critical Error Log entries"))
        self.assertIn("Site: at.localhost", sent[0]["data"]["text"])
        self.assertIn("Environment: staging", sent[0]["data"]["text"])
        self.assertIn("https://at.localhost:8000/app/error-log/ERR-0001", sent[0]["data"]["text"])

    def test_run_error_log_alert_monitor_skips_when_fingerprint_already_alerted(self):
        rows = [
            SimpleNamespace(
                name="ERR-0002",
                method="Sentry Initialization Error",
                error="Sentry provider integration failed.",
                creation="2026-05-04 10:30:00",
            )
        ]
        fingerprint = ops_alerts._build_fingerprint([
            {
                "name": "ERR-0002",
                "title": "Sentry Initialization Error",
                "creation": "2026-05-04 10:30:00",
                "excerpt": "Sentry provider integration failed.",
            }
        ])
        cache = SimpleNamespace(store={ops_alerts.ALERT_CACHE_KEY: fingerprint})
        cache.get_value = lambda key: cache.store.get(key)
        cache.set_value = lambda key, value: cache.store.__setitem__(key, value)
        sent = []

        with patch.object(ops_alerts.frappe, "get_site_config", return_value={
            "at_ops_alert_slack_webhook_url": "https://hooks.slack.test/services/demo"
        }), patch.object(ops_alerts.frappe, "get_all", return_value=rows), patch.object(
            ops_alerts.frappe, "cache", return_value=cache
        ), patch.object(
            ops_alerts.frappe, "local", SimpleNamespace(site="at.localhost")
        ), patch.object(
            ops_alerts, "get_url", side_effect=lambda path: f"https://at.localhost:8000{path}"
        ), patch.object(
            ops_alerts,
            "make_post_request",
            side_effect=lambda *args, **kwargs: sent.append(args),
        ):
            summary = ops_alerts.run_error_log_alert_monitor()

        self.assertEqual(summary["matched"], 1)
        self.assertFalse(summary["alerted"])
        self.assertEqual(sent, [])

    def test_run_error_log_alert_monitor_ignores_generic_non_integration_errors(self):
        rows = [
            SimpleNamespace(
                name="ERR-0003",
                method="Acentem Takipte /at bootstrap failed",
                error="Template render failed after a local route exception.",
                creation="2026-05-04 10:45:00",
            )
        ]
        cache = SimpleNamespace(store={})
        cache.get_value = lambda key: cache.store.get(key)
        cache.set_value = lambda key, value: cache.store.__setitem__(key, value)
        sent = []

        with patch.object(ops_alerts.frappe, "get_site_config", return_value={
            "at_ops_alert_slack_webhook_url": "https://hooks.slack.test/services/demo"
        }), patch.object(ops_alerts.frappe, "get_all", return_value=rows), patch.object(
            ops_alerts.frappe, "cache", return_value=cache
        ), patch.object(
            ops_alerts.frappe, "local", SimpleNamespace(site="at.localhost")
        ), patch.object(
            ops_alerts, "get_url", side_effect=lambda path: f"https://at.localhost:8000{path}"
        ), patch.object(
            ops_alerts,
            "make_post_request",
            side_effect=lambda *args, **kwargs: sent.append(args),
        ):
            summary = ops_alerts.run_error_log_alert_monitor()

        self.assertEqual(summary["matched"], 0)
        self.assertFalse(summary["alerted"])
        self.assertEqual(sent, [])

    def test_preview_error_log_alert_monitor_returns_message_without_dispatch(self):
        rows = [
            SimpleNamespace(
                name="ERR-0004",
                method="Provider Router Error",
                error="Telegram integration timed out during webhook delivery.",
                creation="2026-05-04 11:00:00",
            )
        ]
        with patch.object(ops_alerts.frappe, "get_site_config", return_value={"sentry_environment": "production"}), patch.object(
            ops_alerts.frappe, "get_all", return_value=rows
        ), patch.object(
            ops_alerts.frappe, "local", SimpleNamespace(site="at.localhost")
        ), patch.object(
            ops_alerts, "now_datetime", return_value="2026-05-04 11:15:00"
        ), patch.object(
            ops_alerts, "add_to_date", side_effect=lambda value, **kwargs: value
        ), patch.object(
            ops_alerts, "get_url", side_effect=lambda path: f"https://at.localhost:8000{path}"
        ):
            summary = ops_alerts.preview_error_log_alert_monitor(window_minutes=15)

        self.assertEqual(summary["matched"], 1)
        self.assertFalse(summary["alerted"])
        self.assertEqual(summary["channels"], [])
        self.assertEqual(summary["rows"][0]["name"], "ERR-0004")
        self.assertIn("Environment: production", summary["message"])
        self.assertIn("https://at.localhost:8000/app/error-log/ERR-0004", summary["message"])

    def test_preview_groups_duplicate_error_log_rows_by_title(self):
        rows = [
            SimpleNamespace(
                name="ERR-0101",
                method="[Break-Glass Audit] APPROVED | AT0009",
                error="Short excerpt.",
                creation="2026-05-04 11:00:00",
            ),
            SimpleNamespace(
                name="ERR-0102",
                method="[Break-Glass Audit] APPROVED | AT0009",
                error="Longer break-glass approval excerpt with extra details for the same request.",
                creation="2026-05-04 11:02:00",
            ),
        ]

        with patch.object(ops_alerts.frappe, "get_site_config", return_value={}), patch.object(
            ops_alerts.frappe, "get_all", return_value=rows
        ), patch.object(
            ops_alerts.frappe, "local", SimpleNamespace(site="at.localhost")
        ), patch.object(
            ops_alerts, "now_datetime", return_value="2026-05-04 11:15:00"
        ), patch.object(
            ops_alerts, "add_to_date", side_effect=lambda value, **kwargs: value
        ), patch.object(
            ops_alerts, "get_url", side_effect=lambda path: f"https://at.localhost:8000{path}"
        ):
            summary = ops_alerts.preview_error_log_alert_monitor(window_minutes=15)

        self.assertEqual(summary["matched"], 1)
        self.assertEqual(summary["rows"][0]["count"], 2)
        self.assertEqual(summary["rows"][0]["name"], "ERR-0102")
        self.assertIn("Duplicates: 2", summary["message"])