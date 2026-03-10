from __future__ import annotations

from acentem_takipte.acentem_takipte.api.dashboard_v2.constants import (
    CUSTOMER_WORKBENCH_QUERY_TEXT_OR_FILTER_FIELDS,
    LEAD_WORKBENCH_QUERY_TEXT_OR_FILTER_FIELDS,
)


def normalize_customer_workbench_payload(payload) -> dict:
    if not isinstance(payload, dict):
        return {}
    return payload


def normalize_lead_workbench_payload(payload) -> dict:
    if not isinstance(payload, dict):
        return {}
    return payload


def parse_customer_workbench_filters(payload: dict, *, as_bool) -> dict:
    query_filters = {}
    or_filters = []

    consent_status = str(payload.get("consent_status") or "").strip()
    gender = str(payload.get("gender") or "").strip()
    marital_status = str(payload.get("marital_status") or "").strip()
    assigned_agent = str(payload.get("assigned_agent") or "").strip()
    occupation = str(payload.get("occupation") or "").strip()
    query_text = str(payload.get("query") or "").strip()
    has_phone = as_bool(payload.get("has_phone"))
    has_email = as_bool(payload.get("has_email"))
    has_active_policy = as_bool(payload.get("has_active_policy"))
    has_open_offer = as_bool(payload.get("has_open_offer"))

    if consent_status:
        query_filters["consent_status"] = consent_status
    if gender:
        query_filters["gender"] = gender
    if marital_status:
        query_filters["marital_status"] = marital_status
    if assigned_agent:
        query_filters["assigned_agent"] = ["like", f"%{assigned_agent}%"]
    if occupation:
        query_filters["occupation"] = ["like", f"%{occupation}%"]
    if has_phone:
        query_filters["phone"] = ["is", "set"]
    if has_email:
        query_filters["email"] = ["is", "set"]

    if query_text:
        q = f"%{query_text}%"
        or_filters = [["AT Customer", fieldname, "like", q] for fieldname in CUSTOMER_WORKBENCH_QUERY_TEXT_OR_FILTER_FIELDS]

    requested_sort = str(payload.get("sort") or "").strip().lower()

    return {
        "query_filters": query_filters,
        "or_filters": or_filters or None,
        "requested_sort": requested_sort,
        "has_active_policy": has_active_policy,
        "has_open_offer": has_open_offer,
    }


def parse_lead_workbench_filters(payload: dict, *, as_bool, is_number, flt_fn) -> dict:
    query_filters = {}
    or_filters = None

    status = str(payload.get("status") or "").strip()
    branch = str(payload.get("branch") or "").strip()
    sales_entity = str(payload.get("sales_entity") or "").strip()
    insurance_company = str(payload.get("insurance_company") or "").strip()
    conversion_state = str(payload.get("conversion_state") or "").strip()
    stale_state = str(payload.get("stale_state") or "").strip()
    query_text = str(payload.get("query") or "").strip()
    has_customer = as_bool(payload.get("has_customer"))
    can_convert_only = as_bool(payload.get("can_convert_to_offer"))

    if status:
        query_filters["status"] = status
    if branch:
        query_filters["branch"] = ["like", f"%{branch}%"]
    if sales_entity:
        query_filters["sales_entity"] = ["like", f"%{sales_entity}%"]
    if insurance_company:
        query_filters["insurance_company"] = ["like", f"%{insurance_company}%"]
    if has_customer:
        query_filters["customer"] = ["is", "set"]

    min_est = payload.get("estimated_min")
    max_est = payload.get("estimated_max")
    has_min = str(min_est or "").strip() != "" and is_number(min_est)
    has_max = str(max_est or "").strip() != "" and is_number(max_est)
    if has_min and has_max:
        query_filters["estimated_gross_premium"] = ["between", [flt_fn(min_est), flt_fn(max_est)]]
    elif has_min:
        query_filters["estimated_gross_premium"] = [">=", flt_fn(min_est)]
    elif has_max:
        query_filters["estimated_gross_premium"] = ["<=", flt_fn(max_est)]

    if conversion_state == "unconverted":
        query_filters["converted_offer"] = ["is", "not set"]
        query_filters["converted_policy"] = ["is", "not set"]
    elif conversion_state == "offer":
        query_filters["converted_offer"] = ["is", "set"]
    elif conversion_state == "policy":
        query_filters["converted_policy"] = ["is", "set"]
    elif conversion_state == "any_converted":
        or_filters = [
            ["AT Lead", "converted_offer", "is", "set"],
            ["AT Lead", "converted_policy", "is", "set"],
        ]
    elif query_text:
        q = f"%{query_text}%"
        or_filters = [["AT Lead", fieldname, "like", q] for fieldname in LEAD_WORKBENCH_QUERY_TEXT_OR_FILTER_FIELDS]

    requested_sort = str(payload.get("sort") or "").strip().lower()

    return {
        "query_filters": query_filters,
        "or_filters": or_filters,
        "requested_sort": requested_sort,
        "stale_state": stale_state,
        "can_convert_only": can_convert_only,
    }
