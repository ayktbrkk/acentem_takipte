from __future__ import annotations

import json
from datetime import date, timedelta
from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from acentem_takipte.acentem_takipte.domains.commissions.services.balance import (
    compute_commission_balances,
    compute_commission_policy_detail,
    compute_entity_detail,
)


def _fake_entity_info(entity_name):
    return {
        "full_name": entity_name,
        "entity_type": "Agency",
        "office_branch": "AT-OB-2026-00001",
    }


def _fake_ic_display(ic_name):
    mapping = {
        "AT-IC-2026-00001": "Allianz Sigorta A.S.",
        "AT-IC-2026-00002": "Axa Sigorta A.S.",
    }
    return mapping.get(ic_name, ic_name)


def _fake_office_branch_name(ob_name):
    return "Merkez Sube"


def _make_distribution(entity_name, amount_try):
    return json.dumps([{
        "entity": entity_name,
        "entity_name": entity_name,
        "level": 0,
        "share_pct": 100,
        "amount": amount_try,
        "amount_try": amount_try,
        "status": "Accrued",
    }])


def _dd(days_ago):
    """Return a date object `days_ago` days before today."""
    return date.today() - timedelta(days=days_ago)


class TestCommissionBalances(FrappeTestCase):
    def test_structure_and_data_types(self):
        result = compute_commission_balances()
        assert isinstance(result, dict)
        assert "summary" in result
        assert "entities" in result
        assert isinstance(result["summary"], dict)
        assert isinstance(result["entities"], list)
        for key in ("total_accrued_try", "total_paid_try", "total_remaining_try"):
            assert key in result["summary"]
            assert isinstance(result["summary"][key], (int, float))

    def test_returns_zero_when_no_data(self):
        result = compute_commission_balances()
        summary = result["summary"]
        assert summary["total_accrued_try"] >= 0
        assert summary["total_paid_try"] >= 0
        assert summary["total_remaining_try"] >= 0
        assert isinstance(result["entities"], list)

    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_summary_totals_exceed_limit(self, mock_get_all, mock_db_get_value):
        entity_a = "ENT-A"
        entity_b = "ENT-B"
        entity_c = "ENT-C"

        policies = [
            {"name": "POL-001", "issue_date": None, "sales_entity": entity_a,
             "commission_distribution": _make_distribution(entity_a, 500),
             "insurance_company": "AT-IC-2026-00001"},
            {"name": "POL-002", "issue_date": None, "sales_entity": entity_b,
             "commission_distribution": _make_distribution(entity_b, 300),
             "insurance_company": "AT-IC-2026-00001"},
            {"name": "POL-003", "issue_date": None, "sales_entity": entity_c,
             "commission_distribution": _make_distribution(entity_c, 200),
             "insurance_company": "AT-IC-2026-00001"},
        ]
        payments: list[dict] = []

        def get_all_side_effect(doctype, filters=None, fields=None, **kwargs):
            if doctype == "AT Policy":
                return policies
            if doctype == "AT Payment":
                return payments
            return []

        mock_get_all.side_effect = get_all_side_effect

        def db_get_value_side_effect(doctype, name, field, **kw):
            if doctype == "AT Sales Entity":
                return _fake_entity_info(name)
            if doctype == "AT Insurance Company":
                return _fake_ic_display(name)
            if doctype == "AT Office Branch":
                return _fake_office_branch_name(name)
            return ""

        mock_db_get_value.side_effect = db_get_value_side_effect

        result = compute_commission_balances(limit=2)
        summary = result["summary"]
        entities_list = result["entities"]

        assert len(entities_list) <= 2
        assert "total_count" in result
        assert result["total_count"] == 3
        assert result["returned_count"] == 2

        limited_accrued = round(sum(e["accrued_try"] for e in entities_list), 2)
        assert summary["total_accrued_try"] == 1000.0
        assert summary["total_accrued_try"] > limited_accrued

    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_insurance_company_filter_isolates_accrued_and_paid(self, mock_get_all, mock_db_get_value):
        entity = "ENT-001"
        company_a = "AT-IC-2026-00001"
        company_b = "AT-IC-2026-00002"

        policies = [
            {"name": "POL-A", "issue_date": None, "sales_entity": entity,
             "commission_distribution": _make_distribution(entity, 1000),
             "insurance_company": company_a},
            {"name": "POL-B", "issue_date": None, "sales_entity": entity,
             "commission_distribution": _make_distribution(entity, 800),
             "insurance_company": company_b},
        ]
        payments = [
            {"sales_entity": entity, "amount_try": 500, "policy": "POL-A"},
            {"sales_entity": entity, "amount_try": 300, "policy": "POL-B"},
        ]

        def get_all_side_effect(doctype, filters=None, fields=None, **kwargs):
            if doctype == "AT Policy":
                return policies
            if doctype == "AT Payment":
                return payments
            return []

        mock_get_all.side_effect = get_all_side_effect

        def db_get_value_side_effect(doctype, name, field, **kw):
            if doctype == "AT Sales Entity":
                return _fake_entity_info(name)
            if doctype == "AT Insurance Company":
                return _fake_ic_display(name)
            if doctype == "AT Office Branch":
                return _fake_office_branch_name(name)
            return ""

        mock_db_get_value.side_effect = db_get_value_side_effect

        result = compute_commission_balances(insurance_company=company_a)
        summary = result["summary"]
        assert summary["total_accrued_try"] == 1000.0
        assert summary["total_paid_try"] == 500.0
        assert summary["total_remaining_try"] == 500.0
        assert len(result["entities"]) == 1

    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_insurance_company_filter_no_cross_contamination(self, mock_get_all, mock_db_get_value):
        entity = "ENT-001"
        company_a = "AT-IC-2026-00001"
        company_b = "AT-IC-2026-00002"

        policies = [
            {"name": "POL-A", "issue_date": None, "sales_entity": entity,
             "commission_distribution": _make_distribution(entity, 1000),
             "insurance_company": company_a},
            {"name": "POL-B", "issue_date": None, "sales_entity": entity,
             "commission_distribution": _make_distribution(entity, 800),
             "insurance_company": company_b},
        ]
        payments = [
            {"sales_entity": entity, "amount_try": 500, "policy": "POL-A"},
            {"sales_entity": entity, "amount_try": 300, "policy": "POL-B"},
        ]

        def get_all_side_effect(doctype, filters=None, fields=None, **kwargs):
            if doctype == "AT Policy":
                return policies
            if doctype == "AT Payment":
                return payments
            return []

        mock_get_all.side_effect = get_all_side_effect

        def db_get_value_side_effect(doctype, name, field, **kw):
            if doctype == "AT Sales Entity":
                return _fake_entity_info(name)
            if doctype == "AT Insurance Company":
                return _fake_ic_display(name)
            if doctype == "AT Office Branch":
                return _fake_office_branch_name(name)
            return ""

        mock_db_get_value.side_effect = db_get_value_side_effect

        result_a = compute_commission_balances(insurance_company=company_a)
        assert result_a["summary"]["total_paid_try"] == 500.0

        result_b = compute_commission_balances(insurance_company=company_b)
        assert result_b["summary"]["total_paid_try"] == 300.0

    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_insurance_company_filter_no_match_zero_summary(self, mock_get_all, mock_db_get_value):
        policies: list[dict] = []
        payments: list[dict] = []

        mock_get_all.return_value = []
        mock_db_get_value.return_value = ""

        result = compute_commission_balances(insurance_company="NonExistent_IC_999")
        summary = result["summary"]
        assert summary["total_accrued_try"] == 0
        assert summary["total_paid_try"] == 0
        assert summary["total_remaining_try"] == 0
        assert result["entities"] == []

    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_no_filter_preserves_existing_behavior(self, mock_get_all, mock_db_get_value):
        entity = "ENT-001"

        policies = [
            {"name": "POL-A", "issue_date": None, "sales_entity": entity,
             "commission_distribution": _make_distribution(entity, 500),
             "insurance_company": "AT-IC-2026-00001"},
        ]
        payments = [
            {"sales_entity": entity, "amount_try": 500, "policy": "POL-A"},
            {"sales_entity": entity, "amount_try": 200, "policy": "POL-X"},
        ]

        def get_all_side_effect(doctype, filters=None, fields=None, **kwargs):
            if doctype == "AT Policy":
                return policies
            if doctype == "AT Payment":
                return payments
            return []

        mock_get_all.side_effect = get_all_side_effect

        def db_get_value_side_effect(doctype, name, field, **kw):
            if doctype == "AT Sales Entity":
                return _fake_entity_info(name)
            if doctype == "AT Insurance Company":
                return _fake_ic_display(name)
            if doctype == "AT Office Branch":
                return _fake_office_branch_name(name)
            return ""

        mock_db_get_value.side_effect = db_get_value_side_effect

        result = compute_commission_balances()
        assert result["summary"]["total_paid_try"] == 700.0

    # -- aging_bucket tests ------------------------------------------------

    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_aging_bucket_scopes_accrued(self, mock_get_all, mock_db_get_value):
        """aging_bucket='90_plus' shows accrued only from 90_plus policies."""
        entity = "ENT-001"
        # issue_date 121 days ago → due_date 91 days ago → 90_plus bucket
        # issue_date 45 days ago → due_date 15 days ago → 1_30 bucket
        overdue_121 = _dd(121)
        overdue_45 = _dd(45)

        policies = [
            {"name": "POL-CUR", "issue_date": overdue_45, "sales_entity": entity,
             "commission_distribution": _make_distribution(entity, 3000),
             "insurance_company": "AT-IC-2026-00001"},
            {"name": "POL-OLD", "issue_date": overdue_121, "sales_entity": entity,
             "commission_distribution": _make_distribution(entity, 5000),
             "insurance_company": "AT-IC-2026-00001"},
        ]
        payments: list[dict] = []

        def get_all_side_effect(doctype, filters=None, fields=None, **kwargs):
            if doctype == "AT Policy":
                return policies
            if doctype == "AT Payment":
                return payments
            return []

        mock_get_all.side_effect = get_all_side_effect

        def db_get_value_side_effect(doctype, name, field, **kw):
            if doctype == "AT Sales Entity":
                return _fake_entity_info(name)
            if doctype == "AT Insurance Company":
                return _fake_ic_display(name)
            if doctype == "AT Office Branch":
                return _fake_office_branch_name(name)
            return ""

        mock_db_get_value.side_effect = db_get_value_side_effect

        result = compute_commission_balances(aging_bucket="90_plus")
        summary = result["summary"]
        assert summary["total_accrued_try"] == 5000.0
        assert len(result["entities"]) == 1
        assert result["entities"][0]["accrued_try"] == 5000.0
        assert result["entities"][0]["policy_count"] == 1

    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_aging_bucket_scopes_paid(self, mock_get_all, mock_db_get_value):
        """aging_bucket='90_plus': current payment must not mix into 90_plus paid."""
        entity = "ENT-001"
        overdue_121 = _dd(121)

        policies = [
            {"name": "POL-OLD", "issue_date": overdue_121, "sales_entity": entity,
             "commission_distribution": _make_distribution(entity, 5000),
             "insurance_company": "AT-IC-2026-00001"},
            {"name": "POL-CUR", "issue_date": None, "sales_entity": entity,
             "commission_distribution": _make_distribution(entity, 3000),
             "insurance_company": "AT-IC-2026-00001"},
        ]
        payments = [
            {"sales_entity": entity, "amount_try": 2000, "policy": "POL-OLD"},
            {"sales_entity": entity, "amount_try": 1000, "policy": "POL-CUR"},
        ]

        def get_all_side_effect(doctype, filters=None, fields=None, **kwargs):
            if doctype == "AT Policy":
                return policies
            if doctype == "AT Payment":
                return payments
            return []

        mock_get_all.side_effect = get_all_side_effect

        def db_get_value_side_effect(doctype, name, field, **kw):
            if doctype == "AT Sales Entity":
                return _fake_entity_info(name)
            if doctype == "AT Insurance Company":
                return _fake_ic_display(name)
            if doctype == "AT Office Branch":
                return _fake_office_branch_name(name)
            return ""

        mock_db_get_value.side_effect = db_get_value_side_effect

        result = compute_commission_balances(aging_bucket="90_plus")
        assert result["summary"]["total_accrued_try"] == 5000.0
        assert result["summary"]["total_paid_try"] == 2000.0
        assert result["summary"]["total_remaining_try"] == 3000.0

    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_aging_bucket_different_filters_produce_different_values(self, mock_get_all, mock_db_get_value):
        """Same entity with current and 90_plus policies returns different results per bucket."""
        entity = "ENT-001"
        overdue_121 = _dd(121)

        policies = [
            {"name": "POL-OLD", "issue_date": overdue_121, "sales_entity": entity,
             "commission_distribution": _make_distribution(entity, 5000),
             "insurance_company": "AT-IC-2026-00001"},
            {"name": "POL-CUR", "issue_date": None, "sales_entity": entity,
             "commission_distribution": _make_distribution(entity, 3000),
             "insurance_company": "AT-IC-2026-00001"},
        ]
        payments: list[dict] = []

        def get_all_side_effect(doctype, filters=None, fields=None, **kwargs):
            if doctype == "AT Policy":
                return policies
            if doctype == "AT Payment":
                return payments
            return []

        mock_get_all.side_effect = get_all_side_effect

        def db_get_value_side_effect(doctype, name, field, **kw):
            if doctype == "AT Sales Entity":
                return _fake_entity_info(name)
            if doctype == "AT Insurance Company":
                return _fake_ic_display(name)
            if doctype == "AT Office Branch":
                return _fake_office_branch_name(name)
            return ""

        mock_db_get_value.side_effect = db_get_value_side_effect

        result_90 = compute_commission_balances(aging_bucket="90_plus")
        assert result_90["summary"]["total_accrued_try"] == 5000.0
        assert result_90["entities"][0]["policy_count"] == 1

        result_cur = compute_commission_balances(aging_bucket="current")
        assert result_cur["summary"]["total_accrued_try"] == 3000.0
        assert result_cur["entities"][0]["policy_count"] == 1

        # No cross-contamination
        assert result_90["summary"]["total_accrued_try"] != result_cur["summary"]["total_accrued_try"]

    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_aging_bucket_policy_count_scoped(self, mock_get_all, mock_db_get_value):
        """policy_count reflects only policies in the selected bucket."""
        entity = "ENT-001"
        overdue_121 = _dd(121)

        policies = [
            {"name": "POL-OLD-1", "issue_date": overdue_121, "sales_entity": entity,
             "commission_distribution": _make_distribution(entity, 2000),
             "insurance_company": "AT-IC-2026-00001"},
            {"name": "POL-OLD-2", "issue_date": overdue_121, "sales_entity": entity,
             "commission_distribution": _make_distribution(entity, 3000),
             "insurance_company": "AT-IC-2026-00001"},
            {"name": "POL-CUR", "issue_date": None, "sales_entity": entity,
             "commission_distribution": _make_distribution(entity, 1000),
             "insurance_company": "AT-IC-2026-00001"},
        ]
        payments: list[dict] = []

        def get_all_side_effect(doctype, filters=None, fields=None, **kwargs):
            if doctype == "AT Policy":
                return policies
            if doctype == "AT Payment":
                return payments
            return []

        mock_get_all.side_effect = get_all_side_effect

        def db_get_value_side_effect(doctype, name, field, **kw):
            if doctype == "AT Sales Entity":
                return _fake_entity_info(name)
            if doctype == "AT Insurance Company":
                return _fake_ic_display(name)
            if doctype == "AT Office Branch":
                return _fake_office_branch_name(name)
            return ""

        mock_db_get_value.side_effect = db_get_value_side_effect

        # Without bucket filter: 3 policies
        result_all = compute_commission_balances()
        assert result_all["entities"][0]["policy_count"] == 3

        # With bucket filter: only 2 in 90_plus
        result_90 = compute_commission_balances(aging_bucket="90_plus")
        assert result_90["entities"][0]["policy_count"] == 2

    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_aging_bucket_ic_breakdown_scoped(self, mock_get_all, mock_db_get_value):
        """Insurance company breakdown respects the aging bucket filter."""
        entity = "ENT-001"
        company_a = "AT-IC-2026-00001"
        company_b = "AT-IC-2026-00002"
        overdue_121 = _dd(121)

        policies = [
            {"name": "POL-A-OLD", "issue_date": overdue_121, "sales_entity": entity,
             "commission_distribution": _make_distribution(entity, 4000),
             "insurance_company": company_a},
            {"name": "POL-B-CUR", "issue_date": None, "sales_entity": entity,
             "commission_distribution": _make_distribution(entity, 2000),
             "insurance_company": company_b},
        ]
        payments: list[dict] = []

        def get_all_side_effect(doctype, filters=None, fields=None, **kwargs):
            if doctype == "AT Policy":
                return policies
            if doctype == "AT Payment":
                return payments
            return []

        mock_get_all.side_effect = get_all_side_effect

        def db_get_value_side_effect(doctype, name_or_filters, field=None, **kw):
            if doctype == "AT Sales Entity":
                if isinstance(name_or_filters, dict):
                    fn = name_or_filters.get("full_name", "")
                    return fn  # for get_value with filters={}
                return _fake_entity_info(name_or_filters)
            if doctype == "AT Insurance Company":
                return _fake_ic_display(name_or_filters)
            if doctype == "AT Office Branch":
                return _fake_office_branch_name(name_or_filters)
            if doctype == "AT Customer":
                return ""
            return ""

        mock_db_get_value.side_effect = db_get_value_side_effect

        result_90 = compute_commission_balances(aging_bucket="90_plus")
        ent = result_90["entities"][0]
        assert ent["accrued_try"] == 4000.0, f"entity accrued mismatch: {ent['accrued_try']}"
        ics = ent["insurance_companies"]

        assert len(ics) >= 1, f"expected >=1 IC, got {len(ics)}: {[(ic['name'], ic['accrued_try'], ic['policy_count']) for ic in ics]}"
        names = [ic["name"] for ic in ics]
        assert _fake_ic_display(company_a) in names
        assert _fake_ic_display(company_b) not in names

    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_aging_bucket_all_preserves_behavior(self, mock_get_all, mock_db_get_value):
        """aging_bucket='all' shows all policies across all buckets."""
        entity = "ENT-001"
        overdue_121 = _dd(121)

        policies = [
            {"name": "POL-OLD", "issue_date": overdue_121, "sales_entity": entity,
             "commission_distribution": _make_distribution(entity, 5000),
             "insurance_company": "AT-IC-2026-00001"},
            {"name": "POL-CUR", "issue_date": None, "sales_entity": entity,
             "commission_distribution": _make_distribution(entity, 3000),
             "insurance_company": "AT-IC-2026-00001"},
        ]
        payments = [
            {"sales_entity": entity, "amount_try": 2000, "policy": "POL-OLD"},
            {"sales_entity": entity, "amount_try": 1000, "policy": "POL-CUR"},
        ]

        def get_all_side_effect(doctype, filters=None, fields=None, **kwargs):
            if doctype == "AT Policy":
                return policies
            if doctype == "AT Payment":
                return payments
            return []

        mock_get_all.side_effect = get_all_side_effect

        def db_get_value_side_effect(doctype, name, field, **kw):
            if doctype == "AT Sales Entity":
                return _fake_entity_info(name)
            if doctype == "AT Insurance Company":
                return _fake_ic_display(name)
            if doctype == "AT Office Branch":
                return _fake_office_branch_name(name)
            return ""

        mock_db_get_value.side_effect = db_get_value_side_effect

        result = compute_commission_balances()
        assert result["summary"]["total_accrued_try"] == 8000.0
        assert result["summary"]["total_paid_try"] == 3000.0
        assert result["summary"]["total_remaining_try"] == 5000.0
        assert result["entities"][0]["policy_count"] == 2

    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_ic_breakdown_paid_from_real_payments(self, mock_get_all, mock_db_get_value):
        """IC breakdown paid_try must come from actual policy payments, not proportional split."""
        entity = "ENT-001"
        company_a = "AT-IC-2026-00001"
        company_b = "AT-IC-2026-00002"

        policies = [
            {"name": "POL-A", "issue_date": None, "sales_entity": entity,
             "commission_distribution": _make_distribution(entity, 6000),
             "insurance_company": company_a},
            {"name": "POL-B", "issue_date": None, "sales_entity": entity,
             "commission_distribution": _make_distribution(entity, 4000),
             "insurance_company": company_b},
        ]
        payments = [
            {"sales_entity": entity, "amount_try": 5000, "policy": "POL-A"},
            {"sales_entity": entity, "amount_try": 1000, "policy": "POL-B"},
        ]

        def get_all_side_effect(doctype, filters=None, fields=None, **kwargs):
            if doctype == "AT Policy":
                return policies
            if doctype == "AT Payment":
                return payments
            return []

        mock_get_all.side_effect = get_all_side_effect

        def db_get_value_side_effect(doctype, name_or_filters, field=None, **kw):
            if doctype == "AT Sales Entity":
                if isinstance(name_or_filters, dict):
                    return name_or_filters.get("full_name", "")
                return _fake_entity_info(name_or_filters)
            if doctype == "AT Insurance Company":
                return _fake_ic_display(name_or_filters)
            if doctype == "AT Office Branch":
                return _fake_office_branch_name(name_or_filters)
            if doctype == "AT Policy":
                # Return insurance_company for the policy
                for p in policies:
                    if p["name"] == name_or_filters:
                        return p["insurance_company"]
                return ""
            if doctype == "AT Customer":
                return ""
            return ""

        mock_db_get_value.side_effect = db_get_value_side_effect

        result = compute_commission_balances()
        ent = result["entities"][0]
        assert ent["accrued_try"] == 10000.0
        assert ent["paid_try"] == 6000.0
        assert len(ent["insurance_companies"]) == 2

        by_name = {ic["name"]: ic for ic in ent["insurance_companies"]}
        assert by_name[_fake_ic_display(company_a)]["accrued_try"] == 6000.0
        assert by_name[_fake_ic_display(company_a)]["paid_try"] == 5000.0
        assert by_name[_fake_ic_display(company_b)]["accrued_try"] == 4000.0
        assert by_name[_fake_ic_display(company_b)]["paid_try"] == 1000.0


