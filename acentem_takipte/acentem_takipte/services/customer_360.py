from __future__ import annotations

from typing import Any

import frappe
from frappe.utils import flt, getdate, nowdate

from acentem_takipte.acentem_takipte.services.customer_segments import (
    build_customer_segment_snapshot_payload,
    upsert_customer_segment_snapshot,
)
from acentem_takipte.acentem_takipte.services.document_center import (
    build_document_profile,
)


OPEN_OFFER_STATUSES = {"Draft", "Sent", "Accepted", "Negotiation"}
ACTIVE_POLICY_STATUSES = {"Active", "Renewal", "Pending Renewal"}
OPEN_CLAIM_STATUSES = {"Open", "Under Review", "Approved"}
OPEN_RENEWAL_STATUSES = {"Open", "In Progress"}


def _safe_get_list(
    doctype: str,
    *,
    fields: list[str],
    filters: dict[str, Any],
    order_by: str,
    limit_page_length: int,
) -> list[dict[str, Any]]:
    try:
        return frappe.get_list(
            doctype,
            fields=fields,
            filters=filters,
            order_by=order_by,
            limit_page_length=limit_page_length,
        )
    except frappe.DataError:
        frappe.logger("acentem_takipte").warning(
            "customer_360.%s_query_failed",
            doctype,
            exc_info=True,
        )
        return []


def build_customer_360_payload(
    customer_name: str, *, can_view_sensitive: bool = False
) -> dict[str, Any]:
    customer = frappe.get_doc("AT Customer", customer_name)
    today = getdate(nowdate())

    policies = frappe.get_list(
        "AT Policy",
        fields=[
            "name",
            "policy_no",
            "branch",
            "insurance_company",
            "status",
            "issue_date",
            "start_date",
            "end_date",
            "gross_premium",
            "commission_amount",
        ],
        filters={"customer": customer_name},
        order_by="modified desc",
        limit_page_length=100,
    )
    offers = frappe.get_list(
        "AT Offer",
        fields=[
            "name",
            "insurance_company",
            "status",
            "offer_date",
            "valid_until",
            "gross_premium",
            "converted_policy",
        ],
        filters={"customer": customer_name},
        order_by="modified desc",
        limit_page_length=50,
    )
    payments = frappe.get_list(
        "AT Payment",
        fields=[
            "name",
            "payment_no",
            "policy",
            "status",
            "payment_direction",
            "payment_date",
            "amount_try",
            "notes",
        ],
        filters={"customer": customer_name},
        order_by="payment_date desc, modified desc",
        limit_page_length=50,
    )
    payment_installments = (
        frappe.get_list(
            "AT Payment Installment",
            fields=[
                "name",
                "payment",
                "installment_no",
                "installment_count",
                "status",
                "due_date",
                "paid_on",
                "amount",
                "amount_try",
            ],
            filters={"customer": customer_name},
            order_by="due_date asc, modified desc",
            limit_page_length=200,
        )
        if frappe.db.exists("DocType", "AT Payment Installment")
        else []
    )
    claims = frappe.get_list(
        "AT Claim",
        fields=[
            "name",
            "policy",
            "claim_status",
            "reported_date",
            "claim_amount",
            "office_branch",
            "description",
        ],
        filters={"customer": customer_name},
        order_by="reported_date desc, modified desc",
        limit_page_length=50,
    )
    renewals = frappe.get_list(
        "AT Renewal Task",
        fields=[
            "name",
            "policy",
            "status",
            "due_date",
            "renewal_date",
            "lost_reason_code",
            "competitor_name",
        ],
        filters={"customer": customer_name},
        order_by="due_date asc, modified desc",
        limit_page_length=50,
    )
    communications = _get_communications(customer_name)
    comments = _get_comments(customer_name)
    files = _get_customer_files(customer_name)

    policy_total_premium = sum(flt(row.get("gross_premium")) for row in policies)
    active_policy_count = sum(
        1 for row in policies if str(row.get("status") or "") in ACTIVE_POLICY_STATUSES
    )
    cancelled_policy_count = sum(
        1 for row in policies if str(row.get("status") or "") == "Cancelled"
    )
    open_offer_count = sum(
        1
        for row in offers
        if str(row.get("status") or "") in OPEN_OFFER_STATUSES
        and not str(row.get("converted_policy") or "").strip()
    )
    overdue_payments = [row for row in payments if _is_overdue_payment(row, today)]
    overdue_installments = [
        row for row in payment_installments if str(row.get("status") or "") == "Overdue"
    ]
    open_claim_count = sum(
        1 for row in claims if str(row.get("claim_status") or "") in OPEN_CLAIM_STATUSES
    )
    upcoming_renewals = [row for row in renewals if _is_upcoming_renewal(row, today)]

    timeline = sorted(
        [_build_communication_timeline_item(item) for item in communications]
        + [_build_comment_timeline_item(item) for item in comments],
        key=lambda item: item.get("timestamp") or "",
        reverse=True,
    )[:25]

    insights_payload = build_customer_segment_snapshot_payload(
        active_policy_count=active_policy_count,
        policy_total_premium=policy_total_premium,
        open_claim_count=open_claim_count,
        upcoming_renewal_count=len(upcoming_renewals),
        overdue_payment_count=len(overdue_payments),
        overdue_payment_amount=sum(
            flt(row.get("amount_try")) for row in overdue_payments
        ),
        total_policy_count=len(policies),
        cancelled_policy_count=cancelled_policy_count,
    )
    insights = upsert_customer_segment_snapshot(
        customer_name=customer_name,
        office_branch=customer.office_branch,
        snapshot_date=today,
        insight_payload=insights_payload,
    )

    return {
        "customer": _serialize_customer(
            customer, can_view_sensitive=can_view_sensitive
        ),
        "summary": {
            "total_policy_count": len(policies),
            "active_policy_count": active_policy_count,
            "cancelled_policy_count": cancelled_policy_count,
            "open_offer_count": open_offer_count,
            "overdue_payment_count": len(overdue_payments),
            "overdue_payment_amount": sum(
                flt(row.get("amount_try")) for row in overdue_payments
            ),
            "overdue_installment_count": len(overdue_installments),
            "overdue_installment_amount": sum(
                flt(row.get("amount_try") or row.get("amount"))
                for row in overdue_installments
            ),
            "open_claim_count": open_claim_count,
            "upcoming_renewal_count": len(upcoming_renewals),
            "total_premium": policy_total_premium,
        },
        "portfolio": {
            "policies": policies[:20],
            "offers": offers[:20],
            "payments": payments[:20],
            "payment_installments": payment_installments[:50],
            "claims": claims[:20],
            "renewals": upcoming_renewals[:20],
        },
        "communication": {
            "items": communications[:20],
            "channel_summary": _build_channel_summary(communications),
            "timeline": timeline,
        },
        "documents": {
            "items": files[:20],
            "document_profile": build_document_profile(files),
        },
        "insights": insights,
        "cross_sell": _build_cross_sell_payload(customer_name, policies),
        "operations": {
            "assignments": _get_assignments(customer_name=customer_name),
            "activities": _get_activities(customer_name=customer_name),
            "reminders": _get_reminders(customer_name=customer_name),
        },
    }


