from __future__ import annotations

import json
from datetime import date
from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from acentem_takipte.acentem_takipte.domains.commissions.services.balance import (
    _is_commission_entry,
    build_commission_distribution,
    compute_commission_balances,
    compute_commission_policy_detail,
    validate_distribution_path_shares,
)

# Ensure the AT Payment controller is registered for doc construction.
import acentem_takipte.acentem_takipte.doctype.at_payment.at_payment  # noqa: F401


def _random_tax_id() -> str:
    raw = "".join(char for char in frappe.generate_hash(length=12) if char.isdigit())[:9].ljust(9, "1")
    if raw.startswith("0"):
        raw = f"1{raw[1:]}"
    digits = [int(char) for char in raw]
    tenth = ((sum(digits[0:9:2]) * 7) - sum(digits[1:8:2])) % 10
    eleventh = (sum(digits) + tenth) % 10
    return f"{raw}{tenth}{eleventh}"


def _dist(entity_name, amount_try):
    return json.dumps([{
        "entity": entity_name,
        "entity_name": entity_name,
        "level": 0,
        "share_pct": 100,
        "amount": amount_try,
        "amount_try": amount_try,
        "status": "Accrued",
    }])


class TestPaidPayoutFiltering(FrappeTestCase):
    """A: only status=Paid counts toward paid; Draft is pending; Cancelled is out."""

    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_draft_payout_is_pending_not_paid(self, mock_get_all, mock_db_get_value):
        entity = "ENT-001"
        policies = [
            {"name": "POL-A", "issue_date": None, "sales_entity": entity,
             "commission_distribution": _dist(entity, 1000),
             "insurance_company": "AT-IC-2026-00001"},
        ]
        payments = [
            {"status": "Draft", "sales_entity": entity, "amount_try": 400, "policy": "POL-A"},
        ]

        def get_all_side_effect(doctype, filters=None, fields=None, **kwargs):
            if doctype == "AT Policy":
                return policies
            if doctype == "AT Payment":
                return payments
            return []

        mock_get_all.side_effect = get_all_side_effect
        mock_db_get_value.return_value = ""

        result = compute_commission_balances()
        ent = result["entities"][0]
        assert ent["paid_try"] == 0.0
        assert ent["pending_try"] == 400.0
        assert result["summary"]["total_paid_try"] == 0.0
        assert result["summary"]["total_pending_try"] == 400.0

    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_cancelled_payout_excluded_from_all_totals(self, mock_get_all, mock_db_get_value):
        entity = "ENT-001"
        policies = [
            {"name": "POL-A", "issue_date": None, "sales_entity": entity,
             "commission_distribution": _dist(entity, 1000),
             "insurance_company": "AT-IC-2026-00001"},
        ]
        payments = [
            {"status": "Cancelled", "sales_entity": entity, "amount_try": 900, "policy": "POL-A"},
        ]

        def get_all_side_effect(doctype, filters=None, fields=None, **kwargs):
            if doctype == "AT Policy":
                return policies
            if doctype == "AT Payment":
                return payments
            return []

        mock_get_all.side_effect = get_all_side_effect
        mock_db_get_value.return_value = ""

        result = compute_commission_balances()
        ent = result["entities"][0]
        assert ent["paid_try"] == 0.0
        assert ent["pending_try"] == 0.0
        assert result["summary"]["total_paid_try"] == 0.0
        assert result["summary"]["total_pending_try"] == 0.0

    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_two_paid_payouts_aggregate(self, mock_get_all, mock_db_get_value):
        entity = "ENT-001"
        policies = [
            {"name": "POL-A", "issue_date": None, "sales_entity": entity,
             "commission_distribution": _dist(entity, 1000),
             "insurance_company": "AT-IC-2026-00001"},
        ]
        payments = [
            {"status": "Paid", "sales_entity": entity, "amount_try": 300, "policy": "POL-A"},
            {"status": "Paid", "sales_entity": entity, "amount_try": 200, "policy": "POL-A"},
        ]

        def get_all_side_effect(doctype, filters=None, fields=None, **kwargs):
            if doctype == "AT Policy":
                return policies
            if doctype == "AT Payment":
                return payments
            return []

        mock_get_all.side_effect = get_all_side_effect
        mock_db_get_value.return_value = ""

        result = compute_commission_balances()
        assert result["summary"]["total_paid_try"] == 500.0


