from __future__ import annotations

import json
import logging
from datetime import timedelta

import frappe
from frappe.utils import cint, flt, getdate, nowdate

from acentem_takipte.acentem_takipte.domains.accounting.services.runtime import (
    COMMISSION_DUE_DAYS,
)

logger = logging.getLogger(__name__)


def compute_commission_balances(
    office_branch: str | None = None,
    aging_bucket: str = "all",
    limit: int = 100,
    from_date: str | None = None,
    to_date: str | None = None,
) -> dict:
    """Compute accrued/paid/remaining commission per sales entity.

    Reads commission_distribution JSON from AT Policy records with
    status Active or Record, and matches against Commission Payout
    payments that have not been cancelled.
    """
    today = getdate(nowdate())
    safe_limit = max(cint(limit), 1)

    # --- Accrued from policies --------------------------------------
    accrued_by_entity: dict[str, float] = {}
    aging_by_entity: dict[str, dict[str, float]] = {}
    policy_counts: dict[str, int] = {}

    # Per (entity, insurance_company) tracking
    entity_ic_accrued: dict[tuple, float] = {}
    entity_ic_policy_count: dict[tuple, int] = {}
    entity_insurance_companies: dict[str, set[str]] = {}
    ic_display_names: dict[str, str] = {}

    policy_filters = {
        "status": ["in", ["Active", "Record"]],
        "commission_amount": [">", 0],
    }
    if from_date and to_date:
        policy_filters["issue_date"] = ["between", [from_date, to_date]]
    elif from_date:
        policy_filters["issue_date"] = [">=", from_date]
    elif to_date:
        policy_filters["issue_date"] = ["<=", to_date]

    policies = frappe.get_all(
        "AT Policy",
        filters=policy_filters,
        fields=["name", "issue_date", "sales_entity", "commission_distribution", "insurance_company"],
        limit_page_length=0,
    )

    for policy in policies:
        try:
            entries = json.loads(policy.get("commission_distribution") or "[]")
        except (json.JSONDecodeError, TypeError):
            logger.warning(
                "Skipping malformed commission_distribution for policy %s",
                policy.get("name"),
            )
            continue

        issue_date = policy.get("issue_date")
        if issue_date:
            due_date = issue_date + timedelta(days=COMMISSION_DUE_DAYS)
            days_aging = (today - due_date).days
        else:
            days_aging = 0
        bucket = _aging_bucket(days_aging)

        insurance_company = str(policy.get("insurance_company") or "").strip()
        if insurance_company and insurance_company not in ic_display_names:
            ic_display_names[insurance_company] = _ic_display_name(insurance_company)

        seen_entities: set[str] = set()
        for entry in entries:
            entity = str(entry.get("entity") or "").strip()
            amount_try = flt(entry.get("amount_try") or 0)
            if not entity or amount_try <= 0:
                continue

            accrued_by_entity[entity] = accrued_by_entity.get(entity, 0) + amount_try

            if entity not in aging_by_entity:
                aging_by_entity[entity] = {}
            aging_by_entity[entity][bucket] = (
                aging_by_entity[entity].get(bucket, 0) + amount_try
            )

            if entity not in seen_entities:
                seen_entities.add(entity)
                policy_counts[entity] = policy_counts.get(entity, 0) + 1

            if insurance_company:
                key = (entity, insurance_company)
                entity_ic_accrued[key] = entity_ic_accrued.get(key, 0) + amount_try
                entity_ic_policy_count[key] = entity_ic_policy_count.get(key, 0) + 1
                entity_insurance_companies.setdefault(entity, set()).add(insurance_company)

    # --- Paid from Commission Payout payments ----------------------
    paid_by_entity: dict[str, float] = {}
    payments = frappe.get_all(
        "AT Payment",
        filters={
            "payment_purpose": "Commission Payout",
            "status": ["!=", "Cancelled"],
        },
        fields=["sales_entity", "amount_try"],
        limit_page_length=0,
    )
    for row in payments:
        entity = str(row.get("sales_entity") or "").strip()
        if entity:
            paid_by_entity[entity] = (
                paid_by_entity.get(entity, 0) + flt(row.get("amount_try") or 0)
            )

    # --- Build entity list -----------------------------------------
    all_names = set(accrued_by_entity.keys()) | set(paid_by_entity.keys())

    if office_branch:
        office_branch = str(office_branch).strip()
        all_names = {
            n for n in all_names
            if _entity_branch_raw(n) == office_branch
        }

    entity_list: list[dict] = []
    for name in sorted(all_names):
        accrued = accrued_by_entity.get(name, 0)
        paid = paid_by_entity.get(name, 0)
        remaining = accrued - paid

        if remaining <= 0 and accrued <= 0:
            continue

        aging = aging_by_entity.get(name, {})
        if aging_bucket != "all" and aging.get(aging_bucket, 0) <= 0:
            continue

        entity_list.append(
            {
                "entity_name": _display_name(name),
                "entity_type": _entity_info(name).get("entity_type") or "",
                "office_branch": _entity_info(name).get("office_branch") or "",
                "accrued_try": round(accrued, 2),
                "paid_try": round(paid, 2),
                "remaining_try": round(remaining, 2),
                "aging": {
                    "current": round(aging.get("current", 0), 2),
                    "1_30": round(aging.get("1_30", 0), 2),
                    "31_60": round(aging.get("31_60", 0), 2),
                    "61_90": round(aging.get("61_90", 0), 2),
                    "90_plus": round(aging.get("90_plus", 0), 2),
                },
                "policy_count": policy_counts.get(name, 0),
            }
        )

    entity_list.sort(key=lambda e: e["remaining_try"], reverse=True)
    entity_list = entity_list[:safe_limit]

    # --- Add insurance_companies breakdown per entity ----------------
    for entry in entity_list:
        entry_doc_name = _resolve_entity_doc_name(entry["entity_name"])
        ics = entity_insurance_companies.get(entry_doc_name, set())
        ic_breakdown: list[dict] = []
        total_entity_accrued = accrued_by_entity.get(entry_doc_name, 0)
        total_entity_paid = paid_by_entity.get(entry_doc_name, 0)
        for ic_name in sorted(ics):
            display_ic = ic_display_names.get(ic_name, ic_name)
            key = (entry_doc_name, ic_name)
            ic_accrued = round(entity_ic_accrued.get(key, 0), 2)
            if total_entity_accrued > 0 and total_entity_paid > 0:
                ic_paid = round(ic_accrued / total_entity_accrued * total_entity_paid, 2)
            else:
                ic_paid = 0.0
            ic_breakdown.append({
                "name": display_ic,
                "accrued_try": ic_accrued,
                "paid_try": ic_paid,
                "remaining_try": round(ic_accrued - ic_paid, 2),
                "policy_count": entity_ic_policy_count.get(key, 0),
            })
        ic_breakdown.sort(key=lambda x: x["accrued_try"], reverse=True)
        entry["insurance_companies"] = ic_breakdown

    # --- Build insurance company grouping ---------------------------
    insurance_companies: list[dict] = []
    ic_entity_map: dict[str, list[dict]] = {}
    for name in {e["entity_name"] for e in entity_list}:
        doc_name = _resolve_entity_doc_name(name)
        entity_ics = entity_insurance_companies.get(doc_name, set())
        for ic_name in entity_ics:
            display_ic = ic_display_names.get(ic_name, ic_name)
            key = (doc_name, ic_name)
            ic_accrued = round(entity_ic_accrued.get(key, 0), 2)
            entity_paid = round(paid_by_entity.get(doc_name, 0), 2)
            entity_entry = {
                "entity_name": name,
                "entity_type": _entity_info(doc_name).get("entity_type") or "",
                "office_branch": _entity_info(doc_name).get("office_branch") or "",
                "accrued_try": ic_accrued,
                "paid_try": entity_paid,
                "remaining_try": round(ic_accrued - entity_paid, 2),
                "policy_count": entity_ic_policy_count.get(key, 0),
            }
            ic_entity_map.setdefault(display_ic, []).append(entity_entry)

    for display_ic, entities in ic_entity_map.items():
        total_accrued = round(sum(e["accrued_try"] for e in entities), 2)
        total_paid = round(sum(e["paid_try"] for e in entities), 2)
        insurance_companies.append(
            {
                "name": display_ic,
                "accrued_try": total_accrued,
                "paid_try": total_paid,
                "remaining_try": round(total_accrued - total_paid, 2),
                "entity_count": len(entities),
                "entities": sorted(entities, key=lambda e: e["remaining_try"], reverse=True),
            }
        )
    insurance_companies.sort(key=lambda ic: ic["remaining_try"], reverse=True)

    return {
        "summary": {
            "total_accrued_try": round(sum(e["accrued_try"] for e in entity_list), 2),
            "total_paid_try": round(sum(e["paid_try"] for e in entity_list), 2),
            "total_remaining_try": round(sum(e["remaining_try"] for e in entity_list), 2),
        },
        "insurance_companies": insurance_companies,
        "entities": entity_list,
    }


