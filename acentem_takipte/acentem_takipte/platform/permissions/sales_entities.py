from __future__ import annotations

from collections import defaultdict, deque
from typing import Any

import frappe
from frappe.utils import getdate, today

from acentem_takipte.acentem_takipte.services import branches as branch_service


DESK_ENTITY_ADMIN_ROLES = {"System Manager", "Administrator"}
DEFAULT_SCOPE_MODE = "self_only"
DESCENDANT_SCOPE_MODE = "self_and_descendants"
SCOPE_ENTITY_CACHE_KEY = "at_scope::{user}::sales_entities"
POOL_ENTITY_OPEN_RECORD_CONFIG = (
    {
        "doctype": "AT Lead",
        "fieldname": "sales_entity",
        "status_fieldname": "status",
        "open_statuses": ("Draft", "Open", "Replied"),
    },
    {
        "doctype": "AT Offer",
        "fieldname": "sales_entity",
        "status_fieldname": "status",
        "open_statuses": ("Draft", "Sent", "Accepted"),
    },
    {
        "doctype": "AT Policy",
        "fieldname": "sales_entity",
        "status_fieldname": "status",
        "open_statuses": ("Active", "KYT"),
    },
    {
        "doctype": "AT Payment",
        "fieldname": "sales_entity",
        "status_fieldname": "status",
        "open_statuses": ("Draft",),
    },
)


def user_can_access_all_sales_entities(user: str | None = None) -> bool:
    user_id = str(user or frappe.session.user or "").strip()
    if not user_id:
        return False
    if user_id == "Administrator":
        return True
    roles = set(frappe.get_roles(user_id) or [])
    return bool(DESK_ENTITY_ADMIN_ROLES.intersection(roles))


def clear_user_scope_cache(user: str | None) -> None:
    branch_service.clear_user_scope_cache(user)


def get_allowed_sales_entity_names(
    user: str | None = None, *, include_inactive: bool = False
) -> set[str]:
    user_id = str(user or frappe.session.user or "").strip()
    if not user_id:
        return set()

    if user_can_access_all_sales_entities(user_id):
        return _get_all_sales_entity_names(include_inactive=include_inactive)

    if not frappe.db.exists("DocType", "AT User Sales Entity Access"):
        return set()

    cached = _get_cached_allowed_sales_entities(user_id)
    if cached is not None:
        return cached

    access_rows = _get_user_sales_entity_access_rows(user_id)
    direct_entity_names = {
        str(row.get("sales_entity") or "").strip()
        for row in access_rows
        if str(row.get("sales_entity") or "").strip()
    }
    descendant_seed_names = {
        str(row.get("sales_entity") or "").strip()
        for row in access_rows
        if str(row.get("sales_entity") or "").strip()
        and str(row.get("scope_mode") or DEFAULT_SCOPE_MODE).strip()
        == DESCENDANT_SCOPE_MODE
    }

    allowed_names = set(direct_entity_names)
    if descendant_seed_names:
        allowed_names.update(
            _get_descendant_sales_entity_names(
                descendant_seed_names, include_inactive=include_inactive
            )
        )

    _set_cached_allowed_sales_entities(user_id, allowed_names)
    return allowed_names


def get_default_sales_entity(user: str | None = None) -> str | None:
    user_id = str(user or frappe.session.user or "").strip()
    if not user_id:
        return None

    for row in _get_user_sales_entity_access_rows(user_id):
        entity_name = str(row.get("sales_entity") or "").strip()
        if entity_name and int(row.get("is_default") or 0):
            return entity_name
    return None


def normalize_requested_sales_entity(
    requested_sales_entity: str | None = None,
    user: str | None = None,
) -> str | None:
    entity_name = str(requested_sales_entity or "").strip() or None
    user_id = str(user or frappe.session.user or "").strip() or None
    if not user_id:
        return entity_name

    if user_can_access_all_sales_entities(user_id):
        return entity_name

    allowed_names = get_allowed_sales_entity_names(user_id)
    if not allowed_names:
        return None
    if not entity_name:
        return get_default_sales_entity(user_id)
    if entity_name in allowed_names:
        return entity_name
    return get_default_sales_entity(user_id)


