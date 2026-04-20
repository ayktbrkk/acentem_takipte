from __future__ import annotations

import unicodedata

import frappe
from frappe import _
from frappe.utils.logger import get_logger

from acentem_takipte.acentem_takipte.services.document_center import build_document_profile


LOGGER = get_logger("acentem_takipte.policy_360")


def _fold_ascii(value: str | None) -> str:
    return unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii").lower()


def build_policy_360_payload(name: str) -> dict:
    policy_name = str(name or "").strip()
    if not policy_name:
        return {}

    policy_doc = frappe.get_doc("AT Policy", policy_name)
    policy = policy_doc.as_dict(no_default_fields=False)
    customer = _get_customer(policy.get("customer"))

    files = _get_rows(
        "File",
        fields=["name", "file_name", "file_url", "file_size", "is_private", "creation"],
        filters={"attached_to_doctype": "AT Policy", "attached_to_name": policy_name, "is_folder": 0},
        order_by="creation desc",
        limit_page_length=100,
    )

    return {
        "policy": policy,
        "customer": customer,
        "endorsements": _get_rows(
            "AT Policy Endorsement",
            fields=["name", "endorsement_type", "status", "notes", "endorsement_date", "snapshot_version", "applied_on", "applied_by", "owner", "creation"],
            filters={"policy": policy_name},
            order_by="creation desc",
            limit_page_length=100,
        ),
        "comments": _get_rows(
            "Comment",
            fields=["name", "creation", "owner", "comment_type", "content"],
            filters={"reference_doctype": "AT Policy", "reference_name": policy_name},
            order_by="creation desc",
            limit_page_length=100,
        ),
        "communications": _get_rows(
            "Communication",
            fields=["name", "creation", "owner", "communication_date", "subject", "sender", "communication_type", "content"],
            filters={"reference_doctype": "AT Policy", "reference_name": policy_name},
            order_by="communication_date desc",
            limit_page_length=50,
        ),
        "snapshots": _get_rows(
            "AT Policy Snapshot",
            fields=["name", "snapshot_version", "snapshot_type", "captured_on", "captured_by", "snapshot_json"],
            filters={"policy": policy_name},
            order_by="snapshot_version asc",
            limit_page_length=200,
        ),
        "payments": _get_rows(
            "AT Payment",
            fields=["name", "payment_no", "status", "payment_direction", "payment_purpose", "payment_date", "currency", "amount", "amount_try"],
            filters={"policy": policy_name},
            order_by="payment_date desc",
            limit_page_length=50,
        ),
        "payment_installments": _get_rows(
            "AT Payment Installment",
            fields=["name", "payment", "installment_no", "installment_count", "status", "due_date", "paid_on", "currency", "amount", "amount_try"],
            filters={"policy": policy_name},
            order_by="due_date asc",
            limit_page_length=200,
        ),
        "files": files,
        "document_profile": build_document_profile(files),
        "at_documents": _get_at_documents_for_policy(policy_name),
        "notifications": _get_rows(
            "AT Notification Draft",
            fields=["name", "creation", "channel", "language", "status", "subject", "body"],
            filters={"reference_doctype": "AT Policy", "reference_name": policy_name},
            order_by="creation desc",
            limit_page_length=100,
        ),
        "assignments": _get_rows(
            "AT Ownership Assignment",
            fields=["name", "source_doctype", "source_name", "customer", "policy", "assigned_to", "assignment_role", "status", "priority", "due_date", "notes"],
            filters={"policy": policy_name},
            order_by="modified desc",
            limit_page_length=50,
        ) if frappe.db.exists("DocType", "AT Ownership Assignment") else [],
        "activities": _get_rows(
            "AT Activity",
            fields=["name", "activity_title", "activity_type", "source_doctype", "source_name", "customer", "policy", "claim", "assigned_to", "activity_at", "status", "notes"],
            filters={"policy": policy_name},
            order_by="activity_at desc, modified desc",
            limit_page_length=50,
        ) if frappe.db.exists("DocType", "AT Activity") else [],
        "reminders": _get_rows(
            "AT Reminder",
            fields=["name", "reminder_title", "source_doctype", "source_name", "customer", "policy", "claim", "assigned_to", "status", "priority", "remind_at", "completed_on", "notes"],
            filters={"policy": policy_name},
            order_by="remind_at asc, modified desc",
            limit_page_length=50,
        ) if frappe.db.exists("DocType", "AT Reminder") else [],
        "product_profile": _build_product_profile(policy),
    }