class TestPolicyDetailAggregation(FrappeTestCase):
    """B: multiple paid payouts aggregate per policy; totals use the full dataset."""

    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_policy_detail_aggregates_multiple_payments(self, mock_get_all, mock_db_get_value):
        entity = "ENT-001"
        policy = {
            "name": "POL-A", "policy_no": "P1", "customer": "CUST-1",
            "insurance_company": "IC-1", "branch": "BR-1", "gross_premium": 1000,
            "issue_date": date(2026, 1, 1),
            "commission_distribution": _dist(entity, 1000),
        }
        payments = [
            {"name": "PAY-1", "payment_no": "T-1", "amount_try": 300, "payment_date": "2026-02-01",
             "reference_no": "R1", "policy": "POL-A", "status": "Paid"},
            {"name": "PAY-2", "payment_no": "T-2", "amount_try": 200, "payment_date": "2026-03-01",
             "reference_no": "R2", "policy": "POL-A", "status": "Paid"},
        ]

        def get_all_side_effect(doctype, **kwargs):
            if doctype == "AT Policy":
                return [policy]
            if doctype == "AT Payment":
                return payments
            return []

        mock_get_all.side_effect = get_all_side_effect
        mock_db_get_value.return_value = None

        result = compute_commission_policy_detail(entity)
        p = result["policies"][0]
        assert p["paid_amount_try"] == 500.0
        assert len(p["payments"]) == 2
        assert p["last_payment_date"] == "2026-03-01"
        assert result["totals"]["paid"] == 500.0
        assert result["totals"]["commission"] == 1000.0

    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_policy_detail_totals_not_limited(self, mock_get_all, mock_db_get_value):
        entity = "ENT-001"
        policies = [
            {"name": "POL-A", "policy_no": "P1", "customer": "CUST-1",
             "insurance_company": "IC-1", "branch": "BR-1", "gross_premium": 1000,
             "issue_date": date(2026, 1, 1), "commission_distribution": _dist(entity, 400)},
            {"name": "POL-B", "policy_no": "P2", "customer": "CUST-2",
             "insurance_company": "IC-1", "branch": "BR-1", "gross_premium": 2000,
             "issue_date": date(2026, 2, 1), "commission_distribution": _dist(entity, 600)},
        ]

        def get_all_side_effect(doctype, **kwargs):
            if doctype == "AT Policy":
                return policies
            if doctype == "AT Payment":
                return []
            return []

        mock_get_all.side_effect = get_all_side_effect
        mock_db_get_value.return_value = None

        result = compute_commission_policy_detail(entity, limit=1)
        # Totals must reflect BOTH policies even though only 1 row is returned.
        assert result["totals"]["policies"] == 2
        assert result["totals"]["commission"] == 1000.0
        assert len(result["policies"]) == 1


class TestDistributionPathValidation(FrappeTestCase):
    """D: chain share sum >100 must be rejected; distribution never has negatives."""

    @patch("frappe.db.get_value")
    def test_path_share_sum_over_100_invalid(self, mock_db_get_value):
        entity_data = {
            "REP": {"commission_share_pct": 70, "is_root": 0, "parent_entity": "SUB"},
            "SUB": {"commission_share_pct": 40, "is_root": 0, "parent_entity": "ROOT"},
            "ROOT": {"commission_share_pct": 100, "is_root": 1, "parent_entity": None},
        }

        def side_effect(doctype, name, fields, as_dict=False):
            if doctype == "AT Sales Entity" and name in entity_data:
                return entity_data[name]
            return None

        mock_db_get_value.side_effect = side_effect
        valid, violations = validate_distribution_path_shares("REP")
        assert valid is False
        assert any("100%" in v for v in violations)

    @patch("frappe.db.get_value")
    def test_path_share_sum_within_100_valid(self, mock_db_get_value):
        entity_data = {
            "REP": {"commission_share_pct": 40, "is_root": 0, "parent_entity": "SUB"},
            "SUB": {"commission_share_pct": 30, "is_root": 0, "parent_entity": "ROOT"},
            "ROOT": {"commission_share_pct": 100, "is_root": 1, "parent_entity": None},
        }

        def side_effect(doctype, name, fields, as_dict=False):
            if doctype == "AT Sales Entity" and name in entity_data:
                return entity_data[name]
            return None

        mock_db_get_value.side_effect = side_effect
        valid, violations = validate_distribution_path_shares("REP")
        assert valid is True
        assert violations == []

    @patch("frappe.db.get_value")
    def test_build_distribution_no_negative_root(self, mock_db_get_value):
        entity_data = {
            "REP": {"commission_share_pct": 50, "full_name": "Rep", "parent_entity": "ROOT",
                    "office_branch": "OB", "is_root": 0},
            "ROOT": {"commission_share_pct": 100, "full_name": "Root", "parent_entity": None,
                     "office_branch": "OB", "is_root": 1},
        }

        def side_effect(doctype, name, fields, as_dict=False):
            if doctype == "AT Sales Entity" and name in entity_data:
                return entity_data[name]
            return None

        mock_db_get_value.side_effect = side_effect

        result = json.loads(build_commission_distribution("REP", 1000, 1))
        total = sum(e["amount"] for e in result)
        assert abs(total - 1000) < 0.01
        for entry in result:
            assert entry["amount"] >= 0
            assert entry["amount_try"] >= 0
        root = [e for e in result if e.get("is_root")]
        assert root and root[0]["amount"] >= 0

    @patch("frappe.db.get_value")
    def test_build_distribution_rejects_path_over_100(self, mock_db_get_value):
        entity_data = {
            "REP": {"commission_share_pct": 70, "full_name": "Rep", "parent_entity": "SUB",
                    "office_branch": "OB", "is_root": 0},
            "SUB": {"commission_share_pct": 40, "full_name": "Sub", "parent_entity": "ROOT",
                    "office_branch": "OB", "is_root": 0},
            "ROOT": {"commission_share_pct": 100, "full_name": "Root", "parent_entity": None,
                     "office_branch": "OB", "is_root": 1},
        }

        def side_effect(doctype, name, fields, as_dict=False):
            if doctype == "AT Sales Entity" and name in entity_data:
                return entity_data[name]
            return None

        mock_db_get_value.side_effect = side_effect

        with self.assertRaises(Exception):
            build_commission_distribution("REP", 1000, 1)

    @patch("frappe.db.get_value")
    def test_build_distribution_total_try_exact(self, mock_db_get_value):
        entity_data = {
            "REP": {"commission_share_pct": 33, "full_name": "Rep", "parent_entity": "ROOT",
                    "office_branch": "OB", "is_root": 0},
            "ROOT": {"commission_share_pct": 100, "full_name": "Root", "parent_entity": None,
                     "office_branch": "OB", "is_root": 1},
        }

        def side_effect(doctype, name, fields, as_dict=False):
            if doctype == "AT Sales Entity" and name in entity_data:
                return entity_data[name]
            return None

        mock_db_get_value.side_effect = side_effect

        result = json.loads(build_commission_distribution("REP", 2000, 30.5))
        total_try = sum(e["amount_try"] for e in result)
        assert abs(total_try - round(2000 * 30.5, 2)) < 0.02


