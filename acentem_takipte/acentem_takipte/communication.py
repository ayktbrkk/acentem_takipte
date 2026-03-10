from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass

import frappe
from frappe.utils import add_to_date, cint, cstr, now_datetime
from acentem_takipte.acentem_takipte.notification_dispatch import build_provider_message_from_records
from acentem_takipte.acentem_takipte.providers.router import get_provider_adapter
from acentem_takipte.acentem_takipte.utils.statuses import ATNotificationDraftStatus, ATNotificationOutboxStatus
from acentem_takipte.acentem_takipte.utils.logging import log_redacted_error, redact_payload
from acentem_takipte.acentem_takipte.utils.metrics import build_metric_event
from acentem_takipte.acentem_takipte.utils.network_security import normalize_whatsapp_api_url

DEFAULT_RETRY_MINUTES = 5
DEFAULT_MAX_ATTEMPTS = 3


@dataclass
class DeliveryResult:
    ok: bool
    provider: str
    message_id: str | None = None
    response_log: str | None = None
    error: str | None = None
    provider_payload: str | None = None


def queue_notification_drafts(limit: int = 200, include_failed: bool = True) -> dict[str, int]:
    statuses = [ATNotificationDraftStatus.DRAFT]
    if include_failed:
        statuses.append(ATNotificationDraftStatus.FAILED)

    drafts = frappe.get_all(
        "AT Notification Draft",
        filters={"status": ["in", statuses]},
        fields=["name"],
        order_by="creation asc",
        limit_page_length=max(cint(limit), 1),
    )

    queued = 0
    skipped = 0
    invalid = 0

    for row in drafts:
        result = enqueue_notification_draft(row.name)
        outcome = result.get("outcome")
        if outcome == "queued":
            queued += 1
        elif outcome == "invalid":
            invalid += 1
        else:
            skipped += 1

    if (queued or invalid) and not frappe.flags.in_test:
        frappe.db.commit()

    summary = {
        "scanned": len(drafts),
        "queued": queued,
        "skipped": skipped,
        "invalid": invalid,
    }
    frappe.logger("acentem_takipte").info(
        "AT notification queue summary: %s",
        build_metric_event(
            "notification.queue",
            dimensions={"component": "communication"},
            values=summary,
        ),
    )
    return summary


