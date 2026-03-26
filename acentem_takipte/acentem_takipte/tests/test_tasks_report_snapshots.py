from __future__ import annotations

import acentem_takipte.acentem_takipte.tasks as tasks


def test_run_report_snapshot_job_queues_snapshot_refresh(monkeypatch):
    enqueued = {}

    def fake_enqueue(method, **kwargs):
        enqueued.update({"method": method, **kwargs})
        return {"id": "job-1"}

    monkeypatch.setattr(tasks.frappe, "enqueue", fake_enqueue)

    payload = tasks.run_report_snapshot_job(limit=0)

    assert enqueued == {
        "method": "acentem_takipte.tasks._run_report_snapshot_logic",
        "limit": 1,
        "queue": "long",
        "timeout": 1500,
    }
    assert payload["queued"] is True
    assert payload["limit"] == 1
    assert payload["queue"] == "long"


def test_run_report_snapshot_logic_clamps_limit_and_delegates(monkeypatch):
    captured = {}
    monkeypatch.setattr(
        tasks,
        "refresh_report_snapshots",
        lambda limit=1000, **kwargs: captured.update({"limit": limit, **kwargs}) or {"refreshed": 2},
    )

    payload = tasks._run_report_snapshot_logic(limit=0)

    assert captured == {"limit": 1}
    assert payload == {"refreshed": 2}
