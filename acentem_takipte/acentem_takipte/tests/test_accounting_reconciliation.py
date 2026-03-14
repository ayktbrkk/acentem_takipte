from __future__ import annotations

from unittest.mock import patch

import frappe
from frappe.tests import IntegrationTestCase
from frappe.utils import add_days, nowdate

from acentem_takipte.acentem_takipte.api import accounting as accounting_api
from acentem_takipte.acentem_takipte.accounting import (
    resolve_reconciliation_item,
    run_reconciliation,
    sync_accounting_entry,
)


class TestAccountingReconciliation(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.db.rollback()

    def test_accounting_api_mutations_require_accounting_roles(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "restricted.user@example.com"
        try:
            with patch.object(accounting_api.frappe, "get_roles", return_value=["Agent"]):
                with self.assertRaises(Exception) as run_sync_error:
                    accounting_api.run_sync(limit=1)
                self.assertIn("permission", str(run_sync_error.exception).lower())

                with self.assertRaises(Exception) as resolve_error:
                    accounting_api.resolve_item(item_name="", resolution_action="Matched")
                self.assertIn("permission", str(resolve_error.exception).lower())
        finally:
            frappe.session.user = previous_user

    def test_accounting_mutation_access_checks_action_specific_doctype_permissions(self):
        with patch.object(accounting_api, "assert_authenticated", return_value="manager@example.com"):
            with patch.object(accounting_api, "assert_post_request") as post_mock:
                with patch.object(accounting_api, "assert_roles") as roles_mock:
                    with patch.object(accounting_api, "assert_doctype_permission") as doctype_mock:
                        with patch.object(accounting_api, "audit_admin_action") as audit_mock:
                            accounting_api._assert_accounting_mutation_access(
                                "api.accounting.run_sync",
                                details={"limit": 10},
                                permission_targets=accounting_api.ACCOUNTING_MUTATION_DOCTYPES["run_sync"],
                            )

        post_mock.assert_called_once()
        roles_mock.assert_called_once()
        doctype_mock.assert_called_once_with(
            "AT Accounting Entry",
            "write",
            "You do not have permission to run accounting operations for AT Accounting Entry.",
        )
        audit_mock.assert_called_once_with("api.accounting.run_sync", {"limit": 10})

    def test_bulk_resolve_items_resolves_visible_rows_with_doc_permission(self):
        with patch.object(accounting_api, "_assert_accounting_mutation_access") as mutation_mock:
            with patch.object(accounting_api, "assert_doc_permission") as doc_permission_mock:
                with patch.object(
                    accounting_api,
                    "resolve_reconciliation_item",
                    side_effect=[
                        {"status": "Resolved", "item": "REC-001"},
                        {"status": "Ignored", "item": "REC-002"},
                    ],
                ) as resolve_mock:
                    result = accounting_api.bulk_resolve_items(
                        item_names=["REC-001", "REC-002"],
                        resolution_action="Ignored",
                        notes="Toplu islem",
                    )

        mutation_mock.assert_called_once_with(
            "api.accounting.bulk_resolve_items",
            details={"resolution_action": "Ignored"},
            permission_targets=accounting_api.ACCOUNTING_MUTATION_DOCTYPES["bulk_resolve_items"],
        )
        assert doc_permission_mock.call_count == 2
        doc_permission_mock.assert_any_call("AT Reconciliation Item", "REC-001", "write")
        doc_permission_mock.assert_any_call("AT Reconciliation Item", "REC-002", "write")
        resolve_mock.assert_any_call(item_name="REC-001", resolution_action="Ignored", notes="Toplu islem")
        resolve_mock.assert_any_call(item_name="REC-002", resolution_action="Ignored", notes="Toplu islem")
        self.assertEqual(
            result,
            {
                "processed": 2,
                "skipped": 0,
                "resolution_action": "Ignored",
            },
        )

    def test_policy_sync_and_reconciliation_resolution(self):
        deps = _create_dependencies()
        policy = frappe.get_doc(
            {
                "doctype": "AT Policy",
                "customer": deps["customer"],
                "sales_entity": deps["sales_entity"],
                "insurance_company": deps["insurance_company"],
                "branch": deps["branch"],
                "status": "Active",
                "issue_date": nowdate(),
                "start_date": nowdate(),
                "end_date": add_days(nowdate(), 365),
                "currency": "TRY",
                "net_premium": 1000,
                "commission_amount": 150,
                "tax_amount": 120,
            }
        ).insert(ignore_permissions=True)

        sync_result = sync_accounting_entry("AT Policy", policy.name, force=True)
        self.assertEqual(sync_result.get("status"), "Synced")

        entry_name = frappe.db.get_value(
            "AT Accounting Entry",
            {"source_doctype": "AT Policy", "source_name": policy.name},
            "name",
        )
        self.assertTrue(entry_name)

        entry = frappe.get_doc("AT Accounting Entry", entry_name)
        entry.external_amount_try = (entry.local_amount_try or 0) + 250
        entry.save(ignore_permissions=True)

        reconciliation_summary = run_reconciliation(limit=100)
        self.assertGreaterEqual(reconciliation_summary.get("open", 0), 1)

        rec_name = frappe.db.get_value(
            "AT Reconciliation Item",
            {"accounting_entry": entry_name, "status": "Open"},
            "name",
        )
        self.assertTrue(rec_name)

        resolved = resolve_reconciliation_item(rec_name, resolution_action="Matched")
        self.assertEqual(resolved.get("status"), "Resolved")

        rec_doc = frappe.get_doc("AT Reconciliation Item", rec_name)
        self.assertEqual(rec_doc.status, "Resolved")


def _create_dependencies() -> dict[str, str]:
    suffix = frappe.generate_hash(length=8)

    insurance_company = frappe.get_doc(
        {
            "doctype": "AT Insurance Company",
            "company_name": f"Recon Insurance {suffix}",
            "company_code": f"RIC{suffix[:4]}",
        }
    ).insert(ignore_permissions=True)

    branch = frappe.get_doc(
        {
            "doctype": "AT Branch",
            "branch_name": f"Recon Branch {suffix}",
            "branch_code": f"RB{suffix[:4]}",
            "insurance_company": insurance_company.name,
        }
    ).insert(ignore_permissions=True)

    sales_entity = frappe.get_doc(
        {
            "doctype": "AT Sales Entity",
            "entity_type": "Agency",
            "full_name": f"Recon Agency {suffix}",
        }
    ).insert(ignore_permissions=True)

    customer = frappe.get_doc(
        {
            "doctype": "AT Customer",
            "tax_id": _random_tax_id(),
            "full_name": f"Recon Customer {suffix}",
            "phone": "05559876543",
            "email": f"recon.{suffix}@example.com",
            "assigned_agent": "Administrator",
        }
    ).insert(ignore_permissions=True)

    return {
        "insurance_company": insurance_company.name,
        "branch": branch.name,
        "sales_entity": sales_entity.name,
        "customer": customer.name,
    }


def _random_tax_id() -> str:
    raw = "".join(char for char in frappe.generate_hash(length=12) if char.isdigit())[:9].ljust(9, "1")
    if raw.startswith("0"):
        raw = f"1{raw[1:]}"
    digits = [int(char) for char in raw]
    tenth = ((sum(digits[0:9:2]) * 7) - sum(digits[1:8:2])) % 10
    eleventh = (sum(digits) + tenth) % 10
    return f"{raw}{tenth}{eleventh}"
