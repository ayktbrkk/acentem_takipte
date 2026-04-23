"""Dashboard Orchestration Service
Handles complex dashboard data aggregation, permission scoping, and KPI computations.
Acts as the central coordinator between frontend requests and specific domain builders in dashboard_v2.
"""
from __future__ import annotations

import hashlib
import json

import frappe
from frappe import _
from frappe.utils import add_days, cint, flt, getdate, nowdate

from acentem_takipte.acentem_takipte.api.v2 import (
    constants as dashboard_constants,
)
from acentem_takipte.acentem_takipte.api.v2 import (
    details_lead as dashboard_lead_detail_builder,
)
from acentem_takipte.acentem_takipte.api.v2 import (
    details_offer as dashboard_offer_detail_builder,
)
from acentem_takipte.acentem_takipte.api.v2 import (
    filters as dashboard_filters,
)
from acentem_takipte.acentem_takipte.api.v2 import (
    queries_customers as dashboard_customer_queries,
)
from acentem_takipte.acentem_takipte.api.v2 import (
    queries_kpis as dashboard_kpi_queries,
)
from acentem_takipte.acentem_takipte.api.v2 import (
    queries_leads as dashboard_lead_queries,
)
from acentem_takipte.acentem_takipte.api.v2 import (
    dashboard_security,
)
from acentem_takipte.acentem_takipte.api.v2 import (
    serializers as dashboard_serializers,
)
from acentem_takipte.acentem_takipte.api.dashboard_scopes import (
    _build_claim_where,
    _build_lead_where,
    _build_payment_collection_where,
    _build_payment_where,
    _build_policy_where,
    _get_scoped_customer_names,
    _get_scoped_policy_names,
    _qualified_field,
)
from acentem_takipte.acentem_takipte.api.v2 import (
    tab_payload as dashboard_tab_sections,
)
from acentem_takipte.acentem_takipte.doctype.at_customer.at_customer import (
    has_sensitive_access,
)
from acentem_takipte.acentem_takipte.services.branches import (
    normalize_requested_office_branch,
)
from acentem_takipte.acentem_takipte.services.privacy_masking import masked_query_gate
from acentem_takipte.acentem_takipte.services.query_isolation import (
    build_scope_filters_dict,
)
from acentem_takipte.acentem_takipte.services.customer_360 import (
    build_customer_360_payload,
)
from acentem_takipte.acentem_takipte.services.offer_360 import (
    build_offer_360_payload,
)
from acentem_takipte.acentem_takipte.services.lead_360 import (
    build_lead_360_payload,
)
from acentem_takipte.acentem_takipte.services.claim_360 import (
    get_claim_360_payload,
)
from acentem_takipte.acentem_takipte.services.payment_360 import (
    get_payment_360_payload,
)
from acentem_takipte.acentem_takipte.services.follow_up_sla import (
    build_follow_up_sla_payload,
)
from acentem_takipte.acentem_takipte.services.work_management import (
    build_my_activities_payload,
    build_my_reminders_payload,
    build_my_tasks_payload,
)
from acentem_takipte.acentem_takipte.utils.commissions import commission_sql_expr
from acentem_takipte.acentem_takipte.utils.logging import log_redacted_error

CUSTOMER_PROFILE_EDIT_FIELDS = {
    "full_name",
    "birth_date",
    "gender",
    "marital_status",
    "occupation",
    "phone",
    "email",
    "address",
    "consent_status",
    "assigned_agent",
}
CUSTOMER_GENDER_OPTIONS = {"Unknown", "Male", "Female", "Other", ""}
CUSTOMER_MARITAL_OPTIONS = {"Unknown", "Single", "Married", "Divorced", "Widowed", ""}
CUSTOMER_CONSENT_OPTIONS = {"Unknown", "Granted", "Revoked", ""}
BOOTSTRAP_DASHBOARD_FALLBACK_FLAG = dashboard_security.BOOTSTRAP_DASHBOARD_FALLBACK_FLAG
RENEWAL_STATUS_DONE = "Done"
LEGACY_RENEWAL_STATUS_COMPLETED = "Completed"
DASHBOARD_TAB_CACHE_TTL_SECONDS = 300
DASHBOARD_TAB_CACHE_TTL_CONFIG_KEY = "at_dashboard_tab_cache_ttl_seconds"


def _normalize_renewal_status(value: str | None) -> str:
    status = str(value or "")
    if status == LEGACY_RENEWAL_STATUS_COMPLETED:
        return RENEWAL_STATUS_DONE
    return status


def _assert_dashboard_endpoint_method(action: str) -> None:
    request = getattr(frappe.local, "request", None)
    if not request:
        return

    policy = dashboard_security.DASHBOARD_ENDPOINT_PERMISSION_POLICY.get(action) or {}
    allowed_methods = [
        str(method or "").strip().upper()
        for method in policy.get("http_methods") or []
        if method
    ]
    if not allowed_methods:
        return

    request_method = str(getattr(request, "method", "") or "").strip().upper()
    if request_method in allowed_methods:
        return

    allowed_label = " / ".join(allowed_methods)
    frappe.throw(_("Only {0} requests are allowed for this action.").format(allowed_label))


def _safe_session_user() -> str:
    try:
        return str(getattr(frappe.session, "user", "") or "").strip()
    except Exception:
        return ""


def _dashboard_tab_cache_ttl_seconds() -> int:
    try:
        site_config = frappe.get_site_config() or {}
        ttl = cint(site_config.get(DASHBOARD_TAB_CACHE_TTL_CONFIG_KEY) or 0)
        return max(ttl or DASHBOARD_TAB_CACHE_TTL_SECONDS, 1)
    except Exception:
        return DASHBOARD_TAB_CACHE_TTL_SECONDS


def _dashboard_tab_scope_digest(
    *, allowed_customers: list[str] | None, scope_meta: dict | None
) -> str:
    normalized_customers: str
    if allowed_customers is None:
        normalized_customers = "__global__"
    else:
        cleaned_customers = sorted(
            {
                str(customer or "").strip()
                for customer in allowed_customers
                if str(customer or "").strip()
            }
        )
        normalized_customers = (
            hashlib.sha256(
                json.dumps(cleaned_customers, separators=(",", ":"), ensure_ascii=False).encode()
            ).hexdigest()[:16]
            if cleaned_customers
            else "__empty__"
        )

    normalized_scope_meta = {
        "access_scope": str((scope_meta or {}).get("access_scope") or "").strip(),
        "scope_reason": str((scope_meta or {}).get("scope_reason") or "").strip(),
        "allowed_customers": normalized_customers,
    }
    return hashlib.sha256(
        json.dumps(
            normalized_scope_meta,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
        ).encode()
    ).hexdigest()[:16]


def _dashboard_tab_cache_key(
    *,
    tab_key: str,
    from_date,
    to_date,
    compare_from_date=None,
    compare_to_date=None,
    period_comparison=None,
    branch=None,
    office_branch=None,
    months: int,
    allowed_customers: list[str] | None,
    scope_meta: dict | None,
) -> str:
    cache_payload = {
        "user": _safe_session_user() or "Guest",
        "tab": str(tab_key or "").strip().lower(),
        "from_date": str(from_date or ""),
        "to_date": str(to_date or ""),
        "compare_from_date": str(compare_from_date or ""),
        "compare_to_date": str(compare_to_date or ""),
        "period_comparison": str(period_comparison or ""),
        "branch": str(branch or ""),
        "office_branch": str(office_branch or ""),
        "months": cint(months or 0),
        "scope": _dashboard_tab_scope_digest(
            allowed_customers=allowed_customers, scope_meta=scope_meta
        ),
    }
    cache_digest = hashlib.sha256(
        json.dumps(
            cache_payload,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
            default=str,
        ).encode()
    ).hexdigest()[:24]
    return f"at_dashboard_tab::{cache_digest}"


@frappe.whitelist()
def get_offer_detail_payload(name: str) -> dict[str, Any]:
    """Expose high-performance offer 360 payload to the dashboard."""
    if not name:
        frappe.throw(_("Offer name is required."))

    # Scoping check
    if not frappe.has_permission("AT Offer", "read", name):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    from acentem_takipte.acentem_takipte.services.offer_360 import build_offer_360_payload
    return build_offer_360_payload(name)


@frappe.whitelist()
def get_lead_detail_payload(name: str) -> dict[str, Any]:
    """Expose high-performance lead 360 payload to the dashboard."""
    if not name:
        frappe.throw(_("Lead name is required."))

    # Scoping check
    if not frappe.has_permission("AT Lead", "read", name):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    from acentem_takipte.acentem_takipte.services.lead_360 import build_lead_360_payload
    return build_lead_360_payload(name)


@frappe.whitelist()
def get_policy_detail_payload(name: str) -> dict[str, Any]:
    """Expose high-performance policy 360 payload to the dashboard."""
    if not name:
        frappe.throw(_("Policy name is required."))

    # Scoping check
    if not frappe.has_permission("AT Policy", "read", name):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    from acentem_takipte.acentem_takipte.services.policy_360 import build_policy_360_payload
    return build_policy_360_payload(name)


@frappe.whitelist()
def get_claim_detail_payload(name: str) -> dict[str, Any]:
    """Expose high-performance claim 360 payload to the dashboard."""
    if not name:
        frappe.throw(_("Claim name is required."))

    # Scoping check
    if not frappe.has_permission("AT Claim", "read", name):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    from acentem_takipte.acentem_takipte.services.claim_360 import get_claim_360_payload
    return get_claim_360_payload(name)


@frappe.whitelist()
def get_payment_detail_payload(name: str) -> dict[str, Any]:
    """Expose high-performance payment 360 payload to the dashboard."""
    if not name:
        frappe.throw(_("Payment name is required."))

    # Scoping check
    if not frappe.has_permission("AT Payment", "read", name):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    from acentem_takipte.acentem_takipte.services.payment_360 import get_payment_360_payload
    return get_payment_360_payload(name)


