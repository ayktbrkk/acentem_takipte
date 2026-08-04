from __future__ import annotations

import frappe
from frappe.utils import cint, flt, getdate, nowdate

from acentem_takipte.acentem_takipte.platform.api.security import (
    assert_authenticated,
    assert_doctype_permission,
)


def _build_payment_board_filters(
    *,
    office_branch: str | None = None,
    status: str | None = None,
    direction: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    currency: str | None = None,
    policy: str | None = None,
    customer: str | None = None,
    purpose: str | None = None,
) -> dict:
    filters: dict = {}
    if office_branch:
        filters["office_branch"] = office_branch
    if status:
        filters["status"] = status
    if direction:
        filters["payment_direction"] = direction
    if from_date and to_date:
        filters["payment_date"] = ["between", [from_date, to_date]]
    elif from_date:
        filters["payment_date"] = [">=", from_date]
    elif to_date:
        filters["payment_date"] = ["<=", to_date]
    if currency:
        filters["currency"] = currency
    if policy:
        filters["policy"] = ["like", f"%{policy}%"]
    if customer:
        filters["customer"] = ["like", f"%{customer}%"]
    if purpose:
        filters["payment_purpose"] = ["like", f"%{purpose}%"]
    return filters


def _build_payment_board_or_filters(query: str | None):
    q = str(query or "").strip()
    if not q:
        return None
    like = f"%{q}%"
    return [
        ["AT Payment", "name", "like", like],
        ["AT Payment", "payment_no", "like", like],
        ["AT Payment", "customer", "like", like],
        ["AT Payment", "policy", "like", like],
    ]


def _classify_payment(
    payment: dict,
    installment_rows: list[dict],
    today,
) -> dict:
    """Classify a payment into collected / overdue / pending / cancelled.

    Mirrors the frontend payment snapshot semantics (paymentsBoard/helpers.js):
    - Cancelled is excluded from active buckets.
    - A payment is collected when fully paid or its raw status is Paid.
    - Overdue requires an overdue installment or a past due date with a
      remaining balance.
    - Everything else counts as pending (including partially paid).
    """
    status = str(payment.get("status") or "").strip()
    if status == "Cancelled":
        return {
            "bucket": "cancelled",
            "total_amount_try": 0.0,
            "remaining": 0.0,
            "collected": 0.0,
        }

    total_amount = flt(payment.get("amount_try") or payment.get("amount") or 0)
    collected_amount = 0.0
    overdue_count = 0
    for inst in installment_rows:
        if str(inst.get("status") or "") == "Paid":
            collected_amount += flt(inst.get("amount_try") or 0)
        if str(inst.get("status") or "") == "Overdue":
            overdue_count += 1
    remaining = max(total_amount - collected_amount, 0)

    due_date = str(payment.get("due_date") or payment.get("payment_date") or "").strip()
    past_due = bool(due_date) and getdate(due_date) < today and remaining > 0
    is_overdue = overdue_count > 0 or past_due

    if total_amount > 0 and remaining <= 0:
        bucket = "collected"
    elif status == "Paid":
        bucket = "collected"
    elif is_overdue:
        bucket = "overdue"
    else:
        bucket = "pending"

    return {
        "bucket": bucket,
        "total_amount_try": total_amount,
        "remaining": remaining,
        "collected": collected_amount,
    }


@frappe.whitelist()
def get_payments_board_summary(
    query: str | None = None,
    office_branch: str | None = None,
    status: str | None = None,
    direction: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    currency: str | None = None,
    policy: str | None = None,
    customer: str | None = None,
    purpose: str | None = None,
    limit: int = 2000,
) -> dict:
    """Full-filtered-set summary for the payments board.

    The board list is paginated (pageLength), so the KPI cards must not be
    derived from the current page rows. This endpoint applies the exact same
    filters (including the free-text query, office branch scope and all board
    filters) over the full dataset and classifies every payment the same way the
    board table does.

    Cancelled payments are excluded from the active buckets and from the total
    amount, but are reported separately so the UI can show the raw record count
    without double-counting cancelled rows in the active KPIs.

    Response stays backward compatible: existing consumers only read the
    ``summary`` object plus ``total_count``.
    """
    assert_authenticated()
    assert_doctype_permission(
        "AT Payment",
        "read",
        "You do not have permission to view payments.",
    )

    filters = _build_payment_board_filters(
        office_branch=office_branch,
        status=status,
        direction=direction,
        from_date=from_date,
        to_date=to_date,
        currency=currency,
        policy=policy,
        customer=customer,
        purpose=purpose,
    )
    or_filters = _build_payment_board_or_filters(query)
    safe_limit = max(cint(limit), 1)

    kwargs: dict = {"filters": filters}
    if or_filters:
        kwargs["or_filters"] = or_filters

    payments = frappe.get_all(
        "AT Payment",
        fields=[
            "name",
            "payment_no",
            "status",
            "payment_direction",
            "payment_purpose",
            "amount",
            "amount_try",
            "due_date",
            "payment_date",
            "customer",
            "policy",
            "currency",
            "office_branch",
        ],
        order_by="modified desc",
        limit_page_length=safe_limit + 1,
        **kwargs,
    )

    truncated = len(payments) > safe_limit
    scoped_payments = payments[:safe_limit]

    installment_map: dict[str, list[dict]] = {}
    payment_names = [p["name"] for p in scoped_payments]
    if payment_names:
        installment_rows = frappe.get_all(
            "AT Payment Installment",
            filters={"payment": ["in", payment_names]},
            fields=["payment", "status", "amount_try"],
            limit_page_length=0,
        )
        for inst in installment_rows:
            installment_map.setdefault(inst["payment"], []).append(inst)

    today = getdate(nowdate())
    buckets = {"pending": 0, "collected": 0, "overdue": 0, "cancelled": 0}
    total_amount_try = 0.0
    for payment in scoped_payments:
        classified = _classify_payment(
            payment,
            installment_map.get(payment["name"], []),
            today,
        )
        buckets[classified["bucket"]] += 1
        if classified["bucket"] != "cancelled":
            total_amount_try += classified["total_amount_try"]

    active_total = (
        buckets["pending"] + buckets["collected"] + buckets["overdue"]
    )

    return {
        "summary": {
            "total": active_total,
            "pending": buckets["pending"],
            "collected": buckets["collected"],
            "overdue": buckets["overdue"],
            "cancelled": buckets["cancelled"],
            "total_amount_try": round(total_amount_try, 2),
            "currency": "TRY",
        },
        "total_count": active_total + buckets["cancelled"] if not truncated else safe_limit,
        "truncated": truncated,
    }
