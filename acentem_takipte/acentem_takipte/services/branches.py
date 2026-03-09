from __future__ import annotations

from typing import Any

import frappe


DESK_BRANCH_ADMIN_ROLES = {"System Manager", "Administrator"}


def user_can_access_all_office_branches(user: str | None = None) -> bool:
    user_id = str(user or frappe.session.user or "").strip()
    if not user_id:
        return False
    if user_id == "Administrator":
        return True
    roles = set(frappe.get_roles(user_id) or [])
    return bool(DESK_BRANCH_ADMIN_ROLES.intersection(roles))


def get_user_office_branches(user: str | None = None, *, include_inactive: bool = False) -> list[dict[str, Any]]:
    user_id = str(user or frappe.session.user or "").strip()
    if not user_id:
        return []

    branch_filters = {} if include_inactive else {"is_active": 1}
    branch_fields = ["name", "office_branch_name", "office_branch_code", "city", "is_active"]

    if user_can_access_all_office_branches(user_id):
        return frappe.get_all(
            "AT Office Branch",
            filters=branch_filters,
            fields=branch_fields,
            order_by="office_branch_name asc",
            limit_page_length=0,
        )

    access_rows = frappe.get_all(
        "AT User Branch Access",
        filters={
            "user": user_id,
            "is_active": 1,
        },
        fields=["office_branch", "is_default"],
        order_by="is_default desc, modified desc",
        limit_page_length=0,
    )
    if not access_rows:
        return []

    branch_names = [row.office_branch for row in access_rows if row.office_branch]
    if not branch_names:
        return []

    branch_rows = frappe.get_all(
        "AT Office Branch",
        filters={"name": ["in", branch_names], **branch_filters},
        fields=branch_fields,
        order_by="office_branch_name asc",
        limit_page_length=0,
    )
    default_map = {row.office_branch: int(row.is_default or 0) for row in access_rows}
    for row in branch_rows:
        row["is_default"] = default_map.get(row.name, 0)
    return branch_rows


def get_default_office_branch(user: str | None = None) -> str | None:
    branches = get_user_office_branches(user)
    if not branches:
        return None

    for row in branches:
        if int(row.get("is_default") or 0):
            return row.get("name")
    return branches[0].get("name")


def get_allowed_office_branch_names(user: str | None = None, *, include_inactive: bool = False) -> set[str]:
    return {
        str(row.get("name")).strip()
        for row in get_user_office_branches(user, include_inactive=include_inactive)
        if str(row.get("name") or "").strip()
    }


def normalize_requested_office_branch(
    requested_office_branch: str | None = None,
    user: str | None = None,
) -> str | None:
    branch_name = str(requested_office_branch or "").strip() or None
    user_id = str(user or frappe.session.user or "").strip() or None
    if not user_id:
        return branch_name

    if user_can_access_all_office_branches(user_id):
        return branch_name

    allowed_branch_names = get_allowed_office_branch_names(user_id)
    if not allowed_branch_names:
        return None
    if not branch_name:
        return get_default_office_branch(user_id)
    if branch_name in allowed_branch_names:
        return branch_name
    return get_default_office_branch(user_id)


def assert_office_branch_access(
    requested_office_branch: str | None = None,
    user: str | None = None,
) -> str | None:
    branch_name = str(requested_office_branch or "").strip() or None
    normalized_branch = normalize_requested_office_branch(branch_name, user=user)
    if branch_name and normalized_branch != branch_name:
        frappe.throw("You are not allowed to access the selected office branch.")
    return normalized_branch
