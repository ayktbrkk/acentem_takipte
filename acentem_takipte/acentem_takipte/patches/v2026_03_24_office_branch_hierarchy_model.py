from __future__ import annotations

import frappe


DEFAULT_SCOPE_MODE = "self_only"
PREFERRED_HEAD_OFFICE_NAMES = ("AT Sigorta", "Kip Sigorta")


def execute():
    head_branch_name = _ensure_single_head_office()
    _normalize_parent_links(head_branch_name)
    _normalize_scope_modes()
    _normalize_user_default_branches()


def _ensure_single_head_office() -> str | None:
    if not frappe.db.has_column("AT Office Branch", "is_head_office"):
        return None

    # unbounded: all office branches for head office normalization, bounded by total branch count - expected max ~500 rows
    rows = frappe.get_all(
        "AT Office Branch",
        fields=["name", "office_branch_name", "is_head_office"],
        order_by="creation asc",
        limit_page_length=0,
    )
    if not rows:
        return None

    preferred_by_name = {
        str(row.get("office_branch_name") or "").strip(): str(
            row.get("name") or ""
        ).strip()
        for row in rows
        if str(row.get("name") or "").strip()
    }
    for preferred_name in PREFERRED_HEAD_OFFICE_NAMES:
        chosen = preferred_by_name.get(preferred_name)
        if chosen:
            _set_head_flags(rows, chosen)
            return chosen

    explicit_heads = [
        str(row.get("name") or "").strip()
        for row in rows
        if int(row.get("is_head_office") or 0) == 1
        and str(row.get("name") or "").strip()
    ]
    if explicit_heads:
        chosen = explicit_heads[0]
        _set_head_flags(rows, chosen)
        return chosen

    chosen = str(rows[0].get("name") or "").strip()
    if not chosen:
        return None
    _set_head_flags(rows, chosen)
    return chosen


def _set_head_flags(rows: list[dict], chosen_head_name: str) -> None:
    for row in rows:
        branch_name = str(row.get("name") or "").strip()
        if not branch_name:
            continue
        is_head = 1 if branch_name == chosen_head_name else 0
        frappe.db.set_value(
            "AT Office Branch",
            branch_name,
            "is_head_office",
            is_head,
            update_modified=False,
        )
        if is_head:
            frappe.db.set_value(
                "AT Office Branch",
                branch_name,
                "parent_office_branch",
                None,
                update_modified=False,
            )


def _normalize_parent_links(head_branch_name: str | None) -> None:
    if not head_branch_name:
        return

    # unbounded: all office branches for parent link normalization, bounded by total branch count - expected max ~500 rows
    rows = frappe.get_all(
        "AT Office Branch",
        fields=["name", "parent_office_branch"],
        order_by="creation asc",
        limit_page_length=0,
    )
    for row in rows:
        branch_name = str(row.get("name") or "").strip()
        if not branch_name or branch_name == head_branch_name:
            continue

        parent_name = str(row.get("parent_office_branch") or "").strip()
        if not parent_name or parent_name == branch_name:
            frappe.db.set_value(
                "AT Office Branch",
                branch_name,
                "parent_office_branch",
                head_branch_name,
                update_modified=False,
            )


def _normalize_scope_modes() -> None:
    if not frappe.db.has_column("AT User Branch Access", "scope_mode"):
        return

    # unbounded: all branch access rows for scope mode normalization, bounded by total access count - expected max ~10k rows
    rows = frappe.get_all(
        "AT User Branch Access",
        fields=["name", "scope_mode"],
        order_by="creation asc",
        limit_page_length=0,
    )
    for row in rows:
        scope_mode = str(row.get("scope_mode") or "").strip()
        if scope_mode:
            continue
        frappe.db.set_value(
            "AT User Branch Access",
            row.get("name"),
            "scope_mode",
            DEFAULT_SCOPE_MODE,
            update_modified=False,
        )


def _normalize_user_default_branches() -> None:
    # unbounded: distinct active users from branch access, bounded by total access count - expected max ~10k rows
    users = frappe.get_all(
        "AT User Branch Access",
        filters={"is_active": 1},
        fields=["user"],
        distinct=True,
        limit_page_length=0,
    )
    user_ids = sorted(
        {
            str(row.get("user") or "").strip()
            for row in users
            if str(row.get("user") or "").strip()
        }
    )
    for user_id in user_ids:
        # unbounded: per-user branch access rows for default normalization, bounded by user's access grants - expected max ~50 rows
        access_rows = frappe.get_all(
            "AT User Branch Access",
            filters={"user": user_id, "is_active": 1},
            fields=["name", "is_default", "modified"],
            order_by="is_default desc, modified asc",
            limit_page_length=0,
        )
        if not access_rows:
            continue

        chosen_name = str(access_rows[0].get("name") or "").strip()
        for row in access_rows:
            row_name = str(row.get("name") or "").strip()
            if not row_name:
                continue
            should_be_default = 1 if row_name == chosen_name else 0
            if int(row.get("is_default") or 0) == should_be_default:
                continue
            frappe.db.set_value(
                "AT User Branch Access",
                row_name,
                "is_default",
                should_be_default,
                update_modified=False,
            )
