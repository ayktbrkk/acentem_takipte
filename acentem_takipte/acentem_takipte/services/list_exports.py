from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Callable

import frappe
from frappe import _
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


def _renewal_days_until_due(value: Any) -> int | None:
    if not value:
        return None
    try:
        target = frappe.utils.getdate(value)
        today = frappe.utils.getdate()
        return (target - today).days
    except Exception:
        return None


def _renewal_priority_label(row: dict[str, Any]) -> str:
    status = str(row.get("status") or "").strip()
    days = _renewal_days_until_due(row.get("due_date") or row.get("renewal_date"))
    if status == "Cancelled":
        return _t("Cancelled")
    if status == "Done":
        return _t("Completed")
    if days is None:
        return _t("Unknown")
    if days <= 7:
        return _t("Critical")
    if days <= 30:
        return _t("Upcoming")
    return _t("Scheduled")


def _payment_amount(row: dict[str, Any]) -> float:
    return flt(row.get("amount_try") or row.get("amount") or 0)


def _policy_customer_details(row: dict[str, Any]) -> str:
    customer_type = str(row.get("customer_customer_type") or "").strip()
    tax_id = str(row.get("customer_masked_tax_id") or "").strip()
    parts = [part for part in (customer_type, tax_id) if part]
    return " | ".join(parts)


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
            _column("customer_type", _t("Customer Type")),
            _column("tax_id", _t("Tax ID")),
            _column("phone", _t("Phone")),
            _column("email", _t("Email")),
            _column("marital_status", _t("Marital Status")),
            _column("gender", _t("Gender")),
            _column("birth_date", _t("Birth Date"), formatter="date"),
            _column("occupation", _t("Occupation")),
            _column("assigned_agent", _t("Assigned Agent")),
            _column("consent_status", _t("Consent Status")),
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
            "customer.full_name as customer_full_name",
            "customer.customer_type as customer_customer_type",
            "customer.masked_tax_id as customer_masked_tax_id",
            "insurance_company",
            "branch",
            "status",
            "currency",
            "issue_date",
            "end_date",
            "gross_premium",
            "commission_amount",
        ],
        "columns": [
            _column("name", _t("Record Number")),
            _column("policy_no", _t("Policy No")),
            _column(
                "customer_full_name",
                _t("Customer"),
                getter=lambda row: row.get("customer_full_name") or row.get("customer"),
            ),
            _column("customer_details", _t("Customer Details"), getter=_policy_customer_details),
            _column("branch", _t("Branch")),
            _column("insurance_company", _t("Insurance Company")),
            _column("end_date", _t("End Date"), formatter="date"),
            _column("issue_date", _t("Issue Date"), formatter="date"),
            _column("gross_premium", _t("Gross Premium"), formatter="currency", currency_field="currency"),
            _column(
                "commission_amount",
                _t("Commission"),
                formatter="currency",
                currency_field="currency",
            ),
            _column("status", _t("Policy Status")),
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
            "customer.full_name as customer_full_name",
            "customer.customer_type as customer_customer_type",
            "customer.masked_tax_id as customer_masked_tax_id",
            "insurance_company",
            "branch",
            "status",
            "currency",
            "offer_date",
            "valid_until",
            "gross_premium",
            "commission_amount",
        ],
        "columns": [
            _column("name", _t("Offer")),
            _column("insurance_company", _t("Insurance Company")),
            _column(
                "customer_full_name",
                _t("Customer"),
                getter=lambda row: row.get("customer_full_name") or row.get("customer"),
            ),
            _column("customer_details", _t("Customer Details"), getter=_policy_customer_details),
            _column("valid_until", _t("Valid Until"), formatter="date"),
            _column("offer_date", _t("Offer Date"), formatter="date"),
            _column("gross_premium", _t("Gross Premium"), formatter="currency", currency_field="currency"),
            _column(
                "commission_amount",
                _t("Commission"),
                formatter="currency",
                currency_field="currency",
            ),
            _column("status", _t("Offer Status")),
        ],
    },
}

SCREEN_ALIASES: dict[str, str] = {
    "dashboard": "policy_list",
}

SCREEN_FILTER_FIELDS: dict[str, dict[str, str | None]] = {
    "claims_board": {"status_field": "claim_status", "date_field": "incident_date"},
    "payments_board": {"status_field": "status", "date_field": "due_date"},
    "renewals_board": {"status_field": "status", "date_field": "due_date"},
    "policy_list": {"status_field": "status", "date_field": "end_date"},
    "offer_list": {"status_field": "status", "date_field": "offer_date"},
    "customer_list": {"status_field": "consent_status", "date_field": "modified"},
    "lead_list": {"status_field": "status", "date_field": "modified"},
}