class TestStatementScope(FrappeTestCase):
    """G: commission history/reconciliation excludes premium and generic entries."""

    def test_is_commission_entry(self):
        assert _is_commission_entry({"statement_type": "commission"}) is True
        assert _is_commission_entry({"statement_type": "premium"}) is False
        assert _is_commission_entry({
            "statement_type": "",
            "payload_json": json.dumps({"import_source": "commission_statement"}),
        }) is True
        assert _is_commission_entry({
            "statement_type": "",
            "payload_json": json.dumps({"import_source": "missing_external"}),
        }) is True
        assert _is_commission_entry({
            "statement_type": "",
            "payload_json": json.dumps({"import_source": "statement_preview"}),
        }) is False
        assert _is_commission_entry({"statement_type": "", "payload_json": "{}"}) is False

    @patch("frappe.db.count", return_value=0)
    @patch("frappe.get_all")
    def test_reconciliation_summary_excludes_premium(self, mock_get_all, mock_db_count):
        from acentem_takipte.acentem_takipte.domains.commissions.services.balance import (
            _commission_reconciliation_summary,
        )
        entries = [
            {"name": "E-COMM", "statement_type": "commission", "payload_json": "{}"},
            {"name": "E-PREMIUM", "statement_type": "premium", "payload_json": "{}"},
        ]
        mock_get_all.return_value = entries

        result = _commission_reconciliation_summary()
        # Only the commission entry is counted.
        assert mock_db_count.call_args_list, "expected count queries"
        call_filters = [c.args[1] for c in mock_db_count.call_args_list]
        for filters in call_filters:
            assert filters["accounting_entry"][1] == ["E-COMM"]


class TestMultiCurrency(FrappeTestCase):
    @patch("frappe.db.get_value")
    def test_multi_currency_amount_try_consistent(self, mock_db_get_value):
        entity_data = {
            "REP": {"commission_share_pct": 50, "full_name": "Rep", "parent_entity": "ROOT",
                    "office_branch": "OB", "is_root": 0},
            "ROOT": {"commission_share_pct": 100, "full_name": "Root", "parent_entity": None,
                     "office_branch": "OB", "is_root": 1},
        }

        def side_effect(doctype, name, fields, as_dict=False):
            if doctype == "AT Sales Entity" and name in entity_data:
                return entity_data[name]
            return None

        mock_db_get_value.side_effect = side_effect

        result = json.loads(build_commission_distribution("REP", 2000, 30.5))
        total_try = sum(e["amount_try"] for e in result)
        assert abs(total_try - (2000 * 30.5)) < 0.02
        for entry in result:
            assert abs(entry["amount_try"] - entry["amount"] * 30.5) < 0.02


def _new_payout(policy=None, sales_entity=None, amount=100.0, status="Draft", customer="CUST-001"):
    """Build an unsaved AT Payment doc for a commission payout."""
    return frappe.get_doc(
        {
            "doctype": "AT Payment",
            "policy": policy,
            "sales_entity": sales_entity,
            "customer": customer,
            "payment_purpose": "Commission Payout",
            "payment_direction": "Outbound",
            "status": status,
            "currency": "TRY",
            "amount": amount,
            "fx_rate": 1,
            "installment_count": 1,
            "installment_interval_days": 30,
        }
    )