@frappe.whitelist()
def get_dashboard_kpis(filters=None) -> dict:
    _assert_dashboard_endpoint_method("get_dashboard_kpis")
    payload = (
        frappe.parse_json(filters) if isinstance(filters, str) else (filters or {})
    )
    from_date = payload.get("from_date")
    to_date = payload.get("to_date")
    compare_from_date = payload.get("compare_from_date")
    compare_to_date = payload.get("compare_to_date")
    period_comparison = (
        str(payload.get("period_comparison") or "").strip().lower() or None
    )
    branch = payload.get("branch")
    office_branch = normalize_requested_office_branch(payload.get("office_branch"))
    months = int(payload.get("months") or 6)
    months = min(max(months, 1), 24)

    allowed_customers, scope_meta = _allowed_customers_for_user(include_meta=True)
    
    # audit(perf/P-05): Redis caching for KPI metrics
    # Reuse the same cache mechanism as dashboard tabs
    cache_key = _dashboard_tab_cache_key(
        tab_key="kpis",
        from_date=from_date,
        to_date=to_date,
        compare_from_date=compare_from_date,
        compare_to_date=compare_to_date,
        period_comparison=period_comparison,
        branch=branch,
        office_branch=office_branch,
        months=months,
        allowed_customers=allowed_customers,
        scope_meta=scope_meta,
    )
    
    try:
        cached_payload = frappe.cache().get_value(cache_key)
        if cached_payload is not None:
            return cached_payload
    except Exception:
        pass

    if allowed_customers is not None:
        if not allowed_customers:
            empty_result = _empty_dashboard_payload(meta=scope_meta)
            try:
                frappe.cache().set_value(
                    cache_key,
                    empty_result,
                    expires_in_sec=_dashboard_tab_cache_ttl_seconds(),
                )
            except Exception:
                pass
            return empty_result

    result = dashboard_kpi_queries.build_dashboard_kpis_payload(
        from_date=from_date,
        to_date=to_date,
        compare_from_date=compare_from_date,
        compare_to_date=compare_to_date,
        period_comparison=period_comparison,
        branch=branch,
        office_branch=office_branch,
        months=months,
        allowed_customers=allowed_customers,
        scope_meta=scope_meta,
        build_policy_where_fn=_build_policy_where,
        dashboard_cards_summary_fn=_dashboard_cards_summary,
        build_lead_where_fn=_build_lead_where,
        monthly_commission_trend_fn=_monthly_commission_trend,
    )
    
    try:
        frappe.cache().set_value(
            cache_key,
            result,
            expires_in_sec=_dashboard_tab_cache_ttl_seconds(),
        )
    except Exception:
        pass
        
    return result


@frappe.whitelist()
def get_dashboard_tab_payload(tab: str = "daily", filters=None) -> dict:
    _assert_dashboard_endpoint_method("get_dashboard_tab_payload")
    payload = (
        frappe.parse_json(filters) if isinstance(filters, str) else (filters or {})
    )
    from_date = payload.get("from_date")
    to_date = payload.get("to_date")
    compare_from_date = payload.get("compare_from_date")
    compare_to_date = payload.get("compare_to_date")
    branch = payload.get("branch")
    office_branch = normalize_requested_office_branch(payload.get("office_branch"))
    months = min(max(cint(payload.get("months") or 6), 1), 24)
    tab_key = str(tab or "daily").lower()
    if tab_key in {"overview", "operations"}:
        tab_key = "daily"
    if tab_key not in {"daily", "sales", "collections", "renewals"}:
        tab_key = "daily"

    allowed_customers, scope_meta = _allowed_customers_for_user(include_meta=True)
    cache_key = _dashboard_tab_cache_key(
        tab_key=tab_key,
        from_date=from_date,
        to_date=to_date,
        compare_from_date=compare_from_date,
        compare_to_date=compare_to_date,
        branch=branch,
        office_branch=office_branch,
        months=months,
        allowed_customers=allowed_customers,
        scope_meta=scope_meta,
    )
    try:
        cached_payload = frappe.cache().get_value(cache_key)
        if cached_payload is not None:
            return cached_payload
    except Exception:
        cached_payload = None

    if allowed_customers is not None and not allowed_customers:
        empty_cards = (_empty_dashboard_payload().get("cards") or {}).copy()
        result = {
            "tab": tab_key,
            "cards": empty_cards,
            "compare_cards": empty_cards.copy(),
            "metrics": {},
            "series": {},
            "previews": {},
            "meta": scope_meta,
        }
        try:
            frappe.cache().set_value(
                cache_key,
                result,
                expires_in_sec=_dashboard_tab_cache_ttl_seconds(),
            )
        except Exception:
            pass
        return result

    cards = _dashboard_cards_summary(
        from_date=from_date,
        to_date=to_date,
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )
    compare_cards = _dashboard_cards_summary(
        from_date=compare_from_date,
        to_date=compare_to_date,
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )
    tab_sections = dashboard_tab_sections.build_dashboard_tab_sections(
        tab_key=tab_key,
        from_date=from_date,
        to_date=to_date,
        branch=branch,
        office_branch=office_branch,
        months=months,
        allowed_customers=allowed_customers,
        build_offer_where_fn=_build_offer_where,
        build_lead_where_fn=_build_lead_where,
        build_policy_where_fn=_build_policy_where,
        build_payment_where_fn=_build_payment_where,
        build_payment_collection_where_fn=_build_payment_collection_where,
        get_offer_preview_rows_fn=_get_offer_preview_rows,
        get_lead_preview_rows_fn=_get_lead_preview_rows,
        get_policy_preview_rows_fn=_get_policy_preview_rows,
        get_top_companies_rows_fn=_get_top_companies_rows,
        get_renewal_task_preview_rows_fn=_get_renewal_task_preview_rows,
        get_offer_waiting_renewal_summary_fn=_get_offer_waiting_renewal_summary,
        get_payment_preview_rows_fn=_get_payment_preview_rows,
        get_reconciliation_open_rows_preview_fn=_get_reconciliation_open_rows_preview,
        monthly_commission_trend_fn=_monthly_commission_trend,
        renewal_status_and_buckets_fn=_renewal_status_and_buckets,
        reconciliation_open_summary_fn=_reconciliation_open_summary,
    )
    metrics = tab_sections["metrics"]
    series = tab_sections["series"]
    previews = tab_sections["previews"]
    result = {
        "tab": tab_key,
        "cards": cards,
        "compare_cards": compare_cards,
        "metrics": metrics,
        "series": series,
        "previews": previews,
        "meta": scope_meta,
    }
    try:
        frappe.cache().set_value(
            cache_key,
            result,
            expires_in_sec=_dashboard_tab_cache_ttl_seconds(),
        )
    except Exception:
        pass
    return result


@frappe.whitelist()
def get_customer_list(filters=None, limit: int = 20) -> list[dict]:
    _assert_dashboard_endpoint_method("get_customer_list")
    payload = (
        frappe.parse_json(filters) if isinstance(filters, str) else (filters or {})
    )
    query_filters = {}
    if payload.get("assigned_agent"):
        query_filters["assigned_agent"] = payload["assigned_agent"]

    allowed_customers = _allowed_customers_for_user()
    if allowed_customers is not None:
        query_filters["name"] = ["in", allowed_customers or ["__none__"]]

    rows = frappe.get_list(
        "AT Customer",
        fields=[
            "name",
            "customer_type",
            "full_name",
            "tax_id",
            "masked_tax_id",
            "phone",
            "masked_phone",
            "email",
            "assigned_agent",
        ],
        filters=query_filters,
        order_by="modified desc",
        limit_page_length=max(min(int(limit), 100), 1),
    )

    if has_sensitive_access():
        return rows

    masked_query_gate(
        frappe.session.user, endpoint="customer_list", row_count=len(rows)
    )
    for row in rows:
        row["tax_id"] = row.get("masked_tax_id")
        row["phone"] = row.get("masked_phone")
    return rows


@frappe.whitelist()
def get_customer_portfolio_summary_map(customers=None) -> dict[str, dict]:
    _assert_dashboard_endpoint_method("get_customer_portfolio_summary_map")
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"))

    raw_customers = (
        frappe.parse_json(customers) if isinstance(customers, str) else customers
    )
    if not isinstance(raw_customers, (list, tuple)):
        return {}

    requested = []
    seen = set()
    for item in list(raw_customers)[:200]:
        name = str(item or "").strip()
        if not name or name in seen:
            continue
        requested.append(name)
        seen.add(name)
    if not requested:
        return {}

    allowed_customers = _allowed_customers_for_user()
    if allowed_customers is not None:
        allowed_set = set(allowed_customers)
        requested = [name for name in requested if name in allowed_set]
        if not requested:
            return {}

    return _customer_portfolio_summary_for_names(requested)


@frappe.whitelist()
def get_customer_360_payload(name: str) -> dict:
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"))

    customer_name = str(name or "").strip()
    if not customer_name:
        frappe.throw(_("Customer is required"))

    customer = frappe.get_doc("AT Customer", customer_name)
    customer.check_permission("read")

    allowed_customers = _allowed_customers_for_user()
    if allowed_customers is not None and customer_name not in set(allowed_customers):
        frappe.throw(_("Not permitted"))

    return build_customer_360_payload(
        customer_name,
        can_view_sensitive=has_sensitive_access(),
    )


@frappe.whitelist()
def get_policy_360_payload(name: str) -> dict:
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"))

    policy_name = str(name or "").strip()
    if not policy_name:
        frappe.throw(_("Policy is required"))

    policy = frappe.get_doc("AT Policy", policy_name)
    policy.check_permission("read")

    from acentem_takipte.acentem_takipte.services.policy_360 import (
        build_policy_360_payload,
    )

    return build_policy_360_payload(policy_name)


