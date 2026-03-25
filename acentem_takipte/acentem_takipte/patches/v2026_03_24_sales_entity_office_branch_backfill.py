from __future__ import annotations

import frappe


def execute():
    if not frappe.db.has_column("AT Sales Entity", "office_branch"):
        return

    default_branch = _pick_default_branch()
    if not default_branch:
        return

    rows = frappe.get_all(
        "AT Sales Entity",
        fields=["name", "parent_entity", "office_branch"],
        order_by="creation asc",
        limit_page_length=0,
    )
    if not rows:
        return

    branch_by_entity = {
        str(row.get("name") or "").strip(): str(row.get("office_branch") or "").strip()
        for row in rows
        if str(row.get("name") or "").strip()
    }

    for row in rows:
        name = str(row.get("name") or "").strip()
        if not name:
            continue
        if str(row.get("office_branch") or "").strip():
            continue

        parent_name = str(row.get("parent_entity") or "").strip()
        parent_branch = branch_by_entity.get(parent_name, "").strip() if parent_name else ""
        chosen_branch = parent_branch or default_branch
        if not chosen_branch:
            continue

        frappe.db.set_value(
            "AT Sales Entity",
            name,
            "office_branch",
            chosen_branch,
            update_modified=False,
        )
        branch_by_entity[name] = chosen_branch


def _pick_default_branch() -> str | None:
    head_office_name = frappe.db.get_value(
        "AT Office Branch",
        {"is_head_office": 1},
        "name",
    )
    if head_office_name:
        return str(head_office_name).strip() or None

    first_active = frappe.db.get_value(
        "AT Office Branch",
        {"is_active": 1},
        "name",
        order_by="creation asc",
    )
    if first_active:
        return str(first_active).strip() or None

    first_any = frappe.db.get_value("AT Office Branch", {}, "name", order_by="creation asc")
    return str(first_any).strip() or None if first_any else None
