from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint

BOOTSTRAP_DASHBOARD_FALLBACK_FLAG = "at_dashboard_allow_bootstrap_global_fallback"

# Refactor roadmap artifact: central policy table for dashboard API entry points.
# This table documents expected auth/scope requirements and will be used to drive
# explicit entry-level guards as endpoint extraction progresses.
DASHBOARD_ENDPOINT_PERMISSION_POLICY = {
    "get_dashboard_kpis": {
        "http_methods": ["GET"],
        "auth": "authenticated",
        "scope": "customer_scope",
        "doctype_permissions": [],
        "roles_allow_global_scope": ["System Manager", "Manager", "Accountant"],
        "roles_allow_scoped_scope": ["Agent"],
    },
    "get_dashboard_tab_payload": {
        "http_methods": ["GET"],
        "auth": "authenticated",
        "scope": "customer_scope",
        "doctype_permissions": [],
        "roles_allow_global_scope": ["System Manager", "Manager", "Accountant"],
        "roles_allow_scoped_scope": ["Agent"],
    },
    "get_customer_list": {
        "http_methods": ["GET"],
        "auth": "authenticated",
        "scope": "customer_scope",
        "doctype_permissions": [{"doctype": "AT Customer", "ptype": "read"}],
    },
    "get_customer_portfolio_summary_map": {
        "http_methods": ["GET"],
        "auth": "authenticated",
        "scope": "customer_scope",
        "doctype_permissions": [{"doctype": "AT Customer", "ptype": "read"}],
    },
    "get_customer_workbench_rows": {
        "http_methods": ["GET"],
        "auth": "authenticated",
        "scope": "customer_scope",
        "doctype_permissions": [{"doctype": "AT Customer", "ptype": "read"}],
    },
    "get_lead_workbench_rows": {
        "http_methods": ["GET"],
        "auth": "authenticated",
        "scope": "customer_scope",
        "doctype_permissions": [{"doctype": "AT Lead", "ptype": "read"}],
    },
    "get_lead_detail_payload": {
        "http_methods": ["GET"],
        "auth": "authenticated",
        "scope": "customer_scope",
        "doctype_permissions": [{"doctype": "AT Lead", "ptype": "read"}],
    },
    "get_offer_detail_payload": {
        "http_methods": ["GET"],
        "auth": "authenticated",
        "scope": "customer_scope",
        "doctype_permissions": [{"doctype": "AT Offer", "ptype": "read"}],
    },
    "update_customer_profile": {
        "http_methods": ["POST"],
        "auth": "authenticated",
        "scope": "doc_permission",
        "doctype_permissions": [{"doctype": "AT Customer", "ptype": "write"}],
    },
}


def dashboard_bootstrap_global_fallback_enabled() -> bool:
    config = frappe.get_site_config() or {}
    return bool(cint(config.get(BOOTSTRAP_DASHBOARD_FALLBACK_FLAG) or 0))


def allowed_customers_for_user(include_meta: bool = False):
    def _result(allowed_customers: list[str] | None, access_scope: str, scope_reason: str):
        meta = {"access_scope": access_scope, "scope_reason": scope_reason}
        if include_meta:
            return allowed_customers, meta
        return allowed_customers

    user = frappe.session.user
    fallback_enabled = dashboard_bootstrap_global_fallback_enabled()

    if user == "Administrator":
        return _result(None, "global", "administrator")
    if user == "Guest":
        frappe.throw(_("You do not have permission to access dashboard data."), frappe.PermissionError)

    roles = set(frappe.get_roles(user))
    if {"System Manager", "Manager", "Accountant"}.intersection(roles):
        return _result(None, "global", "privileged_role")

    if "Agent" in roles:
        assigned_customers = frappe.get_all(
            "AT Customer",
            filters={"assigned_agent": user},
            pluck="name",
            limit_page_length=0,
        )
        if assigned_customers:
            return _result(assigned_customers, "scoped", "agent_assignment")
        if fallback_enabled:
            return _result(None, "global", "bootstrap_fallback_enabled")
        return _result([], "empty", "agent_unassigned")

    user_type = frappe.db.get_value("User", user, "user_type")
    if user_type and user_type != "System User":
        return _result([], "empty", "non_system_user")

    if fallback_enabled:
        return _result(None, "global", "bootstrap_fallback_enabled")

    frappe.throw(_("You do not have permission to access dashboard data."), frappe.PermissionError)


def get_dashboard_endpoint_permission_policy() -> dict:
    return DASHBOARD_ENDPOINT_PERMISSION_POLICY.copy()
