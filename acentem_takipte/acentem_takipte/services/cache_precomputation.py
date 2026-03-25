"""Cache Pre-computation Service

Optimizes dashboard and report access by pre-computing user scope (allowed branches
and sales entities) at login time and caching the results.

This service reduces database queries on every dashboard/report endpoint call by
caching scope computation results with TTL-based invalidation.
"""

from __future__ import annotations

import frappe
from frappe.utils import cint

SCOPE_CACHE_TTL_SECONDS = 3600  # 1 hour default
SCOPE_CACHE_KEY_PATTERN = "at_user_scope::{user}::{scope_type}"


def precompute_user_scope(user: str | None = None) -> dict:
    """
    Pre-compute and cache user's complete scope (branches + sales entities).
    
    Typically called at login time to populate caches before endpoint requests.
    
    Args:
        user: User ID (default: current user)
    
    Returns:
        {
            "user": "user@example.com",
            "allowed_branches": ["br_001", "br_002"],
            "allowed_sales_entities": ["se_001", "se_002"],
            "computed_at": "2026-03-25 10:30:00",
            "cache_ttl": 3600
        }
    """
    if user is None:
        user = frappe.session.user
    
    from acentem_takipte.acentem_takipte.services.branches import get_allowed_office_branch_names
    from acentem_takipte.acentem_takipte.services.sales_entities import get_allowed_sales_entity_names
    
    try:
        allowed_branches = list(get_allowed_office_branch_names(user=user) or [])
        allowed_sales_entities = list(get_allowed_sales_entity_names(user=user) or [])
    except Exception as e:
        frappe.logger().warning(f"Failed to precompute scope for {user}: {str(e)}")
        return {
            "user": user,
            "allowed_branches": [],
            "allowed_sales_entities": [],
            "error": str(e),
            "computed_at": frappe.utils.now(),
            "cache_ttl": 0,
        }
    
    cache_ttl = cint(frappe.get_site_config().get("at_scope_cache_ttl_seconds", SCOPE_CACHE_TTL_SECONDS))
    
    scope_data = {
        "user": user,
        "allowed_branches": allowed_branches,
        "allowed_sales_entities": allowed_sales_entities,
        "computed_at": frappe.utils.now(),
        "cache_ttl": cache_ttl,
    }
    
    # Store in cache with TTL
    try:
        cache_key = SCOPE_CACHE_KEY_PATTERN.format(user=user, scope_type="complete")
        frappe.cache().set_value(cache_key, scope_data, expires_in_sec=cache_ttl)
        frappe.logger().info(f"Pre-computed scope for {user}: {len(allowed_branches)} branches, {len(allowed_sales_entities)} sales entities")
    except Exception as e:
        frappe.logger().warning(f"Failed to cache scope for {user}: {str(e)}")
    
    return scope_data


def get_cached_user_scope(user: str | None = None, use_precomputed: bool = True) -> dict | None:
    """
    Retrieve cached user scope if available and valid.
    
    Returns None if cache miss or expired. Caller should fall back to
    get_allowed_office_branch_names() / get_allowed_sales_entity_names() if None.
    
    Args:
        user: User ID (default: current user)
        use_precomputed: If True and cache miss, triggers precompute
    
    Returns:
        Cached scope dict or None if not available
    """
    if user is None:
        user = frappe.session.user
    
    try:
        cache_key = SCOPE_CACHE_KEY_PATTERN.format(user=user, scope_type="complete")
        cached = frappe.cache().get_value(cache_key)
        
        if cached:
            frappe.logger().debug(f"Cache hit for {user} scope")
            return cached
        
        if use_precomputed:
            frappe.logger().debug(f"Cache miss for {user}, pre-computing...")
            return precompute_user_scope(user=user)
    
    except Exception as e:
        frappe.logger().warning(f"Failed to retrieve cached scope for {user}: {str(e)}")
    
    return None


def invalidate_user_scope_cache(user: str | None = None) -> bool:
    """
    Invalidate cached scope for a user.
    
    Called when:
    - User's branch assignments change (AT User Branch Access modified)
    - User's sales entity assignments change (AT User Sales Entity Access modified)
    - User's role changes
    - User logs out
    
    Args:
        user: User ID (default: current user)
    
    Returns:
        True if invalidation succeeded, False otherwise
    """
    if user is None:
        user = frappe.session.user
    
    try:
        cache_key = SCOPE_CACHE_KEY_PATTERN.format(user=user, scope_type="complete")
        frappe.cache().delete_key(cache_key)
        frappe.logger().info(f"Invalidated scope cache for {user}")
        return True
    except Exception as e:
        frappe.logger().warning(f"Failed to invalidate scope cache for {user}: {str(e)}")
        return False


def setup_cache_invalidation_hooks() -> None:
    """
    Register hooks for automatic cache invalidation.
    
    Called during app initialization to set up doctype hooks that
    invalidate user scope cache when assignments change.
    """
    hook_config = {
        "AT User Branch Access": ["on_update", "on_submit", "on_cancel", "on_delete"],
        "AT User Sales Entity Access": ["on_update", "on_submit", "on_cancel", "on_delete"],
    }
    
    for doctype, events in hook_config.items():
        for event in events:
            try:
                frappe.register_method(
                    f"acentem_takipte.acentem_takipte.services.cache_precomputation.{event}_invalidate_cache",
                    frappe.whitelist(allow_guest=False),
                )
            except Exception:
                pass  # Hooks may be registered via hooks.py instead


def get_scope_cache_stats() -> dict:
    """
    Get cache statistics for debugging.
    
    Returns info about cache size, TTL settings, etc.
    """
    try:
        cache_ttl = cint(frappe.get_site_config().get("at_scope_cache_ttl_seconds", SCOPE_CACHE_TTL_SECONDS))
        return {
            "cache_ttl_seconds": cache_ttl,
            "cache_prefix": SCOPE_CACHE_KEY_PATTERN,
            "status": "enabled",
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
        }


def invalidate_user_scope_from_assignment_doc(doc) -> None:
    """
    Invalidate user scope cache when a branch/sales_entity assignment changes.
    
    Hook callback for AT User Branch Access and AT User Sales Entity Access doctypes.
    Extracts user from doc and invalidates their scope cache.
    
    Args:
        doc: AT User Branch Access or AT User Sales Entity Access doc instance
    """
    user = getattr(doc, "user", None)
    if user:
        invalidate_user_scope_cache(user=user)

