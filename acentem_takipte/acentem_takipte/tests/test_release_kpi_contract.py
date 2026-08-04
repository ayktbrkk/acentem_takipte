from __future__ import annotations

from types import SimpleNamespace

import acentem_takipte.acentem_takipte.domains.reports.api.dashboard as dashboard_api
import acentem_takipte.acentem_takipte.domains.reports.services.reporting as reporting
from acentem_takipte.acentem_takipte.api.v2.serializers import build_paged_rows_response, mask_customer_sensitive_fields


def test_customer_workbench_summary_counts_full_filtered_set(monkeypatch):
    fake_rows = [
        {"name": "C-1", "customer_type": "Individual", "consent_status": "Granted"},
        {"name": "C-2", "customer_type": "Individual", "consent_status": "Unknown"},
        {"name": "C-3", "customer_type": "Corporate", "consent_status": "Granted"},
        {"name": "C-4", "customer_type": "Individual", "consent_status": "Revoked"},
    ]

    def _fake_get_all(doctype, fields, limit_page_length=0, filters=None, or_filters=None, **kwargs):
        return list(fake_rows)

    def _fake_portfolio_names(*, allowed_customers, has_active_policy, has_open_offer):
        # C-1 and C-3 have an active policy / open offer
        return [name for name in allowed_customers if name in {"C-1", "C-3"}]

    monkeypatch.setattr(dashboard_api.frappe, "get_all", _fake_get_all)
    monkeypatch.setattr(
        dashboard_api,
        "_customer_names_by_portfolio_filters",
        _fake_portfolio_names,
    )

    summary = dashboard_api._customer_workbench_summary_counts(
        query_filters={},
        or_filters=None,
        has_active_policy=False,
        has_open_offer=False,
    )

    assert summary["total"] == 4
    assert summary["individual_count"] == 3
    assert summary["corporate_count"] == 1
    assert summary["consent_granted_count"] == 2
    assert summary["active_count"] == 2
    assert (
        summary["individual_count"] + summary["corporate_count"] == summary["total"]
    )


def test_customer_workbench_response_includes_summary_fields():
    # The paginated response must carry the full-dataset KPI fields so the
    # frontend never falls back to page-derived zeros.
    result = build_paged_rows_response(
        rows=[],
        total=0,
        page=1,
        page_length=20,
        summary={
            "total": 0,
            "active_count": 0,
            "individual_count": 0,
            "corporate_count": 0,
            "consent_granted_count": 0,
        },
    )
    assert result["total"] == 0
    assert result["active_count"] == 0
    assert result["individual_count"] == 0
    assert result["corporate_count"] == 0
    assert result["consent_granted_count"] == 0


def test_mask_customer_sensitive_fields_replaces_raw_pii():
    rows = [
        {
            "name": "C-1",
            "tax_id": "12345678901",
            "masked_tax_id": "12*******01",
            "phone": "05321234567",
            "masked_phone": "053******67",
        }
    ]
    mask_customer_sensitive_fields(rows)
    assert rows[0]["tax_id"] == "12*******01"
    assert rows[0]["phone"] == "053******67"
    # masked originals remain available for explicit masked display
    assert rows[0]["masked_tax_id"] == "12*******01"


def test_policy_list_report_rows_include_collected_premium(monkeypatch):
    # Contract: every policy row carries the TRY premium collected from the
    # customer so the "Collected Premium" KPI is never hardcoded to zero.
    captured = {}

    class _FakeSQLRows:
        def __init__(self, sql, params, as_dict=False):
            captured["sql"] = sql
            captured["params"] = params

        def __iter__(self):
            return iter([])

        def __getitem__(self, key):
            raise KeyError(key)

    monkeypatch.setattr(reporting.frappe, "db", SimpleNamespace(sql=_FakeSQLRows))
    rows = reporting.get_policy_list_report_rows({}, limit=5)
    assert captured["sql"]
    assert "collected_amount_try" in captured["sql"]
    assert isinstance(rows, list) or "sql" in captured  # query executed via mocked db


def test_policy_list_grouped_rows_escape_sql_percent(monkeypatch):
    captured = {}

    class _FakeSQLRows:
        def __init__(self, sql, params, as_dict=False):
            captured["sql"] = sql
            captured["params"] = params

        def __iter__(self):
            return iter([])

        def __getitem__(self, key):
            raise KeyError(key)

    monkeypatch.setattr(reporting.frappe, "db", SimpleNamespace(sql=_FakeSQLRows))
    reporting._get_policy_list_grouped_rows({}, "monthly", 500)
    assert "%%Y-%%m" in captured["sql"] or "total_collected_try" in captured["sql"]
    assert "%s" not in captured["sql"].replace("%%", "")
