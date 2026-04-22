from __future__ import annotations

import hashlib
import json

import frappe
from frappe.utils import cint


def _safe_session_user() -> str:
    try:
        return str(getattr(frappe.session, "user", "") or "").strip()
    except Exception:
        return ""


def _dashboard_tab_cache_ttl_seconds(
    *,
    cache_config_key: str = "at_dashboard_tab_cache_ttl_seconds",
    default_ttl_seconds: int = 300,
) -> int:
    try:
        site_config = frappe.get_site_config() or {}
        ttl = cint(site_config.get(cache_config_key) or 0)
        return max(ttl or default_ttl_seconds, 1)
    except Exception:
        return default_ttl_seconds


def _dashboard_tab_scope_digest(
    *, allowed_customers: list[str] | None, scope_meta: dict | None
) -> str:
    normalized_customers: str
    if allowed_customers is None:
        normalized_customers = "__global__"
    else:
        cleaned_customers = sorted(
            {
                str(customer or "").strip()
                for customer in allowed_customers
                if str(customer or "").strip()
            }
        )
        normalized_customers = (
            hashlib.sha256(
                json.dumps(cleaned_customers, separators=(",", ":"), ensure_ascii=False).encode()
            ).hexdigest()[:16]
            if cleaned_customers
            else "__empty__"
        )

    normalized_scope_meta = {
        "access_scope": str((scope_meta or {}).get("access_scope") or "").strip(),
        "scope_reason": str((scope_meta or {}).get("scope_reason") or "").strip(),
        "allowed_customers": normalized_customers,
    }
    return hashlib.sha256(
        json.dumps(
            normalized_scope_meta,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
        ).encode()
    ).hexdigest()[:16]


def _dashboard_tab_cache_key(
    *,
    tab_key: str,
    from_date,
    to_date,
    compare_from_date=None,
    compare_to_date=None,
    branch=None,
    office_branch=None,
    months: int,
    allowed_customers: list[str] | None,
    scope_meta: dict | None,
    safe_session_user_fn=None,
) -> str:
    safe_session_user = safe_session_user_fn or _safe_session_user
    cache_payload = {
        "user": safe_session_user() or "Guest",
        "tab": str(tab_key or "").strip().lower(),
        "from_date": str(from_date or ""),
        "to_date": str(to_date or ""),
        "compare_from_date": str(compare_from_date or ""),
        "compare_to_date": str(compare_to_date or ""),
        "branch": str(branch or ""),
        "office_branch": str(office_branch or ""),
        "months": cint(months or 0),
        "scope": _dashboard_tab_scope_digest(
            allowed_customers=allowed_customers, scope_meta=scope_meta
        ),
    }
    cache_digest = hashlib.sha256(
        json.dumps(
            cache_payload,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
            default=str,
        ).encode()
    ).hexdigest()[:24]
    return f"at_dashboard_tab::{cache_digest}"

# audit(perf/P-06): Smart cache invalidation hook
def invalidate_dashboard_cache(doc=None, method=None):
    """
    Clears all dashboard tab cache keys.
    Attached as a hook to Policy, Lead, Offer, Payment, etc.
    """
    try:
        frappe.cache().delete_keys("at_dashboard_tab::")
    except Exception:
        pass
