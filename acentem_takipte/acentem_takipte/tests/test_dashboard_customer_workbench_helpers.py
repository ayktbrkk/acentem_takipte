from __future__ import annotations

import unittest

from acentem_takipte.acentem_takipte.api.v2 import filters as dashboard_filters
from acentem_takipte.acentem_takipte.api.v2 import serializers as dashboard_serializers


class TestDashboardCustomerWorkbenchHelpers(unittest.TestCase):
    def test_normalize_customer_workbench_payload_non_dict_defaults_to_empty(self):
        self.assertEqual(dashboard_filters.normalize_customer_workbench_payload(None), {})
        self.assertEqual(dashboard_filters.normalize_customer_workbench_payload("bad"), {})

    def test_parse_customer_workbench_filters_builds_query_and_or_filters(self):
        payload = {
            "consent_status": "Granted",
            "gender": "Male",
            "marital_status": "Single",
            "assigned_agent": "agent@example.com",
            "occupation": "Teacher",
            "query": "Ali",
            "has_phone": "1",
            "has_email": True,
            "has_active_policy": "true",
            "has_open_offer": 1,
            "sort": "full_name asc",
        }

        parsed = dashboard_filters.parse_customer_workbench_filters(
            payload,
            as_bool=lambda value: str(value).lower() in {"1", "true"},
        )

        self.assertEqual(parsed["requested_sort"], "full_name asc")
        self.assertTrue(parsed["has_active_policy"])
        self.assertTrue(parsed["has_open_offer"])
        self.assertEqual(parsed["query_filters"]["consent_status"], "Granted")
        self.assertEqual(parsed["query_filters"]["gender"], "Male")
        self.assertEqual(parsed["query_filters"]["marital_status"], "Single")
        self.assertEqual(parsed["query_filters"]["assigned_agent"], ["like", "%agent@example.com%"])
        self.assertEqual(parsed["query_filters"]["occupation"], ["like", "%Teacher%"])
        self.assertEqual(parsed["query_filters"]["phone"], ["is", "set"])
        self.assertEqual(parsed["query_filters"]["email"], ["is", "set"])
        self.assertIsInstance(parsed["or_filters"], list)
        self.assertGreaterEqual(len(parsed["or_filters"]), 1)
        self.assertEqual(parsed["or_filters"][0][0], "AT Customer")
        self.assertEqual(parsed["or_filters"][0][2], "like")
        self.assertEqual(parsed["or_filters"][0][3], "%Ali%")

    def test_serializers_attach_summary_mask_and_build_response(self):
        rows = [
            {
                "name": "CUST-001",
                "tax_id": "11111111111",
                "masked_tax_id": "********111",
                "phone": "05550001122",
                "masked_phone": "********122",
            }
        ]
        summary_map = {
            "CUST-001": {
                "active_policy_count": "2",
                "open_offer_count": 1,
                "active_policy_gross_premium": "1234.50",
            }
        }

        dashboard_serializers.attach_customer_portfolio_summary(rows, summary_map)
        self.assertEqual(rows[0]["active_policy_count"], 2)
        self.assertEqual(rows[0]["open_offer_count"], 1)
        self.assertEqual(rows[0]["active_policy_gross_premium"], 1234.5)
        self.assertTrue(rows[0]["has_active_policy"])
        self.assertTrue(rows[0]["has_open_offer"])

        dashboard_serializers.mask_customer_sensitive_fields(rows)
        self.assertEqual(rows[0]["tax_id"], "********111")
        self.assertEqual(rows[0]["phone"], "********122")

        response = dashboard_serializers.build_paged_rows_response(rows=rows, total=5, page=2, page_length=20)
        self.assertEqual(response["total"], 5)
        self.assertEqual(response["page"], 2)
        self.assertEqual(response["page_length"], 20)
        self.assertEqual(response["rows"], rows)

    def test_serializers_reorder_rows_by_name_preserves_requested_order(self):
        rows = [
            {"name": "CUST-002", "full_name": "B"},
            {"name": "CUST-001", "full_name": "A"},
            {"name": "CUST-003", "full_name": "C"},
        ]
        ordered = dashboard_serializers.reorder_rows_by_name(rows, ["CUST-003", "CUST-001", "MISSING"])
        self.assertEqual([row["name"] for row in ordered], ["CUST-003", "CUST-001"])

    def test_parse_lead_workbench_filters_builds_query_flags_and_range(self):
        payload = {
            "status": "Open",
            "branch": "Kasko",
            "sales_entity": "Agency",
            "insurance_company": "ABC",
            "has_customer": "1",
            "estimated_min": "1000",
            "estimated_max": "5000",
            "query": "Ayse",
            "stale_state": "Stale",
            "can_convert_to_offer": "true",
            "sort": "estimated_gross_premium desc",
        }
        parsed = dashboard_filters.parse_lead_workbench_filters(
            payload,
            as_bool=lambda value: str(value).lower() in {"1", "true"},
            is_number=lambda value: True,
            flt_fn=float,
        )

        self.assertEqual(parsed["requested_sort"], "estimated_gross_premium desc")
        self.assertEqual(parsed["stale_state"], "Stale")
        self.assertTrue(parsed["can_convert_only"])
        self.assertEqual(parsed["query_filters"]["status"], "Open")
        self.assertEqual(parsed["query_filters"]["branch"], ["like", "%Kasko%"])
        self.assertEqual(parsed["query_filters"]["sales_entity"], ["like", "%Agency%"])
        self.assertEqual(parsed["query_filters"]["insurance_company"], ["like", "%ABC%"])
        self.assertEqual(parsed["query_filters"]["customer"], ["is", "set"])
        self.assertEqual(parsed["query_filters"]["estimated_gross_premium"], ["between", [1000.0, 5000.0]])
        self.assertIsInstance(parsed["or_filters"], list)
        self.assertEqual(parsed["or_filters"][0][0], "AT Lead")
        self.assertEqual(parsed["or_filters"][0][3], "%Ayse%")

    def test_parse_lead_workbench_filters_any_converted_takes_precedence_over_query_text(self):
        parsed = dashboard_filters.parse_lead_workbench_filters(
            {
                "conversion_state": "any_converted",
                "query": "ignored",
            },
            as_bool=lambda value: bool(value),
            is_number=lambda value: False,
            flt_fn=float,
        )
        self.assertEqual(len(parsed["or_filters"]), 2)
        self.assertEqual(parsed["or_filters"][0][1], "converted_offer")

    def test_serializers_attach_and_filter_lead_derived_fields(self):
        rows = [
            {"name": "LEAD-001", "status": "Open", "modified": "old", "customer": "CUST-1"},
            {"name": "LEAD-002", "status": "Closed", "modified": "new", "customer": None},
        ]

        def stale_fn(modified):
            return "Stale" if modified == "old" else "Fresh"

        def can_convert_fn(row):
            return bool(row.get("customer")) and row.get("status") != "Closed"

        def conversion_state_fn(row):
            return "Actionable" if can_convert_fn(row) else "Closed"

        def missing_fields_fn(row):
            return [] if can_convert_fn(row) else ["customer"]

        def next_action_fn(row):
            return "Convert" if can_convert_fn(row) else "Closed"

        dashboard_serializers.attach_lead_workbench_derived_fields(
            rows,
            lead_stale_state_fn=stale_fn,
            lead_can_convert_to_offer_fn=can_convert_fn,
            lead_conversion_state_fn=conversion_state_fn,
            lead_conversion_missing_fieldnames_fn=missing_fields_fn,
            lead_next_conversion_action_fn=next_action_fn,
        )

        self.assertEqual(rows[0]["stale_state"], "Stale")
        self.assertTrue(rows[0]["can_convert_to_offer"])
        self.assertEqual(rows[0]["conversion_state"], "Actionable")
        self.assertEqual(rows[1]["conversion_state"], "Closed")

        filtered = dashboard_serializers.filter_lead_workbench_rows(rows, stale_state="Stale", can_convert_only=True)
        self.assertEqual([row["name"] for row in filtered], ["LEAD-001"])


if __name__ == "__main__":
    unittest.main()

