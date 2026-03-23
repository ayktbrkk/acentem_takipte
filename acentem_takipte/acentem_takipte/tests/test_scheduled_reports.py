from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import Mock

from acentem_takipte.services import scheduled_reports


def test_is_schedule_due_handles_daily_weekly_monthly():
    assert scheduled_reports.is_schedule_due({"frequency": "daily"}, business_date="2026-03-06")
    assert scheduled_reports.is_schedule_due({"frequency": "weekly", "weekday": 4}, business_date="2026-03-06")
    assert scheduled_reports.is_schedule_due({"frequency": "monthly", "day_of_month": 6}, business_date="2026-03-06")
    assert not scheduled_reports.is_schedule_due({"frequency": "weekly", "weekday": 0}, business_date="2026-03-06")


def test_dispatch_scheduled_reports_sends_attachment(monkeypatch):
    monkeypatch.setattr(
        scheduled_reports,
        "load_scheduled_report_configs",
        lambda: [
            {
                "enabled": 1,
                "report_key": "policy_list",
                "frequency": "daily",
                "format": "xlsx",
                "recipients": ["ops@example.com"],
                "filters": {"office_branch": "Istanbul"},
                "limit": 250,
            }
        ],
    )
    monkeypatch.setattr(
        scheduled_reports,
        "build_report_payload",
        lambda report_key, filters=None, limit=500: {
            "report_key": report_key,
            "columns": ["name"],
            "rows": [{"name": "POL-001"}],
            "filters": filters or {},
            "total": 1,
        },
    )
    monkeypatch.setattr(scheduled_reports, "render_report_xlsx", lambda **kwargs: b"xlsx")
    sendmail = Mock()
    monkeypatch.setattr(
        scheduled_reports,
        "frappe",
        SimpleNamespace(
            sendmail=sendmail,
            logger=lambda *_args, **_kwargs: SimpleNamespace(info=lambda *_a, **_k: None),
        ),
    )

    summary = scheduled_reports.dispatch_scheduled_reports(frequency="daily", limit=5, business_date="2026-03-06")

    assert summary["sent"] == 1
    assert sendmail.called


def test_dispatch_scheduled_reports_updates_last_run_metadata(monkeypatch):
    configs = [
        {
            "enabled": 1,
            "report_key": "policy_list",
            "frequency": "daily",
            "format": "xlsx",
            "delivery_channel": "email",
            "recipients": ["ops@example.com"],
            "filters": {"office_branch": "Istanbul"},
            "limit": 250,
        }
    ]
    monkeypatch.setattr(scheduled_reports, "load_scheduled_report_configs", lambda: configs)
    saved_configs = {}
    monkeypatch.setattr(scheduled_reports, "save_scheduled_report_configs", lambda payload: saved_configs.setdefault("items", payload))
    monkeypatch.setattr(
        scheduled_reports,
        "build_report_payload",
        lambda report_key, filters=None, limit=500: {
            "report_key": report_key,
            "columns": ["name"],
            "rows": [{"name": "POL-001"}],
            "filters": filters or {},
            "total": 1,
        },
    )
    monkeypatch.setattr(scheduled_reports, "render_report_xlsx", lambda **kwargs: b"xlsx")
    monkeypatch.setattr(
        scheduled_reports,
        "frappe",
        SimpleNamespace(
            sendmail=Mock(),
            logger=lambda *_args, **_kwargs: SimpleNamespace(info=lambda *_a, **_k: None),
        ),
    )

    scheduled_reports.dispatch_scheduled_reports(frequency="daily", limit=5, business_date="2026-03-06")

    assert saved_configs["items"][0]["last_status"] == "sent"
    assert saved_configs["items"][0]["last_run_at"] == "2026-03-06 00:00:00"
    assert saved_configs["items"][0]["last_summary"]["delivery_channel"] == "email"


