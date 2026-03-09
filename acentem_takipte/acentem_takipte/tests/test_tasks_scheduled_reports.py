from __future__ import annotations

from acentem_takipte.acentem_takipte import tasks


def test_run_scheduled_reports_logic_enqueues_queued_outboxes(monkeypatch):
    monkeypatch.setattr(
        tasks,
        "dispatch_scheduled_reports",
        lambda frequency="daily", limit=10: {
            "scanned": 1,
            "sent": 0,
            "queued": 2,
            "queue_failed": 0,
            "skipped_disabled": 0,
            "skipped_not_due": 0,
            "skipped_invalid": 0,
            "outboxes": ["OUT-1", "OUT-2"],
        },
    )

    enqueued = []

    def fake_enqueue(method, **kwargs):
        enqueued.append({"method": method, **kwargs})
        return {"job_id": f"job-{len(enqueued)}"}

    monkeypatch.setattr(tasks.frappe, "enqueue", fake_enqueue)

    summary = tasks._run_scheduled_reports_logic(frequency="weekly", limit=5)

    assert enqueued == [
        {
            "method": "acentem_takipte.acentem_takipte.communication.dispatch_notification_outbox",
            "outbox_name": "OUT-1",
            "queue": "default",
            "timeout": 600,
        },
        {
            "method": "acentem_takipte.acentem_takipte.communication.dispatch_notification_outbox",
            "outbox_name": "OUT-2",
            "queue": "default",
            "timeout": 600,
        },
    ]
    assert summary["queued"] == 2
    assert summary["outbox_enqueued"] == 2
    assert summary["outbox_queue_failed"] == 0
    assert summary["outbox_sent"] == 0
    assert summary["outbox_failed"] == 0
    assert summary["outbox_dead"] == 0
    assert summary["outbox_skipped"] == 0


def test_enqueue_outbox_dispatch_jobs_tracks_failures(monkeypatch):
    calls = []

    def fake_enqueue(method, **kwargs):
        if kwargs.get("outbox_name") == "OUT-2":
            raise RuntimeError("queue offline")
        calls.append({"method": method, **kwargs})
        return {"job_id": "job-ok"}

    monkeypatch.setattr(tasks.frappe, "enqueue", fake_enqueue)

    summary = tasks._enqueue_outbox_dispatch_jobs(["OUT-1", "", "OUT-2"])

    assert calls == [
        {
            "method": "acentem_takipte.acentem_takipte.communication.dispatch_notification_outbox",
            "outbox_name": "OUT-1",
            "queue": "default",
            "timeout": 600,
        }
    ]
    assert summary == {"queued": 1, "failed": 1, "skipped": 1}
