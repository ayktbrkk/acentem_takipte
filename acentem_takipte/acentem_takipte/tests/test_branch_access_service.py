import pytest

from acentem_takipte.acentem_takipte.services import branches as branch_service


def test_normalize_requested_office_branch_keeps_requested_branch_for_all_access_user(monkeypatch):
    monkeypatch.setattr(branch_service, "user_can_access_all_office_branches", lambda user=None: True)

    assert (
        branch_service.normalize_requested_office_branch("IST-HQ", user="admin@example.com")
        == "IST-HQ"
    )


def test_normalize_requested_office_branch_falls_back_to_default_for_disallowed_branch(monkeypatch):
    monkeypatch.setattr(branch_service, "user_can_access_all_office_branches", lambda user=None: False)
    monkeypatch.setattr(branch_service, "get_allowed_office_branch_names", lambda user=None, include_inactive=False: {"ANK"} )
    monkeypatch.setattr(branch_service, "get_default_office_branch", lambda user=None: "ANK")

    assert (
        branch_service.normalize_requested_office_branch("IST-HQ", user="agent@example.com")
        == "ANK"
    )


def test_normalize_requested_office_branch_uses_default_when_request_missing(monkeypatch):
    monkeypatch.setattr(branch_service, "user_can_access_all_office_branches", lambda user=None: False)
    monkeypatch.setattr(branch_service, "get_allowed_office_branch_names", lambda user=None, include_inactive=False: {"ANK"} )
    monkeypatch.setattr(branch_service, "get_default_office_branch", lambda user=None: "ANK")

    assert branch_service.normalize_requested_office_branch(None, user="agent@example.com") == "ANK"


def test_assert_office_branch_access_raises_for_disallowed_branch(monkeypatch):
    monkeypatch.setattr(branch_service, "normalize_requested_office_branch", lambda requested_office_branch=None, user=None: "ANK")

    with pytest.raises(Exception):
        branch_service.assert_office_branch_access("IST-HQ", user="agent@example.com")
