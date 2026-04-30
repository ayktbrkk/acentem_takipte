from __future__ import annotations

import json
from types import SimpleNamespace

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
            "format": "application/pdf",
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


def test_load_scheduled_report_configs_returns_empty_list_for_invalid_json(monkeypatch):
    monkeypatch.setattr(
        scheduled_reports.frappe,
        "get_site_config",
        lambda: {"at_scheduled_reports": "{invalid-json"},
    )
    calls = []
    monkeypatch.setattr(
        scheduled_reports,
        "log_redacted_error",
        lambda *args, **kwargs: calls.append((args, kwargs)),
    )

    payload = scheduled_reports.load_scheduled_report_configs()

    assert payload == []
    assert len(calls) == 1


def test_summarize_scheduled_report_configs_normalizes_recipient_string(monkeypatch):
    monkeypatch.setattr(
        scheduled_reports,
        "load_scheduled_report_configs",
        lambda: [
            {
                "report_key": "policy_list",
                "frequency": "daily",
                "format": "xlsx",
                "recipients": "ops@example.com, finance@example.com , ",
                "filters": {"office_branch": "Istanbul"},
            }
        ],
    )

    payload = scheduled_reports.summarize_scheduled_report_configs()

    assert payload[0]["recipients"] == ["ops@example.com", "finance@example.com"]


def test_summarize_scheduled_report_configs_normalizes_format_alias(monkeypatch):
    monkeypatch.setattr(
        scheduled_reports,
        "load_scheduled_report_configs",
        lambda: [
            {
                "report_key": "policy_list",
                "frequency": "daily",
                "format": "xlsb",
                "recipients": ["ops@example.com"],
            }
        ],
    )

    payload = scheduled_reports.summarize_scheduled_report_configs()

    assert payload[0]["format"] == "xlsx"


def test_normalize_scheduled_report_config_accepts_recipient_string_and_deduplicates():
    payload = scheduled_reports.normalize_scheduled_report_config(
        {
            "report_key": "policy_list",
            "recipients": " a@example.com, b@example.com, a@example.com ",
        }
    )

    assert payload["recipients"] == ["a@example.com", "b@example.com"]


def test_normalize_scheduled_report_config_accepts_json_filter_string():
    payload = scheduled_reports.normalize_scheduled_report_config(
        {
            "report_key": "policy_list",
            "recipients": ["ops@example.com"],
            "filters": '{"office_branch":"Istanbul"}',
        }
    )

    assert payload["filters"] == {"office_branch": "Istanbul"}


def test_normalize_scheduled_report_config_clamps_schedule_fields():
    payload = scheduled_reports.normalize_scheduled_report_config(
        {
            "report_key": "policy_list",
            "recipients": ["ops@example.com"],
            "weekday": 99,
            "day_of_month": 0,
        }
    )

    assert payload["weekday"] == 6
    assert payload["day_of_month"] == 1


def test_summarize_scheduled_report_configs_normalizes_frequency_and_delivery(monkeypatch):
    monkeypatch.setattr(
        scheduled_reports,
        "load_scheduled_report_configs",
        lambda: [
            {
                "report_key": "policy_list",
                "frequency": " yearly ",
                "delivery_channel": " sms ",
                "recipients": "ops@example.com",
                "filters": '{"office_branch":"Istanbul"}',
            }
        ],
    )

    payload = scheduled_reports.summarize_scheduled_report_configs()

    assert payload[0]["frequency"] == "daily"
    assert payload[0]["delivery_channel"] == "email"
    assert payload[0]["recipients"] == ["ops@example.com"]
    assert payload[0]["filters"] == {"office_branch": "Istanbul"}


def test_load_scheduled_report_configs_trims_report_key(monkeypatch):
    monkeypatch.setattr(
        scheduled_reports.frappe,
        "get_site_config",
        lambda: {"at_scheduled_reports": [{"report_key": " policy_list "}]} ,
    )

    payload = scheduled_reports.load_scheduled_report_configs()

    assert payload == [{"report_key": "policy_list"}]


