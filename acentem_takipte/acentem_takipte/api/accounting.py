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
    assert_doc_permission,
    assert_doctype_permission,
    assert_post_request,
    assert_roles,
    audit_admin_action,
)

ACCOUNTING_ADMIN_ROLES = ("System Manager", "Manager", "Accountant")


@frappe.whitelist()
def get_reconciliation_workbench(
    status: str | None = ATReconciliationItemStatus.OPEN,
    mismatch_type: str | None = None,
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

    limit = max(cint(limit), 1)
    filters = {}
    if status:
        filters["status"] = status
    if mismatch_type:
        filters["mismatch_type"] = mismatch_type

    rows = frappe.get_all(
        "AT Reconciliation Item",
        filters=filters,
        fields=[
            "name",
            "accounting_entry",
            "source_doctype",
            "source_name",
            "status",
            "mismatch_type",
            "local_amount_try",
            "external_amount_try",
            "difference_try",
            "resolution_action",
            "notes",
            "resolved_by",
            "resolved_on",
            "modified",
        ],
        order_by="modified desc",
        limit_page_length=limit,
    )

    entry_map = {}
    entry_names = [row.accounting_entry for row in rows if row.accounting_entry]
    if entry_names:
        entries = frappe.get_all(
            "AT Accounting Entry",
            filters={"name": ["in", list(set(entry_names))]},
            fields=[
                "name",
                "entry_type",
                "status",
                "policy",
                "customer",
                "insurance_company",
                "currency",
                "external_ref",
                "last_synced_on",
            ],
            limit_page_length=0,
        )
        entry_map = {entry.name: entry for entry in entries}

    for row in rows:
        row["accounting"] = entry_map.get(row.accounting_entry, {})

    metrics = {
        "open": frappe.db.count("AT Reconciliation Item", {"status": ATReconciliationItemStatus.OPEN}),
        "resolved": frappe.db.count("AT Reconciliation Item", {"status": ATReconciliationItemStatus.RESOLVED}),
        "ignored": frappe.db.count("AT Reconciliation Item", {"status": ATReconciliationItemStatus.IGNORED}),
        "failed_entries": frappe.db.count("AT Accounting Entry", {"status": ATAccountingEntryStatus.FAILED}),
    }

    return {
        "rows": rows,
        "metrics": metrics,
    }


@frappe.whitelist()
def run_sync(limit: int = 200) -> dict[str, int]:
    assert_authenticated()
    assert_post_request()
    assert_roles(
        *ACCOUNTING_ADMIN_ROLES,
        message="You do not have permission to run accounting sync operations.",
    )
    assert_doctype_permission(
        "AT Accounting Entry",
        "write",
        "You do not have permission to run accounting sync operations.",
    )
    audit_admin_action("api.accounting.run_sync", {"limit": max(cint(limit), 1)})
    return sync_accounting_entries(limit=limit)


@frappe.whitelist()
def run_reconciliation_job(limit: int = 400) -> dict[str, int]:
    assert_authenticated()
    assert_post_request()
    assert_roles(
        *ACCOUNTING_ADMIN_ROLES,
        message="You do not have permission to run reconciliation operations.",
    )
    assert_doctype_permission(
        "AT Reconciliation Item",
        "write",
        "You do not have permission to run reconciliation operations.",
    )
    audit_admin_action("api.accounting.run_reconciliation_job", {"limit": max(cint(limit), 1)})
    return run_reconciliation(limit=limit)


@frappe.whitelist()
def resolve_item(item_name: str, resolution_action: str = "Matched", notes: str | None = None) -> dict[str, str]:
    assert_authenticated()
    assert_post_request()
    assert_roles(
        *ACCOUNTING_ADMIN_ROLES,
        message="You do not have permission to resolve reconciliation items.",
    )
    assert_doctype_permission(
        "AT Reconciliation Item",
        "write",
        "You do not have permission to resolve reconciliation items.",
    )
    item_name = str(item_name or "").strip()
    if item_name:
        # Enforce document-level permission before calling the internal service, which saves with ignore_permissions.
        assert_doc_permission("AT Reconciliation Item", item_name, "write")
    audit_admin_action(
        "api.accounting.resolve_item",
        {
            "item_name": item_name,
            "resolution_action": resolution_action or "Matched",
        },
    )
    return resolve_reconciliation_item(
        item_name=item_name,
        resolution_action=resolution_action,
        notes=notes,
    )