@frappe.whitelist()
def get_follow_up_sla_payload(filters=None) -> dict:
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"))

    payload = (
        frappe.parse_json(filters) if isinstance(filters, str) else (filters or {})
    )
    office_branch = normalize_requested_office_branch(payload.get("office_branch"))
    allowed_customers = _allowed_customers_for_user()
    return build_follow_up_sla_payload(
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )


@frappe.whitelist()
def get_my_tasks_payload(filters=None) -> dict:
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"))

    payload = (
        frappe.parse_json(filters) if isinstance(filters, str) else (filters or {})
    )
    office_branch = normalize_requested_office_branch(payload.get("office_branch"))
    return build_my_tasks_payload(office_branch=office_branch, assigned_to=user)


@frappe.whitelist()
def get_my_activities_payload(filters=None) -> dict:
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"))

    payload = (
        frappe.parse_json(filters) if isinstance(filters, str) else (filters or {})
    )
    office_branch = normalize_requested_office_branch(payload.get("office_branch"))
    return build_my_activities_payload(office_branch=office_branch, assigned_to=user)


@frappe.whitelist()
def get_my_reminders_payload(filters=None) -> dict:
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"))

    payload = (
        frappe.parse_json(filters) if isinstance(filters, str) else (filters or {})
    )
    office_branch = normalize_requested_office_branch(payload.get("office_branch"))
    return build_my_reminders_payload(office_branch=office_branch, assigned_to=user)


@frappe.whitelist()
def get_customer_workbench_rows(
    filters=None, page: int = 1, page_length: int = 20
) -> dict:
    _assert_dashboard_endpoint_method("get_customer_workbench_rows")
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"))

    payload = (
        frappe.parse_json(filters) if isinstance(filters, str) else (filters or {})
    )
    payload = dashboard_filters.normalize_customer_workbench_payload(payload)

    page_no = max(cint(page), 1)
    per_page = min(max(cint(page_length or payload.get("page_length") or 20), 1), 100)
    offset = (page_no - 1) * per_page

    parsed_filters = dashboard_filters.parse_customer_workbench_filters(
        payload,
        as_bool=_as_bool,
    )
    query_filters = parsed_filters["query_filters"]
    or_filters = parsed_filters["or_filters"]
    has_active_policy = parsed_filters["has_active_policy"]
    has_open_offer = parsed_filters["has_open_offer"]
    office_branch = normalize_requested_office_branch(payload.get("office_branch"))

    if office_branch:
        query_filters["office_branch"] = office_branch

    allowed_customers = _allowed_customers_for_user()
    if allowed_customers is not None:
        query_filters["name"] = ["in", allowed_customers or ["__none__"]]

    if has_active_policy or has_open_offer:
        filtered_names = _customer_names_by_portfolio_filters(
            allowed_customers=allowed_customers,
            has_active_policy=has_active_policy,
            has_open_offer=has_open_offer,
        )
        query_filters["name"] = ["in", filtered_names or ["__none__"]]

    requested_sort = parsed_filters["requested_sort"]
    order_by = _safe_customer_workbench_order_by(requested_sort)
    use_derived_sort = requested_sort in CUSTOMER_WORKBENCH_DERIVED_SORTS

    base_kwargs = dashboard_customer_queries.build_customer_workbench_base_kwargs(
        query_filters=query_filters,
        or_filters=or_filters,
        order_by=order_by,
    )

    if use_derived_sort:
        seed_kwargs = dashboard_customer_queries.build_customer_workbench_derived_sort_seed_kwargs(
            query_filters=query_filters,
            or_filters=or_filters,
        )
        seed_rows = dashboard_customer_queries.fetch_all_customer_workbench_rows(
            base_kwargs=seed_kwargs,
        )
        total = len(seed_rows)
        all_customer_names = [row.get("name") for row in seed_rows if row.get("name")]
        summary_map = _customer_portfolio_summary_for_names(all_customer_names)
        dashboard_serializers.attach_customer_portfolio_summary(seed_rows, summary_map)
        _sort_customer_workbench_rows(seed_rows, requested_sort)
        page_seed_rows = seed_rows[offset : offset + per_page]
        page_customer_names = [
            row.get("name") for row in page_seed_rows if row.get("name")
        ]
        rows = dashboard_customer_queries.fetch_customer_workbench_rows_by_names(
            customer_names=page_customer_names,
        )
        dashboard_serializers.attach_customer_portfolio_summary(rows, summary_map)
        rows = dashboard_serializers.reorder_rows_by_name(rows, page_customer_names)
    else:
        rows = dashboard_customer_queries.fetch_customer_workbench_rows(
            base_kwargs=base_kwargs,
            limit_start=offset,
            limit_page_length=per_page,
        )
        total = dashboard_customer_queries.count_customer_workbench_rows(
            query_filters=query_filters,
            or_filters=or_filters,
        )

        summary_map = _customer_portfolio_summary_for_names(
            [row.get("name") for row in rows if row.get("name")]
        )
        dashboard_serializers.attach_customer_portfolio_summary(rows, summary_map)

    if not has_sensitive_access():
        masked_query_gate(
            frappe.session.user, endpoint="customer_workbench", row_count=len(rows)
        )
        dashboard_serializers.mask_customer_sensitive_fields(rows)

    return dashboard_serializers.build_paged_rows_response(
        rows=rows,
        total=total,
        page=page_no,
        page_length=per_page,
    )


@frappe.whitelist()
def get_lead_workbench_rows(filters=None, page: int = 1, page_length: int = 20) -> dict:
    _assert_dashboard_endpoint_method("get_lead_workbench_rows")
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"))

    payload = (
        frappe.parse_json(filters) if isinstance(filters, str) else (filters or {})
    )
    payload = dashboard_filters.normalize_lead_workbench_payload(payload)

    page_no = max(cint(page), 1)
    per_page = min(max(cint(page_length or payload.get("page_length") or 20), 1), 100)
    offset = (page_no - 1) * per_page

    parsed_filters = dashboard_filters.parse_lead_workbench_filters(
        payload,
        as_bool=_as_bool,
        is_number=_is_number,
        flt_fn=flt,
    )
    query_filters = parsed_filters["query_filters"]
    or_filters = parsed_filters["or_filters"]
    stale_state = parsed_filters["stale_state"]
    can_convert_only = parsed_filters["can_convert_only"]
    office_branch = normalize_requested_office_branch(payload.get("office_branch"))

    if office_branch:
        query_filters["office_branch"] = office_branch

    allowed_customers = _allowed_customers_for_user()
    if allowed_customers is not None:
        query_filters["customer"] = ["in", allowed_customers or ["__none__"]]

    requested_sort = parsed_filters["requested_sort"]
    order_by = _safe_lead_workbench_order_by(requested_sort)
    use_python_sort_or_filter = (
        requested_sort in LEAD_WORKBENCH_DERIVED_SORTS
        or stale_state in LEAD_WORKBENCH_STALE_STATES
        or can_convert_only
    )
    base_kwargs = dashboard_lead_queries.build_lead_workbench_base_kwargs(
        query_filters=query_filters,
        or_filters=or_filters,
        order_by=order_by,
    )
    lead_derive_kwargs = {
        "lead_stale_state_fn": _lead_stale_state,
        "lead_can_convert_to_offer_fn": _lead_can_convert_to_offer,
        "lead_conversion_state_fn": _lead_conversion_state,
        "lead_conversion_missing_fieldnames_fn": _lead_conversion_missing_fieldnames,
        "lead_next_conversion_action_fn": _lead_next_conversion_action,
    }

    if use_python_sort_or_filter:
        seed_kwargs = (
            dashboard_lead_queries.build_lead_workbench_derived_sort_seed_kwargs(
                query_filters=query_filters,
                or_filters=or_filters,
            )
        )
        seed_rows = dashboard_lead_queries.fetch_all_lead_workbench_rows(
            base_kwargs=seed_kwargs
        )
        dashboard_serializers.attach_lead_workbench_derived_fields(
            seed_rows, **lead_derive_kwargs
        )
        filtered_rows = dashboard_serializers.filter_lead_workbench_rows(
            seed_rows,
            stale_state=stale_state,
            can_convert_only=can_convert_only,
        )
        _sort_lead_workbench_rows(filtered_rows, requested_sort)
        total = len(filtered_rows)
        page_seed_rows = filtered_rows[offset : offset + per_page]
        page_lead_names = [row.get("name") for row in page_seed_rows if row.get("name")]
        rows = dashboard_lead_queries.fetch_lead_workbench_rows_by_names(
            lead_names=page_lead_names
        )
        dashboard_serializers.attach_lead_workbench_derived_fields(
            rows, **lead_derive_kwargs
        )
        rows = dashboard_serializers.reorder_rows_by_name(rows, page_lead_names)
    else:
        rows = dashboard_lead_queries.fetch_lead_workbench_rows(
            base_kwargs=base_kwargs,
            limit_start=offset,
            limit_page_length=per_page,
        )
        total = dashboard_lead_queries.count_lead_workbench_rows(
            query_filters=query_filters,
            or_filters=or_filters,
        )
        dashboard_serializers.attach_lead_workbench_derived_fields(
            rows, **lead_derive_kwargs
        )

    return dashboard_serializers.build_paged_rows_response(
        rows=rows,
        total=total,
        page=page_no,
        page_length=per_page,
    )


@frappe.whitelist()
def get_lead_detail_payload(name: str) -> dict:
    _assert_dashboard_endpoint_method("get_lead_detail_payload")
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"))

    lead_name = str(name or "").strip()
    if not lead_name:
        frappe.throw(_("Lead is required"))

    lead = frappe.get_doc("AT Lead", lead_name)
    lead.check_permission("read")

    allowed_customers = _allowed_customers_for_user()
    if (
        allowed_customers is not None
        and lead.customer
        and lead.customer not in set(allowed_customers)
    ):
        frappe.throw(_("Not permitted"))

    return build_lead_360_payload(lead_name)


