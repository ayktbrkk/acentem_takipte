from __future__ import annotations

import json
import re
from hashlib import sha256

import frappe
from frappe.utils import cint, cstr, flt, now_datetime
from acentem_takipte.acentem_takipte.utils.commissions import resolve_commission_amount
from acentem_takipte.acentem_takipte.utils.logging import log_redacted_error
from acentem_takipte.acentem_takipte.utils.metrics import build_metric_event
from acentem_takipte.acentem_takipte.utils.notes import normalize_note_text
from acentem_takipte.acentem_takipte.utils.statuses import (
    ATAccountingEntryStatus,
    ATReconciliationItemStatus,
)

SOURCE_DOCTYPES = ("AT Policy", "AT Payment", "AT Claim")
ENTRY_TYPE_MAP = {
    "AT Policy": "Policy",
    "AT Payment": "Payment",
    "AT Claim": "Claim",
}
RECONCILIATION_TOLERANCE = 0.01
DOC_EVENT_SYNC_DEBOUNCE_SEC = 90


def _build_sync_doc_event_cache_key(source_doctype: str, source_name: str) -> str:
    return f"accounting:sync_doc_event:{source_doctype}:{source_name}"


def _enqueue_accounting_sync_doc(source_doctype: str, source_name: str) -> bool:
    cache_key = _build_sync_doc_event_cache_key(source_doctype, source_name)
    cache = frappe.cache()
    if cache.get_value(cache_key):
        return False

    cache.set_value(cache_key, 1, expires_in_sec=DOC_EVENT_SYNC_DEBOUNCE_SEC)
    try:
        frappe.enqueue(
            "acentem_takipte.accounting._run_accounting_sync_doc_event",
            source_doctype=source_doctype,
            source_name=source_name,
            queue="default",
            timeout=600,
            enqueue_after_commit=True,
        )
        return True
    except Exception:
        cache.delete_value(cache_key)
        raise


def _run_accounting_sync_doc_event(
    source_doctype: str, source_name: str
) -> dict[str, str]:
    cache_key = _build_sync_doc_event_cache_key(source_doctype, source_name)
    try:
        return sync_accounting_entry(source_doctype, source_name)
    finally:
        frappe.cache().delete_value(cache_key)


def sync_doc_event(doc, method=None) -> None:
    if not doc or doc.doctype not in SOURCE_DOCTYPES:
        return

    try:
        if method == "on_trash":
            frappe.flags.at_accounting_sync_is_trash = doc.name
        _enqueue_accounting_sync_doc(doc.doctype, doc.name)
    except Exception:
        log_redacted_error(
            "AT Accounting Sync Hook Error",
            details={"source_doctype": doc.doctype, "source_name": doc.name},
        )


def sync_accounting_entries_now(limit: int = 200) -> dict[str, int]:
    return sync_accounting_entries(limit=limit)


def sync_accounting_entries(limit: int = 200) -> dict[str, int]:
    limit = max(cint(limit), 1)
    scanned = 0
    synced = 0
    failed = 0
    skipped = 0

    candidates = _collect_sync_candidates(limit=limit)
    for source_doctype, source_name in candidates:
        scanned += 1
        result = sync_accounting_entry(source_doctype, source_name)
        status = result.get("status")
        if status == ATAccountingEntryStatus.SYNCED:
            synced += 1
        elif status == ATAccountingEntryStatus.FAILED:
            failed += 1
        else:
            skipped += 1

    if scanned and not frappe.flags.in_test:
        frappe.db.commit()

    summary = {
        "scanned": scanned,
        "synced": synced,
        "failed": failed,
        "skipped": skipped,
    }
    frappe.logger("acentem_takipte").info(
        "AT accounting sync summary: %s",
        build_metric_event(
            "accounting.sync",
            dimensions={"component": "accounting"},
            values=summary,
        ),
    )
    return summary


