from __future__ import annotations

import csv
import io
from hashlib import sha256
from typing import Any

import frappe
from frappe.utils import flt

from acentem_takipte.acentem_takipte.utils.statuses import ATPolicyStatus


def build_statement_import_preview(
    *,
    csv_text: str,
    office_branch: str | None = None,
    insurance_company: str | None = None,
    delimiter: str = ",",
    limit: int = 200,
    statement_type: str = "premium",
) -> dict[str, Any]:
    rows = _parse_csv_rows(csv_text=csv_text, delimiter=delimiter, limit=limit)
    preview_rows = [_normalize_preview_row(row) for row in rows]

    policy_refs = [row["policy_no"] for row in preview_rows if row.get("policy_no")]
    payment_refs = [row["payment_no"] for row in preview_rows if row.get("payment_no")]

    policy_map = _build_policy_map(
        policy_refs, office_branch=office_branch, insurance_company=insurance_company,
        include_commission=(statement_type == "commission"),
    )
    payment_map = _build_payment_map(payment_refs, office_branch=office_branch)

    if statement_type == "commission":
        enriched = _enrich_commission_preview_rows(preview_rows, policy_map)
        return {"rows": preview_rows, "summary": enriched["summary"]}

    matched = 0
    unmatched = 0
    total_amount_try = 0.0

    for row in preview_rows:
        total_amount_try += flt(row.get("amount_try") or 0)
        policy = policy_map.get(row.get("policy_no")) if row.get("policy_no") else None
        payment = (
            payment_map.get(row.get("payment_no")) if row.get("payment_no") else None
        )
        row["matched_policy"] = policy
        row["matched_payment"] = payment
        row["match_status"] = "Matched" if policy or payment else "Unmatched"
        if row["match_status"] == "Matched":
            matched += 1
        else:
            unmatched += 1

    return {
        "rows": preview_rows,
        "summary": {
            "total_rows": len(preview_rows),
            "matched_rows": matched,
            "unmatched_rows": unmatched,
            "total_amount_try": total_amount_try,
        },
    }


def import_statement_preview_rows(
    *,
    csv_text: str,
    office_branch: str | None = None,
    insurance_company: str | None = None,
    delimiter: str = ",",
    limit: int = 200,
    statement_type: str = "premium",
) -> dict[str, Any]:
    from acentem_takipte.acentem_takipte.accounting import (
        _close_open_items,
        _evaluate_mismatch,
        _get_or_create_entry,
        _set_entry_reconciliation_flag,
        _upsert_open_item,
        build_accounting_payload,
    )
    from acentem_takipte.acentem_takipte.utils.statuses import ATAccountingEntryStatus

    preview = build_statement_import_preview(
        csv_text=csv_text,
        office_branch=office_branch,
        insurance_company=insurance_company,
        delimiter=delimiter,
        limit=limit,
        statement_type=statement_type,
    )

    imported = 0
    skipped = 0
    open_items = 0

    for row in preview["rows"]:
        matched_payment = row.get("matched_payment") or {}
        matched_policy = row.get("matched_policy") or {}
        source_doctype = None
        source_name = None

        if matched_payment.get("name"):
            source_doctype = "AT Payment"
            source_name = matched_payment["name"]
        elif matched_policy.get("name"):
            source_doctype = "AT Policy"
            source_name = matched_policy["name"]

        if not source_doctype or not source_name:
            skipped += 1
            continue

        payload = build_accounting_payload(source_doctype, source_name)
        entry = _get_or_create_entry(source_doctype, source_name)
        details_payload = {
            "import_source": "statement_preview",
            "external_ref": row.get("external_ref"),
            "policy_no": row.get("policy_no"),
            "payment_no": row.get("payment_no"),
            "customer": row.get("customer"),
        }

        entry.entry_type = payload.get("entry_type")
        entry.policy = payload.get("policy")
        entry.customer = payload.get("customer")
        entry.office_branch = payload.get("office_branch")
        entry.sales_entity = payload.get("sales_entity")
        entry.insurance_company = payload.get("insurance_company")
        entry.currency = payload.get("currency") or "TRY"
        entry.local_amount = payload.get("local_amount") or 0
        entry.local_amount_try = payload.get("local_amount_try") or 0
        entry.external_amount = row.get("amount_try") or 0
        entry.external_amount_try = row.get("amount_try") or 0
        entry.external_ref = row.get("external_ref") or entry.external_ref
        entry.statement_type = "premium"
        entry.import_source = "statement_preview"
        entry.payload_json = frappe.as_json(details_payload)
        entry.integration_hash = _build_statement_row_hash(details_payload)
        entry.status = ATAccountingEntryStatus.SYNCED
        entry.error_message = None

        if entry.name:
            # ignore_permissions: Accounting statement bulk import service; permission enforced at API entry.
            entry.save(ignore_permissions=True)
        else:
            # ignore_permissions: Accounting statement bulk import service; permission enforced at API entry.
            entry.insert(ignore_permissions=True)

        entry_row = frappe._dict(
            name=entry.name,
            source_doctype=entry.source_doctype,
            source_name=entry.source_name,
            status=entry.status,
            local_amount_try=entry.local_amount_try,
            external_amount_try=entry.external_amount_try,
            external_ref=entry.external_ref,
            difference_try=(
                flt(entry.external_amount_try) - flt(entry.local_amount_try)
            ),
        )
        mismatch_type, details = _evaluate_mismatch(entry_row)
        if mismatch_type:
            _close_open_items(entry.name, keep_mismatch_type=mismatch_type)
            _upsert_open_item(entry_row, mismatch_type, details)
            _set_entry_reconciliation_flag(entry.name, True)
            open_items += 1
        else:
            _close_open_items(entry.name, keep_mismatch_type=None)
            _set_entry_reconciliation_flag(entry.name, False)
        imported += 1

    if imported and not frappe.flags.in_test:
        frappe.db.commit()

    return {
        "imported": imported,
        "skipped": skipped,
        "open_items": open_items,
        "preview_summary": preview["summary"],
    }


