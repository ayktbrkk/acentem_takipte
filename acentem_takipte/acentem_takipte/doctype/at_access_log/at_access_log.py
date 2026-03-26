from __future__ import annotations

import frappe
from frappe.model.document import Document
from frappe.utils import add_to_date, now_datetime


class ATAccessLog(Document):
    pass


def log_access(
    reference_doctype: str, reference_name: str, action: str = "View"
) -> None:
    _insert_access_log(reference_doctype, reference_name, action=action)


def log_decision_event(
    reference_doctype: str,
    reference_name: str,
    action: str,
    action_summary: str | None = None,
    decision_context: str | None = None,
) -> None:
    _insert_access_log(
        reference_doctype,
        reference_name,
        action=action,
        action_summary=action_summary,
        decision_context=decision_context,
    )


def _insert_access_log(
    reference_doctype: str,
    reference_name: str,
    action: str = "View",
    action_summary: str | None = None,
    decision_context: str | None = None,
) -> None:
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
    doc = frappe.get_doc(
        {
            "doctype": "AT Access Log",
            "reference_doctype": reference_doctype,
            "reference_name": reference_name,
            "viewed_by": user,
            "action": action,
            "ip_address": ip_address,
            "viewed_on": now_datetime(),
            "action_summary": action_summary,
            "decision_context": decision_context,
        }
    )
    # ignore_permissions: Audit log insertion; system-level operation.
    doc.insert(ignore_permissions=True)
