from __future__ import annotations

from acentem_takipte.acentem_takipte.api import branches as branches_api


def test_get_office_branches_returns_normalized_selected_branch(monkeypatch):
    monkeypatch.setattr(branches_api, "assert_authenticated", lambda: "agent@example.com")
    monkeypatch.setattr(branches_api, "get_user_office_branches", lambda user: [{"name": "ANK"}])
    monkeypatch.setattr(branches_api, "get_default_office_branch", lambda user: "ANK")
    monkeypatch.setattr(branches_api, "user_can_access_all_office_branches", lambda user: False)
    monkeypatch.setattr(branches_api, "normalize_requested_office_branch", lambda office_branch=None, user=None: "ANK")
    monkeypatch.setattr(branches_api.frappe, "form_dict", {"office_branch": "IST"})

    payload = branches_api.get_office_branches()

    assert payload["selected_office_branch"] == "ANK"


def test_validate_office_branch_access_returns_validated_branch(monkeypatch):
    monkeypatch.setattr(branches_api, "assert_authenticated", lambda: "agent@example.com")
    monkeypatch.setattr(branches_api, "assert_office_branch_access", lambda office_branch=None, user=None: "ANK")
    monkeypatch.setattr(branches_api, "user_can_access_all_office_branches", lambda user: False)

    payload = branches_api.validate_office_branch_access("ANK")

    assert payload["office_branch"] == "ANK"
    assert payload["can_access_all"] is False