def _build_commission_statement_payload(
    row: dict[str, Any],
    matched_policy: dict[str, Any],
) -> dict[str, Any]:
    """Build an accounting entry payload for a commission statement row.

    local_amount / local_amount_try is set to the policy's commission_amount,
    NOT gross_premium. This is the key difference from the premium import path.
    """
    commission_amount = flt(matched_policy.get("commission_amount") or 0)
    return {
        "entry_type": "Policy",
        "source_doctype": "AT Policy",
        "source_name": matched_policy["name"],
        "policy": matched_policy["name"],
        "customer": matched_policy.get("customer") or "",
        "office_branch": matched_policy.get("office_branch") or "",
        "sales_entity": matched_policy.get("sales_entity") or "",
        "insurance_company": matched_policy.get("insurance_company") or "",
        "currency": "TRY",
        "local_amount": commission_amount,
        "local_amount_try": commission_amount,
    }


def _get_or_create_commission_statement_entry(
    policy_name: str,
    external_ref: str,
    statement_batch: str,
) -> "frappe.model.document.Document":
    """Find or create an AT Accounting Entry for a commission statement row.

    Idempotency key: source_doctype + source_name + statement_type +
    statement_batch + external_ref. Re-importing the same policy/ref within the
    same batch updates/no-ops; a different batch always gets its own entry so
    statement periods never overwrite each other.

    When no entry exists for the given external_ref, only a Missing External
    placeholder (external_ref="") from the SAME statement_batch is reused, so a
    later real row in that batch populates the same entry and closes the stale
    open item. Placeholders from other batches are never overwritten.
    """
    normalized_ref = str(external_ref or "").strip()
    batch = str(statement_batch or "").strip()
    lookup: dict[str, Any] = {
        "source_doctype": "AT Policy",
        "source_name": policy_name,
        "statement_type": "commission",
        "statement_batch": batch,
        "external_ref": normalized_ref,
    }
    existing = frappe.db.get_value("AT Accounting Entry", lookup, "name")
    if existing:
        return frappe.get_doc("AT Accounting Entry", existing)
    if normalized_ref and batch:
        placeholder = frappe.db.get_value(
            "AT Accounting Entry",
            {
                "source_doctype": "AT Policy",
                "source_name": policy_name,
                "statement_type": "commission",
                "statement_batch": batch,
                "external_ref": "",
            },
            "name",
        )
        if placeholder:
            return frappe.get_doc("AT Accounting Entry", placeholder)
    return frappe.get_doc(
        {
            "doctype": "AT Accounting Entry",
            "source_doctype": "AT Policy",
            "source_name": policy_name,
        }
    )


