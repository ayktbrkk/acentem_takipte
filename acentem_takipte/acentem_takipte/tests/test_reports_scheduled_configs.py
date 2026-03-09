from __future__ import annotations

import pytest

from acentem_takipte.acentem_takipte.api import reports
from acentem_takipte.acentem_takipte.services import scheduled_reports


def test_get_scheduled_report_configs_returns_summary(monkeypatch):
    monkeypatch.setattr(reports, "assert_authenticated", lambda: "Administrator")
    monkeypatch.setattr(reports, "assert_roles", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        reports,
        "summarize_scheduled_report_configs",
        lambda: [
            {
                "index": 1,
                "enabled": True,
                "report_key": "policy_list",
                "frequency": "daily",
                "format": "xlsx",
                "delivery_channel": "email",
                "recipients": ["ops@example.com"],
                "filters": {"office_branch": "Istanbul"},
                "limit": 500,
                "weekday": 0,
                "day_of_month": 1,
                "is_valid_report_key": True,
                "last_run_at": "2026-03-06 00:00:00",
                "last_status": "sent",
                "last_summary": {"sent": 1, "queued": 0},
            }
        ],
    )

    payload = reports.get_scheduled_report_configs()

    assert payload["total"] == 1
    assert payload["items"][0]["report_key"] == "policy_list"
    assert payload["items"][0]["last_status"] == "sent"


def test_save_scheduled_report_config_calls_upsert(monkeypatch):
    monkeypatch.setattr(reports, "assert_authenticated", lambda: "Administrator")
    monkeypatch.setattr(reports, "assert_post_request", lambda *args, **kwargs: None)
    monkeypatch.setattr(reports, "assert_roles", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        reports,
        "upsert_scheduled_report_config",
        lambda index, config: {"index": 2, "config": {"report_key": "payment_status", **(config or {})}},
    )

    payload = reports.save_scheduled_report_config(index=2, config={"frequency": "weekly"})

    assert payload["ok"] is True
    assert payload["index"] == 2
    assert payload["config"]["report_key"] == "payment_status"


def test_remove_scheduled_report_config_calls_delete(monkeypatch):
    monkeypatch.setattr(reports, "assert_authenticated", lambda: "Administrator")
    monkeypatch.setattr(reports, "assert_post_request", lambda *args, **kwargs: None)
    monkeypatch.setattr(reports, "assert_roles", lambda *args, **kwargs: None)
    monkeypatch.setattr(reports, "delete_scheduled_report_config", lambda index: {"remaining": 1})

    payload = reports.remove_scheduled_report_config(index=1)

    assert payload == {"ok": True, "remaining": 1}


def test_normalize_scheduled_report_config_sanitizes_payload():
    payload = scheduled_reports.normalize_scheduled_report_config(
        {
            "enabled": 0,
            "report_key": "policy_list",
            "frequency": "monthly",
            "format": "pdf",
            "delivery_channel": "notification_outbox",
            "recipients": ["ops@example.com", " "],
            "filters": {"office_branch": "Istanbul"},
            "limit": 0,
            "day_of_month": 0,
        }
    )

    assert payload["enabled"] == 0
    assert payload["format"] == "pdf"
    assert payload["delivery_channel"] == "notification_outbox"
    assert payload["recipients"] == ["ops@example.com"]
    assert payload["limit"] == 1000
    assert payload["day_of_month"] == 1


def test_normalize_scheduled_report_config_rejects_invalid_report_key():
    with pytest.raises(Exception):
        scheduled_reports.normalize_scheduled_report_config(
            {
                "report_key": "unknown_report",
                "recipients": ["ops@example.com"],
            }
        )


def test_normalize_scheduled_report_config_requires_recipients():
    with pytest.raises(Exception):
        scheduled_reports.normalize_scheduled_report_config(
            {
                "report_key": "policy_list",
                "recipients": [],
            }
        )


def test_normalize_scheduled_report_config_rejects_invalid_delivery_channel():
    with pytest.raises(Exception):
        scheduled_reports.normalize_scheduled_report_config(
            {
                "report_key": "policy_list",
                "delivery_channel": "sms",
                "recipients": ["ops@example.com"],
            }
        )