@frappe.whitelist()
def get_offer_detail_payload(name: str) -> dict:
    _assert_dashboard_endpoint_method("get_offer_detail_payload")
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"))

    offer_name = str(name or "").strip()
    if not offer_name:
        frappe.throw(_("Offer is required"))

    offer = frappe.get_doc("AT Offer", offer_name)
    offer.check_permission("read")

    allowed_customers = _allowed_customers_for_user()
    if (
        allowed_customers is not None
        and offer.customer
        and offer.customer not in set(allowed_customers)
    ):
        frappe.throw(_("Not permitted"))

    return build_offer_360_payload(offer_name)


@frappe.whitelist()
def get_claim_detail_payload(name: str) -> dict:
    _assert_dashboard_endpoint_method("get_claim_detail_payload")
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"))

    claim_name = str(name or "").strip()
    if not claim_name:
        frappe.throw(_("Claim is required"))

    claim = frappe.get_doc("AT Claim", claim_name)
    claim.check_permission("read")

    allowed_customers = _allowed_customers_for_user()
    if (
        allowed_customers is not None
        and claim.customer
        and claim.customer not in set(allowed_customers)
    ):
        frappe.throw(_("Not permitted"))

    return get_claim_360_payload(claim_name)




@frappe.whitelist()
def get_payment_detail_payload(name: str) -> dict:
    _assert_dashboard_endpoint_method("get_payment_detail_payload")
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"))

    payment_name = str(name or "").strip()
    if not payment_name:
        frappe.throw(_("Payment is required"))

    payment = frappe.get_doc("AT Payment", payment_name)
    payment.check_permission("read")

    allowed_customers = _allowed_customers_for_user()
    if (
        allowed_customers is not None
        and payment.customer
        and payment.customer not in set(allowed_customers)
    ):
        frappe.throw(_("Not permitted"))

    return get_payment_360_payload(payment_name)


@frappe.whitelist()
def update_customer_profile(name: str, values=None) -> dict:
    _assert_dashboard_endpoint_method("update_customer_profile")
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"))

    customer_name = str(name or "").strip()
    if not customer_name:
        frappe.throw(_("Customer is required"))

    payload = frappe.parse_json(values) if isinstance(values, str) else (values or {})
    if not isinstance(payload, dict):
        payload = {}

    doc = frappe.get_doc("AT Customer", customer_name)
    doc.check_permission("write")

    updates = {}
    for fieldname in CUSTOMER_PROFILE_EDIT_FIELDS:
        if fieldname not in payload:
            continue
        value = payload.get(fieldname)
        if fieldname in {"full_name", "occupation", "phone", "email"}:
            updates[fieldname] = str(value or "").strip() or None
        elif fieldname == "address":
            updates[fieldname] = str(value or "").strip() or None
        elif fieldname == "birth_date":
            updates[fieldname] = str(value).strip() if value else None
        elif fieldname == "gender":
            normalized = str(value or "").strip()
            if normalized not in CUSTOMER_GENDER_OPTIONS:
                frappe.throw(_("Invalid gender value"))
            updates[fieldname] = normalized or "Unknown"
        elif fieldname == "marital_status":
            normalized = str(value or "").strip()
            if normalized not in CUSTOMER_MARITAL_OPTIONS:
                frappe.throw(_("Invalid marital status value"))
            updates[fieldname] = normalized or "Unknown"
        elif fieldname == "consent_status":
            normalized = str(value or "").strip()
            if normalized not in CUSTOMER_CONSENT_OPTIONS:
                frappe.throw(_("Invalid consent status value"))
            updates[fieldname] = normalized or "Unknown"
        elif fieldname == "assigned_agent":
            normalized = str(value or "").strip()
            if normalized and not frappe.db.exists("User", normalized):
                frappe.throw(_("Invalid assigned agent value"))
            updates[fieldname] = normalized or None

    if "full_name" in updates and not updates.get("full_name"):
        frappe.throw(_("Full Name is required"))

    for fieldname, value in updates.items():
        doc.set(fieldname, value)

    if doc.customer_type == "Corporate":
        doc.birth_date = None
        doc.gender = "Unknown"
        doc.marital_status = "Unknown"
        doc.occupation = None

    if updates:
        doc.save()
        frappe.db.commit()

    return {
        "name": doc.name,
        "customer_type": doc.customer_type,
        "full_name": doc.full_name,
        "birth_date": doc.birth_date,
        "gender": doc.gender,
        "marital_status": doc.marital_status,
        "occupation": doc.occupation,
        "phone": doc.phone,
        "email": doc.email,
        "address": doc.address,
        "consent_status": doc.consent_status,
        "assigned_agent": doc.assigned_agent,
        "modified": doc.modified,
    }


CUSTOMER_WORKBENCH_DERIVED_SORTS = dashboard_constants.CUSTOMER_WORKBENCH_DERIVED_SORTS

LEAD_WORKBENCH_DERIVED_SORTS = dashboard_constants.LEAD_WORKBENCH_DERIVED_SORTS

LEAD_WORKBENCH_STALE_STATES = dashboard_constants.LEAD_WORKBENCH_STALE_STATES


def _safe_customer_workbench_order_by(order_by) -> str:
    value = str(order_by or "").strip().lower()
    allowed = dashboard_constants.CUSTOMER_WORKBENCH_ALLOWED_ORDER_BY
    return allowed.get(value, "modified desc")


def _safe_lead_workbench_order_by(order_by) -> str:
    value = str(order_by or "").strip().lower()
    allowed = dashboard_constants.LEAD_WORKBENCH_ALLOWED_ORDER_BY
    return allowed.get(value, "modified desc")


def _sort_customer_workbench_rows(rows: list[dict], sort_value: str) -> None:
    value = str(sort_value or "").strip().lower()
    if value not in CUSTOMER_WORKBENCH_DERIVED_SORTS:
        rows.sort(
            key=lambda row: str(row.get("full_name") or row.get("name") or "").lower()
        )
        rows.sort(key=lambda row: str(row.get("modified") or ""), reverse=True)
        return

    field, direction = value.rsplit(" ", 1)
    reverse = direction == "desc"
    rows.sort(
        key=lambda row: str(row.get("full_name") or row.get("name") or "").lower()
    )
    rows.sort(key=lambda row: _customer_sort_metric(row, field), reverse=reverse)


def _customer_sort_metric(row: dict, field: str):
    if field == "active_policy_count":
        return cint(row.get("active_policy_count") or 0)
    if field == "open_offer_count":
        return cint(row.get("open_offer_count") or 0)
    if field == "active_policy_gross_premium":
        return flt(row.get("active_policy_gross_premium") or 0)
    return 0


def _sort_lead_workbench_rows(rows: list[dict], sort_value: str) -> None:
    value = str(sort_value or "").strip().lower()
    if not value:
        value = "modified desc"

    rows.sort(key=lambda row: str(row.get("first_name") or "").lower())

    if value in LEAD_WORKBENCH_DERIVED_SORTS:
        field, direction = value.rsplit(" ", 1)
        reverse = direction == "desc"
        rows.sort(key=lambda row: _lead_sort_metric(row, field), reverse=reverse)
        return

    if value == "first_name asc":
        rows.sort(key=lambda row: str(row.get("first_name") or "").lower())
        return
    if value == "first_name desc":
        rows.sort(
            key=lambda row: str(row.get("first_name") or "").lower(), reverse=True
        )
        return
    if value == "estimated_gross_premium asc":
        rows.sort(key=lambda row: flt(row.get("estimated_gross_premium") or 0))
        return
    if value == "estimated_gross_premium desc":
        rows.sort(
            key=lambda row: flt(row.get("estimated_gross_premium") or 0), reverse=True
        )
        return
    rows.sort(key=lambda row: str(row.get("modified") or ""), reverse=True)


def _lead_sort_metric(row: dict, field: str):
    if field == "stale_state":
        rank_map = {"Fresh": 1, "FollowUp": 2, "Stale": 3}
        return rank_map.get(str(row.get("stale_state") or ""), 0)
    if field == "can_convert_to_offer":
        return 1 if row.get("can_convert_to_offer") else 0
    if field == "conversion_state":
        rank_map = {
            "Incomplete": 1,
            "Actionable": 2,
            "Offer": 3,
            "Policy": 4,
            "Closed": 5,
        }
        return rank_map.get(str(row.get("conversion_state") or ""), 0)
    return 0


def _as_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def _is_number(value) -> bool:
    try:
        flt(value)
        return True
    except (ValueError, TypeError):
        return False


def _customer_names_by_portfolio_filters(
    *,
    allowed_customers: list[str] | None,
    has_active_policy: bool,
    has_open_offer: bool,
) -> list[str]:
    if not has_active_policy and not has_open_offer:
        return allowed_customers or []

    policy_names = None
    offer_names = None

    if has_active_policy:
        conditions = ["status in ('Active', 'KYT')"]
        values = {}
        if allowed_customers is not None:
            conditions.append("customer in %(customers)s")
            values["customers"] = tuple(allowed_customers or ["__none__"])
        policy_rows = frappe.db.sql(
            f"""
            select distinct customer
            from `tabAT Policy`
            where {" and ".join(conditions)}
            """,
            values=values,
            as_dict=True,
        )
        policy_names = {
            str(row.get("customer") or "") for row in policy_rows if row.get("customer")
        }

    if has_open_offer:
        conditions = [
            "status in ('Draft', 'Sent', 'Accepted')",
            "ifnull(converted_policy, '') = ''",
        ]
        values = {}
        if allowed_customers is not None:
            conditions.append("customer in %(customers)s")
            values["customers"] = tuple(allowed_customers or ["__none__"])
        offer_rows = frappe.db.sql(
            f"""
            select distinct customer
            from `tabAT Offer`
            where {" and ".join(conditions)}
            """,
            values=values,
            as_dict=True,
        )
        offer_names = {
            str(row.get("customer") or "") for row in offer_rows if row.get("customer")
        }

    if has_active_policy and has_open_offer:
        names = (policy_names or set()).intersection(offer_names or set())
    else:
        names = policy_names if has_active_policy else offer_names

    if allowed_customers is not None and names is not None:
        names = set(allowed_customers).intersection(names or set())
    return sorted(name for name in (names or set()) if name)


