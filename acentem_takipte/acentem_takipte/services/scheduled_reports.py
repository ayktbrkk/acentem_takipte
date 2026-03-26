from __future__ import annotations

import json
from typing import Any

import frappe
from frappe.utils import cint, getdate, nowdate

from acentem_takipte.acentem_takipte.communication import enqueue_notification_draft
from acentem_takipte.acentem_takipte.services.export_payload_utils import (
    coerce_export_format,
    coerce_filters,
    coerce_string_list,
)
from acentem_takipte.acentem_takipte.services.report_exports import (
    build_report_filename,
    build_report_title,
    render_report_pdf,
    render_report_xlsx,
)
from acentem_takipte.acentem_takipte.services.report_registry import (
    REPORT_DEFINITIONS,
    build_report_payload,
)
from acentem_takipte.acentem_takipte.utils.logging import log_redacted_error
from acentem_takipte.acentem_takipte.utils.metrics import build_metric_event


def load_scheduled_report_configs() -> list[dict[str, Any]]:
    raw = frappe.get_site_config().get("at_scheduled_reports") or []
    if isinstance(raw, str):
        try:
            raw = frappe.parse_json(raw) or []
        except Exception:
            log_redacted_error(
                "Scheduled Report Config Parse Error",
                details={"config_key": "at_scheduled_reports"},
            )
            raw = []
    if not isinstance(raw, list):
        return []
    configs: list[dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        normalized = _sanitize_schedule_config(item)
        if not normalized.get("report_key"):
            continue
        configs.append(normalized)
    return configs


def save_scheduled_report_configs(configs: list[dict[str, Any]]) -> None:
    sanitized: list[dict[str, Any]] = []
    for item in configs:
        if not isinstance(item, dict):
            continue
        normalized = _sanitize_schedule_config(item)
        if not normalized.get("report_key"):
            continue
        sanitized.append(normalized)
    frappe.conf.at_scheduled_reports = sanitized
    site_config_path = frappe.get_site_path("site_config.json")
    try:
        with open(site_config_path, "r", encoding="utf-8") as handle:
            site_config = json.load(handle)
    except Exception:
        site_config = {}
    site_config["at_scheduled_reports"] = sanitized
    with open(site_config_path, "w", encoding="utf-8") as handle:
        json.dump(site_config, handle, indent=2, sort_keys=True, ensure_ascii=False)
        handle.write("\n")


def summarize_scheduled_report_configs() -> list[dict[str, Any]]:
    summaries: list[dict[str, Any]] = []
    for index, config in enumerate(load_scheduled_report_configs(), start=1):
        report_key = str(config.get("report_key") or "").strip()
        summaries.append(
            {
                "index": index,
                "enabled": bool(cint(config.get("enabled", 1))),
                "report_key": report_key,
                "frequency": _normalize_frequency(config.get("frequency")),
                "format": _normalize_export_format(config.get("format")),
                "delivery_channel": _normalize_delivery_channel(
                    config.get("delivery_channel")
                ),
                "locale": _normalize_locale(config.get("locale")),
                "recipients": _normalize_recipients(config.get("recipients")),
                "filters": _coerce_filters(config.get("filters")),
                "limit": max(cint(config.get("limit")) or 1000, 1),
                "weekday": _normalize_weekday(config.get("weekday")),
                "day_of_month": _normalize_day_of_month(config.get("day_of_month")),
                "is_valid_report_key": report_key in REPORT_DEFINITIONS,
                "last_run_at": config.get("last_run_at"),
                "last_status": _normalize_last_status(config.get("last_status")),
                "last_summary": _coerce_summary(config.get("last_summary")),
            }
        )
    return summaries


def normalize_scheduled_report_config(payload: dict[str, Any]) -> dict[str, Any]:
    report_key = str(payload.get("report_key") or "").strip()
    if report_key not in REPORT_DEFINITIONS:
        frappe.throw("Invalid scheduled report key.")

    frequency = _normalize_frequency(payload.get("frequency"))
    if frequency not in {"daily", "weekly", "monthly"}:
        frappe.throw("Invalid scheduled report frequency.")

    delivery_channel = _normalize_delivery_channel(payload.get("delivery_channel"))
    if delivery_channel not in {"email", "notification_outbox"}:
        frappe.throw("Invalid scheduled report delivery channel.")

    recipients = _normalize_recipients(payload.get("recipients"))
    if not recipients:
        frappe.throw("At least one scheduled report recipient is required.")

    return {
        "enabled": 1 if cint(payload.get("enabled", 1)) else 0,
        "report_key": report_key,
        "frequency": frequency,
        "format": _normalize_export_format(payload.get("format")),
        "delivery_channel": delivery_channel,
        "locale": _normalize_locale(payload.get("locale")),
        "recipients": recipients,
        "filters": _coerce_filters(payload.get("filters")),
        "limit": max(cint(payload.get("limit")) or 1000, 1),
        "weekday": _normalize_weekday(payload.get("weekday")),
        "day_of_month": _normalize_day_of_month(payload.get("day_of_month")),
        "last_run_at": payload.get("last_run_at"),
        "last_status": _normalize_last_status(payload.get("last_status")),
        "last_summary": _coerce_summary(payload.get("last_summary")),
    }


def upsert_scheduled_report_config(
    index: int | None, payload: dict[str, Any]
) -> dict[str, Any]:
    config = normalize_scheduled_report_config(payload)
    configs = load_scheduled_report_configs()
    target_index = cint(index) - 1 if index else -1

    if 0 <= target_index < len(configs):
        configs[target_index] = config
        saved_index = target_index + 1
    else:
        configs.append(config)
        saved_index = len(configs)

    save_scheduled_report_configs(configs)
    return {"index": saved_index, "config": config}


def delete_scheduled_report_config(index: int) -> dict[str, int]:
    configs = load_scheduled_report_configs()
    target_index = cint(index) - 1
    if 0 <= target_index < len(configs):
        configs.pop(target_index)
        save_scheduled_report_configs(configs)
    return {"remaining": len(configs)}


def is_schedule_due(
    config: dict[str, Any], business_date=None, frequency: str | None = None
) -> bool:
    schedule = _normalize_frequency(config.get("frequency"))
    if frequency and schedule != _normalize_frequency(frequency):
        return False

    current_date = getdate(business_date or nowdate())
    if schedule == "daily":
        return True
    if schedule == "weekly":
        target_weekday = _normalize_weekday(config.get("weekday"))
        return current_date.weekday() == target_weekday
    if schedule == "monthly":
        target_day = _normalize_day_of_month(config.get("day_of_month"))
        return current_date.day == target_day
    return False


def dispatch_scheduled_reports(
    *, frequency: str | None = None, limit: int = 10, business_date=None
) -> dict[str, Any]:
    configs = load_scheduled_report_configs()[: max(cint(limit), 1)]
    current_date = getdate(business_date or nowdate())

    scanned = len(configs)
    sent = 0
    queued = 0
    queue_failed = 0
    skipped_disabled = 0
    skipped_not_due = 0
    skipped_invalid = 0
    queued_outboxes: list[str] = []

    changed = False

    for config in configs:
        if not cint(config.get("enabled", 1)):
            skipped_disabled += 1
            continue
        if not is_schedule_due(config, business_date=current_date, frequency=frequency):
            skipped_not_due += 1
            continue

        report_key = str(config.get("report_key") or "").strip()
        recipients = _normalize_recipients(config.get("recipients"))
        if report_key not in REPORT_DEFINITIONS or not recipients:
            skipped_invalid += 1
            _update_config_run_metadata(
                config,
                status="invalid",
                summary={
                    "sent": 0,
                    "queued": 0,
                    "reason": "invalid_report_or_recipient",
                },
                business_date=current_date,
            )
            changed = True
            continue

        filters = _coerce_filters(config.get("filters"))
        export_format = _normalize_export_format(config.get("format"))
        delivery_channel = _normalize_delivery_channel(config.get("delivery_channel"))
        payload = build_report_payload(
            report_key, filters=filters, limit=max(cint(config.get("limit")) or 1000, 1)
        )

        if export_format == "pdf":
            content = render_report_pdf(
                report_key=report_key,
                columns=payload["columns"],
                rows=payload["rows"],
                filters=payload["filters"],
                locale=_normalize_locale(config.get("locale")),
            )
        else:
            export_format = "xlsx"
            content = render_report_xlsx(
                report_key=report_key,
                columns=payload["columns"],
                rows=payload["rows"],
                filters=payload["filters"],
                locale=_normalize_locale(config.get("locale")),
            )

        filename = build_report_filename(report_key, export_format)
        report_title = build_report_title(
            report_key, _normalize_locale(config.get("locale"))
        )
        if delivery_channel == "notification_outbox":
            queue_result = _queue_scheduled_report_delivery(
                report_key=report_key,
                report_title=report_title,
                recipients=recipients,
                filters=payload["filters"],
                filename=filename,
                content=content,
                business_date=current_date,
            )
            queued += queue_result["queued"]
            queue_failed += queue_result["failed"]
            queued_outboxes.extend(queue_result["outboxes"])
            _update_config_run_metadata(
                config,
                status="queued" if queue_result["queued"] else "failed",
                summary={
                    "sent": 0,
                    "queued": queue_result["queued"],
                    "failed": queue_result["failed"],
                    "delivery_channel": delivery_channel,
                },
                business_date=current_date,
            )
            changed = True
            continue

        frappe.sendmail(
            recipients=recipients,
            subject=f"{report_title} - {current_date.isoformat()}",
            message=f"{report_title} ektedir.",
            attachments=[{"fname": filename, "fcontent": content}],
            delayed=False,
        )
        sent += 1
        _update_config_run_metadata(
            config,
            status="sent",
            summary={"sent": 1, "queued": 0, "delivery_channel": delivery_channel},
            business_date=current_date,
        )
        changed = True

    if changed:
        save_scheduled_report_configs(configs)

    summary = {
        "scanned": scanned,
        "sent": sent,
        "queued": queued,
        "queue_failed": queue_failed,
        "skipped_disabled": skipped_disabled,
        "skipped_not_due": skipped_not_due,
        "skipped_invalid": skipped_invalid,
        "outboxes": queued_outboxes,
    }
    metric_values = {key: value for key, value in summary.items() if key != "outboxes"}
    frappe.logger("acentem_takipte").info(
        "AT scheduled reports summary: %s",
        build_metric_event(
            "reports.scheduled_job",
            dimensions={"component": "reports", "frequency": str(frequency or "all")},
            values=metric_values,
        ),
    )
    return summary


def _update_config_run_metadata(
    config: dict[str, Any],
    *,
    status: str,
    summary: dict[str, Any],
    business_date,
) -> None:
    config["last_run_at"] = f"{business_date.isoformat()} 00:00:00"
    config["last_status"] = _normalize_last_status(status) or "unknown"
    config["last_summary"] = summary


def _queue_scheduled_report_delivery(
    *,
    report_key: str,
    report_title: str,
    recipients: list[str],
    filters: dict[str, Any],
    filename: str,
    content: bytes,
    business_date,
) -> dict[str, Any]:
    template_name = _ensure_scheduled_report_template()
    office_branch = str(filters.get("office_branch") or "").strip() or None
    queued = 0
    failed = 0
    outboxes: list[str] = []

    for recipient in recipients:
        try:
            draft = frappe.get_doc(
                {
                    "doctype": "AT Notification Draft",
                    "template": template_name,
                    "event_key": "scheduled_report_delivery",
                    "channel": "Email",
                    "language": "tr",
                    "recipient": recipient,
                    "office_branch": office_branch,
                    "subject": f"{report_title} - {business_date.isoformat()}",
                    "body": f"{report_title} ektedir.",
                    "status": "Draft",
                }
            )
            # ignore_permissions: Scheduled report generation; runs from scheduler job.
            draft.insert(ignore_permissions=True)
            queued_result = enqueue_notification_draft(draft.name)
            outbox_name = queued_result.get("outbox")
            if not outbox_name:
                failed += 1
                continue
            file_doc = frappe.get_doc(
                {
                    "doctype": "File",
                    "file_name": filename,
                    "attached_to_doctype": "AT Notification Outbox",
                    "attached_to_name": outbox_name,
                    "is_private": 1,
                    "content": content,
                    "decode": False,
                }
            )
            # ignore_permissions: Scheduled report generation; runs from scheduler job.
            file_doc.insert(ignore_permissions=True)
            outboxes.append(outbox_name)
            queued += 1
        except Exception:
            failed += 1
            log_redacted_error(
                "Scheduled Report Outbox Queue Error",
                details={
                    "report_key": report_key,
                    "recipient": recipient,
                    "office_branch": office_branch,
                    "filename": filename,
                },
            )

    return {"queued": queued, "failed": failed, "outboxes": outboxes}


def _ensure_scheduled_report_template() -> str:
    template_key = "scheduled_report_delivery"
    if frappe.db.exists("AT Notification Template", template_key):
        return template_key

    doc = frappe.get_doc(
        {
            "doctype": "AT Notification Template",
            "template_key": template_key,
            "event_key": "scheduled_report_delivery",
            "channel": "Email",
            "content_mode": "freeform",
            "language": "tr",
            "subject": "Zamanlanmis Rapor",
            "body_template": "{{ subject or 'Zamanlanmis Rapor' }} ektedir.",
            "email_body_template": "{{ body or 'Zamanlanmis Rapor ektedir.' }}",
            "is_active": 1,
        }
    )
    # ignore_permissions: Scheduled report generation; runs from scheduler job.
    doc.insert(ignore_permissions=True)
    return template_key


def _normalize_frequency(value: Any) -> str:
    normalized = str(value or "daily").strip().lower() or "daily"
    return normalized if normalized in {"daily", "weekly", "monthly"} else "daily"


def _normalize_delivery_channel(value: Any) -> str:
    normalized = str(value or "email").strip().lower() or "email"
    return normalized if normalized in {"email", "notification_outbox"} else "email"


def _normalize_recipients(value: Any) -> list[str]:
    return coerce_string_list(value)


def _coerce_filters(value: Any) -> dict[str, Any]:
    return coerce_filters(value)


def _coerce_summary(value: Any) -> dict[str, Any]:
    if isinstance(value, str):
        if not value.strip():
            return {}
        try:
            parsed = frappe.parse_json(value) or {}
        except Exception:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    if isinstance(value, dict):
        return dict(value)
    if hasattr(value, "items"):
        return {key: val for key, val in value.items()}
    return {}


def _normalize_weekday(value: Any) -> int:
    return max(min(cint(value), 6), 0)


def _normalize_day_of_month(value: Any) -> int:
    return max(min(cint(value) or 1, 31), 1)


def _normalize_locale(value: Any) -> str:
    normalized = str(value or "tr").strip()
    return normalized or "tr"


def _normalize_export_format(value: Any) -> str:
    return coerce_export_format(value)


def _normalize_last_status(value: Any) -> str | None:
    normalized = str(value or "").strip().lower()
    return normalized or None


def _sanitize_schedule_config(value: dict[str, Any]) -> dict[str, Any]:
    return {
        "enabled": 1 if cint(value.get("enabled", 1)) else 0,
        "report_key": str(value.get("report_key") or "").strip(),
        "frequency": _normalize_frequency(value.get("frequency")),
        "format": _normalize_export_format(value.get("format")),
        "delivery_channel": _normalize_delivery_channel(value.get("delivery_channel")),
        "locale": _normalize_locale(value.get("locale")),
        "recipients": _normalize_recipients(value.get("recipients")),
        "filters": _coerce_filters(value.get("filters")),
        "limit": max(cint(value.get("limit")) or 1000, 1),
        "weekday": _normalize_weekday(value.get("weekday")),
        "day_of_month": _normalize_day_of_month(value.get("day_of_month")),
        "last_run_at": value.get("last_run_at"),
        "last_status": _normalize_last_status(value.get("last_status")),
        "last_summary": _coerce_summary(value.get("last_summary")),
    }
