"""Report Isolation Service

Provides scope-aware report building and filtering for Reports API.
Integrates with query_isolation and dashboard_security to ensure reports
respect user's branch and sales_entity scope.
"""

from __future__ import annotations

import frappe

from acentem_takipte.acentem_takipte.api.v2 import dashboard_security
from acentem_takipte.acentem_takipte.services.query_isolation import (
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