def sync_accounting_entry(
    source_doctype: str, source_name: str, *, force: bool = False
) -> dict[str, str]:
    if source_doctype not in SOURCE_DOCTYPES:
        return {"status": "Skipped", "reason": "unsupported_source"}
    if not source_name or not frappe.db.exists(source_doctype, source_name):
        return {"status": "Skipped", "reason": "missing_source"}

    payload = build_accounting_payload(source_doctype, source_name)
    if not payload:
        return {"status": "Skipped", "reason": "payload_empty"}

    entry = _get_or_create_entry(source_doctype, source_name)
    payload_hash = _hash_payload(payload)

    if (
        entry.name
        and entry.status == ATAccountingEntryStatus.SYNCED
        and entry.integration_hash == payload_hash
        and not force
    ):
        return {"status": "Skipped", "reason": "already_synced", "entry": entry.name}

    try:
        entry.entry_type = payload["entry_type"]
        entry.policy = payload.get("policy")
        entry.customer = payload.get("customer")
        entry.office_branch = payload.get("office_branch")
        entry.sales_entity = payload.get("sales_entity")
        entry.insurance_company = payload.get("insurance_company")
        entry.currency = payload.get("currency") or "TRY"
        entry.local_amount = payload.get("local_amount") or 0
        entry.local_amount_try = payload.get("local_amount_try") or 0
        # External amounts/refs come only from real commission/premium statement
        # imports. Never fabricate a simulated external payload here. Clear
        # legacy simulated refs ("EXT-...") but preserve real statement data
        # already populated on the entry by an import.
        if not entry.name or _is_simulated_external_ref(entry.get("external_ref")):
            entry.external_amount = 0
            entry.external_amount_try = 0
            entry.external_ref = None
        entry.payload_json = frappe.as_json(payload)
        entry.integration_hash = payload_hash
        entry.status = ATAccountingEntryStatus.SYNCED
        entry.error_message = None
        entry.sync_attempt_count = cint(entry.sync_attempt_count) + 1
        entry.last_synced_on = now_datetime()

        if entry.name:
            # ignore_permissions: Background scheduler job (sync_accounting_entries) runs without user session.
            # Permission enforcement happens at API layer (api/accounting.py:107).
            entry.save(ignore_permissions=True)
        else:
            # ignore_permissions: New entry created during background sync; API layer enforces permissions.
            entry.insert(ignore_permissions=True)

        return {"status": ATAccountingEntryStatus.SYNCED, "entry": entry.name}
    except Exception:
        _mark_entry_failed(entry, frappe.get_traceback())
        return {
            "status": ATAccountingEntryStatus.FAILED,
            "entry": entry.name or "",
            "reason": "sync_exception",
        }


def run_reconciliation_now(limit: int = 400) -> dict[str, int]:
    return run_reconciliation(limit=limit)


def run_reconciliation(limit: int = 400) -> dict[str, int]:
    limit = max(cint(limit), 1)
    entries = frappe.get_all(
        "AT Accounting Entry",
        filters={
            "status": [
                "in",
                [ATAccountingEntryStatus.SYNCED, ATAccountingEntryStatus.FAILED],
            ]
        },
        fields=[
            "name",
            "source_doctype",
            "source_name",
            "status",
            "local_amount_try",
            "external_amount_try",
            "external_ref",
            "difference_try",
        ],
        order_by="modified desc",
        limit_page_length=limit,
    )

    scanned = len(entries)
    open_count = 0
    resolved_count = 0
    matched_count = 0

    for entry_row in entries:
        mismatch_type, details = _evaluate_mismatch(entry_row)
        if mismatch_type:
            _close_open_items(entry_row.name, keep_mismatch_type=mismatch_type)
            _upsert_open_item(entry_row, mismatch_type, details)
            _set_entry_reconciliation_flag(entry_row.name, True)
            open_count += 1
            continue

        resolved_count += _close_open_items(
            entry_row.name, keep_mismatch_type="Missing External"
        )
        # Missing External items are managed by statement imports; preserve them.
        _set_entry_reconciliation_flag(
            entry_row.name, _has_open_reconciliation(entry_row.name)
        )
        matched_count += 1

    if scanned and not frappe.flags.in_test:
        frappe.db.commit()

    summary = {
        "scanned": scanned,
        "open": open_count,
        "resolved": resolved_count,
        "matched": matched_count,
    }
    frappe.logger("acentem_takipte").info(
        "AT reconciliation summary: %s",
        build_metric_event(
            "accounting.reconciliation",
            dimensions={"component": "accounting"},
            values=summary,
        ),
    )
    return summary