def test_dispatch_scheduled_reports_can_queue_notification_delivery(monkeypatch):
    monkeypatch.setattr(
        scheduled_reports,
        "load_scheduled_report_configs",
        lambda: [
            {
                "enabled": 1,
                "report_key": "policy_list",
                "frequency": "daily",
                "format": "pdf",
                "delivery_channel": "notification_outbox",
                "recipients": ["ops@example.com", "manager@example.com"],
                "filters": {"office_branch": "Istanbul"},
                "limit": 100,
            }
        ],
    )
    monkeypatch.setattr(
        scheduled_reports,
        "build_report_payload",
        lambda report_key, filters=None, limit=500: {
            "report_key": report_key,
            "columns": ["name"],
            "rows": [{"name": "POL-001"}],
            "filters": filters or {},
            "total": 1,
        },
    )
    monkeypatch.setattr(scheduled_reports, "render_report_pdf", lambda **kwargs: b"pdf")
    queue_delivery = Mock(return_value={"queued": 2, "failed": 0, "outboxes": ["OUT-1", "OUT-2"]})
    monkeypatch.setattr(scheduled_reports, "_queue_scheduled_report_delivery", queue_delivery)
    monkeypatch.setattr(
        scheduled_reports,
        "frappe",
        SimpleNamespace(
            logger=lambda *_args, **_kwargs: SimpleNamespace(info=lambda *_a, **_k: None),
        ),
    )

    summary = scheduled_reports.dispatch_scheduled_reports(frequency="daily", limit=5, business_date="2026-03-06")

    assert summary["queued"] == 2
    assert summary["queue_failed"] == 0
    assert summary["sent"] == 0
    assert summary["outboxes"] == ["OUT-1", "OUT-2"]
    assert queue_delivery.called


def test_dispatch_scheduled_reports_tracks_outbox_queue_failures(monkeypatch):
    monkeypatch.setattr(
        scheduled_reports,
        "load_scheduled_report_configs",
        lambda: [
            {
                "enabled": 1,
                "report_key": "policy_list",
                "frequency": "daily",
                "format": "pdf",
                "delivery_channel": "notification_outbox",
                "recipients": ["ops@example.com"],
                "filters": {"office_branch": "Istanbul"},
                "limit": 100,
            }
        ],
    )
    monkeypatch.setattr(
        scheduled_reports,
        "build_report_payload",
        lambda report_key, filters=None, limit=500: {
            "report_key": report_key,
            "columns": ["name"],
            "rows": [{"name": "POL-001"}],
            "filters": filters or {},
            "total": 1,
        },
    )
    monkeypatch.setattr(scheduled_reports, "render_report_pdf", lambda **kwargs: b"pdf")
    monkeypatch.setattr(
        scheduled_reports,
        "_queue_scheduled_report_delivery",
        Mock(return_value={"queued": 0, "failed": 1, "outboxes": []}),
    )
    monkeypatch.setattr(
        scheduled_reports,
        "frappe",
        SimpleNamespace(
            logger=lambda *_args, **_kwargs: SimpleNamespace(info=lambda *_a, **_k: None),
        ),
    )

    summary = scheduled_reports.dispatch_scheduled_reports(frequency="daily", limit=5, business_date="2026-03-06")

    assert summary["queued"] == 0
    assert summary["queue_failed"] == 1


