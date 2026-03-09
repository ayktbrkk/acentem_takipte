from __future__ import annotations

from unittest.mock import patch

from acentem_takipte.acentem_takipte.api import branches as branch_api


def test_get_office_branches_returns_branch_access_payload():
    with patch.object(branch_api, "assert_authenticated", return_value="agent@example.com"):
        with patch.object(
            branch_api,
            "get_user_office_branches",
            return_value=[{"name": "BR-1", "office_branch_name": "Istanbul", "is_default": 1}],
        ):
            with patch.object(branch_api, "get_default_office_branch", return_value="BR-1"):
                with patch.object(branch_api, "user_can_access_all_office_branches", return_value=False):
                    payload = branch_api.get_office_branches()

    assert payload["default_office_branch"] == "BR-1"
    assert payload["can_access_all"] is False
    assert payload["branches"][0]["name"] == "BR-1"
