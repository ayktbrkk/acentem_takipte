from __future__ import annotations

from types import SimpleNamespace

from acentem_takipte.acentem_takipte.services import branches
from acentem_takipte.acentem_takipte.services import break_glass
from acentem_takipte.acentem_takipte.services import privacy_masking
from acentem_takipte.acentem_takipte.services import reports_runtime


class _FakeCache:
    def __init__(self):
        self.store = {}
        self.deleted = []

    def get_value(self, key):
        return self.store.get(key)

    def set_value(self, key, value, expires_in_sec=None):
        self.store[key] = value

    def delete_value(self, key):
        self.deleted.append(key)
        self.store.pop(key, None)


def test_clear_user_scope_cache_publishes_realtime_event(monkeypatch):
    cache = _FakeCache()
    published = []
    monkeypatch.setattr(
        branches,
        "frappe",
        SimpleNamespace(
            cache=lambda: cache,
            publish_realtime=lambda event, payload, **kwargs: published.append((event, payload, kwargs)),
        ),
    )

    branches.clear_user_scope_cache("manager@example.com")

    assert cache.deleted == [
        "at_scope::manager@example.com::branches",
        "at_scope::manager@example.com::sales_entities",
    ]
    assert published[0][0] == "at_scope_changed"
    assert published[0][1]["user"] == "manager@example.com"
    assert published[0][2]["user"] == "manager@example.com"


def test_masked_query_gate_returns_429_on_daily_limit(monkeypatch):
    cache = _FakeCache()
    response = {}
    permission_error = type("PermissionError", (Exception,), {})

    monkeypatch.setattr(
        privacy_masking,
        "frappe",
        SimpleNamespace(
            session=SimpleNamespace(user="partner@example.com"),
            cache=lambda: cache,
            get_site_config=lambda: {"at_masked_query_daily_limit": 1},
            response=response,
            PermissionError=permission_error,
            throw=lambda message, exc: (_ for _ in ()).throw(exc(message)),
            log_error=lambda **kwargs: None,
        ),
    )
    monkeypatch.setattr(privacy_masking, "_", lambda message: message)

    cache.set_value(privacy_masking._rate_limit_cache_key("partner@example.com"), 1)

    try:
        privacy_masking.masked_query_gate("partner@example.com", endpoint="customer_list", row_count=1)
        assert False, "expected rate limit exception"
    except Exception as exc:
        assert "limit" in str(exc).lower()

    assert response["http_status_code"] == 429


def test_masked_query_gate_logs_fingerprint_without_raw_identity(monkeypatch):
    cache = _FakeCache()
    entries = []
    response = {}

    monkeypatch.setattr(
        privacy_masking,
        "frappe",
        SimpleNamespace(
            session=SimpleNamespace(user="partner@example.com"),
            cache=lambda: cache,
            get_site_config=lambda: {"at_masked_query_daily_limit": 30},
            response=response,
            PermissionError=RuntimeError,
            throw=lambda message, exc: (_ for _ in ()).throw(exc(message)),
            log_error=lambda **kwargs: entries.append(kwargs),
        ),
    )

    privacy_masking.masked_query_gate("partner@example.com", endpoint="customer_workbench", row_count=3)

    assert entries
    assert entries[0]["title"] == "[KVKK Audit] Masked Query"
    assert "fingerprint=" in entries[0]["message"]
    assert "12345678901" not in entries[0]["message"]


def test_break_glass_expire_stale_marks_records_expired(monkeypatch):
    commits = []
    rollbacks = []
    docs = {}

    class _Doc:
        def __init__(self, name):
            self.name = name
            self.status = "Active"

        def save(self, ignore_permissions=True):
            docs[self.name] = self.status

    def _get_doc(doctype, name):
        return _Doc(name)

    monkeypatch.setattr(
        break_glass,
        "frappe",
        SimpleNamespace(
            db=SimpleNamespace(
                exists=lambda doctype, name: True,
                commit=lambda: commits.append(True),
                rollback=lambda: rollbacks.append(True),
            ),
            get_all=lambda *args, **kwargs: [SimpleNamespace(name="EA-0001"), SimpleNamespace(name="EA-0002")],
            get_doc=_get_doc,
        ),
    )
    monkeypatch.setattr(break_glass, "now_datetime", lambda: "2026-03-25 00:00:00")

    result = break_glass.expire_stale()

    assert result == {"expired": 2}
    assert docs == {"EA-0001": "Expired", "EA-0002": "Expired"}
    assert len(commits) == 2
    assert not rollbacks


def test_report_cache_key_changes_with_scope_hash(monkeypatch):
    cache = _FakeCache()
    payload_calls = []
    state = {"scope": "scope-a"}

    monkeypatch.setattr(
        reports_runtime,
        "frappe",
        SimpleNamespace(
            session=SimpleNamespace(user="manager@example.com"),
            cache=lambda: cache,
            get_site_config=lambda: {"at_report_cache_ttl": 600},
            throw=lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("unexpected throw")),
        ),
    )
    monkeypatch.setattr(
        reports_runtime,
        "build_report_payload",
        lambda report_key, filters, limit: payload_calls.append((report_key, filters, limit)) or {"rows": [report_key]},
    )
    monkeypatch.setattr(branches, "get_scope_hash", lambda user=None: state["scope"])

    first = reports_runtime.build_safe_report_payload("policy_list", {"office_branch": "ANK"}, 50)
    again_same_scope = reports_runtime.build_safe_report_payload("policy_list", {"office_branch": "ANK"}, 50)
    state["scope"] = "scope-b"
    second_scope = reports_runtime.build_safe_report_payload("policy_list", {"office_branch": "ANK"}, 50)

    assert first == {"rows": ["policy_list"]}
    assert again_same_scope == {"rows": ["policy_list"]}
    assert second_scope == {"rows": ["policy_list"]}
    assert len(payload_calls) == 2