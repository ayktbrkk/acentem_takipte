"""Query Isolation Service

Provides unified scope filtering for dashboard and report queries.
Combines allowed branches and allowed sales entities for query builders.
"""

from __future__ import annotations

from typing import Any

from acentem_takipte.acentem_takipte.platform.permissions.branches import get_allowed_office_branch_names
from acentem_takipte.acentem_takipte.platform.permissions.sales_entities import get_allowed_sales_entity_names


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


# === Merged from report_isolation.py ===
"""Report Isolation Service

Provides scope-aware report building and filtering for Reports API.
Integrates with query_isolation and dashboard_security to ensure reports
respect user's branch and sales_entity scope.
"""

from __future__ import annotations

import frappe

from acentem_takipte.acentem_takipte.api.v2 import dashboard_security
from acentem_takipte.acentem_takipte.platform.permissions.query_isolation import (
    build_scope_filters_dict,
    get_user_scope_metadata,
)


def get_report_scope_context(user: str | None = None) -> dict:
    """
    Get scope context for applying to report filters.
    
    Returns dict with user's branch and sales_entity restrictions:
    {
        "allowed_branches": [...],
        "allowed_sales_entities": [...],
        "user_scope_meta": {...}
    }
    """
    if user is None:
        user = frappe.session.user
    
    scope_filters = build_scope_filters_dict(user=user)
    scope_meta = get_user_scope_metadata(user=user)
    
    return {
        "allowed_branches": list(scope_filters.get("allowed_branches") or []),
        "allowed_sales_entities": list(scope_filters.get("allowed_sales_entities") or []),
        "user_scope_meta": scope_meta,
    }


def apply_scope_filters_to_report(
    report_key: str,
    filters: dict | None = None,
    user: str | None = None,
    auto_add_branch_filter: bool = True,
    auto_add_sales_entity_filter: bool = True,
) -> dict:
    """
    Apply user's scope filters to report parameters.
    
    Enhances the filters dict with branch and sales_entity restrictions
    if the user has limited access.
    
    Args:
        report_key: Name of the report
        filters: Existing filter dict (will be enhanced)
        user: User to get scope for (default: current user)
        auto_add_branch_filter: Automatically add office_branch filter
        auto_add_sales_entity_filter: Automatically add sales_entity filter
    
    Returns:
        Enhanced filters dict with scope applied
    """
    if user is None:
        user = frappe.session.user
    
    if filters is None:
        filters = {}
    
    # Get user's scope restrictions (these functions use frappe.session.user internally)
    allowed_customers, customer_meta = dashboard_security.allowed_customers_for_user(
        include_meta=True
    )
    allowed_sales_entities, sales_entity_meta = dashboard_security.allowed_sales_entities_for_user(
        include_meta=True
    )
    
    # If user has customer scope restrictions, add them to filters
    if allowed_customers is not None and allowed_customers:
        if "customer_list" not in filters:
            filters["customer_list"] = allowed_customers
    
    # If user has sales_entity scope restrictions, add them to filters
    if allowed_sales_entities is not None and allowed_sales_entities and auto_add_sales_entity_filter:
        if "sales_entity_list" not in filters:
            filters["sales_entity_list"] = allowed_sales_entities
    
    return filters


def get_report_security_context(user: str | None = None) -> dict:
    """
    Get complete security context for report access validation.
    
    Returns:
    {
        "user": "...",
        "has_customer_restrictions": bool,
        "has_sales_entity_restrictions": bool,
        "customer_scope": "global" | "scoped" | "empty",
        "sales_entity_scope": "global" | "scoped" | "empty",
        "scopes": {
            "customers": [...],
            "sales_entities": [...]
        }
    }
    """
    if user is None:
        user = frappe.session.user
    
    allowed_customers, customer_meta = dashboard_security.allowed_customers_for_user(
        include_meta=True
    )
    allowed_sales_entities, sales_entity_meta = dashboard_security.allowed_sales_entities_for_user(
        include_meta=True
    )
    
    return {
        "user": user,
        "has_customer_restrictions": allowed_customers is not None and len(allowed_customers or []) > 0,
        "has_sales_entity_restrictions": allowed_sales_entities is not None and len(allowed_sales_entities or []) > 0,
        "customer_scope": customer_meta.get("access_scope"),
        "sales_entity_scope": sales_entity_meta.get("access_scope"),
        "scopes": {
            "customers": list(allowed_customers or []),
            "sales_entities": list(allowed_sales_entities or []),
        },
    }