SCREEN_EXPORTS.update(
    {
        "claims_board": {
            "permission_doctype": "AT Claim",
            "export_key": "claims_board",
            "title": _t("Claims Board"),
            "type": "doctype",
            "doctype": "AT Claim",
            "fields": [
                "name",
                "claim_no",
                "policy",
                "policy.policy_no as policy_no",
                "customer",
                "customer.full_name as customer_full_name",
                "claim_status",
                "claim_type",
                "policy.branch as branch",
                "incident_date",
                "estimated_amount",
                "paid_amount",
                "currency",
            ],
            "columns": [
                _column("claim_no", _t("Claim No")),
                _column("policy_no", _t("Policy No")),
                _column(
                    "customer_full_name",
                    _t("Customer"),
                    getter=lambda row: row.get("customer_full_name") or row.get("customer"),
                ),
                _column("claim_type", _t("Claim Type")),
                _column("branch", _t("Branch")),
                _column(
                    "estimated_amount",
                    _t("Estimated Amount"),
                    formatter="currency",
                    currency_field="currency",
                ),
                _column("paid_amount", _t("Paid Amount"), formatter="currency", currency_field="currency"),
                _column("incident_date", _t("Incident Date"), formatter="date"),
                _column("claim_status", _t("Claim Status")),
            ],
        },
        "payments_board": {
            "permission_doctype": "AT Payment",
            "export_key": "payments_board",
            "title": _t("Payments Board"),
            "type": "doctype",
            "doctype": "AT Payment",
            "fields": [
                "name",
                "payment_no",
                "policy",
                "policy.policy_no as policy_no",
                "customer",
                "customer.full_name as customer_full_name",
                "customer.customer_type as customer_customer_type",
                "customer.masked_tax_id as customer_masked_tax_id",
                "status",
                "due_date",
                "amount",
                "amount_try",
                "currency",
            ],
            "columns": [
                _column("payment_no", _t("Payment No")),
                _column("policy_no", _t("Policy No")),
                _column(
                    "customer_full_name",
                    _t("Customer"),
                    getter=lambda row: row.get("customer_full_name") or row.get("customer"),
                ),
                _column("customer_details", _t("Customer Details"), getter=_policy_customer_details),
                _column("due_date", _t("Due Date"), formatter="date"),
                _column("status", _t("Payment Status")),
                _column(
                    "amount",
                    _t("Amount"),
                    formatter="currency",
                    currency_field="currency",
                    getter=_payment_amount,
                ),
            ],
        },
        "renewals_board": {
            "permission_doctype": "AT Renewal Task",
            "export_key": "renewals_board",
            "title": _t("Renewals Board"),
            "type": "doctype",
            "doctype": "AT Renewal Task",
            "fields": [
                "name",
                "policy",
                "policy.policy_no as policy_policy_no",
                "customer",
                "customer.full_name as customer_full_name",
                "due_date",
                "renewal_date",
                "status",
            ],
            "columns": [
                _column(
                    "policy_policy_no",
                    _t("Policy No"),
                    getter=lambda row: row.get("policy_policy_no") or row.get("policy"),
                ),
                _column(
                    "customer_full_name",
                    _t("Customer"),
                    getter=lambda row: row.get("customer_full_name") or row.get("customer"),
                ),
                _column("due_date", _t("Due Date"), formatter="date"),
                _column("status", _t("Status")),
                _column("priority", _t("Priority"), getter=_renewal_priority_label),
            ],
        },
    }
)


def build_workbench_export_query(
    screen: str,
    *,
    start_date: str = "",
    end_date: str = "",
    status: str = "",
) -> dict[str, Any]:
    resolved_screen = SCREEN_ALIASES.get(str(screen or "").strip(), str(screen or "").strip())
    field_map = SCREEN_FILTER_FIELDS.get(
        resolved_screen,
        {"status_field": "status", "date_field": "modified"},
    )
    filters: dict[str, Any] = {}
    safe_status = str(status or "").strip()
    status_field = field_map.get("status_field")
    if safe_status and status_field:
        filters[str(status_field)] = safe_status

    safe_start = str(start_date or "").strip()
    safe_end = str(end_date or "").strip()
    date_field = str(field_map.get("date_field") or "modified")
    if safe_start and safe_end:
        if date_field == "modified":
            filters[date_field] = ["between", [f"{safe_start} 00:00:00", f"{safe_end} 23:59:59"]]
        else:
            filters[date_field] = ["between", [safe_start, safe_end]]
    elif safe_start:
        filters[date_field] = [">=", f"{safe_start} 00:00:00" if date_field == "modified" else safe_start]
    elif safe_end:
        filters[date_field] = ["<=", f"{safe_end} 23:59:59" if date_field == "modified" else safe_end]

    return {"filters": filters, "order_by": "modified desc"}


def get_screen_export_definition(screen: str) -> dict[str, Any]:
    key = str(screen or "").strip()
    key = SCREEN_ALIASES.get(key, key)
    definition = SCREEN_EXPORTS.get(key)
    if not definition:
        frappe.throw(_("Unsupported export screen"))
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
        "title": translate_text(definition["title"], locale),
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
        resolved = value.get(locale) or value.get(base_locale) or value.get("en") or next(iter(value.values()))
        return translate_text(str(resolved or ""), locale)
    return translate_text(str(value or ""), locale)


def _active_locale() -> str:
    return coerce_locale(getattr(frappe.local, "lang", "en"), "en")


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