def import_commission_statement_rows(
    *,
    csv_text: str,
    office_branch: str | None = None,
    insurance_company: str | None = None,
    delimiter: str = ",",
    limit: int = 200,
    generate_missing: bool = True,
) -> dict[str, Any]:
    """Import commission statement CSV rows as AT Accounting Entry records.

    Uses commission_amount as local_amount (not gross_premium).
    Duplicate rows and unmatched rows are skipped.
    Amount mismatches create AT Reconciliation Items.
    Idempotent: same policy_no + external_ref + amount_try does not duplicate.
    """
    from acentem_takipte.acentem_takipte.accounting import (
        _close_open_items,
        _evaluate_mismatch,
        _set_entry_reconciliation_flag,
        _upsert_open_item,
    )
    from acentem_takipte.acentem_takipte.utils.statuses import ATAccountingEntryStatus

    preview = build_statement_import_preview(
        csv_text=csv_text,
        office_branch=office_branch,
        insurance_company=insurance_company,
        delimiter=delimiter,
        limit=limit,
        statement_type="commission",
    )

    # Filter out real duplicate rows (same policy + external_ref + amount) and
    # unmatched rows. A policy may legitimately appear multiple times in one
    # statement with different refs/amounts; those are imported separately.
    # For exact duplicates only the first occurrence is imported.
    seen_imported: set[tuple[str, str, float]] = set()
    importable: list[dict[str, Any]] = []
    skipped_duplicate = 0
    skipped_unmatched = 0

    for row in preview["rows"]:
        if row.get("match_status") == "Unmatched":
            skipped_unmatched += 1
            continue
        identity = _row_identity(row)
        if identity in seen_imported:
            skipped_duplicate += 1
            continue
        seen_imported.add(identity)
        importable.append(row)

    imported = 0
    open_items = 0
    statement_batch = _build_statement_batch_id(csv_text, insurance_company)

    for row in importable:
        matched_policy = row.get("matched_policy") or {}
        if not matched_policy.get("name"):
            continue

        payload = _build_commission_statement_payload(row, matched_policy)
        external_ref = str(row.get("external_ref") or "").strip()
        entry = _get_or_create_commission_statement_entry(
            matched_policy["name"], external_ref, statement_batch
        )

        external_amount = flt(row.get("amount_try") or 0)

        details_payload = {
            "import_source": "commission_statement",
            "statement_type": "commission",
            "statement_batch": statement_batch,
            "external_ref": external_ref,
            "policy_no": row.get("policy_no"),
            "customer": row.get("customer"),
        }

        entry.entry_type = payload.get("entry_type")
        entry.policy = payload.get("policy")
        entry.customer = payload.get("customer")
        entry.office_branch = payload.get("office_branch")
        entry.sales_entity = payload.get("sales_entity")
        entry.insurance_company = payload.get("insurance_company")
        entry.currency = payload.get("currency") or "TRY"
        entry.local_amount = payload.get("local_amount") or 0
        entry.local_amount_try = payload.get("local_amount_try") or 0
        entry.external_amount = external_amount
        entry.external_amount_try = external_amount
        entry.external_ref = external_ref or entry.external_ref
        entry.statement_type = "commission"
        entry.statement_batch = statement_batch
        entry.import_source = "commission_statement"
        entry.payload_json = frappe.as_json(details_payload)
        entry.integration_hash = _build_statement_row_hash(details_payload)
        entry.status = ATAccountingEntryStatus.SYNCED
        entry.error_message = None

        if entry.name:
            entry.save(ignore_permissions=True)
        else:
            entry.insert(ignore_permissions=True)

        entry_row = frappe._dict(
            name=entry.name,
            source_doctype=entry.source_doctype,
            source_name=entry.source_name,
            status=entry.status,
            local_amount_try=entry.local_amount_try,
            external_amount_try=entry.external_amount_try,
            external_ref=entry.external_ref,
            difference_try=(
                flt(entry.external_amount_try) - flt(entry.local_amount_try)
            ),
        )
        mismatch_type, details = _evaluate_mismatch(entry_row)
        if mismatch_type:
            _close_open_items(entry.name, keep_mismatch_type=mismatch_type)
            _upsert_open_item(entry_row, mismatch_type, details)
            _set_entry_reconciliation_flag(entry.name, True)
            open_items += 1
        else:
            _close_open_items(entry.name, keep_mismatch_type=None)
            _set_entry_reconciliation_flag(entry.name, False)
        imported += 1

    if imported and not frappe.flags.in_test:
        frappe.db.commit()

    missing_external = {"generated": 0}
    if generate_missing and insurance_company:
        policy_refs = [str(r.get("policy_no") or "").strip() for r in preview["rows"]]
        missing_external = generate_missing_external_for_commission_statement(
            policy_refs_from_statement=policy_refs,
            insurance_company=insurance_company,
            office_branch=office_branch,
            statement_batch=statement_batch,
        )

    return {
        "imported": imported,
        "skipped": skipped_unmatched + skipped_duplicate,
        "skipped_duplicate": skipped_duplicate,
        "skipped_unmatched": skipped_unmatched,
        "open_items": open_items,
        "missing_external": missing_external,
        "preview_summary": preview["summary"],
    }