def _serialize_customer(customer, *, can_view_sensitive: bool) -> dict[str, Any]:
    tax_id = customer.tax_id if can_view_sensitive else customer.masked_tax_id
    phone = customer.phone if can_view_sensitive else customer.masked_phone
    return {
        "name": customer.name,
        "customer_type": customer.customer_type,
        "full_name": customer.full_name,
        "tax_id": tax_id,
        "phone": phone,
        "email": customer.email,
        "address": customer.address,
        "birth_date": customer.birth_date,
        "gender": customer.gender,
        "marital_status": customer.marital_status,
        "occupation": customer.occupation,
        "office_branch": customer.office_branch,
        "assigned_agent": customer.assigned_agent,
        "consent_status": customer.consent_status,
        "customer_folder": customer.customer_folder,
    }


def _get_communications(customer_name: str) -> list[dict[str, Any]]:
    if not frappe.db.exists("DocType", "Communication"):
        return []
    return _safe_get_list(
        "Communication",
        fields=[
            "name",
            "communication_type",
            "subject",
            "sender",
            "reference_doctype",
            "reference_name",
            "creation",
        ],
        filters={"reference_doctype": "AT Customer", "reference_name": customer_name},
        order_by="creation desc",
        limit_page_length=50,
    )


def _get_comments(customer_name: str) -> list[dict[str, Any]]:
    if not frappe.db.exists("DocType", "Comment"):
        return []
    return _safe_get_list(
        "Comment",
        fields=[
            "name",
            "comment_by",
            "content",
            "creation",
            "reference_doctype",
            "reference_name",
        ],
        filters={"reference_doctype": "AT Customer", "reference_name": customer_name},
        order_by="creation desc",
        limit_page_length=50,
    )


