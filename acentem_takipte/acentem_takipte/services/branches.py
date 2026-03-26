from __future__ import annotations

from typing import Any
from collections import defaultdict, deque

import frappe
from frappe.utils import getdate, today

from acentem_takipte.acentem_takipte.utils.cache_keys import (
    all_scope_cache_key_patterns,
)


DESK_BRANCH_ADMIN_ROLES = {"System Manager", "Administrator"}
DEFAULT_SCOPE_MODE = "self_only"
DESCENDANT_SCOPE_MODE = "self_and_descendants"


def clear_user_scope_cache(user: str | None) -> None:
    user_id = str(user or "").strip()
    if not user_id:
        return

    cache = frappe.cache()
    for cache_key in all_scope_cache_key_patterns(user_id):
        cache.delete_value(cache_key)

    # Notify active sessions so the client can refresh branch scope immediately.
    frappe.publish_realtime(
        "at_scope_changed",
        {"user": user_id},
        user=user_id,
        after_commit=True,
    )


def invalidate_scope_cache_for_access_doc(doc, method=None):
    clear_user_scope_cache(getattr(doc, "user", None))


def _collect_scope_users_from_access_tables() -> set[str]:
    users: set[str] = set()

    # unbounded: scope precomputation, bounded by user's branch access count - expected max ~10k rows
    for row in frappe.get_all(
        "AT User Branch Access", fields=["user"], limit_page_length=0
    ):
        user_id = str(row.get("user") or "").strip()
        if user_id:
            users.add(user_id)

    if frappe.db.exists("DocType", "AT User Sales Entity Access"):
        # unbounded: scope precomputation, bounded by user's sales entity access count - expected max ~10k rows
        for row in frappe.get_all(
            "AT User Sales Entity Access", fields=["user"], limit_page_length=0
        ):
            user_id = str(row.get("user") or "").strip()
            if user_id:
                users.add(user_id)

    return users


def invalidate_scope_cache_for_hierarchy_change(doc=None, method=None):
    for user_id in _collect_scope_users_from_access_tables():
        clear_user_scope_cache(user_id)


def user_can_access_all_office_branches(user: str | None = None) -> bool:
    user_id = str(user or frappe.session.user or "").strip()
    if not user_id:
        return False
    if user_id == "Administrator":
        return True
    roles = set(frappe.get_roles(user_id) or [])
    return bool(DESK_BRANCH_ADMIN_ROLES.intersection(roles))


def get_user_office_branches(
    user: str | None = None, *, include_inactive: bool = False
) -> list[dict[str, Any]]:
    user_id = str(user or frappe.session.user or "").strip()
    if not user_id:
        return []

    branch_filters = {} if include_inactive else {"is_active": 1}
    branch_fields = [
        "name",
        "office_branch_name",
        "office_branch_code",
        "parent_office_branch",
        "is_head_office",
        "city",
        "is_active",
    ]

    if user_can_access_all_office_branches(user_id):
        # unbounded: admin user branch list, bounded by total office branch count - expected max ~500 rows
        return frappe.get_all(
            "AT Office Branch",
            filters=branch_filters,
            fields=branch_fields,
            order_by="office_branch_name asc",
            limit_page_length=0,
        )

    access_rows = _get_user_branch_access_rows(user_id)
    if not access_rows:
        return []

    direct_branch_names = {
        str(row.get("office_branch") or "").strip()
        for row in access_rows
        if str(row.get("office_branch") or "").strip()
    }
    descendant_seed_names = {
        str(row.get("office_branch") or "").strip()
        for row in access_rows
        if str(row.get("office_branch") or "").strip()
        and str(row.get("scope_mode") or DEFAULT_SCOPE_MODE).strip()
        == DESCENDANT_SCOPE_MODE
    }

    branch_names = set(direct_branch_names)
    if descendant_seed_names:
        branch_names.update(
            _get_descendant_branch_names(
                descendant_seed_names, include_inactive=include_inactive
            )
        )

    if not branch_names:
        return []

    # unbounded: scoped branch list for user, bounded by allowed branch names set - expected max ~500 rows
    branch_rows = frappe.get_all(
        "AT Office Branch",
        filters={"name": ["in", sorted(branch_names)], **branch_filters},
        fields=branch_fields,
        order_by="office_branch_name asc",
        limit_page_length=0,
    )
    default_map = {
        str(row.get("office_branch") or "").strip(): int(row.get("is_default") or 0)
        for row in access_rows
    }
    for row in branch_rows:
        row["is_default"] = default_map.get(row.name, 0)
    return branch_rows


