from __future__ import annotations

import json
import os
import re
import tempfile
from typing import Any

import frappe
from frappe import _

from acentem_takipte.acentem_takipte.domains.admin.services.alerts import _dispatch_alerts, _resolve_environment, _resolve_site_name


OPS_ALERT_CHANNEL_KEYS = (
    "at_ops_alert_slack_webhook_url",
    "at_ops_alert_telegram_bot_token",
    "at_ops_alert_telegram_chat_id",
)

_SLACK_WEBHOOK_RE = re.compile(r"^https://hooks\.slack\.com/services/[^/\s]+/[^/\s]+/[^\s]+$")
_TELEGRAM_BOT_TOKEN_RE = re.compile(r"^\d+:[A-Za-z0-9_-]{20,}$")
_TELEGRAM_CHAT_ID_RE = re.compile(r"^-?\d+$")


def load_ops_alert_channel_settings() -> dict[str, Any]:
    return _build_settings_payload(frappe.get_site_config() or {})


def save_ops_alert_channel_settings(config: dict[str, Any] | str | None = None) -> dict[str, Any]:
    site_config_path = _get_site_config_path()
    site_config = _read_site_config()
    sanitized = _sanitize_settings_payload(config, current_config=site_config)

    changed_keys = []
    for config_key in OPS_ALERT_CHANNEL_KEYS:
        old_value = str(site_config.get(config_key) or "")
        new_value = str(sanitized.get(config_key) or "")
        if old_value != new_value:
            changed_keys.append(config_key)
        site_config[config_key] = sanitized.get(config_key, "")
        setattr(frappe.conf, config_key, site_config[config_key])

    _write_json_atomically(site_config)

    if changed_keys:
        _log_alert_channels_changed(changed_keys)

    return _build_settings_payload(site_config)


def send_ops_alert_channel_test(config: dict[str, Any] | str | None = None) -> dict[str, Any]:
    current_config = dict(frappe.get_site_config() or {})
    test_config = dict(current_config)
    test_config.update(_sanitize_settings_payload(config, current_config=current_config))

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


def _sanitize_settings_payload(
    config: dict[str, Any] | str | None,
    *,
    current_config: dict[str, Any] | None = None,
) -> dict[str, str]:
    if isinstance(config, str):
        try:
            config = json.loads(config)
        except json.JSONDecodeError as exc:
            frappe.throw(_("Alert channel settings payload must be a JSON object."), exc=exc)
    if config is None:
        config = {}
    if not isinstance(config, dict):
        frappe.throw(_("Alert channel settings payload must be a JSON object."))

    current_config = current_config or {}
    slack_webhook_url = _coerce_secret_config_value(
        config,
        public_key="slack_webhook_url",
        config_key="at_ops_alert_slack_webhook_url",
        clear_key="clear_slack_webhook_url",
        current_config=current_config,
    )
    telegram_bot_token = _coerce_secret_config_value(
        config,
        public_key="telegram_bot_token",
        config_key="at_ops_alert_telegram_bot_token",
        clear_key="clear_telegram_bot_token",
        current_config=current_config,
    )
    telegram_chat_id = str(config.get("telegram_chat_id") or config.get("at_ops_alert_telegram_chat_id") or "").strip()

    _validate_new_secret_values(
        slack_webhook_url=slack_webhook_url,
        telegram_bot_token=telegram_bot_token,
        telegram_chat_id=telegram_chat_id,
        current_config=current_config,
    )

    return {
        "at_ops_alert_slack_webhook_url": slack_webhook_url,
        "at_ops_alert_telegram_bot_token": telegram_bot_token,
        "at_ops_alert_telegram_chat_id": telegram_chat_id,
    }


def _validate_new_secret_values(
    *,
    slack_webhook_url: str,
    telegram_bot_token: str,
    telegram_chat_id: str,
    current_config: dict[str, Any],
) -> None:
    if slack_webhook_url and slack_webhook_url != str(current_config.get("at_ops_alert_slack_webhook_url") or "").strip():
        if not _SLACK_WEBHOOK_RE.match(slack_webhook_url):
            frappe.throw(
                _("Slack webhook URL must be a valid hooks.slack.com/services/ URL.")
            )

    if telegram_bot_token and telegram_bot_token != str(current_config.get("at_ops_alert_telegram_bot_token") or "").strip():
        if not _TELEGRAM_BOT_TOKEN_RE.match(telegram_bot_token):
            frappe.throw(
                _("Telegram bot token must be a valid bot token (digits followed by a secret).")
            )

    if telegram_chat_id and telegram_chat_id != str(current_config.get("at_ops_alert_telegram_chat_id") or "").strip():
        if not _TELEGRAM_CHAT_ID_RE.match(telegram_chat_id):
            frappe.throw(
                _("Telegram chat id must be numeric.")
            )


def _coerce_secret_config_value(
    config: dict[str, Any],
    *,
    public_key: str,
    config_key: str,
    clear_key: str,
    current_config: dict[str, Any],
) -> str:
    if config.get(clear_key):
        return ""
    raw_value = config.get(public_key)
    if raw_value is None:
        raw_value = config.get(config_key)
    value = str(raw_value or "").strip()
    if value:
        return value
    return str(current_config.get(config_key) or "").strip()


def _mask_secret(value: Any) -> str:
    secret = str(value or "").strip()
    if not secret:
        return ""
    return f"****{secret[-4:]}"


def _build_settings_payload(site_config: dict[str, Any]) -> dict[str, Any]:
    slack_webhook_url = str(site_config.get("at_ops_alert_slack_webhook_url") or "").strip()
    telegram_bot_token = str(site_config.get("at_ops_alert_telegram_bot_token") or "").strip()
    telegram_chat_id = str(site_config.get("at_ops_alert_telegram_chat_id") or "").strip()

    return {
        "slack_webhook_url": "",
        "telegram_bot_token": "",
        "telegram_chat_id": telegram_chat_id,
        "slack_configured": bool(slack_webhook_url),
        "telegram_configured": bool(telegram_bot_token and telegram_chat_id),
        "slack_webhook_mask": _mask_secret(slack_webhook_url),
        "telegram_bot_token_mask": _mask_secret(telegram_bot_token),
    }


def _log_alert_channels_changed(changed_keys: list[str]) -> None:
    try:
        from acentem_takipte.acentem_takipte.doctype.at_access_log.at_access_log import log_decision_event

        safe_summary = []
        if "at_ops_alert_slack_webhook_url" in changed_keys:
            safe_summary.append("slack_webhook_changed")
        if "at_ops_alert_telegram_bot_token" in changed_keys:
            safe_summary.append("telegram_bot_token_changed")
        if "at_ops_alert_telegram_chat_id" in changed_keys:
            safe_summary.append("telegram_chat_id_changed")

        log_decision_event(
            "Alert Channels",
            "site_config",
            action="Save",
            action_summary=f"Alert channels updated by {frappe.session.user}: {', '.join(safe_summary)}",
        )
    except Exception:
        pass


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