def _get_customer_files(customer_name: str) -> list[dict[str, Any]]:
    """Return AT Document records linked to the customer (directly, via policy, or via claim)."""
    if not frappe.db.exists("DocType", "AT Document"):
        return []

    at_doc_fields = [
        "name",
        "file",
        "display_name",
        "document_kind",
        "document_sub_type",
        "status",
        "document_date",
        "is_sensitive",
        "is_verified",
        "creation",
        "reference_doctype",
        "reference_name",
        "policy",
        "customer",
        "claim",
        "notes",
    ]

    # Direct customer AT Documents
    direct = frappe.get_list(
        "AT Document",
        fields=at_doc_fields,
        filters={"customer": customer_name, "status": "Active"},
        order_by="creation desc",
        limit_page_length=100,
    )

    # Policy AT Documents (customer's policies)
    policy_names = frappe.get_all(
        "AT Policy",
        filters={"customer": customer_name},
        pluck="name",
        limit_page_length=50,
    )
    policy_docs: list[dict[str, Any]] = []
    if policy_names:
        policy_docs = frappe.get_list(
            "AT Document",
            fields=at_doc_fields,
            filters={"policy": ["in", policy_names], "customer": ["!=", customer_name], "status": "Active"},
            order_by="creation desc",
            limit_page_length=100,
        )

    # Claim AT Documents (customer's claims)
    claim_names = frappe.get_all(
        "AT Claim",
        filters={"customer": customer_name},
        pluck="name",
        limit_page_length=50,
    )
    claim_docs: list[dict[str, Any]] = []
    if claim_names:
        claim_docs = frappe.get_list(
            "AT Document",
            fields=at_doc_fields,
            filters={"claim": ["in", claim_names], "customer": ["!=", customer_name], "status": "Active"},
            order_by="creation desc",
            limit_page_length=100,
        )

    # Merge + deduplicate by name, resolve file_name from File record
    seen: set[str] = set()
    merged: list[dict[str, Any]] = []
    for doc in direct + policy_docs + claim_docs:
        if doc["name"] in seen:
            continue
        seen.add(doc["name"])
        # Resolve human-readable file name from File record
        if doc.get("file"):
            file_doc = frappe.db.get_value("File", doc["file"], ["file_name", "file_url", "file_size", "is_private"], as_dict=True) or {}
            doc["file_name"] = file_doc.get("file_name") or doc["file"]
            doc["file_url"] = file_doc.get("file_url") or ""
            doc["file_size"] = file_doc.get("file_size")
            doc["is_private"] = file_doc.get("is_private")
        else:
            doc["file_name"] = doc["file"] or ""
            doc["file_url"] = ""
            doc["file_size"] = None
            doc["is_private"] = None
        merged.append(doc)

    merged.sort(key=lambda d: str(d.get("creation") or ""), reverse=True)
    return merged[:100]


def _get_assignments(*, customer_name: str) -> list[dict[str, Any]]:
    if not frappe.db.exists("DocType", "AT Ownership Assignment"):
        return []
    return frappe.get_list(
        "AT Ownership Assignment",
        fields=[
            "name",
            "source_doctype",
            "source_name",
            "customer",
            "policy",
            "assigned_to",
            "assignment_role",
            "status",
            "priority",
            "due_date",
            "notes",
        ],
        filters={"customer": customer_name},
        order_by="modified desc",
        limit_page_length=50,
    )


def _get_activities(*, customer_name: str) -> list[dict[str, Any]]:
    if not frappe.db.exists("DocType", "AT Activity"):
        return []
    return frappe.get_list(
        "AT Activity",
        fields=[
            "name",
            "activity_title",
            "activity_type",
            "source_doctype",
            "source_name",
            "customer",
            "policy",
            "claim",
            "assigned_to",
            "activity_at",
            "status",
            "notes",
        ],
        filters={"customer": customer_name},
        order_by="activity_at desc, modified desc",
        limit_page_length=50,
    )


