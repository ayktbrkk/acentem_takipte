from __future__ import annotations

from typing import Any

import frappe
from frappe.utils import cint, getdate, nowdate


OPEN_RENEWAL_STATUSES = {"Open", "In Progress"}
OPEN_ASSIGNMENT_STATUSES = {"Open", "In Progress"}
OPEN_CLAIM_STATUSES = {"Open", "Under Review", "Approved"}


def build_follow_up_sla_payload(
    *,
    office_branch: str | None = None,
    allowed_customers: list[str] | None = None,
    preview_limit: int = 8,
) -> dict[str, Any]:
    today = getdate(nowdate())
    preview_rows: list[dict[str, Any]] = []

    for row in _get_claim_follow_ups(office_branch=office_branch, allowed_customers=allowed_customers):
        preview_rows.append(_build_preview_row("claim", row.get("name"), row.get("next_follow_up_on"), row.get("customer"), row.get("claim_status")))
    for row in _get_renewal_follow_ups(office_branch=office_branch, allowed_customers=allowed_customers):
        preview_rows.append(_build_preview_row("renewal", row.get("name"), row.get("due_date"), row.get("customer"), row.get("status")))
    for row in _get_assignment_follow_ups(office_branch=office_branch, allowed_customers=allowed_customers):
        preview_rows.append(_build_preview_row("assignment", row.get("name"), row.get("due_date"), row.get("customer"), row.get("status"), assignee=row.get("assigned_to")))
    for row in _get_call_note_follow_ups(office_branch=office_branch, allowed_customers=allowed_customers):
        preview_rows.append(_build_preview_row("call_note", row.get("name"), row.get("next_follow_up_on"), row.get("customer"), row.get("call_status")))

    normalized_rows = []
    overdue = 0
    due_today = 0
    due_soon = 0
    for row in preview_rows:
        due_value = row.get("follow_up_on")
        if not due_value:
            continue
        try:
            follow_up_on = getdate(due_value)
        except Exception:
            continue
        delta = (follow_up_on - today).days
        next_row = {**row, "follow_up_on": follow_up_on.isoformat(), "days_delta": delta}
        normalized_rows.append(next_row)
        if delta < 0:
            overdue += 1
        elif delta == 0:
            due_today += 1
        elif delta <= 7:
            due_soon += 1

    normalized_rows.sort(key=lambda row: (row.get("days_delta", 9999), str(row.get("follow_up_on") or ""), str(row.get("source_type") or "")))
    return {
        "summary": {
            "total": len(normalized_rows),
            "overdue": overdue,
            "due_today": due_today,
            "due_soon": due_soon,
        },
        "items": normalized_rows[: max(cint(preview_limit), 1)],
    }


def _get_claim_follow_ups(*, office_branch: str | None, allowed_customers: list[str] | None) -> list[dict[str, Any]]:
    filters: dict[str, Any] = {"claim_status": ["in", sorted(OPEN_CLAIM_STATUSES)], "next_follow_up_on": ["is", "set"]}
    if office_branch:
        filters["office_branch"] = office_branch
    if allowed_customers is not None:
        filters["customer"] = ["in", allowed_customers or ["__none__"]]
    return frappe.get_list("AT Claim", fields=["name", "customer", "customer.full_name as customer_full_name", "claim_status", "next_follow_up_on"], filters=filters, order_by="next_follow_up_on asc, modified desc", limit_page_length=50)


def _get_renewal_follow_ups(*, office_branch: str | None, allowed_customers: list[str] | None) -> list[dict[str, Any]]:
    filters: dict[str, Any] = {"status": ["in", sorted(OPEN_RENEWAL_STATUSES)], "due_date": ["is", "set"]}
    if office_branch:
        filters["office_branch"] = office_branch
    if allowed_customers is not None:
        filters["customer"] = ["in", allowed_customers or ["__none__"]]
    return frappe.get_list("AT Renewal Task", fields=["name", "customer", "customer.full_name as customer_full_name", "status", "due_date"], filters=filters, order_by="due_date asc, modified desc", limit_page_length=50)


def _get_assignment_follow_ups(*, office_branch: str | None, allowed_customers: list[str] | None) -> list[dict[str, Any]]:
    if not frappe.db.exists("DocType", "AT Ownership Assignment"):
        return []
    filters: dict[str, Any] = {"status": ["in", sorted(OPEN_ASSIGNMENT_STATUSES)], "due_date": ["is", "set"]}
    if office_branch:
        filters["office_branch"] = office_branch
    if allowed_customers is not None:
        filters["customer"] = ["in", allowed_customers or ["__none__"]]
    return frappe.get_list("AT Ownership Assignment", fields=["name", "customer", "customer.full_name as customer_full_name", "status", "assigned_to", "due_date"], filters=filters, order_by="due_date asc, modified desc", limit_page_length=50)


def _get_call_note_follow_ups(*, office_branch: str | None, allowed_customers: list[str] | None) -> list[dict[str, Any]]:
    if not frappe.db.exists("DocType", "AT Call Note"):
        return []
    filters: dict[str, Any] = {"next_follow_up_on": ["is", "set"]}
    if office_branch:
        filters["office_branch"] = office_branch
    if allowed_customers is not None:
        filters["customer"] = ["in", allowed_customers or ["__none__"]]
    return frappe.get_list("AT Call Note", fields=["name", "customer", "customer.full_name as customer_full_name", "call_status", "next_follow_up_on"], filters=filters, order_by="next_follow_up_on asc, modified desc", limit_page_length=50)


def _build_preview_row(
    source_type: str,
    source_name: str | None,
    follow_up_on,
    customer: str | None,
    status: str | None,
    *,
    assignee: str | None = None,
) -> dict[str, Any]:
    return {
        "source_type": source_type,
        "source_name": source_name,
        "follow_up_on": follow_up_on,
        "customer": customer,
        "status": status,
        "assigned_to": assignee,
    }
