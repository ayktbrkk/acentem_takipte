from __future__ import annotations

from hashlib import sha1
from typing import Any

import frappe
from frappe.integrations.utils import make_post_request
from frappe.utils import add_to_date, get_url, now_datetime


ALERT_CACHE_KEY = "at:ops-alerts:last-error-log-fingerprint"
DEFAULT_BREAK_GLASS_KEYWORDS = (
    "break-glass",
    "break glass",
    "emergency access",
    "at break glass request",
)
DEFAULT_INTEGRATION_KEYWORDS = (
    "integration",
    "webhook",
    "whatsapp",
    "telegram",
    "slack",
    "sentry",
    "meta",
    "provider router",
)


def run_error_log_alert_monitor() -> dict[str, Any]:
    site_config = frappe.get_site_config()
    window_minutes = int(site_config.get("at_ops_alert_error_log_window_minutes", 60) or 60)
    keywords = _coerce_keywords(site_config.get("at_ops_alert_error_log_keywords"))
    rows = _get_recent_matching_error_logs(window_minutes=window_minutes, keywords=keywords)
    fingerprint = _build_fingerprint(rows)
    last_fingerprint = frappe.cache().get_value(ALERT_CACHE_KEY)

    summary: dict[str, Any] = {
        "window_minutes": window_minutes,
        "keywords": keywords,
        "matched": len(rows),
        "alerted": False,
        "channels": [],
    }

    if not rows or fingerprint == last_fingerprint:
        return summary

    message = _build_alert_message(rows=rows, window_minutes=window_minutes, site_config=site_config)
    channels = _dispatch_alerts(site_config=site_config, message=message)
    if channels:
        frappe.cache().set_value(ALERT_CACHE_KEY, fingerprint)
        summary["alerted"] = True
        summary["channels"] = channels
    return summary


def preview_error_log_alert_monitor(window_minutes: int | None = None) -> dict[str, Any]:
    site_config = frappe.get_site_config()
    resolved_window = int(window_minutes or site_config.get("at_ops_alert_error_log_window_minutes", 60) or 60)
    keywords = _coerce_keywords(site_config.get("at_ops_alert_error_log_keywords"))
    rows = _get_recent_matching_error_logs(window_minutes=resolved_window, keywords=keywords)
    return {
        "window_minutes": resolved_window,
        "keywords": keywords,
        "matched": len(rows),
        "alerted": False,
        "channels": [],
        "rows": rows,
        "message": _build_alert_message(rows=rows, window_minutes=resolved_window, site_config=site_config)
        if rows
        else "",
    }


def _coerce_keywords(raw_keywords: Any) -> list[str]:
    if isinstance(raw_keywords, (list, tuple, set)):
        values = [str(item).strip().lower() for item in raw_keywords if str(item).strip()]
        return values or _default_keywords()
    raw_value = str(raw_keywords or "").strip()
    if not raw_value:
        return _default_keywords()
    return [part.strip().lower() for part in raw_value.split(",") if part.strip()]


def _default_keywords() -> list[str]:
    return [*DEFAULT_BREAK_GLASS_KEYWORDS, *DEFAULT_INTEGRATION_KEYWORDS]


def _get_recent_matching_error_logs(*, window_minutes: int, keywords: list[str]) -> list[dict[str, Any]]:
    since = add_to_date(now_datetime(), minutes=-max(int(window_minutes), 1), as_datetime=True)
    rows = frappe.get_all(
        "Error Log",
        filters={"creation": [">=", since]},
        fields=["name", "method", "error", "creation"],
        order_by="creation desc",
        limit_page_length=20,
    )
    matched: list[dict[str, Any]] = []
    for row in rows:
        title = str(getattr(row, "method", "") or "").strip()
        message = str(getattr(row, "error", "") or "").strip()
        haystack = f"{title}\n{message}".lower()
        if _matches_alert_scope(haystack=haystack, keywords=keywords):
            matched.append(
                {
                    "name": str(getattr(row, "name", "") or "").strip(),
                    "title": title,
                    "creation": str(getattr(row, "creation", "") or "").strip(),
                    "excerpt": _excerpt(message),
                    "link": _build_error_log_link(str(getattr(row, "name", "") or "").strip()),
                }
            )
    return _group_incident_rows(matched)