def generate_missing_external_for_commission_statement(
    *,
    policy_refs_from_statement: list[str],
    insurance_company: str | None = None,
    office_branch: str | None = None,
    statement_batch: str,
) -> dict[str, int]:
    """Create AT Accounting Entries and Reconciliation Items for policies
    that exist in the system but were not found in the uploaded statement.

    These show up as 'Missing External' — the insurance company has not
    included the policy's commission in their statement, but the system
    has a record of the accrued commission.

    The statement_batch is created once by the caller (the import flow) and
    shared with the imported rows so Missing External placeholders belong to
    the same batch and are resolvable without cross-batch overwrites.
    """
    from acentem_takipte.acentem_takipte.accounting import (
        _close_open_items,
        _evaluate_mismatch,
        _set_entry_reconciliation_flag,
        _upsert_open_item,
    )
    from acentem_takipte.acentem_takipte.utils.statuses import ATAccountingEntryStatus

    statement_policy_set = {
        str(p or "").strip() for p in policy_refs_from_statement if str(p or "").strip()
    }

    policy_filters: dict[str, Any] = {
        "status": ["in", list(ATPolicyStatus.COMMISSION_ACCRUAL)],
        "commission_amount": [">", 0],
    }
    if insurance_company:
        policy_filters["insurance_company"] = insurance_company
    if office_branch:
        policy_filters["office_branch"] = office_branch

    system_policies = frappe.get_all(
        "AT Policy",
        filters=policy_filters,
        fields=["name", "policy_no", "commission_amount", "customer", "insurance_company", "office_branch"],
        limit_page_length=0,
    )

    batch = str(statement_batch or "").strip()

    generated = 0
    for policy in system_policies:
        policy_name = policy["name"]
        policy_no = str(policy.get("policy_no") or "").strip()
        if policy_no and policy_no in statement_policy_set:
            continue
        if policy_name in statement_policy_set:
            continue

        commission_amount = flt(policy.get("commission_amount") or 0)
        if commission_amount <= 0:
            continue

        # Use the commission-statement entry resolver so Missing External never
        # overwrites a real statement entry or the canonical policy sync entry.
        entry = _get_or_create_commission_statement_entry(policy_name, "", batch)
        entry.entry_type = "Policy"
        entry.policy = policy_name
        entry.customer = policy.get("customer") or ""
        entry.office_branch = policy.get("office_branch") or ""
        entry.insurance_company = policy.get("insurance_company") or ""
        entry.currency = "TRY"
        entry.local_amount = commission_amount
        entry.local_amount_try = commission_amount
        entry.external_amount = 0
        entry.external_amount_try = 0
        entry.external_ref = ""
        entry.statement_type = "commission"
        entry.statement_batch = batch
        entry.import_source = "missing_external"
        entry.payload_json = frappe.as_json({
            "import_source": "missing_external",
            "statement_type": "commission",
            "statement_batch": batch,
            "policy_no": policy_no,
        })
        entry.integration_hash = _build_statement_row_hash({
            "import_source": "missing_external",
            "statement_type": "commission",
            "statement_batch": batch,
            "policy_name": policy_name,
        })
        entry.status = ATAccountingEntryStatus.SYNCED
        entry.error_message = None

        if entry.name:
            entry.save(ignore_permissions=True)
        else:
            entry.insert(ignore_permissions=True)

        entry_row = frappe._dict(
            name=entry.name,
            source_doctype=entry.source_doctype,
            source_name=entry.source_name,
            status=entry.status,
            local_amount_try=entry.local_amount_try,
            external_amount_try=0,
            external_ref="",
            difference_try=-commission_amount,
        )
        _close_open_items(entry.name, keep_mismatch_type="Missing External")
        _upsert_open_item(entry_row, "Missing External", {
            "policy_name": policy_name,
            "policy_no": policy_no,
            "commission_amount_try": commission_amount,
        })
        _set_entry_reconciliation_flag(entry.name, True)
        generated += 1

    if generated and not frappe.flags.in_test:
        frappe.db.commit()

    return {"generated": generated}