def _create_policy_with_entity(suffix: str, commission_amount: float):
    """Create a real policy whose distribution allocates to one sales entity."""
    from acentem_takipte.acentem_takipte.tests.test_utils import ensure_test_office_branch

    insurance_company = frappe.get_doc(
        {
            "doctype": "AT Insurance Company",
            "company_name": f"C Insurance {suffix}",
            "company_code": f"CI{suffix[:4]}",
        }
    ).insert(ignore_permissions=True)
    branch = frappe.get_doc(
        {
            "doctype": "AT Branch",
            "branch_name": f"C Branch {suffix}",
            "branch_code": f"CB{suffix[:4]}",
            "insurance_company": insurance_company.name,
        }
    ).insert(ignore_permissions=True)
    office_branch = ensure_test_office_branch(suffix)
    sales_entity = frappe.get_doc(
        {
            "doctype": "AT Sales Entity",
            "entity_type": "Agency",
            "full_name": f"C Agency {suffix}",
            "office_branch": office_branch,
        }
    ).insert(ignore_permissions=True)
    customer = frappe.get_doc(
        {
            "doctype": "AT Customer",
            "tax_id": _random_tax_id(),
            "full_name": f"C Customer {suffix}",
            "phone": "05559876543",
            "email": f"c.{suffix}@example.com",
            "assigned_agent": "Administrator",
        }
    ).insert(ignore_permissions=True)
    policy = frappe.get_doc(
        {
            "doctype": "AT Policy",
            "policy_no": f"C-{suffix[:8]}",
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
        "policy": policy.name,
        "sales_entity": sales_entity.name,
        "customer": customer.name,
        "office_branch": office_branch,
    }


class TestPayoutEntityValidation(FrappeTestCase):
    """C: commission payout must link a sales entity that is in the policy
    distribution, and must not exceed that entity's allocation."""

    def tearDown(self) -> None:
        frappe.db.rollback()

    def test_payout_requires_sales_entity(self):
        deps = _create_policy_with_entity(frappe.generate_hash(length=8), 1000)
        doc = _new_payout(policy=deps["policy"], sales_entity=None, amount=100,
                          customer=deps["customer"])
        with self.assertRaises(frappe.ValidationError):
            doc.insert()

    def test_payout_entity_must_be_in_distribution(self):
        deps = _create_policy_with_entity(frappe.generate_hash(length=8), 1000)
        other_entity = frappe.get_doc(
            {
                "doctype": "AT Sales Entity",
                "entity_type": "Agency",
                "full_name": f"Other {frappe.generate_hash(length=6)}",
                "office_branch": deps["office_branch"],
            }
        ).insert(ignore_permissions=True)
        doc = _new_payout(policy=deps["policy"], sales_entity=other_entity.name,
                          amount=100, customer=deps["customer"])
        with self.assertRaises(frappe.ValidationError):
            doc.insert()

    def test_payout_exceeds_entity_allocation_rejected(self):
        deps = _create_policy_with_entity(frappe.generate_hash(length=8), 1000)
        # Entity is the only non-root in the chain, so its allocation = 1000.
        doc = _new_payout(policy=deps["policy"], sales_entity=deps["sales_entity"],
                          amount=2000, customer=deps["customer"])
        with self.assertRaises(frappe.ValidationError):
            doc.insert()

    def test_payout_within_allocation_accepted(self):
        deps = _create_policy_with_entity(frappe.generate_hash(length=8), 1000)
        doc = _new_payout(policy=deps["policy"], sales_entity=deps["sales_entity"],
                          amount=500, customer=deps["customer"])
        doc.insert(ignore_permissions=True)
        self.assertTrue(doc.name)

    def test_two_paid_payouts_cumulative_cap(self):
        deps = _create_policy_with_entity(frappe.generate_hash(length=8), 1000)
        first = _new_payout(policy=deps["policy"], sales_entity=deps["sales_entity"],
                            amount=600, status="Paid", customer=deps["customer"])
        first.insert(ignore_permissions=True)
        second = _new_payout(policy=deps["policy"], sales_entity=deps["sales_entity"],
                             amount=500, status="Paid", customer=deps["customer"])
        with self.assertRaises(frappe.ValidationError):
            second.insert()


def _new_payout_currency(policy, sales_entity, customer, amount, currency, fx_rate, status="Draft"):
    """Build a payout in a non-TRY currency for cap tests."""
    return frappe.get_doc(
        {
            "doctype": "AT Payment",
            "policy": policy,
            "sales_entity": sales_entity,
            "customer": customer,
            "payment_purpose": "Commission Payout",
            "payment_direction": "Outbound",
            "status": status,
            "currency": currency,
            "amount": amount,
            "fx_rate": fx_rate,
            "installment_count": 1,
            "installment_interval_days": 30,
        }
    )


class TestPayoutMultiCurrency(FrappeTestCase):
    """C: entity allocation cap compares TRY-equivalent amount_try, and
    Cancelled payouts are excluded from the committed total."""

    def tearDown(self) -> None:
        frappe.db.rollback()

    def test_usd_payout_within_allocation_accepted(self):
        deps = _create_policy_with_entity(frappe.generate_hash(length=8), 1000)
        # 40 USD * 25 = 1000 TRY == allocation
        doc = _new_payout_currency(deps["policy"], deps["sales_entity"], deps["customer"],
                                   amount=40, currency="USD", fx_rate=25)
        doc.insert(ignore_permissions=True)
        self.assertTrue(doc.name)

    def test_usd_payout_exceeding_allocation_rejected(self):
        deps = _create_policy_with_entity(frappe.generate_hash(length=8), 1000)
        # 50 USD * 25 = 1250 TRY > 1000 allocation
        doc = _new_payout_currency(deps["policy"], deps["sales_entity"], deps["customer"],
                                   amount=50, currency="USD", fx_rate=25)
        with self.assertRaises(frappe.ValidationError):
            doc.insert()

    def test_cancelled_prior_payout_excluded_from_cap(self):
        deps = _create_policy_with_entity(frappe.generate_hash(length=8), 1000)
        paid = _new_payout(policy=deps["policy"], sales_entity=deps["sales_entity"],
                           amount=600, status="Paid", customer=deps["customer"])
        paid.insert(ignore_permissions=True)
        cancelled = _new_payout(policy=deps["policy"], sales_entity=deps["sales_entity"],
                                amount=400, status="Cancelled", customer=deps["customer"])
        cancelled.insert(ignore_permissions=True)
        # 600 (Paid) + 300 new = 900 <= 1000; the Cancelled 400 is not counted.
        doc = _new_payout(policy=deps["policy"], sales_entity=deps["sales_entity"],
                          amount=300, status="Paid", customer=deps["customer"])
        doc.insert(ignore_permissions=True)
        self.assertTrue(doc.name)

    def test_draft_and_paid_both_reserve_allocation(self):
        deps = _create_policy_with_entity(frappe.generate_hash(length=8), 1000)
        draft = _new_payout(policy=deps["policy"], sales_entity=deps["sales_entity"],
                            amount=400, status="Draft", customer=deps["customer"])
        draft.insert(ignore_permissions=True)
        paid = _new_payout(policy=deps["policy"], sales_entity=deps["sales_entity"],
                           amount=400, status="Paid", customer=deps["customer"])
        paid.insert(ignore_permissions=True)
        # 400 Draft + 400 Paid + 300 new = 1100 > 1000 -> rejected.
        doc = _new_payout(policy=deps["policy"], sales_entity=deps["sales_entity"],
                          amount=300, status="Paid", customer=deps["customer"])
        with self.assertRaises(frappe.ValidationError):
            doc.insert()

    def test_zero_allocation_entity_rejected(self):
        """A sales entity with 0 commission allocation cannot receive a payout."""
        from acentem_takipte.acentem_takipte.tests.test_utils import ensure_test_office_branch

        suffix = frappe.generate_hash(length=8)
        insurance_company = frappe.get_doc(
            {
                "doctype": "AT Insurance Company",
                "company_name": f"Z Insurance {suffix}",
                "company_code": f"ZI{suffix[:4]}",
            }
        ).insert(ignore_permissions=True)
        branch = frappe.get_doc(
            {
                "doctype": "AT Branch",
                "branch_name": f"Z Branch {suffix}",
                "branch_code": f"ZB{suffix[:4]}",
                "insurance_company": insurance_company.name,
            }
        ).insert(ignore_permissions=True)
        office_branch = ensure_test_office_branch(suffix)
        root = frappe.db.get_value(
            "AT Sales Entity",
            {"office_branch": office_branch, "is_root": 1},
            "name",
        )
        self.assertTrue(root, "branch must have a root sales entity")
        child = frappe.get_doc(
            {
                "doctype": "AT Sales Entity",
                "entity_type": "Agency",
                "full_name": f"Z Child {suffix}",
                "office_branch": office_branch,
                "parent_entity": root,
                "commission_share_pct": 0,
            }
        ).insert(ignore_permissions=True)
        customer = frappe.get_doc(
            {
                "doctype": "AT Customer",
                "tax_id": _random_tax_id(),
                "full_name": f"Z Customer {suffix}",
                "phone": "05559876543",
                "email": f"z.{suffix}@example.com",
                "assigned_agent": "Administrator",
            }
        ).insert(ignore_permissions=True)
        policy = frappe.get_doc(
            {
                "doctype": "AT Policy",
                "policy_no": f"Z-{suffix[:8]}",
                "customer": customer.name,
                "sales_entity": child.name,
                "insurance_company": insurance_company.name,
                "branch": branch.name,
                "office_branch": office_branch,
                "status": "Active",
                "issue_date": frappe.utils.nowdate(),
                "start_date": frappe.utils.nowdate(),
                "end_date": frappe.utils.add_days(frappe.utils.nowdate(), 365),
                "currency": "TRY",
                "net_premium": 1000,
                "commission_amount": 1000,
                "tax_amount": 120,
            }
        ).insert(ignore_permissions=True)

        doc = _new_payout(policy=policy.name, sales_entity=child.name,
                          amount=100, customer=customer.name)
        with self.assertRaises(frappe.ValidationError):
            doc.insert()


class TestBatchPlaceholderScope(FrappeTestCase):
    """1: statement_batch scoping of commission entries."""

    @patch("frappe.new_doc")
    @patch("frappe.get_doc")
    @patch("frappe.db.get_value")
    def test_different_batch_empty_ref_creates_new_placeholder(
        self, mock_db_get_value, mock_get_doc, mock_new_doc,
    ):
        from acentem_takipte.acentem_takipte.domains.accounting.services.statement_import import (
            _get_or_create_commission_statement_entry,
        )

        def get_value_side_effect(doctype, filters, field=None, **kwargs):
            if doctype == "AT Accounting Entry" and isinstance(filters, dict):
                if filters.get("external_ref") == "" and filters.get("statement_batch") == "B1":
                    return "AT-ACC-PLACEHOLDER-B1"
            return None

        mock_db_get_value.side_effect = get_value_side_effect
        fresh_doc = object()
        mock_get_doc.return_value = fresh_doc  # new-entry creation path
        mock_new_doc.return_value = fresh_doc

        # Requesting a B2 placeholder must not reuse the B1 placeholder.
        result = _get_or_create_commission_statement_entry("POL-001", "", "B2")
        assert result is fresh_doc


class TestMissingExternalBatchScope(FrappeTestCase):
    """1: real-DB batch scoping of Missing External entries."""

    def tearDown(self) -> None:
        frappe.db.rollback()

    def _policy_company(self, policy_name: str) -> str:
        return str(frappe.db.get_value("AT Policy", policy_name, "insurance_company") or "")

    def test_same_batch_placeholder_reused_by_resolver(self):
        from acentem_takipte.acentem_takipte.domains.accounting.services.statement_import import (
            _get_or_create_commission_statement_entry,
            generate_missing_external_for_commission_statement,
        )

        deps = _create_policy_with_entity(frappe.generate_hash(length=8), 1000)
        company = self._policy_company(deps["policy"])

        generate_missing_external_for_commission_statement(
            policy_refs_from_statement=[],
            insurance_company=company,
            office_branch=deps["office_branch"],
            statement_batch="B1",
        )
        placeholder_name = frappe.db.get_value(
            "AT Accounting Entry",
            {
                "source_doctype": "AT Policy",
                "source_name": deps["policy"],
                "import_source": "missing_external",
                "statement_batch": "B1",
            },
            "name",
        )
        self.assertTrue(placeholder_name)

        # A real row arriving in the SAME batch reuses the placeholder.
        entry = _get_or_create_commission_statement_entry(deps["policy"], "STM-001", "B1")
        self.assertEqual(entry.name, placeholder_name)

    def test_different_batch_creates_separate_missing_external(self):
        from acentem_takipte.acentem_takipte.domains.accounting.services.statement_import import (
            generate_missing_external_for_commission_statement,
        )

        deps = _create_policy_with_entity(frappe.generate_hash(length=8), 1000)
        company = self._policy_company(deps["policy"])

        generate_missing_external_for_commission_statement(
            policy_refs_from_statement=[],
            insurance_company=company,
            office_branch=deps["office_branch"],
            statement_batch="B1",
        )
        generate_missing_external_for_commission_statement(
            policy_refs_from_statement=[],
            insurance_company=company,
            office_branch=deps["office_branch"],
            statement_batch="B2",
        )
        entries = frappe.get_all(
            "AT Accounting Entry",
            filters={
                "source_doctype": "AT Policy",
                "source_name": deps["policy"],
                "import_source": "missing_external",
            },
            fields=["name", "statement_batch"],
        )
        self.assertEqual(len(entries), 2)
        self.assertEqual(sorted(e["statement_batch"] for e in entries), ["B1", "B2"])


class TestStandaloneMissingExternalEndpoint(FrappeTestCase):
    """1: standalone endpoint accepts an explicit batch/period, never derives a
    batch from the policy reference list."""

    def tearDown(self) -> None:
        frappe.db.rollback()

    def _endpoint(self):
        from acentem_takipte.acentem_takipte.domains.commissions.api import endpoints
        return endpoints

    def test_explicit_batch_forwarded_unchanged(self):
        endpoints = self._endpoint()
        with patch.object(
            endpoints,
            "generate_missing_external_for_commission_statement",
            return_value={"generated": 0},
        ) as mock_gen:
            previous_user = frappe.session.user
            frappe.session.user = "Administrator"
            try:
                endpoints.generate_commission_missing_external(
                    policy_refs='["P1"]',
                    insurance_company="IC-1",
                    statement_batch="MY-EXPLICIT-BATCH",
                )
            finally:
                frappe.session.user = previous_user
        self.assertEqual(mock_gen.call_args.kwargs["statement_batch"], "MY-EXPLICIT-BATCH")

    def test_period_derives_deterministic_batch(self):
        from acentem_takipte.acentem_takipte.domains.accounting.services.statement_import import (
            _build_statement_batch_id,
        )

        endpoints = self._endpoint()
        with patch.object(
            endpoints,
            "generate_missing_external_for_commission_statement",
            return_value={"generated": 0},
        ) as mock_gen:
            previous_user = frappe.session.user
            frappe.session.user = "Administrator"
            try:
                endpoints.generate_commission_missing_external(
                    policy_refs='["P1"]',
                    insurance_company="IC-1",
                    statement_period="2026-01",
                )
            finally:
                frappe.session.user = previous_user
        expected = _build_statement_batch_id("period:2026-01", "IC-1")
        self.assertEqual(mock_gen.call_args.kwargs["statement_batch"], expected)

    def test_omitted_batch_or_period_throws(self):
        endpoints = self._endpoint()
        previous_user = frappe.session.user
        frappe.session.user = "Administrator"
        try:
            with self.assertRaises(frappe.ValidationError):
                endpoints.generate_commission_missing_external(
                    policy_refs='["P1"]',
                    insurance_company="IC-1",
                )
        finally:
            frappe.session.user = previous_user


class TestMissingExternalDoesNotOverwrite(FrappeTestCase):
    """E: generate_missing_external must not overwrite a real commission
    statement entry for the same policy."""

    def tearDown(self) -> None:
        frappe.db.rollback()

    def test_missing_external_keeps_statement_entry_intact(self):
        from acentem_takipte.acentem_takipte.domains.accounting.services.statement_import import (
            generate_missing_external_for_commission_statement,
            import_commission_statement_rows,
        )
        from acentem_takipte.acentem_takipte.tests.test_utils import ensure_test_office_branch

        suffix = frappe.generate_hash(length=8)
        insurance_company = frappe.get_doc(
            {
                "doctype": "AT Insurance Company",
                "company_name": f"Integrity Insurance {suffix}",
                "company_code": f"II{suffix[:4]}",
            }
        ).insert(ignore_permissions=True)
        branch = frappe.get_doc(
            {
                "doctype": "AT Branch",
                "branch_name": f"Integrity Branch {suffix}",
                "branch_code": f"IB{suffix[:4]}",
                "insurance_company": insurance_company.name,
            }
        ).insert(ignore_permissions=True)
        office_branch = ensure_test_office_branch(suffix)
        sales_entity = frappe.get_doc(
            {
                "doctype": "AT Sales Entity",
                "entity_type": "Agency",
                "full_name": f"Integrity Agency {suffix}",
                "office_branch": office_branch,
            }
        ).insert(ignore_permissions=True)
        customer = frappe.get_doc(
            {
                "doctype": "AT Customer",
                "tax_id": _random_tax_id(),
                "full_name": f"Integrity Customer {suffix}",
                "phone": "05559876543",
                "email": f"integrity.{suffix}@example.com",
                "assigned_agent": "Administrator",
            }
        ).insert(ignore_permissions=True)
        policy = frappe.get_doc(
            {
                "doctype": "AT Policy",
                "policy_no": f"INTEG-{suffix[:6]}",
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
                "commission_amount": 1000,
                "tax_amount": 120,
            }
        ).insert(ignore_permissions=True)

        # 1. Import a real statement row for the policy.
        csv_text = f"policy_no,amount_try,external_ref\n{policy.policy_no},1000.00,STM-REAL\n"
        import_result = import_commission_statement_rows(
            csv_text=csv_text,
            insurance_company=insurance_company.name,
            office_branch=office_branch,
            generate_missing=False,
        )
        self.assertEqual(import_result["imported"], 1)
        real_entry_name = frappe.db.get_value(
            "AT Accounting Entry",
            {"source_doctype": "AT Policy", "source_name": policy.name, "external_ref": "STM-REAL"},
            "name",
        )
        self.assertTrue(real_entry_name)
        real_entry = frappe.get_doc("AT Accounting Entry", real_entry_name)
        self.assertEqual(real_entry.external_amount_try, 1000.0)

        # 2. Generate Missing External for a batch that does NOT include the policy.
        generate_missing_external_for_commission_statement(
            policy_refs_from_statement=["SOME-OTHER-POLICY"],
            insurance_company=insurance_company.name,
            office_branch=office_branch,
            statement_batch="BATCH-B",
        )

        # 3. The real statement entry must be untouched.
        real_entry.reload()
        self.assertEqual(real_entry.external_amount_try, 1000.0)
        self.assertEqual(real_entry.external_ref, "STM-REAL")

        # 4. The Missing External created a separate commission entry.
        missing_entries = frappe.get_all(
            "AT Accounting Entry",
            filters={
                "source_doctype": "AT Policy",
                "source_name": policy.name,
                "import_source": "missing_external",
            },
            fields=["name", "external_amount_try", "external_ref"],
        )
        self.assertEqual(len(missing_entries), 1)
        self.assertEqual(missing_entries[0]["external_ref"], "")
        self.assertEqual(missing_entries[0]["external_amount_try"], 0)


class TestLockedPeriodDistributionChange(FrappeTestCase):
    """H: in a locked commission period, distribution-affecting changes are rejected."""

    def tearDown(self) -> None:
        frappe.db.rollback()

    def test_locked_period_rejects_sales_entity_change(self):
        from acentem_takipte.acentem_takipte.tests.test_utils import ensure_test_office_branch

        suffix = frappe.generate_hash(length=8)
        insurance_company = frappe.get_doc(
            {
                "doctype": "AT Insurance Company",
                "company_name": f"Lock Insurance {suffix}",
                "company_code": f"LI{suffix[:4]}",
            }
        ).insert(ignore_permissions=True)
        branch = frappe.get_doc(
            {
                "doctype": "AT Branch",
                "branch_name": f"Lock Branch {suffix}",
                "branch_code": f"LB{suffix[:4]}",
                "insurance_company": insurance_company.name,
            }
        ).insert(ignore_permissions=True)
        office_branch = ensure_test_office_branch(suffix)
        entity_a = frappe.get_doc(
            {
                "doctype": "AT Sales Entity",
                "entity_type": "Agency",
                "full_name": f"Lock Agency A {suffix}",
                "office_branch": office_branch,
            }
        ).insert(ignore_permissions=True)
        entity_b = frappe.get_doc(
            {
                "doctype": "AT Sales Entity",
                "entity_type": "Agency",
                "full_name": f"Lock Agency B {suffix}",
                "office_branch": office_branch,
            }
        ).insert(ignore_permissions=True)
        customer = frappe.get_doc(
            {
                "doctype": "AT Customer",
                "tax_id": _random_tax_id(),
                "full_name": f"Lock Customer {suffix}",
                "phone": "05551234567",
                "email": f"lock.{suffix}@example.com",
                "assigned_agent": "Administrator",
            }
        ).insert(ignore_permissions=True)

        issue_date = "2026-01-15"
        policy = frappe.get_doc(
            {
                "doctype": "AT Policy",
                "policy_no": f"LOCK-{suffix[:6]}",
                "customer": customer.name,
                "sales_entity": entity_a.name,
                "insurance_company": insurance_company.name,
                "branch": branch.name,
                "office_branch": office_branch,
                "status": "Active",
                "issue_date": issue_date,
                "start_date": issue_date,
                "end_date": frappe.utils.add_days("2026-01-15", 365),
                "currency": "TRY",
                "net_premium": 1000,
                "commission_amount": 1000,
                "tax_amount": 120,
            }
        ).insert(ignore_permissions=True)

        # Lock the commission period covering the issue date.
        frappe.get_doc(
            {
                "doctype": "AT Commission Period",
                "insurance_company": insurance_company.name,
                "period_start": "2026-01-01",
                "period_end": "2026-01-31",
                "status": "Locked",
            }
        ).insert(ignore_permissions=True)

        # Changing sales_entity (which rebuilds the distribution) must be rejected.
        doc = frappe.get_doc("AT Policy", policy.name)
        doc.sales_entity = entity_b.name
        with self.assertRaises(frappe.ValidationError):
            doc.save()

    def test_locked_to_unlocked_company_move_rejected(self):
        """A policy in a locked period cannot be moved to another company/date
        even when the destination company/date is not locked."""
        from acentem_takipte.acentem_takipte.tests.test_utils import ensure_test_office_branch

        suffix = frappe.generate_hash(length=8)
        company_a = frappe.get_doc(
            {
                "doctype": "AT Insurance Company",
                "company_name": f"Move Insurance A {suffix}",
                "company_code": f"MA{suffix[:4]}",
            }
        ).insert(ignore_permissions=True)
        company_b = frappe.get_doc(
            {
                "doctype": "AT Insurance Company",
                "company_name": f"Move Insurance B {suffix}",
                "company_code": f"MB{suffix[:4]}",
            }
        ).insert(ignore_permissions=True)
        branch = frappe.get_doc(
            {
                "doctype": "AT Branch",
                "branch_name": f"Move Branch {suffix}",
                "branch_code": f"MO{suffix[:4]}",
                "insurance_company": company_a.name,
            }
        ).insert(ignore_permissions=True)
        office_branch = ensure_test_office_branch(suffix)
        entity = frappe.get_doc(
            {
                "doctype": "AT Sales Entity",
                "entity_type": "Agency",
                "full_name": f"Move Agency {suffix}",
                "office_branch": office_branch,
            }
        ).insert(ignore_permissions=True)
        customer = frappe.get_doc(
            {
                "doctype": "AT Customer",
                "tax_id": _random_tax_id(),
                "full_name": f"Move Customer {suffix}",
                "phone": "05559876543",
                "email": f"move.{suffix}@example.com",
                "assigned_agent": "Administrator",
            }
        ).insert(ignore_permissions=True)

        issue_date = "2026-03-15"
        policy = frappe.get_doc(
            {
                "doctype": "AT Policy",
                "policy_no": f"MOVE-{suffix[:6]}",
                "customer": customer.name,
                "sales_entity": entity.name,
                "insurance_company": company_a.name,
                "branch": branch.name,
                "office_branch": office_branch,
                "status": "Active",
                "issue_date": issue_date,
                "start_date": issue_date,
                "end_date": frappe.utils.add_days("2026-03-15", 365),
                "currency": "TRY",
                "net_premium": 1000,
                "commission_amount": 1000,
                "tax_amount": 120,
            }
        ).insert(ignore_permissions=True)

        # Lock company A for March; company B is unlocked.
        frappe.get_doc(
            {
                "doctype": "AT Commission Period",
                "insurance_company": company_a.name,
                "period_start": "2026-03-01",
                "period_end": "2026-03-31",
                "status": "Locked",
            }
        ).insert(ignore_permissions=True)

        # Moving to company B (unlocked) is still rejected because the policy
        # currently sits in company A's locked period.
        doc = frappe.get_doc("AT Policy", policy.name)
        doc.insurance_company = company_b.name
        doc.branch = None
        with self.assertRaises(frappe.ValidationError):
            doc.save()
