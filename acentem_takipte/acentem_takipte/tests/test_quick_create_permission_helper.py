from __future__ import annotations

from unittest.mock import patch

from frappe import _

from acentem_takipte.api import quick_create as quick_create_api


def test_assert_create_permission_uses_shared_mutation_helper():
    with patch.object(quick_create_api, "assert_mutation_access") as mutation_access:
        quick_create_api._assert_create_permission("AT Customer", _("Create denied"))

    mutation_access.assert_called_once_with(
        action="api.quick_create.create_at_customer",
        roles=("System Manager", "Manager", "Agent", "Accountant"),
        doctype_permissions=("AT Customer",),
        permtype="create",
        details={"doctype": "AT Customer", "permtype": "create"},
        role_message="Create denied",
        post_message="Only POST requests are allowed for quick create/update operations.",
    )


def test_assert_write_permission_uses_shared_mutation_helper():
    with patch.object(quick_create_api, "assert_mutation_access") as mutation_access:
        quick_create_api._assert_write_permission("AT Notification Template", _("Write denied"))

    mutation_access.assert_called_once_with(
        action="api.quick_create.update_at_notification_template",
        roles=("System Manager", "Manager", "Agent", "Accountant"),
        doctype_permissions=("AT Notification Template",),
        permtype="write",
        details={"doctype": "AT Notification Template", "permtype": "write"},
        role_message="Write denied",
        post_message="Only POST requests are allowed for quick create/update operations.",
    )