def test_dispatch_scheduled_reports_normalizes_string_recipients_and_filters(monkeypatch):
    configs = [
        {
            "enabled": 1,
            "report_key": "policy_list",
            "frequency": "daily",
            "format": "xlsx",
            "delivery_channel": " EMAIL ",
            "recipients": " ops@example.com, finance@example.com, ops@example.com ",
            "filters": '{"office_branch":"Istanbul"}',
            "limit": 250,
        }
    ]
    monkeypatch.setattr(scheduled_reports, "load_scheduled_report_configs", lambda: configs)
    monkeypatch.setattr(
        scheduled_reports,
        "build_report_payload",
        lambda report_key, filters=None, limit=500: {
            "report_key": report_key,
            "columns": ["name"],
            "rows": [{"name": "POL-001"}],
            "filters": filters or {},
            "total": 1,
        },
    )
    monkeypatch.setattr(scheduled_reports, "render_report_xlsx", lambda **kwargs: b"xlsx")
    sendmail = Mock()
    monkeypatch.setattr(
        scheduled_reports,
        "frappe",
        SimpleNamespace(
            sendmail=sendmail,
            logger=lambda *_args, **_kwargs: SimpleNamespace(info=lambda *_a, **_k: None),
        ),
    )

    summary = scheduled_reports.dispatch_scheduled_reports(frequency="daily", limit=5, business_date="2026-03-06")

    assert summary["sent"] == 1
    kwargs = sendmail.call_args.kwargs
    assert kwargs["recipients"] == ["ops@example.com", "finance@example.com"]


def test_dispatch_scheduled_reports_uses_config_locale_for_title(monkeypatch):
    configs = [
        {
            "enabled": 1,
            "report_key": "policy_list",
            "frequency": "daily",
            "format": "xlsx",
            "delivery_channel": "email",
            "locale": "en",
            "recipients": ["ops@example.com"],
            "filters": {},
            "limit": 100,
        }
    ]
    monkeypatch.setattr(scheduled_reports, "load_scheduled_report_configs", lambda: configs)
    monkeypatch.setattr(
        scheduled_reports,
        "build_report_payload",
        lambda report_key, filters=None, limit=500: {
            "report_key": report_key,
            "columns": ["name"],
            "rows": [{"name": "POL-001"}],
            "filters": filters or {},
            "total": 1,
        },
    )
    monkeypatch.setattr(scheduled_reports, "render_report_xlsx", lambda **kwargs: b"xlsx")
    monkeypatch.setattr(scheduled_reports, "build_report_title", lambda report_key, locale: f"{report_key}:{locale}")
    sendmail = Mock()
    monkeypatch.setattr(
        scheduled_reports,
        "frappe",
        SimpleNamespace(
            sendmail=sendmail,
            logger=lambda *_args, **_kwargs: SimpleNamespace(info=lambda *_a, **_k: None),
        ),
    )

    scheduled_reports.dispatch_scheduled_reports(frequency="daily", limit=5, business_date="2026-03-06")

    assert sendmail.call_args.kwargs["subject"].startswith("policy_list:en")


def test_dispatch_scheduled_reports_passes_locale_to_xlsx_renderer(monkeypatch):
    configs = [
        {
            "enabled": 1,
            "report_key": "policy_list",
            "frequency": "daily",
            "format": "xlsx",
            "delivery_channel": "email",
            "locale": "en-US",
            "recipients": ["ops@example.com"],
            "filters": {},
            "limit": 100,
        }
    ]
    captured = {}
    monkeypatch.setattr(scheduled_reports, "load_scheduled_report_configs", lambda: configs)
    monkeypatch.setattr(
        scheduled_reports,
        "build_report_payload",
        lambda report_key, filters=None, limit=500: {
            "report_key": report_key,
            "columns": ["name"],
            "rows": [{"name": "POL-001"}],
            "filters": filters or {},
            "total": 1,
        },
    )
    monkeypatch.setattr(scheduled_reports, "render_report_xlsx", lambda **kwargs: captured.update(kwargs) or b"xlsx")
    monkeypatch.setattr(
        scheduled_reports,
        "frappe",
        SimpleNamespace(
            sendmail=Mock(),
            logger=lambda *_args, **_kwargs: SimpleNamespace(info=lambda *_a, **_k: None),
        ),
    )

    scheduled_reports.dispatch_scheduled_reports(frequency="daily", limit=5, business_date="2026-03-06")

    assert captured["locale"] == "en-US"
