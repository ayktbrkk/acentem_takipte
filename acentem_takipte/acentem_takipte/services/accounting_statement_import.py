from __future__ import annotations

import csv
import io
from hashlib import sha256
from typing import Any

import frappe
from frappe.utils import flt


def build_statement_import_preview(
    *,
    csv_text: str,
    office_branch: str | None = None,
    insurance_company: str | None = None,
    delimiter: str = ",",
    limit: int = 200,
) -> dict[str, Any]:
    rows = _parse_csv_rows(csv_text=csv_text, delimiter=delimiter, limit=limit)
    preview_rows = [_normalize_preview_row(row) for row in rows]

    policy_refs = [row["policy_no"] for row in preview_rows if row.get("policy_no")]
    payment_refs = [row["payment_no"] for row in preview_rows if row.get("payment_no")]

    policy_map = _build_policy_map(policy_refs, office_branch=office_branch, insurance_company=insurance_company)
    payment_map = _build_payment_map(payment_refs, office_branch=office_branch)

    matched = 0
    unmatched = 0
    total_amount_try = 0.0

    for row in preview_rows:
        total_amount_try += flt(row.get("amount_try") or 0)
        policy = policy_map.get(row.get("policy_no")) if row.get("policy_no") else None
        payment = payment_map.get(row.get("payment_no")) if row.get("payment_no") else None
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
            difference_try=(flt(entry.external_amount_try) - flt(entry.local_amount_try)),
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


def _parse_csv_rows(*, csv_text: str, delimiter: str, limit: int) -> list[dict[str, str]]:
    safe_text = str(csv_text or "").strip()
    if not safe_text:
        return []
    reader = csv.DictReader(io.StringIO(safe_text), delimiter=(delimiter or ",")[0])
    rows: list[dict[str, str]] = []
    for index, row in enumerate(reader):
        if index >= max(int(limit), 1):
            break
        rows.append({str(key or "").strip(): str(value or "").strip() for key, value in (row or {}).items()})
    return rows


def _normalize_preview_row(row: dict[str, str]) -> dict[str, Any]:
    external_ref = row.get("external_ref") or row.get("externalRef") or row.get("ref") or ""
    policy_no = row.get("policy_no") or row.get("policyNo") or row.get("policy") or ""
    payment_no = row.get("payment_no") or row.get("paymentNo") or row.get("payment") or ""
    customer = row.get("customer") or row.get("customer_name") or ""
    amount_value = row.get("amount_try") or row.get("amount") or row.get("total") or "0"
    amount_value = str(amount_value).replace(".", "").replace(",", ".") if "," in str(amount_value) and "." in str(amount_value) else str(amount_value).replace(",", ".")
    return {
        "external_ref": external_ref,
        "policy_no": policy_no,
        "payment_no": payment_no,
        "customer": customer,
        "amount_try": flt(amount_value),
        "raw": row,
    }


def _build_policy_map(policy_refs: list[str], *, office_branch: str | None, insurance_company: str | None) -> dict[str, dict[str, Any]]:
    refs = [str(value or "").strip() for value in policy_refs if str(value or "").strip()]
    if not refs:
        return {}
    ref_set = list(set(refs))
    filters: dict[str, Any] = {"policy_no": ["in", ref_set]}
    if office_branch:
        filters["office_branch"] = office_branch
    if insurance_company:
        filters["insurance_company"] = insurance_company
    rows = frappe.get_all(
        "AT Policy",
        filters=filters,
        fields=["name", "policy_no", "customer", "insurance_company", "office_branch", "status"],
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
    fallback_rows = frappe.get_all(
        "AT Policy",
        filters=fallback_filters,
        fields=["name", "policy_no", "customer", "insurance_company", "office_branch", "status"],
        limit_page_length=0,
    )
    for row in fallback_rows:
        policy_map[str(row.get("name") or "").strip()] = row
    return policy_map


def _build_payment_map(payment_refs: list[str], *, office_branch: str | None) -> dict[str, dict[str, Any]]:
    refs = [str(value or "").strip() for value in payment_refs if str(value or "").strip()]
    if not refs:
        return {}
    filters: dict[str, Any] = {"payment_no": ["in", list(set(refs))]}
    if office_branch:
        filters["office_branch"] = office_branch
    rows = frappe.get_all(
        "AT Payment",
        filters=filters,
        fields=["name", "payment_no", "customer", "policy", "office_branch", "status", "amount_try"],
        limit_page_length=0,
    )
    return {str(row.get("payment_no") or "").strip(): row for row in rows}


def _build_statement_row_hash(payload: dict[str, Any]) -> str:
    serialized = frappe.as_json(payload)
    return sha256(serialized.encode("utf-8")).hexdigest()