def _lead_detail_activity_events(lead) -> list[dict]:
    events: list[dict] = []
    if lead.creation:
        events.append(
            {
                "key": f"{lead.name}-created",
                "event_type": "created",
                "at": lead.creation,
                "actor": lead.owner,
            }
        )
    if lead.converted_offer:
        events.append(
            {
                "key": f"{lead.name}-offer",
                "event_type": "converted_offer",
                "at": lead.modified or lead.creation,
                "reference_name": lead.converted_offer,
                "actor": lead.modified_by or lead.owner,
            }
        )
    if lead.converted_policy:
        events.append(
            {
                "key": f"{lead.name}-policy",
                "event_type": "converted_policy",
                "at": lead.modified or lead.creation,
                "reference_name": lead.converted_policy,
                "actor": lead.modified_by or lead.owner,
            }
        )
    if lead.modified:
        events.append(
            {
                "key": f"{lead.name}-modified",
                "event_type": "modified",
                "at": lead.modified,
                "actor": lead.modified_by or lead.owner,
            }
        )
    return events


def _offer_detail_activity_events(offer) -> list[dict]:
    events: list[dict] = []
    if offer.creation:
        events.append(
            {
                "key": f"{offer.name}-created",
                "event_type": "created",
                "at": offer.creation,
                "actor": offer.owner,
            }
        )
    if offer.offer_date:
        events.append(
            {
                "key": f"{offer.name}-offer-date",
                "event_type": "offer_date",
                "at": offer.offer_date,
                "reference_name": offer.status,
            }
        )
    if offer.valid_until:
        events.append(
            {
                "key": f"{offer.name}-valid",
                "event_type": "valid_until",
                "at": offer.valid_until,
                "reference_name": offer.converted_policy or "",
            }
        )
    if offer.converted_policy:
        events.append(
            {
                "key": f"{offer.name}-converted",
                "event_type": "converted_policy",
                "at": offer.modified or offer.creation,
                "reference_name": offer.converted_policy,
                "actor": offer.modified_by or offer.owner,
            }
        )
    if offer.modified:
        events.append(
            {
                "key": f"{offer.name}-modified",
                "event_type": "modified",
                "at": offer.modified,
                "actor": offer.modified_by or offer.owner,
            }
        )
    return events


def _access_log_events(reference_doctype: str, reference_name: str) -> list[dict]:
    if not frappe.has_permission("AT Access Log", "read"):
        return []
    if not reference_doctype or not reference_name:
        return []
    try:
        rows = frappe.get_list(
            "AT Access Log",
            fields=["name", "action", "viewed_on", "viewed_by", "ip_address"],
            filters={
                "reference_doctype": reference_doctype,
                "reference_name": reference_name,
            },
            order_by="viewed_on desc",
            limit_page_length=8,
        )
    except Exception:
        log_redacted_error(
            "Access log fetch error",
            details={
                "reference_doctype": reference_doctype,
                "reference_name": reference_name,
            },
        )
        return []
    return [
        {
            "key": f"access-{row.get('name')}",
            "event_type": "access",
            "at": row.get("viewed_on"),
            "actor": row.get("viewed_by"),
            "action": row.get("action"),
            "meta": row.get("ip_address"),
        }
        for row in rows
        if row.get("viewed_on")
    ]


def _sort_activity_events(events: list[dict]) -> list[dict]:
    items = list(events or [])
    items.sort(key=lambda row: str(row.get("key") or ""))
    items.sort(key=lambda row: str(row.get("at") or ""), reverse=True)
    return items


def _get_notification_draft_preview_rows(
    *,
    customer: str | None,
    references: list[tuple[str, str]] | None,
    limit: int = 5,
) -> list[dict]:
    if not frappe.has_permission("AT Notification Draft", "read"):
        return []
    return _collect_notification_preview_rows(
        doctype="AT Notification Draft",
        fields=[
            "name",
            "status",
            "channel",
            "recipient",
            "customer",
            "reference_doctype",
            "reference_name",
            "modified",
        ],
        customer=customer,
        references=references,
        limit=limit,
    )


def _get_notification_outbox_preview_rows(
    *,
    customer: str | None,
    references: list[tuple[str, str]] | None,
    limit: int = 5,
) -> list[dict]:
    if not frappe.has_permission("AT Notification Outbox", "read"):
        return []
    return _collect_notification_preview_rows(
        doctype="AT Notification Outbox",
        fields=[
            "name",
            "status",
            "channel",
            "recipient",
            "customer",
            "reference_doctype",
            "reference_name",
            "modified",
        ],
        customer=customer,
        references=references,
        limit=limit,
    )


def _collect_notification_preview_rows(
    *,
    doctype: str,
    fields: list[str],
    customer: str | None,
    references: list[tuple[str, str]] | None,
    limit: int,
) -> list[dict]:
    rows_by_name: dict[str, dict] = {}

    def add_rows(new_rows: list[dict]):
        for row in new_rows or []:
            name = str(row.get("name") or "").strip()
            if not name or name in rows_by_name:
                continue
            rows_by_name[name] = row

    if customer:
        add_rows(
            frappe.get_list(
                doctype,
                fields=fields,
                filters={"customer": customer},
                order_by="modified desc",
                limit_page_length=max(cint(limit), 1),
            )
        )

    for reference_doctype, reference_name in references or []:
        if not reference_doctype or not reference_name:
            continue
        add_rows(
            frappe.get_list(
                doctype,
                fields=fields,
                filters={
                    "reference_doctype": reference_doctype,
                    "reference_name": reference_name,
                },
                order_by="modified desc",
                limit_page_length=max(cint(limit), 1),
            )
        )

    rows = list(rows_by_name.values())
    rows.sort(key=lambda row: str(row.get("modified") or ""), reverse=True)
    return rows[: max(cint(limit), 1)]


def _get_payment_detail_preview_rows(
    *, customer: str | None, policy: str | None, limit: int = 5
) -> list[dict]:
    if not frappe.has_permission("AT Payment", "read"):
        return []
    filters = []
    if customer:
        filters.append(["customer", "=", customer])
    if policy:
        filters.append(["policy", "=", policy])
    if not filters:
        return []
    if len(filters) == 1:
        return frappe.get_list(
            "AT Payment",
            fields=[
                "name",
                "payment_no",
                "status",
                "payment_direction",
                "payment_date",
                "amount_try",
                "customer",
                "policy",
            ],
            filters={filters[0][0]: filters[0][2]},
            order_by="modified desc",
            limit_page_length=max(cint(limit), 1),
        )
    return frappe.get_list(
        "AT Payment",
        fields=[
            "name",
            "payment_no",
            "status",
            "payment_direction",
            "payment_date",
            "amount_try",
            "customer",
            "policy",
        ],
        or_filters=[["AT Payment", f[0], f[1], f[2]] for f in filters],
        order_by="modified desc",
        limit_page_length=max(cint(limit), 1),
    )


def _get_renewal_detail_preview_rows(
    *, customer: str | None, policy: str | None, limit: int = 5
) -> list[dict]:
    if not frappe.has_permission("AT Renewal Task", "read"):
        return []
    filters = []
    if customer:
        filters.append(["customer", "=", customer])
    if policy:
        filters.append(["policy", "=", policy])
    if not filters:
        return []
    if len(filters) == 1:
        return frappe.get_list(
            "AT Renewal Task",
            fields=[
                "name",
                "policy",
                "status",
                "due_date",
                "renewal_date",
                "customer",
                "assigned_to",
            ],
            filters={filters[0][0]: filters[0][2]},
            order_by="due_date asc",
            limit_page_length=max(cint(limit), 1),
        )
    return frappe.get_list(
        "AT Renewal Task",
        fields=[
            "name",
            "policy",
            "status",
            "due_date",
            "renewal_date",
            "customer",
            "assigned_to",
        ],
        or_filters=[["AT Renewal Task", f[0], f[1], f[2]] for f in filters],
        order_by="due_date asc",
        limit_page_length=max(cint(limit), 1),
    )


def _get_offer_link_preview(name: str | None) -> dict | None:
    name = str(name or "").strip()
    if not name:
        return None
    row = frappe.db.get_value(
        "AT Offer",
        name,
        ["name", "status", "offer_date", "gross_premium", "currency"],
        as_dict=True,
    )
    return dict(row) if row else None


def _get_policy_link_preview(name: str | None) -> dict | None:
    name = str(name or "").strip()
    if not name:
        return None
    row = frappe.db.get_value(
        "AT Policy",
        name,
        ["name", "policy_no", "status", "end_date", "gross_premium", "currency"],
        as_dict=True,
    )
    return dict(row) if row else None


def _get_lead_link_preview(name: str | None) -> dict | None:
    name = str(name or "").strip()
    if not name:
        return None
    row = frappe.db.get_value(
        "AT Lead",
        name,
        ["name", "first_name", "last_name", "status", "email", "modified"],
        as_dict=True,
    )
    if not row:
        return None
    row = dict(row)
    row["display_name"] = (
        " ".join(
            part for part in [row.get("first_name"), row.get("last_name")] if part
        ).strip()
        or row["name"]
    )
    return row