class TestEntityDetail(FrappeTestCase):
    def test_nonexistent_entity_returns_empty_lists(self):
        result = compute_entity_detail("Nonexistent_Entity_Name_12345")
        assert result["entity"]["name"] == "Nonexistent_Entity_Name_12345"
        assert result["accrued_policies"] == []
        assert result["payments"] == []


class TestHeadOfficeDistribution(FrappeTestCase):
    @patch("frappe.db.get_value")
    def test_head_office_centric_distribution(self, mock_db_get_value):
        """Head-office-centric: each non-root entity gets % of ORIGINAL amount; root gets remainder."""
        from acentem_takipte.acentem_takipte.doctype.at_policy.at_policy import (
            _build_commission_distribution,
        )

        # Hierarchy: REP(40%) -> SUB(30%) -> AGENCY(root)
        entity_data = {
            "REP-001": {"commission_share_pct": 40, "full_name": "Mehmet Yilmaz", "parent_entity": "SUB-001", "is_root": 0},
            "SUB-001": {"commission_share_pct": 30, "full_name": "Sub Agency", "parent_entity": "AGENCY-001", "is_root": 0},
            "AGENCY-001": {"commission_share_pct": 100, "full_name": "Head Agency", "parent_entity": None, "is_root": 1},
        }

        def db_get_value_side_effect(doctype, name, fields, as_dict=False):
            if doctype == "AT Sales Entity" and name in entity_data:
                data = entity_data[name]
                if as_dict:
                    return data
                return data.get(fields)
            return None

        mock_db_get_value.side_effect = db_get_value_side_effect

        result = json.loads(_build_commission_distribution("REP-001", 1000, 1))

        # Total must equal commission_amount
        total = sum(e["amount"] for e in result)
        assert abs(total - 1000) < 0.01, f"Total {total} != 1000"

        # Each entity present
        entities_by_name = {e["entity"]: e for e in result}
        assert "REP-001" in entities_by_name
        assert "SUB-001" in entities_by_name
        assert "AGENCY-001" in entities_by_name

        # Non-root entities get % of ORIGINAL amount (1000)
        assert entities_by_name["REP-001"]["amount"] == 400.0  # 1000 * 40%
        assert entities_by_name["SUB-001"]["amount"] == 300.0  # 1000 * 30%

        # Root gets remainder
        assert entities_by_name["AGENCY-001"]["amount"] == 300.0  # 1000 - 400 - 300

        # Levels are correct (REP=0, SUB=1, AGENCY=2)
        assert entities_by_name["REP-001"]["level"] == 0
        assert entities_by_name["SUB-001"]["level"] == 1
        assert entities_by_name["AGENCY-001"]["level"] == 2