def compute_entity_detail(entity_name: str, limit: int = 50) -> dict:
    """Drill-down: policies allocating commission to this entity, plus payment history."""

    display_name = str(entity_name or "").strip()
    safe_limit = max(cint(limit), 1)
    today = getdate(nowdate())

    # Resolve display name to doc name for lookups
    doc_name = display_name
    for ent_name in _entity_cache:
        if _entity_cache[ent_name].get("full_name") == display_name:
            doc_name = ent_name
            break
    if doc_name == display_name:
        # Try to find by full_name lookup
        doc_from_db = frappe.db.get_value("AT Sales Entity", {"full_name": display_name}, "name")
        if doc_from_db:
            doc_name = str(doc_from_db)
            _entity_info(doc_name)  # prime cache

    # Policies where this entity appears in commission_distribution
    policies = frappe.get_all(
        "AT Policy",
        filters={"status": ["in", ["Active", "Record"]], "commission_amount": [">", 0]},
        fields=["name", "policy_no", "customer", "issue_date", "commission_distribution"],
        limit_page_length=0,
    )

    accrued_policies: list[dict] = []
    for policy in policies:
        try:
            entries = json.loads(policy.get("commission_distribution") or "[]")
        except (json.JSONDecodeError, TypeError):
            continue

        for entry in entries:
            entry_entity = str(entry.get("entity") or "").strip()
            if entry_entity != doc_name:
                continue
            amount_try = flt(entry.get("amount_try") or 0)
            if amount_try <= 0:
                continue

            issue_date = policy.get("issue_date")
            if issue_date:
                due_date = issue_date + timedelta(days=COMMISSION_DUE_DAYS)
                aging_days = (today - due_date).days
            else:
                aging_days = 0

            customer_name = (
                frappe.db.get_value("AT Customer", policy.get("customer"), "full_name")
                or ""
            )

            accrued_policies.append(
                {
                    "policy_name": policy["name"],
                    "policy_no": policy.get("policy_no") or policy["name"],
                    "customer_name": customer_name,
                    "commission_amount_try": round(amount_try, 2),
                    "issue_date": str(issue_date or ""),
                    "aging_days": aging_days,
                }
            )

    # Payment history for this entity
    payment_rows = frappe.get_all(
        "AT Payment",
        filters={
            "payment_purpose": "Commission Payout",
            "sales_entity": doc_name,
            "status": ["!=", "Cancelled"],
        },
        fields=["name", "payment_no", "amount_try", "payment_date", "reference_no"],
        order_by="payment_date desc",
        limit_page_length=safe_limit,
    )

    return {
        "entity": {
            "name": doc_name,
            "full_name": display_name,
            "entity_type": _entity_info(doc_name).get("entity_type") or "",
            "office_branch": _entity_info(doc_name).get("office_branch") or "",
        },
        "accrued_policies": accrued_policies[:safe_limit],
        "payments": payment_rows,
    }


