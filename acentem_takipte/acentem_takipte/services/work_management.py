from __future__ import annotations

from typing import Any

import frappe
from frappe.utils import add_days, getdate, nowdate

from acentem_takipte.acentem_takipte.services.branches import (
    normalize_requested_office_branch,
)


def build_my_tasks_payload(
    *, office_branch: str | None = None, assigned_to: str | None = None, limit: int = 12
) -> dict[str, Any]:
    office_branch = normalize_requested_office_branch(office_branch)
    user = str(assigned_to or frappe.session.user or "").strip()
    filters: dict[str, Any] = {
        "assigned_to": user,
        "status": ["in", ["Open", "In Progress", "Blocked"]],
    }
    if office_branch:
        filters["office_branch"] = office_branch

    rows = frappe.get_list(
        "AT Task",
        fields=[
            "name",
            "task_title",
            "task_type",
            "customer",
            "customer.full_name as customer_full_name",
            "policy",
            "claim",
            "status",
            "priority",
            "due_date",
            "source_doctype",
            "source_name",
        ],
        filters=filters,
        order_by="due_date asc, `tabAT Task`.modified desc",
        limit_page_length=max(min(int(limit or 12), 50), 1),
    )
    today = getdate(nowdate())
    summary = {"total": 0, "overdue": 0, "due_today": 0, "due_soon": 0}
    for row in rows:
        due_value = row.get("due_date")
        if not due_value:
            continue
        due_date = getdate(due_value)
        summary["total"] += 1
        if due_date < today:
            summary["overdue"] += 1
        elif due_date == today:
            summary["due_today"] += 1
        elif due_date <= add_days(today, 7):
            summary["due_soon"] += 1
    return {"summary": summary, "items": rows}


def build_my_activities_payload(
    *, office_branch: str | None = None, assigned_to: str | None = None, limit: int = 12
) -> dict[str, Any]:
    office_branch = normalize_requested_office_branch(office_branch)
    user = str(assigned_to or frappe.session.user or "").strip()
    filters: dict[str, Any] = {"assigned_to": user}
    if office_branch:
        filters["office_branch"] = office_branch

    rows = frappe.get_list(
        "AT Activity",
        fields=[
            "name",
            "activity_title",
            "activity_type",
            "source_doctype",
            "source_name",
            "customer",
            "customer.full_name as customer_full_name",
            "policy",
            "claim",
            "status",
            "assigned_to",
            "activity_at",
        ],
        filters=filters,
        order_by="activity_at desc, `tabAT Activity`.modified desc",
        limit_page_length=max(min(int(limit or 12), 50), 1),
    )
    summary = {"total": len(rows), "logged": 0, "shared": 0, "archived": 0}
    for row in rows:
        status = str(row.get("status") or "")
        if status == "Logged":
            summary["logged"] += 1
        elif status == "Shared":
            summary["shared"] += 1
        elif status == "Archived":
            summary["archived"] += 1
    return {"summary": summary, "items": rows}


def build_my_reminders_payload(
    *, office_branch: str | None = None, assigned_to: str | None = None, limit: int = 12
) -> dict[str, Any]:
    office_branch = normalize_requested_office_branch(office_branch)
    user = str(assigned_to or frappe.session.user or "").strip()
    filters: dict[str, Any] = {"assigned_to": user, "status": "Open"}
    if office_branch:
        filters["office_branch"] = office_branch

    rows = frappe.get_list(
        "AT Reminder",
        fields=[
            "name",
            "reminder_title",
            "source_doctype",
            "source_name",
            "customer",
            "customer.full_name as customer_full_name",
            "policy",
            "claim",
            "assigned_to",
            "status",
            "priority",
            "remind_at",
        ],
        filters=filters,
        order_by="remind_at asc, `tabAT Reminder`.modified desc",
        limit_page_length=max(min(int(limit or 12), 50), 1),
    )
    today = getdate(nowdate())
    summary = {"total": len(rows), "overdue": 0, "due_today": 0, "due_soon": 0}
    for row in rows:
        remind_at = row.get("remind_at")
        if not remind_at:
            continue
        remind_date = getdate(remind_at)
        if remind_date < today:
            summary["overdue"] += 1
        elif remind_date == today:
            summary["due_today"] += 1
        elif remind_date <= add_days(today, 7):
            summary["due_soon"] += 1
    return {"summary": summary, "items": rows}