class TestCommissionEndpoints(FrappeTestCase):
    def test_get_balances_endpoint(self):
        from acentem_takipte.acentem_takipte.domains.commissions.api.endpoints import (
            get_commission_balances,
        )
        result = get_commission_balances()
        assert "summary" in result
        assert "entities" in result

    def test_get_balances_forwards_insurance_company(self):
        from acentem_takipte.acentem_takipte.domains.commissions.api.endpoints import (
            get_commission_balances,
        )
        from acentem_takipte.acentem_takipte.domains.commissions.services.balance import (
            compute_commission_balances,
        )

        with patch(
            "acentem_takipte.acentem_takipte.domains.commissions.api.endpoints.compute_commission_balances",
            wraps=compute_commission_balances,
        ) as mock_compute:
            get_commission_balances(
                insurance_company="AT-IC-2026-00001",
                limit=50,
                from_date="2026-01-01",
                to_date="2026-01-31",
            )
            call_kwargs = mock_compute.call_args.kwargs
            assert call_kwargs["insurance_company"] == "AT-IC-2026-00001"
            assert call_kwargs["limit"] == 50
            assert call_kwargs["from_date"] == "2026-01-01"
            assert call_kwargs["to_date"] == "2026-01-31"


class TestCommissionPolicyDetail(FrappeTestCase):
    def test_nonexistent_entity_returns_empty(self):
        result = compute_commission_policy_detail("NonexistentEntity_XYZ")
        assert "entity" in result
        assert result["entity"]["name"] != ""
        assert result["policies"] == []
        assert result["totals"]["policies"] == 0
        assert result["totals"]["commission"] == 0

    def test_empty_name_handles_gracefully(self):
        result = compute_commission_policy_detail("")
        assert "policies" in result
        assert result["policies"] == []


