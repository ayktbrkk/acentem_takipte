from __future__ import annotations

from acentem_takipte.acentem_takipte.api import dashboard


def test_get_dashboard_kpis_normalizes_requested_office_branch(monkeypatch):
    captured = {}

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

