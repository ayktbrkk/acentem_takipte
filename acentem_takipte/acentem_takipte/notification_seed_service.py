from __future__ import annotations

from typing import Any

import frappe

from acentem_takipte.acentem_takipte.notification_seed_data import DEFAULT_NOTIFICATION_TEMPLATES


def upsert_default_notification_templates() -> dict[str, int]:
    created = 0
    updated = 0

    for payload in DEFAULT_NOTIFICATION_TEMPLATES:
        template_key = payload["template_key"]
        existing_name = frappe.db.get_value("AT Notification Template", {"template_key": template_key}, "name")

        if existing_name:
            doc = frappe.get_doc("AT Notification Template", existing_name)
            _apply_payload(doc, payload)
            doc.save()
            updated += 1
            continue

        doc = frappe.get_doc({"doctype": "AT Notification Template", **payload})
        doc.insert()
        created += 1

    return {"created": created, "updated": updated, "total": len(DEFAULT_NOTIFICATION_TEMPLATES)}


def _apply_payload(doc: Any, payload: dict[str, Any]) -> None:
    for key, value in payload.items():
        doc.set(key, value)

