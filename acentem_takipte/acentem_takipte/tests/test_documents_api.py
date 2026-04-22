from __future__ import annotations

from unittest.mock import patch

from frappe.tests.utils import FrappeTestCase as IntegrationTestCase

from acentem_takipte.acentem_takipte.api.documents import _resolve_reference_token


class TestDocumentsApi(IntegrationTestCase):
    def test_customer_reference_token_uses_existing_customer_fields(self):
        with patch(
            "acentem_takipte.acentem_takipte.api.documents.frappe.db.get_value",
            return_value={"name": "AT-CUST-2026-000012", "tax_id": "12345678901"},
        ) as get_value_mock:
            token = _resolve_reference_token("AT Customer", "AT-CUST-2026-000012")

        get_value_mock.assert_called_once_with(
            "AT Customer",
            "AT-CUST-2026-000012",
            ["name", "tax_id"],
            as_dict=True,
        )
        self.assertEqual(token, "CUS-12345678901")
