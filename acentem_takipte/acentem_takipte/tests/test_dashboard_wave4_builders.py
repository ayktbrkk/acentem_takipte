from __future__ import annotations

import importlib
import sys
import types
import unittest
from datetime import date, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import patch


_ORIGINAL_MODULES = {
    name: sys.modules.get(name)
    for name in ("frappe", "frappe.utils")
}


def _install_frappe_stub(*, sql_impl=None, get_all_impl=None, get_list_impl=None):
    frappe_mod = types.ModuleType("frappe")
    utils_mod = types.ModuleType("frappe.utils")

    utils_mod.cint = lambda value=0: int(value or 0)
    utils_mod.flt = lambda value=0: float(value or 0)
    utils_mod.getdate = lambda value=None: _as_date(value)
    utils_mod.add_days = lambda value, days: _as_date(value) + timedelta(days=days)

    class _DB:
        def __init__(self, impl):
            self._impl = impl or (lambda query, values=None, as_dict=False: [])
            self.calls = []

        def sql(self, query, values=None, as_dict=False):
            self.calls.append(
                {
                    "query": query,
                    "values": values,
                    "as_dict": as_dict,
                }
            )
            return self._impl(query, values=values, as_dict=as_dict)

    frappe_mod.db = _DB(sql_impl)
    get_reader_impl = get_list_impl or get_all_impl or (lambda *args, **kwargs: [])
    frappe_mod.get_all = get_reader_impl
    frappe_mod.get_list = get_reader_impl
    frappe_mod.utils = utils_mod

    sys.modules["frappe"] = frappe_mod
    sys.modules["frappe.utils"] = utils_mod
    return frappe_mod


def _reload(module_name: str):
    sys.modules.pop(module_name, None)
    return importlib.import_module(module_name)


def _as_date(value):
    if isinstance(value, date):
        return value
    if isinstance(value, datetime):
        return value.date()
    return datetime.strptime(str(value), "%Y-%m-%d").date()