def enqueue_notification_draft(draft_name: str) -> dict[str, str]:
    draft = frappe.get_doc("AT Notification Draft", draft_name)

    if draft.status == ATNotificationDraftStatus.SENT:
        return {"outcome": "skipped", "reason": "already_sent"}

    recipient = (draft.recipient or "").strip()
    if not recipient:
        _set_draft_status(
            draft,
            status=ATNotificationDraftStatus.FAILED,
            error_message="Recipient is required for notification delivery.",
        )
        return {"outcome": "invalid", "reason": "missing_recipient"}

    customer = draft.customer if draft.customer and frappe.db.exists("AT Customer", draft.customer) else None
    office_branch = draft.get("office_branch")
    if not office_branch and customer:
        office_branch = frappe.db.get_value("AT Customer", customer, "office_branch")
    reference_doctype = (
        draft.reference_doctype if draft.reference_doctype and frappe.db.exists("DocType", draft.reference_doctype) else None
    )
    reference_name = (
        draft.reference_name
        if reference_doctype and draft.reference_name and frappe.db.exists(reference_doctype, draft.reference_name)
        else None
    )

    outbox_name = frappe.db.get_value("AT Notification Outbox", {"draft": draft.name}, "name")
    if outbox_name:
        outbox_doc = frappe.get_doc("AT Notification Outbox", outbox_name)
        if outbox_doc.status == ATNotificationOutboxStatus.SENT:
            _set_draft_status(
                draft,
                status=ATNotificationDraftStatus.SENT,
                outbox_record=outbox_doc.name,
                sent_at=outbox_doc.last_attempt_on,
            )
            return {"outcome": "skipped", "reason": "outbox_already_sent"}

        if outbox_doc.status == ATNotificationOutboxStatus.DEAD:
            # Allow manual recovery without dropping history.
            outbox_doc.status = ATNotificationOutboxStatus.QUEUED
            outbox_doc.next_retry_on = now_datetime()
            outbox_doc.error_message = None
            outbox_doc.save(ignore_permissions=True)
        else:
            outbox_doc.status = ATNotificationOutboxStatus.QUEUED
            outbox_doc.next_retry_on = now_datetime()
            outbox_doc.error_message = None
            outbox_doc.save(ignore_permissions=True)
    else:
        try:
            outbox_doc = frappe.get_doc(
                {
                    "doctype": "AT Notification Outbox",
                    "draft": draft.name,
                    "event_key": draft.event_key,
                    "channel": draft.channel,
                    "recipient": recipient,
                    "customer": customer,
                    "office_branch": office_branch,
                    "reference_doctype": reference_doctype,
                    "reference_name": reference_name,
                    "provider": _default_provider_for_channel(draft.channel),
                    "status": ATNotificationOutboxStatus.QUEUED,
                    "attempt_count": 0,
                    "max_attempts": DEFAULT_MAX_ATTEMPTS,
                    "next_retry_on": now_datetime(),
                }
            ).insert(ignore_permissions=True)
        except Exception:
            _set_draft_status(
                draft,
                status=ATNotificationDraftStatus.FAILED,
                error_message="Outbox insert failed. Check reference links.",
            )
            log_redacted_error(
                "AT Notification Outbox Insert Error",
                details={
                    "draft": draft.name,
                    "channel": draft.channel,
                    "recipient": recipient,
                    "reference_doctype": reference_doctype,
                    "reference_name": reference_name,
                },
            )
            return {"outcome": "invalid", "reason": "outbox_insert_failed"}

    _set_draft_status(draft, status=ATNotificationDraftStatus.QUEUED, outbox_record=outbox_doc.name)
    return {"outcome": "queued", "outbox": outbox_doc.name}


def process_notification_queue(limit: int = 50) -> dict[str, int]:
    limit = max(cint(limit), 1)
    pending_rows = frappe.db.sql(
        """
        select name
        from `tabAT Notification Outbox`
        where status in (%(queued)s, %(failed)s)
            and ifnull(attempt_count, 0) < ifnull(max_attempts, %(max_attempts)s)
            and (next_retry_on is null or next_retry_on <= %(next_retry_on)s)
        order by priority desc, modified asc
        limit %(limit)s
        """,
        {
            "queued": ATNotificationOutboxStatus.QUEUED,
            "failed": ATNotificationOutboxStatus.FAILED,
            "max_attempts": DEFAULT_MAX_ATTEMPTS,
            "next_retry_on": now_datetime(),
            "limit": limit,
        },
        as_dict=True,
    )

    sent = 0
    failed = 0
    dead = 0
    skipped = 0

    for row in pending_rows:
        result = dispatch_notification_outbox(row.name)
        status = result.get("status")
        if status == ATNotificationOutboxStatus.SENT:
            sent += 1
        elif status == ATNotificationOutboxStatus.FAILED:
            failed += 1
        elif status == ATNotificationOutboxStatus.DEAD:
            dead += 1
        else:
            skipped += 1

    if pending_rows and not frappe.flags.in_test:
        frappe.db.commit()

    summary = {
        "scanned": len(pending_rows),
        "sent": sent,
        "failed": failed,
        "dead": dead,
        "skipped": skipped,
    }
    frappe.logger("acentem_takipte").info(
        "AT notification dispatch summary: %s",
        redact_payload(
            build_metric_event(
                "notification.dispatch",
                dimensions={"component": "communication"},
                values=summary,
            )
        ),
    )
    return summary