def _get_at_documents_for_policy(policy_name: str) -> list[dict]:
    if not frappe.db.exists("DocType", "AT Document"):
        return []

    docs = _get_rows(
        "AT Document",
        fields=["name", "file", "document_kind", "document_date", "notes", "status", "version_no", "creation", "owner"],
        filters={"policy": policy_name, "status": "Active"},
        order_by="creation desc",
        limit_page_length=100,
    )

    if not docs:
        return []

    file_ids = [d["file"] for d in docs if d.get("file")]
    file_map: dict = {}
    if file_ids:
        try:
            file_rows = frappe.get_list(
                "File",
                filters={"name": ["in", file_ids]},
                fields=["name", "file_name", "file_url", "file_size", "is_private"],
            )
            file_map = {str(f.get("name") or ""): dict(f) for f in file_rows}
        except Exception:
            pass

    result = []
    for doc in docs:
        fi = file_map.get(str(doc.get("file") or ""), {})
        result.append({
            **doc,
            "file_name": fi.get("file_name"),
            "file_url": fi.get("file_url"),
            "file_size": fi.get("file_size"),
            "is_private": fi.get("is_private"),
        })
    return result


def _get_customer(customer_name: str | None) -> dict | None:
    customer_name = str(customer_name or "").strip()
    if not customer_name:
        return None
    row = frappe.db.get_value(
        "AT Customer",
        customer_name,
        ["name", "full_name", "tax_id", "phone", "email", "address"],
        as_dict=True,
    )
    return dict(row) if row else None


def _get_rows(doctype: str, **kwargs) -> list[dict]:
    if not frappe.db.exists("DocType", doctype):
        return []

    safe_kwargs = dict(kwargs or {})
    requested_fields = safe_kwargs.get("fields")
    if isinstance(requested_fields, list) and requested_fields:
        safe_kwargs["fields"] = _filter_existing_fields(doctype, requested_fields)

    try:
        rows = frappe.get_list(doctype, **safe_kwargs)
    except Exception:
        LOGGER.warning(
            "policy_360 related query failed; doctype=%s kwargs=%s",
            doctype,
            {
                "filters": safe_kwargs.get("filters"),
                "order_by": safe_kwargs.get("order_by"),
                "limit_page_length": safe_kwargs.get("limit_page_length"),
                "fields": safe_kwargs.get("fields"),
            },
            exc_info=True,
        )
        return []

    return [dict(row or {}) for row in (rows or [])]


def _filter_existing_fields(doctype: str, fields: list[str]) -> list[str]:
    try:
        meta = frappe.get_meta(doctype)
        meta_fieldnames = {str(df.fieldname or "").strip() for df in (meta.fields or [])}
    except Exception:
        meta_fieldnames = set()

    always_available = {
        "name",
        "owner",
        "creation",
        "modified",
        "modified_by",
        "docstatus",
    }

    allowed = meta_fieldnames | always_available
    filtered: list[str] = []
    for field in fields:
        field_name = str(field or "").strip()
        if field_name in allowed:
            filtered.append(field_name)

    if not filtered:
        return ["name"]

    return filtered


