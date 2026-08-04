from __future__ import annotations

from unittest.mock import patch

from frappe.tests.utils import FrappeTestCase

from acentem_takipte.acentem_takipte.domains.payments.api.endpoints import (
    get_payments_board_summary,
)


class TestPaymentsBoardSummary(FrappeTestCase):
    def test_summary_excludes_cancelled_from_active_buckets(self):
        payments = [
            {"name": "PAY-001", "status": "Paid", "amount": 1000, "amount_try": 1000,
             "due_date": "2026-01-01", "payment_date": "2026-01-01", "currency": "TRY",
             "payment_direction": "Inbound", "payment_purpose": "Premium", "customer": None, "policy": None},
            {"name": "PAY-002", "status": "Draft", "amount": 500, "amount_try": 500,
             "due_date": "2025-01-01", "payment_date": None, "currency": "TRY",
             "payment_direction": "Inbound", "payment_purpose": "Premium", "customer": None, "policy": None},
            {"name": "PAY-003", "status": "Cancelled", "amount": 700, "amount_try": 700,
             "due_date": "2026-01-01", "payment_date": None, "currency": "TRY",
             "payment_direction": "Inbound", "payment_purpose": "Premium", "customer": None, "policy": None},
        ]
        installments = [
            {"payment": "PAY-001", "status": "Paid", "amount_try": 1000},
        ]

        with (
            patch(
                "acentem_takipte.acentem_takipte.domains.payments.api.endpoints.assert_authenticated",
                return_value=None,
            ),
            patch(
                "acentem_takipte.acentem_takipte.domains.payments.api.endpoints.assert_doctype_permission",
                return_value=None,
            ),
            patch(
                "acentem_takipte.acentem_takipte.domains.payments.api.endpoints.frappe.get_all",
                side_effect=lambda doctype, **kw: (
                    payments if doctype == "AT Payment" else installments
                ),
            ),
        ):
            result = get_payments_board_summary()

        summary = result["summary"]
        # Cancelled excluded from active buckets and from the total amount.
        self.assertEqual(summary["total"], 2)
        self.assertEqual(summary["collected"], 1)
        self.assertEqual(summary["overdue"], 1)
        self.assertEqual(summary["cancelled"], 1)
        self.assertEqual(summary["total_amount_try"], 1500.0)
        self.assertEqual(result["total_count"], 3)

    def test_query_scopes_summary(self):
        payments = [
            {"name": "PAY-001", "status": "Unpaid", "amount": 100, "amount_try": 100,
             "due_date": "2026-01-01", "payment_date": None, "currency": "TRY",
             "payment_direction": "Inbound", "payment_purpose": "Premium", "customer": "CUST-A", "policy": None},
            {"name": "PAY-002", "status": "Unpaid", "amount": 200, "amount_try": 200,
             "due_date": "2026-01-01", "payment_date": None, "currency": "TRY",
             "payment_direction": "Inbound", "payment_purpose": "Premium", "customer": "CUST-B", "policy": None},
        ]

        with (
            patch(
                "acentem_takipte.acentem_takipte.domains.payments.api.endpoints.assert_authenticated",
                return_value=None,
            ),
            patch(
                "acentem_takipte.acentem_takipte.domains.payments.api.endpoints.assert_doctype_permission",
                return_value=None,
            ),
            patch(
                "acentem_takipte.acentem_takipte.domains.payments.api.endpoints.frappe.get_all",
                side_effect=lambda doctype, **kw: (
                    payments if doctype == "AT Payment" else []
                ),
            ) as mock_get_all,
        ):
            result = get_payments_board_summary(query="CUST-A")
            self.assertEqual(result["summary"]["total"], 2)
            # or_filters must be forwarded so the server-side search scopes the KPI.
            self.assertIsNotNone(mock_get_all.call_args_list[0].kwargs.get("or_filters"))

    def test_summary_truncated_flag(self):
        payments = [
            {"name": f"PAY-{i:03d}", "status": "Unpaid", "amount": 10, "amount_try": 10,
             "due_date": "2026-01-01", "payment_date": None, "currency": "TRY",
             "payment_direction": "Inbound", "payment_purpose": "Premium", "customer": None, "policy": None}
            for i in range(3)
        ]
        with (
            patch(
                "acentem_takipte.acentem_takipte.domains.payments.api.endpoints.assert_authenticated",
                return_value=None,
            ),
            patch(
                "acentem_takipte.acentem_takipte.domains.payments.api.endpoints.assert_doctype_permission",
                return_value=None,
            ),
            patch(
                "acentem_takipte.acentem_takipte.domains.payments.api.endpoints.frappe.get_all",
                side_effect=lambda doctype, **kw: (
                    payments if doctype == "AT Payment" else []
                ),
            ),
        ):
            result = get_payments_board_summary(limit=2)
            self.assertTrue(result["truncated"])
            self.assertEqual(result["total_count"], 2)
