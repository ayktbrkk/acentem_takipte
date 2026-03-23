from __future__ import annotations

from acentem_takipte.acentem_takipte.api import admin_jobs


def test_run_scheduled_reports_job_uses_admin_access(monkeypatch):
    calls = []

    monkeypatch.setattr(
        admin_jobs,
        "_assert_admin_job_access",
        lambda action, details=None: calls.append((action, details)),
    )
    monkeypatch.setattr(
        admin_jobs.task_jobs,
        "run_scheduled_reports_job",
        lambda frequency="daily", limit=10: {"queued": True, "frequency": frequency, "limit": limit},
    )

    response = admin_jobs.run_scheduled_reports_job(frequency="weekly", limit=12)

    assert response["queued"] is True
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
    monkeypatch.setattr(
        admin_jobs.task_jobs,
        "run_customer_segment_snapshot_job",
        lambda limit=250: {"queued": True, "limit": limit},
    )

    response = admin_jobs.run_customer_segment_snapshot_job(limit=120)

    assert response["queued"] is True
    assert response["limit"] == 120
    assert calls == [
        ("api.admin_jobs.run_customer_segment_snapshot_job", {"limit": 120}),
    ]

