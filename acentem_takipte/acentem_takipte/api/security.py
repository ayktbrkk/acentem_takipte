from __future__ import annotations

from typing import Any

import frappe
from frappe.utils import cint

from acentem_takipte.utils.logging import redact_payload


def assert_authenticated(message: str = "Authentication required") -> str:
    user = frappe.session.user or "Guest"
    if user == "Guest":
        frappe.throw(frappe._(message))
    return user


def assert_roles(*roles: str, user: str | None = None, message: str | None = None) -> str:
    current_user = user or assert_authenticated()
    if current_user == "Administrator":
        return current_user

    required_roles = {str(role).strip() for role in roles if str(role or "").strip()}
    if not required_roles:
        return current_user

    current_roles = set(frappe.get_roles(current_user))
    if current_roles.intersection(required_roles):
        return current_user

    frappe.throw(frappe._(message or "You do not have permission to perform this action."))
    return current_user


def assert_doctype_permission(doctype: str, ptype: str, message: str | None = None) -> None:
    assert_authenticated()
    if not frappe.has_permission(doctype, ptype):
        frappe.throw(frappe._(message or "You do not have permission to access this resource."))


def assert_doc_permission(doctype: str, name: str, ptype: str = "read"):
    assert_authenticated()
    if not name:
        frappe.throw(frappe._("Document name is required."))
    doc = frappe.get_doc(doctype, name)
    doc.check_permission(ptype)
    return doc


def assert_non_production_or_feature_flag(flag_name: str, message: str | None = None) -> None:
    config = frappe.get_site_config() or {}
    if cint(config.get(flag_name, 0)):
        return
    if cint(config.get("developer_mode", 0)) or getattr(frappe.flags, "in_test", False):
        return
    frappe.throw(frappe._(message or "This action is disabled in production."))


def assert_post_request(message: str | None = None) -> None:
    request = getattr(frappe.local, "request", None)
    if not request:
        return
    method = str(getattr(request, "method", "") or "").upper()
    if method != "POST":
        frappe.throw(frappe._(message or "Only POST requests are allowed for this action."))


def audit_admin_action(action: str, details: dict[str, Any] | None = None) -> None:
    payload = {
        "action": str(action or "").strip() or "unknown_action",
        "user": frappe.session.user or "Guest",
        "ip": getattr(frappe.local, "request_ip", None),
        "details": details or {},
    }
    frappe.logger("acentem_takipte.security").info("AT admin action: %s", redact_payload(payload))