def _get_reminders(*, customer_name: str) -> list[dict[str, Any]]:
    if not frappe.db.exists("DocType", "AT Reminder"):
        return []
    return frappe.get_list(
        "AT Reminder",
        fields=[
            "name",
            "reminder_title",
            "source_doctype",
            "source_name",
            "customer",
            "policy",
            "claim",
            "assigned_to",
            "status",
            "priority",
            "remind_at",
            "completed_on",
            "notes",
        ],
        filters={"customer": customer_name},
        order_by="remind_at asc, modified desc",
        limit_page_length=50,
    )


def _is_overdue_payment(row: dict[str, Any], today) -> bool:
    status = str(row.get("status") or "")
    if status in {"Paid", "Cancelled"}:
        return False
    payment_date = row.get("payment_date")
    if not payment_date:
        return False
    try:
        return getdate(payment_date) < today
    except Exception:
        return False


def _is_upcoming_renewal(row: dict[str, Any], today) -> bool:
    status = str(row.get("status") or "")
    if status not in OPEN_RENEWAL_STATUSES:
        return False
    due_value = row.get("due_date") or row.get("renewal_date")
    if not due_value:
        return False
    try:
        delta = (getdate(due_value) - today).days
    except Exception:
        return False
    return 0 <= delta <= 90


def _build_channel_summary(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    counts: dict[str, int] = {}
    for item in items:
        channel = str(item.get("communication_type") or "Other").strip() or "Other"
        counts[channel] = counts.get(channel, 0) + 1
    return [{"channel": key, "total": value} for key, value in sorted(counts.items())]


def _build_communication_timeline_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "communication",
        "timestamp": item.get("creation"),
        "title": item.get("subject")
        or item.get("communication_type")
        or item.get("name"),
        "meta": item.get("sender"),
        "payload": item,
    }


def _build_comment_timeline_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "comment",
        "timestamp": item.get("creation"),
        "title": item.get("comment_by") or "Comment",
        "meta": item.get("content"),
        "payload": item,
    }


def _build_cross_sell_payload(
    customer_name: str, policies: list[dict[str, Any]]
) -> dict[str, Any]:
    related_customers = (
        frappe.get_list(
            "AT Customer Relation",
            fields=[
                "name",
                "related_customer",
                "relation_type",
                "is_household",
                "notes",
            ],
            filters={"customer": customer_name},
            order_by="modified desc",
            limit_page_length=20,
        )
        if frappe.db.exists("DocType", "AT Customer Relation")
        else []
    )
    insured_assets = (
        frappe.get_list(
            "AT Insured Asset",
            fields=["name", "policy", "asset_type", "asset_label", "asset_identifier"],
            filters={"customer": customer_name},
            order_by="modified desc",
            limit_page_length=20,
        )
        if frappe.db.exists("DocType", "AT Insured Asset")
        else []
    )

    owned_branch_names = []
    seen = set()
    for row in policies:
        branch_name = str(row.get("branch") or "").strip()
        if not branch_name or branch_name in seen:
            continue
        owned_branch_names.append(branch_name)
        seen.add(branch_name)

    # Perf: Avoid fetching all AT Branches for every customer_360 call.
    # Use the insurance companies present in the customer's current portfolio
    # as a candidate set for cross-sell suggestions.
    candidate_insurance_companies = sorted(
        {
            str(p.get("insurance_company") or "").strip()
            for p in policies
            if str(p.get("insurance_company") or "").strip()
        }
    )
    branch_filters = {}
    if candidate_insurance_companies:
        branch_filters = {"insurance_company": ["in", candidate_insurance_companies]}

    # unbounded: available branches for upsell, filtered by insurance company - expected max ~500 rows
    available_branches = frappe.get_list(
        "AT Branch",
        fields=["name"],
        filters=branch_filters,
        order_by="name asc",
        limit_page_length=0,
    )
    opportunity_branches = [
        {"branch": row.get("name")}
        for row in available_branches
        if row.get("name") not in seen
    ][:5]

    if not insured_assets:
        insured_assets = [
            {
                "policy": row.get("name"),
                "policy_no": row.get("policy_no"),
                "asset_type": row.get("branch"),
                "asset_label": row.get("policy_no") or row.get("name"),
                "asset_identifier": row.get("insurance_company"),
                "status": row.get("status"),
            }
            for row in policies[:10]
        ]

    return {
        "related_customers": related_customers,
        "insured_assets": insured_assets,
        "portfolio_branches": owned_branch_names[:10],
        "opportunity_branches": opportunity_branches,
        "has_cross_sell_opportunity": bool(opportunity_branches),
        "customer": customer_name,
    }
