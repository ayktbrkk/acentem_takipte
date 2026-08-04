from __future__ import annotations

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from acentem_takipte.acentem_takipte.domains.policies.api.endpoints import (
    get_policy_list_summary,
)


class TestPolicyListSummary(FrappeTestCase):
    def test_summary_counts_and_premium(self):
        rows = [
            {"status": "Active", "gwp_try": 1000, "gross_premium": 1000},
            {"status": "Active", "gwp_try": 2000, "gross_premium": 2000},
            {"status": "Record", "gwp_try": 500, "gross_premium": 500},
            {"status": "Pending", "gwp_try": 300, "gross_premium": 300},
            {"status": "Cancelled", "gwp_try": 700, "gross_premium": 700},
            {"status": "Archived", "gwp_try": 0, "gross_premium": 100},
        ]
        with (
            patch(
                "acentem_takipte.acentem_takipte.domains.policies.api.endpoints.assert_authenticated",
                return_value=None,
            ),
            patch(
                "acentem_takipte.acentem_takipte.domains.policies.api.endpoints.assert_doctype_permission",
                return_value=None,
            ),
            patch(
                "acentem_takipte.acentem_takipte.domains.policies.api.endpoints.frappe.get_all",
                return_value=rows,
            ) as mock_get_all,
        ):
            result = get_policy_list_summary()

            self.assertEqual(result["total"], 6)
            self.assertEqual(result["active"], 2)
            self.assertEqual(result["pending"], 2)
            self.assertEqual(result["cancelled"], 1)
            self.assertEqual(result["archived"], 1)
            # gwp_try falls back to gross_premium when 0/null (matches frontend: `gwp_try || gross_premium`)
            self.assertEqual(result["total_premium_try"], 4600.0)

            # gwp_try fallback to gross_premium when null
            mock_get_all.return_value = [{"status": "Active", "gwp_try": None, "gross_premium": 250}]
            result_fallback = get_policy_list_summary()
            self.assertEqual(result_fallback["total_premium_try"], 250.0)

    def test_summary_passes_filters_to_get_all(self):
        with (
            patch(
                "acentem_takipte.acentem_takipte.domains.policies.api.endpoints.assert_authenticated",
                return_value=None,
            ),
            patch(
                "acentem_takipte.acentem_takipte.domains.policies.api.endpoints.assert_doctype_permission",
                return_value=None,
            ),
            patch(
                "acentem_takipte.acentem_takipte.domains.policies.api.endpoints.frappe.get_all",
                return_value=[],
            ) as mock_get_all,
        ):
            get_policy_list_summary(
                status="Active",
                insurance_company="IC-001",
                end_date="2026-12-31",
                customer="Ali",
                gross_min="100",
                gross_max="500",
                query="POL",
                office_branch="OB-001",
            )

        kwargs = mock_get_all.call_args.kwargs
        filters = kwargs["filters"]
        self.assertEqual(filters["status"], "Active")
        self.assertEqual(filters["insurance_company"], "IC-001")
        self.assertEqual(filters["end_date"], ["<=", "2026-12-31"])
        self.assertEqual(filters["customer"], ["like", "%Ali%"])
        self.assertEqual(filters["gross_premium"], ["between", [100.0, 500.0]])
        self.assertEqual(filters["office_branch"], "OB-001")
        self.assertEqual(kwargs["or_filters"][0], ["AT Policy", "name", "like", "%POL%"])
        self.assertEqual(mock_get_all.call_args.args[0], "AT Policy")

    def test_summary_empty_data(self):
        with (
            patch(
                "acentem_takipte.acentem_takipte.domains.policies.api.endpoints.assert_authenticated",
                return_value=None,
            ),
            patch(
                "acentem_takipte.acentem_takipte.domains.policies.api.endpoints.assert_doctype_permission",
                return_value=None,
            ),
            patch(
                "acentem_takipte.acentem_takipte.domains.policies.api.endpoints.frappe.get_all",
                return_value=[],
            ),
        ):
            result = get_policy_list_summary()
        self.assertEqual(result["total"], 0)
        self.assertEqual(result["total_premium_try"], 0)