def dispatch_notification_outbox(outbox_name: str, *, force: bool = False) -> dict[str, str]:
    outbox = frappe.get_doc("AT Notification Outbox", outbox_name)
    draft = frappe.get_doc("AT Notification Draft", outbox.draft)
    template_doc = frappe.get_doc("AT Notification Template", draft.template)

    if outbox.status == ATNotificationOutboxStatus.SENT:
        return {"status": "Skipped", "reason": "already_sent"}
    if outbox.status == ATNotificationOutboxStatus.DEAD and not force:
        return {"status": "Skipped", "reason": "dead_letter"}

    if not outbox.recipient:
        _mark_delivery_failure(outbox, draft, "Recipient is missing on outbox item.")
        return {"status": outbox.status, "reason": "missing_recipient"}

    outbox.status = ATNotificationOutboxStatus.PROCESSING
    outbox.attempt_count = cint(outbox.attempt_count) + 1
    outbox.last_attempt_on = now_datetime()
    outbox.error_message = None
    outbox.save(ignore_permissions=True)

    delivery = _send_outbox_notification(outbox=outbox, draft=draft, template_doc=template_doc)

    if delivery.ok:
        outbox.status = ATNotificationOutboxStatus.SENT
        outbox.provider = delivery.provider
        outbox.provider_message_id = delivery.message_id
        outbox.response_log = delivery.response_log
        outbox.provider_payload_json = delivery.provider_payload
        outbox.error_message = None
        outbox.next_retry_on = None
        outbox.save(ignore_permissions=True)

        _set_draft_status(
            draft,
            status=ATNotificationDraftStatus.SENT,
            sent_at=outbox.last_attempt_on,
            outbox_record=outbox.name,
        )
        return {"status": ATNotificationOutboxStatus.SENT, "outbox": outbox.name}

    _mark_delivery_failure(outbox, draft, delivery.error or "Unknown delivery error.")
    return {"status": outbox.status, "outbox": outbox.name}


def retry_notification_outbox(outbox_name: str) -> dict[str, str]:
    outbox_name = str(outbox_name or "").strip()
    if not outbox_name:
        return {"status": "Skipped", "reason": "missing_outbox"}

    outbox = frappe.get_doc("AT Notification Outbox", outbox_name)
    if outbox.status == ATNotificationOutboxStatus.SENT:
        return {"status": "Skipped", "reason": "already_sent"}

    outbox.status = ATNotificationOutboxStatus.QUEUED
    outbox.next_retry_on = now_datetime()
    outbox.error_message = None
    outbox.save(ignore_permissions=True)

    draft = frappe.get_doc("AT Notification Draft", outbox.draft)
    _set_draft_status(draft, status=ATNotificationDraftStatus.QUEUED, outbox_record=outbox.name)
    if not frappe.flags.in_test:
        frappe.db.commit()
    return {"status": ATNotificationOutboxStatus.QUEUED, "outbox": outbox.name}


def requeue_notification_outbox(outbox_name: str) -> dict[str, str]:
    return retry_notification_outbox(outbox_name)


def send_notification_draft_now(draft_name: str) -> dict[str, str]:
    queued = enqueue_notification_draft(draft_name)
    if queued.get("outcome") == "invalid":
        return {"status": "Invalid", "reason": queued.get("reason", "invalid")}

    outbox_name = frappe.db.get_value("AT Notification Outbox", {"draft": draft_name}, "name")
    if not outbox_name:
        return {"status": "Skipped", "reason": "outbox_missing"}

    result = dispatch_notification_outbox(outbox_name, force=True)
    if not frappe.flags.in_test:
        frappe.db.commit()
    return result


def _mark_delivery_failure(outbox, draft, error_message: str) -> None:
    attempts = cint(outbox.attempt_count)
    max_attempts = max(cint(outbox.max_attempts), 1)

    outbox.provider = _default_provider_for_channel(outbox.channel)
    outbox.error_message = cstr(error_message)[:500]
    outbox.response_log = cstr(error_message)[:500]

    if attempts >= max_attempts:
        outbox.status = ATNotificationOutboxStatus.DEAD
        outbox.next_retry_on = None
        draft_status = ATNotificationDraftStatus.FAILED
    else:
        outbox.status = ATNotificationOutboxStatus.FAILED
        retry_minutes = DEFAULT_RETRY_MINUTES * (2 ** max(attempts - 1, 0))
        outbox.next_retry_on = add_to_date(now_datetime(), minutes=retry_minutes)
        draft_status = ATNotificationDraftStatus.FAILED
    outbox.save(ignore_permissions=True)

    _set_draft_status(
        draft,
        status=draft_status,
        error_message=outbox.error_message,
        outbox_record=outbox.name,
    )


