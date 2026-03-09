from __future__ import annotations

import frappe
from frappe.utils import cint

from acentem_takipte.acentem_takipte.accounting import (
    resolve_reconciliation_item,
    run_reconciliation,
    sync_accounting_entries,
)
from acentem_takipte.acentem_takipte.utils.statuses import ATAccountingEntryStatus, ATReconciliationItemStatus
from acentem_takipte.acentem_takipte.api.security import (
    assert_authenticated,
    assert_doctype_permission,
    assert_doc_permission,
)
from acentem_takipte.acentem_takipte.api.mutation_access import assert_role_based_write_access
from acentem_takipte.acentem_takipte.services.accounting_runtime import build_reconciliation_workbench
from acentem_takipte.acentem_takipte.utils.permissions import build_doctype_permission_map

ACCOUNTING_ADMIN_ROLES = ("System Manager", "Manager", "Accountant")
ACCOUNTING_MUTATION_DOCTYPES = build_doctype_permission_map(
    run_sync=("AT Accounting Entry",),
    run_reconciliation_job=("AT Reconciliation Item",),
    resolve_item=("AT Reconciliation Item",),
)


def _assert_accounting_mutation_access(action: str, *, details: dict | None = None, permission_targets: tuple[str, ...]) -> None:
    assert_role_based_write_access(
        action=action,
        roles=ACCOUNTING_ADMIN_ROLES,
        permission_targets=permission_targets,
        details=details,
        role_message="You do not have permission to run accounting operations.",
        post_message="Only POST requests are allowed for accounting mutations.",
    )


@frappe.whitelist()
def get_reconciliation_workbench(
    status: str | None = ATReconciliationItemStatus.OPEN,
    mismatch_type: str | None = None,
    office_branch: str | None = None,
    limit: int = 100,
) -> dict:
    assert_authenticated()
    assert_doctype_permission(
        "AT Reconciliation Item",
        "read",
        "You do not have permission to view reconciliation items.",
    )
    assert_doctype_permission(
        "AT Accounting Entry",
        "read",
        "You do not have permission to view accounting entries.",
    )
    return build_reconciliation_workbench(
        status=status,
        mismatch_type=mismatch_type,
        office_branch=office_branch,
        limit=limit,
    )


@frappe.whitelist()
def run_sync(limit: int = 200) -> dict[str, int]:
    safe_limit = max(cint(limit), 1)
    _assert_accounting_mutation_access(
        "api.accounting.run_sync",
        details={"limit": safe_limit},
        permission_targets=ACCOUNTING_MUTATION_DOCTYPES["run_sync"],
    )
    return sync_accounting_entries(limit=limit)


@frappe.whitelist()
def run_reconciliation_job(limit: int = 400) -> dict[str, int]:
    safe_limit = max(cint(limit), 1)
    _assert_accounting_mutation_access(
        "api.accounting.run_reconciliation_job",
        details={"limit": safe_limit},
        permission_targets=ACCOUNTING_MUTATION_DOCTYPES["run_reconciliation_job"],
    )
    return run_reconciliation(limit=limit)


@frappe.whitelist()
def resolve_item(item_name: str, resolution_action: str = "Matched", notes: str | None = None) -> dict[str, str]:
    item_name = str(item_name or "").strip()
    _assert_accounting_mutation_access(
        "api.accounting.resolve_item",
        details={
            "item_name": item_name,
            "resolution_action": resolution_action or "Matched",
        },
        permission_targets=ACCOUNTING_MUTATION_DOCTYPES["resolve_item"],
    )
    if item_name:
        # Enforce document-level permission before calling the internal service, which saves with ignore_permissions.
        assert_doc_permission("AT Reconciliation Item", item_name, "write")
    return resolve_reconciliation_item(
        item_name=item_name,
        resolution_action=resolution_action,
        notes=notes,
    )
