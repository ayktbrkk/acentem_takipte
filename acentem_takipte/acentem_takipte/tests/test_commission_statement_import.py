from __future__ import annotations

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from acentem_takipte.acentem_takipte.domains.accounting.services.statement_import import (
    build_statement_import_preview,
    _detect_duplicate_policy_refs,
    _enrich_commission_preview_rows,
)


def _csv(*lines):
    """Build a CSV string from a list of comma-separated lines."""
    return "\n".join(lines)


MATCHED_POLICY_CSV = _csv(
    "policy_no,amount_try,external_ref",
    "34567890,1000.00,DEC-001",
)

MISMATCHED_CSV = _csv(
    "policy_no,amount_try,external_ref",
    "34567890,950.00,DEC-001",
)

UNMATCHED_CSV = _csv(
    "policy_no,amount_try,external_ref",
    "99999999,500.00,DEC-001",
)

DUPLICATE_CSV = _csv(
    "policy_no,amount_try,external_ref",
    "34567890,1000.00,DEC-001",
    "34567890,800.00,DEC-002",
)

NAME_FALLBACK_CSV = _csv(
    "policy_no,amount_try,external_ref",
    "AT-POL-2026-000001,750.00,DEC-001",
)

MIXED_CSV = _csv(
    "policy_no,amount_try,external_ref",
    "34567890,1000.00,DEC-001",
    "99999999,400.00,DEC-001",
    "34567891,600.00,DEC-001",
)


def _make_policy(name, policy_no, commission_amount=1000.00, insurance_company="AT-IC-2026-00001"):
    return {
        "name": name,
        "policy_no": policy_no,
        "customer": "CUST-001",
        "insurance_company": insurance_company,
        "office_branch": "AT-OB-2026-00001",
        "status": "Active",
        "commission_amount": commission_amount,
    }


