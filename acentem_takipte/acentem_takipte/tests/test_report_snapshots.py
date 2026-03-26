from __future__ import annotations

from types import SimpleNamespace

from acentem_takipte.acentem_takipte.services import report_registry
from acentem_takipte.acentem_takipte.services import report_snapshots


def test_store_and_load_report_snapshot_payload_round_trip(monkeypatch):
    snapshots: dict[str, SimpleNamespace] = {}
    fixed_today = "2026-03-26"

    monkeypatch.setattr(report_snapshots, "_has_snapshot_doctype", lambda: True)
    monkeypatch.setattr(report_snapshots, "today", lambda: fixed_today)
    monkeypatch.setattr(report_snapshots, "now_datetime", lambda: "2026-03-26 12:00:00")
    monkeypatch.setattr(report_snapshots, "_safe_session_user", lambda: "Administrator")
    fake_frappe = SimpleNamespace()
    fake_frappe.parse_json = report_snapshots.frappe.parse_json
    fake_frappe.session = SimpleNamespace(user="Administrator")

    def fake_get_value(doctype, filters, fieldname):
        for name, snapshot in snapshots.items():
            if (
                snapshot.report_key == filters["report_key"]
                and snapshot.snapshot_date == filters["snapshot_date"]
                and snapshot.scope_hash == filters["scope_hash"]
            ):
                return name
        return None

    def fake_get_doc(*args, **kwargs):
        if len(args) == 2 and args[0] == "AT Report Snapshot":
            return snapshots[args[1]]
        if len(args) == 1 and isinstance(args[0], dict):
            data = dict(args[0])
            doc = SimpleNamespace(**data)

            def insert(ignore_permissions=False):
                doc.name = f"SNAP-{len(snapshots) + 1}"
                snapshots[doc.name] = doc
                return doc

            def save(ignore_permissions=False):
                snapshots[doc.name] = doc
                return doc

            doc.insert = insert
            doc.save = save
            return doc
        raise AssertionError(f"Unexpected get_doc call: {args!r} {kwargs!r}")

    fake_frappe.db = SimpleNamespace(exists=lambda *args, **kwargs: True, get_value=fake_get_value)
    fake_frappe.get_doc = fake_get_doc
    monkeypatch.setattr(report_snapshots, "frappe", fake_frappe)

    payload = {
        "columns": ["name", "status"],
        "rows": [{"name": "POL-001", "status": "Active"}],
        "filters": {"office_branch": "IST"},
        "source_version": "v2",
        "notes": "generated for smoke",
    }

    stored = report_snapshots.store_report_snapshot_payload(
        "policy_list",
        {"office_branch": "IST"},
        payload,
        snapshot_date=fixed_today,
    )

    assert stored["report_key"] == "policy_list"
    assert stored["row_count"] == 1
    assert stored["source_version"] == "v2"
    assert stored["generated_by"] == "Administrator"
    assert stored["notes"] == "generated for smoke"
    assert len(snapshots) == 1

    loaded = report_snapshots.load_report_snapshot_payload(
        "policy_list",
        {"office_branch": "IST"},
        snapshot_date=fixed_today,
    )

    assert loaded == stored


def test_build_snapshot_aware_report_payload_prefers_snapshot_when_limit_fits(monkeypatch):
    snapshot = {
        "report_key": "agent_performance",
        "columns": ["sales_entity", "policy_count"],
        "rows": [{"sales_entity": "SE-1"}, {"sales_entity": "SE-2"}],
        "filters": {"office_branch": "IST"},
        "total": 2,
    }
    live_called = {"count": 0}

    monkeypatch.setattr(report_snapshots, "load_report_snapshot_payload", lambda *args, **kwargs: snapshot)

    def fake_live_payload():
        live_called["count"] += 1
        return {"report_key": "agent_performance", "columns": [], "rows": [], "filters": {}, "total": 0}

    payload = report_snapshots.build_snapshot_aware_report_payload(
        "agent_performance",
        filters={"office_branch": "IST"},
        limit=2,
        build_live_payload=fake_live_payload,
    )

    assert live_called["count"] == 0
    assert payload["rows"] == snapshot["rows"]
    assert payload["total"] == 2


def test_refresh_report_snapshots_forwards_force_refresh(monkeypatch):
    captured = []
    monkeypatch.setattr(
        report_registry,
        "REPORT_DEFINITIONS",
        {
            "agent_performance": {"rows_fn": lambda filters, limit: [{"name": "SE-1"}]},
            "customer_segmentation": {"rows_fn": lambda filters, limit: [{"name": "CUS-1"}]},
        },
    )
    monkeypatch.setattr(
        report_registry,
        "build_report_payload",
        lambda report_key, filters=None, limit=500, force_refresh=False: captured.append(
            {
                "report_key": report_key,
                "filters": filters,
                "limit": limit,
                "force_refresh": force_refresh,
            }
        )
        or {"rows": [{"name": report_key}], "columns": ["name"], "filters": filters or {}, "total": 1},
    )

    payload = report_snapshots.refresh_report_snapshots(
        report_keys=["agent_performance", "missing"],
        filters_by_report={"agent_performance": {"office_branch": "IST"}},
        limit=7,
    )

    assert captured == [
        {
            "report_key": "agent_performance",
            "filters": {"office_branch": "IST"},
            "limit": 7,
            "force_refresh": True,
        }
    ]
    assert payload["refreshed"] == 1
    assert payload["items"][0]["report_key"] == "agent_performance"
    assert payload["items"][0]["row_count"] == 1
