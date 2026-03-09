from __future__ import annotations

import json
from typing import Any

import frappe
from frappe.utils import cint, getdate, nowdate

from acentem_takipte.acentem_takipte.communication import enqueue_notification_draft
from acentem_takipte.acentem_takipte.services.report_exports import (
    build_report_filename,
    build_report_title,
    render_report_pdf,
    render_report_xlsx,
)
from acentem_takipte.acentem_takipte.services.report_registry import REPORT_DEFINITIONS, build_report_payload
from acentem_takipte.acentem_takipte.utils.logging import log_redacted_error
from acentem_takipte.acentem_takipte.utils.metrics import build_metric_event


def load_scheduled_report_configs() -> list[dict[str, Any]]:
    raw = frappe.get_site_config().get("at_scheduled_reports") or []
    if isinstance(raw, str):
        raw = frappe.parse_json(raw) or []
    if not isinstance(raw, list):
        return []
    return [item for item in raw if isinstance(item, dict) and item.get("report_key")]


def save_scheduled_report_configs(configs: list[dict[str, Any]]) -> None:
    sanitized = [item for item in configs if isinstance(item, dict) and item.get("report_key")]
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
                "frequency": str(config.get("frequency") or "daily").strip().lower() or "daily",
                "format": str(config.get("format") or "xlsx").strip().lower() or "xlsx",
                "delivery_channel": str(config.get("delivery_channel") or "email").strip().lower() or "email",
                "recipients": [str(item).strip() for item in (config.get("recipients") or []) if str(item).strip()],
                "filters": config.get("filters") if isinstance(config.get("filters"), dict) else {},
                "limit": max(cint(config.get("limit")) or 1000, 1),
                "weekday": cint(config.get("weekday")),
                "day_of_month": max(cint(config.get("day_of_month")) or 1, 1),
                "is_valid_report_key": report_key in REPORT_DEFINITIONS,
                "last_run_at": config.get("last_run_at"),
                "last_status": str(config.get("last_status") or "").strip().lower() or None,
                "last_summary": config.get("last_summary") if isinstance(config.get("last_summary"), dict) else {},
            }
        )
    return summaries


def normalize_scheduled_report_config(payload: dict[str, Any]) -> dict[str, Any]:
    report_key = str(payload.get("report_key") or "").strip()
    if report_key not in REPORT_DEFINITIONS:
        frappe.throw("Invalid scheduled report key.")

    frequency = str(payload.get("frequency") or "daily").strip().lower() or "daily"
    if frequency not in {"daily", "weekly", "monthly"}:
        frappe.throw("Invalid scheduled report frequency.")

    delivery_channel = str(payload.get("delivery_channel") or "email").strip().lower() or "email"
    if delivery_channel not in {"email", "notification_outbox"}:
        frappe.throw("Invalid scheduled report delivery channel.")

    recipients = [str(item).strip() for item in (payload.get("recipients") or []) if str(item).strip()]
    if not recipients:
        frappe.throw("At least one scheduled report recipient is required.")

    return {
        "enabled": 1 if cint(payload.get("enabled", 1)) else 0,
        "report_key": report_key,
        "frequency": frequency,
        "format": "pdf" if str(payload.get("format") or "").strip().lower() == "pdf" else "xlsx",
        "delivery_channel": delivery_channel,
        "recipients": recipients,
        "filters": payload.get("filters") if isinstance(payload.get("filters"), dict) else {},
        "limit": max(cint(payload.get("limit")) or 1000, 1),
        "weekday": cint(payload.get("weekday")),
        "day_of_month": max(cint(payload.get("day_of_month")) or 1, 1),
        "last_run_at": payload.get("last_run_at"),
        "last_status": payload.get("last_status"),
        "last_summary": payload.get("last_summary") if isinstance(payload.get("last_summary"), dict) else {},
    }


def upsert_scheduled_report_config(index: int | None, payload: dict[str, Any]) -> dict[str, Any]:
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


def is_schedule_due(config: dict[str, Any], business_date=None, frequency: str | None = None) -> bool:
    schedule = str(config.get("frequency") or "daily").strip().lower()
    if frequency and schedule != str(frequency).strip().lower():
        return False

    current_date = getdate(business_date or nowdate())
    if schedule == "daily":
        return True
    if schedule == "weekly":
        target_weekday = cint(config.get("weekday"))
        return current_date.weekday() == target_weekday
    if schedule == "monthly":
        target_day = max(cint(config.get("day_of_month")) or 1, 1)
        return current_date.day == target_day
    return False


def dispatch_scheduled_reports(*, frequency: str | None = None, limit: int = 10, business_date=None) -> dict[str, Any]:
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
        recipients = [str(item).strip() for item in (config.get("recipients") or []) if str(item).strip()]
        if report_key not in REPORT_DEFINITIONS or not recipients:
            skipped_invalid += 1
            _update_config_run_metadata(
                config,
                status="invalid",
                summary={"sent": 0, "queued": 0, "reason": "invalid_report_or_recipient"},
                business_date=current_date,
            )
            changed = True
            continue

        filters = config.get("filters") if isinstance(config.get("filters"), dict) else {}
        export_format = str(config.get("format") or "xlsx").strip().lower()
        delivery_channel = str(config.get("delivery_channel") or "email").strip().lower() or "email"
        payload = build_report_payload(report_key, filters=filters, limit=max(cint(config.get("limit")) or 1000, 1))

        if export_format == "pdf":
            content = render_report_pdf(
                report_key=report_key,
                columns=payload["columns"],
                rows=payload["rows"],
                filters=payload["filters"],
            )
        else:
            export_format = "xlsx"
            content = render_report_xlsx(
                report_key=report_key,
                columns=payload["columns"],
                rows=payload["rows"],
                filters=payload["filters"],
            )

        filename = build_report_filename(report_key, export_format)
        report_title = build_report_title(report_key, "tr")
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
    config["last_status"] = str(status or "").strip().lower() or "unknown"
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
            ).insert(ignore_permissions=True)
            queued_result = enqueue_notification_draft(draft.name)
            outbox_name = queued_result.get("outbox")
            if not outbox_name:
                failed += 1
                continue
            frappe.get_doc(
                {
                    "doctype": "File",
                    "file_name": filename,
                    "attached_to_doctype": "AT Notification Outbox",
                    "attached_to_name": outbox_name,
                    "is_private": 1,
                    "content": content,
                    "decode": False,
                }
            ).insert(ignore_permissions=True)
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

    frappe.get_doc(
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
    ).insert(ignore_permissions=True)
    return template_key
