from __future__ import annotations

from typing import Any

import frappe
from frappe.utils import add_days, getdate, nowdate

from acentem_takipte.acentem_takipte.services.branches import normalize_requested_office_branch


def build_my_tasks_payload(*, office_branch: str | None = None, assigned_to: str | None = None, limit: int = 12) -> dict[str, Any]:
    office_branch = normalize_requested_office_branch(office_branch)
    user = str(assigned_to or frappe.session.user or "").strip()
    filters: dict[str, Any] = {"assigned_to": user, "status": ["in", ["Open", "In Progress", "Blocked"]]}
    if office_branch:
        filters["office_branch"] = office_branch

    rows = frappe.get_list(
        "AT Task",
        fields=["name", "task_title", "task_type", "customer", "policy", "claim", "status", "priority", "due_date", "source_doctype", "source_name"],
        filters=filters,
        order_by="due_date asc, modified desc",
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