def resolve_reconciliation_item(
    item_name: str, resolution_action: str = "Matched", notes: str | None = None
) -> dict[str, str]:
    if not item_name or not frappe.db.exists("AT Reconciliation Item", item_name):
        return {"status": "Skipped", "reason": "missing_item"}

    item = frappe.get_doc("AT Reconciliation Item", item_name)
    if resolution_action == ATReconciliationItemStatus.IGNORED:
        target_status = ATReconciliationItemStatus.IGNORED
    else:
        target_status = ATReconciliationItemStatus.RESOLVED

    # Idempotent: resolving/ignoring an item that is already in the target
    # state is a no-op (counted as skipped), so re-running a bulk action never
    # rewrites resolved_by/resolved_on or creates duplicate audit records.
    if item.status == target_status:
        return {"status": "Skipped", "reason": "already_resolved"}

    item.status = target_status
    item.resolution_action = resolution_action or "Matched"
    normalized_notes = normalize_note_text(notes, max_length=500)
    if normalized_notes:
        item.notes = normalized_notes
    # Permission checks are enforced by API wrappers (api/accounting.py); this service also runs from trusted internals.
    # ignore_permissions: Reconciliation resolution called from API (api/accounting.py) which enforces has_permission.
    item.save(ignore_permissions=True)

    _set_entry_reconciliation_flag(
        item.accounting_entry, _has_open_reconciliation(item.accounting_entry)
    )
    if not frappe.flags.in_test:
        frappe.db.commit()
    return {"status": item.status, "item": item.name}


def build_accounting_payload(source_doctype: str, source_name: str) -> dict:
    if source_doctype == "AT Policy":
        return _build_policy_payload(source_name)
    if source_doctype == "AT Payment":
        return _build_payment_payload(source_name)
    if source_doctype == "AT Claim":
        return _build_claim_payload(source_name)
    return {}


