from __future__ import annotations

import frappe
from frappe import _

from acentem_takipte.acentem_takipte.api.security import assert_post_request
from acentem_takipte.acentem_takipte.services.branches import (
    get_default_office_branch,
    get_user_office_branches,
    user_can_access_all_office_branches,
)

SESSION_CAPABILITY_QUICK_CREATE: dict[str, str] = {
    "renewal_task": "AT Renewal Task",
    "notification_draft": "AT Notification Draft",
    "communication_message": "AT Notification Draft",
    "insurance_company": "AT Insurance Company",
    "branch_master": "AT Branch",
    "sales_entity_master": "AT Sales Entity",
    "notification_template_master": "AT Notification Template",
    "accounting_entry": "AT Accounting Entry",
    "reconciliation_item": "AT Reconciliation Item",
}

SESSION_CAPABILITY_QUICK_EDIT: dict[str, str] = {
    "document_registry_edit": "AT Document",
    "insurance_company_edit": "AT Insurance Company",
    "branch_master_edit": "AT Branch",
    "sales_entity_master_edit": "AT Sales Entity",
    "notification_template_master_edit": "AT Notification Template",
    "accounting_entry_edit": "AT Accounting Entry",
    "reconciliation_item_edit": "AT Reconciliation Item",
}

DESK_HOME_ROLES = {"System Manager", "Administrator"}
SPA_HOME_ROLES = {"Manager", "Agent", "Accountant"}


def _coerce_realtime_port(value) -> int | None:
    try:
        port = int(value)
    except (TypeError, ValueError):
        return None

    if 1 <= port <= 65535:
        return port
    return None