def _build_product_profile(policy: dict) -> dict:
    branch_value = str(policy.get("branch") or "").strip()
    normalized_branch_value = _fold_ascii(branch_value)
    branch_label = branch_value or "-"

    product_family = "General"
    insured_subject = "Policy"
    coverage_focus = branch_label
    required_fields = [
        {"key": "name", "label": _("Record Number"), "value": policy.get("name")},
        {"key": "start_date", "label": _("Start Date"), "value": policy.get("start_date")},
        {"key": "end_date", "label": _("End Date"), "value": policy.get("end_date")},
    ]

    if any(_fold_ascii(token) in normalized_branch_value for token in ["trafik", "kasko", "vehicle", "motor"]):
        product_family = "Motor"
        insured_subject = "Vehicle"
        coverage_focus = "Motor"
        required_fields.extend(
            [
                {"key": "vehicle_plate_no", "label": "Plate No", "value": policy.get("vehicle_plate_no") or policy.get("plate_no")},
                {"key": "vehicle_chassis_no", "label": "Chassis No", "value": policy.get("vehicle_chassis_no") or policy.get("chassis_no")},
                {"key": "vehicle_engine_no", "label": "Engine No", "value": policy.get("vehicle_engine_no") or policy.get("engine_no")},
            ]
        )
    elif any(_fold_ascii(token) in normalized_branch_value for token in ["konut", "dask", "home"]):
        product_family = "Property"
        insured_subject = "Property"
        coverage_focus = "Home"
        required_fields.extend(
            [
                {"key": "insured_address", "label": "Insured Address", "value": policy.get("insured_address") or policy.get("property_address")},
                {"key": "building_area_m2", "label": "Building Area", "value": policy.get("building_area_m2")},
                {"key": "usage_type", "label": "Usage Type", "value": policy.get("usage_type")},
            ]
        )
    elif any(_fold_ascii(token) in normalized_branch_value for token in ["saglik", "health", "tamamlayici"]):
        product_family = "Health"
        insured_subject = "Person"
        coverage_focus = "Health"
        required_fields.extend(
            [
                {"key": "insured_count", "label": "Insured Count", "value": policy.get("insured_count")},
                {"key": "plan_name", "label": "Plan Name", "value": policy.get("plan_name")},
                {"key": "provider_network", "label": "Provider Network", "value": policy.get("provider_network")},
            ]
        )
    elif any(_fold_ascii(token) in normalized_branch_value for token in ["seyahat", "travel"]):
        product_family = "Travel"
        insured_subject = "Trip"
        coverage_focus = "Travel"
        required_fields.extend(
            [
                {"key": "destination_country", "label": "Destination", "value": policy.get("destination_country")},
                {"key": "trip_start_date", "label": "Trip Start", "value": policy.get("trip_start_date")},
                {"key": "trip_end_date", "label": "Trip End", "value": policy.get("trip_end_date")},
            ]
        )
    elif any(_fold_ascii(token) in normalized_branch_value for token in ["hayat", "life", "bes", "emeklilik"]):
        product_family = "Life"
        insured_subject = "Person"
        coverage_focus = "Life"
        required_fields.extend(
            [
                {"key": "insured_person_name", "label": "Insured Person", "value": policy.get("insured_person_name")},
                {"key": "beneficiary_name", "label": "Beneficiary", "value": policy.get("beneficiary_name")},
                {"key": "plan_name", "label": "Plan Name", "value": policy.get("plan_name")},
            ]
        )

    completed_fields = [item for item in required_fields if str(item.get("value") or "").strip()]
    missing_fields = [item for item in required_fields if not str(item.get("value") or "").strip()]
    readiness_score = round((len(completed_fields) / max(len(required_fields), 1)) * 100)

    return {
        "product_family": product_family,
        "insured_subject": insured_subject,
        "coverage_focus": coverage_focus,
        "branch_label": branch_label,
        "policy_status": policy.get("status"),
        "required_fields": required_fields,
        "completed_field_count": len(completed_fields),
        "missing_field_count": len(missing_fields),
        "missing_fields": missing_fields,
        "readiness_score": readiness_score,
    }

