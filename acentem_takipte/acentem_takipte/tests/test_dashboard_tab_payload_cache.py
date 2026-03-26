from __future__ import annotations

from unittest.mock import Mock

from acentem_takipte.acentem_takipte.api import dashboard


class _FakeCache:
    def __init__(self, initial=None):
        self.store = dict(initial or {})
        self.get_calls = []
        self.set_calls = []

    def get_value(self, key):
        self.get_calls.append(key)
        return self.store.get(key)

    def set_value(self, key, value, expires_in_sec=None):
        self.set_calls.append((key, value, expires_in_sec))
        self.store[key] = value


def test_get_dashboard_tab_payload_returns_cached_value_and_skips_builders(monkeypatch):
    monkeypatch.setattr(dashboard, "_safe_session_user", lambda: "agent@example.com")
    monkeypatch.setattr(dashboard.frappe, "get_site_config", lambda: {})
    monkeypatch.setattr(
        dashboard,
        "normalize_requested_office_branch",
        lambda office_branch=None, user=None: "BR-IST",
    )
    allowed_customers = ["CUST-0002", "CUST-0001"]
    meta = {"access_scope": "scoped", "scope_reason": "branch_assignment"}
    expected_key = dashboard._dashboard_tab_cache_key(
        tab_key="daily",
        from_date="2026-03-01",
        to_date="2026-03-26",
        compare_from_date="2026-02-01",
        compare_to_date="2026-02-26",
        branch="AUTO",
        office_branch="BR-IST",
        months=6,
        allowed_customers=allowed_customers,
        scope_meta=meta,
    )
    cached_payload = {
        "tab": "daily",
        "cards": {"ready_offer_count": 2},
        "compare_cards": {"ready_offer_count": 1},
        "metrics": {"offer_acceptance_rate": 50.0},
        "series": {"offer_status": []},
        "previews": {"action_offers": []},
        "meta": meta,
    }
    cache = _FakeCache({expected_key: cached_payload})
    cards_summary = Mock(return_value={"cards": "should-not-run"})
    tab_sections = Mock(return_value={"metrics": {}, "series": {}, "previews": {}})

    monkeypatch.setattr(dashboard.frappe, "cache", lambda: cache)
    monkeypatch.setattr(
        dashboard,
        "_allowed_customers_for_user",
        lambda include_meta=False: (allowed_customers, meta),
    )
    monkeypatch.setattr(dashboard, "_dashboard_cards_summary", cards_summary)
    monkeypatch.setattr(
        dashboard.dashboard_tab_sections,
        "build_dashboard_tab_sections",
        tab_sections,
    )

    payload = dashboard.get_dashboard_tab_payload(
        tab="daily",
        filters={
            "from_date": "2026-03-01",
            "to_date": "2026-03-26",
            "compare_from_date": "2026-02-01",
            "compare_to_date": "2026-02-26",
            "branch": "AUTO",
            "office_branch": "BR-IST",
            "months": 6,
        },
    )

    assert payload == cached_payload
    assert cards_summary.call_count == 0
    assert tab_sections.call_count == 0
    assert cache.get_calls == [expected_key]
    assert cache.set_calls == []


