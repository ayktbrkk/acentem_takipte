from __future__ import annotations

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase as IntegrationTestCase
from frappe.utils import add_days, flt, nowdate

import acentem_takipte.acentem_takipte.domains.accounting.api.endpoints as accounting_api
from acentem_takipte.acentem_takipte.accounting import (
    resolve_reconciliation_item,
    run_reconciliation,
    sync_accounting_entry,
)
from acentem_takipte.acentem_takipte.domains.accounting.services.runtime import (
    _compute_commission_aging,
    _compute_commission_by_entity,
    build_reconciliation_workbench,
)


class TestAccountingReconciliation(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.db.rollback()

    def test_accounting_api_mutations_require_accounting_roles(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "restricted.user@example.com"
        try:
            with patch.object(accounting_api.frappe, "get_roles", return_value=["AT Agent"]):
                with self.assertRaises(Exception) as run_sync_error:
                    accounting_api.run_sync(limit=1)
                self.assertTrue(str(run_sync_error.exception))

                with self.assertRaises(Exception) as resolve_error:
                    accounting_api.resolve_item(item_name="", resolution_action="Matched")
                self.assertTrue(str(resolve_error.exception))
        finally:
            frappe.session.user = previous_user

    def test_accounting_mutation_access_checks_action_specific_doctype_permissions(self):
        with patch.object(accounting_api, "assert_role_based_write_access") as mutation_access:
            accounting_api._assert_accounting_mutation_access(
                "api.accounting.run_sync",
                details={"limit": 10},
                permission_targets=accounting_api.ACCOUNTING_MUTATION_DOCTYPES["run_sync"],
            )

        mutation_access.assert_called_once_with(
            action="api.accounting.run_sync",
            roles=accounting_api.ACCOUNTING_ADMIN_ROLES,
            permission_targets=("AT Accounting Entry",),
            details={"limit": 10},
            role_message="You do not have permission to run accounting operations.",
            post_message="Only POST requests are allowed for accounting mutations.",
        )

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
                "failed": 0,
                "failed_items": [],
                "resolution_action": "Ignored",
            },
        )

    def test_bulk_resolve_reports_partial_failures_without_rolling_back_successes(self):
        """A permission failure on one row must not roll back rows that already
        resolved; the failed row is reported so the user can retry it."""
        with patch.object(accounting_api, "_assert_accounting_mutation_access") as mutation_mock:
            with patch.object(
                accounting_api,
                "assert_doc_permission",
                side_effect=[None, PermissionError("denied"), None],
            ) as doc_permission_mock:
                with patch.object(
                    accounting_api,
                    "resolve_reconciliation_item",
                    side_effect=[{"status": "Resolved", "item": "REC-001"}, {"status": "Resolved", "item": "REC-003"}],
                ) as resolve_mock:
                    result = accounting_api.bulk_resolve_items(
                        item_names=["REC-001", "REC-002", "REC-003"],
                        resolution_action="Matched",
                    )

        assert doc_permission_mock.call_count == 3
        self.assertEqual(resolve_mock.call_count, 2)
        self.assertEqual(
            result,
            {
                "processed": 2,
                "skipped": 0,
                "failed": 1,
                "failed_items": ["REC-002"],
                "resolution_action": "Matched",
            },
        )

    def test_bulk_resolve_counts_skipped_rows_and_reports_nothing_processed(self):
        with patch.object(accounting_api, "_assert_accounting_mutation_access"):
            with patch.object(accounting_api, "assert_doc_permission", return_value=None):
                with patch.object(
                    accounting_api,
                    "resolve_reconciliation_item",
                    side_effect=[
                        {"status": "Skipped", "reason": "already_resolved"},
                        {"status": "Skipped", "reason": "missing_item"},
                    ],
                ):
                    result = accounting_api.bulk_resolve_items(
                        item_names=["REC-001", "REC-002"],
                        resolution_action="Matched",
                    )

        self.assertEqual(result["processed"], 0)
        self.assertEqual(result["skipped"], 2)
        self.assertEqual(result["failed"], 0)
        self.assertEqual(result["failed_items"], [])

    def test_sync_does_not_fabricate_external_data(self):
        """The accounting sync writes local journal data only; external amounts
        and refs must come from real statement imports, never a simulation."""
        deps = _create_dependencies()
        policy = _create_policy(deps, status="Active", commission_amount=150)

        self.assertEqual(
            sync_accounting_entry("AT Policy", policy.name, force=True).get("status"),
            "Synced",
        )

        entry = frappe.get_doc(
            "AT Accounting Entry",
            frappe.db.get_value(
                "AT Accounting Entry",
                {"source_doctype": "AT Policy", "source_name": policy.name},
                "name",
            ),
        )
        self.assertFalse(entry.external_ref)
        self.assertEqual(flt(entry.external_amount_try), 0)
        self.assertGreater(flt(entry.local_amount_try), 0)

    def test_sync_preserves_real_statement_external_data(self):
        """A later re-sync must not clobber external amounts/refs that a real
        commission statement import has populated on the entry."""
        deps = _create_dependencies()
        policy = _create_policy(deps, status="Active", commission_amount=150)
        sync_accounting_entry("AT Policy", policy.name, force=True)

        entry = frappe.get_doc(
            "AT Accounting Entry",
            frappe.db.get_value(
                "AT Accounting Entry",
                {"source_doctype": "AT Policy", "source_name": policy.name},
                "name",
            ),
        )
        entry.external_ref = "STM-001"
        entry.external_amount_try = 999
        entry.save(ignore_permissions=True)

        sync_accounting_entry("AT Policy", policy.name, force=True)

        entry.reload()
        self.assertEqual(entry.external_ref, "STM-001")
        self.assertEqual(flt(entry.external_amount_try), 999)

    def test_sync_does_not_overwrite_commission_statement_entry(self):
        """A commission statement journal and the canonical policy sync entry
        are distinct financial records. Re-syncing a policy must never reuse
        (and therefore corrupt) the commission entry's local_amount/statement
        metadata."""
        from acentem_takipte.acentem_takipte.accounting import _get_or_create_entry
        from acentem_takipte.acentem_takipte.domains.accounting.services.statement_import import (
            _get_or_create_commission_statement_entry,
        )

        deps = _create_dependencies()
        policy = _create_policy(deps, status="Active", commission_amount=150)

        commission_entry = _get_or_create_commission_statement_entry(
            policy.name, "STM-001", "B1"
        )
        commission_entry.entry_type = "Policy"
        commission_entry.local_amount_try = 150
        commission_entry.external_amount_try = 999
        commission_entry.external_ref = "STM-001"
        commission_entry.statement_type = "commission"
        commission_entry.statement_batch = "B1"
        commission_entry.import_source = "commission_statement"
        commission_entry.status = "Synced"
        commission_entry.insert(ignore_permissions=True)

        # Sync must not reuse the commission journal: it needs its own
        # canonical policy/premium entry.
        self.assertEqual(_get_or_create_entry("AT Policy", policy.name).name, None)

        self.assertEqual(
            sync_accounting_entry("AT Policy", policy.name, force=True).get("status"),
            "Synced",
        )

        commission_entry.reload()
        self.assertEqual(flt(commission_entry.local_amount_try), 150)
        self.assertEqual(flt(commission_entry.external_amount_try), 999)
        self.assertEqual(commission_entry.external_ref, "STM-001")
        self.assertEqual(commission_entry.statement_type, "commission")

    def test_run_reconciliation_does_not_flag_entries_without_external_data(self):
        """Entries that have no real statement external data yet must not be
        flagged Missing External by the background reconciliation job."""
        deps = _create_dependencies()
        policy = _create_policy(deps, status="Active", commission_amount=150)
        sync_accounting_entry("AT Policy", policy.name, force=True)
        entry_name = frappe.db.get_value(
            "AT Accounting Entry",
            {"source_doctype": "AT Policy", "source_name": policy.name},
            "name",
        )

        run_reconciliation(limit=100)

        self.assertEqual(
            frappe.db.count(
                "AT Reconciliation Item",
                {"accounting_entry": entry_name, "status": "Open"},
            ),
            0,
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
        entry.external_ref = "STM-001"
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

    def test_resolve_reconciliation_item_is_idempotent(self):
        """Re-resolving an already-resolved item is a no-op (Skipped) and never
        rewrites resolved_by/resolved_on or saves the document again."""
        from acentem_takipte.acentem_takipte.accounting import resolve_reconciliation_item

        class _FakeItem:
            status = "Resolved"
            resolution_action = "Matched"
            notes = "keep"
            accounting_entry = None

        fake = _FakeItem()
        fake.save = frappe.__dict__.get("_sentinel", lambda *a, **k: None)
        with (
            patch("frappe.db.exists", return_value=True),
            patch("frappe.get_doc", return_value=fake),
            patch.object(fake, "save") as save_mock,
            patch(
                "acentem_takipte.acentem_takipte.accounting._set_entry_reconciliation_flag",
                return_value=None,
            ),
        ):
            result = resolve_reconciliation_item("REC-001", resolution_action="Matched")

        self.assertEqual(result, {"status": "Skipped", "reason": "already_resolved"})
        save_mock.assert_not_called()

    def test_commission_accrual_preview_counts_record_and_active_policies(self):
        """The reconciliation workbench commission accrual/aging/by-entity must use
        the same policy status set as the commissions balances page (Active + Record).
        The old 'Renewal'/'Pending Renewal' statuses do not exist on AT Policy and
        silently dropped Record policies from the workbench preview."""
        from acentem_takipte.acentem_takipte.tests.test_utils import ensure_test_office_branch

        suffix = frappe.generate_hash(length=8)
        insurance_company = frappe.get_doc(
            {
                "doctype": "AT Insurance Company",
                "company_name": f"Workbench Insurance {suffix}",
                "company_code": f"WI{suffix[:4]}",
            }
        ).insert(ignore_permissions=True)

        branch = frappe.get_doc(
            {
                "doctype": "AT Branch",
                "branch_name": f"Workbench Branch {suffix}",
                "branch_code": f"WB{suffix[:4]}",
                "insurance_company": insurance_company.name,
            }
        ).insert(ignore_permissions=True)

        office_branch = ensure_test_office_branch(suffix)

        sales_entity = frappe.get_doc(
            {
                "doctype": "AT Sales Entity",
                "entity_type": "Agency",
                "full_name": f"Workbench Agency {suffix}",
                "office_branch": office_branch,
            }
        ).insert(ignore_permissions=True)

        customer = frappe.get_doc(
            {
                "doctype": "AT Customer",
                "tax_id": _random_tax_id(),
                "full_name": f"Workbench Customer {suffix}",
                "phone": "05559876543",
                "email": f"wb.{suffix}@example.com",
                "assigned_agent": "Administrator",
            }
        ).insert(ignore_permissions=True)

        policy_kwargs = {
            "customer": customer.name,
            "sales_entity": sales_entity.name,
            "insurance_company": insurance_company.name,
            "branch": branch.name,
            "office_branch": office_branch,
            "issue_date": nowdate(),
            "start_date": nowdate(),
            "end_date": add_days(nowdate(), 365),
            "currency": "TRY",
            "net_premium": 1000,
            "tax_amount": 120,
        }

        active_policy = frappe.get_doc(
            {"doctype": "AT Policy", "status": "Active", "commission_amount": 150, **policy_kwargs}
        ).insert(ignore_permissions=True)
        record_policy = frappe.get_doc(
            {"doctype": "AT Policy", "status": "Record", "commission_amount": 200, **policy_kwargs}
        ).insert(ignore_permissions=True)

        for policy_name in (active_policy.name, record_policy.name):
            self.assertEqual(
                sync_accounting_entry("AT Policy", policy_name, force=True).get("status"),
                "Synced",
            )

        result = build_reconciliation_workbench(office_branch=office_branch)
        metrics = result["metrics"]

        self.assertEqual(metrics["commission_accrual_count"], 2)
        self.assertEqual(round(metrics["commission_accrual_amount_try"], 2), 350.0)

        aging = result["commission_preview"]["aging"]
        self.assertEqual(aging["total_count"], 2)
        self.assertEqual(round(aging["total_amount"], 2), 350.0)

        by_entity_total = round(
            sum(row["total_amount"] for row in result["commission_preview"]["by_entity"]), 2
        )
        self.assertEqual(by_entity_total, 350.0)

    def test_commission_preview_computed_without_accounting_entries(self):
        """The workbench must still compute the commission accrual/aging/by-entity
        preview for a branch that has commission policies but no accounting entries
        yet (previously it early-returned and dropped the whole commission preview)."""
        from acentem_takipte.acentem_takipte.tests.test_utils import ensure_test_office_branch

        suffix = frappe.generate_hash(length=8)
        insurance_company = frappe.get_doc(
            {"doctype": "AT Insurance Company", "company_name": f"WB2 Ins {suffix}", "company_code": f"W2{suffix[:4]}"}
        ).insert(ignore_permissions=True)
        branch = frappe.get_doc(
            {"doctype": "AT Branch", "branch_name": f"WB2 Branch {suffix}", "branch_code": f"W2B{suffix[:4]}", "insurance_company": insurance_company.name}
        ).insert(ignore_permissions=True)
        office_branch = ensure_test_office_branch(suffix)
        sales_entity = frappe.get_doc(
            {"doctype": "AT Sales Entity", "entity_type": "Agency", "full_name": f"WB2 Agency {suffix}", "office_branch": office_branch}
        ).insert(ignore_permissions=True)
        customer = frappe.get_doc(
            {"doctype": "AT Customer", "tax_id": _random_tax_id(), "full_name": f"WB2 Cust {suffix}", "phone": "05559876543", "email": f"wb2.{suffix}@example.com", "assigned_agent": "Administrator"}
        ).insert(ignore_permissions=True)

        kwargs = {
            "customer": customer.name, "sales_entity": sales_entity.name,
            "insurance_company": insurance_company.name, "branch": branch.name,
            "office_branch": office_branch, "issue_date": nowdate(),
            "start_date": nowdate(), "end_date": add_days(nowdate(), 365),
            "currency": "TRY", "net_premium": 1000, "tax_amount": 120,
        }
        frappe.get_doc({"doctype": "AT Policy", "status": "Active", "commission_amount": 150, **kwargs}).insert(ignore_permissions=True)
        frappe.get_doc({"doctype": "AT Policy", "status": "Record", "commission_amount": 200, **kwargs}).insert(ignore_permissions=True)

        # No accounting entries for this branch (policies never synced).
        self.assertEqual(
            frappe.db.count("AT Accounting Entry", {"office_branch": office_branch}), 0,
        )

        result = build_reconciliation_workbench(office_branch=office_branch)

        self.assertEqual(result["rows"], [])
        aging = result["commission_preview"]["aging"]
        self.assertEqual(aging["total_count"], 2)
        self.assertEqual(round(aging["total_amount"], 2), 350.0)

    @patch("frappe.get_all", return_value=[])
    def test_commission_aging_and_by_entity_use_bounded_queries_with_truncation_flag(self, mock_get_all):
        """Workbench commission aging/by-entity must not run unbounded queries.
        They scan up to a generous defensive cap and expose a ``truncated`` flag
        so a very large policy set is reported as approximate instead of
        silently under-counting the metrics."""
        mock_get_all.return_value = []
        aging = _compute_commission_aging(None)
        by_entity = _compute_commission_by_entity(None)

        self.assertEqual(mock_get_all.call_count, 2)
        for call in mock_get_all.call_args_list:
            self.assertEqual(call.kwargs.get("limit_page_length"), 20001)
        self.assertIn("truncated", aging)
        self.assertFalse(aging["truncated"])
        self.assertIsInstance(by_entity, list)

    @patch("frappe.get_all")
    def test_commission_aging_missing_issue_date_buckets_current(self, mock_get_all):
        """A policy without issue_date must be aged as 'current' (not 90_plus),
        matching the commissions balances page, so the two screens agree."""
        mock_get_all.return_value = [{"issue_date": None, "commission_amount": 100}]

        result = _compute_commission_aging(None)

        self.assertEqual(result["buckets"]["current"], 100.0)
        self.assertEqual(result["buckets"]["90_plus"], 0.0)

    @patch("frappe.db.count", return_value=0)
    @patch("frappe.get_all", return_value=[])
    def test_workbench_main_list_applies_pagination(self, mock_get_all, mock_db_count):
        """The reconciliation item main list must support backend pagination so
        the workbench is not hard-capped at the default limit."""
        build_reconciliation_workbench(limit=10, page=2)

        main_calls = [
            call
            for call in mock_get_all.call_args_list
            if call.args and call.args[0] == "AT Reconciliation Item"
        ]
        self.assertTrue(main_calls)
        main_call = main_calls[0]
        self.assertEqual(main_call.kwargs.get("limit_page_length"), 10)
        self.assertEqual(main_call.kwargs.get("limit_start"), 10)


def _create_policy(deps: dict[str, str], *, status: str, commission_amount: float):
    return frappe.get_doc(
        {
            "doctype": "AT Policy",
            "customer": deps["customer"],
            "sales_entity": deps["sales_entity"],
            "insurance_company": deps["insurance_company"],
            "branch": deps["branch"],
            "status": status,
            "issue_date": nowdate(),
            "start_date": nowdate(),
            "end_date": add_days(nowdate(), 365),
            "currency": "TRY",
            "net_premium": 1000,
            "commission_amount": commission_amount,
            "tax_amount": 120,
        }
    ).insert(ignore_permissions=True)


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

    from acentem_takipte.acentem_takipte.tests.test_utils import ensure_test_office_branch
    office_branch_name = ensure_test_office_branch(suffix)

    sales_entity = frappe.get_doc(
        {
            "doctype": "AT Sales Entity",
            "entity_type": "Agency",
            "full_name": f"Recon Agency {suffix}",
            "office_branch": office_branch_name,
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


