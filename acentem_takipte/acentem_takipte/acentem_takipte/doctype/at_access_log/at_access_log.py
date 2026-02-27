from __future__ import annotations

import frappe
from frappe.model.document import Document
from frappe.utils import add_to_date, now_datetime


class ATAccessLog(Document):
    pass


def log_access(reference_doctype: str, reference_name: str, action: str = "View") -> None:
    user = frappe.session.user if frappe.session else "Guest"
    if not user or user == "Guest":
        return

    cutoff = add_to_date(now_datetime(), minutes=-2)
    recent_entries = frappe.get_all(
        "AT Access Log",
        filters={
            "reference_doctype": reference_doctype,
            "reference_name": reference_name,
            "viewed_by": user,
            "action": action,
            "creation": [">=", cutoff],
        },
        fields=["name"],
        limit=1,
    )
    if recent_entries:
        return

    ip_address = getattr(frappe.local, "request_ip", None)
    frappe.get_doc(
        {
            "doctype": "AT Access Log",
            "reference_doctype": reference_doctype,
            "reference_name": reference_name,
            "viewed_by": user,
            "action": action,
            "ip_address": ip_address,
            "viewed_on": now_datetime(),
        }
    ).insert(ignore_permissions=True)
