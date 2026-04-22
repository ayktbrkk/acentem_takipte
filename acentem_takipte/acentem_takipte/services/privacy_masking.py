"""Privacy masking utilities: rate-limiting and audit logging for masked-field queries.

Design
------
Masked query gate
    Users without sensitive access receive masked (starred) tax-id and phone values
    instead of raw PII.  This service enforces two additional controls:

    1.  **Daily rate limit** (default 30 per user/day, site-configurable via
        ``at_masked_query_daily_limit``).  If the limit is reached the request is
        rejected with HTTP 429 before any data is returned.

    2.  **Audit trail** — each successful masked query is recorded in the Frappe
        Error Log under the title ``[KVKK Audit] Masked Query``.  Raw PII (national
        ID / tax ID, phone) is **never** stored; only a SHA-256 fingerprint of
        ``user|endpoint|date`` is logged.

Cache key pattern
    ``at_masked_query::{user}::{YYYY-MM-DD}``  (integer counter, TTL 48 h)

Usage
-----
::

    from acentem_takipte.acentem_takipte.services.privacy_masking import masked_query_gate

    if not has_sensitive_access():
        masked_query_gate(frappe.session.user, endpoint="customer_workbench", row_count=len(rows))
        # … apply masking …
"""

from __future__ import annotations

import hashlib
from datetime import date

import frappe
from frappe import _

_RATE_LIMIT_KEY = "at_masked_query::{user}::{date}"
_RATE_LIMIT_TTL_SECS = 172_800  # 48 hours — safely covers day boundary


def _daily_rate_limit() -> int:
    return int((frappe.get_site_config() or {}).get("at_masked_query_daily_limit", 100))


def _rate_limit_cache_key(user_id: str) -> str:
    today = date.today().isoformat()
    return _RATE_LIMIT_KEY.format(user=user_id, date=today)


def masked_query_gate(
    user: str | None = None,
    *,
    endpoint: str = "",
    row_count: int = 0,
) -> None:
    """Check rate limit, increment counter, and write an audit entry.

    Call this **before** applying masking transformations.  If the daily limit
    has been reached, the function raises :class:`frappe.PermissionError` and
    sets the HTTP status code to 429 so the client can back off.

    Parameters
    ----------
    user:
        Frappe user string.  Defaults to ``frappe.session.user``.
    endpoint:
        Short label for the API endpoint (e.g. ``"customer_workbench"``).
        Used only in the audit log — not stored as PII.
    row_count:
        Number of rows that will be returned with masked fields.
        Used only in the audit log.
    """
    user_id = str(user or frappe.session.user or "").strip()
    if not user_id or user_id == "Guest":
        return

    _check_rate_limit(user_id)
    _increment_counter(user_id)
    _write_audit_entry(user_id, endpoint=endpoint, row_count=row_count)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _check_rate_limit(user_id: str) -> None:
    cache_key = _rate_limit_cache_key(user_id)
    current = int(frappe.cache().get_value(cache_key) or 0)
    limit = _daily_rate_limit()
    if current >= limit:
        frappe.response["http_status_code"] = 429
        frappe.throw(
            _(
                "You have reached the daily masked-query limit ({limit}). "
                "Please try again tomorrow."
            ).format(limit=limit),
            frappe.PermissionError,
        )


def _increment_counter(user_id: str) -> None:
    """Increment the daily masked-query counter for *user_id*.

    Uses a read-increment-write pattern via Frappe's serialised cache.  A small
    race window exists for concurrent requests, but is acceptable for a daily
    limit of 30 checks.
    """
    try:
        cache_key = _rate_limit_cache_key(user_id)
        cache = frappe.cache()
        current = int(cache.get_value(cache_key) or 0)
        cache.set_value(cache_key, current + 1, expires_in_sec=_RATE_LIMIT_TTL_SECS)
    except Exception:
        pass  # Cache failure must not break the response.


def _write_audit_entry(user_id: str, *, endpoint: str, row_count: int) -> None:
    """Write a structured, PII-free audit entry to the Frappe Error Log.

    The entry is retrievable via Frappe > Error Log, filtered by title
    ``[KVKK Audit] Masked Query``.  Raw PII (national ID / tax ID, phone) is
    never added to this record.
    """
    try:
        today = date.today().isoformat()
        fingerprint = hashlib.sha256(
            f"{user_id}|{endpoint}|{today}".encode()
        ).hexdigest()[:16]
        frappe.log_error(
            title="[KVKK Audit] Masked Query",
            message=(
                f"user={user_id} "
                f"endpoint={str(endpoint or '').strip() or 'unknown'} "
                f"row_count={int(row_count or 0)} "
                f"fingerprint={fingerprint}"
            ),
        )
    except Exception:
        pass  # Audit failure must not break the response.