class TestCommissionStatementImport(FrappeTestCase):

    # -- _detect_duplicate_policy_refs -----------------------------------

    def test_detect_duplicate_no_duplicates(self):
        rows = [
            {"policy_no": "A"},
            {"policy_no": "B"},
            {"policy_no": "C"},
        ]
        assert _detect_duplicate_policy_refs(rows) == set()

    def test_detect_duplicate_finds_duplicates(self):
        rows = [
            {"policy_no": "A"},
            {"policy_no": "B"},
            {"policy_no": "A"},
        ]
        assert _detect_duplicate_policy_refs(rows) == {"A"}

    # -- _enrich_commission_preview_rows ---------------------------------

    def test_enrich_matched_single_row(self):
        policy_map = {"34567890": _make_policy("AT-POL-2026-000001", "34567890", 1000)}
        rows = [{"policy_no": "34567890", "amount_try": 1000, "external_ref": "DEC-001"}]
        result = _enrich_commission_preview_rows(rows, policy_map)
        assert result["summary"]["total_rows"] == 1
        assert result["summary"]["matched_rows"] == 1
        assert result["summary"]["mismatched_rows"] == 0
        assert result["summary"]["unmatched_rows"] == 0
        assert result["summary"]["duplicate_rows"] == 0
        assert result["summary"]["total_external_commission_try"] == 1000.0
        assert result["summary"]["total_local_commission_try"] == 1000.0
        assert result["summary"]["total_difference_try"] == 0.0
        assert rows[0]["match_status"] == "Matched"
        assert rows[0]["mismatch_type"] == ""
        assert rows[0]["local_commission_try"] == 1000.0
        assert rows[0]["external_commission_try"] == 1000.0

    def test_enrich_amount_mismatch(self):
        policy_map = {"34567890": _make_policy("AT-POL-2026-000001", "34567890", 1000)}
        rows = [{"policy_no": "34567890", "amount_try": 950, "external_ref": "DEC-001"}]
        result = _enrich_commission_preview_rows(rows, policy_map)
        assert result["summary"]["matched_rows"] == 0
        assert result["summary"]["mismatched_rows"] == 1
        assert result["summary"]["total_difference_try"] == -50.0
        assert rows[0]["match_status"] == "Mismatched"
        assert rows[0]["mismatch_type"] == "Amount"
        assert rows[0]["local_commission_try"] == 1000.0
        assert rows[0]["external_commission_try"] == 950.0

    def test_enrich_unmatched_missing_local(self):
        policy_map: dict = {}
        rows = [{"policy_no": "99999999", "amount_try": 500, "external_ref": "DEC-001"}]
        result = _enrich_commission_preview_rows(rows, policy_map)
        assert result["summary"]["matched_rows"] == 0
        assert result["summary"]["unmatched_rows"] == 1
        assert rows[0]["match_status"] == "Unmatched"
        assert rows[0]["mismatch_type"] == "Missing Local"
        assert rows[0]["local_commission_try"] == 0.0
        assert rows[0]["external_commission_try"] == 500.0

    def test_enrich_duplicate_policy(self):
        policy_map = {"34567890": _make_policy("AT-POL-2026-000001", "34567890", 1000)}
        rows = [
            {"policy_no": "34567890", "amount_try": 1000, "external_ref": "DEC-001"},
            {"policy_no": "34567890", "amount_try": 800, "external_ref": "DEC-002"},
        ]
        result = _enrich_commission_preview_rows(rows, policy_map)
        assert result["summary"]["duplicate_rows"] == 2
        assert rows[0]["match_status"] == "Mismatched"
        assert rows[0]["mismatch_type"] == "Duplicate"
        assert rows[1]["match_status"] == "Mismatched"
        assert rows[1]["mismatch_type"] == "Duplicate"

    # -- build_statement_import_preview (commission) ---------------------

    @patch("frappe.get_all")
    def test_preview_commission_matched(self, mock_get_all):
        policy = _make_policy("AT-POL-2026-000001", "34567890", 1000)
        mock_get_all.return_value = [policy]

        result = build_statement_import_preview(
            csv_text=MATCHED_POLICY_CSV, statement_type="commission",
        )
        assert result["summary"]["total_rows"] == 1
        assert result["summary"]["matched_rows"] == 1
        assert result["summary"]["total_external_commission_try"] == 1000.0
        assert result["rows"][0]["match_status"] == "Matched"
        assert result["rows"][0]["local_commission_try"] == 1000.0

    @patch("frappe.get_all")
    def test_preview_commission_mismatched(self, mock_get_all):
        policy = _make_policy("AT-POL-2026-000001", "34567890", 1000)
        mock_get_all.return_value = [policy]

        result = build_statement_import_preview(
            csv_text=MISMATCHED_CSV, statement_type="commission",
        )
        assert result["summary"]["mismatched_rows"] == 1
        assert result["rows"][0]["mismatch_type"] == "Amount"

    @patch("frappe.get_all")
    def test_preview_commission_unmatched(self, mock_get_all):
        mock_get_all.return_value = []

        result = build_statement_import_preview(
            csv_text=UNMATCHED_CSV, statement_type="commission",
        )
        assert result["summary"]["unmatched_rows"] == 1
        assert result["rows"][0]["mismatch_type"] == "Missing Local"

    @patch("frappe.get_all")
    def test_preview_commission_duplicate(self, mock_get_all):
        policy = _make_policy("AT-POL-2026-000001", "34567890", 1000)
        mock_get_all.return_value = [policy]

        result = build_statement_import_preview(
            csv_text=DUPLICATE_CSV, statement_type="commission",
        )
        assert result["summary"]["duplicate_rows"] == 2

    @patch("frappe.get_all")
    def test_preview_name_fallback_with_commission(self, mock_get_all):
        policy = _make_policy("AT-POL-2026-000001", "", 750)
        mock_get_all.return_value = [policy]

        result = build_statement_import_preview(
            csv_text=NAME_FALLBACK_CSV, statement_type="commission",
        )
        assert result["summary"]["matched_rows"] == 1
        assert result["rows"][0]["local_commission_try"] == 750.0

    @patch("frappe.get_all")
    def test_preview_insurance_company_filter_excludes(self, mock_get_all):
        """Policies from a different insurance company are excluded when filter is set."""
        all_policies = [
            _make_policy("AT-POL-2026-000001", "34567890", 1000, insurance_company="AT-IC-2026-00099"),
        ]

        def get_all_side_effect(doctype, filters=None, **kwargs):
            if doctype == "AT Policy" and filters and filters.get("insurance_company"):
                # When insurance_company filter is applied, return empty
                return []
            if doctype == "AT Policy":
                return all_policies
            return []

        mock_get_all.side_effect = get_all_side_effect

        result = build_statement_import_preview(
            csv_text=MATCHED_POLICY_CSV, statement_type="commission",
            insurance_company="AT-IC-2026-00001",
        )
        assert result["summary"]["unmatched_rows"] == 1

    @patch("frappe.get_all")
    def test_preview_premium_behavior_preserved(self, mock_get_all):
        policy = _make_policy("AT-POL-2026-000001", "34567890", 1000)
        mock_get_all.return_value = [policy]

        result = build_statement_import_preview(
            csv_text=MATCHED_POLICY_CSV, statement_type="premium",
        )
        assert result["summary"]["matched_rows"] == 1
        assert "total_external_commission_try" not in result["summary"]
        assert "total_amount_try" in result["summary"]


