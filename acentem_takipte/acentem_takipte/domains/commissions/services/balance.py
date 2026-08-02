from __future__ import annotations

import json
import logging
from datetime import timedelta

import frappe
from frappe.utils import cint, flt, getdate, nowdate

from acentem_takipte.acentem_takipte.domains.accounting.services.runtime import (
    COMMISSION_DUE_DAYS,
)
from acentem_takipte.acentem_takipte.utils.statuses import ATPolicyStatus

logger = logging.getLogger(__name__)


def compute_commission_balances(
    office_branch: str | None = None,
    aging_bucket: str = "all",
    limit: int = 100,
    from_date: str | None = None,
    to_date: str | None = None,
    insurance_company: str | None = None,
) -> dict:
    """Compute accrued/paid/remaining commission per sales entity.

    Reads commission_distribution JSON from AT Policy records with
    status Active or Record, and matches against Commission Payout
    payments that have not been cancelled.

    insurance_company filter matches either the doc name or display name
    of the insurance company linked to each policy.
    """
    today = getdate(nowdate())
    safe_limit = max(cint(limit), 1)

    # -- Resolve insurance_company filter ---------------------------------
    ic_filter_doc_name: str | None = None
    if insurance_company:
        ic_filter_doc_name = str(insurance_company).strip()

    # --- Accrued from policies --------------------------------------
    accrued_by_entity: dict[str, float] = {}
    aging_by_entity: dict[str, dict[str, float]] = {}
    policy_counts: dict[str, int] = {}

    # Per (entity, insurance_company) tracking
    entity_ic_accrued: dict[tuple, float] = {}
    entity_ic_policy_count: dict[tuple, int] = {}
    entity_insurance_companies: dict[str, set[str]] = {}
    ic_display_names: dict[str, str] = {}

    # Track which policy names pass the active filters so payment
    # aggregation can be scoped to the same filtered set.
    has_active_filter = bool(ic_filter_doc_name or from_date or to_date or aging_bucket != "all")
    filtered_policy_names: set[str] = set()
    aging_bucket_policy_names: set[str] = set()

    # Per-bucket accrued so entity values can be scoped to the
    # selected aging bucket without affecting the full-dataset totals.
    bucket_accrued_by_entity: dict[str, float] = {}
    bucket_policy_counts: dict[str, int] = {}
    bucket_ic_accrued: dict[tuple, float] = {}
    bucket_ic_policy_count: dict[tuple, int] = {}

    policy_filters = {
        "status": ["in", list(ATPolicyStatus.COMMISSION_ACCRUAL)],
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
        if ic_filter_doc_name:
            policy_ic_display = _ic_display_name(insurance_company)
            if insurance_company != ic_filter_doc_name and policy_ic_display != ic_filter_doc_name:
                continue
        if insurance_company and insurance_company not in ic_display_names:
            ic_display_names[insurance_company] = _ic_display_name(insurance_company)

        filtered_policy_names.add(policy["name"])
        if aging_bucket == "all" or bucket == aging_bucket:
            aging_bucket_policy_names.add(policy["name"])

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
            if aging_bucket == "all" or bucket == aging_bucket:
                bucket_accrued_by_entity[entity] = bucket_accrued_by_entity.get(entity, 0) + amount_try

            if entity not in seen_entities:
                seen_entities.add(entity)
                policy_counts[entity] = policy_counts.get(entity, 0) + 1
                if aging_bucket == "all" or bucket == aging_bucket:
                    bucket_policy_counts[entity] = bucket_policy_counts.get(entity, 0) + 1

            if insurance_company:
                key = (entity, insurance_company)
                entity_ic_accrued[key] = entity_ic_accrued.get(key, 0) + amount_try
                entity_ic_policy_count[key] = entity_ic_policy_count.get(key, 0) + 1
                entity_insurance_companies.setdefault(entity, set()).add(insurance_company)
                if aging_bucket == "all" or bucket == aging_bucket:
                    bucket_ic_accrued[key] = bucket_ic_accrued.get(key, 0) + amount_try
                    bucket_ic_policy_count[key] = bucket_ic_policy_count.get(key, 0) + 1

    # --- Paid from Commission Payout payments ----------------------
    paid_by_entity: dict[str, float] = {}
    paid_by_entity_ic: dict[tuple, float] = {}
    bucket_paid_by_entity_ic: dict[tuple, float] = {}
    policy_ic_cache: dict[str, str] = {}
    payments = frappe.get_all(
        "AT Payment",
        filters={
            "payment_purpose": "Commission Payout",
            "status": ["!=", "Cancelled"],
        },
        fields=["sales_entity", "amount_try", "policy"],
        limit_page_length=0,
    )
    for row in payments:
        if has_active_filter:
            policy_name = str(row.get("policy") or "").strip()
            if policy_name not in filtered_policy_names:
                continue
            if aging_bucket != "all" and policy_name not in aging_bucket_policy_names:
                continue
        entity = str(row.get("sales_entity") or "").strip()
        amount = flt(row.get("amount_try") or 0)
        if entity and amount > 0:
            paid_by_entity[entity] = paid_by_entity.get(entity, 0) + amount
            policy_name = str(row.get("policy") or "").strip()
            if policy_name:
                if policy_name not in policy_ic_cache:
                    policy_ic_cache[policy_name] = str(
                        frappe.db.get_value("AT Policy", policy_name, "insurance_company") or ""
                    ).strip()
                ic = policy_ic_cache[policy_name]
                if ic:
                    ic_key = (entity, ic)
                    paid_by_entity_ic[ic_key] = paid_by_entity_ic.get(ic_key, 0) + amount
                    if aging_bucket != "all":
                        bucket_paid_by_entity_ic[ic_key] = bucket_paid_by_entity_ic.get(ic_key, 0) + amount

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
        if aging_bucket != "all":
            accrued = bucket_accrued_by_entity.get(name, 0)
        else:
            accrued = accrued_by_entity.get(name, 0)
        paid = paid_by_entity.get(name, 0)
        remaining = accrued - paid

        if remaining <= 0 and accrued <= 0:
            continue

        aging = aging_by_entity.get(name, {})
        if aging_bucket != "all" and aging.get(aging_bucket, 0) <= 0:
            continue

        pcount = bucket_policy_counts.get(name, 0) if aging_bucket != "all" else policy_counts.get(name, 0)

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
                "policy_count": pcount,
            }
        )

    entity_list.sort(key=lambda e: e["remaining_try"], reverse=True)
    total_count = len(entity_list)
    entity_list_limited = entity_list[:safe_limit]

    # --- Compute summary from FULL filtered set, not just the limited slice
    total_accrued = round(sum(e["accrued_try"] for e in entity_list), 2)
    total_paid = round(sum(e["paid_try"] for e in entity_list), 2)
    total_remaining = round(sum(e["remaining_try"] for e in entity_list), 2)

    # --- Add insurance_companies breakdown per entity ----------------
    for entry in entity_list_limited:
        entry_doc_name = _resolve_entity_doc_name(entry["entity_name"])
        ics = entity_insurance_companies.get(entry_doc_name, set())
        ic_breakdown: list[dict] = []
        for ic_name in sorted(ics):
            display_ic = ic_display_names.get(ic_name, ic_name)
            key = (entry_doc_name, ic_name)
            if aging_bucket != "all":
                ic_accrued = round(bucket_ic_accrued.get(key, 0), 2)
                ic_pcount = bucket_ic_policy_count.get(key, 0)
                ic_paid = round(bucket_paid_by_entity_ic.get(key, 0), 2)
            else:
                ic_accrued = round(entity_ic_accrued.get(key, 0), 2)
                ic_pcount = entity_ic_policy_count.get(key, 0)
                ic_paid = round(paid_by_entity_ic.get(key, 0), 2)
            if ic_accrued <= 0 and ic_pcount <= 0 and ic_paid <= 0:
                continue
            ic_breakdown.append({
                "name": display_ic,
                "accrued_try": ic_accrued,
                "paid_try": ic_paid,
                "remaining_try": round(ic_accrued - ic_paid, 2),
                "policy_count": ic_pcount,
            })
        ic_breakdown.sort(key=lambda x: x["accrued_try"], reverse=True)
        entry["insurance_companies"] = ic_breakdown

    # --- Add reconciliation summary ---------------------------------
    reconciliation = _commission_reconciliation_summary(
        insurance_company=ic_filter_doc_name,
        from_date=from_date,
        to_date=to_date,
    )

    return {
        "summary": {
            "total_accrued_try": total_accrued,
            "total_paid_try": total_paid,
            "total_remaining_try": total_remaining,
        },
        "total_count": total_count,
        "returned_count": len(entity_list_limited),
        "entities": entity_list_limited,
        "reconciliation": reconciliation,
    }


