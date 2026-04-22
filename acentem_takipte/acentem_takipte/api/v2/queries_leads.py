from __future__ import annotations

import frappe
from frappe.utils import cint

from acentem_takipte.acentem_takipte.api.v2.constants import (
    LEAD_WORKBENCH_BASE_FIELDS,
    LEAD_WORKBENCH_DERIVED_SORT_SEED_FIELDS,
)


def build_lead_workbench_base_kwargs(
    *, query_filters: dict, or_filters, order_by: str
) -> dict:
    kwargs = {
        "doctype": "AT Lead",
        "fields": list(LEAD_WORKBENCH_BASE_FIELDS),
        "filters": query_filters,
        "order_by": order_by,
    }
    if or_filters:
        kwargs["or_filters"] = or_filters
    return kwargs


def build_lead_workbench_derived_sort_seed_kwargs(
    *, query_filters: dict, or_filters
) -> dict:
    kwargs = {
        "doctype": "AT Lead",
        "fields": list(LEAD_WORKBENCH_DERIVED_SORT_SEED_FIELDS),
        "filters": query_filters,
        "order_by": "modified desc",
    }
    if or_filters:
        kwargs["or_filters"] = or_filters
    return kwargs


def fetch_lead_workbench_rows(
    *, base_kwargs: dict, limit_start: int, limit_page_length: int
) -> list[dict]:
    return frappe.get_list(
        **base_kwargs,
        limit_start=limit_start,
        limit_page_length=limit_page_length,
    )


def fetch_all_lead_workbench_rows(*, base_kwargs: dict) -> list[dict]:
    # unbounded: all lead workbench rows for export, filtered by base query filters - expected max ~50k rows
    return frappe.get_list(
        **base_kwargs,
        limit_start=0,
        limit_page_length=0,
    )


def fetch_lead_workbench_rows_by_names(*, lead_names: list[str]) -> list[dict]:
    if not lead_names:
        return []
    return frappe.get_list(
        "AT Lead",
        fields=list(LEAD_WORKBENCH_BASE_FIELDS),
        filters={"name": ["in", lead_names]},
        limit_page_length=max(len(lead_names), 1),
    )


def count_lead_workbench_rows(*, query_filters: dict, or_filters=None) -> int:
    if not or_filters:
        return cint(frappe.db.count("AT Lead", filters=query_filters) or 0)

    count_kwargs = {
        "doctype": "AT Lead",
        "fields": ["count(name) as total"],
        "filters": query_filters,
        "or_filters": or_filters,
        "limit_page_length": 1,
    }
    rows = frappe.get_list(**count_kwargs)
    return cint((rows[0] or {}).get("total") if rows else 0)