def _build_policy_payload(policy_name: str) -> dict:
    """Build accounting journal payload for an AT Policy.

    Journal lines use a single-sign convention: positive for normal operations,
    negative for reversals (Cancelled status or on_trash event). The external
    accounting system is responsible for debit/credit assignment based on line_type.
    Summary: Gross Production (revenue) + Commission Accrual (expense) should balance
    when signed correctly by the external ledger."""
    policy = frappe.get_doc("AT Policy", policy_name)
    local_amount = flt(policy.gross_premium)
    local_amount_try = flt(policy.gwp_try) or (
        local_amount * (flt(policy.fx_rate) or 1)
    )
    commission_value = resolve_commission_amount(
        policy.commission_amount,
        policy.commission,
    )

    is_cancelled = str(policy.status or "").strip() == "Cancelled"
    is_trash = getattr(frappe.flags, "at_accounting_sync_is_trash", None) == policy.name
    has_endorsement_child = False
    if is_cancelled:
        has_endorsement_child = bool(
            frappe.db.get_value("AT Policy", {"parent_policy": policy.name}, "name")
        )
    sign = -1 if (is_cancelled and not has_endorsement_child) or is_trash else 1

    journal_lines: list[dict] = [
        {
            "line_type": "Commission Reversal" if is_cancelled else "Gross Production",
            "amount_try": local_amount_try * sign,
        },
        {
            "line_type": "Commission Reversal" if is_cancelled else "Commission Accrual",
            "amount_try": commission_value * (flt(policy.fx_rate) or 1) * sign,
        },
    ]

    distribution_raw = getattr(policy, "commission_distribution", None) or "[]"
    try:
        distributions = json.loads(distribution_raw) if isinstance(distribution_raw, str) else distribution_raw
    except (json.JSONDecodeError, TypeError):
        distributions = []

    for entry in (distributions or []):
        if flt(entry.get("amount_try", 0)) > 0:
            journal_lines.append({
                "line_type": "Commission Distribution" if not is_cancelled else "Commission Distribution Reversal",
                "entity": entry.get("entity"),
                "entity_name": entry.get("entity_name", ""),
                "level": entry.get("level", 0),
                "share_pct": entry.get("share_pct", 100),
                "amount_try": flt(entry.get("amount_try", 0)) * sign,
            })

    return {
        "entry_type": ENTRY_TYPE_MAP["AT Policy"],
        "source_doctype": "AT Policy",
        "source_name": policy.name,
        "policy": policy.name,
        "customer": policy.customer,
        "office_branch": policy.office_branch,
        "sales_entity": policy.sales_entity,
        "insurance_company": policy.insurance_company,
        "currency": cstr(policy.currency or "TRY").upper(),
        "local_amount": local_amount,
        "local_amount_try": local_amount_try,
        "journal_lines": journal_lines,
        "source_status": policy.status,
    }


def _build_payment_payload(payment_name: str) -> dict:
    payment = frappe.get_doc("AT Payment", payment_name)
    sign = 1 if payment.payment_direction == "Inbound" else -1
    local_amount = flt(payment.amount) * sign
    local_amount_try = flt(payment.amount_try) * sign
    if not local_amount_try:
        local_amount_try = local_amount * (flt(payment.fx_rate) or 1)

    policy_company = _policy_company(payment.policy)

    return {
        "entry_type": ENTRY_TYPE_MAP["AT Payment"],
        "source_doctype": "AT Payment",
        "source_name": payment.name,
        "policy": payment.policy,
        "customer": payment.customer,
        "office_branch": payment.office_branch
        or frappe.db.get_value("AT Policy", payment.policy, "office_branch"),
        "sales_entity": payment.sales_entity
        or frappe.db.get_value("AT Policy", payment.policy, "sales_entity"),
        "insurance_company": policy_company,
        "currency": cstr(payment.currency or "TRY").upper(),
        "local_amount": local_amount,
        "local_amount_try": local_amount_try,
        "journal_lines": [
            {
                "line_type": payment.payment_purpose or "Payment",
                "amount_try": local_amount_try,
            }
        ],
        "source_status": payment.status,
        "direction": payment.payment_direction,
    }


def _build_claim_payload(claim_name: str) -> dict:
    claim = frappe.get_doc("AT Claim", claim_name)
    amount = flt(claim.approved_amount) or flt(claim.estimated_amount)
    currency = cstr(claim.currency or "TRY").upper()
    fx_rate = 1
    if currency != "TRY" and claim.policy:
        fx_rate = flt(frappe.db.get_value("AT Policy", claim.policy, "fx_rate") or 1)
    local_amount_try = amount * fx_rate

    return {
        "entry_type": ENTRY_TYPE_MAP["AT Claim"],
        "source_doctype": "AT Claim",
        "source_name": claim.name,
        "policy": claim.policy,
        "customer": claim.customer,
        "office_branch": claim.office_branch
        or frappe.db.get_value("AT Policy", claim.policy, "office_branch"),
        "sales_entity": frappe.db.get_value("AT Policy", claim.policy, "sales_entity")
        if claim.policy
        else None,
        "insurance_company": _policy_company(claim.policy),
        "currency": currency,
        "local_amount": amount,
        "local_amount_try": local_amount_try,
        "journal_lines": [
            {
                "line_type": "Claim Reserve",
                "amount_try": local_amount_try,
            }
        ],
        "source_status": claim.claim_status,
    }


