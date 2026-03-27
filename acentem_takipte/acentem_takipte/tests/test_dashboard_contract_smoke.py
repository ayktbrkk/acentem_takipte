from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import patch

from acentem_takipte.acentem_takipte.api import dashboard as dashboard_api
from acentem_takipte.acentem_takipte.api.dashboard_v2 import queries_customers as customer_queries
from acentem_takipte.acentem_takipte.api.dashboard_v2 import queries_leads as lead_queries
from acentem_takipte.acentem_takipte.api.dashboard_v2 import security as dashboard_security


class TestDashboardContractSmoke(unittest.TestCase):
    def setUp(self) -> None:
        self._previous_user = getattr(dashboard_api.frappe.session, "user", None)
        self._had_db = hasattr(dashboard_api.frappe.local, "db")
        self._previous_db = getattr(dashboard_api.frappe.local, "db", None) if self._had_db else None
        dashboard_api.frappe.session.user = "Administrator"
        dashboard_api.frappe.local.db = SimpleNamespace(
            sql=lambda *args, **kwargs: [],
            get_value=lambda *args, **kwargs: None,
            get_all=lambda *args, **kwargs: [],
            get_list=lambda *args, **kwargs: [],
            has_column=lambda *args, **kwargs: False,
            exists=lambda *args, **kwargs: False,
            count=lambda *args, **kwargs: 0,
        )

    def tearDown(self) -> None:
        if self._had_db:
            dashboard_api.frappe.local.db = self._previous_db
        elif hasattr(dashboard_api.frappe.local, "db"):
            delattr(dashboard_api.frappe.local, "db")
        dashboard_api.frappe.session.user = self._previous_user

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
        meta = {"access_scope": "global", "scope_reason": "privileged_role"}
        expected_payload = {
            "cards": dashboard_api._empty_dashboard_payload().get("cards", {}).copy(),
            "lead_status": [],
            "policy_status": [],
            "top_companies": [],
            "commission_trend": [],
            "comparison": {},
            "meta": meta,
        }

        with patch.object(dashboard_api, "_allowed_customers_for_user", return_value=(None, meta)):
            with patch.object(
                dashboard_api.dashboard_kpi_queries,
                "build_dashboard_kpis_payload",
                return_value=expected_payload,
            ) as build_mock:
                payload = dashboard_api.get_dashboard_kpis(filters={})

        build_mock.assert_called_once()
        self.assertEqual(payload, expected_payload)

    def test_get_dashboard_tab_payload_renewals_contract_smoke(self):
        cards = dashboard_api._empty_dashboard_payload().get("cards", {}).copy()
        compare_cards = cards.copy()
        meta = {"access_scope": "scoped", "scope_reason": "agent_assignment"}
        renewal_payload = {
            "status_rows": [{"status": "Open", "total": 1}],
            "buckets": {"overdue": 0, "due7": 1, "due30": 0},
        }
        preview_rows = [{"name": "RT-0001", "status": "Open"}]
        offer_waiting = {"count": 1, "rows": [{"name": "RT-0002", "status": "Open"}]}

        with patch.object(dashboard_api, "_allowed_customers_for_user", return_value=(["CUST-0001"], meta)):
            with patch.object(dashboard_api, "normalize_requested_office_branch", lambda office_branch=None, user=None: office_branch):
                with patch.object(dashboard_api, "_dashboard_cards_summary", side_effect=[cards, compare_cards]):
                    with patch.object(dashboard_api, "_renewal_status_and_buckets", return_value=renewal_payload):
                        with patch.object(dashboard_api, "_get_renewal_task_preview_rows", return_value=preview_rows):
                            with patch.object(dashboard_api, "_get_offer_waiting_renewal_summary", return_value=offer_waiting):
                                payload = dashboard_api.get_dashboard_tab_payload(tab="renewals", filters={})

        self.assertEqual(set(payload.keys()), {"tab", "cards", "compare_cards", "metrics", "series", "previews", "meta"})
        self.assertEqual(payload["tab"], "renewals")
        self.assertIn("renewal_status", payload["series"])
        self.assertIn("renewal_buckets", payload["series"])
        self.assertIn("offer_waiting_count", payload["metrics"])
        self.assertIn("renewal_tasks", payload["previews"])
        self.assertIn("offer_waiting_renewals", payload["previews"])
        self.assertEqual(payload["meta"], meta)

    def test_get_dashboard_tab_payload_collections_contract_smoke(self):
        cards = dashboard_api._empty_dashboard_payload().get("cards", {}).copy()
        compare_cards = cards.copy()
        meta = {"access_scope": "global", "scope_reason": "privileged_role"}

        with patch.object(dashboard_api, "_allowed_customers_for_user", return_value=(None, meta)):
            with patch.object(dashboard_api, "normalize_requested_office_branch", lambda office_branch=None, user=None: office_branch):
                with patch.object(dashboard_api, "_dashboard_cards_summary", side_effect=[cards, compare_cards]):
                    with patch.object(dashboard_api, "_build_payment_where", return_value=("1=1", {})):
                        with patch.object(
                            dashboard_api,
                            "_build_payment_collection_where",
                            side_effect=[("1=1", {}), ("1=1", {})],
                        ):
                            with patch.object(dashboard_api, "_get_payment_preview_rows", return_value=[{"name": "PAY-0001"}]):
                                with patch.object(dashboard_api, "_get_reconciliation_open_rows_preview", return_value=[{"name": "REC-0001"}]):
                                    with patch.object(
                                        dashboard_api,
                                        "_reconciliation_open_summary",
                                        return_value={"open_count": 2, "open_difference_try": 150},
                                    ):
                                        with patch.object(
                                            dashboard_api.frappe.db,
                                            "sql",
                                            side_effect=[
                                                [{"status": "Draft", "total": 3}],
                                                [{"payment_direction": "Inbound", "total": 3, "paid_amount_try": 0}],
                                                [{"total_count": 1, "total_amount_try": 100}],
                                                [{"total_count": 2, "total_amount_try": 250}],
                                            ],
                                        ):
                                            payload = dashboard_api.get_dashboard_tab_payload(tab="collections", filters={})

        self.assertEqual(payload["tab"], "collections")
        self.assertIn("due_today_collection_count", payload["metrics"])
        self.assertIn("overdue_collection_count", payload["metrics"])
        self.assertIn("due_today_collection_amount_try", payload["metrics"])
        self.assertIn("overdue_collection_amount_try", payload["metrics"])
        self.assertIn("due_today_payments", payload["previews"])
        self.assertIn("overdue_payments", payload["previews"])
        self.assertIn("payments", payload["previews"])
        self.assertIn("reconciliation_rows", payload["previews"])

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

    def test_customer_workbench_count_uses_aggregate_query_for_or_filters(self):
        with patch.object(customer_queries.frappe, "get_list", return_value=[{"total": 7}]) as get_list_mock:
            total = customer_queries.count_customer_workbench_rows(
                query_filters={"status": "Active"},
                or_filters=[["full_name", "like", "%test%"]],
            )

        self.assertEqual(total, 7)
        get_list_mock.assert_called_once()
        self.assertEqual(get_list_mock.call_args.kwargs["fields"], ["count(name) as total"])
        self.assertNotIn("pluck", get_list_mock.call_args.kwargs)

    def test_lead_workbench_count_uses_aggregate_query_for_or_filters(self):
        with patch.object(lead_queries.frappe, "get_list", return_value=[{"total": 5}]) as get_list_mock:
            total = lead_queries.count_lead_workbench_rows(
                query_filters={"status": "Open"},
                or_filters=[["email", "like", "%lead%"]],
            )

        self.assertEqual(total, 5)
        get_list_mock.assert_called_once()
        self.assertEqual(get_list_mock.call_args.kwargs["fields"], ["count(name) as total"])
        self.assertNotIn("pluck", get_list_mock.call_args.kwargs)


if __name__ == "__main__":
    unittest.main()