def _parse_csv_rows(
    *, csv_text: str, delimiter: str, limit: int
) -> list[dict[str, str]]:
    safe_text = str(csv_text or "").strip()
    if not safe_text:
        return []
    reader = csv.DictReader(io.StringIO(safe_text), delimiter=(delimiter or ",")[0])
    rows: list[dict[str, str]] = []
    for index, row in enumerate(reader):
        if index >= max(int(limit), 1):
            break
        rows.append(
            {
                str(key or "").strip(): str(value or "").strip()
                for key, value in (row or {}).items()
            }
        )
    return rows


def _normalize_preview_row(row: dict[str, str]) -> dict[str, Any]:
    external_ref = (
        row.get("external_ref") or row.get("externalRef") or row.get("ref") or ""
    )
    policy_no = row.get("policy_no") or row.get("policyNo") or row.get("policy") or ""
    payment_no = (
        row.get("payment_no") or row.get("paymentNo") or row.get("payment") or ""
    )
    customer = row.get("customer") or row.get("customer_name") or ""
    amount_value = row.get("amount_try") or row.get("amount") or row.get("total") or "0"
    amount_value = (
        str(amount_value).replace(".", "").replace(",", ".")
        if "," in str(amount_value) and "." in str(amount_value)
        else str(amount_value).replace(",", ".")
    )
    return {
        "external_ref": external_ref,
        "policy_no": policy_no,
        "payment_no": payment_no,
        "customer": customer,
        "amount_try": flt(amount_value),
        "raw": row,
    }


def _build_policy_map(
    policy_refs: list[str], *, office_branch: str | None, insurance_company: str | None,
    include_commission: bool = False,
) -> dict[str, dict[str, Any]]:
    refs = [
        str(value or "").strip() for value in policy_refs if str(value or "").strip()
    ]
    if not refs:
        return {}
    ref_set = list(set(refs))
    filters: dict[str, Any] = {"policy_no": ["in", ref_set]}
    if office_branch:
        filters["office_branch"] = office_branch
    if insurance_company:
        filters["insurance_company"] = insurance_company
    fields = [
        "name",
        "policy_no",
        "customer",
        "sales_entity",
        "insurance_company",
        "office_branch",
        "status",
    ]
    if include_commission:
        fields.append("commission_amount")
    # unbounded: policy lookup by policy_no refs, filtered by reference set - expected max ~50k rows
    rows = frappe.get_all(
        "AT Policy",
        filters=filters,
        fields=fields,
        limit_page_length=0,
    )
    policy_map: dict[str, dict[str, Any]] = {}
    for row in rows:
        policy_no = str(row.get("policy_no") or "").strip()
        if policy_no:
            policy_map[policy_no] = row

    missing_refs = [ref for ref in ref_set if ref not in policy_map]
    if not missing_refs:
        return policy_map

    fallback_filters: dict[str, Any] = {"name": ["in", missing_refs]}
    if office_branch:
        fallback_filters["office_branch"] = office_branch
    if insurance_company:
        fallback_filters["insurance_company"] = insurance_company
    fallback_fields = [
        "name",
        "policy_no",
        "customer",
        "sales_entity",
        "insurance_company",
        "office_branch",
        "status",
    ]
    if include_commission:
        fallback_fields.append("commission_amount")
    # unbounded: fallback policy lookup by name, filtered by missing refs - expected max ~1k rows
    fallback_rows = frappe.get_all(
        "AT Policy",
        filters=fallback_filters,
        fields=fallback_fields,
        limit_page_length=0,
    )
    for row in fallback_rows:
        policy_map[str(row.get("name") or "").strip()] = row
    return policy_map