def test_summarize_scheduled_report_configs_includes_normalized_locale_and_status(monkeypatch):
    monkeypatch.setattr(
        scheduled_reports,
        "load_scheduled_report_configs",
        lambda: [
            {
                "report_key": "policy_list",
                "recipients": ["ops@example.com"],
                "locale": " tr-TR ",
                "last_status": " SENT ",
                "last_summary": '{"sent":1}',
            }
        ],
    )

    payload = scheduled_reports.summarize_scheduled_report_configs()

    assert payload[0]["locale"] == "tr-TR"
    assert payload[0]["last_status"] == "sent"
    assert payload[0]["last_summary"] == {"sent": 1}


def test_normalize_scheduled_report_config_persists_locale_and_last_status():
    payload = scheduled_reports.normalize_scheduled_report_config(
        {
            "report_key": "policy_list",
            "recipients": ["ops@example.com"],
            "locale": " en-US ",
            "last_status": " QUEUED ",
            "last_summary": '{"queued":1}',
        }
    )

    assert payload["locale"] == "en-US"
    assert payload["last_status"] == "queued"
    assert payload["last_summary"] == {"queued": 1}


def test_load_scheduled_report_configs_sanitizes_runtime_fields(monkeypatch):
    monkeypatch.setattr(
        scheduled_reports.frappe,
        "get_site_config",
        lambda: {
            "at_scheduled_reports": [
                {
                    "enabled": 0,
                    "report_key": " policy_list ",
                    "frequency": " yearly ",
                    "format": " application/pdf ",
                    "delivery_channel": " sms ",
                    "locale": " en-US ",
                    "recipients": " a@example.com, a@example.com, b@example.com ",
                    "filters": '{"office_branch":"Istanbul"}',
                    "limit": 0,
                    "weekday": 99,
                    "day_of_month": 0,
                    "last_status": " SENT ",
                    "last_summary": '{"sent":1}',
                }
            ]
        },
    )

    payload = scheduled_reports.load_scheduled_report_configs()

    assert payload[0]["enabled"] == 0
    assert payload[0]["report_key"] == "policy_list"
    assert payload[0]["frequency"] == "daily"
    assert payload[0]["format"] == "pdf"
    assert payload[0]["delivery_channel"] == "email"
    assert payload[0]["locale"] == "en-US"
    assert payload[0]["recipients"] == ["a@example.com", "b@example.com"]
    assert payload[0]["filters"] == {"office_branch": "Istanbul"}
    assert payload[0]["limit"] == 1000
    assert payload[0]["weekday"] == 6
    assert payload[0]["day_of_month"] == 1
    assert payload[0]["last_status"] == "sent"
    assert payload[0]["last_summary"] == {"sent": 1}


def test_save_scheduled_report_configs_writes_site_config_atomically(monkeypatch, tmp_path):
    site_config_path = tmp_path / "site_config.json"
    site_config_path.write_text(
        json.dumps({"db_name": "at_localhost", "existing": 1}, ensure_ascii=False),
        encoding="utf-8",
    )

    monkeypatch.setattr(scheduled_reports.frappe, "get_site_path", lambda *parts: str(site_config_path))
    monkeypatch.setattr(scheduled_reports.frappe, "conf", SimpleNamespace())

    scheduled_reports.save_scheduled_report_configs(
        [
            {
                "report_key": "policy_list",
                "recipients": ["ops@example.com"],
            }
        ]
    )

    payload = json.loads(site_config_path.read_text(encoding="utf-8"))

    assert payload["db_name"] == "at_localhost"
    assert payload["existing"] == 1
    saved_config = payload["at_scheduled_reports"][0]
    assert saved_config["report_key"] == "policy_list"
    assert saved_config["recipients"] == ["ops@example.com"]
    assert saved_config["delivery_channel"] == "email"
    assert saved_config["format"] == "xlsx"
    assert list(tmp_path.glob(".site_config.*.tmp")) == []