def _commission_reconciliation_summary(
    insurance_company: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
) -> dict[str, int]:
    """Count open AT Reconciliation Items linked to commission statement
    AT Accounting Entries, optionally filtered by insurance_company and date."""
    entry_filters: dict = {"source_doctype": "AT Policy", "entry_type": "Policy"}
    if insurance_company:
        entry_filters["insurance_company"] = insurance_company
    if from_date and to_date:
        entry_filters["creation"] = ["between", [from_date, to_date]]
    elif from_date:
        entry_filters["creation"] = [">=", from_date]
    elif to_date:
        entry_filters["creation"] = ["<=", to_date]

    entries = frappe.get_all(
        "AT Accounting Entry",
        filters=entry_filters,
        fields=["name"],
        limit_page_length=0,
    )
    if not entries:
        return {"open_items": 0, "total_items": 0}

    entry_names = [e["name"] for e in entries]
    open_items = frappe.db.count(
        "AT Reconciliation Item",
        {"accounting_entry": ["in", entry_names], "status": "Open"},
    )
    total_items = frappe.db.count(
        "AT Reconciliation Item",
        {"accounting_entry": ["in", entry_names]},
    )
    return {"open_items": open_items or 0, "total_items": total_items or 0}


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
        filters={"status": ["in", list(ATPolicyStatus.COMMISSION_ACCRUAL)], "commission_amount": [">", 0]},
        fields=["name", "policy_no", "customer", "issue_date", "commission_distribution"],
        limit_page_length=0,
    )

    matched: list[tuple[dict, float]] = []
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
            matched.append((policy, amount_try))
            break

    # Batch customer display-name lookups (avoid N+1)
    customer_map: dict[str, str] = {}
    customer_names = {
        str(policy.get("customer") or "").strip()
        for policy, _ in matched
        if str(policy.get("customer") or "").strip()
    }
    if customer_names:
        for row in frappe.get_all(
            "AT Customer",
            filters={"name": ["in", list(customer_names)]},
            fields=["name", "full_name"],
            limit_page_length=0,
        ):
            customer_map[row["name"]] = row.get("full_name") or ""

    accrued_policies: list[dict] = []
    for policy, amount_try in matched:
        issue_date = policy.get("issue_date")
        if issue_date:
            due_date = issue_date + timedelta(days=COMMISSION_DUE_DAYS)
            aging_days = (today - due_date).days
        else:
            aging_days = 0

        customer_name = customer_map.get(str(policy.get("customer") or "").strip(), "")

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
        "status": ["in", list(ATPolicyStatus.COMMISSION_ACCRUAL)],
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
    matched: list[tuple[dict, float]] = []

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
        matched.append((policy, amount_try))

    # --- Batch customer / branch display-name lookups (avoid N+1) ------
    customer_map: dict[str, str] = {}
    branch_map: dict[str, str] = {}
    customer_names = {
        str(policy.get("customer") or "").strip()
        for policy, _ in matched
        if str(policy.get("customer") or "").strip()
    }
    branch_names = {
        str(policy.get("branch") or "").strip()
        for policy, _ in matched
        if str(policy.get("branch") or "").strip()
    }
    if customer_names:
        for row in frappe.get_all(
            "AT Customer",
            filters={"name": ["in", list(customer_names)]},
            fields=["name", "full_name"],
            limit_page_length=0,
        ):
            customer_map[row["name"]] = row.get("full_name") or ""
    if branch_names:
        for row in frappe.get_all(
            "AT Branch",
            filters={"name": ["in", list(branch_names)]},
            fields=["name", "branch_name"],
            limit_page_length=0,
        ):
            branch_map[row["name"]] = row.get("branch_name") or ""

    for policy, amount_try in matched:
        policy_ic = str(policy.get("insurance_company") or "").strip()

        issue_date = policy.get("issue_date")
        if issue_date:
            due_date = issue_date + timedelta(days=COMMISSION_DUE_DAYS)
            aging_days = (today - due_date).days
        else:
            aging_days = 0

        customer_name = customer_map.get(str(policy.get("customer") or "").strip(), "")
        ic_display_name = _ic_display_name(policy_ic) if policy_ic else ""
        branch_display = branch_map.get(str(policy.get("branch") or "").strip(), "")

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


