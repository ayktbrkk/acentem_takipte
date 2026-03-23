from __future__ import annotations

from unittest.mock import patch

from acentem_takipte.api import accounting as accounting_api


def test_accounting_mutation_access_uses_shared_mutation_helper():
    with patch.object(accounting_api, "assert_mutation_access") as mutation_access:
        accounting_api._assert_accounting_mutation_access(
            "api.accounting.run_sync",
            details={"limit": 10},
            permission_targets=("AT Accounting Entry",),
        )

    mutation_access.assert_called_once_with(
        action="api.accounting.run_sync",
        roles=accounting_api.ACCOUNTING_ADMIN_ROLES,
        doctype_permissions=("AT Accounting Entry",),
        permtype="write",
        details={"limit": 10},
        role_message="You do not have permission to run accounting operations.",
        post_message="Only POST requests are allowed for accounting mutations.",
    )
