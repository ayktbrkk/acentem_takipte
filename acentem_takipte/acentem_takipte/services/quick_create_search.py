from __future__ import annotations

from frappe.utils import cint

import frappe
from frappe import _

from acentem_takipte.acentem_takipte.api.security import (
    assert_authenticated,
    assert_doctype_permission,
)


QUICK_OPTION_SEARCH_SOURCES: dict[str, dict] = {
    "customers": {
        "doctype": "AT Customer",
        "display_fields": ["full_name", "customer_type", "tax_id"],
        "search_fields": ["name", "full_name", "tax_id"],
        "order_by": "modified desc",
    },
    "salesEntities": {
        "doctype": "AT Sales Entity",
        "display_fields": ["full_name", "entity_type"],
        "search_fields": ["name", "full_name", "entity_type"],
        "order_by": "modified desc",
    },
    "insuranceCompanies": {
        "doctype": "AT Insurance Company",
        "display_fields": ["company_name", "company_code", "is_active"],
        "search_fields": ["name", "company_name", "company_code"],
        "order_by": "modified desc",
    },
    "branches": {
        "doctype": "AT Branch",
        "display_fields": ["branch_name", "branch_code", "insurance_company"],
        "search_fields": ["name", "branch_name", "branch_code", "insurance_company"],
        "order_by": "modified desc",
    },
    "offers": {
        "doctype": "AT Offer",
        "display_fields": ["customer", "status", "offer_date"],
        "search_fields": ["name", "customer", "status"],
        "order_by": "modified desc",
    },
    "policies": {
        "doctype": "AT Policy",
        "display_fields": ["policy_no", "customer", "status"],
        "search_fields": ["name", "policy_no", "customer", "status"],
        "order_by": "modified desc",
    },
    "claims": {
        "doctype": "AT Claim",
        "display_fields": ["claim_no", "policy", "claim_status"],
        "search_fields": ["name", "claim_no", "policy", "claim_status"],
        "order_by": "modified desc",
    },
    "notificationTemplates": {
        "doctype": "AT Notification Template",
        "display_fields": ["template_key", "event_key", "channel", "language"],
        "search_fields": ["name", "template_key", "event_key", "channel", "language"],
        "filters": {"is_active": 1},
        "order_by": "modified desc",
    },
    "accountingEntries": {
        "doctype": "AT Accounting Entry",
        "display_fields": ["source_doctype", "source_name", "status", "external_ref"],
        "search_fields": [
            "name",
            "source_doctype",
            "source_name",
            "status",
            "external_ref",
        ],
        "order_by": "modified desc",
    },
    "insuredAssets": {
        "doctype": "AT Insured Asset",
        "display_fields": ["asset_label", "asset_type", "asset_identifier"],
        "search_fields": [
            "name",
            "asset_label",
            "asset_type",
            "asset_identifier",
            "customer",
            "policy",
        ],
        "order_by": "modified desc",
    },
    "segments": {
        "doctype": "AT Segment",
        "display_fields": ["segment_name", "segment_type", "status"],
        "search_fields": [
            "name",
            "segment_name",
            "segment_type",
            "channel_focus",
            "status",
        ],
        "order_by": "modified desc",
    },
    "campaigns": {
        "doctype": "AT Campaign",
        "display_fields": ["campaign_name", "channel", "status"],
        "search_fields": ["name", "campaign_name", "segment", "channel", "status"],
        "order_by": "modified desc",
    },
}


@frappe.whitelist()
def search_quick_options(
    options_source: str,
    query: str | None = None,
    limit: int | str | None = 20,
    start: int | str | None = 0,
) -> dict[str, object]:
    assert_authenticated()
    source_key = _normalize_quick_option_source(options_source)
    source_config = QUICK_OPTION_SEARCH_SOURCES[source_key]
    doctype = str(source_config.get("doctype") or "").strip()

    assert_doctype_permission(
        doctype,
        "read",
        _("You do not have permission to search {0}.").format(frappe.bold(doctype)),
    )

    query_text = (query or "").strip()
    page_limit = min(max(cint(limit or 20), 1), MAX_QUICK_OPTION_SEARCH_LIMIT)
    page_start = max(cint(start or 0), 0)

    rows = frappe.get_list(
        doctype,
        fields=_build_quick_option_fields(source_config),
        filters=dict(source_config.get("filters") or {}) or None,
        or_filters=_build_quick_option_or_filters(doctype, source_config, query_text)
        or None,
        order_by=str(source_config.get("order_by") or "modified desc"),
        limit_start=page_start,
        limit_page_length=page_limit + 1,
    )
    page_rows = (rows or [])[:page_limit]
    options = [_format_quick_option_row(source_key, row or {}) for row in page_rows]
    has_more = len(rows or []) > page_limit
    next_start = page_start + page_limit if has_more else None
    return {
        "options": options,
        "has_more": has_more,
        "next_start": next_start,
    }