def _build_payment_map(
    payment_refs: list[str], *, office_branch: str | None
) -> dict[str, dict[str, Any]]:
    refs = [
        str(value or "").strip() for value in payment_refs if str(value or "").strip()
    ]
    if not refs:
        return {}
    filters: dict[str, Any] = {"payment_no": ["in", list(set(refs))]}
    if office_branch:
        filters["office_branch"] = office_branch
    # unbounded: payment lookup by payment_no refs, filtered by reference set - expected max ~50k rows
    rows = frappe.get_all(
        "AT Payment",
        filters=filters,
        fields=[
            "name",
            "payment_no",
            "customer",
            "policy",
            "office_branch",
            "status",
            "amount_try",
        ],
        limit_page_length=0,
    )
    return {str(row.get("payment_no") or "").strip(): row for row in rows}


def _row_identity(row: dict[str, Any]) -> tuple[str, str, float]:
    """Stable identity for a statement row.

    A policy may legitimately appear more than once in a statement when it has
    multiple transactions. Rows are only considered duplicates when the policy,
    external reference AND amount all match."""
    return (
        str(row.get("policy_no") or "").strip(),
        str(row.get("external_ref") or "").strip(),
        round(flt(row.get("amount_try") or 0), 2),
    )


def _duplicate_row_keys(preview_rows: list[dict[str, Any]]) -> set[tuple[str, str, float]]:
    """Return the set of (policy_no, external_ref, amount) identities that appear
    more than once in the statement rows."""
    seen: dict[tuple[str, str, float], int] = {}
    for row in preview_rows:
        key = _row_identity(row)
        if key[0]:
            seen[key] = seen.get(key, 0) + 1
    return {key for key, count in seen.items() if count > 1}


def _enrich_commission_preview_rows(
    preview_rows: list[dict[str, Any]],
    policy_map: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Add commission-specific fields to each preview row and build an
    enriched summary when statement_type is 'commission'."""
    duplicate_keys = _duplicate_row_keys(preview_rows)

    matched = 0
    unmatched = 0
    mismatched = 0
    duplicate_count = 0
    total_external = 0.0
    total_local = 0.0
    total_difference = 0.0

    for row in preview_rows:
        policy_no_val = str(row.get("policy_no") or "").strip()
        external_amount = flt(row.get("amount_try") or 0)
        policy = policy_map.get(policy_no_val) if policy_no_val else None

        row["matched_policy"] = policy
        row["external_commission_try"] = external_amount

        if policy:
            local_commission = flt(policy.get("commission_amount") or 0)
            row["local_commission_try"] = local_commission
            difference = round(external_amount - local_commission, 2)
            row["difference_try"] = difference

            if _row_identity(row) in duplicate_keys:
                row["match_status"] = "Mismatched"
                row["mismatch_type"] = "Duplicate"
                duplicate_count += 1
            elif abs(difference) <= 0.01:
                row["match_status"] = "Matched"
                row["mismatch_type"] = ""
                matched += 1
            else:
                row["match_status"] = "Mismatched"
                row["mismatch_type"] = "Amount"
                mismatched += 1
        else:
            row["local_commission_try"] = 0.0
            row["difference_try"] = external_amount
            row["match_status"] = "Unmatched"
            row["mismatch_type"] = "Missing Local"
            unmatched += 1

        total_external += external_amount
        total_local += flt(row.get("local_commission_try") or 0)
        total_difference += flt(row.get("difference_try") or 0)

    return {
        "summary": {
            "total_rows": len(preview_rows),
            "matched_rows": matched,
            "unmatched_rows": unmatched,
            "mismatched_rows": mismatched,
            "duplicate_rows": duplicate_count,
            "total_external_commission_try": round(total_external, 2),
            "total_local_commission_try": round(total_local, 2),
            "total_difference_try": round(total_difference, 2),
        },
    }


def _build_statement_batch_id(csv_text: str, insurance_company: str | None = None) -> str:
    """Build a stable batch identifier from the raw statement content.

    Re-importing the exact same CSV content yields the same batch id, so the
    same batch can be detected and deduplicated while different periods/batches
    get distinct ids."""
    raw = f"{insurance_company or ''}::{str(csv_text or '')}"
    return sha256(raw.encode("utf-8")).hexdigest()[:16]


def _build_statement_row_hash(payload: dict[str, Any]) -> str:
    serialized = frappe.as_json(payload)
    return sha256(serialized.encode("utf-8")).hexdigest()