class TestBranchFilter(FrappeTestCase):
    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_office_branch_filter_isolates_entities(self, mock_get_all, mock_db_get_value):
        entity_a = "ENT-A"
        entity_b = "ENT-B"
        branch_a = "AT-OB-2026-00001"
        branch_b = "AT-OB-2026-00002"

        policies = [
            {"name": "POL-A", "issue_date": None, "sales_entity": entity_a,
             "commission_distribution": _make_distribution(entity_a, 1000),
             "insurance_company": "AT-IC-2026-00001"},
            {"name": "POL-B", "issue_date": None, "sales_entity": entity_b,
             "commission_distribution": _make_distribution(entity_b, 2000),
             "insurance_company": "AT-IC-2026-00001"},
        ]
        payments: list[dict] = []

        def get_all_side_effect(doctype, filters=None, fields=None, **kwargs):
            if doctype == "AT Policy":
                return policies
            if doctype == "AT Payment":
                return payments
            return []

        mock_get_all.side_effect = get_all_side_effect

        def db_get_value_side_effect(doctype, name, field=None, **kw):
            if doctype == "AT Sales Entity":
                if isinstance(name, dict):
                    return name.get("full_name", "")
                entity_branches = {entity_a: branch_a, entity_b: branch_b}
                if isinstance(field, list):
                    return {"full_name": name, "entity_type": "Agency", "office_branch": entity_branches.get(name, "")}
                if field == "office_branch":
                    return entity_branches.get(name, "")
                return {"full_name": name, "entity_type": "Agency", "office_branch": entity_branches.get(name, "")}.get(field, name)
            if doctype == "AT Insurance Company":
                return _fake_ic_display(name)
            if doctype == "AT Office Branch":
                return _fake_office_branch_name(name)
            return ""

        mock_db_get_value.side_effect = db_get_value_side_effect

        result = compute_commission_balances(office_branch=branch_a)
        assert len(result["entities"]) == 1
        assert result["entities"][0]["entity_name"] == entity_a

    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_office_branch_filter_no_match(self, mock_get_all, mock_db_get_value):
        entity_a = "ENT-A"

        policies = [
            {"name": "POL-A", "issue_date": None, "sales_entity": entity_a,
             "commission_distribution": _make_distribution(entity_a, 1000),
             "insurance_company": "AT-IC-2026-00001"},
        ]

        def get_all_side_effect(doctype, filters=None, fields=None, **kwargs):
            if doctype == "AT Policy":
                return policies
            return []

        mock_get_all.side_effect = get_all_side_effect

        def db_get_value_side_effect(doctype, name, field=None, **kw):
            if doctype == "AT Sales Entity":
                if isinstance(name, dict):
                    return name.get("full_name", "")
                if field == "office_branch":
                    return "DifferentBranch"
                return {"full_name": name, "entity_type": "Agency", "office_branch": "DifferentBranch"}.get(field, name)
            if doctype == "AT Insurance Company":
                return _fake_ic_display(name)
            if doctype == "AT Office Branch":
                return _fake_office_branch_name(name)
            return ""

        mock_db_get_value.side_effect = db_get_value_side_effect

        result = compute_commission_balances(office_branch="NonExistent_Branch")
        assert len(result["entities"]) == 0


