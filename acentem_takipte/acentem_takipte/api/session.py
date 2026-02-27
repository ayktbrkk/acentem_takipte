from __future__ import annotations

import frappe

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
    "insurance_company_edit": "AT Insurance Company",
    "branch_master_edit": "AT Branch",
    "sales_entity_master_edit": "AT Sales Entity",
    "notification_template_master_edit": "AT Notification Template",
    "accounting_entry_edit": "AT Accounting Entry",
    "reconciliation_item_edit": "AT Reconciliation Item",
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
        }
    )

    doctypes = {
        doctype: {
            "read": _has_permission(doctype, "read"),
            "create": _has_permission(doctype, "create"),
            "write": _has_permission(doctype, "write"),
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
        frappe.throw("Authentication required")

    full_name = frappe.db.get_value("User", user, "full_name") or user
    language = (frappe.db.get_value("User", user, "language") or frappe.local.lang or "tr")

    return {
        "user": user,
        "full_name": full_name,
        "locale": str(language).split("-")[0].lower(),
        "branch": frappe.defaults.get_user_default("AT Branch"),
        "capabilities": _build_session_capabilities(),
    }


def _normalize_locale(locale: str | None) -> str:
    value = str(locale or "tr").lower()
    return "en" if value.startswith("en") else "tr"


@frappe.whitelist()
def set_session_locale(locale: str | None = None) -> dict:
    user = resolve_current_user()
    if user == "Guest":
        frappe.throw("Authentication required")

    language = _normalize_locale(locale)
    frappe.db.set_value("User", user, "language", language)
    frappe.clear_cache(user=user)
    frappe.local.lang = language
    if getattr(frappe.local, "cookie_manager", None):
        frappe.local.cookie_manager.set_cookie("user_lang", language)

    full_name = frappe.db.get_value("User", user, "full_name") or user
    return {
        "user": user,
        "full_name": full_name,
        "locale": language,
        "branch": frappe.defaults.get_user_default("AT Branch"),
        "capabilities": _build_session_capabilities(),
    }