def _get_all_sales_entity_names(*, include_inactive: bool) -> set[str]:
    filters: dict[str, Any] = {}
    if not include_inactive and frappe.db.has_column("AT Sales Entity", "is_active"):
        filters["is_active"] = 1

    # unbounded: all sales entity names for pool lookup, bounded by total sales entity count - expected max ~10k rows
    rows = frappe.get_all(
        "AT Sales Entity",
        filters=filters,
        fields=["name"],
        order_by="name asc",
        limit_page_length=0,
    )
    return {
        str(row.get("name") or "").strip()
        for row in rows
        if str(row.get("name") or "").strip()
    }


def _get_user_sales_entity_access_rows(user_id: str) -> list[dict[str, Any]]:
    fields = ["sales_entity", "is_default"]
    if frappe.db.has_column("AT User Sales Entity Access", "scope_mode"):
        fields.append("scope_mode")
    if frappe.db.has_column("AT User Sales Entity Access", "valid_until"):
        fields.append("valid_until")

    # unbounded: user sales entity access rows, bounded by user's direct access grants - expected max ~50 rows
    rows = frappe.get_all(
        "AT User Sales Entity Access",
        filters={"user": user_id, "is_active": 1},
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


def _get_descendant_sales_entity_names(
    seed_sales_entity_names: set[str],
    *,
    include_inactive: bool = False,
) -> set[str]:
    if not seed_sales_entity_names:
        return set()

    filters: dict[str, Any] = {}
    if not include_inactive and frappe.db.has_column("AT Sales Entity", "is_active"):
        filters["is_active"] = 1

    # unbounded: sales entity hierarchy traversal, bounded by total sales entity count - expected max ~10k rows
    rows = frappe.get_all(
        "AT Sales Entity",
        filters=filters,
        fields=["name", "parent_entity"],
        order_by="name asc",
        limit_page_length=0,
    )
    if not rows:
        return set()

    children_by_parent: dict[str, set[str]] = defaultdict(set)
    known_names: set[str] = set()
    for row in rows:
        entity_name = str(row.get("name") or "").strip()
        parent_name = str(row.get("parent_entity") or "").strip()
        if not entity_name:
            continue
        known_names.add(entity_name)
        if parent_name:
            children_by_parent[parent_name].add(entity_name)

    expanded = {name for name in seed_sales_entity_names if name in known_names}
    queue = deque(expanded)
    while queue:
        parent_name = queue.popleft()
        for child_name in children_by_parent.get(parent_name, set()):
            if child_name in expanded:
                continue
            expanded.add(child_name)
            queue.append(child_name)
    return expanded


def _cache_key_for_user(user_id: str) -> str:
    return SCOPE_ENTITY_CACHE_KEY.format(user=user_id)


def _get_cached_allowed_sales_entities(user_id: str) -> set[str] | None:
    try:
        cached = frappe.cache().get_value(_cache_key_for_user(user_id))
    except (RuntimeError, TypeError, AttributeError):
        return None

    if isinstance(cached, list):
        return {str(v).strip() for v in cached if str(v).strip()}
    return None


def _set_cached_allowed_sales_entities(user_id: str, allowed_names: set[str]) -> None:
    try:
        frappe.cache().set_value(_cache_key_for_user(user_id), sorted(allowed_names))
    except (RuntimeError, TypeError, AttributeError):
        return


def is_office_branch_active(office_branch: str | None) -> bool:
    office_branch_name = str(office_branch or "").strip()
    if not office_branch_name:
        return False
    if not frappe.db.has_column("AT Office Branch", "is_active"):
        return True
    return bool(
        frappe.db.get_value("AT Office Branch", office_branch_name, "is_active") or 0
    )


def get_pool_sales_entity_name(
    office_branch: str | None,
    *,
    include_inactive: bool = False,
    exclude_sales_entity: str | None = None,
) -> str | None:
    office_branch_name = str(office_branch or "").strip()
    if not office_branch_name or not frappe.db.has_column("AT Sales Entity", "is_pool"):
        return None

    filters: dict[str, Any] = {"office_branch": office_branch_name, "is_pool": 1}
    excluded_name = str(exclude_sales_entity or "").strip()
    if excluded_name:
        filters["name"] = ["!=", excluded_name]
    if not include_inactive and frappe.db.has_column("AT Sales Entity", "is_active"):
        filters["is_active"] = 1

    pool_name = frappe.db.get_value(
        "AT Sales Entity",
        filters,
        "name",
        order_by="creation asc",
    )
    return str(pool_name or "").strip() or None


def create_pool_sales_entity(
    office_branch: str,
    *,
    full_name: str | None = None,
    is_active: int | bool = 1,
) -> str:
    office_branch_name = str(office_branch or "").strip()
    if not office_branch_name:
        raise ValueError("office_branch is required")

    existing = get_pool_sales_entity_name(office_branch_name, include_inactive=True)
    if existing:
        return existing

    branch_label = (
        frappe.db.get_value(
            "AT Office Branch", office_branch_name, "office_branch_name"
        )
        or office_branch_name
    )
    doc = frappe.get_doc(
        {
            "doctype": "AT Sales Entity",
            "entity_type": "Agency",
            "full_name": str(full_name or "").strip() or f"{branch_label} Pool",
            "office_branch": office_branch_name,
            "is_active": int(bool(is_active)),
            "is_pool": 1,
        }
    )
    # ignore_permissions: Pool entity creation during setup; called from admin migration patch.
    doc.insert(ignore_permissions=True)
    return str(doc.name)


def reassign_sales_entity_records_to_branch_pool(
    sales_entity: str | None,
    *,
    office_branch: str | None = None,
    include_inactive_pool: bool = True,
) -> dict[str, int]:
    sales_entity_name = str(sales_entity or "").strip()
    if not sales_entity_name:
        return {}

    branch_name = str(office_branch or "").strip()
    if not branch_name:
        branch_name = str(
            frappe.db.get_value("AT Sales Entity", sales_entity_name, "office_branch")
            or ""
        ).strip()
    if not branch_name:
        return {}

    pool_entity = get_pool_sales_entity_name(
        branch_name,
        include_inactive=include_inactive_pool,
        exclude_sales_entity=sales_entity_name,
    )
    if not pool_entity or pool_entity == sales_entity_name:
        return {}

    updates: dict[str, int] = {}
    for config in POOL_ENTITY_OPEN_RECORD_CONFIG:
        doctype = str(config.get("doctype") or "").strip()
        fieldname = str(config.get("fieldname") or "").strip()
        status_fieldname = str(config.get("status_fieldname") or "").strip()
        open_statuses = list(config.get("open_statuses") or [])
        if not doctype or not fieldname:
            continue

        filters: dict[str, Any] = {fieldname: sales_entity_name}
        if branch_name and frappe.db.has_column(doctype, "office_branch"):
            filters["office_branch"] = branch_name
        if (
            status_fieldname
            and open_statuses
            and frappe.db.has_column(doctype, status_fieldname)
        ):
            filters[status_fieldname] = ["in", open_statuses]

        # unbounded: reconciliation batch processing, filtered by sales entity and open statuses - expected max ~10k rows
        rows = frappe.get_all(
            doctype, filters=filters, fields=["name"], limit_page_length=0
        )
        if not rows:
            continue

        valid_names = [
            str(r.get("name") or "").strip()
            for r in rows
            if str(r.get("name") or "").strip()
        ]
        if not valid_names:
            continue

        # Batch UPDATE instead of per-row set_value loop (N+1 fix)
        frappe.db.sql(
            f"UPDATE `tab{doctype}` SET `{fieldname}` = %s WHERE name IN %s",
            (pool_entity, tuple(valid_names)),
        )
        updates[doctype] = len(valid_names)

    return updates


def deactivate_branch_sales_entities_and_reassign(
    office_branch: str | None,
) -> dict[str, int]:
    branch_name = str(office_branch or "").strip()
    if not branch_name:
        return {}

    pool_entity = get_pool_sales_entity_name(branch_name, include_inactive=True)
    if not pool_entity:
        pool_entity = create_pool_sales_entity(branch_name, is_active=0)

    totals: dict[str, int] = {}
    # unbounded: branch sales entities for deactivation, bounded by branch's entity count - expected max ~1k rows
    entity_rows = frappe.get_all(
        "AT Sales Entity",
        filters={"office_branch": branch_name},
        fields=["name", "is_pool"],
        limit_page_length=0,
        order_by="creation asc",
    )
    for row in entity_rows:
        entity_name = str(row.get("name") or "").strip()
        if not entity_name:
            continue
        if entity_name != pool_entity:
            updates = reassign_sales_entity_records_to_branch_pool(
                entity_name,
                office_branch=branch_name,
                include_inactive_pool=True,
            )
            for doctype, count in updates.items():
                totals[doctype] = totals.get(doctype, 0) + count
        if frappe.db.has_column("AT Sales Entity", "is_active"):
            frappe.db.set_value(
                "AT Sales Entity",
                entity_name,
                "is_active",
                0,
                update_modified=False,
            )

    return totals


def handle_sales_entity_update(doc=None, method=None):
    branch_service.invalidate_scope_cache_for_hierarchy_change(doc, method)
    if not doc or not frappe.db.has_column("AT Sales Entity", "is_active"):
        return
    if not _field_changed(doc, "is_active"):
        return

    previous_active = _coerce_int(_get_previous_value(doc, "is_active"), default=1)
    current_active = _coerce_int(getattr(doc, "is_active", 1), default=1)
    if previous_active == 1 and current_active == 0:
        reassign_sales_entity_records_to_branch_pool(
            getattr(doc, "name", None),
            office_branch=getattr(doc, "office_branch", None),
            include_inactive_pool=True,
        )


def handle_office_branch_update(doc=None, method=None):
    branch_service.invalidate_scope_cache_for_hierarchy_change(doc, method)
    if not doc or not frappe.db.has_column("AT Office Branch", "is_active"):
        return
    if not _field_changed(doc, "is_active"):
        return

    previous_active = _coerce_int(_get_previous_value(doc, "is_active"), default=1)
    current_active = _coerce_int(getattr(doc, "is_active", 1), default=1)
    if previous_active == 1 and current_active == 0:
        deactivate_branch_sales_entities_and_reassign(getattr(doc, "name", None))


def handle_user_update(doc=None, method=None):
    if not doc:
        return

    user_id = str(getattr(doc, "name", "") or "").strip()
    if not user_id:
        return

    if not _field_changed(doc, "enabled"):
        return

    previous_enabled = _coerce_int(_get_previous_value(doc, "enabled"), default=1)
    current_enabled = _coerce_int(getattr(doc, "enabled", 1), default=1)
    if previous_enabled == 1 and current_enabled == 0:
        branch_service.clear_user_scope_cache(user_id)
        reassign_user_owned_records_to_branch_pools(user_id)


def reassign_user_owned_records_to_branch_pools(user: str | None) -> dict[str, int]:
    user_id = str(user or "").strip()
    if not user_id:
        return {}

    entity_rows = (
        # unbounded: user sales entity access for reassignment, bounded by user's entity assignments - expected max ~100 rows
        frappe.get_all(
            "AT User Sales Entity Access",
            filters={"user": user_id, "is_active": 1},
            fields=["sales_entity"],
            limit_page_length=0,
        )
        if frappe.db.exists("DocType", "AT User Sales Entity Access")
        else []
    )

    totals: dict[str, int] = {}
    seen_entities: set[str] = set()
    for row in entity_rows:
        entity_name = str(row.get("sales_entity") or "").strip()
        if not entity_name or entity_name in seen_entities:
            continue
        seen_entities.add(entity_name)
        updates = reassign_sales_entity_records_to_branch_pool(
            entity_name, include_inactive_pool=True
        )
        for doctype, count in updates.items():
            totals[doctype] = totals.get(doctype, 0) + count

    if frappe.db.has_column("AT Customer", "assigned_agent"):
        # unbounded: customers assigned to disabled user, bounded by user's customer assignments - expected max ~10k rows
        customer_rows = frappe.get_all(
            "AT Customer",
            filters={"assigned_agent": user_id},
            fields=["name"],
            limit_page_length=0,
        )
        valid_names = [
            str(r.get("name") or "").strip()
            for r in customer_rows
            if str(r.get("name") or "").strip()
        ]
        if valid_names:
            # Batch UPDATE: clear assigned_agent for all customers owned by disabled user
            frappe.db.sql(
                "UPDATE `tabAT Customer` SET `assigned_agent` = NULL WHERE name IN %s",
                (tuple(valid_names),),
            )
            totals["AT Customer"] = len(valid_names)

    return totals


def _field_changed(doc, fieldname: str) -> bool:
    try:
        return bool(doc.has_value_changed(fieldname))
    except Exception:
        return _get_previous_value(doc, fieldname) != getattr(doc, fieldname, None)


def _get_previous_value(doc, fieldname: str):
    try:
        previous = doc.get_doc_before_save()
    except Exception:
        previous = None
    return getattr(previous, fieldname, None) if previous else None


def _coerce_int(value, *, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default
