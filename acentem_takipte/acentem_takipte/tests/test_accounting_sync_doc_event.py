from __future__ import annotations

from types import SimpleNamespace

from acentem_takipte.acentem_takipte import accounting


class _FakeCache:
    def __init__(self):
        self.store = {}

    def get_value(self, key):
        return self.store.get(key)

    def set_value(self, key, value, expires_in_sec=None):
        self.store[key] = {"value": value, "expires_in_sec": expires_in_sec}

    def delete_value(self, key):
        self.store.pop(key, None)


def test_sync_doc_event_enqueues_once_per_doc(monkeypatch):
    cache = _FakeCache()
    enqueued = []

    def fake_enqueue(method, **kwargs):
        enqueued.append({"method": method, **kwargs})
        return {"job_id": "job-1"}

    monkeypatch.setattr(
        accounting,
        "frappe",
        SimpleNamespace(
            cache=lambda: cache,
            enqueue=fake_enqueue,
        ),
    )

    doc = SimpleNamespace(doctype="AT Policy", name="POL-001")

    accounting.sync_doc_event(doc)
    accounting.sync_doc_event(doc)

    assert enqueued == [
        {
            "method": "acentem_takipte.acentem_takipte.accounting._run_accounting_sync_doc_event",
            "source_doctype": "AT Policy",
            "source_name": "POL-001",
            "queue": "default",
            "timeout": 600,
            "enqueue_after_commit": True,
        }
    ]


def test_enqueue_accounting_sync_doc_clears_cache_on_enqueue_error(monkeypatch):
    cache = _FakeCache()

    monkeypatch.setattr(
        accounting,
        "frappe",
        SimpleNamespace(
            cache=lambda: cache,
            enqueue=lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("queue down")),
        ),
    )

    try:
        accounting._enqueue_accounting_sync_doc("AT Policy", "POL-001")
    except RuntimeError:
        pass

    assert cache.store == {}


def test_run_accounting_sync_doc_event_releases_debounce_key(monkeypatch):
    cache = _FakeCache()
    key = accounting._build_sync_doc_event_cache_key("AT Policy", "POL-001")
    cache.set_value(key, 1, expires_in_sec=90)

    monkeypatch.setattr(accounting, "sync_accounting_entry", lambda doctype, name: {"status": "Synced", "entry": name})
    monkeypatch.setattr(
        accounting,
        "frappe",
        SimpleNamespace(
            cache=lambda: cache,
        ),
    )

    result = accounting._run_accounting_sync_doc_event("AT Policy", "POL-001")

    assert result == {"status": "Synced", "entry": "POL-001"}
    assert cache.store == {}