def compute_commission_policy_detail(
    entity_name: str,
    insurance_company: str | None = None,
    limit: int = 50,
    from_date: str | None = None,
    to_date: str | None = None,
) -> dict:
    """Policy-level ledger for an entity, optionally filtered by insurance company."""

    display_name = str(entity_name or "").strip()
    safe_limit = max(cint(limit), 1)
    today = getdate(nowdate())

    doc_name = _resolve_entity_doc_name(display_name)

    policy_filters = {
        "status": ["in", ["Active", "Record"]],
        "commission_amount": [">", 0],
    }
    if from_date and to_date:
        policy_filters["issue_date"] = ["between", [from_date, to_date]]
    elif from_date:
        policy_filters["issue_date"] = [">=", from_date]
    elif to_date:
        policy_filters["issue_date"] = ["<=", to_date]

    policies = frappe.get_all(
        "AT Policy",
        filters=policy_filters,
        fields=[
            "name", "policy_no", "customer", "insurance_company", "branch",
            "gross_premium", "issue_date", "commission_distribution",
        ],
        limit_page_length=0,
    )

    policy_list: list[dict] = []
    policy_names: list[str] = []

    for policy in policies:
        try:
            entries = json.loads(policy.get("commission_distribution") or "[]")
        except (json.JSONDecodeError, TypeError):
            continue

        found = False
        for entry in entries:
            entry_entity = str(entry.get("entity") or "").strip()
            if entry_entity != doc_name:
                continue
            amount_try = flt(entry.get("amount_try") or 0)
            if amount_try <= 0:
                continue
            found = True
            break

        if not found:
            continue

        policy_ic = str(policy.get("insurance_company") or "").strip()
        if insurance_company:
            if policy_ic != insurance_company:
                ic_display = _ic_display_name(policy_ic)
                if ic_display != insurance_company:
                    continue

        policy_names.append(policy["name"])

        issue_date = policy.get("issue_date")
        if issue_date:
            due_date = issue_date + timedelta(days=COMMISSION_DUE_DAYS)
            aging_days = (today - due_date).days
        else:
            aging_days = 0

        customer_name = ""
        if policy.get("customer"):
            customer_name = (
                frappe.db.get_value("AT Customer", policy["customer"], "full_name") or ""
            )

        ic_display_name = _ic_display_name(policy_ic) if policy_ic else ""
        branch_display = ""
        if policy.get("branch"):
            branch_display = (
                frappe.db.get_value("AT Branch", policy["branch"], "branch_name") or ""
            )

        policy_list.append(
            {
                "policy_name": policy["name"],
                "policy_no": policy.get("policy_no") or policy["name"],
                "customer_name": customer_name,
                "insurance_company": ic_display_name,
                "branch": branch_display,
                "gross_premium": round(flt(policy.get("gross_premium") or 0), 2),
                "commission_amount_try": round(flt(amount_try), 2),
                "issue_date": str(issue_date or ""),
                "aging_days": aging_days,
                "aging_bucket": _aging_bucket(aging_days),
                "payment": None,
            }
        )

    # --- Resolve payments for these policies ------------------------
    policy_payments: dict[str, dict] = {}
    if policy_names:
        payments = frappe.get_all(
            "AT Payment",
            filters={
                "payment_purpose": "Commission Payout",
                "status": ["!=", "Cancelled"],
                "policy": ["in", policy_names],
            },
            fields=["name", "payment_no", "amount_try", "payment_date", "reference_no", "policy"],
            limit_page_length=0,
        )
        for payment in payments:
            policy_name = str(payment.get("policy") or "").strip()
            if policy_name:
                policy_payments[policy_name] = {
                    "name": payment["name"],
                    "payment_no": payment.get("payment_no") or payment["name"],
                    "amount_try": round(flt(payment.get("amount_try") or 0), 2),
                    "payment_date": str(payment.get("payment_date") or ""),
                    "reference_no": str(payment.get("reference_no") or ""),
                }

    for p in policy_list:
        p["payment"] = policy_payments.get(p["policy_name"])

    # --- Sort and limit ---------------------------------------------
    policy_list.sort(key=lambda p: p["issue_date"], reverse=True)
    policy_list = policy_list[:safe_limit]

    # --- Totals -----------------------------------------------------
    total_commission = round(sum(p["commission_amount_try"] for p in policy_list), 2)
    total_paid = round(
        sum(p["payment"]["amount_try"] for p in policy_list if p["payment"]), 2
    )

    filtered_ic_display = ""
    if insurance_company:
        filtered_ic_display = _ic_display_name(insurance_company) if insurance_company else insurance_company

    return {
        "entity": {
            "name": doc_name,
            "full_name": display_name,
            "entity_type": _entity_info(doc_name).get("entity_type") or "",
            "office_branch": _entity_info(doc_name).get("office_branch") or "",
        },
        "insurance_company": filtered_ic_display,
        "policies": policy_list,
        "totals": {
            "policies": len(policy_list),
            "gross_premium": round(sum(p["gross_premium"] for p in policy_list), 2),
            "commission": total_commission,
            "paid": total_paid,
            "remaining": round(total_commission - total_paid, 2),
        },
    }