def _customer_portfolio_summary_for_names(customer_names: list[str]) -> dict[str, dict]:
    requested = []
    seen = set()
    for item in list(customer_names or [])[:200]:
        name = str(item or "").strip()
        if not name or name in seen:
            continue
        requested.append(name)
        seen.add(name)
    if not requested:
        return {}

    summary_map: dict[str, dict] = {
        name: {
            "active_policy_count": 0,
            "active_renewal_count": 0,
            "open_offer_count": 0,
            "active_policy_gross_premium": 0.0,
        }
        for name in requested
    }

    values = {"customers": tuple(requested)}

    policy_rows = frappe.db.sql(
        """
        select
            customer,
            count(name) as active_policy_count,
            ifnull(sum(gross_premium), 0) as active_policy_gross_premium
        from `tabAT Policy`
        where customer in %(customers)s
            and status in ('Active', 'KYT')
        group by customer
        """,
        values=values,
        as_dict=True,
    )
    for row in policy_rows:
        customer = row.get("customer")
        if customer not in summary_map:
            continue
        summary_map[customer]["active_policy_count"] = cint(
            row.get("active_policy_count")
        )
        summary_map[customer]["active_policy_gross_premium"] = flt(
            row.get("active_policy_gross_premium")
        )

    offer_rows = frappe.db.sql(
        """
        select
            customer,
            count(name) as open_offer_count
        from `tabAT Offer`
        where customer in %(customers)s
            and status in ('Draft', 'Sent', 'Accepted')
            and ifnull(converted_policy, '') = ''
        group by customer
        """,
        values=values,
        as_dict=True,
    )
    for row in offer_rows:
        customer = row.get("customer")
        if customer not in summary_map:
            continue
        summary_map[customer]["open_offer_count"] = cint(row.get("open_offer_count"))

    renewal_rows = frappe.db.sql(
        """
        select
            customer,
            count(name) as active_renewal_count
        from `tabAT Renewal Task`
        where customer in %(customers)s
            and status in ('Open', 'In Progress')
        group by customer
        """,
        values=values,
        as_dict=True,
    )
    for row in renewal_rows:
        customer = row.get("customer")
        if customer not in summary_map:
            continue
        summary_map[customer]["active_renewal_count"] = cint(row.get("active_renewal_count"))

    return summary_map


def _lead_can_convert_to_offer(row: dict | None) -> bool:
    row = row or {}
    if row.get("converted_offer") or row.get("converted_policy"):
        return False
    if str(row.get("status") or "") == "Closed":
        return False
    if (
        not row.get("customer")
        or not row.get("sales_entity")
        or not row.get("insurance_company")
        or not row.get("branch")
    ):
        return False
    estimated = flt(row.get("estimated_gross_premium") or 0)
    return estimated > 0


def _lead_conversion_state(row: dict | None) -> str:
    row = row or {}
    if row.get("converted_policy"):
        return "Policy"
    if row.get("converted_offer"):
        return "Offer"
    if str(row.get("status") or "") == "Closed":
        return "Closed"
    if _lead_can_convert_to_offer(row):
        return "Actionable"
    return "Incomplete"


def _lead_conversion_missing_fieldnames(row: dict | None) -> list[str]:
    row = row or {}
    if row.get("converted_offer") or row.get("converted_policy"):
        return []
    missing = []
    if not row.get("customer"):
        missing.append("customer")
    if not row.get("sales_entity"):
        missing.append("sales_entity")
    if not row.get("insurance_company"):
        missing.append("insurance_company")
    if not row.get("branch"):
        missing.append("branch")
    if flt(row.get("estimated_gross_premium") or 0) <= 0:
        missing.append("estimated_gross_premium")
    return missing


def _lead_next_conversion_action(row: dict | None) -> str:
    row = row or {}
    if str(row.get("status") or "") == "Closed":
        return "Closed"
    if _lead_can_convert_to_offer(row):
        return "Convert"
    return "CompleteFields"


def _lead_stale_state(modified_value) -> str:
    try:
        if not modified_value:
            return "Stale"
        modified_date = getdate(modified_value)
        delta = (getdate(nowdate()) - modified_date).days
    except Exception:
        return "Stale"
    if delta >= 8:
        return "Stale"
    if delta >= 3:
        return "FollowUp"
    return "Fresh"


