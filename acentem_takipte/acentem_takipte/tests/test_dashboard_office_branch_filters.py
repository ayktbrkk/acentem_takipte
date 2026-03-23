from __future__ import annotations

from acentem_takipte.api import dashboard


def test_customer_workbench_rows_apply_office_branch_filter(monkeypatch):
    captured = {}

    monkeypatch.setattr(dashboard.frappe.session, "user", "manager@example.com")
    monkeypatch.setattr(
        dashboard,
        "normalize_requested_office_branch",
        lambda office_branch=None, user=None: "BR-DEFAULT",
    )
    monkeypatch.setattr(dashboard.dashboard_filters, "normalize_customer_workbench_payload", lambda payload: payload)
    monkeypatch.setattr(
        dashboard.dashboard_filters,
        "parse_customer_workbench_filters",
        lambda payload, as_bool: {
            "query_filters": {},
            "or_filters": [],
            "has_active_policy": False,
            "has_open_offer": False,
            "requested_sort": "modified desc",
        },
    )
    monkeypatch.setattr(dashboard, "_allowed_customers_for_user", lambda include_meta=False: None)
    monkeypatch.setattr(dashboard, "_safe_customer_workbench_order_by", lambda value: "modified desc")
    monkeypatch.setattr(
        dashboard.dashboard_customer_queries,
        "build_customer_workbench_base_kwargs",
        lambda query_filters, or_filters, order_by: captured.setdefault("query_filters", dict(query_filters)) or {"filters": query_filters},
    )
    monkeypatch.setattr(
        dashboard.dashboard_customer_queries,
        "fetch_customer_workbench_rows",
        lambda base_kwargs, limit_start, limit_page_length: [],
    )
    monkeypatch.setattr(
        dashboard.dashboard_customer_queries,
        "count_customer_workbench_rows",
        lambda query_filters, or_filters: 0,
    )
    monkeypatch.setattr(dashboard, "_customer_portfolio_summary_for_names", lambda names: {})
    monkeypatch.setattr(dashboard.dashboard_serializers, "attach_customer_portfolio_summary", lambda rows, summary_map: None)
    monkeypatch.setattr(dashboard, "has_sensitive_access", lambda: True)

    dashboard.get_customer_workbench_rows(filters={"office_branch": "BR-1"})

    assert captured["query_filters"]["office_branch"] == "BR-DEFAULT"


def test_lead_workbench_rows_apply_office_branch_filter(monkeypatch):
    captured = {}

    monkeypatch.setattr(dashboard.frappe.session, "user", "manager@example.com")
    monkeypatch.setattr(
        dashboard,
        "normalize_requested_office_branch",
        lambda office_branch=None, user=None: "BR-DEFAULT",
    )
    monkeypatch.setattr(dashboard.dashboard_filters, "normalize_customer_workbench_payload", lambda payload: payload)
    monkeypatch.setattr(
        dashboard.dashboard_filters,
        "parse_lead_workbench_filters",
        lambda payload, as_bool, is_number, flt_fn: {
            "query_filters": {},
            "or_filters": [],
            "stale_state": "",
            "can_convert_only": False,
            "requested_sort": "modified desc",
        },
    )
    monkeypatch.setattr(dashboard, "_allowed_customers_for_user", lambda include_meta=False: None)
    monkeypatch.setattr(dashboard, "_safe_lead_workbench_order_by", lambda value: "modified desc")
    monkeypatch.setattr(
        dashboard.dashboard_lead_queries,
        "build_lead_workbench_base_kwargs",
        lambda query_filters, or_filters, order_by: captured.setdefault("query_filters", dict(query_filters)) or {"filters": query_filters},
    )
    monkeypatch.setattr(
        dashboard.dashboard_lead_queries,
        "fetch_lead_workbench_rows",
        lambda base_kwargs, limit_start, limit_page_length: [],
    )
    monkeypatch.setattr(
        dashboard.dashboard_lead_queries,
        "count_lead_workbench_rows",
        lambda query_filters, or_filters: 0,
    )
    monkeypatch.setattr(
        dashboard.dashboard_serializers,
        "attach_lead_workbench_derived_fields",
        lambda rows, **kwargs: None,
    )

    dashboard.get_lead_workbench_rows(filters={"office_branch": "BR-2"})

    assert captured["query_filters"]["office_branch"] == "BR-DEFAULT"
