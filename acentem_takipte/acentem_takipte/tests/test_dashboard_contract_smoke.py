from __future__ import annotations

import unittest
from unittest.mock import patch

from acentem_takipte.acentem_takipte.api import dashboard as dashboard_api
from acentem_takipte.acentem_takipte.api.dashboard_v2 import security as dashboard_security


class TestDashboardContractSmoke(unittest.TestCase):
    def test_permission_policy_table_covers_core_dashboard_endpoints(self):
        policy_table = dashboard_security.get_dashboard_endpoint_permission_policy()
        for endpoint in [
            "get_dashboard_kpis",
            "get_dashboard_tab_payload",
            "get_customer_workbench_rows",
            "get_lead_workbench_rows",
            "get_lead_detail_payload",
            "get_offer_detail_payload",
            "update_customer_profile",
        ]:
            self.assertIn(endpoint, policy_table)
            self.assertIn("auth", policy_table[endpoint])
            self.assertIn("scope", policy_table[endpoint])

    def test_get_dashboard_kpis_response_contract_smoke(self):
        cards = dashboard_api._empty_dashboard_payload().get("cards", {}).copy()
        meta = {"access_scope": "global", "scope_reason": "privileged_role"}

        with patch.object(dashboard_api, "_allowed_customers_for_user", return_value=(None, meta)):
            with patch.object(dashboard_api, "_build_policy_where", return_value=("1=1", {})):
                with patch.object(dashboard_api, "_build_lead_where", return_value=("1=1", {})):
                    with patch.object(dashboard_api, "_dashboard_cards_summary", return_value=cards):
                        with patch.object(dashboard_api, "_monthly_commission_trend", return_value=[]):
                            with patch.object(dashboard_api.frappe.db, "sql", side_effect=[[], [], []]):
                                payload = dashboard_api.get_dashboard_kpis(filters={})

        self.assertEqual(
            set(payload.keys()),
            {"cards", "lead_status", "policy_status", "top_companies", "commission_trend", "comparison", "meta"},
        )
        self.assertIsInstance(payload["cards"], dict)
        self.assertIsInstance(payload["lead_status"], list)
        self.assertIsInstance(payload["policy_status"], list)
        self.assertIsInstance(payload["top_companies"], list)
        self.assertIsInstance(payload["commission_trend"], list)
        self.assertIsInstance(payload["comparison"], dict)
        self.assertEqual(payload["meta"], meta)

    def test_get_dashboard_tab_payload_renewals_contract_smoke(self):
        cards = dashboard_api._empty_dashboard_payload().get("cards", {}).copy()
        compare_cards = cards.copy()
        meta = {"access_scope": "scoped", "scope_reason": "agent_assignment"}
        renewal_payload = {
            "status_rows": [{"status": "Open", "total": 1}],
            "buckets": {"overdue": 0, "due7": 1, "due30": 0},
        }
        preview_rows = [{"name": "RT-0001", "status": "Open"}]

        with patch.object(dashboard_api, "_allowed_customers_for_user", return_value=(["CUST-0001"], meta)):
            with patch.object(dashboard_api, "_dashboard_cards_summary", side_effect=[cards, compare_cards]):
                with patch.object(dashboard_api, "_renewal_status_and_buckets", return_value=renewal_payload):
                    with patch.object(dashboard_api, "_get_renewal_task_preview_rows", return_value=preview_rows):
                        payload = dashboard_api.get_dashboard_tab_payload(tab="renewals", filters={})

        self.assertEqual(set(payload.keys()), {"tab", "cards", "compare_cards", "metrics", "series", "previews", "meta"})
        self.assertEqual(payload["tab"], "renewals")
        self.assertIn("renewal_status", payload["series"])
        self.assertIn("renewal_buckets", payload["series"])
        self.assertIn("renewal_tasks", payload["previews"])
        self.assertEqual(payload["meta"], meta)

    def test_get_customer_workbench_rows_response_contract_smoke(self):
        parsed_filters = {
            "query_filters": {},
            "or_filters": [],
            "has_active_policy": False,
            "has_open_offer": False,
            "requested_sort": "modified desc",
        }
        sample_rows = [{"name": "CUST-0001", "full_name": "Test Customer", "modified": "2026-02-26 10:00:00"}]

        with patch.object(dashboard_api, "_allowed_customers_for_user", return_value=None):
            with patch.object(dashboard_api.dashboard_filters, "normalize_customer_workbench_payload", return_value={}):
                with patch.object(dashboard_api.dashboard_filters, "parse_customer_workbench_filters", return_value=parsed_filters):
                    with patch.object(dashboard_api.dashboard_customer_queries, "build_customer_workbench_base_kwargs", return_value={"doctype": "AT Customer"}):
                        with patch.object(
                            dashboard_api.dashboard_customer_queries,
                            "fetch_customer_workbench_rows",
                            return_value=list(sample_rows),
                        ):
                            with patch.object(dashboard_api.dashboard_customer_queries, "count_customer_workbench_rows", return_value=1):
                                with patch.object(dashboard_api, "_customer_portfolio_summary_for_names", return_value={}):
                                    with patch.object(
                                        dashboard_api.dashboard_serializers,
                                        "attach_customer_portfolio_summary",
                                        side_effect=lambda rows, summary: rows,
                                    ):
                                        with patch.object(dashboard_api, "has_sensitive_access", return_value=True):
                                            payload = dashboard_api.get_customer_workbench_rows(filters={}, page=1, page_length=20)

        self.assertEqual(set(payload.keys()), {"rows", "total", "page", "page_length"})
        self.assertEqual(payload["total"], 1)
        self.assertEqual(payload["page"], 1)
        self.assertEqual(payload["page_length"], 20)
        self.assertIsInstance(payload["rows"], list)
        self.assertEqual(payload["rows"][0]["name"], "CUST-0001")

    def test_get_lead_workbench_rows_response_contract_smoke(self):
        parsed_filters = {
            "query_filters": {},
            "or_filters": [],
            "stale_state": None,
            "can_convert_only": False,
            "requested_sort": "modified desc",
        }
        sample_rows = [{"name": "LEAD-0001", "first_name": "Ayse", "modified": "2026-02-26 10:00:00"}]

        with patch.object(dashboard_api, "_allowed_customers_for_user", return_value=None):
            with patch.object(dashboard_api.dashboard_filters, "normalize_customer_workbench_payload", return_value={}):
                with patch.object(dashboard_api.dashboard_filters, "parse_lead_workbench_filters", return_value=parsed_filters):
                    with patch.object(dashboard_api.dashboard_lead_queries, "build_lead_workbench_base_kwargs", return_value={"doctype": "AT Lead"}):
                        with patch.object(
                            dashboard_api.dashboard_lead_queries,
                            "fetch_lead_workbench_rows",
                            return_value=list(sample_rows),
                        ):
                            with patch.object(dashboard_api.dashboard_lead_queries, "count_lead_workbench_rows", return_value=1):
                                with patch.object(
                                    dashboard_api.dashboard_serializers,
                                    "attach_lead_workbench_derived_fields",
                                    side_effect=lambda rows, **kwargs: rows,
                                ):
                                    payload = dashboard_api.get_lead_workbench_rows(filters={}, page=1, page_length=20)

        self.assertEqual(set(payload.keys()), {"rows", "total", "page", "page_length"})
        self.assertEqual(payload["total"], 1)
        self.assertEqual(payload["page"], 1)
        self.assertEqual(payload["page_length"], 20)
        self.assertIsInstance(payload["rows"], list)
        self.assertEqual(payload["rows"][0]["name"], "LEAD-0001")


if __name__ == "__main__":
    unittest.main()
