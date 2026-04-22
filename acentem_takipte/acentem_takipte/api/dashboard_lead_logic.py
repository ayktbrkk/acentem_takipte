from __future__ import annotations

import frappe
from frappe.utils import cint, flt

from acentem_takipte.acentem_takipte.api.v2 import (
    constants as dashboard_constants,
)
from acentem_takipte.acentem_takipte.utils.logging import log_redacted_error


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
        modified_date = frappe.utils.getdate(modified_value)
        delta = (frappe.utils.getdate(frappe.utils.nowdate()) - modified_date).days
    except Exception:
        return "Stale"
    if delta >= 8:
        return "Stale"
    if delta >= 3:
        return "FollowUp"
    return "Fresh"
