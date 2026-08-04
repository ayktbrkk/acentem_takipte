from __future__ import annotations

import unicodedata

import frappe
from frappe import _
from frappe.utils import flt
from frappe.utils.logger import get_logger

from acentem_takipte.acentem_takipte.platform.services.document_center import build_document_profile


LOGGER = get_logger("acentem_takipte.policy_360")


def _fold_ascii(value: str | None) -> str:
    return unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii").lower()


def _get_commission_entity_paid_try(policy_name: str) -> dict[str, float]:
    """Return per-sales-entity paid TRY amounts for a policy's commission payouts.

    Only status=Paid Commission Payout payments count; Draft is reserved and
    Cancelled is excluded from paid totals (matches the commission balances
    rules). The map key is the AT Sales Entity doc name so it can be joined to
    the commission_distribution JSON entries on the policy doc."""
    if not policy_name:
        return {}
    payout_rows = frappe.get_all(
        "AT Payment",
        filters={
            "policy": policy_name,
            "payment_purpose": "Commission Payout",
            "status": "Paid",
        },
        fields=["sales_entity", "amount_try"],
        limit_page_length=0,
    )
    ledger: dict[str, float] = {}
    for row in payout_rows:
        entity = str(row.get("sales_entity") or "").strip()
        if not entity:
            continue
        ledger[entity] = round(ledger.get(entity, 0) + flt(row.get("amount_try") or 0), 2)
    return ledger