def _collect_sync_candidates(limit: int) -> list[tuple[str, str]]:
    candidates: list[tuple[str, str]] = []
    seen: set[str] = set()

    failed_rows = frappe.get_all(
        "AT Accounting Entry",
        filters={"status": ATAccountingEntryStatus.FAILED},
        fields=["source_doctype", "source_name"],
        order_by="modified desc",
        limit_page_length=limit,
    )
    for row in failed_rows:
        source_key = f"{row.source_doctype}::{row.source_name}"
        if source_key in seen:
            continue
        seen.add(source_key)
        candidates.append((row.source_doctype, row.source_name))
        if len(candidates) >= limit:
            return candidates

    remaining = max(limit - len(candidates), 1)
    per_doctype = max(remaining // len(SOURCE_DOCTYPES), 1)
    for source_doctype in SOURCE_DOCTYPES:
        rows = frappe.get_all(
            source_doctype,
            fields=["name"],
            order_by="modified desc",
            limit_page_length=per_doctype,
        )
        for row in rows:
            source_key = f"{source_doctype}::{row.name}"
            if source_key in seen:
                continue
            seen.add(source_key)
            candidates.append((source_doctype, row.name))
            if len(candidates) >= limit:
                return candidates

    return candidates


def _hash_payload(payload: dict) -> str:
    serialized = json.dumps(payload, sort_keys=True, ensure_ascii=False, default=str)
    return sha256(serialized.encode("utf-8")).hexdigest()


def _get_or_create_entry(source_doctype: str, source_name: str):
    entry_name = frappe.db.get_value(
        "AT Accounting Entry",
        {"source_doctype": source_doctype, "source_name": source_name},
        "name",
    )
    if entry_name:
        return frappe.get_doc("AT Accounting Entry", entry_name)

    return frappe.get_doc(
        {
            "doctype": "AT Accounting Entry",
            "source_doctype": source_doctype,
            "source_name": source_name,
            "entry_type": ENTRY_TYPE_MAP[source_doctype],
            "office_branch": None,
            "sales_entity": None,
            "status": ATAccountingEntryStatus.DRAFT,
        }
    )


def _mark_entry_failed(entry, traceback_text: str) -> None:
    if not entry:
        return
    try:
        entry.status = ATAccountingEntryStatus.FAILED
        entry.error_message = cstr(traceback_text)[-500:]
        entry.sync_attempt_count = cint(entry.sync_attempt_count) + 1
        entry.last_synced_on = now_datetime()
        if entry.name:
            # ignore_permissions: Background sync failure handler; permission enforced at API layer.
            entry.save(ignore_permissions=True)
        else:
            # ignore_permissions: Entry creation during background sync failure path.
            entry.insert(ignore_permissions=True)
    except Exception:
        log_redacted_error(
            "AT Accounting Mark Failed Error",
            details={
                "entry": getattr(entry, "name", None),
                "status": getattr(entry, "status", None),
            },
        )


def _is_simulated_external_ref(external_ref: str | None) -> bool:
    """Return True for a legacy simulated external ref (EXT-<TYPE>-<12hex>).

    The old sync path fabricated external references with _simulate_external_payload.
    Real statement references from insurer imports never match this pattern.
    """
    ref = str(external_ref or "").strip()
    return bool(re.match(r"^EXT-[A-Z]{3}-[0-9a-f]{12}$", ref))


def _evaluate_mismatch(entry_row) -> tuple[str | None, dict]:
    local_try = flt(entry_row.local_amount_try)
    external_try = flt(entry_row.external_amount_try)
    difference_try = external_try - local_try

    if entry_row.status == ATAccountingEntryStatus.FAILED:
        return "Status", {"reason": "sync_failed", "difference_try": difference_try}

    if not entry_row.external_ref:
        # No real external statement data yet. "Missing External" is decided by
        # statement imports (generate_missing_external), not inferred here, so a
        # freshly synced entry is not a mismatch.
        return None, {"reason": "no_external_data", "difference_try": difference_try}

    if abs(difference_try) > RECONCILIATION_TOLERANCE:
        return "Amount", {"reason": "amount_mismatch", "difference_try": difference_try}

    return None, {"reason": "matched", "difference_try": difference_try}


def _upsert_open_item(entry_row, mismatch_type: str, details: dict) -> None:
    unique_key = f"{entry_row.name}::{mismatch_type}"
    item_name = frappe.db.get_value(
        "AT Reconciliation Item", {"unique_key": unique_key}, "name"
    )

    if item_name:
        item = frappe.get_doc("AT Reconciliation Item", item_name)
    else:
        item = frappe.get_doc(
            {
                "doctype": "AT Reconciliation Item",
                "unique_key": unique_key,
                "accounting_entry": entry_row.name,
                "source_doctype": entry_row.source_doctype,
                "source_name": entry_row.source_name,
                "mismatch_type": mismatch_type,
            }
        )

    item.status = ATReconciliationItemStatus.OPEN
    item.mismatch_type = mismatch_type
    item.local_amount_try = flt(entry_row.local_amount_try)
    item.external_amount_try = flt(entry_row.external_amount_try)
    item.details_json = frappe.as_json(details)
    item.resolution_action = None
    item.resolved_by = None
    item.resolved_on = None

    if item.name:
        # ignore_permissions: Reconciliation item management; permissions enforced by reconciliation API endpoints.
        item.save(ignore_permissions=True)
    else:
        # ignore_permissions: New reconciliation item during background reconciliation job.
        item.insert(ignore_permissions=True)


def _close_open_items(accounting_entry: str, keep_mismatch_type: str | None) -> int:
    conditions = [
        "accounting_entry = %(entry)s",
        "status = %(status)s",
    ]
    values = {"entry": accounting_entry, "status": ATReconciliationItemStatus.OPEN}

    if keep_mismatch_type:
        conditions.append("(mismatch_type IS NULL OR mismatch_type != %(keep_type)s)")
        values["keep_type"] = keep_mismatch_type

    where = " AND ".join(conditions)
    frappe.db.sql(
        f"""
        UPDATE `tabAT Reconciliation Item`
        SET status = %(resolved)s,
            resolution_action = 'Matched',
            notes = 'Auto-closed by reconciliation job.',
            modified = NOW()
        WHERE {where}
        """,
        {**values, "resolved": ATReconciliationItemStatus.RESOLVED},
    )
    return frappe.db.sql("SELECT ROW_COUNT()", as_list=True)[0][0]


def _set_entry_reconciliation_flag(entry_name: str, needs_reconciliation: bool) -> None:
    if not entry_name or not frappe.db.exists("AT Accounting Entry", entry_name):
        return
    current = cint(
        frappe.db.get_value("AT Accounting Entry", entry_name, "needs_reconciliation")
        or 0
    )
    target = 1 if needs_reconciliation else 0
    if current == target:
        return
    frappe.db.set_value(
        "AT Accounting Entry",
        entry_name,
        "needs_reconciliation",
        target,
        update_modified=False,
    )


def _has_open_reconciliation(accounting_entry: str) -> bool:
    return bool(
        frappe.db.exists(
            "AT Reconciliation Item",
            {
                "accounting_entry": accounting_entry,
                "status": ATReconciliationItemStatus.OPEN,
            },
        )
    )


def _policy_company(policy_name: str | None) -> str | None:
    if not policy_name:
        return None
    return frappe.db.get_value("AT Policy", policy_name, "insurance_company")