def _set_draft_status(
    draft,
    *,
    status: str,
    error_message: str | None = None,
    sent_at=None,
    outbox_record: str | None = None,
) -> None:
    values = {
        "status": status,
        "error_message": error_message,
    }
    if sent_at:
        values["sent_at"] = sent_at
    if outbox_record:
        values["outbox_record"] = outbox_record

    frappe.db.set_value("AT Notification Draft", draft.name, values, update_modified=True)
    for key, value in values.items():
        draft.set(key, value)


def _send_notification(
    *,
    channel: str,
    recipient: str,
    subject: str | None,
    body: str,
    context: dict,
) -> DeliveryResult:
    normalized_channel = _normalize_channel(channel)

    if normalized_channel == "EMAIL":
        return _send_email(recipient=recipient, subject=subject, body=body)

    # SMS channel is sent via WhatsApp adapter for Sprint 3.
    return _send_whatsapp(recipient=recipient, subject=subject, body=body, context=context)


def _send_outbox_notification(*, outbox, draft, template_doc) -> DeliveryResult:
    normalized_channel = _normalize_channel(outbox.channel)
    provider_message = build_provider_message_from_records(template_doc, draft, outbox)
    provider_payload = redact_payload(
        {
            "recipient": provider_message.recipient,
            "subject": provider_message.subject,
            "body": provider_message.body,
            "template_name": provider_message.template_name,
            "template_language": provider_message.template_language,
            "components": provider_message.components,
            "metadata": provider_message.metadata,
        }
    )

    if normalized_channel == "EMAIL":
        result = _send_email(
            recipient=provider_message.recipient,
            subject=provider_message.subject,
            body=provider_message.body,
            attachments=_get_outbox_attachments(outbox),
        )
        result.provider_payload = frappe.as_json(provider_payload)
        return result

    adapter = get_provider_adapter(normalized_channel, explicit_provider=outbox.provider)
    if adapter:
        result = adapter.send(provider_message)
        return DeliveryResult(
            ok=result.ok,
            provider=result.provider,
            message_id=result.provider_message_id,
            response_log=frappe.as_json(redact_payload(result.response_payload)) if result.response_payload is not None else None,
            error=result.error_message,
            provider_payload=frappe.as_json(provider_payload),
        )

    result = _send_whatsapp(
        recipient=provider_message.recipient,
        subject=provider_message.subject,
        body=provider_message.body,
        context=provider_message.metadata,
    )
    result.provider_payload = frappe.as_json(provider_payload)
    return result


def _send_email(*, recipient: str, subject: str | None, body: str, attachments: list[dict] | None = None) -> DeliveryResult:
    if _is_dry_run():
        message_id = f"dry-email-{frappe.generate_hash(length=10)}"
        return DeliveryResult(ok=True, provider="Email(DryRun)", message_id=message_id, response_log="dry_run")

    try:
        frappe.sendmail(
            recipients=[recipient],
            subject=subject or "Acentem Takipte Notification",
            message=body,
            attachments=attachments or None,
            delayed=False,
            now=True,
        )
        message_id = f"mail-{frappe.generate_hash(length=10)}"
        return DeliveryResult(ok=True, provider="Email(Frappe)", message_id=message_id, response_log="sent")
    except Exception:
        return DeliveryResult(
            ok=False,
            provider="Email(Frappe)",
            error=frappe.get_traceback(),
            response_log="failed",
        )


