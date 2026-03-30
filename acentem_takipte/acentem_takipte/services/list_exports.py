from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Callable

import frappe
from frappe.utils import cint, flt, format_datetime, formatdate

from acentem_takipte.acentem_takipte.api import dashboard as dashboard_api
from acentem_takipte.acentem_takipte.services.export_payload_utils import (
    coerce_columns,
    coerce_filters,
    coerce_rows,
    coerce_locale,
    coerce_or_filters,
    coerce_query_payload,
    normalize_export_key,
    normalize_title,
)
from acentem_takipte.acentem_takipte.services.reports_runtime import build_tabular_download_response
from acentem_takipte.acentem_takipte.utils.i18n import translate_text


def _t(en: str) -> str:
    return en


def _column(
    field: str,
    label: dict[str, str] | str,
    *,
    formatter: str | None = None,
    currency_field: str | None = None,
    getter: Callable[[dict[str, Any]], Any] | None = None,
) -> dict[str, Any]:
    return {
        "field": field,
        "label": label,
        "formatter": formatter,
        "currency_field": currency_field,
        "getter": getter,
    }


SCREEN_EXPORTS: dict[str, dict[str, Any]] = {
    "lead_list": {
        "permission_doctype": "AT Lead",
        "export_key": "lead_list",
        "title": _t("Lead List"),
        "type": "custom",
        "fetcher": "_fetch_lead_rows",
        "columns": [
            _column("display_name", _t("Lead"), getter=lambda row: _lead_display_name(row)),
            _column("name", _t("Record")),
            _column("email", _t("Email")),
            _column("customer", _t("Customer")),
            _column("sales_entity", _t("Sales Entity")),
            _column("insurance_company", _t("Insurance Company")),
            _column("branch", _t("Branch")),
            _column("status", _t("Status")),
            _column("stale_state", _t("Follow-up State")),
            _column("conversion_state", _t("Conversion")),
            _column("can_convert_to_offer", _t("Can Convert"), formatter="boolean"),
            _column("estimated_gross_premium", _t("Estimated Gross Premium"), formatter="currency"),
            _column("converted_offer", _t("Converted Offer")),
            _column("converted_policy", _t("Converted Policy")),
            _column(
                "conversion_missing_fields",
                _t("Missing Fields"),
                getter=lambda row: ", ".join(row.get("conversion_missing_fields") or []),
            ),
            _column("modified", _t("Modified"), formatter="datetime"),
        ],
    },
    "customer_list": {
        "permission_doctype": "AT Customer",
        "export_key": "customer_list",
        "title": _t("Customer List"),
        "type": "custom",
        "fetcher": "_fetch_customer_rows",
        "columns": [
            _column("full_name", _t("Customer"), getter=lambda row: row.get("full_name") or row.get("name")),
            _column("name", _t("Record")),
            _column("tax_id", _t("Tax ID")),
            _column("phone", _t("Phone")),
            _column("email", _t("Email")),
            _column("consent_status", _t("Consent Status")),
            _column("assigned_agent", _t("Assigned Agent")),
            _column("birth_date", _t("Birth Date"), formatter="date"),
            _column("gender", _t("Gender")),
            _column("marital_status", _t("Marital Status")),
            _column("occupation", _t("Occupation")),
            _column("active_policy_count", _t("Active Policies")),
            _column("open_offer_count", _t("Open Offers")),
            _column("active_policy_gross_premium", _t("Active Gross Premium"), formatter="currency"),
            _column("modified", _t("Modified"), formatter="datetime"),
        ],
    },
    "policy_list": {
        "permission_doctype": "AT Policy",
        "export_key": "policy_list_workbench",
        "title": _t("Policy List"),
        "type": "doctype",
        "doctype": "AT Policy",
        "fields": [
            "name",
            "policy_no",
            "customer",
            "insurance_company",
            "status",
            "currency",
            "end_date",
            "gross_premium",
            "commission_amount",
            "commission",
            "gwp_try",
            "modified",
        ],
        "columns": [
            _column("name", _t("Record Number")),
            _column("policy_no", _t("Carrier Policy Number")),
            _column("customer", _t("Customer")),
            _column("insurance_company", _t("Insurance Company")),
            _column("status", _t("Status")),
            _column("end_date", _t("End Date"), formatter="date"),
            _column("gross_premium", _t("Gross Premium"), formatter="currency", currency_field="currency"),
            _column(
                "commission_display",
                _t("Commission"),
                formatter="currency",
                currency_field="currency",
                getter=lambda row: row.get("commission_amount") if row.get("commission_amount") not in (None, "") else row.get("commission"),
            ),
            _column("gwp_try", _t("GWP TRY"), formatter="currency", getter=lambda row: row.get("gwp_try"), currency_field=None),
            _column("modified", _t("Modified"), formatter="datetime"),
        ],
    },
    "offer_list": {
        "permission_doctype": "AT Offer",
        "export_key": "offer_list",
        "title": _t("Offer List"),
        "type": "doctype",
        "doctype": "AT Offer",
        "fields": [
            "name",
            "customer",
            "insurance_company",
            "status",
            "currency",
            "offer_date",
            "valid_until",
            "net_premium",
            "tax_amount",
            "commission_amount",
            "gross_premium",
            "converted_policy",
            "modified",
        ],
        "columns": [
            _column("name", _t("Offer")),
            _column("customer", _t("Customer")),
            _column("insurance_company", _t("Insurance Company")),
            _column("status", _t("Status")),
            _column("offer_date", _t("Offer Date"), formatter="date"),
            _column("valid_until", _t("Valid Until"), formatter="date"),
            _column("gross_premium", _t("Gross Premium"), formatter="currency", currency_field="currency"),
            _column("net_premium", _t("Net Premium"), formatter="currency", currency_field="currency"),
            _column("commission_amount", _t("Commission"), formatter="currency", currency_field="currency"),
            _column("converted_policy", _t("Converted Policy")),
            _column("modified", _t("Modified"), formatter="datetime"),
        ],
    },
}


