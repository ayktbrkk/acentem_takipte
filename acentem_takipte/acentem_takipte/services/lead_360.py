from __future__ import annotations

import frappe
from frappe.utils.logger import get_logger

from acentem_takipte.acentem_takipte.services.document_center import build_document_profile

LOGGER = get_logger("acentem_takipte.lead_360")


def build_lead_360_payload(name: str) -> dict:
    lead_name = str(name or "").strip()
    if not lead_name:
        return {}

    # Try to get from cache first (5 min TTL)
    cache_key = f"at_lead_360:{lead_name}"
    cached_payload = frappe.cache().get_value(cache_key)
    if cached_payload:
        return cached_payload

    lead_doc = frappe.get_doc("AT Lead", lead_name)
    lead = lead_doc.as_dict(no_default_fields=False)
    
    # Enrich payload with related data
    payload = {
        "lead": lead,
        "customer": _get_customer(lead.get("customer")),
        "offers": _get_offers(lead_name),
        "policies": _get_policies(lead.get("customer")),
        "activity": _get_activity(lead),
        "notification_drafts": _get_rows(
            "AT Notification Draft",
            fields=["name", "creation", "channel", "language", "status", "subject", "body"],
            filters={"reference_doctype": "AT Lead", "reference_name": lead_name},
            order_by="creation desc",
            limit_page_length=5,
        ),
        "notification_outbox": _get_rows(
            "AT Notification Outbox",
            fields=["name", "creation", "channel", "language", "status", "subject"],
            filters={"reference_doctype": "AT Lead", "reference_name": lead_name},
            order_by="creation desc",
            limit_page_length=5,
        ),
    }

    # Add document profile
    files = _get_rows(
        "File",
        fields=["name", "file_name", "file_url", "file_size", "is_private", "creation"],
        filters={"attached_to_doctype": "AT Lead", "attached_to_name": lead_name, "is_folder": 0},
        order_by="creation desc",
        limit_page_length=50,
    )
    payload["files"] = files
    payload["document_profile"] = build_document_profile(files)

    # Cache for 5 minutes
    frappe.cache().set_value(cache_key, payload, expires_in_sec=300)
    
    return payload


def invalidate_lead_360_cache(lead_name: str):
    if not lead_name:
        return
    cache_key = f"at_lead_360:{lead_name}"
    frappe.cache().delete_value(cache_key)
    LOGGER.debug(f"Invalidated lead 360 cache for: {lead_name}")


def _get_customer(customer_name):
    if not customer_name:
        return {}
    try:
        return frappe.get_doc("AT Customer", customer_name).as_dict()
    except Exception:
        return {}


def _get_offers(lead_name):
    return frappe.get_list(
        "AT Offer",
        fields=["name", "status", "offer_date", "gross_premium", "currency", "modified"],
        filters={"source_lead": lead_name},
        order_by="modified desc",
        limit_page_length=10,
    )


def _get_policies(customer_name):
    if not customer_name:
        return []
    return frappe.get_list(
        "AT Policy",
        fields=["name", "policy_no", "status", "end_date", "gross_premium", "currency", "modified"],
        filters={"customer": customer_name},
        order_by="modified desc",
        limit_page_length=10,
    )


def _get_activity(lead):
    events = []
    
    # 1. Comments
    comments = frappe.get_list(
        "Comment",
        fields=["name", "creation", "owner", "comment_type", "content"],
        filters={"reference_doctype": "AT Lead", "reference_name": lead.name},
        order_by="creation desc",
        limit_page_length=20,
    )
    for c in comments:
        events.append({
            "type": "comment",
            "timestamp": c.creation,
            "owner": c.owner,
            "meta": c.content,
            "payload": c
        })

    # 2. Communications
    comms = frappe.get_list(
        "Communication",
        fields=["name", "creation", "owner", "communication_date", "subject", "sender", "communication_type", "content"],
        filters={"reference_doctype": "AT Lead", "reference_name": lead.name},
        order_by="communication_date desc",
        limit_page_length=20,
    )
    for c in comms:
        events.append({
            "type": "communication",
            "timestamp": c.communication_date or c.creation,
            "owner": c.owner,
            "meta": c.subject or c.content,
            "payload": c
        })

    # Sort by timestamp desc
    events.sort(key=lambda x: x["timestamp"], reverse=True)
    return events[:15]


def _get_rows(doctype, fields, filters, order_by=None, limit_page_length=None):
    try:
        return frappe.get_list(
            doctype,
            fields=fields,
            filters=filters,
            order_by=order_by,
            limit_page_length=limit_page_length
        )
    except Exception:
        return []

def invalidate_lead_from_doc_event(doc, method=None):
    """Bridge function for hooks to invalidate lead 360 cache."""
    if not doc:
        return

    def read_value(fieldname: str) -> str:
        if hasattr(doc, "get"):
            try:
                value = doc.get(fieldname)
            except Exception:
                value = None
        else:
            value = None
        if value:
            return value
        return getattr(doc, fieldname, None)

    # Direct target
    if doc.doctype == "AT Lead":
        invalidate_lead_360_cache(doc.name)
        return

    # Reference target
    lead_name = None
    if doc.doctype == "AT Offer" and read_value("source_lead"):
        lead_name = read_value("source_lead")
    elif doc.doctype in ["Communication", "Comment"] and read_value("reference_doctype") == "AT Lead":
        lead_name = read_value("reference_name")
    elif doc.doctype == "AT Document" and read_value("reference_doctype") == "AT Lead":
        lead_name = read_value("reference_name")

    if lead_name:
        invalidate_lead_360_cache(lead_name)
