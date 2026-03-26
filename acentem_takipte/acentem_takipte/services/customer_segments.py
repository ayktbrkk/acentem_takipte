from __future__ import annotations

import json
from typing import Any

import frappe
from frappe.utils import cint, flt, getdate, today


SNAPSHOT_SOURCE_VERSION = "v1"


def build_customer_segment_snapshot_payload(
    *,
    active_policy_count: int,
    policy_total_premium: float,
    open_claim_count: int,
    upcoming_renewal_count: int,
    overdue_payment_count: int,
    overdue_payment_amount: float,
    total_policy_count: int,
    cancelled_policy_count: int,
) -> dict[str, Any]:
    score = 0
    strengths: list[str] = []
    risks: list[str] = []

    if active_policy_count >= 3:
        score += 40
        strengths.append("multi_policy")
    elif active_policy_count >= 1:
        score += 20
        strengths.append("active_portfolio")

    if policy_total_premium >= 100000:
        score += 30
        strengths.append("high_premium")
    elif policy_total_premium >= 25000:
        score += 15
        strengths.append("medium_premium")

    if open_claim_count == 0 and total_policy_count > 0:
        score += 15
        strengths.append("clean_claims")
    elif open_claim_count >= 2:
        score -= 10
        risks.append("claim_pressure")

    if upcoming_renewal_count > 0:
        score += 15
        strengths.append("renewal_pipeline")

    if overdue_payment_count >= 2 or overdue_payment_amount >= 10000:
        score -= 20
        risks.append("collection_risk")
    elif overdue_payment_count == 1:
        score -= 10
        risks.append("overdue_payment")

    if cancelled_policy_count >= 2:
        score -= 10
        risks.append("cancellation_history")

    score = max(0, min(100, score))

    if score >= 80:
        segment = "Strategic"
    elif score >= 50:
        segment = "Growth"
    elif score >= 25:
        segment = "Core"
    else:
        segment = "Dormant"

    claim_risk = "Low"
    if open_claim_count >= 2 or cancelled_policy_count >= 2:
        claim_risk = "High"
    elif open_claim_count >= 1:
        claim_risk = "Medium"

    value_band = "Standard"
    if policy_total_premium >= 100000:
        value_band = "High Value"
    elif policy_total_premium >= 25000:
        value_band = "Mid Value"

    return {
        "score": score,
        "segment": segment,
        "claim_risk": claim_risk,
        "value_band": value_band,
        "strengths": strengths[:4],
        "risks": risks[:4],
        "score_reason": {
            "active_policy_count": active_policy_count,
            "policy_total_premium": policy_total_premium,
            "open_claim_count": open_claim_count,
            "upcoming_renewal_count": upcoming_renewal_count,
            "overdue_payment_count": overdue_payment_count,
            "overdue_payment_amount": overdue_payment_amount,
            "cancelled_policy_count": cancelled_policy_count,
        },
        "source_version": SNAPSHOT_SOURCE_VERSION,
    }


def upsert_customer_segment_snapshot(
    *,
    customer_name: str,
    office_branch: str | None,
    snapshot_date,
    insight_payload: dict[str, Any],
) -> dict[str, Any]:
    if not frappe.db.exists("DocType", "AT Customer Segment Snapshot"):
        return dict(insight_payload or {})

    business_date = getdate(snapshot_date)
    existing_name = frappe.db.get_value(
        "AT Customer Segment Snapshot",
        {"customer": customer_name, "snapshot_date": business_date},
        "name",
    )
    snapshot = (
        frappe.get_doc("AT Customer Segment Snapshot", existing_name)
        if existing_name
        else frappe.get_doc(
            {
                "doctype": "AT Customer Segment Snapshot",
                "customer": customer_name,
                "snapshot_date": business_date,
            }
        )
    )

    snapshot.office_branch = office_branch
    snapshot.source_version = str(
        insight_payload.get("source_version") or SNAPSHOT_SOURCE_VERSION
    )
    snapshot.score = int(insight_payload.get("score") or 0)
    snapshot.segment = str(insight_payload.get("segment") or "")
    snapshot.claim_risk = str(insight_payload.get("claim_risk") or "")
    snapshot.value_band = str(insight_payload.get("value_band") or "")
    snapshot.strengths_json = json.dumps(
        insight_payload.get("strengths") or [], ensure_ascii=False
    )
    snapshot.risks_json = json.dumps(
        insight_payload.get("risks") or [], ensure_ascii=False
    )
    snapshot.score_reason_json = json.dumps(
        insight_payload.get("score_reason") or {}, ensure_ascii=False
    )

    if existing_name:
        # ignore_permissions: Customer segment snapshot; runs from scheduler job.
        snapshot.save(ignore_permissions=True)
    else:
        # ignore_permissions: Customer segment snapshot; runs from scheduler job.
        snapshot.insert(ignore_permissions=True)

    return serialize_customer_segment_snapshot(snapshot)


