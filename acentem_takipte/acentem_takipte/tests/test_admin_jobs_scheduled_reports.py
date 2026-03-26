from __future__ import annotations

from types import SimpleNamespace

from acentem_takipte.acentem_takipte.api import admin_jobs


def test_run_scheduled_reports_job_uses_admin_access(monkeypatch):
    calls = []

    monkeypatch.setattr(
        admin_jobs,
        "_assert_admin_job_access",
        lambda action, details=None: calls.append((action, details)),
    )
    monkeypatch.setattr(admin_jobs.frappe.local, "flags", SimpleNamespace(in_test=True), raising=False)
    monkeypatch.setattr(
        admin_jobs,
        "dispatch_admin_job",
        lambda action_key, **kwargs: {"queued": True, "action_key": action_key, **kwargs},
    )

    response = admin_jobs.run_scheduled_reports_job(frequency="weekly", limit=12)

    assert response["queued"] is True
    assert response["action_key"] == "run_scheduled_reports_job"
    assert calls == [
        (
            "api.admin_jobs.run_scheduled_reports_job",
            {"limit": 12, "frequency": "weekly"},
        )
    ]


def test_run_customer_segment_snapshot_job_uses_admin_access(monkeypatch):
    calls = []

    monkeypatch.setattr(
        admin_jobs,
        "_assert_admin_job_access",
        lambda action, details=None: calls.append((action, details)),
    )
    monkeypatch.setattr(admin_jobs.frappe.local, "flags", SimpleNamespace(in_test=True), raising=False)
    monkeypatch.setattr(
        admin_jobs,
        "dispatch_admin_job",
        lambda action_key, **kwargs: {"queued": True, "action_key": action_key, **kwargs},
    )

    response = admin_jobs.run_customer_segment_snapshot_job(limit=120)

    assert response["queued"] is True
    assert response["limit"] == 120
    assert response["action_key"] == "run_customer_segment_snapshot_job"
    assert calls == [
        ("api.admin_jobs.run_customer_segment_snapshot_job", {"limit": 120}),
    ]


def test_run_report_snapshot_job_uses_admin_access(monkeypatch):
    calls = []

    monkeypatch.setattr(
        admin_jobs,
        "_assert_admin_job_access",
        lambda action, details=None: calls.append((action, details)),
    )
    monkeypatch.setattr(admin_jobs.frappe.local, "flags", SimpleNamespace(in_test=True), raising=False)
    monkeypatch.setattr(
        admin_jobs,
        "dispatch_admin_job",
        lambda action_key, **kwargs: {"queued": True, "action_key": action_key, **kwargs},
    )

    response = admin_jobs.run_report_snapshot_job(limit=3)

    assert response["queued"] is True
    assert response["limit"] == 3
    assert response["action_key"] == "run_report_snapshot_job"
    assert calls == [
        ("api.admin_jobs.run_report_snapshot_job", {"limit": 3}),
    ]

