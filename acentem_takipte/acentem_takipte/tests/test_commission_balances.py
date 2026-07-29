from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase

from acentem_takipte.acentem_takipte.domains.commissions.services.balance import (
    compute_commission_balances,
    compute_entity_detail,
)


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


class TestEntityDetail(FrappeTestCase):
    def test_nonexistent_entity_returns_empty_lists(self):
        result = compute_entity_detail("Nonexistent_Entity_Name_12345")
        assert result["entity"]["name"] == "Nonexistent_Entity_Name_12345"
        assert result["accrued_policies"] == []
        assert result["payments"] == []


class TestCommissionEndpoints(FrappeTestCase):
    def test_get_balances_endpoint(self):
        from acentem_takipte.acentem_takipte.domains.commissions.api.endpoints import (
            get_commission_balances,
        )
        result = get_commission_balances()
        assert "summary" in result
        assert "entities" in result
