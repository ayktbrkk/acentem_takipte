from __future__ import annotations

from typing import Any

import frappe
from frappe.utils import add_days, cint, flt, nowdate

from acentem_takipte.acentem_takipte.platform.permissions.branches import (
    normalize_requested_office_branch,
)
from acentem_takipte.acentem_takipte.utils.statuses import (
    ATAccountingEntryStatus,
    ATReconciliationItemStatus,
)

COMMISSION_DUE_DAYS = 30


def build_reconciliation_workbench(
    *,
    status: str | None = ATReconciliationItemStatus.OPEN,
    mismatch_type: str | None = None,
    office_branch: str | None = None,
    limit: int = 100,
    commission_limit: int = 50,
    commission_page: int = 1,
    collection_limit: int = 50,
    collection_page: int = 1,
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
        # unbounded: accounting entries by branch for reconciliation scope, filtered by office branch - expected max ~10k rows
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
        # unbounded: accounting entry details for reconciliation items, filtered by entry names from result set - expected max ~500 rows
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

    scoped_entry_filter = (
        {"accounting_entry": ["in", list(set(permitted_entry_names or []))]}
        if permitted_entry_names is not None
        else {}
    )
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
                **(
                    {"office_branch": normalized_office_branch}
                    if normalized_office_branch
                    else {}
                ),
            },
        ),
    }

    overdue_payment_rows = _get_overdue_collection_rows(normalized_office_branch, limit=collection_limit, page=collection_page)
    overdue_amount_try = sum(
        flt(row.amount_try or row.amount or 0) for row in overdue_payment_rows
    )
    metrics["overdue_collections"] = len(overdue_payment_rows)
    metrics["overdue_amount_try"] = overdue_amount_try
    commission_preview_rows = _get_commission_accrual_rows(normalized_office_branch, limit=commission_limit, page=commission_page)
    metrics["commission_accrual_count"] = len(commission_preview_rows)
    metrics["commission_accrual_amount_try"] = sum(
        flt(row.get("commission_amount_try")) for row in commission_preview_rows
    )
    commission_aging = _compute_commission_aging(normalized_office_branch)
    metrics["commission_aging"] = commission_aging
    commission_by_entity = _compute_commission_by_entity(normalized_office_branch)
    metrics["commission_by_entity"] = commission_by_entity

    return {
        "rows": rows,
        "metrics": metrics,
        "collection_preview": {
            "overdue_rows": overdue_payment_rows,
            "limit": collection_limit,
            "page": collection_page,
        },
        "commission_preview": {
            "rows": commission_preview_rows,
            "limit": commission_limit,
            "page": commission_page,
            "aging": commission_aging,
            "by_entity": commission_by_entity,
        },
    }


def _get_overdue_collection_rows(office_branch: str | None, limit: int = 50, page: int = 1) -> list[dict]:
    safe_limit = max(cint(limit), 1)
    safe_page = max(cint(page), 1)
    start = max(0, (safe_page - 1) * safe_limit)
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
        limit_page_length=safe_limit,
        limit_start=start,
    )
    if installment_rows:
        for row in installment_rows:
            row["payment_no"] = (
                f"{row.payment} / {row.installment_no}/{row.installment_count}"
            )
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
        limit_page_length=safe_limit,
        limit_start=start,
    )


