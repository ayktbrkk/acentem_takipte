from __future__ import annotations

import frappe

from acentem_takipte.acentem_takipte.platform.api.security import (
    assert_authenticated,
    assert_doctype_permission,
)


def _build_summary_filters(
    *,
    status: str | None = None,
    insurance_company: str | None = None,
    end_date: str | None = None,
    customer: str | None = None,
    gross_min: str | None = None,
    gross_max: str | None = None,
    office_branch: str | None = None,
) -> tuple[dict, list | None]:
    """Mirror the policy-list filter semantics used by the frontend.

    The result must match the list/count scopes exactly so the summary KPI
    cards and the pager agree on the same filtered dataset."""
    filters: dict = {}
    if status:
        filters["status"] = status
    if insurance_company:
        filters["insurance_company"] = insurance_company
    if end_date:
        filters["end_date"] = ["<=", end_date]
    if customer:
        filters["customer"] = ["like", f"%{customer}%"]
    if gross_min is not None and gross_min != "":
        filters["gross_premium"] = [">=", float(gross_min)]
    if gross_max is not None and gross_max != "":
        if "gross_premium" in filters:
            filters["gross_premium"] = ["between", [float(gross_min or 0), float(gross_max)]]
        else:
            filters["gross_premium"] = ["<=", float(gross_max)]
    if office_branch:
        filters["office_branch"] = office_branch
    return filters, None


@frappe.whitelist()
def get_policy_list_summary(
    status: str | None = None,
    insurance_company: str | None = None,
    end_date: str | None = None,
    customer: str | None = None,
    gross_min: str | None = None,
    gross_max: str | None = None,
    query: str | None = None,
    office_branch: str | None = None,
) -> dict:
    """Return policy-list KPIs over the FULL filtered dataset.

    The list itself is paginated, so the summary must not be derived from the
    current page rows. This endpoint uses the same filters (including the free
    text query and office branch scope) as the list and count queries so the
    header count, KPI cards and pager all agree."""
    assert_authenticated()
    assert_doctype_permission(
        "AT Policy",
        "read",
        "You do not have permission to view policy summaries.",
    )

    filters, _ = _build_summary_filters(
        status=status,
        insurance_company=insurance_company,
        end_date=end_date,
        customer=customer,
        gross_min=gross_min,
        gross_max=gross_max,
        office_branch=office_branch,
    )
    kwargs: dict = {"filters": filters}
    if query:
        q = f"%{str(query).strip()}%"
        kwargs["or_filters"] = [
            ["AT Policy", "name", "like", q],
            ["AT Policy", "policy_no", "like", q],
            ["AT Policy", "customer", "like", q],
        ]

    rows = frappe.get_all(
        "AT Policy",
        fields=["status", "gwp_try", "gross_premium"],
        limit_page_length=0,
        **kwargs,
    )

    counts = {"total": 0, "active": 0, "pending": 0, "cancelled": 0, "archived": 0}
    total_premium_try = 0.0
    for row in rows:
        counts["total"] += 1
        st = str(row.get("status") or "")
        if st == "Active":
            counts["active"] += 1
        elif st in ("Pending", "Record"):
            counts["pending"] += 1
        elif st == "Cancelled":
            counts["cancelled"] += 1
        elif st == "Archived":
            counts["archived"] += 1
        total_premium_try += float(row.get("gwp_try") or row.get("gross_premium") or 0)

    return {
        "total": counts["total"],
        "active": counts["active"],
        "pending": counts["pending"],
        "cancelled": counts["cancelled"],
        "archived": counts["archived"],
        "total_premium_try": round(total_premium_try, 2),
    }