MAX_QUICK_OPTION_SEARCH_LIMIT = 50


def _normalize_quick_option_source(value: str | None) -> str:
    source_key = (value or "").strip()
    if source_key in QUICK_OPTION_SEARCH_SOURCES:
        return source_key
    frappe.throw(_("Unsupported option source: {0}").format(source_key or "-"))
    return ""


def _build_quick_option_fields(source_config: dict) -> list[str]:
    ordered_fields: list[str] = []
    for field_name in ["name", *(source_config.get("display_fields") or [])]:
        normalized = str(field_name or "").strip()
        if not normalized or normalized in ordered_fields:
            continue
        ordered_fields.append(normalized)
    return ordered_fields


def _build_quick_option_or_filters(
    doctype: str, source_config: dict, query_text: str
) -> list[list[str]]:
    if not query_text:
        return []
    like_pattern = f"%{query_text}%"
    out: list[list[str]] = []
    for field_name in source_config.get("search_fields") or ["name"]:
        normalized = str(field_name or "").strip()
        if not normalized:
            continue
        out.append([doctype, normalized, "like", like_pattern])
    return out


def _format_quick_option_row(source_key: str, row: dict) -> dict[str, str]:
    name = str(row.get("name") or "")
    label = name
    description = ""

    if source_key == "customers":
        label = _value_or_fallback(row, "full_name", name)
        customer_type = str(row.get("customer_type") or "").strip()
        identity_number = _value_or_fallback(row, "tax_id")
        if customer_type == "Corporate":
            description = _join_non_empty(["Kurumsal", identity_number])
        elif customer_type == "Individual":
            description = _join_non_empty(["Bireysel", identity_number])
        else:
            description = identity_number
    elif source_key == "salesEntities":
        label = _value_or_fallback(row, "full_name", name)
        description = _value_or_fallback(row, "entity_type")
    elif source_key == "insuranceCompanies":
        company_name = _value_or_fallback(row, "company_name", name)
        company_code = _value_or_fallback(row, "company_code")
        label = f"{company_name} ({company_code})" if company_code else company_name
    elif source_key == "branches":
        branch_name = _value_or_fallback(row, "branch_name", name)
        branch_code = _value_or_fallback(row, "branch_code")
        label = f"{branch_name} ({branch_code})" if branch_code else branch_name
        description = _value_or_fallback(row, "insurance_company")
    elif source_key == "offers":
        customer = _value_or_fallback(row, "customer")
        label = f"{name} - {customer}" if customer else name
        description = _join_non_empty(
            [_value_or_fallback(row, "status"), _value_or_fallback(row, "offer_date")]
        )
    elif source_key == "policies":
        policy_no = _value_or_fallback(row, "policy_no", name)
        if policy_no != name and name:
            policy_no = f"{policy_no} / {name}"
        customer = _value_or_fallback(row, "customer")
        label = f"{policy_no} - {customer}" if customer else policy_no
        description = _value_or_fallback(row, "status")
    elif source_key == "claims":
        claim_no = _value_or_fallback(row, "claim_no", name)
        policy = _value_or_fallback(row, "policy")
        label = f"{claim_no} - {policy}" if policy else claim_no
        description = _value_or_fallback(row, "claim_status")
    elif source_key == "notificationTemplates":
        template_key = _value_or_fallback(row, "template_key", name)
        label = template_key
        description = _join_non_empty(
            [_value_or_fallback(row, "channel"), _value_or_fallback(row, "language")]
        )
    elif source_key == "accountingEntries":
        source = _join_non_empty(
            [
                _value_or_fallback(row, "source_doctype"),
                _value_or_fallback(row, "source_name"),
            ]
        )
        label = f"{name} - {source}" if source else name
        description = _join_non_empty(
            [_value_or_fallback(row, "status"), _value_or_fallback(row, "external_ref")]
        )
    elif source_key == "insuredAssets":
        asset_label = _value_or_fallback(row, "asset_label", name)
        label = asset_label
        description = _join_non_empty(
            [
                _value_or_fallback(row, "asset_type"),
                _value_or_fallback(row, "asset_identifier"),
            ]
        )

    out = {"value": name, "label": label or name}
    if description:
        out["description"] = description
    return out


def _value_or_fallback(row: dict, field_name: str, fallback: str = "") -> str:
    value = str(row.get(field_name) or "").strip()
    return value or str(fallback or "").strip()


def _join_non_empty(parts: list[str]) -> str:
    cleaned = [str(part or "").strip() for part in parts if str(part or "").strip()]
    return " | ".join(cleaned)