def get_screen_export_definition(screen: str) -> dict[str, Any]:
    key = str(screen or "").strip()
    definition = SCREEN_EXPORTS.get(key)
    if not definition:
        frappe.throw("Unsupported export screen")
    return definition


def build_screen_export_payload(screen: str, query: dict | str | None = None, limit: int = 1000) -> dict[str, Any]:
    definition = get_screen_export_definition(screen)
    normalized_query = _coerce_query_payload(query)
    normalized_limit = max(min(cint(limit), 5000), 1)
    locale = _active_locale()

    if definition["type"] == "custom":
        fetcher = globals()[definition["fetcher"]]
        raw_rows = fetcher(normalized_query, normalized_limit)
    else:
        raw_rows = _fetch_doctype_rows(definition, normalized_query, normalized_limit)

    column_labels = [_localize(defn["label"], locale) for defn in definition["columns"]]
    rows = [_format_export_row(row, definition["columns"], locale) for row in raw_rows]

    return {
        "screen": screen,
        "export_key": definition["export_key"],
        "title": definition["title"],
        "columns": column_labels,
        "rows": rows,
        "filters": normalized_query,
    }


def build_screen_export_response(
    screen: str,
    *,
    query: dict | str | None = None,
    export_format: str = "xlsx",
    limit: int = 1000,
) -> dict[str, Any]:
    payload = build_screen_export_payload(screen, query=query, limit=limit)
    return build_tabular_download_response(
        export_key=payload["export_key"],
        title=payload["title"],
        columns=payload["columns"],
        rows=payload["rows"],
        filters=payload["filters"],
        export_format=export_format,
    )


def build_tabular_payload_export_response(
    query: dict | str | None = None,
    *,
    export_format: str = "xlsx",
) -> dict[str, Any]:
    payload = _coerce_query_payload(query)
    export_key = normalize_export_key(payload.get("export_key"), "workbench")
    title = _normalize_title(payload.get("title"), export_key)
    raw_rows = _coerce_rows(payload.get("rows"))
    columns = _normalize_columns(payload.get("columns"))
    if not columns:
        columns = _infer_columns_from_rows(raw_rows)

    rows: list[dict[str, Any]] = []
    for raw_row in raw_rows:
        if not isinstance(raw_row, dict):
            continue
        row: dict[str, Any] = {}
        for column in columns:
            row[column] = _normalize_payload_value(raw_row.get(column))
        rows.append(row)

    return build_tabular_download_response(
        export_key=export_key,
        title=title,
        columns=columns,
        rows=rows,
        filters=_coerce_filters(payload.get("filters")),
        export_format=export_format,
    )


def _fetch_lead_rows(query: dict[str, Any], limit: int) -> list[dict[str, Any]]:
    return _collect_dashboard_rows(
        dashboard_api.get_lead_workbench_rows,
        filters=(query or {}).get("filters") or {},
        limit=limit,
    )


def _fetch_customer_rows(query: dict[str, Any], limit: int) -> list[dict[str, Any]]:
    return _collect_dashboard_rows(
        dashboard_api.get_customer_workbench_rows,
        filters=(query or {}).get("filters") or {},
        limit=limit,
    )


