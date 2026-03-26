"""Unified cache key namespace for user scope caching.

All scope-related cache keys use the ``at_scope`` prefix so that
clearing functions in branches.py and cache_precomputation.py stay
in sync.
"""

SCOPE_CACHE_PREFIX = "at_scope"


def scope_cache_key(user: str, scope_type: str = "complete") -> str:
    return f"{SCOPE_CACHE_PREFIX}::{user}::{scope_type}"


def all_scope_cache_key_patterns(user: str) -> list[str]:
    return [
        scope_cache_key(user, "complete"),
        scope_cache_key(user, "branches"),
        scope_cache_key(user, "sales_entities"),
    ]