def test_get_dashboard_tab_payload_caches_miss_with_default_ttl(monkeypatch):
    monkeypatch.setattr(dashboard, "_safe_session_user", lambda: "manager@example.com")
    monkeypatch.setattr(dashboard.frappe, "get_site_config", lambda: {})
    monkeypatch.setattr(
        dashboard,
        "normalize_requested_office_branch",
        lambda office_branch=None, user=None: office_branch,
    )
    allowed_customers = ["CUST-0001"]
    meta = {"access_scope": "scoped", "scope_reason": "agent_assignment"}
    cache = _FakeCache()
    cards_summary = Mock(side_effect=[{"ready_offer_count": 2}, {"ready_offer_count": 1}])
    tab_sections = Mock(
        return_value={
            "metrics": {"offer_acceptance_rate": 66.67},
            "series": {"offer_status": [{"status": "Sent", "total": 2}]},
            "previews": {"action_offers": [{"name": "OFF-1"}]},
        }
    )

    monkeypatch.setattr(dashboard.frappe, "cache", lambda: cache)
    monkeypatch.setattr(
        dashboard,
        "_allowed_customers_for_user",
        lambda include_meta=False: (allowed_customers, meta),
    )
    monkeypatch.setattr(dashboard, "_dashboard_cards_summary", cards_summary)
    monkeypatch.setattr(
        dashboard.dashboard_tab_sections,
        "build_dashboard_tab_sections",
        tab_sections,
    )

    payload = dashboard.get_dashboard_tab_payload(
        tab="sales",
        filters={
            "from_date": "2026-03-01",
            "to_date": "2026-03-26",
            "compare_from_date": "2026-02-01",
            "compare_to_date": "2026-02-26",
            "branch": "AUTO",
            "office_branch": "BR-ANK",
            "months": 4,
        },
    )

    expected_key = dashboard._dashboard_tab_cache_key(
        tab_key="sales",
        from_date="2026-03-01",
        to_date="2026-03-26",
        compare_from_date="2026-02-01",
        compare_to_date="2026-02-26",
        branch="AUTO",
        office_branch="BR-ANK",
        months=4,
        allowed_customers=allowed_customers,
        scope_meta=meta,
    )

    assert payload == {
        "tab": "sales",
        "cards": {"ready_offer_count": 2},
        "compare_cards": {"ready_offer_count": 1},
        "metrics": {"offer_acceptance_rate": 66.67},
        "series": {"offer_status": [{"status": "Sent", "total": 2}]},
        "previews": {"action_offers": [{"name": "OFF-1"}]},
        "meta": meta,
    }
    assert cache.get_calls == [expected_key]
    assert len(cache.set_calls) == 1
    stored_key, stored_payload, ttl = cache.set_calls[0]
    assert stored_key == expected_key
    assert stored_payload == payload
    assert ttl == 300
    assert cards_summary.call_count == 2
    assert tab_sections.call_count == 1


def test_dashboard_tab_cache_key_changes_with_scope_and_filters(monkeypatch):
    monkeypatch.setattr(dashboard, "_safe_session_user", lambda: "agent@example.com")

    base = dashboard._dashboard_tab_cache_key(
        tab_key="daily",
        from_date="2026-03-01",
        to_date="2026-03-26",
        compare_from_date="2026-02-01",
        compare_to_date="2026-02-26",
        branch="AUTO",
        office_branch="BR-IST",
        months=6,
        allowed_customers=["CUST-0001", "CUST-0002"],
        scope_meta={"access_scope": "scoped", "scope_reason": "branch_assignment"},
    )
    same_customers_different_order = dashboard._dashboard_tab_cache_key(
        tab_key="daily",
        from_date="2026-03-01",
        to_date="2026-03-26",
        compare_from_date="2026-02-01",
        compare_to_date="2026-02-26",
        branch="AUTO",
        office_branch="BR-IST",
        months=6,
        allowed_customers=["CUST-0002", "CUST-0001"],
        scope_meta={"access_scope": "scoped", "scope_reason": "branch_assignment"},
    )
    different_branch = dashboard._dashboard_tab_cache_key(
        tab_key="daily",
        from_date="2026-03-01",
        to_date="2026-03-26",
        compare_from_date="2026-02-01",
        compare_to_date="2026-02-26",
        branch="KASKO",
        office_branch="BR-IST",
        months=6,
        allowed_customers=["CUST-0001", "CUST-0002"],
        scope_meta={"access_scope": "scoped", "scope_reason": "branch_assignment"},
    )
    different_scope_meta = dashboard._dashboard_tab_cache_key(
        tab_key="daily",
        from_date="2026-03-01",
        to_date="2026-03-26",
        compare_from_date="2026-02-01",
        compare_to_date="2026-02-26",
        branch="AUTO",
        office_branch="BR-IST",
        months=6,
        allowed_customers=["CUST-0001", "CUST-0002"],
        scope_meta={"access_scope": "global", "scope_reason": "privileged_role"},
    )
    different_tab = dashboard._dashboard_tab_cache_key(
        tab_key="collections",
        from_date="2026-03-01",
        to_date="2026-03-26",
        compare_from_date="2026-02-01",
        compare_to_date="2026-02-26",
        branch="AUTO",
        office_branch="BR-IST",
        months=6,
        allowed_customers=["CUST-0001", "CUST-0002"],
        scope_meta={"access_scope": "scoped", "scope_reason": "branch_assignment"},
    )

    assert base == same_customers_different_order
    assert base != different_branch
    assert base != different_scope_meta
    assert base != different_tab