# -- helpers ---------------------------------------------------------

_entity_cache: dict[str, dict] = {}
_ic_display_cache: dict[str, str] = {}


def _ic_display_name(insurance_company: str) -> str:
    if insurance_company in _ic_display_cache:
        return _ic_display_cache[insurance_company]
    display = (
        frappe.db.get_value("AT Insurance Company", insurance_company, "company_name")
        or insurance_company
    )
    display = str(display) if display else insurance_company
    _ic_display_cache[insurance_company] = display
    return display


def _resolve_entity_doc_name(display_name: str) -> str:
    doc_name = display_name
    for ent_name in _entity_cache:
        if _entity_cache[ent_name].get("full_name") == display_name:
            doc_name = ent_name
            break
    if doc_name == display_name:
        doc_from_db = frappe.db.get_value("AT Sales Entity", {"full_name": display_name}, "name")
        if doc_from_db:
            doc_name = str(doc_from_db)
            _entity_info(doc_name)
    return doc_name


def _entity_info(entity_name: str) -> dict:
    """Resolve entity display fields with simple in-memory cache."""
    if entity_name in _entity_cache:
        return _entity_cache[entity_name]
    row = frappe.db.get_value(
        "AT Sales Entity",
        entity_name,
        ["full_name", "entity_type", "office_branch"],
        as_dict=True,
    )
    info = row if row else {"full_name": entity_name, "entity_type": "", "office_branch": ""}
    if info.get("office_branch"):
        info["office_branch"] = (
            frappe.db.get_value("AT Office Branch", info["office_branch"], "office_branch_name")
            or info["office_branch"]
        )
    _entity_cache[entity_name] = info
    return info


def _display_name(entity_name: str) -> str:
    return str(_entity_info(entity_name).get("full_name") or entity_name)


def _aging_bucket(days: int) -> str:
    if days <= 0:
        return "current"
    if days <= 30:
        return "1_30"
    if days <= 60:
        return "31_60"
    if days <= 90:
        return "61_90"
    return "90_plus"


def _entity_branch(entity_name: str) -> str:
    return str(_entity_info(entity_name).get("office_branch") or "")


def _entity_branch_raw(entity_name: str) -> str:
    val = frappe.db.get_value("AT Sales Entity", entity_name, "office_branch")
    return str(val or "")


def _entity_type(entity_name: str) -> str:
    return str(_entity_info(entity_name).get("entity_type") or "")