def _coerce_realtime_enabled(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return int(value) == 1
    normalized = str(value or "").strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off", ""}:
        return False
    return False


def _build_realtime_config() -> dict[str, int | bool | None]:
    site_config = frappe.get_site_config() or {}
    enabled = _coerce_realtime_enabled(site_config.get("at_realtime_enabled"))
    port = _coerce_realtime_port(site_config.get("at_realtime_port") or 9000)

    return {
        "enabled": bool(enabled and port),
        "port": port if enabled and port else None,
    }


def _has_permission(doctype: str, ptype: str) -> bool:
    try:
        return bool(frappe.has_permission(doctype, ptype))
    except Exception:
        return False


def _build_session_capabilities() -> dict:
    quick_create = {key: _has_permission(doctype, "create") for key, doctype in SESSION_CAPABILITY_QUICK_CREATE.items()}
    quick_edit = {key: _has_permission(doctype, "write") for key, doctype in SESSION_CAPABILITY_QUICK_EDIT.items()}

    communication_actions = {
        "sendDraftNow": _has_permission("AT Notification Draft", "write"),
        "retryOutbox": _has_permission("AT Notification Outbox", "write"),
        "requeueOutbox": _has_permission("AT Notification Outbox", "write"),
        "runDispatchCycle": _has_permission("AT Notification Outbox", "write"),
    }

    capability_doctypes = sorted(
        {
            *SESSION_CAPABILITY_QUICK_CREATE.values(),
            *SESSION_CAPABILITY_QUICK_EDIT.values(),
            "AT Notification Outbox",
            "AT Policy",
        }
    )

    doctypes = {
        doctype: {
            "read": _has_permission(doctype, "read"),
            "create": _has_permission(doctype, "create"),
            "write": _has_permission(doctype, "write"),
            "delete": _has_permission(doctype, "delete"),
        }
        for doctype in capability_doctypes
    }

    return {
        "quickCreate": quick_create,
        "quickEdit": quick_edit,
        "actions": {
            "communication": communication_actions,
        },
        "doctypes": doctypes,
    }


def _resolve_session_interface(user: str) -> dict:
    roles = [role for role in frappe.get_roles(user) if role not in {"All", "Guest"}]
    role_set = set(roles)

    preferred_home = "/at"
    interface_mode = "spa"

    if role_set.intersection(DESK_HOME_ROLES):
        preferred_home = "/app"
        interface_mode = "desk"
    elif role_set.intersection(SPA_HOME_ROLES):
        preferred_home = "/at"
        interface_mode = "spa"
    elif role_set:
        # Keep compatibility with future role sets by defaulting to SPA.
        preferred_home = "/at"
        interface_mode = "spa"
    else:
        preferred_home = "/at"
        interface_mode = "spa"

    return {
        "roles": roles,
        "preferred_home": preferred_home,
        "interface_mode": interface_mode,
    }


def get_website_user_home_page(user: str | None = None) -> str:
    resolved_user = str(user or frappe.session.user or "Guest").strip() or "Guest"
    preferred_home = _resolve_session_interface(resolved_user)["preferred_home"]
    return str(preferred_home or "/at").lstrip("/") or "at"


def resolve_current_user() -> str:
    session_user = frappe.session.user or "Guest"
    try:
        auth_user = frappe.auth.get_logged_user()
    except Exception:
        auth_user = None

    if auth_user and auth_user != "Guest":
        return auth_user
    return session_user


@frappe.whitelist()
def get_session_context() -> dict:
    user = resolve_current_user()
    if user == "Guest":
        frappe.throw(_("Authentication required"))

    try:
        from acentem_takipte.acentem_takipte.services.cache_precomputation import get_cached_user_scope

        get_cached_user_scope(user=user, use_precomputed=True)
    except Exception:
        pass

    full_name = frappe.db.get_value("User", user, "full_name") or user
    language = (frappe.db.get_value("User", user, "language") or frappe.local.lang or "en")
    interface = _resolve_session_interface(user)
    office_branches = get_user_office_branches(user)
    default_office_branch = get_default_office_branch(user)
    can_access_all_office_branches = user_can_access_all_office_branches(user)

    return {
        "user": user,
        "full_name": full_name,
        "locale": str(language).split("-")[0].lower(),
        "branch": frappe.defaults.get_user_default("AT Branch"),
        "office_branches": office_branches,
        "default_office_branch": default_office_branch,
        "can_access_all_office_branches": can_access_all_office_branches,
        "capabilities": _build_session_capabilities(),
        "realtime": _build_realtime_config(),
        "roles": interface["roles"],
        "preferred_home": interface["preferred_home"],
        "interface_mode": interface["interface_mode"],
    }


def _normalize_locale(locale: str | None) -> str:
    value = str(locale or "en").lower()
    return "en" if value.startswith("en") else "tr"


@frappe.whitelist()
def set_session_locale(locale: str | None = None) -> dict:
    assert_post_request("Only POST requests are allowed when updating session locale.")
    user = resolve_current_user()
    if user == "Guest":
        frappe.throw(_("Authentication required"))

    language = _normalize_locale(locale)
    frappe.db.set_value("User", user, "language", language)
    frappe.clear_cache(user=user)
    frappe.local.lang = language
    if getattr(frappe.local, "cookie_manager", None):
        frappe.local.cookie_manager.set_cookie("user_lang", language)

    full_name = frappe.db.get_value("User", user, "full_name") or user
    interface = _resolve_session_interface(user)
    office_branches = get_user_office_branches(user)
    default_office_branch = get_default_office_branch(user)
    can_access_all_office_branches = user_can_access_all_office_branches(user)
    return {
        "user": user,
        "full_name": full_name,
        "locale": language,
        "branch": frappe.defaults.get_user_default("AT Branch"),
        "office_branches": office_branches,
        "default_office_branch": default_office_branch,
        "can_access_all_office_branches": can_access_all_office_branches,
        "capabilities": _build_session_capabilities(),
        "realtime": _build_realtime_config(),
        "roles": interface["roles"],
        "preferred_home": interface["preferred_home"],
        "interface_mode": interface["interface_mode"],
    }