def compute_entity_hierarchy(office_branch: str | None = None) -> dict:
    """Compute the sales entity hierarchy tree for an office branch.

    Returns a tree structure with parent-child relationships and
    commission share percentages. Used for hierarchy visualization
    and share percentage management.
    """
    filters = {"is_active": 1}
    if office_branch:
        filters["office_branch"] = office_branch

    entities = frappe.get_all(
        "AT Sales Entity",
        filters=filters,
        fields=["name", "full_name", "entity_type", "office_branch",
                "parent_entity", "is_root", "commission_share_pct", "is_pool"],
        order_by="full_name asc",
        limit_page_length=0,
    )

    # Build lookup maps
    entity_map = {e["name"]: e for e in entities}
    children_map: dict[str, list[dict]] = {}
    roots: list[dict] = []

    for e in entities:
        node = {
            "name": e["name"],
            "full_name": e["full_name"],
            "entity_type": e["entity_type"],
            "office_branch": e["office_branch"],
            "share_pct": flt(e.get("commission_share_pct") or 0),
            "is_root": bool(e.get("is_root")),
            "is_pool": bool(e.get("is_pool")),
            "children": [],
        }
        parent = e.get("parent_entity")
        if parent and parent in entity_map:
            children_map.setdefault(parent, []).append(node)
        elif e.get("is_root"):
            roots.append(node)

    # Attach children recursively
    def attach_children(node):
        children = children_map.get(node["name"], [])
        node["children"] = sorted(children, key=lambda c: c["full_name"])
        for child in node["children"]:
            attach_children(child)

    for root in roots:
        attach_children(root)

    # Compute sibling totals for validation
    def compute_sibling_totals(node):
        children = node.get("children", [])
        if children:
            total_pct = sum(c["share_pct"] for c in children)
            node["children_total_pct"] = round(total_pct, 2)
            node["children_valid"] = total_pct <= 100
        for child in children:
            compute_sibling_totals(child)

    for root in roots:
        compute_sibling_totals(root)

    return {
        "branches": sorted(roots, key=lambda r: r["full_name"]),
        "total_entities": len(entities),
    }


