from __future__ import annotations

from datetime import datetime, time
from types import SimpleNamespace
from typing import Any

import frappe as _frappe
from frappe.utils import add_days, get_datetime, getdate, nowdate


DEFAULT_ASSIGNED_TO = "Administrator"


class _FrappeProxy:
    def __init__(self, target):
        object.__setattr__(self, "_target", target)

    def _flags(self):
        target = object.__getattribute__(self, "_target")
        try:
            flags = target.flags
        except RuntimeError:
            flags = None

        if flags is None:
            if not hasattr(target.local, "flags") or target.local.flags is None:
                target.local.flags = target._dict()
            flags = target.local.flags

        if not hasattr(flags, "in_import"):
            flags.in_import = False
        return flags

    def __getattr__(self, name):
        if name == "flags":
            return self._flags()
        return getattr(object.__getattribute__(self, "_target"), name)

    def __setattr__(self, name, value):
        if name == "_target":
            object.__setattr__(self, name, value)
            return
        if name == "flags":
            target = object.__getattribute__(self, "_target")
            target.local.flags = value if value is not None else SimpleNamespace()
            if not hasattr(target.local.flags, "in_import"):
                target.local.flags.in_import = False
            return
        setattr(object.__getattribute__(self, "_target"), name, value)

    def __delattr__(self, name):
        if name == "flags":
            target = object.__getattribute__(self, "_target")
            if hasattr(target.local, "flags"):
                delattr(target.local, "flags")
            return
        delattr(object.__getattribute__(self, "_target"), name)


frappe = _FrappeProxy(_frappe)


def _insert_named(values: dict[str, Any]):
    previous = getattr(frappe.flags, "in_import", False)
    try:
        frappe.flags.in_import = True
        return frappe.get_doc(values).insert(ignore_permissions=True)
    finally:
        frappe.flags.in_import = previous


def _first_row(doctype: str, *, filters: dict[str, Any] | None = None, fields: list[str] | None = None):
    rows = frappe.get_all(
        doctype,
        filters=filters or {},
        fields=fields or ["name"],
        order_by="modified desc",
        limit_page_length=1,
    )
    return rows[0] if rows else None


def _payment_candidates() -> list[dict[str, Any]]:
    return frappe.get_all(
        "AT Payment",
        filters={"payment_direction": "Inbound", "payment_purpose": "Premium Collection"},
        fields=["name", "due_date", "payment_date", "status", "payment_purpose", "payment_direction"],
        order_by="modified desc",
        limit_page_length=10,
    )


def _set_value(doctype: str, name: str, fieldname: str, value: Any) -> None:
    frappe.db.set_value(doctype, name, fieldname, value, update_modified=False)


def _align_sales_action_rows(*, assigned_to: str, today) -> dict[str, Any]:
    summary: dict[str, Any] = {"task": None, "reminder": None, "warnings": []}

    lead = _first_row("AT Lead", fields=["name"])
    offer = _first_row("AT Offer", fields=["name"])
    task = _first_row("AT Task", fields=["name", "task_type"])
    reminder = _first_row("AT Reminder", fields=["name"])

    if not lead or not task:
        summary["warnings"].append("Missing AT Lead or AT Task row for sales action alignment.")
    else:
        _set_value("AT Task", task["name"], "assigned_to", assigned_to)
        _set_value("AT Task", task["name"], "status", "Open")
        _set_value("AT Task", task["name"], "source_doctype", "AT Lead")
        _set_value("AT Task", task["name"], "source_name", lead["name"])
        _set_value("AT Task", task["name"], "due_date", today)
        if not task.get("task_type"):
            _set_value("AT Task", task["name"], "task_type", "Follow Up")
        summary["task"] = task["name"]

    if not offer or not reminder:
        summary["warnings"].append("Missing AT Offer or AT Reminder row for sales reminder alignment.")
    else:
        remind_at = get_datetime(datetime.combine(add_days(today, 1), time(hour=10, minute=0)))
        _set_value("AT Reminder", reminder["name"], "assigned_to", assigned_to)
        _set_value("AT Reminder", reminder["name"], "status", "Open")
        _set_value("AT Reminder", reminder["name"], "source_doctype", "AT Offer")
        _set_value("AT Reminder", reminder["name"], "source_name", offer["name"])
        _set_value("AT Reminder", reminder["name"], "remind_at", remind_at)
        summary["reminder"] = reminder["name"]

    return summary


def _align_collection_rows(*, today) -> dict[str, Any]:
    summary: dict[str, Any] = {"due_today": None, "overdue": None, "warnings": []}
    candidates = _payment_candidates()
    if len(candidates) < 2:
        summary["warnings"].append("Need at least two inbound premium-collection payments for collection risk alignment.")
        return summary

    due_today_row = candidates[0]
    overdue_row = next((row for row in candidates[1:] if row["name"] != due_today_row["name"]), None)
    if overdue_row is None:
        summary["warnings"].append("Could not find a second distinct payment row for overdue alignment.")
        return summary

    for name, target_date in ((due_today_row["name"], today), (overdue_row["name"], add_days(today, -1))):
        _set_value("AT Payment", name, "status", "Draft")
        _set_value("AT Payment", name, "payment_direction", "Inbound")
        _set_value("AT Payment", name, "payment_purpose", "Premium Collection")
        _set_value("AT Payment", name, "payment_date", target_date)
        _set_value("AT Payment", name, "due_date", target_date)

    summary["due_today"] = due_today_row["name"]
    summary["overdue"] = overdue_row["name"]
    return summary


def run(
    *,
    seed_count: int = 5,
    preserve_templates: bool = True,
    print_output: bool = True,
    only_if_name_like: str | None = "Demo%",
    force: bool = False,
    assigned_to: str = DEFAULT_ASSIGNED_TO,
):
    """Prepare repeatable local dashboard demo rows for visual verification.

    This script is intentionally local/dev-oriented. It aligns a small set of
    existing AT demo rows with the dashboard's runtime filters so Sales action
    and Collections risk cards stay visible in WSL/local verification.
    """

    today = getdate(nowdate())
    summary = {
        "ok": True,
        "seed_count": int(seed_count or 5),
        "preserve_templates": bool(preserve_templates),
        "only_if_name_like": only_if_name_like,
        "force": bool(force),
        "assigned_to": assigned_to,
        "sales": _align_sales_action_rows(assigned_to=assigned_to, today=today),
        "collections": _align_collection_rows(today=today),
    }
    frappe.db.commit()
    frappe.clear_cache()

    if print_output:
        print(summary)
    return summary


if __name__ == "__main__":
    run(
        seed_count=globals().get("SEED_COUNT", 5),
        preserve_templates=bool(globals().get("PRESERVE_TEMPLATES", 1)),
        print_output=True,
        only_if_name_like=globals().get("ONLY_IF_NAME_LIKE", "Demo%"),
        force=bool(globals().get("FORCE_PURGE", 0)),
    )