def _send_whatsapp(*, recipient: str, subject: str | None, body: str, context: dict) -> DeliveryResult:
    if _is_dry_run():
        message_id = f"dry-wa-{frappe.generate_hash(length=10)}"
        return DeliveryResult(ok=True, provider="WhatsApp(DryRun)", message_id=message_id, response_log="dry_run")

    site_config = frappe.get_site_config() or {}
    mode = cstr(site_config.get("at_whatsapp_mode") or "sandbox").lower()
    if mode != "production":
        message_id = f"sandbox-wa-{frappe.generate_hash(length=10)}"
        return DeliveryResult(ok=True, provider="WhatsApp(Sandbox)", message_id=message_id, response_log="sandbox")

    api_url = cstr(site_config.get("at_whatsapp_api_url") or "").strip()
    api_token = cstr(site_config.get("at_whatsapp_api_token") or "").strip()
    sender = cstr(site_config.get("at_whatsapp_sender") or "").strip()

    if not api_url:
        return DeliveryResult(ok=False, provider="WhatsApp(API)", error="Missing at_whatsapp_api_url.")
    if not api_token:
        return DeliveryResult(ok=False, provider="WhatsApp(API)", error="Missing at_whatsapp_api_token.")

    try:
        api_url = normalize_whatsapp_api_url(api_url)
    except ValueError as exc:
        return DeliveryResult(ok=False, provider="WhatsApp(API)", error=cstr(exc))

    payload = {
        "to": recipient,
        "sender": sender,
        "message": body,
        "subject": subject,
        "meta": context,
    }
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        api_url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_token}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            response_body = response.read().decode("utf-8", errors="ignore")
            message_id = _extract_message_id(response_body) or f"wa-{frappe.generate_hash(length=10)}"
            return DeliveryResult(
                ok=200 <= response.status < 300,
                provider="WhatsApp(API)",
                message_id=message_id,
                response_log=response_body[:1000],
                error=None if 200 <= response.status < 300 else f"Provider HTTP status: {response.status}",
            )
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="ignore") if hasattr(exc, "read") else ""
        return DeliveryResult(
            ok=False,
            provider="WhatsApp(API)",
            error=f"HTTPError {exc.code}: {body_text[:300]}",
            response_log=body_text[:1000],
        )
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        return DeliveryResult(ok=False, provider="WhatsApp(API)", error=cstr(exc))


def _extract_message_id(response_body: str) -> str | None:
    if not response_body:
        return None
    try:
        payload = json.loads(response_body)
    except Exception:
        return None

    for key in ("message_id", "id", "sid"):
        value = payload.get(key)
        if value:
            return cstr(value)
    return None


def _default_provider_for_channel(channel: str) -> str:
    normalized_channel = _normalize_channel(channel)
    if normalized_channel == "EMAIL":
        return "Email(Frappe)"
    if normalized_channel == "WHATSAPP":
        return "meta_whatsapp"
    return "WhatsApp(API)"


def _normalize_channel(channel: str) -> str:
    raw = cstr(channel or "").strip()
    if raw.lower() == "email":
        return "EMAIL"
    if raw.lower() == "whatsapp":
        return "WHATSAPP"
    if raw.lower() == "sms":
        return "SMS"
    return raw.upper()


def _get_outbox_attachments(outbox) -> list[dict]:
    attachments: list[dict] = []
    file_rows = frappe.get_all(
        "File",
        filters={
            "attached_to_doctype": "AT Notification Outbox",
            "attached_to_name": outbox.name,
        },
        fields=["name", "file_name"],
        order_by="creation asc",
        limit_page_length=20,
    )
    for row in file_rows:
        file_doc = frappe.get_doc("File", row.name)
        attachments.append(
            {
                "fname": row.file_name or file_doc.file_name or row.name,
                "fcontent": file_doc.get_content(),
            }
        )
    return attachments


def _is_dry_run() -> bool:
    config = frappe.get_site_config() or {}
    return cint(config.get("at_notification_dry_run", 1)) == 1
