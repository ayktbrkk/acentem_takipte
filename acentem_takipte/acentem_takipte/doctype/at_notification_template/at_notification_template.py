from __future__ import annotations

import json
import time

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint

from acentem_takipte.acentem_takipte.api.security import assert_authenticated

RENDER_TEMPLATE_MAX_CONTEXT_BYTES = 8 * 1024
RENDER_TEMPLATE_RATE_LIMIT_WINDOW_SECONDS = 60
RENDER_TEMPLATE_RATE_LIMIT_MAX_REQUESTS = 60


class ATNotificationTemplate(Document):
    pass


def _render_rate_limit_key(user: str) -> str:
    return f"at:notification_template_render:rate:{user}"


def _assert_render_rate_limit(user: str) -> None:
    if not user or user in {"Guest", "Administrator"}:
        return

    cache = frappe.cache()
    key = _render_rate_limit_key(user)
    now_ts = int(time.time())

    try:
        state = cache.get_value(key) or {}
        if isinstance(state, str):
            state = frappe.parse_json(state) or {}
        if not isinstance(state, dict):
            state = {}
    except Exception:
        state = {}

    window_start = cint(state.get("window_start")) or now_ts
    count = cint(state.get("count")) or 0
    if now_ts - window_start >= RENDER_TEMPLATE_RATE_LIMIT_WINDOW_SECONDS:
        window_start = now_ts
        count = 0

    if count >= RENDER_TEMPLATE_RATE_LIMIT_MAX_REQUESTS:
        frappe.throw(_("Too many template preview requests. Please retry shortly."))

    try:
        cache.set_value(key, {"window_start": window_start, "count": count + 1})
    except Exception:
        # Best-effort abuse guard: failing closed here would break valid users if cache is unavailable.
        pass


def _normalize_render_context(context) -> dict:
    payload = frappe.parse_json(context) if isinstance(context, str) else (context or {})
    if payload is None or payload == "":
        payload = {}
    if not isinstance(payload, dict):
        frappe.throw(_("Template context must be a JSON object."))

    try:
        serialized = json.dumps(payload, ensure_ascii=False, default=str)
    except Exception:
        frappe.throw(_("Template context could not be serialized."))

    if len(serialized.encode("utf-8")) > RENDER_TEMPLATE_MAX_CONTEXT_BYTES:
        frappe.throw(
            _("Template context is too large. Maximum allowed size is {0} bytes.").format(
                RENDER_TEMPLATE_MAX_CONTEXT_BYTES
            )
        )

    return payload


@frappe.whitelist()
def render_notification_template(template_key: str, context=None):
    user = assert_authenticated()
    _assert_render_rate_limit(user)

    template_name = str(template_key or "").strip()
    if not template_name:
        frappe.throw(_("AT Notification Template is required."))

    payload = _normalize_render_context(context)
    template_doc = frappe.get_doc("AT Notification Template", template_name)
    template_doc.check_permission("read")
    if cint(getattr(template_doc, "is_active", 0)) != 1:
        frappe.throw(_("Selected notification template is inactive."))

    return {
        "channel": template_doc.channel,
        "subject": frappe.render_template(template_doc.subject or "", payload),
        "body": frappe.render_template(template_doc.body_template or "", payload),
    }