def _collect_dashboard_rows(fetcher: Callable[..., dict[str, Any]], *, filters: dict[str, Any], limit: int) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    page = 1
    page_length = min(limit, 100)
    total = None

    while len(rows) < limit:
        payload = fetcher(filters=filters, page=page, page_length=min(page_length, limit - len(rows))) or {}
        if not isinstance(payload, dict):
            break
        batch = [row for row in list(payload.get("rows") or []) if isinstance(row, dict)]
        rows.extend(batch)
        if total is None:
            total = cint(payload.get("total") or 0)
        if not batch or len(rows) >= limit or (total and len(rows) >= total):
            break
        page += 1

    return rows[:limit]


def _fetch_doctype_rows(definition: dict[str, Any], query: dict[str, Any], limit: int) -> list[dict[str, Any]]:
    filters = _coerce_filters((query or {}).get("filters"))
    or_filters = _coerce_or_filters((query or {}).get("or_filters"))
    order_by = str((query or {}).get("order_by") or "modified desc").strip() or "modified desc"
    return frappe.get_list(
        definition["doctype"],
        fields=list(definition["fields"]),
        filters=filters,
        or_filters=or_filters,
        order_by=order_by,
        limit_start=0,
        limit_page_length=limit,
    )


def _format_export_row(row: dict[str, Any], columns: list[dict[str, Any]], locale: str) -> dict[str, Any]:
    formatted: dict[str, Any] = {}
    for column in columns:
        label = _localize(column["label"], locale)
        value = column["getter"](row) if callable(column.get("getter")) else row.get(column["field"])
        formatted[label] = _format_value(
            value,
            formatter=column.get("formatter"),
            locale=locale,
            currency=row.get(column.get("currency_field")) if column.get("currency_field") else None,
        )
    return formatted


def _format_value(value: Any, *, formatter: str | None, locale: str, currency: str | None = None) -> Any:
    if value in (None, ""):
        return ""
    if formatter == "datetime":
        try:
            return format_datetime(value)
        except Exception:
            return str(value)
    if formatter == "date":
        try:
            return formatdate(value)
        except Exception:
            return str(value)
    if formatter == "currency":
        amount = flt(value)
        code = str(currency or "TRY").strip() or "TRY"
        return f"{amount:,.2f} {code}"
    if formatter == "boolean":
        normalized_value = str(value).strip().lower()
        is_true = value is True or normalized_value in {"1", "true", "yes", "on", "evet"}
        return translate_text("Yes", locale) if is_true else translate_text("No", locale)
    if isinstance(value, (list, tuple, set)):
        return ", ".join(str(item) for item in value if item not in (None, ""))
    if isinstance(value, (datetime, date)):
        return format_datetime(value) if isinstance(value, datetime) else formatdate(value)
    if isinstance(value, Decimal):
        return float(value)
    return value


def _normalize_payload_value(value: Any) -> Any:
    if value in (None, ""):
        return ""
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return format_datetime(value) if isinstance(value, datetime) else formatdate(value)
    if isinstance(value, (list, tuple, set)):
        return ", ".join(str(item) for item in value if item not in (None, ""))
    if isinstance(value, dict):
        try:
            return frappe.as_json(value, indent=None)
        except Exception:
            return str(value)
    return str(value)


def _lead_display_name(row: dict[str, Any]) -> str:
    first_name = str(row.get("first_name") or "").strip()
    last_name = str(row.get("last_name") or "").strip()
    return f"{first_name} {last_name}".strip() or str(row.get("name") or "")


def _localize(value: dict[str, str] | str, locale: str) -> str:
    if isinstance(value, dict):
        base_locale = str(locale or "tr").split("-")[0]
        return value.get(locale) or value.get(base_locale) or value.get("en") or next(iter(value.values()))
    return translate_text(str(value or ""), locale)


def _active_locale() -> str:
    return coerce_locale(getattr(frappe.local, "lang", "tr"), "tr")


def _normalize_columns(columns: Any) -> list[str]:
    return coerce_columns(columns)


def _infer_columns_from_rows(rows: list[dict[str, Any]]) -> list[str]:
    inferred: list[str] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        for key in row.keys():
            column = str(key or "").strip()
            if column and column not in inferred:
                inferred.append(column)
    return inferred


def _coerce_rows(rows: Any) -> list[dict[str, Any]]:
    return coerce_rows(rows)


def _coerce_filters(filters: Any) -> dict[str, Any]:
    return coerce_filters(filters)


def _coerce_or_filters(or_filters: Any) -> Any:
    return coerce_or_filters(or_filters)


def _normalize_title(title: Any, export_key: str) -> Any:
    if isinstance(title, dict):
        return title
    return normalize_title(title, export_key)


def _coerce_query_payload(query: dict | str | None) -> dict[str, Any]:
    return coerce_query_payload(query)
