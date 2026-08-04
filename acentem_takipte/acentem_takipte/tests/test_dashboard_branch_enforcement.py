from __future__ import annotations

import frappe

import acentem_takipte.acentem_takipte.domains.reports.api.dashboard as dashboard


def _force_cache_miss(monkeypatch):
    """Dashboard endpoints read a Redis cache key; a stale entry from a previous
    pytest process would short-circuit before the mocks run. Force a miss so the
    test exercises the real normalization path."""
    cache = frappe.cache()
    monkeypatch.setattr(cache, "get_value", lambda *args, **kwargs: None)
    monkeypatch.setattr(cache, "set_value", lambda *args, **kwargs: None)


def test_get_dashboard_kpis_normalizes_requested_office_branch(monkeypatch):
    captured = {}
    _force_cache_miss(monkeypatch)

    monkeypatch.setattr(
        dashboard,
        "normalize_requested_office_branch",
        lambda office_branch=None, user=None: "BR-DEFAULT",
    )
    monkeypatch.setattr(dashboard, "_allowed_customers_for_user", lambda include_meta=False: (None, {"scope": "all"}))
    monkeypatch.setattr(
        dashboard.dashboard_kpi_queries,
        "build_dashboard_kpis_payload",
        lambda **kwargs: captured.setdefault("office_branch", kwargs["office_branch"]) or {"cards": {}, "meta": kwargs["scope_meta"]},
    )

    dashboard.get_dashboard_kpis(filters={"office_branch": "BR-FORBIDDEN"})

    assert captured["office_branch"] == "BR-DEFAULT"


def test_get_dashboard_tab_payload_normalizes_requested_office_branch(monkeypatch):
    captured = {}
    _force_cache_miss(monkeypatch)

    monkeypatch.setattr(
        dashboard,
        "normalize_requested_office_branch",
        lambda office_branch=None, user=None: "BR-DEFAULT",
    )
    monkeypatch.setattr(dashboard, "_allowed_customers_for_user", lambda include_meta=False: (None, {"scope": "all"}))
    monkeypatch.setattr(dashboard, "_dashboard_cards_summary", lambda **kwargs: {"total": 1})

    def _build_dashboard_tab_sections(**kwargs):
        captured["office_branch"] = kwargs["office_branch"]
        return {"metrics": {}, "series": {}, "previews": {}}

    monkeypatch.setattr(
        dashboard.dashboard_tab_sections,
        "build_dashboard_tab_sections",
        _build_dashboard_tab_sections,
    )

    dashboard.get_dashboard_tab_payload(filters={"office_branch": "BR-FORBIDDEN"})

    assert captured["office_branch"] == "BR-DEFAULT"

