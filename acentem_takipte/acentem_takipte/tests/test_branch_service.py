from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

import frappe

from acentem_takipte.acentem_takipte.services import branches as branch_service
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

    with patch.object(branch_service, "user_can_access_all_office_branches", return_value=False):
        with patch.object(branch_service.frappe, "get_all", side_effect=[access_rows, branch_rows]):
            with patch.object(branch_service.frappe, "db", SimpleNamespace(has_column=lambda doctype, fieldname: False)):
                rows = get_user_office_branches("agent@example.com")

    assert rows[0]["name"] == "BR-1"
    assert rows[0]["is_default"] == 1


def test_get_default_office_branch_prefers_default_flag():
    with patch.object(
        branch_service,
        "get_user_office_branches",
        return_value=[
            {"name": "BR-1", "is_default": 0},
            {"name": "BR-2", "is_default": 1},
        ],
    ):
        assert get_default_office_branch("agent@example.com") == "BR-2"


def test_get_user_office_branches_expands_descendant_scope():
    access_rows = [frappe._dict(office_branch="HQ", is_default=1, scope_mode=branch_service.DESCENDANT_SCOPE_MODE)]
    branch_rows = [
        frappe._dict(name="HQ", office_branch_name="AT Sigorta", office_branch_code="AT-MRK", parent_office_branch="", is_head_office=1, city="Istanbul", is_active=1),
        frappe._dict(name="SUB-1", office_branch_name="Ankara", office_branch_code="ANK", parent_office_branch="HQ", is_head_office=0, city="Ankara", is_active=1),
        frappe._dict(name="SUB-2", office_branch_name="Izmir", office_branch_code="IZM", parent_office_branch="HQ", is_head_office=0, city="Izmir", is_active=1),
    ]

    with patch.object(branch_service, "user_can_access_all_office_branches", return_value=False):
        with patch.object(branch_service, "_get_user_branch_access_rows", return_value=access_rows):
            with patch.object(branch_service, "_get_descendant_branch_names", return_value={"SUB-1", "SUB-2"}):
                with patch.object(branch_service.frappe, "get_all", return_value=branch_rows):
                    rows = get_user_office_branches("agent@example.com")

    assert [row["name"] for row in rows] == ["HQ", "SUB-1", "SUB-2"]
    assert rows[0]["is_default"] == 1


def test_get_user_branch_access_rows_ignores_expired_valid_until(monkeypatch):
    monkeypatch.setattr(branch_service, "today", lambda: "2026-03-25")
    monkeypatch.setattr(
        branch_service.frappe,
        "db",
        SimpleNamespace(has_column=lambda doctype, fieldname: fieldname in {"scope_mode", "valid_until"}),
    )
    monkeypatch.setattr(
        branch_service.frappe,
        "get_all",
        lambda *args, **kwargs: [
            {"office_branch": "BR-1", "is_default": 1, "scope_mode": "self_only", "valid_until": "2026-03-24"},
            {"office_branch": "BR-2", "is_default": 0, "scope_mode": "self_and_descendants", "valid_until": "2026-03-26"},
        ],
    )

    rows = branch_service._get_user_branch_access_rows("agent@example.com")

    assert [row["office_branch"] for row in rows] == ["BR-2"]

