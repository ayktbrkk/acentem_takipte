from __future__ import annotations

import frappe

from acentem_takipte.acentem_takipte.services.branches import (
    get_allowed_office_branch_names,
    user_can_access_all_office_branches,
)


def build_office_branch_permission_query(
    doctype: str,
    *,
    fieldname: str = "office_branch",
    table_name: str | None = None,
    user: str | None = None,
) -> str:
    user_id = user or frappe.session.user
    if user_can_access_all_office_branches(user_id):
        return ""

    allowed_branch_names = sorted(get_allowed_office_branch_names(user_id))
    if not allowed_branch_names:
        return "1=0"

    target_table = table_name or f"`tab{doctype}`"
    escaped_branch_names = ", ".join(frappe.db.escape(branch) for branch in allowed_branch_names)
    return f"{target_table}.`{fieldname}` in ({escaped_branch_names})"


def has_office_branch_permission(
    doc,
    *,
    fieldname: str = "office_branch",
    user: str | None = None,
) -> bool:
    user_id = user or frappe.session.user
    if user_can_access_all_office_branches(user_id):
        return True

    allowed_branch_names = get_allowed_office_branch_names(user_id)
    branch_name = getattr(doc, fieldname, None)
    if branch_name is None and hasattr(doc, "get"):
        branch_name = doc.get(fieldname)
    return str(branch_name or "").strip() in allowed_branch_names


def get_lead_permission_query_conditions(user=None):
    return build_office_branch_permission_query("AT Lead", user=user)


def has_lead_permission(doc, user=None, permission_type="read"):
    return has_office_branch_permission(doc, user=user)


def get_offer_permission_query_conditions(user=None):
    return build_office_branch_permission_query("AT Offer", user=user)


def has_offer_permission(doc, user=None, permission_type="read"):
    return has_office_branch_permission(doc, user=user)


def get_policy_permission_query_conditions(user=None):
    return build_office_branch_permission_query("AT Policy", user=user)


def has_policy_permission(doc, user=None, permission_type="read"):
    return has_office_branch_permission(doc, user=user)


def get_payment_permission_query_conditions(user=None):
    return build_office_branch_permission_query("AT Payment", user=user)


def has_payment_permission(doc, user=None, permission_type="read"):
    return has_office_branch_permission(doc, user=user)


def get_claim_permission_query_conditions(user=None):
    return build_office_branch_permission_query("AT Claim", user=user)


def has_claim_permission(doc, user=None, permission_type="read"):
    return has_office_branch_permission(doc, user=user)


def get_renewal_task_permission_query_conditions(user=None):
    return build_office_branch_permission_query("AT Renewal Task", user=user)


def has_renewal_task_permission(doc, user=None, permission_type="read"):
    return has_office_branch_permission(doc, user=user)


def get_accounting_entry_permission_query_conditions(user=None):
    return build_office_branch_permission_query("AT Accounting Entry", user=user)


def has_accounting_entry_permission(doc, user=None, permission_type="read"):
    return has_office_branch_permission(doc, user=user)


def get_reconciliation_item_permission_query_conditions(user=None):
    user_id = user or frappe.session.user
    if user_can_access_all_office_branches(user_id):
        return ""

    allowed_branch_names = sorted(get_allowed_office_branch_names(user_id))
    if not allowed_branch_names:
        return "1=0"

    escaped_branch_names = ", ".join(frappe.db.escape(branch) for branch in allowed_branch_names)
    return (
        "`tabAT Reconciliation Item`.`accounting_entry` in ("
        "select name from `tabAT Accounting Entry` "
        f"where `office_branch` in ({escaped_branch_names}))"
    )


def has_reconciliation_item_permission(doc, user=None, permission_type="read"):
    user_id = user or frappe.session.user
    if user_can_access_all_office_branches(user_id):
        return True

    allowed_branch_names = get_allowed_office_branch_names(user_id)
    accounting_entry = getattr(doc, "accounting_entry", None)
    if accounting_entry is None and hasattr(doc, "get"):
        accounting_entry = doc.get("accounting_entry")
    if not accounting_entry:
        return False
    branch_name = frappe.db.get_value("AT Accounting Entry", accounting_entry, "office_branch")
    return str(branch_name or "").strip() in allowed_branch_names


def get_notification_draft_permission_query_conditions(user=None):
    return build_office_branch_permission_query("AT Notification Draft", user=user)


def has_notification_draft_permission(doc, user=None, permission_type="read"):
    return has_office_branch_permission(doc, user=user)


def get_notification_outbox_permission_query_conditions(user=None):
    return build_office_branch_permission_query("AT Notification Outbox", user=user)


def has_notification_outbox_permission(doc, user=None, permission_type="read"):
    return has_office_branch_permission(doc, user=user)

