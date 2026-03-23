from __future__ import annotations

from unittest.mock import patch

from acentem_takipte.api import communication as communication_api


def test_dispatch_mutation_access_uses_shared_mutation_helper():
    with patch.object(communication_api, "assert_mutation_access") as mutation_access:
        communication_api._assert_dispatch_mutation_access(
            "api.communication.send_draft_now",
            details={"draft": "DRF-0001"},
            permission_targets=("AT Notification Draft",),
        )

    mutation_access.assert_called_once_with(
        action="api.communication.send_draft_now",
        roles=communication_api.COMMUNICATION_ADMIN_ROLES,
        doctype_permissions=("AT Notification Draft",),
        permtype="write",
        details={"draft": "DRF-0001"},
        role_message="You do not have permission to run communication actions.",
        post_message="Only POST requests are allowed for communication mutations.",
    )


def test_get_queue_snapshot_enforces_read_permissions(monkeypatch):
    permission_calls = []

    monkeypatch.setattr(communication_api, "assert_authenticated", lambda: "manager@example.com")
    monkeypatch.setattr(
        communication_api,
        "assert_doctype_permission",
        lambda doctype, permtype, message=None: permission_calls.append((doctype, permtype)),
    )
    monkeypatch.setattr(communication_api, "normalize_requested_office_branch", lambda office_branch=None: office_branch)
    monkeypatch.setattr(communication_api.frappe, "get_list", lambda *args, **kwargs: [])
    monkeypatch.setattr(communication_api.frappe.db, "sql", lambda *args, **kwargs: [])

    payload = communication_api.get_queue_snapshot(limit=10)

    assert payload["outbox"] == []
    assert payload["drafts"] == []
    assert permission_calls == [
        ("AT Notification Outbox", "read"),
        ("AT Notification Draft", "read"),
    ]