class TestEntityDetailWithPolicies(FrappeTestCase):
    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_entity_detail_returns_policies_for_entity(self, mock_get_all, mock_db_get_value):
        entity = "ENT-001"
        policies = [
            {"name": "POL-A", "policy_no": "34567890", "customer": "CUST-001",
             "issue_date": date(2026, 1, 15), "commission_distribution": _make_distribution(entity, 1000)},
            {"name": "POL-B", "policy_no": "34567891", "customer": "CUST-002",
             "issue_date": date(2026, 2, 20), "commission_distribution": _make_distribution(entity, 2000)},
        ]

        def get_all_side_effect(doctype, filters=None, fields=None, **kwargs):
            if doctype == "AT Policy":
                return policies
            if doctype == "AT Payment":
                return []
            return []

        mock_get_all.side_effect = get_all_side_effect

        def db_get_value_side_effect(doctype, name, field=None, **kw):
            if doctype == "AT Sales Entity":
                if isinstance(name, dict):
                    return name.get("full_name", "")
                if isinstance(field, list):
                    return {"full_name": entity, "entity_type": "Agency", "office_branch": "AT-OB-2026-00001"}
                if field is None:
                    return {"full_name": entity, "entity_type": "Agency", "office_branch": "AT-OB-2026-00001"}
                return {"full_name": entity, "entity_type": "Agency", "office_branch": "AT-OB-2026-00001"}.get(field, entity)
            if doctype == "AT Customer":
                return {"CUST-001": "Ali Yilmaz", "CUST-002": "Ayse Demir"}.get(name, "")
            if doctype == "AT Insurance Company":
                return _fake_ic_display(name)
            if doctype == "AT Office Branch":
                return _fake_office_branch_name(name)
            return ""

        mock_db_get_value.side_effect = db_get_value_side_effect

        result = compute_entity_detail(entity)
        assert result["entity"]["name"] == entity
        assert len(result["accrued_policies"]) == 2
        assert result["accrued_policies"][0]["commission_amount_try"] == 1000.0
        assert result["accrued_policies"][1]["commission_amount_try"] == 2000.0

    @patch("frappe.db.get_value")
    @patch("frappe.get_all")
    def test_entity_detail_includes_payments(self, mock_get_all, mock_db_get_value):
        entity = "ENT-001"
        policies = [
            {"name": "POL-A", "policy_no": "34567890", "customer": "CUST-001",
             "issue_date": date(2026, 1, 15), "commission_distribution": _make_distribution(entity, 1000)},
        ]
        payments = [
            {"name": "PAY-001", "payment_no": "T-001", "amount_try": 500,
             "payment_date": "2026-02-01", "reference_no": "REF-001"},
        ]

        def get_all_side_effect(doctype, filters=None, fields=None, **kwargs):
            if doctype == "AT Policy":
                return policies
            if doctype == "AT Payment":
                return payments
            return []

        mock_get_all.side_effect = get_all_side_effect

        def db_get_value_side_effect(doctype, name, field=None, **kw):
            if doctype == "AT Sales Entity":
                if isinstance(name, dict):
                    return name.get("full_name", "")
                if isinstance(field, list):
                    return {"full_name": entity, "entity_type": "Agency", "office_branch": "AT-OB-2026-00001"}
                if field is None:
                    return {"full_name": entity, "entity_type": "Agency", "office_branch": "AT-OB-2026-00001"}
                return {"full_name": entity, "entity_type": "Agency", "office_branch": "AT-OB-2026-00001"}.get(field, entity)
            if doctype == "AT Customer":
                return "Ali Yilmaz"
            if doctype == "AT Insurance Company":
                return _fake_ic_display(name)
            if doctype == "AT Office Branch":
                return _fake_office_branch_name(name)
            return ""

        mock_db_get_value.side_effect = db_get_value_side_effect

        result = compute_entity_detail(entity)
        assert len(result["payments"]) == 1
        assert result["payments"][0]["payment_no"] == "T-001"
        assert result["payments"][0]["amount_try"] == 500