def build_policy_360_payload(name: str) -> dict:
    policy_name = str(name or "").strip()
    if not policy_name:
        return {}

    # Try to get from cache first
    cache_key = f"at_policy_360:{policy_name}"
    cached_payload = frappe.cache().get_value(cache_key)
    if cached_payload:
        return cached_payload

    policy_doc = frappe.get_doc("AT Policy", policy_name)
    policy = policy_doc.as_dict(no_default_fields=False)
    
    if policy.get("sales_entity"):
        se_info = frappe.db.get_value("AT Sales Entity", policy["sales_entity"], ["full_name", "office_branch"], as_dict=True)
        if se_info:
            policy["sales_entity_full_name"] = se_info.full_name
            policy["sales_entity_office"] = se_info.office_branch

    if policy.get("insurance_company"):
        ic_name = frappe.db.get_value("AT Insurance Company", policy["insurance_company"], "company_name")
        if ic_name:
            policy["insurance_company_name"] = ic_name

    if policy.get("branch"):
        br_name = frappe.db.get_value("AT Branch", policy["branch"], "branch_name")
        if br_name:
            policy["branch_name"] = br_name

    customer = _get_customer(policy.get("customer"))

    files = _get_rows(
        "File",
        fields=["name", "file_name", "file_url", "file_size", "is_private", "creation"],
        filters={"attached_to_doctype": "AT Policy", "attached_to_name": policy_name, "is_folder": 0},
        order_by="creation desc",
        limit_page_length=100,
    )

    payload = {
        "policy": policy,
        "customer": customer,
        "endorsements": _get_rows(
            "AT Policy Endorsement",
            fields=["name", "endorsement_type", "status", "notes", "endorsement_date", "change_payload", "snapshot_version", "applied_on", "applied_by", "owner", "creation"],
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
        "commission_entity_paid_try": _get_commission_entity_paid_try(policy_name),
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
        "renewal_tasks": _get_rows(
            "AT Renewal Task",
            fields=["name", "status", "renewal_date", "reminder_stage", "notes", "owner", "creation"],
            filters={"policy": policy_name},
            order_by="renewal_date desc",
            limit_page_length=20,
        ),
        "version_chain": _get_version_chain(policy_name),
        "product_profile": _build_product_profile(policy),
    }

    # Store in cache for 5 minutes
    frappe.cache().set_value(cache_key, payload, expires_in_sec=300)

    return payload


def invalidate_policy_360_cache(name: str):
    """Invalidate the 360 cache for a specific policy."""
    if not name:
        return
    frappe.cache().delete_value(f"at_policy_360:{name.strip()}")



def invalidate_policy_from_doc_event(doc, method=None):
    """Bridge function for hooks to invalidate policy 360 cache."""
    if not doc:
        return

    def read_value(fieldname: str) -> str:
        if hasattr(doc, "get"):
            try:
                value = doc.get(fieldname)
            except Exception:
                value = None
        else:
            value = None
        if value:
            return value
        return getattr(doc, fieldname, None)

    # Direct target
    if doc.doctype == "AT Policy":
        invalidate_policy_360_cache(doc.name)
        return

    # Reference target
    policy_name = None
    if read_value("policy"):
        policy_name = read_value("policy")
    elif doc.doctype in ["Communication", "Comment"] and read_value("reference_doctype") == "AT Policy":
        policy_name = read_value("reference_name")
    elif doc.doctype == "AT Document" and read_value("reference_doctype") == "AT Policy":
        policy_name = read_value("reference_name")
    elif doc.doctype == "AT Policy Endorsement" and read_value("policy"):
        policy_name = read_value("policy")

    if policy_name:
        invalidate_policy_360_cache(policy_name)


def _get_at_documents_for_policy(policy_name: str) -> list[dict]:
    if not frappe.db.exists("DocType", "AT Document"):
        return []

    docs = _get_rows(
        "AT Document",
        fields=["name", "file", "display_name", "document_kind", "document_sub_type", "document_date", "notes", "status", "version_no", "is_sensitive", "is_verified", "creation", "owner"],
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

    product_family = _("General")
    insured_subject = _("Policy")
    coverage_focus = branch_label
    required_fields = [
        {"key": "name", "label": _("Record Number"), "value": policy.get("name")},
        {"key": "start_date", "label": _("Start Date"), "value": policy.get("start_date")},
        {"key": "end_date", "label": _("End Date"), "value": policy.get("end_date")},
    ]

    if any(_fold_ascii(token) in normalized_branch_value for token in ["trafik", "kasko", "vehicle", "motor"]):
        product_family = _("Motor")
        insured_subject = _("Vehicle")
        coverage_focus = _("Motor")
        required_fields.extend(
            [
                {"key": "plate", "label": _("Plate No"), "value": policy.get("plate")},
                {"key": "document_serial_no", "label": _("Document Serial No"), "value": policy.get("document_serial_no")},
                {"key": "model_year", "label": _("Model Year"), "value": policy.get("model_year")},
                {"key": "brand_code", "label": _("Brand Code"), "value": policy.get("brand_code")},
                {"key": "chassis_no", "label": _("Chassis No"), "value": policy.get("chassis_no")},
                {"key": "motor_no", "label": _("Engine No"), "value": policy.get("motor_no")},
            ]
        )
    elif any(_fold_ascii(token) in normalized_branch_value for token in ["konut", "dask", "home"]):
        product_family = _("Property")
        insured_subject = _("Property")
        coverage_focus = _("Home")
        required_fields.extend(
            [
                {"key": "address", "label": _("Address"), "value": policy.get("address")},
                {"key": "uavt_code", "label": _("UAVT Code"), "value": policy.get("uavt_code")},
                {"key": "gross_area_m2", "label": _("Gross Area (m2)"), "value": policy.get("gross_area_m2")},
                {"key": "usage_type", "label": _("Usage Type"), "value": policy.get("usage_type")},
                {"key": "floor_count", "label": _("Floor Count"), "value": policy.get("floor_count")},
                {"key": "current_floor", "label": _("Current Floor"), "value": policy.get("current_floor")},
                {"key": "construction_year", "label": _("Construction Year"), "value": policy.get("construction_year")},
                {"key": "structure_type", "label": _("Structure Type"), "value": policy.get("structure_type")},
                {"key": "damage_status", "label": _("Damage Status"), "value": policy.get("damage_status")},
            ]
        )
    elif any(_fold_ascii(token) in normalized_branch_value for token in ["saglik", "health", "tamamlayici"]):
        product_family = _("Health")
        insured_subject = _("Person")
        coverage_focus = _("Health")
        required_fields.extend(
            [
                {"key": "insurance_type", "label": _("Insurance Type"), "value": policy.get("insurance_type")},
                {"key": "coverage_type", "label": _("Coverage Type"), "value": policy.get("coverage_type")},
                {"key": "network_type", "label": _("Network Type"), "value": policy.get("network_type")},
                {"key": "inpatient_treatment", "label": _("Inpatient Treatment"), "value": policy.get("inpatient_treatment")},
                {"key": "outpatient_treatment", "label": _("Outpatient Treatment"), "value": policy.get("outpatient_treatment")},
                {"key": "maternity_coverage", "label": _("Maternity Coverage"), "value": policy.get("maternity_coverage")},
            ]
        )
    elif any(_fold_ascii(token) in normalized_branch_value for token in ["seyahat", "travel"]):
        product_family = _("Travel")
        insured_subject = _("Trip")
        coverage_focus = _("Travel")
    elif any(_fold_ascii(token) in normalized_branch_value for token in ["hayat", "life", "bes", "emeklilik"]):
        product_family = _("Life")
        insured_subject = _("Person")
        coverage_focus = _("Life")

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


def _get_version_chain(policy_name: str) -> list[dict]:
    chain = []

    # Walk up to find all ancestors
    ancestor_names = []
    parent = frappe.db.get_value("AT Policy", policy_name, "parent_policy")
    while parent:
        ancestor_names.insert(0, parent)
        parent = frappe.db.get_value("AT Policy", parent, "parent_policy")

    # Resolve root policy
    root_policy = ancestor_names[0] if ancestor_names else policy_name

    # Fetch all ancestors
    if ancestor_names:
        ancestors = frappe.get_list(
            "AT Policy",
            filters={"name": ["in", ancestor_names]},
            fields=["name", "status", "gross_premium", "endorsement_reference", "policy_version", "parent_policy"],
            order_by="policy_version asc",
        )
        for a in ancestors:
            chain.append({**dict(a), "is_current": a.name == policy_name})

    # Add current
    current_status = frappe.db.get_value("AT Policy", policy_name, ["status", "gross_premium", "policy_version"], as_dict=True) or {}
    chain.append({
        "name": policy_name,
        "status": current_status.get("status"),
        "gross_premium": current_status.get("gross_premium"),
        "policy_version": current_status.get("policy_version"),
        "is_current": True,
    })

    # Fetch children
    children = frappe.get_list(
        "AT Policy",
        filters={"parent_policy": policy_name},
        fields=["name", "status", "gross_premium", "endorsement_reference", "policy_version"],
        order_by="policy_version asc",
    )
    for child in children:
        chain.append(dict(child))

    # Fetch siblings from root (same parent, different names, include all descendants)
    if root_policy != policy_name:
        siblings = frappe.get_list(
            "AT Policy",
            filters={"parent_policy": root_policy, "name": ["!=", policy_name]},
            fields=["name", "status", "gross_premium", "endorsement_reference", "policy_version"],
            order_by="policy_version asc",
        )
        for sib in siblings:
            if sib.name not in {v.get("name") for v in chain}:
                chain.append(dict(sib))

    return chain

