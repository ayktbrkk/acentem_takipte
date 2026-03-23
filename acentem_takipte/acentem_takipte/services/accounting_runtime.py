from __future__ import annotations

from typing import Any

import frappe
from frappe.utils import cint, flt, nowdate

from acentem_takipte.acentem_takipte.services.branches import normalize_requested_office_branch
from acentem_takipte.acentem_takipte.utils.statuses import ATAccountingEntryStatus, ATReconciliationItemStatus


def build_reconciliation_workbench(
    *,
    status: str | None = ATReconciliationItemStatus.OPEN,
    mismatch_type: str | None = None,
    office_branch: str | None = None,
    limit: int = 100,
) -> dict[str, Any]:
    safe_limit = max(cint(limit), 1)
    filters = {}
    if status:
        filters["status"] = status
    if mismatch_type:
        filters["mismatch_type"] = mismatch_type
    normalized_office_branch = normalize_requested_office_branch(office_branch)

    permitted_entry_names = None
    if normalized_office_branch:
        permitted_entry_names = frappe.get_all(
            "AT Accounting Entry",
            filters={"office_branch": normalized_office_branch},
            pluck="name",
            limit_page_length=0,
        )
        if not permitted_entry_names:
            return {
                "rows": [],
                "metrics": {
                    "open": 0,
                    "resolved": 0,
                    "ignored": 0,
                    "failed_entries": 0,
                },
            }
        filters["accounting_entry"] = ["in", list(set(permitted_entry_names))]

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
        limit_page_length=safe_limit,
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

    scoped_entry_filter = {"accounting_entry": ["in", list(set(permitted_entry_names or []))]} if permitted_entry_names is not None else {}
    metrics = {
        "open": frappe.db.count(
            "AT Reconciliation Item",
            {
                "status": ATReconciliationItemStatus.OPEN,
                **scoped_entry_filter,
            },
        ),
        "resolved": frappe.db.count(
            "AT Reconciliation Item",
            {
                "status": ATReconciliationItemStatus.RESOLVED,
                **scoped_entry_filter,
            },
        ),
        "ignored": frappe.db.count(
            "AT Reconciliation Item",
            {
                "status": ATReconciliationItemStatus.IGNORED,
                **scoped_entry_filter,
            },
        ),
        "failed_entries": frappe.db.count(
            "AT Accounting Entry",
            {
                "status": ATAccountingEntryStatus.FAILED,
                **({"office_branch": normalized_office_branch} if normalized_office_branch else {}),
            },
        ),
    }

    overdue_payment_rows = _get_overdue_collection_rows(normalized_office_branch)
    overdue_amount_try = sum(flt(row.amount_try or row.amount or 0) for row in overdue_payment_rows)
    metrics["overdue_collections"] = len(overdue_payment_rows)
    metrics["overdue_amount_try"] = overdue_amount_try
    commission_preview_rows = _get_commission_accrual_rows(normalized_office_branch)
    metrics["commission_accrual_count"] = len(commission_preview_rows)
    metrics["commission_accrual_amount_try"] = sum(flt(row.get("commission_amount_try")) for row in commission_preview_rows)

    return {
        "rows": rows,
        "metrics": metrics,
        "collection_preview": {
            "overdue_rows": overdue_payment_rows,
        },
        "commission_preview": {
            "rows": commission_preview_rows,
        },
    }


def _get_overdue_collection_rows(office_branch: str | None) -> list[dict]:
    installment_filters: dict[str, Any] = {
        "status": ["in", ["Scheduled", "Overdue"]],
        "due_date": ["<", nowdate()],
    }
    if office_branch:
        installment_filters["office_branch"] = office_branch

    installment_rows = frappe.get_all(
        "AT Payment Installment",
        filters=installment_filters,
        fields=[
            "name",
            "payment",
            "customer",
            "policy",
            "status",
            "due_date",
            "currency",
            "amount",
            "amount_try",
            "office_branch",
            "installment_no",
            "installment_count",
        ],
        order_by="due_date asc, modified desc",
        limit_page_length=10,
    )
    if installment_rows:
        for row in installment_rows:
            row["payment_no"] = f"{row.payment} / {row.installment_no}/{row.installment_count}"
        return installment_rows

    overdue_payment_filters: dict[str, Any] = {
        "payment_direction": "Inbound",
        "status": ["not in", ["Paid", "Cancelled"]],
        "due_date": ["<", nowdate()],
    }
    if office_branch:
        overdue_payment_filters["office_branch"] = office_branch

    return frappe.get_all(
        "AT Payment",
        filters=overdue_payment_filters,
        fields=[
            "name",
            "payment_no",
            "customer",
            "policy",
            "status",
            "due_date",
            "currency",
            "amount",
            "amount_try",
            "office_branch",
        ],
        order_by="due_date asc, modified desc",
        limit_page_length=10,
    )


def _get_commission_accrual_rows(office_branch: str | None) -> list[dict]:
    policy_filters: dict[str, Any] = {
        "status": ["in", ["Active", "Renewal", "Pending Renewal"]],
        "commission_amount": [">", 0],
    }
    if office_branch:
        policy_filters["office_branch"] = office_branch

    return frappe.get_all(
        "AT Policy",
        filters=policy_filters,
        fields=[
            "name",
            "policy_no",
            "customer",
            "insurance_company",
            "status",
            "commission_amount",
            "office_branch",
        ],
        order_by="commission_amount desc, modified desc",
        limit_page_length=10,
    )

