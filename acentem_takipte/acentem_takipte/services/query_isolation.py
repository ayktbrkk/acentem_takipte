"""Query Isolation Service

Provides unified scope filtering for dashboard and report queries.
Combines allowed branches and allowed sales entities for query builders.
"""

from __future__ import annotations

from typing import Any

from acentem_takipte.acentem_takipte.services.branches import get_allowed_office_branch_names
from acentem_takipte.acentem_takipte.services.sales_entities import get_allowed_sales_entity_names


def build_scope_filter_for_doctype(
    doctype: str,
    user: str | None = None,
    office_branch_fieldname: str = "office_branch",
    sales_entity_fieldname: str = "sales_entity",
) -> tuple[str, list[Any]]:
    """
    Build SQL WHERE clause and parameters for doctype query isolation.

    Returns (condition_sql, params_list) suitable for frappe.db.get_list or raw SQL.

    Example with frappe.db.get_list:
        condition, params = build_scope_filter_for_doctype("AT Policy", user="user@example.com")
        result = frappe.db.get_list("AT Policy", filters=[[condition, params]], ...)

    Example with raw SQL:
        condition, params = build_scope_filter_for_doctype("AT Policy")
        sql = f"SELECT * FROM `tabAT Policy` WHERE {condition}"
        frappe.db.sql(sql, params)
    """
    allowed_branches = get_allowed_office_branch_names(user=user) or []
    allowed_sales_entities = get_allowed_sales_entity_names(user=user) or []

    if not allowed_branches and not allowed_sales_entities:
        # User has no access - return impossible condition
        return "1=0", []

    conditions = []
    params = []

    # Always add branch filter if allowed_branches is non-empty
    if allowed_branches:
        placeholders = ",".join(["%s"] * len(allowed_branches))
        conditions.append(f"`tab{doctype}`.`{office_branch_fieldname}` IN ({placeholders})")
        params.extend(allowed_branches)

    # Add sales_entity filter if doctype has that field and user has sales_entity restrictions
    if allowed_sales_entities:
        placeholders = ",".join(["%s"] * len(allowed_sales_entities))
        conditions.append(f"`tab{doctype}`.`{sales_entity_fieldname}` IN ({placeholders})")
        params.extend(allowed_sales_entities)

    # Combine conditions
    if len(conditions) == 1:
        return conditions[0], params

    # Both branch and sales_entity filters present - AND them
    combined = " AND ".join([f"({c})" for c in conditions])
    return combined, params


def build_scope_filters_dict(
    user: str | None = None,
    office_branch_fieldname: str = "office_branch",
    sales_entity_fieldname: str = "sales_entity",
) -> dict[str, Any]:
    """
    Build Frappe-compatible filter dict for doctype queries.

    Returns dict with allowed office_branch and sales_entity sets.
    Use with frappe.db.get_list filters parameter.

    Returns:
        {
            "allowed_branches": {"br_001", "br_002"},
            "allowed_sales_entities": {"se_001", "se_002"}
        }
    """
    allowed_branches = get_allowed_office_branch_names(user=user) or set()
    allowed_sales_entities = get_allowed_sales_entity_names(user=user) or set()

    return {
        "allowed_branches": allowed_branches,
        "allowed_sales_entities": allowed_sales_entities,
    }


def get_user_scope_metadata(user: str | None = None) -> dict[str, Any]:
    """
    Get detailed scope metadata for a user.

    Returns:
        {
            "user": "user@example.com",
            "branch_count": 2,
            "sales_entity_count": 3,
            "has_all_branch_access": False,
            "has_all_sales_entity_access": False,
            "branches": [...],
            "sales_entities": [...]
        }
    """
    allowed_branches = get_allowed_office_branch_names(user=user) or set()
    allowed_sales_entities = get_allowed_sales_entity_names(user=user) or set()

    return {
        "user": user,
        "branch_count": len(allowed_branches),
        "sales_entity_count": len(allowed_sales_entities),
        "has_branch_restrictions": len(allowed_branches) > 0,
        "has_sales_entity_restrictions": len(allowed_sales_entities) > 0,
        "branches": sorted(list(allowed_branches)),
        "sales_entities": sorted(list(allowed_sales_entities)),
    }