def validate_share_pct_totals(office_branch: str | None = None) -> list[dict]:
    """Validate all share_pct totals in a hierarchy.

    Returns list of violations where siblings' total exceeds 100%.
    """
    hierarchy = compute_entity_hierarchy(office_branch)
    violations = []

    def check_node(node):
        children = node.get("children", [])
        if children:
            total_pct = sum(c["share_pct"] for c in children)
            if total_pct > 100:
                violations.append({
                    "parent": node["full_name"],
                    "parent_name": node["name"],
                    "total_pct": round(total_pct, 2),
                    "children": [{"name": c["name"], "full_name": c["full_name"], "share_pct": c["share_pct"]} for c in children],
                })
        for child in children:
            check_node(child)

    for branch in hierarchy.get("branches", []):
        check_node(branch)

    return violations


def build_commission_distribution(
    sales_entity: str | None,
    commission_amount: float,
    fx_rate: float = 1.0,
) -> str:
    """Build a head-office-centric commission distribution across the entity hierarchy.

    Each non-root entity retains commission_amount * share_pct / 100 of the original
    commission amount. The root entity receives all remaining commission.

    This is the canonical implementation shared by at_policy.py and recalc_commission_dist.py.
    """
    commission = flt(commission_amount)
    fx = flt(fx_rate) or 1
    if commission <= 0 or not sales_entity:
        return "[]"
    entries: list[dict] = []
    level = 0
    current_entity: str | None = sales_entity
    visited: set[str] = set()
    non_root_total = 0.0
    root_entry: dict | None = None
    while current_entity and current_entity not in visited:
        visited.add(current_entity)
        entity_data = frappe.db.get_value(
            "AT Sales Entity",
            current_entity,
            ["commission_share_pct", "full_name", "parent_entity", "office_branch", "is_root"],
            as_dict=True,
        ) or {}
        share_pct = flt(entity_data.get("commission_share_pct") or 0)
        share_pct = max(0.0, min(100.0, share_pct))
        is_root = entity_data.get("is_root")
        entity_name = entity_data.get("full_name") or current_entity
        office_branch = entity_data.get("office_branch")
        if is_root:
            root_entry = {
                "entity": current_entity, "entity_name": entity_name, "level": level,
                "share_pct": share_pct, "amount": 0.0, "amount_try": 0.0,
                "status": "Accrued", "office_branch": office_branch, "is_root": True,
            }
            break
        entry_amount = round(commission * share_pct / 100, 2)
        non_root_total = round(non_root_total + entry_amount, 2)
        entries.append({
            "entity": current_entity, "entity_name": entity_name, "level": level,
            "share_pct": share_pct, "amount": entry_amount,
            "amount_try": round(entry_amount * fx, 2), "status": "Accrued",
            "office_branch": office_branch, "is_root": False,
        })
        if commission - non_root_total <= 0.01:
            break
        current_entity = entity_data.get("parent_entity")
        level += 1
        if level > 20:
            break
    if root_entry is not None:
        root_amount = round(commission - non_root_total, 2)
        root_entry["amount"] = root_amount
        root_entry["amount_try"] = round(root_amount * fx, 2)
        entries.append(root_entry)
    elif entries and non_root_total < commission - 0.01:
        # No explicit is_root entity found; the top-most entity in the chain
        # (no parent) is the effective root and absorbs the remainder so the
        # distribution always totals commission_amount.
        remainder = round(commission - non_root_total, 2)
        entries[-1]["amount"] = round(entries[-1]["amount"] + remainder, 2)
        entries[-1]["amount_try"] = round(entries[-1]["amount"] * fx, 2)
        entries[-1]["is_root"] = True
    return json.dumps(entries)