class TestCommissionStatementEndpoint(FrappeTestCase):
    def test_endpoint_accepts_params(self):
        from acentem_takipte.acentem_takipte.domains.commissions.api.endpoints import (
            upload_commission_statement_preview,
        )
        result = upload_commission_statement_preview(
            csv_text=MATCHED_POLICY_CSV,
            insurance_company="AT-IC-2026-00001",
            delimiter=",",
            limit=50,
        )
        assert "rows" in result
        assert "summary" in result
        assert "total_rows" in result["summary"]


class TestCommissionStatementImport(FrappeTestCase):
    """Tests for import_commission_statement_rows."""

    @patch("frappe.new_doc")
    @patch("frappe.get_doc")
    @patch("frappe.db.get_value")
    def test_statement_entry_reuses_missing_external_placeholder(
        self, mock_db_get_value, mock_get_doc, mock_new_doc,
    ):
        """A later statement row for a policy must reuse the 'Missing External'
        placeholder entry (external_ref='') instead of creating a second entry,
        so the stale Missing External item can close."""
        from acentem_takipte.acentem_takipte.domains.accounting.services.statement_import import (
            _get_or_create_commission_statement_entry,
        )

        def get_value_side_effect(doctype, filters, field=None, **kwargs):
            if doctype == "AT Accounting Entry" and isinstance(filters, dict):
                if filters.get("external_ref") == "STM-001":
                    return None  # no exact statement entry yet
                if filters.get("external_ref") == "":
                    return "AT-ACC-PLACEHOLDER"  # existing Missing External placeholder
            return None

        mock_db_get_value.side_effect = get_value_side_effect
        placeholder_doc = object()
        mock_get_doc.return_value = placeholder_doc
        fresh_doc = object()
        mock_new_doc.return_value = fresh_doc

        result = _get_or_create_commission_statement_entry("POL-001", "STM-001")

        assert result is placeholder_doc
        mock_get_doc.assert_called_once_with("AT Accounting Entry", "AT-ACC-PLACEHOLDER")

    @patch("frappe.db.commit")
    @patch("frappe.db.sql")
    @patch("frappe.db.get_value")
    @patch("frappe.new_doc")
    @patch("frappe.get_doc")
    @patch("frappe.get_all")
    def test_import_matched_creates_entry_no_reconciliation(
        self, mock_get_all, mock_get_doc, mock_new_doc, mock_db_get_value, mock_sql, mock_commit,
    ):
        """Matched row creates an AT Accounting Entry and no reconciliation item."""
        policy = _make_policy("AT-POL-2026-000001", "34567890", 1000)
        mock_get_all.return_value = [policy]
        mock_db_get_value.return_value = None
        mock_sql.return_value = [[0]]

        class FakeEntry:
            def __init__(self):
                self.name = ""
                self.source_doctype = "AT Policy"
                self.source_name = "AT-POL-2026-000001"
                self.status = "Draft"
                self.integration_hash = ""

            def save(self, **kw):
                if not self.name:
                    self.name = "AT-ACC-2026-000001"

            def insert(self, **kw):
                self.name = "AT-ACC-2026-000001"

        mock_new_doc.return_value = FakeEntry()
        mock_get_doc.return_value = FakeEntry()

        from acentem_takipte.acentem_takipte.domains.accounting.services.statement_import import (
            import_commission_statement_rows,
        )
        result = import_commission_statement_rows(
            csv_text=MATCHED_POLICY_CSV,
            insurance_company="AT-IC-2026-00001",
        )
        assert result["imported"] == 1
        assert result["skipped"] == 0
        assert result["open_items"] == 0

    @patch("frappe.db.commit")
    @patch("frappe.db.sql")
    @patch("frappe.db.get_value")
    @patch("frappe.new_doc")
    @patch("frappe.get_doc")
    @patch("frappe.get_all")
    def test_import_mismatch_creates_reconciliation_item(
        self, mock_get_all, mock_get_doc, mock_new_doc, mock_db_get_value, mock_sql, mock_commit,
    ):
        """Amount mismatch creates an open reconciliation item."""
        policy = _make_policy("AT-POL-2026-000001", "34567890", 1000)
        mock_get_all.return_value = [policy]
        mock_db_get_value.return_value = None
        mock_sql.return_value = [[0]]

        def new_doc_side_effect(doctype):
            if doctype == "AT Accounting Entry":
                e = type("FakeEntry", (), {})()
                e.name = ""
                e.source_doctype = "AT Policy"
                e.source_name = "AT-POL-2026-000001"
                e.status = "Draft"
                e.integration_hash = ""
                e.save = lambda **kw: setattr(e, "name", e.name or "AT-ACC-2026-000001")
                e.insert = lambda **kw: setattr(e, "name", "AT-ACC-2026-000001")
                return e
            if doctype == "AT Reconciliation Item":
                ri = type("FakeRI", (), {})()
                ri.name = ""
                ri.save = lambda **kw: setattr(ri, "name", ri.name or "AT-REC-2026-000001")
                ri.insert = lambda **kw: setattr(ri, "name", "AT-REC-2026-000001")
                return ri
            return type("Fake", (), {})()

        mock_new_doc.side_effect = new_doc_side_effect
        mock_get_doc.return_value = new_doc_side_effect("AT Accounting Entry")

        from acentem_takipte.acentem_takipte.domains.accounting.services.statement_import import (
            import_commission_statement_rows,
        )
        result = import_commission_statement_rows(
            csv_text=MISMATCHED_CSV,
            insurance_company="AT-IC-2026-00001",
        )
        assert result["imported"] == 1
        assert result["open_items"] >= 1

    @patch("frappe.db.commit")
    @patch("frappe.db.sql")
    @patch("frappe.db.get_value")
    @patch("frappe.new_doc")
    @patch("frappe.get_doc")
    @patch("frappe.get_all")
    def test_import_skips_duplicate_and_unmatched(
        self, mock_get_all, mock_get_doc, mock_new_doc, mock_db_get_value, mock_sql, mock_commit,
    ):
        """Duplicate and unmatched rows are skipped."""
        policy = _make_policy("AT-POL-2026-000001", "34567890", 1000)
        mock_get_all.return_value = [policy]
        mock_db_get_value.return_value = None
        mock_sql.return_value = [[0]]

        def new_doc_side_effect(doctype):
            e = type("Fake", (), {})()
            e.name = ""
            e.source_doctype = "AT Policy"
            e.source_name = "AT-POL-2026-000001"
            e.status = "Draft"
            e.integration_hash = ""
            e.save = lambda **kw: setattr(e, "name", e.name or "AT-ACC-2026-000001")
            e.insert = lambda **kw: setattr(e, "name", "AT-ACC-2026-000001")
            return e

        mock_new_doc.side_effect = new_doc_side_effect
        mock_get_doc.return_value = new_doc_side_effect("AT Accounting Entry")

        csv = _csv(
            "policy_no,amount_try,external_ref",
            "34567890,1000.00,DEC-001",
            "34567890,800.00,DEC-002",
            "99999999,400.00,DEC-001",
        )

        from acentem_takipte.acentem_takipte.domains.accounting.services.statement_import import (
            import_commission_statement_rows,
        )
        result = import_commission_statement_rows(
            csv_text=csv,
            insurance_company="AT-IC-2026-00001",
        )
        assert result["imported"] == 0
        assert result["skipped"] == 3
        assert result["skipped_duplicate"] == 2

    @patch("frappe.db.commit")
    @patch("frappe.db.sql")
    @patch("frappe.db.get_value")
    @patch("frappe.new_doc")
    @patch("frappe.get_doc")
    @patch("frappe.get_all")
    def test_import_different_external_ref_creates_separate_entries(
        self, mock_get_all, mock_get_doc, mock_new_doc, mock_db_get_value, mock_sql, mock_commit,
    ):
        """Different statement periods for the same policy create separate entries."""
        policy = _make_policy("AT-POL-2026-000001", "34567890", 1000)
        mock_get_all.return_value = [policy]
        mock_sql.return_value = [[0]]

        def db_get_value_side_effect(doctype, name_or_filters, field=None, **kw):
            if doctype == "AT Accounting Entry" and isinstance(name_or_filters, dict):
                return None
            return None

        mock_db_get_value.side_effect = db_get_value_side_effect

        def new_doc_side_effect(doctype):
            e = type("FakeEntry", (), {})()
            e.name = ""
            e.source_doctype = "AT Policy"
            e.source_name = "AT-POL-2026-000001"
            e.status = "Draft"
            e.integration_hash = ""
            count = [0]

            def do_insert(**kw):
                count[0] += 1
                e.name = f"AT-ACC-{count[0]}"

            e.insert = do_insert
            e.save = lambda **kw: setattr(e, "name", e.name or "AT-ACC-999")
            return e

        mock_new_doc.side_effect = new_doc_side_effect
        mock_get_doc.return_value = new_doc_side_effect("AT Accounting Entry")

        from acentem_takipte.acentem_takipte.domains.accounting.services.statement_import import (
            import_commission_statement_rows,
        )

        csv_dec = _csv("policy_no,amount_try,external_ref", "34567890,1000.00,DEC-001")
        result1 = import_commission_statement_rows(csv_text=csv_dec, insurance_company="AT-IC-2026-00001")
        assert result1["imported"] == 1

        csv_jan = _csv("policy_no,amount_try,external_ref", "34567890,900.00,JAN-002")
        result2 = import_commission_statement_rows(csv_text=csv_jan, insurance_company="AT-IC-2026-00001")
        # Both should import since they have different external_ref values
        assert result2["imported"] == 1

    @patch("frappe.db.commit")
    @patch("frappe.db.sql")
    @patch("frappe.db.get_value")
    @patch("frappe.new_doc")
    @patch("frappe.get_doc")
    @patch("frappe.get_all")
    def test_import_local_amount_is_commission_not_gross(
        self, mock_get_all, mock_get_doc, mock_new_doc, mock_db_get_value, mock_sql, mock_commit,
    ):
        policy = _make_policy("AT-POL-2026-000001", "34567890", 750)
        mock_get_all.return_value = [policy]
        mock_db_get_value.return_value = None
        mock_sql.return_value = [[0]]

        captured_local = []

        class FakeEntry:
            def __init__(self):
                self.name = ""
                self.source_doctype = "AT Policy"
                self.source_name = "AT-POL-2026-000001"
                self.status = "Draft"
                self.integration_hash = ""

            def save(self, **kw):
                captured_local.append(self.local_amount_try)
                if not self.name:
                    self.name = "AT-ACC-2026-000001"

            def insert(self, **kw):
                captured_local.append(self.local_amount_try)
                self.name = "AT-ACC-2026-000001"

        mock_new_doc.return_value = FakeEntry()
        mock_get_doc.return_value = FakeEntry()

        from acentem_takipte.acentem_takipte.domains.accounting.services.statement_import import (
            import_commission_statement_rows,
        )
        csv = _csv("policy_no,amount_try,external_ref", "34567890,750.00,DEC-001")
        import_commission_statement_rows(csv_text=csv, insurance_company="AT-IC-2026-00001")
        assert captured_local[0] == 750.0


