from types import SimpleNamespace

from acentem_takipte.acentem_takipte.services import admin_jobs
from acentem_takipte.acentem_takipte.services import customer_segments


def test_build_customer_segment_snapshot_payload_produces_expected_band_and_signals():
    payload = customer_segments.build_customer_segment_snapshot_payload(
        active_policy_count=3,
        policy_total_premium=120000,
        open_claim_count=0,
        upcoming_renewal_count=1,
        overdue_payment_count=0,
        overdue_payment_amount=0,
        total_policy_count=4,
        cancelled_policy_count=0,
    )

    assert payload["segment"] == "Strategic"
    assert payload["claim_risk"] == "Low"
    assert payload["value_band"] == "High Value"
    assert "multi_policy" in payload["strengths"]
    assert payload["source_version"] == "v1"


def test_upsert_customer_segment_snapshot_updates_existing_snapshot(monkeypatch):
    saved = {"save_called": False}
    snapshot = SimpleNamespace(
        strengths_json="[]",
        risks_json="[]",
        score_reason_json="{}",
        save=lambda ignore_permissions=False: saved.update({"save_called": ignore_permissions}),
    )
    monkeypatch.setattr(customer_segments.frappe.db, "exists", lambda doctype, name=None: True)
    monkeypatch.setattr(
        customer_segments.frappe.db,
        "get_value",
        lambda doctype, filters, fieldname: "SEG-SNAP-1",
    )
    monkeypatch.setattr(customer_segments.frappe, "get_doc", lambda *args, **kwargs: snapshot)

    payload = customer_segments.upsert_customer_segment_snapshot(
        customer_name="CUS-001",
        office_branch="IST",
        snapshot_date="2026-03-09",
        insight_payload={
            "score": 60,
            "segment": "Growth",
            "claim_risk": "Medium",
            "value_band": "Mid Value",
            "strengths": ["active_portfolio"],
            "risks": ["overdue_payment"],
            "score_reason": {"active_policy_count": 2},
            "source_version": "v1",
        },
    )

    assert saved["save_called"] is True
    assert payload["segment"] == "Growth"
    assert payload["snapshot_date"] == "2026-03-09"


def test_refresh_due_customer_segment_snapshots_builds_daily_snapshots(monkeypatch):
    upserts = []

    def fake_get_all(doctype, **kwargs):
        if doctype == "AT Customer":
            return [SimpleNamespace(name="CUS-001", office_branch="IST")]
        if doctype == "AT Policy":
            return [SimpleNamespace(status="Active", gross_premium=120000)]
        if doctype == "AT Claim":
            return [SimpleNamespace(claim_status="Open")]
        if doctype == "AT Payment Installment":
            return [SimpleNamespace(amount_try=3500)]
        return []

    monkeypatch.setattr(customer_segments.frappe, "get_all", fake_get_all)
    monkeypatch.setattr(customer_segments.frappe.db, "has_column", lambda *args, **kwargs: False)
    monkeypatch.setattr(
        customer_segments.frappe.db,
        "exists",
        lambda doctype, name=None: True if doctype == "DocType" else False,
    )
    monkeypatch.setattr(
        customer_segments.frappe.db,
        "count",
        lambda doctype, filters=None: 2 if doctype == "AT Renewal Task" else 0,
    )
    monkeypatch.setattr(
        customer_segments,
        "upsert_customer_segment_snapshot",
        lambda **kwargs: upserts.append(kwargs) or {"segment": "Strategic"},
    )

    result = customer_segments.refresh_due_customer_segment_snapshots(limit=50, snapshot_date="2026-03-09")

    assert result["processed"] == 1
    assert result["refreshed"] == 1
    assert result["snapshot_date"] == "2026-03-09"
    assert upserts[0]["customer_name"] == "CUS-001"
    assert upserts[0]["office_branch"] == "IST"
    assert upserts[0]["insight_payload"]["segment"] == "Strategic"


def test_dispatch_admin_job_runs_customer_segment_snapshot_job(monkeypatch):
    called = {}
    monkeypatch.setattr(
        admin_jobs.task_jobs,
        "run_customer_segment_snapshot_job",
        lambda limit=250: called.update({"limit": limit}) or {"queued": True, "limit": limit},
    )
    audit_calls = []
    monkeypatch.setattr(admin_jobs, "log_decision_event", lambda *args, **kwargs: audit_calls.append((args, kwargs)))

    payload = admin_jobs.dispatch_admin_job("run_customer_segment_snapshot_job", limit=120)

    assert called["limit"] == 120
    assert audit_calls[0][0] == ("DocType", "AT Customer Segment Snapshot")
    assert audit_calls[0][1]["action"] == "Run"
    assert payload == {"queued": True, "limit": 120}