def serialize_customer_segment_snapshot(snapshot_doc) -> dict[str, Any]:
    strengths = _parse_json_list(snapshot_doc.strengths_json)
    risks = _parse_json_list(snapshot_doc.risks_json)
    score_reason = _parse_json_object(snapshot_doc.score_reason_json)
    return {
        "score": int(snapshot_doc.score or 0),
        "segment": str(snapshot_doc.segment or ""),
        "claim_risk": str(snapshot_doc.claim_risk or ""),
        "value_band": str(snapshot_doc.value_band or ""),
        "strengths": strengths,
        "risks": risks,
        "score_reason": score_reason,
        "snapshot_date": str(snapshot_doc.snapshot_date or ""),
        "source_version": str(snapshot_doc.source_version or SNAPSHOT_SOURCE_VERSION),
    }


def refresh_due_customer_segment_snapshots(
    limit: int = 250, snapshot_date=None
) -> dict[str, Any]:
    business_date = getdate(snapshot_date or today())
    safe_limit = max(cint(limit or 250), 1)
    filters = (
        {"disabled": 0} if frappe.db.has_column("AT Customer", "disabled") else None
    )
    customers = frappe.get_all(
        "AT Customer",
        filters=filters,
        fields=["name", "office_branch"],
        order_by="modified desc",
        limit_page_length=safe_limit,
    )

    processed = 0
    refreshed = 0

    for customer in customers:
        processed += 1
        metrics = _collect_customer_segment_metrics(customer.name)
        insight_payload = build_customer_segment_snapshot_payload(**metrics)
        upsert_customer_segment_snapshot(
            customer_name=customer.name,
            office_branch=getattr(customer, "office_branch", None),
            snapshot_date=business_date,
            insight_payload=insight_payload,
        )
        refreshed += 1

    return {
        "processed": processed,
        "refreshed": refreshed,
        "limit": safe_limit,
        "snapshot_date": str(business_date),
    }


def _parse_json_list(value) -> list[Any]:
    try:
        parsed = frappe.parse_json(value) if isinstance(value, str) else value
    except Exception:
        parsed = []
    return parsed if isinstance(parsed, list) else []


def _parse_json_object(value) -> dict[str, Any]:
    try:
        parsed = frappe.parse_json(value) if isinstance(value, str) else value
    except Exception:
        parsed = {}
    return parsed if isinstance(parsed, dict) else {}


def _collect_customer_segment_metrics(customer_name: str) -> dict[str, Any]:
    policies = frappe.get_all(
        "AT Policy",
        filters={"customer": customer_name},
        fields=["status", "gross_premium"],
        limit_page_length=500,
    )
    total_policy_count = len(policies)
    active_policy_count = sum(
        1 for row in policies if (row.status or "") in {"Active", "Renewal"}
    )
    cancelled_policy_count = sum(
        1 for row in policies if (row.status or "") == "Cancelled"
    )
    policy_total_premium = sum(flt(row.gross_premium) for row in policies)

    claims = frappe.get_all(
        "AT Claim",
        filters={"customer": customer_name},
        fields=["claim_status"],
        limit_page_length=500,
    )
    open_claim_count = sum(
        1 for row in claims if (row.claim_status or "") not in {"Closed", "Rejected"}
    )

    overdue_payment_count = 0
    overdue_payment_amount = 0.0
    if frappe.db.exists("DocType", "AT Payment Installment"):
        overdue_installments = frappe.get_all(
            "AT Payment Installment",
            filters={"customer": customer_name, "status": "Overdue"},
            fields=["amount_try"],
            limit_page_length=500,
        )
        overdue_payment_count = len(overdue_installments)
        overdue_payment_amount = sum(
            flt(row.amount_try) for row in overdue_installments
        )
    else:
        overdue_payments = frappe.get_all(
            "AT Payment",
            filters={"customer": customer_name, "status": "Overdue"},
            fields=["amount_try"],
            limit_page_length=500,
        )
        overdue_payment_count = len(overdue_payments)
        overdue_payment_amount = sum(flt(row.amount_try) for row in overdue_payments)

    upcoming_renewal_count = frappe.db.count(
        "AT Renewal Task",
        filters={"customer": customer_name, "status": ["in", ["Open", "In Progress"]]},
    )

    return {
        "active_policy_count": active_policy_count,
        "policy_total_premium": policy_total_premium,
        "open_claim_count": open_claim_count,
        "upcoming_renewal_count": upcoming_renewal_count,
        "overdue_payment_count": overdue_payment_count,
        "overdue_payment_amount": overdue_payment_amount,
        "total_policy_count": total_policy_count,
        "cancelled_policy_count": cancelled_policy_count,
    }