def _get_commission_accrual_rows(office_branch: str | None, limit: int = 50, page: int = 1) -> list[dict]:
    policy_filters: dict[str, Any] = {
        "status": ["in", ["Active", "Renewal", "Pending Renewal"]],
        "commission_amount": [">", 0],
    }
    if office_branch:
        policy_filters["office_branch"] = office_branch
    safe_limit = max(cint(limit), 1)
    safe_page = max(cint(page), 1)
    total = frappe.db.count("AT Policy", policy_filters)
    total_pages = max(1, (total + safe_limit - 1) // safe_limit) if safe_limit > 0 else 1

    rows = frappe.get_all(
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
        limit_page_length=safe_limit,
        limit_start=max(0, (safe_page - 1) * safe_limit),
    )

    for row in rows:
        row["commission_amount_try"] = flt(row.get("commission_amount", 0))

    return rows


def _compute_commission_aging(office_branch: str | None) -> dict:
    policy_filters: dict[str, Any] = {
        "status": ["in", ["Active", "Renewal", "Pending Renewal"]],
        "commission_amount": [">", 0],
    }
    if office_branch:
        policy_filters["office_branch"] = office_branch

    all_policies = frappe.get_all(
        "AT Policy",
        filters=policy_filters,
        fields=["issue_date", "commission_amount"],
        limit_page_length=2000,
    )

    today = frappe.utils.getdate(nowdate())

    buckets = {"current": 0.0, "1_30": 0.0, "31_60": 0.0, "61_90": 0.0, "90_plus": 0.0}
    total_count = 0
    total_amount = 0.0

    for p in all_policies:
        issue_date = p.get("issue_date")
        comm = flt(p.get("commission_amount"))
        days_aging = 0
        if issue_date:
            due_date = add_days(issue_date, COMMISSION_DUE_DAYS)
            days_aging = (today - due_date).days
        else:
            due_date = add_days(today, -365)
            days_aging = 365

        if days_aging <= 0:
            buckets["current"] += comm
        elif days_aging <= 30:
            buckets["1_30"] += comm
        elif days_aging <= 60:
            buckets["31_60"] += comm
        elif days_aging <= 90:
            buckets["61_90"] += comm
        else:
            buckets["90_plus"] += comm

        total_count += 1
        total_amount += comm

    return {
        "due_days": COMMISSION_DUE_DAYS,
        "total_count": total_count,
        "total_amount": round(total_amount, 2),
        "buckets": {k: round(v, 2) for k, v in buckets.items()},
    }


def _compute_commission_by_entity(office_branch: str | None) -> list[dict]:
    policy_filters: dict[str, Any] = {
        "status": ["in", ["Active", "Renewal", "Pending Renewal"]],
        "commission_amount": [">", 0],
    }
    if office_branch:
        policy_filters["office_branch"] = office_branch

    policies = frappe.get_all(
        "AT Policy",
        filters=policy_filters,
        fields=["commission_distribution", "commission_amount", "sales_entity"],
        limit_page_length=2000,
    )

    entity_totals: dict[str, dict] = {}
    for p in policies:
        dist_raw = p.get("commission_distribution") or "[]"
        try:
            distributions = json.loads(dist_raw) if isinstance(dist_raw, str) else dist_raw
        except (json.JSONDecodeError, TypeError):
            continue
        if not distributions:
            entity = p.get("sales_entity")
            entity_name = frappe.db.get_value("AT Sales Entity", entity, "full_name") or entity
            amount = flt(p.get("commission_amount", 0))
            if entity and amount > 0:
                key = str(entity)
                if key not in entity_totals:
                    entity_totals[key] = {"entity": entity, "entity_name": entity_name, "total_amount": 0.0, "policy_count": 0}
                entity_totals[key]["total_amount"] += amount
                entity_totals[key]["policy_count"] += 1
        else:
            for entry in distributions:
                entity = entry.get("entity", "")
                amount = flt(entry.get("amount_try", 0))
                if not entity or amount <= 0:
                    continue
                key = str(entity)
                if key not in entity_totals:
                    entity_totals[key] = {
                        "entity": entity,
                        "entity_name": entry.get("entity_name", entity),
                        "total_amount": 0.0,
                        "policy_count": 0,
                    }
                entity_totals[key]["total_amount"] += amount
                entity_totals[key]["policy_count"] += 1

    result = sorted(entity_totals.values(), key=lambda x: x["total_amount"], reverse=True)
    for row in result:
        row["total_amount"] = round(row["total_amount"], 2)
    return result