class TestCommissionStatementResolutionFlow(FrappeTestCase):
    """End-to-end: a Missing External item resolves when the policy later
    appears in a commission statement (no duplicate entry, no stale item)."""

    def tearDown(self) -> None:
        import frappe

        frappe.db.rollback()

    def _create_policy(self, policy_no: str, commission_amount: float):
        from acentem_takipte.acentem_takipte.tests.test_utils import ensure_test_office_branch

        suffix = frappe.generate_hash(length=8)
        insurance_company = frappe.get_doc(
            {
                "doctype": "AT Insurance Company",
                "company_name": f"Flow Insurance {suffix}",
                "company_code": f"FI{suffix[:4]}",
            }
        ).insert(ignore_permissions=True)

        branch = frappe.get_doc(
            {
                "doctype": "AT Branch",
                "branch_name": f"Flow Branch {suffix}",
                "branch_code": f"FB{suffix[:4]}",
                "insurance_company": insurance_company.name,
            }
        ).insert(ignore_permissions=True)

        office_branch = ensure_test_office_branch(suffix)

        sales_entity = frappe.get_doc(
            {
                "doctype": "AT Sales Entity",
                "entity_type": "Agency",
                "full_name": f"Flow Agency {suffix}",
                "office_branch": office_branch,
            }
        ).insert(ignore_permissions=True)

        customer = frappe.get_doc(
            {
                "doctype": "AT Customer",
                "tax_id": _random_tax_id(),
                "full_name": f"Flow Customer {suffix}",
                "phone": "05559876543",
                "email": f"flow.{suffix}@example.com",
                "assigned_agent": "Administrator",
            }
        ).insert(ignore_permissions=True)

        policy = frappe.get_doc(
            {
                "doctype": "AT Policy",
                "policy_no": policy_no,
                "customer": customer.name,
                "sales_entity": sales_entity.name,
                "insurance_company": insurance_company.name,
                "branch": branch.name,
                "office_branch": office_branch,
                "status": "Active",
                "issue_date": frappe.utils.nowdate(),
                "start_date": frappe.utils.nowdate(),
                "end_date": frappe.utils.add_days(frappe.utils.nowdate(), 365),
                "currency": "TRY",
                "net_premium": 1000,
                "commission_amount": commission_amount,
                "tax_amount": 120,
            }
        ).insert(ignore_permissions=True)

        return {
            "insurance_company": insurance_company.name,
            "office_branch": office_branch,
            "policy": policy.name,
            "policy_no": policy.policy_no,
        }

    def test_later_statement_reuses_placeholder_and_closes_missing_external(self):
        from acentem_takipte.acentem_takipte.domains.accounting.services.statement_import import (
            generate_missing_external_for_commission_statement,
            import_commission_statement_rows,
        )

        deps = self._create_policy("FLOW-2026-0001", 1000.0)

        # 1. Policy is not in the statement -> Missing External placeholder.
        result = generate_missing_external_for_commission_statement(
            policy_refs_from_statement=[],
            insurance_company=deps["insurance_company"],
            office_branch=deps["office_branch"],
        )
        self.assertEqual(result["generated"], 1)

        entry_name = frappe.db.get_value(
            "AT Accounting Entry",
            {"source_doctype": "AT Policy", "source_name": deps["policy"]},
            "name",
        )
        self.assertTrue(entry_name)
        placeholder = frappe.get_doc("AT Accounting Entry", entry_name)
        self.assertEqual(placeholder.external_ref, "")
        self.assertTrue(
            frappe.db.exists(
                "AT Reconciliation Item",
                {
                    "accounting_entry": entry_name,
                    "status": "Open",
                    "mismatch_type": "Missing External",
                },
            )
        )

        # 2. A later statement now includes the policy.
        csv = _csv(
            "policy_no,amount_try,external_ref",
            f"{deps['policy_no']},1000.00,STM-001",
        )
        import_result = import_commission_statement_rows(
            csv_text=csv,
            insurance_company=deps["insurance_company"],
            office_branch=deps["office_branch"],
            generate_missing=False,
        )
        self.assertEqual(import_result["imported"], 1)
        self.assertEqual(import_result["open_items"], 0)

        # 3. The SAME entry is reused (no duplicate) with the real external ref.
        entries = frappe.get_all(
            "AT Accounting Entry",
            filters={"source_doctype": "AT Policy", "source_name": deps["policy"]},
            fields=["name", "external_ref"],
        )
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["external_ref"], "STM-001")

        # 4. The stale Missing External item is closed.
        self.assertEqual(
            frappe.db.count(
                "AT Reconciliation Item",
                {
                    "accounting_entry": entry_name,
                    "status": "Open",
                    "mismatch_type": "Missing External",
                },
            ),
            0,
        )


