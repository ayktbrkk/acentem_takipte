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

    policies = frappe.get_all(
        "AT Policy",
        filters={"status": ["in", ["Active", "Record"]], "commission_amount": [">", 0]},
        fields=["name", "issue_date", "sales_entity", "commission_distribution"],
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
            n
            for n in all_names
            if _entity_branch(n) == office_branch
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
                "entity_name": name,
                "entity_type": _entity_type(name),
                "office_branch": _entity_branch(name),
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

    return {
        "summary": {
            "total_accrued_try": round(sum(e["accrued_try"] for e in entity_list), 2),
            "total_paid_try": round(sum(e["paid_try"] for e in entity_list), 2),
            "total_remaining_try": round(sum(e["remaining_try"] for e in entity_list), 2),
        },
        "entities": entity_list,
    }


def compute_entity_detail(entity_name: str, limit: int = 50) -> dict:
    """Drill-down: policies allocating commission to this entity, plus payment history."""

    entity_name = str(entity_name or "").strip()
    safe_limit = max(cint(limit), 1)
    today = getdate(nowdate())

    entity_row = (
        frappe.db.get_value(
            "AT Sales Entity",
            entity_name,
            ["name", "full_name", "entity_type", "office_branch"],
            as_dict=True,
        )
        or {}
    )

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
            if entry.get("entity") != entity_name:
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
            "sales_entity": entity_name,
            "status": ["!=", "Cancelled"],
        },
        fields=["name", "payment_no", "amount_try", "payment_date", "reference_no"],
        order_by="payment_date desc",
        limit_page_length=safe_limit,
    )

    return {
        "entity": {
            "name": entity_row.get("name", entity_name),
            "full_name": entity_row.get("full_name") or "",
            "entity_type": entity_row.get("entity_type") or "",
            "office_branch": entity_row.get("office_branch") or "",
        },
        "accrued_policies": accrued_policies[:safe_limit],
        "payments": payment_rows,
    }


# -- helpers ---------------------------------------------------------

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
    val = frappe.db.get_value("AT Sales Entity", entity_name, "office_branch")
    return str(val or "")


def _entity_type(entity_name: str) -> str:
    val = frappe.db.get_value("AT Sales Entity", entity_name, "entity_type")
    return str(val or "")
