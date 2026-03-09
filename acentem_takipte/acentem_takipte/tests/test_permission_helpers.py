from __future__ import annotations

from unittest.mock import patch

from acentem_takipte.acentem_takipte.utils.permissions import assert_mutation_access, build_doctype_permission_map


def test_build_doctype_permission_map_normalizes_to_tuples():
    mapping = build_doctype_permission_map(
        run_sync=("AT Accounting Entry",),
        run_payment_due=("AT Payment", "AT Notification Draft"),
    )

    assert mapping["run_sync"] == ("AT Accounting Entry",)
    assert mapping["run_payment_due"] == ("AT Payment", "AT Notification Draft")


def test_assert_mutation_access_runs_common_security_contract():
    with patch("acentem_takipte.acentem_takipte.utils.permissions.assert_authenticated", return_value="manager@example.com") as assert_authenticated_mock:
        with patch("acentem_takipte.acentem_takipte.utils.permissions.assert_post_request") as assert_post_request_mock:
            with patch("acentem_takipte.acentem_takipte.utils.permissions.assert_roles") as assert_roles_mock:
                with patch("acentem_takipte.acentem_takipte.utils.permissions.assert_doctype_permission") as assert_doctype_permission_mock:
                    with patch("acentem_takipte.acentem_takipte.utils.permissions.audit_admin_action") as audit_mock:
                        user = assert_mutation_access(
                            action="api.admin_jobs.run_payment_due_job",
                            roles=("System Manager", "Manager"),
                            doctype_permissions=("AT Payment", "AT Notification Draft"),
                            permtype="write",
                            details={"limit": 5},
                        )

    assert user == "manager@example.com"
    assert_authenticated_mock.assert_called_once()
    assert_post_request_mock.assert_called_once()
    assert_roles_mock.assert_called_once_with(
        "System Manager",
        "Manager",
        user="manager@example.com",
        message="You do not have permission to perform this action.",
    )
    assert_doctype_permission_mock.assert_any_call(
        "AT Payment",
        "write",
        "You do not have permission to perform this action for AT Payment.",
    )
    assert_doctype_permission_mock.assert_any_call(
        "AT Notification Draft",
        "write",
        "You do not have permission to perform this action for AT Notification Draft.",
    )
    audit_mock.assert_called_once_with("api.admin_jobs.run_payment_due_job", {"limit": 5})