class DashboardWave4BuilderTests(unittest.TestCase):
    def tearDown(self):
        for name in [
            "acentem_takipte.acentem_takipte.api.v2.queries_kpis",
            "acentem_takipte.acentem_takipte.api.v2.tab_payload",
            "acentem_takipte.acentem_takipte.api.v2.details_lead",
            "acentem_takipte.acentem_takipte.api.v2.details_offer",
        ]:
            sys.modules.pop(name, None)

        for name in ("frappe", "frappe.utils"):
            original = _ORIGINAL_MODULES.get(name)
            if original is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = original

    def test_queries_kpis_builder_contract(self):
        responses = [
            [{"status": "Active", "total": 2, "total_gwp_try": 1200}],
            [{"insurance_company": "COMP-1", "company_name": "Acme", "policy_count": 2, "total_gwp_try": 1200, "total_commission": 120}],
            [{"status": "Open", "total": 3}],
        ]

        def fake_sql(query, values=None, as_dict=False):
            self.assertTrue(as_dict)
            return responses.pop(0)

        _install_frappe_stub(sql_impl=fake_sql)
        mod = _reload("acentem_takipte.acentem_takipte.api.v2.queries_kpis")

        with patch.object(mod, "_get_lead_status_rows", return_value=[{"status": "Open", "total": 3}]):
            payload = mod.build_dashboard_kpis_payload(
                from_date="2026-02-01",
                to_date="2026-02-26",
                period_comparison="previous_period",
                branch="Istanbul",
                months=6,
                allowed_customers=["CUST-1"],
                scope_meta={"access_scope": "scoped"},
                build_policy_where_fn=lambda **kwargs: ("1=1", kwargs),
                dashboard_cards_summary_fn=lambda **kwargs: {"policy_count": 9, "gwp_try": 12345}
                if kwargs.get("from_date") == "2026-02-01"
                else {"policy_count": 6, "gwp_try": 10000},
                build_lead_where_fn=lambda **kwargs: ("1=1", kwargs),
                monthly_commission_trend_fn=lambda **kwargs: [{"month": "2026-02", "commission_try": 123}],
            )

        self.assertEqual(payload["cards"]["policy_count"], 9)
        self.assertEqual(payload["meta"]["access_scope"], "scoped")
        self.assertEqual(payload["policy_status"][0]["status"], "Active")
        self.assertEqual(payload["lead_status"][0]["total"], 3)
        self.assertEqual(payload["commission_trend"][0]["month"], "2026-02")
        self.assertEqual(payload["comparison"]["mode"], "previous_period")
        self.assertEqual(payload["comparison"]["cards"]["policy_count"], 6)
        self.assertEqual(payload["comparison"]["delta"]["policy_count"]["delta"], 3.0)
        self.assertEqual(payload["comparison"]["delta"]["policy_count"]["direction"], "up")
        self.assertEqual(len(responses), 1)

    def test_tab_payload_builder_daily_contract(self):
        responses = [
            [
                {"status": "Sent", "total": 2},
                {"status": "Accepted", "total": 1},
                {"status": "Rejected", "total": 1},
                {"status": "Converted", "total": 2},
            ],
            [
                {"status": "Pending", "total": 4},
                {"status": "Paid", "total": 3},
            ],
            [
                {"payment_direction": "Incoming", "total": 5, "paid_amount_try": 1000},
                {"payment_direction": "Outgoing", "total": 1, "paid_amount_try": 100},
            ],
            [{"total_count": 2, "total_amount_try": 450}],
            [{"total_count": 3, "total_amount_try": 900}],
        ]

        def fake_sql(query, values=None, as_dict=False):
            self.assertTrue(as_dict)
            return responses.pop(0)

        _install_frappe_stub(sql_impl=fake_sql)
        mod = _reload("acentem_takipte.acentem_takipte.api.v2.tab_payload")

        payload = mod.build_dashboard_tab_sections(
            tab_key="daily",
            from_date="2026-02-01",
            to_date="2026-02-26",
            branch=None,
            months=6,
            allowed_customers=["CUST-1"],
            build_offer_where_fn=lambda **kwargs: ("1=1", kwargs),
            build_lead_where_fn=lambda **kwargs: ("1=1", kwargs),
            build_policy_where_fn=lambda **kwargs: ("1=1", kwargs),
            build_payment_where_fn=lambda **kwargs: ("1=1", kwargs),
            build_payment_collection_where_fn=lambda **kwargs: ("1=1", kwargs),
            get_offer_preview_rows_fn=lambda **kwargs: [{"name": "OFF-1"}],
            get_lead_preview_rows_fn=lambda **kwargs: [{"name": "LEAD-1"}],
            get_policy_preview_rows_fn=lambda **kwargs: [{"name": "POL-1"}],
            get_top_companies_rows_fn=lambda **kwargs: [{"company_name": "Acme"}],
            get_renewal_task_preview_rows_fn=lambda **kwargs: [{"name": "REN-1"}],
            get_offer_waiting_renewal_summary_fn=lambda **kwargs: {"count": 2, "rows": [{"name": "REN-WAIT-1"}]},
            get_payment_preview_rows_fn=lambda **kwargs: [{"name": "PAY-1"}],
            get_reconciliation_open_rows_preview_fn=lambda **kwargs: [{"name": "REC-1"}],
            monthly_commission_trend_fn=lambda **kwargs: [{"month": "2026-02", "commission_try": 321}],
            renewal_status_and_buckets_fn=lambda **kwargs: {
                "status_rows": [{"status": "Open", "total": 4}],
                "buckets": {"overdue": 1, "due7": 2, "due30": 3},
            },
            reconciliation_open_summary_fn=lambda **kwargs: {"open_count": 5, "open_difference_try": 99.5},
        )

        metrics = payload["metrics"]
        self.assertEqual(metrics["ready_offer_count"], 3)
        self.assertEqual(metrics["accepted_offer_count"], 1)
        self.assertEqual(metrics["converted_offer_count"], 2)
        self.assertAlmostEqual(metrics["offer_acceptance_rate"], 25.0)
        self.assertAlmostEqual(metrics["offer_conversion_rate"], 40.0)
        self.assertEqual(metrics["renewal_overdue_count"], 1)
        self.assertEqual(metrics["offer_waiting_count"], 2)
        self.assertEqual(metrics["due_today_collection_count"], 2)
        self.assertEqual(metrics["overdue_collection_count"], 3)
        self.assertAlmostEqual(metrics["due_today_collection_amount_try"], 450.0)
        self.assertAlmostEqual(metrics["overdue_collection_amount_try"], 900.0)
        self.assertEqual(metrics["reconciliation_open_count"], 5)

        self.assertIn("offer_status", payload["series"])
        self.assertIn("renewal_status", payload["series"])
        self.assertIn("payment_status", payload["series"])
        self.assertIn("payment_direction", payload["series"])

        self.assertIn("action_offers", payload["previews"])
        self.assertIn("renewal_tasks", payload["previews"])
        self.assertIn("offer_waiting_renewals", payload["previews"])
        self.assertIn("payments", payload["previews"])
        self.assertIn("due_today_payments", payload["previews"])
        self.assertIn("overdue_payments", payload["previews"])
        self.assertIn("reconciliation_rows", payload["previews"])
        self.assertNotIn("offers", payload["previews"])
        self.assertFalse(responses)

    def test_lead_detail_builder_contract_and_activity_trim(self):
        frappe_calls = []

        def fake_get_all(doctype, **kwargs):
            frappe_calls.append((doctype, kwargs))
            if doctype == "AT Offer":
                return [{"name": "OFF-1"}]
            if doctype == "AT Policy":
                return [{"name": "POL-1"}]
            return []

        _install_frappe_stub(get_all_impl=fake_get_all)
        mod = _reload("acentem_takipte.acentem_takipte.api.v2.details_lead")

        captured = {}

        def _capture(name, result):
            def _inner(**kwargs):
                captured[name] = kwargs
                return result

            return _inner

        lead = SimpleNamespace(
            name="LEAD-1",
            customer="CUST-1",
            converted_offer="OFF-1",
            converted_policy="POL-1",
        )
        payload = mod.build_lead_detail_payload(
            lead,
            get_offer_link_preview_fn=lambda name: {"name": name},
            get_policy_link_preview_fn=lambda name: {"name": name},
            lead_detail_activity_events_fn=lambda doc: [{"t": i} for i in range(10)],
            access_log_events_fn=lambda doctype, name: [{"t": i} for i in range(10, 16)],
            sort_activity_events_fn=lambda rows: list(reversed(rows)),
            get_notification_draft_preview_rows_fn=_capture("drafts", [{"name": "DR-1"}]),
            get_notification_outbox_preview_rows_fn=_capture("outbox", [{"name": "OB-1"}]),
            get_payment_detail_preview_rows_fn=_capture("payments", [{"name": "PAY-1"}]),
            get_renewal_detail_preview_rows_fn=_capture("renewals", [{"name": "REN-1"}]),
        )

        self.assertEqual(payload["linked_offer"]["name"], "OFF-1")
        self.assertEqual(payload["linked_policy"]["name"], "POL-1")
        self.assertEqual(len(payload["activity"]), 12)
        self.assertEqual(payload["related_offers"][0]["name"], "OFF-1")
        self.assertEqual(payload["related_policies"][0]["name"], "POL-1")
        self.assertEqual(captured["drafts"]["customer"], "CUST-1")
        self.assertEqual(captured["payments"]["policy"], "POL-1")
        self.assertEqual(len(captured["drafts"]["references"]), 3)
        self.assertEqual([call[0] for call in frappe_calls], ["AT Offer", "AT Policy"])

    def test_offer_detail_builder_contract_and_related_filters(self):
        frappe_calls = []

        def fake_get_all(doctype, **kwargs):
            frappe_calls.append((doctype, kwargs))
            if doctype == "AT Offer":
                return [{"name": "OFF-2"}]
            if doctype == "AT Policy":
                return [{"name": "POL-9"}]
            return []

        _install_frappe_stub(get_all_impl=fake_get_all)
        mod = _reload("acentem_takipte.acentem_takipte.api.v2.details_offer")

        captured = {}

        def _capture(name, result):
            def _inner(**kwargs):
                captured[name] = kwargs
                return result

            return _inner

        offer = SimpleNamespace(
            name="OFF-1",
            customer="CUST-1",
            source_lead="LEAD-1",
            converted_policy="POL-9",
        )
        payload = mod.build_offer_detail_payload(
            offer,
            get_lead_link_preview_fn=lambda name: {"name": name},
            get_policy_link_preview_fn=lambda name: {"name": name},
            offer_detail_activity_events_fn=lambda doc: [{"t": i} for i in range(8)],
            access_log_events_fn=lambda doctype, name: [{"t": i} for i in range(8, 14)],
            sort_activity_events_fn=lambda rows: rows,
            get_notification_draft_preview_rows_fn=_capture("drafts", [{"name": "DR-1"}]),
            get_notification_outbox_preview_rows_fn=_capture("outbox", [{"name": "OB-1"}]),
            get_payment_detail_preview_rows_fn=_capture("payments", [{"name": "PAY-1"}]),
            get_renewal_detail_preview_rows_fn=_capture("renewals", [{"name": "REN-1"}]),
        )

        self.assertEqual(payload["source_lead"]["name"], "LEAD-1")
        self.assertEqual(payload["linked_policy"]["name"], "POL-9")
        self.assertEqual(len(payload["activity"]), 12)
        self.assertEqual(len(captured["outbox"]["references"]), 3)
        self.assertEqual(captured["renewals"]["policy"], "POL-9")
        self.assertEqual(frappe_calls[0][0], "AT Offer")
        # `AT Offer` related list should exclude the current offer name.
        self.assertEqual(frappe_calls[0][1]["filters"][1], ["name", "!=", "OFF-1"])


if __name__ == "__main__":
    unittest.main()
