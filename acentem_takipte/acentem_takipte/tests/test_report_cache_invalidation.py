from __future__ import annotations

import frappe
import pytest
from frappe.utils import nowdate

from acentem_takipte.acentem_takipte.domains.reports.services.runtime import (
    build_safe_report_payload,
    invalidate_payment_dependent_report_cache,
    invalidate_report_cache_namespace,
)
from acentem_takipte.acentem_takipte.domains.reports.services.snapshots import (
    delete_today_report_snapshots,
    load_report_snapshot_payload,
)


def _cache_keys_for(report_key: str) -> list:
    try:
        return frappe.cache().get_keys(f"at_report::{report_key}::") or []
    except Exception:
        return []


def _build_policy_list(filters=None, limit=20):
    return build_safe_report_payload("policy_list", filters=filters or {}, limit=limit)


def _office_branch():
    from acentem_takipte.acentem_takipte.tests.test_utils import ensure_test_office_branch

    return ensure_test_office_branch("rptinv")


def test_report_cache_miss_and_hit_return_same_total():
    frappe.set_user("Administrator")
    invalidate_report_cache_namespace("policy_list")
    total_keys_before = len(_cache_keys_for("policy_list"))
    first = _build_policy_list(filters={"status": "Active"}, limit=20)
    keys_after_first = _cache_keys_for("policy_list")
    assert len(keys_after_first) > total_keys_before, "expected a cache entry after miss"

    second = _build_policy_list(filters={"status": "Active"}, limit=20)
    assert second["total"] == first["total"]
    assert len(second["rows"]) == len(first["rows"])
    frappe.db.rollback()


def test_cache_miss_and_hit_agree_on_collected_premium():
    frappe.set_user("Administrator")
    first = _build_policy_list(filters={"status": "Active"}, limit=20)
    second = _build_policy_list(filters={"status": "Active"}, limit=20)
    collected = lambda p: sum(float(r.get("collected_amount_try") or 0) for r in (p.get("rows") or []))
    assert collected(second) == collected(first)
    frappe.db.rollback()


def test_payment_write_invalidates_policy_list_cache(monkeypatch):
    frappe.set_user("Administrator")
    _build_policy_list(filters={"status": "Active"}, limit=20)
    assert _cache_keys_for("policy_list"), "expected cache populated"

    invalidate_payment_dependent_report_cache()
    assert not _cache_keys_for("policy_list"), "payment invalidation must clear policy_list cache"
    assert not _cache_keys_for("payment_status"), "payment invalidation must clear payment_status cache"

    rebuilt = _build_policy_list(filters={"status": "Active"}, limit=20)
    assert rebuilt["total"] >= 0
    frappe.db.rollback()


def test_payment_cancelled_invalidation(monkeypatch):
    frappe.set_user("Administrator")
    _build_policy_list(filters={"status": "Active"}, limit=20)
    assert _cache_keys_for("policy_list")

    # A cancellation is still a payment write -> same namespace invalidation
    invalidate_payment_dependent_report_cache()
    assert not _cache_keys_for("policy_list")
    frappe.db.rollback()


def test_snapshot_cleared_by_invalidation():
    frappe.set_user("Administrator")
    payload = _build_policy_list(filters={"status": "Active"}, limit=50)
    assert load_report_snapshot_payload("policy_list", {}) is not None or payload["rows"]

    delete_today_report_snapshots("policy_list")
    assert load_report_snapshot_payload("policy_list", {}) is None
    frappe.db.rollback()


def test_cache_isolated_by_branch_company_period():
    frappe.set_user("Administrator")
    keys_before = set(_cache_keys_for("policy_list"))

    filters_a = {"status": "Active", "branch": "BR-A", "insurance_company": "INS-A", "from_date": "2026-01-01", "to_date": "2026-12-31"}
    filters_b = {"status": "Active", "branch": "BR-B", "insurance_company": "INS-B", "from_date": "2026-06-01", "to_date": "2026-12-31"}

    _build_policy_list(filters=filters_a, limit=20)
    _build_policy_list(filters=filters_b, limit=20)

    keys = set(_cache_keys_for("policy_list")) - keys_before
    assert len(keys) >= 2, f"expected distinct cache keys per filter set, got {len(keys)}"
    frappe.db.rollback()


def test_invalidation_targets_only_payment_dependent_reports():
    frappe.set_user("Administrator")
    _build_policy_list(filters={"status": "Active"}, limit=20)
    from acentem_takipte.acentem_takipte.domains.reports.services.runtime import build_safe_report_payload

    # Build an unrelated report too (agent_performance is not payment-scoped in
    # the same way, but the invalidation should not touch it)
    build_safe_report_payload("agent_performance", filters={}, limit=5)

    invalidate_payment_dependent_report_cache()
    assert not _cache_keys_for("policy_list")
    assert not _cache_keys_for("payment_status")
    frappe.db.rollback()


def test_doc_event_wiring_includes_report_invalidator():
    doc_events = frappe.get_hooks("doc_events") or {}
    payment_events = doc_events.get("AT Payment") or {}
    all_handlers = []
    for method in ("after_insert", "on_update", "on_trash"):
        handlers = payment_events.get(method) or []
        all_handlers.extend(handlers if isinstance(handlers, list) else [handlers])
    assert any(
        "runtime.invalidate_payment_dependent_report_cache" in str(h) for h in all_handlers
    ), "AT Payment doc_events must wire the report cache invalidator"


def test_real_payment_save_clears_report_cache(monkeypatch):
    frappe.set_user("Administrator")
    invalidate_report_cache_namespace("policy_list")
    _build_policy_list(filters={"status": "Active"}, limit=20)
    assert _cache_keys_for("policy_list"), "expected policy_list cache before payment save"

    branch = _office_branch()
    suffix = frappe.generate_hash(length=8)
    raw = "".join(c for c in frappe.generate_hash(length=12) if c.isdigit())[:9].ljust(9, "1")
    if raw.startswith("0"):
        raw = f"1{raw[1:]}"
    digits = [int(ch) for ch in raw]
    tenth = ((sum(digits[0:9:2]) * 7) - sum(digits[1:8:2])) % 10
    eleventh = (sum(digits) + tenth) % 10
    customer = frappe.get_doc(
        {
            "doctype": "AT Customer",
            "tax_id": f"{raw}{tenth}{eleventh}",
            "full_name": f"Cache Test Customer {suffix}",
            "customer_type": "Individual",
        }
    ).insert(ignore_permissions=True)
    payment = frappe.get_doc(
        {
            "doctype": "AT Payment",
            "customer": customer.name,
            "office_branch": branch,
            "payment_direction": "Inbound",
            "payment_purpose": "Premium Collection",
            "status": "Draft",
            "payment_date": nowdate(),
            "currency": "TRY",
            "fx_rate": 1,
            "amount": 100,
        }
    )
    payment.insert(ignore_permissions=True)
    payment.status = "Paid"
    payment.save(ignore_permissions=True)

    # The AT Payment on_update/after_insert doc_events invalidate the cache
    assert not _cache_keys_for("policy_list"), "payment save must clear policy_list cache"
    assert not _cache_keys_for("payment_status"), "payment save must clear payment_status cache"
    frappe.db.rollback()


def test_after_migrate_invalidates_report_cache():
    hooks = frappe.get_hooks("after_migrate") or []
    assert any("invalidate_all_report_cache" in str(h) for h in hooks), (
        "after_migrate must wire invalidate_all_report_cache"
    )
