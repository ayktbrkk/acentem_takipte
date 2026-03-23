from __future__ import annotations

from unittest.mock import patch

import frappe

from acentem_takipte.acentem_takipte.services.branches import (
    get_default_office_branch,
    get_user_office_branches,
    user_can_access_all_office_branches,
)


def test_user_can_access_all_office_branches_for_system_manager():
    with patch.object(frappe, "get_roles", return_value=["System Manager"]):
        assert user_can_access_all_office_branches("manager@example.com") is True


def test_get_user_office_branches_returns_access_rows_for_normal_user():
    access_rows = [frappe._dict(office_branch="BR-1", is_default=1)]
    branch_rows = [frappe._dict(name="BR-1", office_branch_name="Istanbul", office_branch_code="IST", city="Istanbul", is_active=1)]

    with patch("acentem_takipte.services.branches.user_can_access_all_office_branches", return_value=False):
        with patch.object(frappe, "get_all", side_effect=[access_rows, branch_rows]):
            rows = get_user_office_branches("agent@example.com")

    assert rows[0]["name"] == "BR-1"
    assert rows[0]["is_default"] == 1


def test_get_default_office_branch_prefers_default_flag():
    with patch(
        "acentem_takipte.services.branches.get_user_office_branches",
        return_value=[
            {"name": "BR-1", "is_default": 0},
            {"name": "BR-2", "is_default": 1},
        ],
    ):
        assert get_default_office_branch("agent@example.com") == "BR-2"