def _get_user_branch_access_rows(user_id: str) -> list[dict[str, Any]]:
    fields = ["office_branch", "is_default"]
    if frappe.db.has_column("AT User Branch Access", "scope_mode"):
        fields.append("scope_mode")
    if frappe.db.has_column("AT User Branch Access", "valid_until"):
        fields.append("valid_until")

    # unbounded: user branch access rows, bounded by user's direct access grants - expected max ~50 rows
    rows = frappe.get_all(
        "AT User Branch Access",
        filters={
            "user": user_id,
            "is_active": 1,
        },
        fields=fields,
        order_by="is_default desc, modified desc",
        limit_page_length=0,
    )
    try:
        today_date = getdate(today())
    except Exception:
        today_date = None
    normalized_rows: list[dict[str, Any]] = []
    for row in rows:
        row["scope_mode"] = (
            str(row.get("scope_mode") or DEFAULT_SCOPE_MODE).strip()
            or DEFAULT_SCOPE_MODE
        )
        valid_until = row.get("valid_until")
        if valid_until and today_date and getdate(valid_until) < today_date:
            continue
        normalized_rows.append(row)
    return normalized_rows


def _get_descendant_branch_names(
    seed_branch_names: set[str],
    *,
    include_inactive: bool = False,
) -> set[str]:
    if not seed_branch_names:
        return set()

    branch_filters = {} if include_inactive else {"is_active": 1}
    # unbounded: branch hierarchy traversal, bounded by total office branch count - expected max ~500 rows
    rows = frappe.get_all(
        "AT Office Branch",
        filters=branch_filters,
        fields=["name", "parent_office_branch"],
        order_by="name asc",
        limit_page_length=0,
    )
    if not rows:
        return set()

    children_by_parent = defaultdict(set)
    known_names = set()
    for row in rows:
        branch_name = str(row.get("name") or "").strip()
        parent_name = str(row.get("parent_office_branch") or "").strip()
        if not branch_name:
            continue
        known_names.add(branch_name)
        if parent_name:
            children_by_parent[parent_name].add(branch_name)

    expanded = set(name for name in seed_branch_names if name in known_names)
    queue = deque(expanded)
    while queue:
        parent_name = queue.popleft()
        for child_name in children_by_parent.get(parent_name, set()):
            if child_name in expanded:
                continue
            expanded.add(child_name)
            queue.append(child_name)
    return expanded


def get_default_office_branch(user: str | None = None) -> str | None:
    branches = get_user_office_branches(user)
    if not branches:
        return None

    for row in branches:
        if int(row.get("is_default") or 0):
            return row.get("name")
    return branches[0].get("name")


def get_allowed_office_branch_names(
    user: str | None = None, *, include_inactive: bool = False
) -> set[str]:
    return {
        str(row.get("name")).strip()
        for row in get_user_office_branches(user, include_inactive=include_inactive)
        if str(row.get("name") or "").strip()
    }


def normalize_requested_office_branch(
    requested_office_branch: str | None = None,
    user: str | None = None,
) -> str | None:
    branch_name = str(requested_office_branch or "").strip() or None
    user_id = str(user or frappe.session.user or "").strip() or None
    if not user_id:
        return branch_name

    if user_can_access_all_office_branches(user_id):
        return branch_name

    allowed_branch_names = get_allowed_office_branch_names(user_id)
    if not allowed_branch_names:
        return None
    if not branch_name:
        return get_default_office_branch(user_id)
    if branch_name in allowed_branch_names:
        return branch_name
    return get_default_office_branch(user_id)


def assert_office_branch_access(
    requested_office_branch: str | None = None,
    user: str | None = None,
) -> str | None:
    branch_name = str(requested_office_branch or "").strip() or None
    normalized_branch = normalize_requested_office_branch(branch_name, user=user)
    if branch_name and normalized_branch != branch_name:
        frappe.throw("You are not allowed to access the selected office branch.")
    return normalized_branch


def get_scope_hash(user: str | None = None) -> str:
    """Return a short, stable hash that represents the current user's access scope.

    When the scope changes (branch access added / removed), the hash rotates
    automatically because it is derived from the live allowed-branch set.  Any
    report cache entry keyed with the old hash becomes unreachable and expires
    via TTL — no explicit deletion is required.
    """
    import hashlib

    user_id = str(user or frappe.session.user or "").strip()
    if not user_id or user_id == "Guest":
        return "guest"
    if user_can_access_all_office_branches(user_id):
        return "admin"

    branch_names = sorted(get_allowed_office_branch_names(user_id))
    parts = ["branches:" + ",".join(branch_names)]

    if frappe.db.exists("DocType", "AT User Sales Entity Access"):
        # unbounded: user sales entity access for scope hash, bounded by user's entity assignments - expected max ~100 rows
        entity_rows = frappe.get_all(
            "AT User Sales Entity Access",
            filters={"user": user_id, "is_active": 1},
            fields=["sales_entity"],
            limit_page_length=0,
        )
        entities = sorted(
            str(r.get("sales_entity") or "").strip()
            for r in entity_rows
            if str(r.get("sales_entity") or "").strip()
        )
        parts.append("entities:" + ",".join(entities))

    return hashlib.sha256("|".join(parts).encode()).hexdigest()[:16]
