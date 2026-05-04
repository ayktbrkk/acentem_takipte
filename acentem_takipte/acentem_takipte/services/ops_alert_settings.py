from __future__ import annotations

import json
import os
import tempfile
from typing import Any

import frappe
from frappe import _

from acentem_takipte.acentem_takipte.services.ops_alerts import _dispatch_alerts, _resolve_environment, _resolve_site_name


OPS_ALERT_CHANNEL_KEYS = (
    "at_ops_alert_slack_webhook_url",
    "at_ops_alert_telegram_bot_token",
    "at_ops_alert_telegram_chat_id",
)


def load_ops_alert_channel_settings() -> dict[str, Any]:
    return _build_settings_payload(frappe.get_site_config() or {})


def save_ops_alert_channel_settings(config: dict[str, Any] | str | None = None) -> dict[str, Any]:
    sanitized = _sanitize_settings_payload(config)
    site_config_path = _get_site_config_path()
    site_config = _read_site_config()

    for config_key in OPS_ALERT_CHANNEL_KEYS:
        site_config[config_key] = sanitized.get(config_key, "")
        setattr(frappe.conf, config_key, site_config[config_key])

    _write_json_atomically(site_config)
    return _build_settings_payload(site_config)


def send_ops_alert_channel_test(config: dict[str, Any] | str | None = None) -> dict[str, Any]:
    current_config = dict(frappe.get_site_config() or {})
    test_config = dict(current_config)
    test_config.update(_sanitize_settings_payload(config))

    if not _has_any_channel(test_config):
        frappe.throw(_("Configure at least one alert channel before sending a test alert."))

    site_name = _resolve_site_name(test_config)
    environment = _resolve_environment(test_config)
    message = "\n".join(
        [
            "AT ops alert connection test.",
            f"Site: {site_name}",
            f"Environment: {environment}",
            "This message verifies Slack and Telegram delivery from the admin settings panel.",
        ]
    )
    channels = _dispatch_alerts(site_config=test_config, message=message)
    return {"ok": bool(channels), "channels": channels}


def _sanitize_settings_payload(config: dict[str, Any] | str | None) -> dict[str, str]:
    if isinstance(config, str):
        try:
            config = json.loads(config)
        except json.JSONDecodeError as exc:
            frappe.throw(_("Alert channel settings payload must be a JSON object."), exc=exc)
    if config is None:
        config = {}
    if not isinstance(config, dict):
        frappe.throw(_("Alert channel settings payload must be a JSON object."))

    return {
        "at_ops_alert_slack_webhook_url": str(config.get("slack_webhook_url") or config.get("at_ops_alert_slack_webhook_url") or "").strip(),
        "at_ops_alert_telegram_bot_token": str(config.get("telegram_bot_token") or config.get("at_ops_alert_telegram_bot_token") or "").strip(),
        "at_ops_alert_telegram_chat_id": str(config.get("telegram_chat_id") or config.get("at_ops_alert_telegram_chat_id") or "").strip(),
    }


def _build_settings_payload(site_config: dict[str, Any]) -> dict[str, Any]:
    slack_webhook_url = str(site_config.get("at_ops_alert_slack_webhook_url") or "").strip()
    telegram_bot_token = str(site_config.get("at_ops_alert_telegram_bot_token") or "").strip()
    telegram_chat_id = str(site_config.get("at_ops_alert_telegram_chat_id") or "").strip()

    return {
        "slack_webhook_url": slack_webhook_url,
        "telegram_bot_token": telegram_bot_token,
        "telegram_chat_id": telegram_chat_id,
        "slack_configured": bool(slack_webhook_url),
        "telegram_configured": bool(telegram_bot_token and telegram_chat_id),
    }


def _has_any_channel(site_config: dict[str, Any]) -> bool:
    return bool(
        str(site_config.get("at_ops_alert_slack_webhook_url") or "").strip()
        or (
            str(site_config.get("at_ops_alert_telegram_bot_token") or "").strip()
            and str(site_config.get("at_ops_alert_telegram_chat_id") or "").strip()
        )
    )


def _get_site_config_path() -> str:
    site_config_path = os.path.abspath(frappe.get_site_path("site_config.json"))
    if os.path.basename(site_config_path) != "site_config.json":
        raise RuntimeError("Unexpected site config path.")
    return site_config_path


def _read_site_config() -> dict[str, Any]:
    path = _get_site_config_path()
    try:
        with open(path, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
            return payload if isinstance(payload, dict) else {}
    except Exception:
        return {}


def _write_json_atomically(payload: dict[str, Any]) -> None:
    path = _get_site_config_path()
    directory = os.path.dirname(path) or "."
    file_descriptor, temp_path = tempfile.mkstemp(
        dir=directory,
        prefix=".site_config.",
        suffix=".tmp",
        text=True,
    )
    try:
        with os.fdopen(file_descriptor, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2, sort_keys=True, ensure_ascii=False)
            handle.write("\n")
        os.replace(temp_path, path)
    except Exception:
        try:
            os.remove(temp_path)
        except FileNotFoundError:
            pass
        raise