def _group_incident_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    order: list[str] = []

    for row in rows:
        group_key = str(row.get("title") or row.get("name") or "").strip()
        if not group_key:
            continue

        existing = grouped.get(group_key)
        if not existing:
            grouped[group_key] = {
                **row,
                "count": 1,
                "log_names": [row.get("name")],
            }
            order.append(group_key)
            continue

        existing["count"] = int(existing.get("count") or 1) + 1
        existing.setdefault("log_names", []).append(row.get("name"))

        current_creation = str(row.get("creation") or "")
        existing_creation = str(existing.get("creation") or "")
        if current_creation > existing_creation:
            existing["creation"] = current_creation
            existing["name"] = row.get("name")
            existing["link"] = row.get("link")

        current_excerpt = str(row.get("excerpt") or "")
        existing_excerpt = str(existing.get("excerpt") or "")
        if len(current_excerpt) > len(existing_excerpt):
            existing["excerpt"] = current_excerpt

    return [grouped[key] for key in order]


def _matches_alert_scope(*, haystack: str, keywords: list[str]) -> bool:
    normalized_keywords = [str(keyword).strip().lower() for keyword in keywords if str(keyword).strip()]
    if not normalized_keywords:
        normalized_keywords = _default_keywords()

    break_glass_keywords = [
        keyword for keyword in normalized_keywords if keyword in DEFAULT_BREAK_GLASS_KEYWORDS
    ]
    integration_keywords = [
        keyword for keyword in normalized_keywords if keyword in DEFAULT_INTEGRATION_KEYWORDS
    ]

    custom_keywords = [
        keyword
        for keyword in normalized_keywords
        if keyword not in DEFAULT_BREAK_GLASS_KEYWORDS and keyword not in DEFAULT_INTEGRATION_KEYWORDS
    ]

    return (
        any(keyword in haystack for keyword in break_glass_keywords)
        or any(keyword in haystack for keyword in integration_keywords)
        or any(keyword in haystack for keyword in custom_keywords)
    )


def _excerpt(message: str, limit: int = 220) -> str:
    compact = " ".join(str(message or "").split())
    if len(compact) <= limit:
        return compact
    return compact[: limit - 3].rstrip() + "..."


def _build_fingerprint(rows: list[dict[str, Any]]) -> str:
    raw = "|".join(f"{row.get('name')}:{row.get('creation')}" for row in rows)
    return sha1(raw.encode("utf-8")).hexdigest() if raw else ""


def _build_alert_message(*, rows: list[dict[str, Any]], window_minutes: int, site_config: dict[str, Any] | None = None) -> str:
    site_name = _resolve_site_name(site_config)
    environment = _resolve_environment(site_config)
    lines = [
        f"AT ops alert: {len(rows)} critical Error Log entries in the last {window_minutes} minutes.",
        f"Site: {site_name}",
        f"Environment: {environment}",
    ]
    for row in rows[:5]:
        title = row.get("title") or "Error Log"
        link = row.get("link") or "-"
        count = int(row.get("count") or 1)
        count_label = f" | Duplicates: {count}" if count > 1 else ""
        lines.append(
            f"- {title} | {row.get('creation')} | {row.get('excerpt')} | Log: {row.get('name')} | Link: {link}{count_label}"
        )
    return "\n".join(lines)


def _resolve_site_name(site_config: dict[str, Any] | None = None) -> str:
    local_site = str(getattr(getattr(frappe, "local", None), "site", "") or "").strip()
    if local_site:
        return local_site
    configured_site = str((site_config or {}).get("host_name") or "").strip()
    return configured_site or "unknown-site"


def _resolve_environment(site_config: dict[str, Any] | None = None) -> str:
    value = str((site_config or {}).get("sentry_environment") or (site_config or {}).get("environment") or "production").strip()
    return value or "production"


def _build_error_log_link(error_log_name: str) -> str:
    if not error_log_name:
        return ""
    return get_url(f"/app/error-log/{error_log_name}")


def _dispatch_alerts(*, site_config: dict[str, Any], message: str) -> list[str]:
    channels: list[str] = []
    slack_webhook = str(site_config.get("at_ops_alert_slack_webhook_url") or "").strip()
    telegram_bot_token = str(site_config.get("at_ops_alert_telegram_bot_token") or "").strip()
    telegram_chat_id = str(site_config.get("at_ops_alert_telegram_chat_id") or "").strip()

    if slack_webhook:
        make_post_request(slack_webhook, json={"text": message})
        channels.append("slack")

    if telegram_bot_token and telegram_chat_id:
        telegram_url = f"https://api.telegram.org/bot{telegram_bot_token}/sendMessage"
        make_post_request(telegram_url, data={"chat_id": telegram_chat_id, "text": message})
        channels.append("telegram")

    return channels