def _monthly_commission_trend(
    months: int,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> list[dict]:
    cache = _get_request_cache_bucket("at_dashboard_monthly_commission_trend_cache")
    cache_key = (
        months,
        str(branch or ""),
        str(office_branch or ""),
        tuple(allowed_customers or []) if allowed_customers is not None else None,
    )
    if cache_key in cache:
        return list(cache[cache_key])

    conditions = []
    values = {"months": months}

    if branch:
        conditions.append("branch = %(branch)s")
        values["branch"] = branch
    if office_branch:
        conditions.append("office_branch = %(office_branch)s")
        values["office_branch"] = office_branch

    if allowed_customers is not None:
        if not allowed_customers:
            return []
        conditions.append("customer in %(customers)s")
        values["customers"] = tuple(allowed_customers)

    where_clause = " and ".join(conditions)
    if where_clause:
        where_clause = f"and {where_clause}"

    rows = frappe.db.sql(
        f"""
        select
            date_format(issue_date, '%%Y-%%m') as month_key,
            ifnull(sum({commission_sql_expr()}), 0) as total_commission,
            ifnull(sum(gwp_try), 0) as total_gwp_try
        from `tabAT Policy`
        where issue_date >= date_sub(curdate(), interval %(months)s month)
            {where_clause}
        group by month_key
        order by month_key asc
        """,
        values=values,
        as_dict=True,
    )
    cache[cache_key] = list(rows)
    return rows


def _dashboard_cards_summary(
    *,
    from_date: str | None,
    to_date: str | None,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> dict:
    cache = _get_request_cache_bucket("at_dashboard_cards_summary_cache")
    cache_key = (
        str(from_date or ""),
        str(to_date or ""),
        str(branch or ""),
        str(office_branch or ""),
        tuple(allowed_customers or []) if allowed_customers is not None else None,
    )
    if cache_key in cache:
        return dict(cache[cache_key])

    # Redis cross-request cache (60s TTL) for KPI cards
    redis_key = f"at_dashboard_kpi::{frappe.session.user}::{hash(cache_key)}"
    redis_cached = frappe.cache().get_value(redis_key)
    if redis_cached:
        cache[cache_key] = dict(redis_cached)
        return dict(redis_cached)

    policy_where, policy_values = _build_policy_where(
        from_date=from_date,
        to_date=to_date,
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )
    totals = frappe.db.sql(
        f"""
        select
            ifnull(sum(gwp_try), 0) as total_gwp_try,
            ifnull(sum({commission_sql_expr()}), 0) as total_commission,
            ifnull(avg(case when gross_premium > 0 then ({commission_sql_expr()} / gross_premium) * 100 else null end), 0) as avg_commission_rate,
            count(name) as total_policies
        from `tabAT Policy`
        where {policy_where}
        """,
        values=policy_values,
        as_dict=True,
    )[0]

    renewal_filters = {
        "status": ["in", ["Open", "In Progress"]],
        "renewal_date": ["<=", add_days(nowdate(), 30)],
    }
    if office_branch:
        renewal_filters["office_branch"] = office_branch
    policy_names = _get_scoped_policy_names(
        branch=branch,
        office_branch=None,
        allowed_customers=allowed_customers,
    )
    if branch or allowed_customers is not None:
        renewal_filters["policy"] = ["in", policy_names or ["__none__"]]
    pending_renewals = frappe.db.count("AT Renewal Task", filters=renewal_filters)

    payment_rows = frappe.get_all(
        "AT Payment",
        filters=_build_payment_filters(
            from_date=from_date,
            to_date=to_date,
            branch=branch,
            office_branch=office_branch,
            allowed_customers=allowed_customers,
        ),
        fields=[
            "payment_direction",
            "status",
            "sum(amount_try) as total_amount",
        ],
        group_by="payment_direction, status",
    )
    payment_totals = {
        "collected_try": sum(
            flt(row.get("total_amount") or 0)
            for row in payment_rows
            if row.get("payment_direction") == "Inbound" and row.get("status") == "Paid"
        ),
        "payout_try": sum(
            flt(row.get("total_amount") or 0)
            for row in payment_rows
            if row.get("payment_direction") == "Outbound"
            and row.get("status") == "Paid"
        ),
    }

    open_claims = frappe.db.count(
        "AT Claim",
        filters=_build_claim_filters(
            from_date=from_date,
            to_date=to_date,
            branch=branch,
            office_branch=office_branch,
            allowed_customers=allowed_customers,
            open_only=True,
        ),
    )

    result = {
        "total_gwp_try": float(totals.get("total_gwp_try") or 0),
        "total_commission": float(totals.get("total_commission") or 0),
        "avg_commission_rate": float(totals.get("avg_commission_rate") or 0),
        "total_policies": int(totals.get("total_policies") or 0),
        "pending_renewals": int(pending_renewals or 0),
        "collected_try": float(payment_totals.get("collected_try") or 0),
        "payout_try": float(payment_totals.get("payout_try") or 0),
        "open_claims": int(open_claims or 0),
    }
    cache[cache_key] = dict(result)
    # Redis cross-request cache (60s TTL) for KPI cards
    frappe.cache().set_value(redis_key, result, expires_in_sec=60)
    return result


def _build_offer_where(
    *,
    from_date: str | None,
    to_date: str | None,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> tuple[str, dict]:
    conditions = ["1=1"]
    values = {}

    if from_date:
        conditions.append("offer_date >= %(from_date)s")
        values["from_date"] = getdate(from_date)
    if to_date:
        conditions.append("offer_date <= %(to_date)s")
        values["to_date"] = getdate(to_date)
    if branch:
        conditions.append("branch = %(branch)s")
        values["branch"] = branch
    if office_branch:
        conditions.append(
            "customer in (select name from `tabAT Customer` where office_branch = %(office_branch)s)"
        )
        values["office_branch"] = office_branch
    if allowed_customers is not None:
        conditions.append("customer in %(customers)s")
        values["customers"] = tuple(allowed_customers)

    return " and ".join(conditions), values


def _build_offer_filters(
    *,
    from_date: str | None,
    to_date: str | None,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> list:
    filters: list = []
    if from_date:
        filters.append(["offer_date", ">=", getdate(from_date)])
    if to_date:
        filters.append(["offer_date", "<=", getdate(to_date)])
    if branch:
        filters.append(["branch", "=", branch])
    if office_branch:
        filters.append(
            [
                "customer",
                "in",
                _get_scoped_customer_names(
                    office_branch=office_branch, allowed_customers=allowed_customers
                )
                or ["__none__"],
            ]
        )
    elif allowed_customers is not None:
        filters.append(["customer", "in", allowed_customers or ["__none__"]])
    return filters


def _build_policy_filters(
    *,
    from_date: str | None,
    to_date: str | None,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> list:
    filters: list = []
    if from_date:
        filters.append(["issue_date", ">=", getdate(from_date)])
    if to_date:
        filters.append(["issue_date", "<=", getdate(to_date)])
    if branch:
        filters.append(["branch", "=", branch])
    if office_branch:
        filters.append(["office_branch", "=", office_branch])
    if allowed_customers is not None:
        filters.append(["customer", "in", allowed_customers or ["__none__"]])
    return filters


def _build_lead_filters(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> list:
    filters: list = []
    if branch:
        filters.append(["branch", "=", branch])
    if office_branch:
        filters.append(["office_branch", "=", office_branch])
    if allowed_customers is not None:
        filters.append(["customer", "in", allowed_customers or ["__none__"]])
    return filters


def _build_payment_filters(
    *,
    from_date: str | None,
    to_date: str | None,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> list:
    filters: list = []
    if from_date:
        filters.append(["payment_date", ">=", getdate(from_date)])
    if to_date:
        filters.append(["payment_date", "<=", getdate(to_date)])
    if office_branch:
        filters.append(["office_branch", "=", office_branch])
    if branch or allowed_customers is not None:
        policy_names = _get_scoped_policy_names(
            branch=branch,
            office_branch=office_branch,
            allowed_customers=allowed_customers,
        )
        filters.append(["policy", "in", policy_names or ["__none__"]])
    return filters


def _build_claim_filters(
    *,
    from_date: str | None,
    to_date: str | None,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
    open_only: bool = False,
) -> list:
    filters: list = []
    if from_date:
        filters.append(["reported_date", ">=", getdate(from_date)])
    if to_date:
        filters.append(["reported_date", "<=", getdate(to_date)])
    if office_branch:
        filters.append(["office_branch", "=", office_branch])
    if branch or allowed_customers is not None:
        policy_names = _get_scoped_policy_names(
            branch=branch,
            office_branch=office_branch,
            allowed_customers=allowed_customers,
        )
        filters.append(["policy", "in", policy_names or ["__none__"]])
    if open_only:
        filters.append(["claim_status", "in", ["Open", "Under Review", "Approved"]])
    return filters


def _get_offer_preview_rows(
    *,
    where_clause: str | None = None,
    values: dict | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    branch: str | None = None,
    office_branch: str | None = None,
    allowed_customers: list[str] | None = None,
    limit: int,
    ready_only: bool = False,
) -> list[dict]:
    if where_clause:
        extra_ready_filter = " and status in ('Sent', 'Accepted')" if ready_only else ""
        rows = frappe.db.sql(
            f"""
            select
                o.name,
                o.customer,
                c.full_name as customer_full_name,
                o.insurance_company,
                o.status,
                o.currency,
                o.valid_until,
                o.gross_premium,
                o.converted_policy
            from `tabAT Offer` o
            left join `tabAT Customer` c on c.name = o.customer
            where {where_clause}{extra_ready_filter}
            order by o.modified desc
            limit %(limit)s
            """,
            values={
                **(values or {}),
                "limit": max(cint(limit), 1) * (3 if ready_only else 1),
            },
            as_dict=True,
        )
        if ready_only:
            rows = [row for row in rows if not row.get("converted_policy")]
        return rows[: max(cint(limit), 1)]

    filters = _build_offer_filters(
        from_date=from_date,
        to_date=to_date,
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )
    if ready_only:
        filters.append(["status", "in", ["Sent", "Accepted"]])
    rows = frappe.get_all(
        "AT Offer",
        filters=filters,
        fields=[
            "name",
            "customer",
            "customer.full_name as customer_full_name",
            "insurance_company",
            "status",
            "currency",
            "valid_until",
            "gross_premium",
            "converted_policy",
        ],
        order_by="modified desc",
        limit_page_length=max(cint(limit), 1) * (3 if ready_only else 1),
    )
    if ready_only:
        rows = [row for row in rows if not row.get("converted_policy")]
    return rows[: max(cint(limit), 1)]


def _get_policy_preview_rows(
    *,
    where_clause: str | None = None,
    values: dict | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    branch: str | None = None,
    office_branch: str | None = None,
    allowed_customers: list[str] | None = None,
    limit: int,
) -> list[dict]:
    if where_clause:
        return frappe.db.sql(
            f"""
            select
                p.name,
                p.policy_no,
                p.customer,
                c.full_name as customer_full_name,
                p.status,
                p.currency,
                p.issue_date,
                p.gross_premium,
                p.commission_amount,
                p.commission
            from `tabAT Policy` p
            left join `tabAT Customer` c on c.name = p.customer
            where {where_clause}
            order by p.modified desc
            limit %(limit)s
            """,
            values={**(values or {}), "limit": max(cint(limit), 1)},
            as_dict=True,
        )

    return frappe.get_all(
        "AT Policy",
        filters=_build_policy_filters(
            from_date=from_date,
            to_date=to_date,
            branch=branch,
            office_branch=office_branch,
            allowed_customers=allowed_customers,
        ),
        fields=[
            "name",
            "policy_no",
            "customer",
            "customer.full_name as customer_full_name",
            "status",
            "currency",
            "issue_date",
            "gross_premium",
            "commission_amount",
            "commission",
        ],
        order_by="modified desc",
        limit_page_length=max(cint(limit), 1),
    )


def _get_top_companies_rows(
    *, where_clause: str, values: dict, limit: int = 5
) -> list[dict]:
    rows = frappe.db.sql(
        f"""
        select
            p.insurance_company as insurance_company,
            ifnull(ic.company_name, p.insurance_company) as company_name,
            count(p.name) as policy_count,
            ifnull(sum(p.gwp_try), 0) as total_gwp_try,
            ifnull(sum({commission_sql_expr("p.")}), 0) as total_commission
        from `tabAT Policy` p
        left join `tabAT Insurance Company` ic on ic.name = p.insurance_company
        where {where_clause}
        group by p.insurance_company, ic.company_name
        order by total_gwp_try desc
        limit %(limit)s
        """,
        values={**(values or {}), "limit": cint(limit)},
        as_dict=True,
    )
    return rows


def _get_lead_preview_rows(
    *,
    lead_where: str | None = None,
    values: dict | None = None,
    branch: str | None = None,
    office_branch: str | None = None,
    allowed_customers: list[str] | None = None,
    limit: int,
) -> list[dict]:
    if lead_where:
        return frappe.db.sql(
            f"""
            select
                name,
                first_name,
                last_name,
                email,
                status,
                estimated_gross_premium,
                notes
            from `tabAT Lead`
            where {lead_where}
            order by modified desc
            limit %(limit)s
            """,
            values={**(values or {}), "limit": max(cint(limit), 1)},
            as_dict=True,
        )

    return frappe.get_all(
        "AT Lead",
        filters=_build_lead_filters(
            branch=branch,
            office_branch=office_branch,
            allowed_customers=allowed_customers,
        ),
        fields=[
            "name",
            "first_name",
            "last_name",
            "email",
            "status",
            "estimated_gross_premium",
            "notes",
        ],
        order_by="modified desc",
        limit_page_length=max(cint(limit), 1),
    )


def _get_payment_preview_rows(
    *,
    where_clause: str | None = None,
    values: dict | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    branch: str | None = None,
    office_branch: str | None = None,
    allowed_customers: list[str] | None = None,
    limit: int,
    order_by: str = "p.modified desc",
) -> list[dict]:
    if where_clause:
        return frappe.db.sql(
            f"""
            select
                p.name,
                p.payment_no,
                p.payment_direction,
                p.payment_purpose,
                p.status,
                p.payment_date,
                p.due_date,
                p.amount_try,
                p.customer,
                c.full_name as customer_full_name,
                p.policy
            from `tabAT Payment` p
            left join `tabAT Customer` c on c.name = p.customer
            where {where_clause}
            order by {order_by}
            limit %(limit)s
            """,
            values={**(values or {}), "limit": max(cint(limit), 1)},
            as_dict=True,
        )

    return frappe.get_all(
        "AT Payment",
        filters=_build_payment_filters(
            from_date=from_date,
            to_date=to_date,
            branch=branch,
            office_branch=office_branch,
            allowed_customers=allowed_customers,
        ),
        fields=[
            "name",
            "payment_no",
            "payment_direction",
            "payment_purpose",
            "status",
            "payment_date",
            "due_date",
            "amount_try",
            "customer",
            "customer.full_name as customer_full_name",
            "policy",
        ],
        order_by=order_by,
        limit_page_length=max(cint(limit), 1),
    )


def _get_renewal_task_preview_rows(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
    statuses: list[str] | None = None,
    limit: int = 8,
) -> list[dict]:
    filters = {}
    if statuses:
        filters["status"] = ["in", statuses]
    if office_branch:
        filters["office_branch"] = office_branch
    if branch or allowed_customers is not None:
        policy_names = _get_scoped_policy_names(
            branch=branch,
            office_branch=None,
            allowed_customers=allowed_customers,
        )
        filters["policy"] = ["in", policy_names or ["__none__"]]

    return frappe.get_list(
        "AT Renewal Task",
        fields=[
            "name",
            "policy",
            "status",
            "due_date",
            "renewal_date",
            "customer",
            "customer.full_name as customer_full_name",
            "assigned_to",
            "outcome_record",
        ],
        filters=filters,
        order_by="due_date asc",
        limit_page_length=max(cint(limit), 1),
    )


def _get_offer_waiting_renewal_summary(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
    limit: int = 20,
) -> dict:
    conditions = [
        "rt.status in ('Open', 'In Progress')",
        "(rt.outcome_record is null or ifnull(ro.offer, '') = '')",
    ]
    values: dict[str, object] = {"limit": max(cint(limit), 1)}

    if office_branch:
        conditions.append("rt.office_branch = %(office_branch)s")
        values["office_branch"] = office_branch
    if branch or allowed_customers is not None:
        policy_names = _get_scoped_policy_names(
            branch=branch,
            office_branch=None,
            allowed_customers=allowed_customers,
        )
        conditions.append("rt.policy in %(policies)s")
        values["policies"] = tuple(policy_names or ["__none__"])
    elif allowed_customers is not None:
        conditions.append("rt.customer in %(customers)s")
        values["customers"] = tuple(allowed_customers or ["__none__"])

    where_clause = " and ".join(["1=1", *conditions])
    count_row = frappe.db.sql(
        f"""
        select count(rt.name) as total
        from `tabAT Renewal Task` rt
        left join `tabAT Renewal Outcome` ro on ro.name = rt.outcome_record
        where {where_clause}
        """,
        values=values,
        as_dict=True,
    )
    rows = frappe.db.sql(
        f"""
        select
            rt.name,
            rt.policy,
            rt.customer,
            c.full_name as customer_full_name,
            rt.status,
            rt.due_date,
            rt.renewal_date,
            rt.assigned_to,
            rt.outcome_record
        from `tabAT Renewal Task` rt
        left join `tabAT Customer` c on c.name = rt.customer
        left join `tabAT Renewal Outcome` ro on ro.name = rt.outcome_record
        where {where_clause}
        order by rt.due_date asc, rt.modified desc
        limit %(limit)s
        """,
        values=values,
        as_dict=True,
    )
    total = cint((count_row[0] or {}).get("total") if count_row else 0)
    return {
        "count": total,
        "rows": rows,
    }





def _renewal_status_and_buckets(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> dict:
    cache = _get_request_cache_bucket("at_dashboard_renewal_status_cache")
    cache_key = (
        str(branch or ""),
        str(office_branch or ""),
        tuple(allowed_customers or []) if allowed_customers is not None else None,
    )
    if cache_key in cache:
        return {
            "status_rows": [dict(item) for item in cache[cache_key]["status_rows"]],
            "buckets": dict(cache[cache_key]["buckets"]),
            "retention": dict(cache[cache_key]["retention"]),
        }

    conditions = ["1=1"]
    values: dict[str, object] = {}
    if office_branch:
        conditions.append("rt.office_branch = %(office_branch)s")
        values["office_branch"] = office_branch
    if branch or allowed_customers is not None:
        policy_names = _get_scoped_policy_names(
            branch=branch,
            office_branch=None,
            allowed_customers=allowed_customers,
        )
        conditions.append("rt.policy in %(policies)s")
        values["policies"] = tuple(policy_names or ["__none__"])

    where_clause = " and ".join(conditions)

    status_rows_raw = frappe.db.sql(
        f"""
        select rt.status, count(rt.name) as total
        from `tabAT Renewal Task` rt
        where {where_clause}
        group by rt.status
        """,
        values=values,
        as_dict=True,
    )

    status_counts = {
        "Open": 0,
        "In Progress": 0,
        RENEWAL_STATUS_DONE: 0,
        "Cancelled": 0,
    }
    buckets = {"overdue": 0, "due7": 0, "due30": 0}
    retention = {"renewed": 0, "lost": 0, "cancelled": 0, "rate": 0.0}
    today = getdate(nowdate())

    for row in status_rows_raw:
        status = _normalize_renewal_status(row.get("status"))
        if status in status_counts:
            status_counts[status] += int(row.get("total") or 0)

    # Buckets need individual rows for date calculations
    bucket_rows = frappe.db.sql(
        f"""
        select rt.due_date, rt.renewal_date
        from `tabAT Renewal Task` rt
        where {where_clause}
          and rt.status in ('Open', 'In Progress')
        """,
        values=values,
        as_dict=True,
    )
    for row in bucket_rows:
        due_value = row.get("due_date") or row.get("renewal_date")
        if due_value:
            days_left = (getdate(due_value) - today).days
            if days_left < 0:
                buckets["overdue"] += 1
            elif days_left <= 7:
                buckets["due7"] += 1
            elif days_left <= 30:
                buckets["due30"] += 1

    outcome_filters = {}
    if office_branch:
        outcome_filters["office_branch"] = office_branch
    if branch or allowed_customers is not None:
        policy_names = _get_scoped_policy_names(
            branch=branch,
            office_branch=None,
            allowed_customers=allowed_customers,
        )
        outcome_filters["policy"] = ["in", policy_names or ["__none__"]]

    outcome_agg = frappe.get_all(
        "AT Renewal Outcome",
        fields=["outcome_status", "count(name) as total"],
        filters=outcome_filters,
        group_by="outcome_status",
    )
    for row in outcome_agg:
        outcome_status = str(row.get("outcome_status") or "").strip()
        total = int(row.get("total") or 0)
        if outcome_status == "Renewed":
            retention["renewed"] += total
        elif outcome_status == "Lost":
            retention["lost"] += total
        elif outcome_status == "Cancelled":
            retention["cancelled"] += total

    retention_base = retention["renewed"] + retention["lost"]
    if retention_base > 0:
        retention["rate"] = round((retention["renewed"] / retention_base) * 100, 2)

    status_rows = [
        {"status": key, "total": value} for key, value in status_counts.items()
    ]
    result = {"status_rows": status_rows, "buckets": buckets, "retention": retention}
    cache[cache_key] = {
        "status_rows": [dict(item) for item in status_rows],
        "buckets": dict(buckets),
        "retention": dict(retention),
    }
    return result


def _reconciliation_open_summary(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> dict:
    cache = _get_request_cache_bucket("at_dashboard_reconciliation_summary_cache")
    cache_key = (
        str(branch or ""),
        str(office_branch or ""),
        tuple(allowed_customers or []) if allowed_customers is not None else None,
    )
    if cache_key in cache:
        return dict(cache[cache_key])

    conditions = ["ri.status = 'Open'"]
    values = {}

    if branch:
        conditions.append(
            "((ae.policy is not null and p.branch = %(branch)s) or (ae.policy is null and 1=1))"
        )
        values["branch"] = branch
    if office_branch:
        conditions.append(
            "ae.customer in (select name from `tabAT Customer` where office_branch = %(office_branch)s)"
        )
        values["office_branch"] = office_branch
    if allowed_customers is not None:
        conditions.append("ae.customer in %(customers)s")
        values["customers"] = tuple(allowed_customers)

    row = frappe.db.sql(
        f"""
        select
            count(ri.name) as open_count,
            ifnull(sum(ri.difference_try), 0) as open_difference_try
        from `tabAT Reconciliation Item` ri
        left join `tabAT Accounting Entry` ae on ae.name = ri.accounting_entry
        left join `tabAT Policy` p on p.name = ae.policy
        where {" and ".join(conditions)}
        """,
        values=values,
        as_dict=True,
    )[0]
    result = row or {"open_count": 0, "open_difference_try": 0}
    cache[cache_key] = dict(result)
    return result


def _reconciliation_filter_conditions(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> tuple[list[str], dict]:
    conditions = ["ri.status = 'Open'"]
    values = {}
    if branch:
        conditions.append(
            "((ae.policy is not null and p.branch = %(branch)s) or (ae.policy is null and 1=1))"
        )
        values["branch"] = branch
    if office_branch:
        conditions.append(
            "ae.customer in (select name from `tabAT Customer` where office_branch = %(office_branch)s)"
        )
        values["office_branch"] = office_branch
    if allowed_customers is not None:
        conditions.append("ae.customer in %(customers)s")
        values["customers"] = tuple(allowed_customers)
    return conditions, values


def _get_reconciliation_open_rows_preview(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
    limit: int = 8,
) -> list[dict]:
    conditions, values = _reconciliation_filter_conditions(
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )
    rows = frappe.db.sql(
        f"""
        select
            ri.name,
            ri.source_doctype,
            ri.source_name,
            ri.status,
            ri.mismatch_type,
            ri.difference_try
        from `tabAT Reconciliation Item` ri
        left join `tabAT Accounting Entry` ae on ae.name = ri.accounting_entry
        left join `tabAT Policy` p on p.name = ae.policy
        where {" and ".join(conditions)}
        order by ri.modified desc
        limit %(limit)s
        """,
        values={**values, "limit": cint(limit)},
        as_dict=True,
    )
    return rows


def _dashboard_bootstrap_global_fallback_enabled() -> bool:
    return dashboard_security.dashboard_bootstrap_global_fallback_enabled()


def _allowed_customers_for_user(include_meta: bool = False):
    return dashboard_security.allowed_customers_for_user(include_meta=include_meta)


def _allowed_sales_entities_for_user(include_meta: bool = False):
    return dashboard_security.allowed_sales_entities_for_user(include_meta=include_meta)


def _get_request_cache_bucket(cache_name: str) -> dict:
    cache = getattr(frappe.local, cache_name, None)
    if cache is None:
        cache = {}
        setattr(frappe.local, cache_name, cache)
    return cache





def _empty_dashboard_payload(meta: dict | None = None) -> dict:
    payload = {
        "cards": {
            "total_gwp_try": 0.0,
            "total_commission": 0.0,
            "avg_commission_rate": 0.0,
            "total_policies": 0,
            "pending_renewals": 0,
            "collected_try": 0.0,
            "payout_try": 0.0,
            "open_claims": 0,
        },
        "lead_status": [],
        "policy_status": [],
        "top_companies": [],
        "commission_trend": [],
        "comparison": {},
    }
    if meta:
        payload["meta"] = meta
    return payload
