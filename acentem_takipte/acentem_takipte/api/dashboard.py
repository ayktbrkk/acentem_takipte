from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import add_days, cint, flt, getdate, nowdate

from acentem_takipte.acentem_takipte.api import dashboard_cache as dashboard_cache_helpers
from acentem_takipte.acentem_takipte.api.dashboard_preview import (
    _collect_notification_preview_rows,
    _get_lead_link_preview,
    _get_notification_draft_preview_rows,
    _get_notification_outbox_preview_rows,
    _get_offer_link_preview,
    _get_payment_detail_preview_rows,
    _get_policy_link_preview,
    _get_renewal_detail_preview_rows,
)
from acentem_takipte.acentem_takipte.api.dashboard_v2 import (
    constants as dashboard_constants,
)
from acentem_takipte.acentem_takipte.api import dashboard_detail as dashboard_detail_builder
from acentem_takipte.acentem_takipte.api import dashboard_metrics as dashboard_metrics_helpers
from acentem_takipte.acentem_takipte.api import dashboard_lead_logic as dashboard_lead_logic_helpers
from acentem_takipte.acentem_takipte.api import dashboard_workbench as dashboard_workbench_helpers
from acentem_takipte.acentem_takipte.api.dashboard_v2 import (
    filters as dashboard_filters,
)
from acentem_takipte.acentem_takipte.api.dashboard_v2 import (
    queries_customers as dashboard_customer_queries,
)
from acentem_takipte.acentem_takipte.api.dashboard_v2 import (
    queries_kpis as dashboard_kpi_queries,
)
from acentem_takipte.acentem_takipte.api.dashboard_v2 import (
    queries_leads as dashboard_lead_queries,
)
from acentem_takipte.acentem_takipte.api import (
    dashboard_reconciliation as dashboard_reconciliation_helpers,
)
from acentem_takipte.acentem_takipte.api.dashboard_v2 import (
    security as dashboard_security,
)
from acentem_takipte.acentem_takipte.api.dashboard_v2 import (
    serializers as dashboard_serializers,
)
from acentem_takipte.acentem_takipte.api.dashboard_v2 import (
    tab_payload as dashboard_tab_sections,
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
    "email",
    "address",
    "consent_status",
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
    frappe.throw(_(f"Only {allowed_label} requests are allowed for this action."))


def _safe_session_user() -> str:
    return dashboard_cache_helpers._safe_session_user()


def _dashboard_tab_cache_key(
    *,
    tab_key: str,
    from_date,
    to_date,
    compare_from_date=None,
    compare_to_date=None,
    branch=None,
    office_branch=None,
    months: int,
    allowed_customers: list[str] | None,
    scope_meta: dict | None,
) -> str:
    return dashboard_cache_helpers._dashboard_tab_cache_key(
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
        safe_session_user_fn=_safe_session_user,
    )


def _dashboard_tab_cache_ttl_seconds() -> int:
    return dashboard_cache_helpers._dashboard_tab_cache_ttl_seconds(
        cache_config_key=DASHBOARD_TAB_CACHE_TTL_CONFIG_KEY,
        default_ttl_seconds=DASHBOARD_TAB_CACHE_TTL_SECONDS,
    )


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
    if allowed_customers is not None:
        if not allowed_customers:
            return _empty_dashboard_payload(meta=scope_meta)
    return dashboard_kpi_queries.build_dashboard_kpis_payload(
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
        frappe.throw("Authentication required")

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
        frappe.throw("Authentication required")

    customer_name = str(name or "").strip()
    if not customer_name:
        frappe.throw("Customer is required")

    customer = frappe.get_doc("AT Customer", customer_name)
    customer.check_permission("read")

    allowed_customers = _allowed_customers_for_user()
    if allowed_customers is not None and customer_name not in set(allowed_customers):
        frappe.throw("Not permitted")

    return build_customer_360_payload(
        customer_name,
        can_view_sensitive=has_sensitive_access(),
    )


@frappe.whitelist()
def get_policy_360_payload(name: str) -> dict:
    user = frappe.session.user
    if user == "Guest":
        frappe.throw("Authentication required")

    policy_name = str(name or "").strip()
    if not policy_name:
        frappe.throw("Policy is required")

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
        frappe.throw("Authentication required")

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
        frappe.throw("Authentication required")

    payload = (
        frappe.parse_json(filters) if isinstance(filters, str) else (filters or {})
    )
    office_branch = normalize_requested_office_branch(payload.get("office_branch"))
    return build_my_tasks_payload(office_branch=office_branch, assigned_to=user)


@frappe.whitelist()
def get_my_activities_payload(filters=None) -> dict:
    user = frappe.session.user
    if user == "Guest":
        frappe.throw("Authentication required")

    payload = (
        frappe.parse_json(filters) if isinstance(filters, str) else (filters or {})
    )
    office_branch = normalize_requested_office_branch(payload.get("office_branch"))
    return build_my_activities_payload(office_branch=office_branch, assigned_to=user)


@frappe.whitelist()
def get_my_reminders_payload(filters=None) -> dict:
    user = frappe.session.user
    if user == "Guest":
        frappe.throw("Authentication required")

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
        frappe.throw("Authentication required")

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
        frappe.throw("Authentication required")

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
        frappe.throw("Authentication required")

    lead_name = str(name or "").strip()
    if not lead_name:
        frappe.throw("Lead is required")

    lead = frappe.get_doc("AT Lead", lead_name)
    lead.check_permission("read")

    allowed_customers = _allowed_customers_for_user()
    if (
        allowed_customers is not None
        and lead.customer
        and lead.customer not in set(allowed_customers)
    ):
        frappe.throw("Not permitted")

    return dashboard_detail_builder.build_lead_detail_payload(
        lead,
        get_offer_link_preview_fn=_get_offer_link_preview,
        get_policy_link_preview_fn=_get_policy_link_preview,
        lead_detail_activity_events_fn=_lead_detail_activity_events,
        access_log_events_fn=_access_log_events,
        sort_activity_events_fn=_sort_activity_events,
        get_notification_draft_preview_rows_fn=_get_notification_draft_preview_rows,
        get_notification_outbox_preview_rows_fn=_get_notification_outbox_preview_rows,
        get_payment_detail_preview_rows_fn=_get_payment_detail_preview_rows,
        get_renewal_detail_preview_rows_fn=_get_renewal_detail_preview_rows,
    )


@frappe.whitelist()
def get_offer_detail_payload(name: str) -> dict:
    _assert_dashboard_endpoint_method("get_offer_detail_payload")
    user = frappe.session.user
    if user == "Guest":
        frappe.throw("Authentication required")

    offer_name = str(name or "").strip()
    if not offer_name:
        frappe.throw("Offer is required")

    offer = frappe.get_doc("AT Offer", offer_name)
    offer.check_permission("read")

    allowed_customers = _allowed_customers_for_user()
    if (
        allowed_customers is not None
        and offer.customer
        and offer.customer not in set(allowed_customers)
    ):
        frappe.throw("Not permitted")

    return dashboard_detail_builder.build_offer_detail_payload(
        offer,
        get_lead_link_preview_fn=_get_lead_link_preview,
        get_policy_link_preview_fn=_get_policy_link_preview,
        offer_detail_activity_events_fn=_offer_detail_activity_events,
        access_log_events_fn=_access_log_events,
        sort_activity_events_fn=_sort_activity_events,
        get_notification_draft_preview_rows_fn=_get_notification_draft_preview_rows,
        get_notification_outbox_preview_rows_fn=_get_notification_outbox_preview_rows,
        get_payment_detail_preview_rows_fn=_get_payment_detail_preview_rows,
        get_renewal_detail_preview_rows_fn=_get_renewal_detail_preview_rows,
    )


@frappe.whitelist()
def update_customer_profile(name: str, values=None) -> dict:
    _assert_dashboard_endpoint_method("update_customer_profile")
    user = frappe.session.user
    if user == "Guest":
        frappe.throw("Authentication required")

    customer_name = str(name or "").strip()
    if not customer_name:
        frappe.throw("Customer is required")

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
        if fieldname in {"full_name", "occupation", "email"}:
            updates[fieldname] = str(value or "").strip() or None
        elif fieldname == "address":
            updates[fieldname] = str(value or "").strip() or None
        elif fieldname == "birth_date":
            updates[fieldname] = str(value).strip() if value else None
        elif fieldname == "gender":
            normalized = str(value or "").strip()
            if normalized not in CUSTOMER_GENDER_OPTIONS:
                frappe.throw("Invalid gender value")
            updates[fieldname] = normalized or "Unknown"
        elif fieldname == "marital_status":
            normalized = str(value or "").strip()
            if normalized not in CUSTOMER_MARITAL_OPTIONS:
                frappe.throw("Invalid marital status value")
            updates[fieldname] = normalized or "Unknown"
        elif fieldname == "consent_status":
            normalized = str(value or "").strip()
            if normalized not in CUSTOMER_CONSENT_OPTIONS:
                frappe.throw("Invalid consent status value")
            updates[fieldname] = normalized or "Unknown"

    if "full_name" in updates and not updates.get("full_name"):
        frappe.throw("Full Name is required")

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
        "email": doc.email,
        "address": doc.address,
        "consent_status": doc.consent_status,
        "modified": doc.modified,
    }


CUSTOMER_WORKBENCH_DERIVED_SORTS = dashboard_constants.CUSTOMER_WORKBENCH_DERIVED_SORTS

LEAD_WORKBENCH_DERIVED_SORTS = dashboard_constants.LEAD_WORKBENCH_DERIVED_SORTS

LEAD_WORKBENCH_STALE_STATES = dashboard_constants.LEAD_WORKBENCH_STALE_STATES


def _safe_customer_workbench_order_by(order_by) -> str:
    return dashboard_lead_logic_helpers._safe_customer_workbench_order_by(order_by)


def _safe_lead_workbench_order_by(order_by) -> str:
    return dashboard_lead_logic_helpers._safe_lead_workbench_order_by(order_by)


def _sort_customer_workbench_rows(rows: list[dict], sort_value: str) -> None:
    return dashboard_lead_logic_helpers._sort_customer_workbench_rows(rows, sort_value)


def _customer_sort_metric(row: dict, field: str):
    return dashboard_lead_logic_helpers._customer_sort_metric(row, field)


def _sort_lead_workbench_rows(rows: list[dict], sort_value: str) -> None:
    return dashboard_lead_logic_helpers._sort_lead_workbench_rows(rows, sort_value)


def _lead_sort_metric(row: dict, field: str):
    return dashboard_lead_logic_helpers._lead_sort_metric(row, field)


def _as_bool(value) -> bool:
    return dashboard_lead_logic_helpers._as_bool(value)


def _is_number(value) -> bool:
    return dashboard_lead_logic_helpers._is_number(value)


def _customer_names_by_portfolio_filters(
    *,
    allowed_customers: list[str] | None,
    has_active_policy: bool,
    has_open_offer: bool,
) -> list[str]:
    return dashboard_lead_logic_helpers._customer_names_by_portfolio_filters(
        allowed_customers=allowed_customers,
        has_active_policy=has_active_policy,
        has_open_offer=has_open_offer,
    )


def _lead_detail_activity_events(lead) -> list[dict]:
    return dashboard_lead_logic_helpers._lead_detail_activity_events(lead)


def _offer_detail_activity_events(offer) -> list[dict]:
    return dashboard_lead_logic_helpers._offer_detail_activity_events(offer)


def _access_log_events(reference_doctype: str, reference_name: str) -> list[dict]:
    return dashboard_lead_logic_helpers._access_log_events(
        reference_doctype, reference_name
    )


def _sort_activity_events(events: list[dict]) -> list[dict]:
    return dashboard_lead_logic_helpers._sort_activity_events(events)


def _customer_portfolio_summary_for_names(customer_names: list[str]) -> dict[str, dict]:
    return dashboard_metrics_helpers._customer_portfolio_summary_for_names(customer_names)


def _lead_can_convert_to_offer(row: dict | None) -> bool:
    return dashboard_lead_logic_helpers._lead_can_convert_to_offer(row)


def _lead_conversion_state(row: dict | None) -> str:
    return dashboard_lead_logic_helpers._lead_conversion_state(row)


def _lead_conversion_missing_fieldnames(row: dict | None) -> list[str]:
    return dashboard_lead_logic_helpers._lead_conversion_missing_fieldnames(row)


def _lead_next_conversion_action(row: dict | None) -> str:
    return dashboard_lead_logic_helpers._lead_next_conversion_action(row)


def _lead_stale_state(modified_value) -> str:
    return dashboard_lead_logic_helpers._lead_stale_state(modified_value)


def _monthly_commission_trend(
    months: int,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> list[dict]:
    return dashboard_metrics_helpers._monthly_commission_trend(
        months=months,
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )


def _dashboard_cards_summary(
    *,
    from_date: str | None,
    to_date: str | None,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> dict:
    return dashboard_metrics_helpers._dashboard_cards_summary(
        from_date=from_date,
        to_date=to_date,
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
        build_policy_where_fn=_build_policy_where,
        build_payment_filters_fn=_build_payment_filters,
        build_claim_filters_fn=_build_claim_filters,
        get_scoped_policy_names_fn=_get_scoped_policy_names,
        get_request_cache_bucket_fn=_get_request_cache_bucket,
    )


def _build_offer_where(
    *,
    from_date: str | None,
    to_date: str | None,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> tuple[str, dict]:
    return dashboard_workbench_helpers._build_offer_where(
        from_date=from_date,
        to_date=to_date,
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )


def _build_offer_filters(
    *,
    from_date: str | None,
    to_date: str | None,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> list:
    return dashboard_workbench_helpers._build_offer_filters(
        from_date=from_date,
        to_date=to_date,
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )


def _build_policy_filters(
    *,
    from_date: str | None,
    to_date: str | None,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> list:
    return dashboard_workbench_helpers._build_policy_filters(
        from_date=from_date,
        to_date=to_date,
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )


def _build_lead_filters(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> list:
    return dashboard_workbench_helpers._build_lead_filters(
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )


def _build_payment_filters(
    *,
    from_date: str | None,
    to_date: str | None,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> list:
    return dashboard_workbench_helpers._build_payment_filters(
        from_date=from_date,
        to_date=to_date,
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )


def _build_claim_filters(
    *,
    from_date: str | None,
    to_date: str | None,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
    open_only: bool = False,
) -> list:
    return dashboard_workbench_helpers._build_claim_filters(
        from_date=from_date,
        to_date=to_date,
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
        open_only=open_only,
    )


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
    return dashboard_workbench_helpers._get_offer_preview_rows(
        where_clause=where_clause,
        values=values,
        from_date=from_date,
        to_date=to_date,
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
        limit=limit,
        ready_only=ready_only,
    )


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
    return dashboard_workbench_helpers._get_policy_preview_rows(
        where_clause=where_clause,
        values=values,
        from_date=from_date,
        to_date=to_date,
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
        limit=limit,
    )


def _get_top_companies_rows(
    *, where_clause: str, values: dict, limit: int = 5
) -> list[dict]:
    return dashboard_workbench_helpers._get_top_companies_rows(
        where_clause=where_clause,
        values=values,
        limit=limit,
    )


def _get_lead_preview_rows(
    *,
    lead_where: str | None = None,
    values: dict | None = None,
    branch: str | None = None,
    office_branch: str | None = None,
    allowed_customers: list[str] | None = None,
    limit: int,
) -> list[dict]:
    return dashboard_workbench_helpers._get_lead_preview_rows(
        lead_where=lead_where,
        values=values,
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
        limit=limit,
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
    order_by: str = "modified desc",
) -> list[dict]:
    return dashboard_workbench_helpers._get_payment_preview_rows(
        where_clause=where_clause,
        values=values,
        from_date=from_date,
        to_date=to_date,
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
        limit=limit,
        order_by=order_by,
    )


def _get_renewal_task_preview_rows(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
    statuses: list[str] | None = None,
    limit: int = 8,
) -> list[dict]:
    return dashboard_workbench_helpers._get_renewal_task_preview_rows(
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
        statuses=statuses,
        limit=limit,
    )


def _get_offer_waiting_renewal_summary(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
    limit: int = 20,
) -> dict:
    return dashboard_workbench_helpers._get_offer_waiting_renewal_summary(
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
        limit=limit,
    )


def _renewal_status_and_buckets(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> dict:
    return dashboard_workbench_helpers._renewal_status_and_buckets(
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )


def _reconciliation_open_summary(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> dict:
    return dashboard_reconciliation_helpers._reconciliation_open_summary(
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )


def _reconciliation_filter_conditions(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
) -> tuple[list[str], dict]:
    return dashboard_reconciliation_helpers._reconciliation_filter_conditions(
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
    )


def _get_reconciliation_open_rows_preview(
    *,
    branch: str | None,
    office_branch: str | None,
    allowed_customers: list[str] | None,
    limit: int = 8,
) -> list[dict]:
    return dashboard_reconciliation_helpers._get_reconciliation_open_rows_preview(
        branch=branch,
        office_branch=office_branch,
        allowed_customers=allowed_customers,
        limit=limit,
    )


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
