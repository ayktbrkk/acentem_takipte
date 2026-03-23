from __future__ import annotations

import frappe

from acentem_takipte.api.security import assert_authenticated
from acentem_takipte.services.branches import (
    assert_office_branch_access,
    get_default_office_branch,
    get_user_office_branches,
    normalize_requested_office_branch,
    user_can_access_all_office_branches,
)


@frappe.whitelist()
def get_office_branches() -> dict[str, object]:
    user = assert_authenticated()
    return {
        "branches": get_user_office_branches(user),
        "default_office_branch": get_default_office_branch(user),
        "selected_office_branch": normalize_requested_office_branch(frappe.form_dict.get("office_branch"), user),
        "can_access_all": user_can_access_all_office_branches(user),
    }


@frappe.whitelist()
def validate_office_branch_access(office_branch: str | None = None) -> dict[str, object]:
    user = assert_authenticated()
    normalized_branch = assert_office_branch_access(office_branch, user=user)
    return {
        "office_branch": normalized_branch,
        "can_access_all": user_can_access_all_office_branches(user),
    }
