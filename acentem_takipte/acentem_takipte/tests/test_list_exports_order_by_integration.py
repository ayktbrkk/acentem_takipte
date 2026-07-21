import frappe

from acentem_takipte.acentem_takipte.platform.services.list_exports import (
    SCREEN_EXPORTS,
    _qualified_order_by,
    build_screen_export_payload,
    build_workbench_export_query,
)
from frappe.tests.utils import FrappeTestCase as IntegrationTestCase


class TestPolicyListExportOrderByIntegration(IntegrationTestCase):
    def test_get_list_with_link_fields_accepts_qualified_order_by(self):
        definition = SCREEN_EXPORTS["policy_list"]
        fields = list(definition["fields"])
        doctype = definition["doctype"]
        order_by = _qualified_order_by(doctype, "modified desc")

        rows = frappe.get_list(
            doctype,
            fields=fields,
            order_by=order_by,
            limit_page_length=2,
        )
        self.assertIsInstance(rows, list)

    def test_build_screen_export_payload_policy_list_empty_query(self):
        query = build_workbench_export_query("policy_list")
        payload = build_screen_export_payload("policy_list", query=query, limit=2)
        self.assertEqual(payload["export_key"], "policy_list_workbench")
        self.assertIsInstance(payload["rows"], list)