def _random_tax_id() -> str:
    import frappe

    raw = "".join(char for char in frappe.generate_hash(length=12) if char.isdigit())[:9].ljust(9, "1")
    if raw.startswith("0"):
        raw = f"1{raw[1:]}"
    digits = [int(char) for char in raw]
    tenth = ((sum(digits[0:9:2]) * 7) - sum(digits[1:8:2])) % 10
    eleventh = (sum(digits) + tenth) % 10
    return f"{raw}{tenth}{eleventh}"


class TestMissingExternalGeneration(FrappeTestCase):
    """Tests for generate_missing_external_for_commission_statement."""

    @patch("frappe.db.commit")
    @patch("frappe.db.sql")
    @patch("frappe.db.get_value")
    @patch("frappe.new_doc")
    @patch("frappe.get_doc")
    @patch("frappe.get_all")
    def test_missing_external_generates_for_unlisted_policies(
        self, mock_get_all, mock_get_doc, mock_new_doc, mock_db_get_value, mock_sql, mock_commit,
    ):
        """Policies missing from statement get Missing External reconciliation items."""
        system_policies = [
            {"name": "POL-001", "policy_no": "34567890", "commission_amount": 1000,
             "customer": "CUST-001", "insurance_company": "AT-IC-2026-00001", "office_branch": "AT-OB-2026-00001"},
            {"name": "POL-002", "policy_no": "34567891", "commission_amount": 500,
             "customer": "CUST-001", "insurance_company": "AT-IC-2026-00001", "office_branch": "AT-OB-2026-00001"},
            {"name": "POL-003", "policy_no": "34567892", "commission_amount": 750,
             "customer": "CUST-001", "insurance_company": "AT-IC-2026-00001", "office_branch": "AT-OB-2026-00001"},
        ]
        mock_get_all.return_value = system_policies
        mock_db_get_value.return_value = None
        mock_sql.return_value = [[0]]

        entry_count = [0]

        def new_doc_side_effect(doctype):
            e = type("Fake", (), {})()
            e.name = ""
            e.source_doctype = "AT Policy"
            e.source_name = ""
            e.status = "Draft"
            e.integration_hash = ""
            if doctype == "AT Reconciliation Item":
                e.save = lambda **kw: setattr(e, "name", e.name or f"AT-REC-{entry_count[0]}")
                e.insert = lambda **kw: (entry_count.__setitem__(0, entry_count[0] + 1), setattr(e, "name", f"AT-REC-{entry_count[0]}"))[-1]
            else:
                e.save = lambda **kw: setattr(e, "name", e.name or "AT-ACC-999")
                e.insert = lambda **kw: setattr(e, "name", "AT-ACC-999")
            return e

        mock_new_doc.side_effect = new_doc_side_effect
        mock_get_doc.side_effect = new_doc_side_effect

        from acentem_takipte.acentem_takipte.domains.accounting.services.statement_import import (
            generate_missing_external_for_commission_statement,
        )
        # Only POL-001 is in the statement
        result = generate_missing_external_for_commission_statement(
            policy_refs_from_statement=["34567890"],
            insurance_company="AT-IC-2026-00001",
        )
        assert result["generated"] == 2  # POL-002 and POL-003

    @patch("frappe.db.commit")
    @patch("frappe.db.sql")
    @patch("frappe.db.get_value")
    @patch("frappe.new_doc")
    @patch("frappe.get_doc")
    @patch("frappe.get_all")
    def test_missing_external_empty_when_all_matched(
        self, mock_get_all, mock_get_doc, mock_new_doc, mock_db_get_value, mock_sql, mock_commit,
    ):
        """No Missing External when all policies are in the statement."""
        mock_get_all.return_value = []
        mock_db_get_value.return_value = None
        mock_sql.return_value = [[0]]

        from acentem_takipte.acentem_takipte.domains.accounting.services.statement_import import (
            generate_missing_external_for_commission_statement,
        )
        result = generate_missing_external_for_commission_statement(
            policy_refs_from_statement=[],
            insurance_company="AT-IC-2026-00001",
        )
        assert result["generated"] == 0
