from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import flt

from acentem_takipte.acentem_takipte.platform.api.security import (
    assert_authenticated,
    assert_doctype_permission,
)


def _build_claim_board_filters(
    *,
    office_branch: str | None = None,
    status: str | None = None,
) -> dict:
    filters: dict = {}
    if office_branch:
        filters["office_branch"] = office_branch
    if status:
        filters["claim_status"] = status
    return filters


def _claim_currency(row) -> str:
    return str(row.get("currency") or "TRY").strip().upper() or "TRY"


def _resolve_claim_fx_rate(claim_name: str, currency: str, reported_date) -> float | None:
    """Return a claim-currency TRY exchange rate.

    Prefers the fx rate recorded on the claim's own payouts (source of truth),
    then falls back to the TCMB reference rate for the reported date. Returns
    None when no reliable rate exists so the caller never forces a native
    amount into the TRY total."""
    try:
        payout_rate = frappe.db.sql(
            """
            select fx_rate
            from `tabAT Payment`
            where claim = %s
              and payment_purpose = 'Claim Payout'
              and status != 'Cancelled'
              and ifnull(fx_rate, 0) > 0
            order by payment_date asc, modified asc
            limit 1
            """,
            claim_name,
        )
        if payout_rate and payout_rate[0] and payout_rate[0][0]:
            return flt(payout_rate[0][0])
    except Exception:
        pass

    try:
        from acentem_takipte.acentem_takipte.doctype.at_policy.at_policy import fetch_tcmb_rate

        rate, _ = fetch_tcmb_rate(currency, reported_date or frappe.utils.today())
        if rate:
            return flt(rate)
    except Exception:
        pass
    return None


@frappe.whitelist()
def get_claims_workbench_summary(
    status: str | None = None,
    office_branch: str | None = None,
) -> dict:
    """Return claim-board KPIs over the FULL filtered dataset.

    The board list is paginated, so the summary must not be derived from the
    current page rows. Uses the same scope as the list (status and office
    branch filters, read permission) so the header count, KPI cards and the
    status breakdown always agree.

    Financial totals never mix currencies:
    - ``reserve_try`` / ``paid_try`` are TRY-normalized (1:1 for TRY claims,
      fx-rate converted for non-TRY claims with a resolvable rate).
    - Non-TRY claims without a resolvable fx rate are excluded from the TRY
      reserve and surfaced in ``non_try_breakdown`` / ``missing_fx_claims``.
    """
    assert_authenticated()
    assert_doctype_permission(
        "AT Claim",
        "read",
        _("You do not have permission to view claim summaries."),
    )

    filters = _build_claim_board_filters(
        office_branch=office_branch or None,
        status=status or None,
    )

    rows = frappe.get_all(
        "AT Claim",
        fields=["name", "claim_status", "currency", "estimated_amount", "paid_amount_try", "reported_date"],
        filters=filters,
        limit_page_length=0,
    )

    status_counts = {
        "total": len(rows),
        "open": 0,
        "under_review": 0,
        "approved": 0,
        "paid": 0,
        "rejected": 0,
        "closed": 0,
        "other": 0,
    }
    reserve_try = 0.0
    paid_try = 0.0
    non_try_breakdown: dict[str, dict] = {}
    missing_fx_claims: list[dict] = []

    for row in rows:
        st = str(row.get("claim_status") or "").strip()
        if st == "Open":
            status_counts["open"] += 1
        elif st == "Under Review":
            status_counts["under_review"] += 1
        elif st == "Approved":
            status_counts["approved"] += 1
        elif st == "Paid":
            status_counts["paid"] += 1
        elif st == "Rejected":
            status_counts["rejected"] += 1
        elif st == "Closed":
            status_counts["closed"] += 1
        else:
            status_counts["other"] += 1

        currency = _claim_currency(row)
        native_reserve = flt(row.get("estimated_amount") or 0)
        claim_paid_try = flt(row.get("paid_amount_try") or 0)
        paid_try += claim_paid_try

        if currency == "TRY":
            reserve_try += native_reserve
            continue

        breakdown = non_try_breakdown.setdefault(
            currency, {"reserve_native": 0.0, "reserve_try": 0.0, "paid_try": 0.0}
        )
        breakdown["reserve_native"] += native_reserve
        breakdown["paid_try"] += claim_paid_try

        fx_rate = _resolve_claim_fx_rate(row.get("name"), currency, row.get("reported_date"))
        if fx_rate:
            reserve_try += native_reserve * fx_rate
            breakdown["reserve_try"] += native_reserve * fx_rate
        else:
            missing_fx_claims.append(
                {
                    "name": row.get("name"),
                    "currency": currency,
                    "reserve_native": round(native_reserve, 2),
                }
            )

    return {
        **status_counts,
        "reserve_try": round(reserve_try, 2),
        "paid_try": round(paid_try, 2),
        "non_try_breakdown": {
            cur: {
                "reserve_native": round(v["reserve_native"], 2),
                "reserve_try": round(v["reserve_try"], 2),
                "paid_try": round(v["paid_try"], 2),
            }
            for cur, v in non_try_breakdown.items()
        },
        "missing_fx_count": len(missing_fx_claims),
        "missing_fx_claims": missing_fx_claims[:20],
    }
