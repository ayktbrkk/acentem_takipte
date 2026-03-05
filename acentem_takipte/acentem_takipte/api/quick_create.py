from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import add_days, cint, flt, getdate, nowdate

from acentem_takipte.acentem_takipte.api.security import (
    assert_authenticated,
    assert_doctype_permission,
    assert_post_request,
)


def _assert_quick_mutation_request() -> None:
    assert_authenticated()
    assert_post_request("Only POST requests are allowed for quick create/update operations.")


@frappe.whitelist()
def create_quick_customer(
    full_name: str | None = None,
    tax_id: str | None = None,
    phone: str | None = None,
    email: str | None = None,
    address: str | None = None,
    birth_date: str | None = None,
    gender: str | None = None,
    marital_status: str | None = None,
    occupation: str | None = None,
    consent_status: str | None = None,
    assigned_agent: str | None = None,
) -> dict[str, str]:
    _assert_quick_mutation_request()
    _assert_create_permission("AT Customer", _("You do not have permission to create customers."))

    payload = {
        "doctype": "AT Customer",
        "full_name": (full_name or "").strip(),
        "tax_id": _digits_only(tax_id),
        "phone": (phone or "").strip() or None,
        "email": (email or "").strip() or None,
        "address": (address or "").strip() or None,
        "birth_date": birth_date or None,
        "gender": _normalize_option(gender, {"Unknown", "Male", "Female", "Other"}, default="Unknown"),
        "marital_status": _normalize_option(
            marital_status,
            {"Unknown", "Single", "Married", "Divorced", "Widowed"},
            default="Unknown",
        ),
        "occupation": (occupation or "").strip() or None,
        "consent_status": _normalize_option(consent_status, {"Unknown", "Granted", "Revoked"}, default="Unknown"),
        "assigned_agent": (assigned_agent or "").strip() or None,
    }

    doc = frappe.get_doc(payload)
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"customer": doc.name}


@frappe.whitelist()
def create_quick_lead(
    first_name: str | None = None,
    last_name: str | None = None,
    phone: str | None = None,
    tax_id: str | None = None,
    email: str | None = None,
    status: str | None = None,
    customer: str | None = None,
    sales_entity: str | None = None,
    insurance_company: str | None = None,
    branch: str | None = None,
    estimated_gross_premium: float | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_quick_mutation_request()
    _assert_create_permission("AT Lead", _("You do not have permission to create leads."))

    payload = {
        "doctype": "AT Lead",
        "first_name": (first_name or "").strip(),
        "last_name": (last_name or "").strip() or None,
        "phone": (phone or "").strip() or None,
        "tax_id": _digits_only(tax_id) or None,
        "email": (email or "").strip() or None,
        "status": _normalize_option(status, {"Draft", "Open", "Replied", "Closed"}, default="Open"),
        "customer": _normalize_link("AT Customer", customer),
        "sales_entity": _normalize_link("AT Sales Entity", sales_entity),
        "insurance_company": _normalize_link("AT Insurance Company", insurance_company),
        "branch": _normalize_link("AT Branch", branch),
        "estimated_gross_premium": flt(estimated_gross_premium) if estimated_gross_premium not in {None, ""} else 0,
        "notes": (notes or "").strip() or None,
    }

    doc = frappe.get_doc(payload)
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"lead": doc.name}


@frappe.whitelist()
def create_quick_policy(
    customer: str | None = None,
    sales_entity: str | None = None,
    insurance_company: str | None = None,
    branch: str | None = None,
    policy_no: str | None = None,
    status: str | None = None,
    issue_date: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    currency: str | None = None,
    net_premium: float | None = None,
    tax_amount: float | None = None,
    commission_amount: float | None = None,
    gross_premium: float | None = None,
    source_offer: str | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_quick_mutation_request()
    _assert_create_permission("AT Policy", _("You do not have permission to create policies."))

    issue = getdate(issue_date) if issue_date else getdate(nowdate())
    start = getdate(start_date) if start_date else issue
    end = getdate(end_date) if end_date else add_days(start, 365)

    payload = {
        "doctype": "AT Policy",
        "customer": _normalize_link("AT Customer", customer, required=True),
        "sales_entity": _normalize_link("AT Sales Entity", sales_entity, required=True),
        "insurance_company": _normalize_link("AT Insurance Company", insurance_company, required=True),
        "branch": _normalize_link("AT Branch", branch, required=True),
        "policy_no": (policy_no or "").strip() or None,
        "status": _normalize_option(status, {"Active", "IPT", "KYT"}, default="Active"),
        "issue_date": issue,
        "start_date": start,
        "end_date": end,
        "currency": ((currency or "TRY").strip() or "TRY").upper(),
        "net_premium": flt(net_premium) if net_premium not in {None, ""} else 0,
        "tax_amount": flt(tax_amount) if tax_amount not in {None, ""} else 0,
        "commission_amount": flt(commission_amount) if commission_amount not in {None, ""} else 0,
        "gross_premium": flt(gross_premium) if gross_premium not in {None, ""} else 0,
        "source_offer": _normalize_link("AT Offer", source_offer),
        "notes": (notes or "").strip() or None,
    }

    doc = frappe.get_doc(payload)
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"policy": doc.name}


@frappe.whitelist()
def create_quick_claim(
    policy: str | None = None,
    customer: str | None = None,
    claim_no: str | None = None,
    claim_type: str | None = None,
    claim_status: str | None = None,
    incident_date: str | None = None,
    reported_date: str | None = None,
    currency: str | None = None,
    estimated_amount: float | None = None,
    approved_amount: float | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_quick_mutation_request()
    _assert_create_permission("AT Claim", _("You do not have permission to create claims."))

    today = getdate(nowdate())
    incident = getdate(incident_date) if incident_date else today
    reported = getdate(reported_date) if reported_date else today

    payload = {
        "doctype": "AT Claim",
        "policy": _normalize_link("AT Policy", policy, required=True),
        "customer": _normalize_link("AT Customer", customer, required=True),
        "claim_no": (claim_no or "").strip() or None,
        "claim_type": _normalize_option(
            claim_type,
            {"Damage", "Health", "Theft", "Liability", "Other"},
            default="Damage",
        ),
        "claim_status": _normalize_option(
            claim_status,
            {"Draft", "Open", "Under Review", "Approved", "Rejected", "Paid", "Closed"},
            default="Open",
        ),
        "incident_date": incident,
        "reported_date": reported,
        "currency": ((currency or "TRY").strip() or "TRY").upper(),
        "estimated_amount": flt(estimated_amount) if estimated_amount not in {None, ""} else 0,
        "approved_amount": flt(approved_amount) if approved_amount not in {None, ""} else 0,
        "notes": (notes or "").strip() or None,
    }

    doc = frappe.get_doc(payload)
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"claim": doc.name}


@frappe.whitelist()
def create_quick_payment(
    customer: str | None = None,
    policy: str | None = None,
    claim: str | None = None,
    sales_entity: str | None = None,
    payment_direction: str | None = None,
    payment_purpose: str | None = None,
    status: str | None = None,
    payment_date: str | None = None,
    due_date: str | None = None,
    currency: str | None = None,
    amount: float | None = None,
    reference_no: str | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_quick_mutation_request()
    _assert_create_permission("AT Payment", _("You do not have permission to create payments."))

    payload = {
        "doctype": "AT Payment",
        "customer": _normalize_link("AT Customer", customer, required=True),
        "policy": _normalize_link("AT Policy", policy),
        "claim": _normalize_link("AT Claim", claim),
        "sales_entity": _normalize_link("AT Sales Entity", sales_entity),
        "payment_direction": _normalize_option(payment_direction, {"Inbound", "Outbound"}, default="Inbound"),
        "payment_purpose": _normalize_option(
            payment_purpose,
            {"Premium Collection", "Commission Payout", "Claim Payout", "Other"},
            default="Premium Collection",
        ),
        "status": _normalize_option(status, {"Draft", "Paid", "Cancelled"}, default="Draft"),
        "payment_date": getdate(payment_date) if payment_date else getdate(nowdate()),
        "due_date": getdate(due_date) if due_date else None,
        "currency": ((currency or "TRY").strip() or "TRY").upper(),
        "amount": flt(amount) if amount not in {None, ""} else 0,
        "reference_no": (reference_no or "").strip() or None,
        "notes": (notes or "").strip() or None,
    }

    doc = frappe.get_doc(payload)
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"payment": doc.name}


@frappe.whitelist()
def create_quick_renewal_task(
    policy: str | None = None,
    customer: str | None = None,
    renewal_date: str | None = None,
    due_date: str | None = None,
    status: str | None = None,
    assigned_to: str | None = None,
    notes: str | None = None,
    auto_created: int | None = 0,
) -> dict[str, str]:
    _assert_quick_mutation_request()
    _assert_create_permission("AT Renewal Task", _("You do not have permission to create renewal tasks."))

    today = getdate(nowdate())
    renewal = getdate(renewal_date) if renewal_date else add_days(today, 30)
    due = getdate(due_date) if due_date else add_days(renewal, -15)

    payload = {
        "doctype": "AT Renewal Task",
        "policy": _normalize_link("AT Policy", policy, required=True),
        "customer": _normalize_link("AT Customer", customer, required=True),
        "renewal_date": renewal,
        "due_date": due,
        "status": _normalize_option(status, {"Open", "In Progress", "Done", "Cancelled"}, default="Open"),
        "assigned_to": (assigned_to or "").strip() or None,
        "notes": (notes or "").strip() or None,
        "auto_created": 1 if str(auto_created or 0) in {"1", "true", "True"} else 0,
    }

    doc = frappe.get_doc(payload)
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"renewal_task": doc.name}


@frappe.whitelist()
def create_quick_insurance_company(
    company_name: str | None = None,
    company_code: str | None = None,
    is_active: int | str | bool | None = 1,
) -> dict[str, str]:
    _assert_quick_mutation_request()
    _assert_create_permission("AT Insurance Company", _("You do not have permission to create insurance companies."))

    payload = {
        "doctype": "AT Insurance Company",
        "company_name": (company_name or "").strip(),
        "company_code": (company_code or "").strip() or None,
        "is_active": _as_check(is_active, default=1),
    }
    doc = frappe.get_doc(payload)
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"company": doc.name}


@frappe.whitelist()
def create_quick_branch(
    branch_name: str | None = None,
    branch_code: str | None = None,
    insurance_company: str | None = None,
    is_active: int | str | bool | None = 1,
) -> dict[str, str]:
    _assert_quick_mutation_request()
    _assert_create_permission("AT Branch", _("You do not have permission to create branches."))

    payload = {
        "doctype": "AT Branch",
        "branch_name": (branch_name or "").strip(),
        "branch_code": (branch_code or "").strip() or None,
        "insurance_company": _normalize_link("AT Insurance Company", insurance_company),
        "is_active": _as_check(is_active, default=1),
    }
    doc = frappe.get_doc(payload)
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"branch": doc.name}


@frappe.whitelist()
def create_quick_sales_entity(
    entity_type: str | None = None,
    full_name: str | None = None,
    parent_entity: str | None = None,
) -> dict[str, str]:
    _assert_quick_mutation_request()
    _assert_create_permission("AT Sales Entity", _("You do not have permission to create sales entities."))

    payload = {
        "doctype": "AT Sales Entity",
        "entity_type": _normalize_option(entity_type, {"Agency", "Sub-Account", "Representative"}, default="Agency"),
        "full_name": (full_name or "").strip(),
        "parent_entity": _normalize_link("AT Sales Entity", parent_entity),
    }
    doc = frappe.get_doc(payload)
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"sales_entity": doc.name}


@frappe.whitelist()
def create_quick_notification_template(
    template_key: str | None = None,
    event_key: str | None = None,
    channel: str | None = None,
    language: str | None = None,
    subject: str | None = None,
    body_template: str | None = None,
    is_active: int | str | bool | None = 1,
) -> dict[str, str]:
    _assert_quick_mutation_request()
    _assert_create_permission("AT Notification Template", _("You do not have permission to create notification templates."))

    payload = {
        "doctype": "AT Notification Template",
        "template_key": (template_key or "").strip(),
        "event_key": (event_key or "").strip(),
        "channel": _normalize_option(channel, {"SMS", "Email", "Both"}, default="Both"),
        "language": _normalize_option(language, {"tr", "en"}, default="tr"),
        "subject": (subject or "").strip() or None,
        "body_template": (body_template or "").strip(),
        "is_active": _as_check(is_active, default=1),
    }
    doc = frappe.get_doc(payload)
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"template": doc.name}


@frappe.whitelist()
def create_quick_accounting_entry(
    source_doctype: str | None = None,
    source_name: str | None = None,
    entry_type: str | None = None,
    status: str | None = None,
    policy: str | None = None,
    customer: str | None = None,
    insurance_company: str | None = None,
    currency: str | None = None,
    local_amount: float | None = None,
    local_amount_try: float | None = None,
    external_amount: float | None = None,
    external_amount_try: float | None = None,
    external_ref: str | None = None,
) -> dict[str, str]:
    _assert_quick_mutation_request()
    _assert_create_permission("AT Accounting Entry", _("You do not have permission to create accounting entries."))

    source_dt = (source_doctype or "").strip()
    if not source_dt:
        frappe.throw(_("Source DocType is required."))
    _assert_doc_exists("DocType", source_dt)
    source_nm = (source_name or "").strip()
    if not source_nm:
        frappe.throw(_("Source Name is required."))
    _assert_doc_exists(source_dt, source_nm)

    payload = {
        "doctype": "AT Accounting Entry",
        "source_doctype": source_dt,
        "source_name": source_nm,
        "entry_type": _normalize_option(entry_type, {"Policy", "Payment", "Claim"}, default="Policy"),
        "status": _normalize_option(status, {"Draft", "Synced", "Failed"}, default="Draft"),
        "policy": _normalize_link("AT Policy", policy),
        "customer": _normalize_link("AT Customer", customer),
        "insurance_company": _normalize_link("AT Insurance Company", insurance_company),
        "currency": ((currency or "TRY").strip() or "TRY").upper(),
        "local_amount": flt(local_amount) if local_amount not in {None, ""} else 0,
        "local_amount_try": flt(local_amount_try) if local_amount_try not in {None, ""} else 0,
        "external_amount": flt(external_amount) if external_amount not in {None, ""} else 0,
        "external_amount_try": flt(external_amount_try) if external_amount_try not in {None, ""} else 0,
        "external_ref": (external_ref or "").strip() or None,
    }
    doc = frappe.get_doc(payload)
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"accounting_entry": doc.name}


@frappe.whitelist()
def create_quick_reconciliation_item(
    accounting_entry: str | None = None,
    source_doctype: str | None = None,
    source_name: str | None = None,
    status: str | None = None,
    mismatch_type: str | None = None,
    local_amount_try: float | None = None,
    external_amount_try: float | None = None,
    resolution_action: str | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_quick_mutation_request()
    _assert_create_permission("AT Reconciliation Item", _("You do not have permission to create reconciliation items."))

    payload = {
        "doctype": "AT Reconciliation Item",
        "accounting_entry": _normalize_link("AT Accounting Entry", accounting_entry, required=True),
        "source_doctype": _normalize_doctype_or_blank(source_doctype),
        "source_name": _normalize_source_name(source_doctype, source_name),
        "status": _normalize_option(status, {"Open", "Resolved", "Ignored"}, default="Open"),
        "mismatch_type": _normalize_option(
            mismatch_type,
            {"Amount", "Currency", "Missing External", "Missing Local", "Status", "Other"},
            default="Amount",
        ),
        "local_amount_try": flt(local_amount_try) if local_amount_try not in {None, ""} else 0,
        "external_amount_try": flt(external_amount_try) if external_amount_try not in {None, ""} else 0,
        "resolution_action": _normalize_reconciliation_action(resolution_action),
        "notes": (notes or "").strip() or None,
    }
    doc = frappe.get_doc(payload)
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"reconciliation_item": doc.name}


@frappe.whitelist()
def update_quick_aux_record(
    doctype: str,
    name: str,
    data: dict | str | None = None,
) -> dict[str, str]:
    _assert_quick_mutation_request()
    normalized_doctype = _normalize_aux_edit_doctype(doctype)
    _assert_write_permission(normalized_doctype, _("You do not have permission to update this record."))

    record_name = (name or "").strip()
    if not record_name:
        frappe.throw(_("Record name is required."))
    doc = frappe.get_doc(normalized_doctype, record_name)
    doc.check_permission("write")

    payload = _parse_update_payload(data)
    _apply_aux_edit_payload(doc, payload)
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"record": doc.name}


MAX_QUICK_OPTION_SEARCH_LIMIT = 50

QUICK_OPTION_SEARCH_SOURCES: dict[str, dict] = {
    "customers": {
        "doctype": "AT Customer",
        "display_fields": ["full_name", "tax_id"],
        "search_fields": ["name", "full_name", "tax_id", "email", "phone"],
        "order_by": "modified desc",
    },
    "salesEntities": {
        "doctype": "AT Sales Entity",
        "display_fields": ["full_name", "entity_type"],
        "search_fields": ["name", "full_name", "entity_type"],
        "order_by": "full_name asc",
    },
    "insuranceCompanies": {
        "doctype": "AT Insurance Company",
        "display_fields": ["company_name", "company_code"],
        "search_fields": ["name", "company_name", "company_code"],
        "filters": {"is_active": 1},
        "order_by": "company_name asc",
    },
    "branches": {
        "doctype": "AT Branch",
        "display_fields": ["branch_name", "branch_code", "insurance_company"],
        "search_fields": ["name", "branch_name", "branch_code", "insurance_company"],
        "filters": {"is_active": 1},
        "order_by": "branch_name asc",
    },
    "offers": {
        "doctype": "AT Offer",
        "display_fields": ["customer", "offer_date", "status"],
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
        "search_fields": ["name", "claim_no", "policy", "customer", "claim_status"],
        "order_by": "modified desc",
    },
    "notificationTemplates": {
        "doctype": "AT Notification Template",
        "display_fields": ["template_key", "channel", "language"],
        "search_fields": ["name", "template_key", "event_key", "channel", "language"],
        "filters": {"is_active": 1},
        "order_by": "modified desc",
    },
    "accountingEntries": {
        "doctype": "AT Accounting Entry",
        "display_fields": ["source_doctype", "source_name", "status", "external_ref"],
        "search_fields": ["name", "source_doctype", "source_name", "status", "external_ref"],
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
        or_filters=_build_quick_option_or_filters(doctype, source_config, query_text) or None,
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


def _build_quick_option_or_filters(doctype: str, source_config: dict, query_text: str) -> list[list[str]]:
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
        description = _value_or_fallback(row, "tax_id")
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
        description = _join_non_empty([_value_or_fallback(row, "status"), _value_or_fallback(row, "offer_date")])
    elif source_key == "policies":
        policy_no = _value_or_fallback(row, "policy_no", name)
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
        description = _join_non_empty([_value_or_fallback(row, "channel"), _value_or_fallback(row, "language")])
    elif source_key == "accountingEntries":
        source = _join_non_empty([_value_or_fallback(row, "source_doctype"), _value_or_fallback(row, "source_name")])
        label = f"{name} - {source}" if source else name
        description = _join_non_empty([_value_or_fallback(row, "status"), _value_or_fallback(row, "external_ref")])

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


def _assert_create_permission(doctype: str, message: str) -> None:
    if not frappe.has_permission(doctype, "create"):
        frappe.throw(message)


def _assert_write_permission(doctype: str, message: str) -> None:
    if not frappe.has_permission(doctype, "write"):
        frappe.throw(message)


def _digits_only(value: str | None) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _normalize_option(value: str | None, allowed: set[str], *, default: str) -> str:
    normalized = (value or "").strip() or default
    if normalized not in allowed:
        frappe.throw(_("Unsupported option value: {0}").format(normalized))
    return normalized


def _normalize_link(doctype: str, value: str | None, *, required: bool = False) -> str | None:
    normalized = (value or "").strip()
    if not normalized:
        if required:
            frappe.throw(_("{0} is required.").format(frappe.bold(doctype)))
        return None
    if not frappe.db.exists(doctype, normalized):
        frappe.throw(_("{0} not found: {1}").format(frappe.bold(doctype), normalized))
    return normalized


def _assert_doc_exists(doctype: str, name: str) -> None:
    if not frappe.db.exists(doctype, name):
        frappe.throw(_("{0} not found: {1}").format(frappe.bold(doctype), name))


def _as_check(value, *, default: int = 0) -> int:
    if value in {None, ""}:
        return 1 if default else 0
    return 1 if str(value) in {"1", "true", "True", "yes", "on"} else 0


def _normalize_doctype_or_blank(value: str | None) -> str | None:
    normalized = (value or "").strip()
    if not normalized:
        return None
    _assert_doc_exists("DocType", normalized)
    return normalized


def _normalize_source_name(source_doctype: str | None, source_name: str | None) -> str | None:
    sd = (source_doctype or "").strip()
    sn = (source_name or "").strip()
    if not sn:
        return None
    if not sd:
        frappe.throw(_("Source DocType is required when Source Name is provided."))
    _assert_doc_exists(sd, sn)
    return sn


def _normalize_reconciliation_action(value: str | None) -> str | None:
    normalized = (value or "").strip()
    if not normalized:
        return None
    allowed = {"Matched", "Adjusted", "Manual Override", "Ignored"}
    if normalized not in allowed:
        frappe.throw(_("Unsupported option value: {0}").format(normalized))
    return normalized


ALLOWED_AUX_EDIT_FIELDS: dict[str, set[str]] = {
    "AT Insurance Company": {"company_name", "company_code", "is_active"},
    "AT Branch": {"branch_name", "branch_code", "insurance_company", "is_active"},
    "AT Sales Entity": {"entity_type", "full_name", "parent_entity"},
    "AT Notification Template": {"template_key", "event_key", "channel", "language", "subject", "body_template", "is_active"},
    "AT Accounting Entry": {
        "source_doctype",
        "source_name",
        "entry_type",
        "status",
        "policy",
        "customer",
        "insurance_company",
        "currency",
        "local_amount",
        "local_amount_try",
        "external_amount",
        "external_amount_try",
        "external_ref",
    },
    "AT Reconciliation Item": {
        "accounting_entry",
        "source_doctype",
        "source_name",
        "status",
        "mismatch_type",
        "local_amount_try",
        "external_amount_try",
        "resolution_action",
        "notes",
    },
}


def _normalize_aux_edit_doctype(doctype: str | None) -> str:
    value = (doctype or "").strip()
    if value not in ALLOWED_AUX_EDIT_FIELDS:
        frappe.throw(_("Unsupported quick edit doctype: {0}").format(value))
    return value


def _parse_update_payload(data) -> dict:
    if data is None:
        return {}
    if isinstance(data, dict):
        return data
    if isinstance(data, str):
        import json

        try:
            parsed = json.loads(data)
        except json.JSONDecodeError:
            frappe.throw(_("Invalid update payload"))
        if not isinstance(parsed, dict):
            frappe.throw(_("Invalid update payload"))
        return parsed
    frappe.throw(_("Invalid update payload"))


def _apply_aux_edit_payload(doc, payload: dict) -> None:
    allowed_fields = ALLOWED_AUX_EDIT_FIELDS.get(doc.doctype, set())
    for field, value in (payload or {}).items():
        if field not in allowed_fields:
            continue
        if field in {"company_name", "company_code", "branch_name", "branch_code", "full_name", "template_key", "event_key", "subject", "body_template", "external_ref", "notes"}:
            setattr(doc, field, (value or "").strip() or None)
            continue
        if field in {"is_active"}:
            setattr(doc, field, _as_check(value))
            continue
        if field in {"insurance_company"}:
            setattr(doc, field, _normalize_link("AT Insurance Company", value))
            continue
        if field in {"parent_entity"}:
            setattr(doc, field, _normalize_link("AT Sales Entity", value))
            continue
        if field in {"entity_type"}:
            setattr(doc, field, _normalize_option(value, {"Agency", "Sub-Account", "Representative"}, default="Agency"))
            continue
        if field in {"channel"}:
            setattr(doc, field, _normalize_option(value, {"SMS", "Email", "Both"}, default="Both"))
            continue
        if field in {"language"}:
            setattr(doc, field, _normalize_option(value, {"tr", "en"}, default="tr"))
            continue
        if field in {"source_doctype"}:
            setattr(doc, field, _normalize_doctype_or_blank(value))
            continue
        if field in {"source_name"}:
            setattr(doc, field, _normalize_source_name(getattr(doc, "source_doctype", None), value))
            continue
        if field in {"entry_type"}:
            setattr(doc, field, _normalize_option(value, {"Policy", "Payment", "Claim"}, default="Policy"))
            continue
        if field in {"status"} and doc.doctype == "AT Accounting Entry":
            setattr(doc, field, _normalize_option(value, {"Draft", "Synced", "Failed"}, default="Draft"))
            continue
        if field in {"status"} and doc.doctype == "AT Reconciliation Item":
            setattr(doc, field, _normalize_option(value, {"Open", "Resolved", "Ignored"}, default="Open"))
            continue
        if field in {"policy"}:
            setattr(doc, field, _normalize_link("AT Policy", value))
            continue
        if field in {"customer"}:
            setattr(doc, field, _normalize_link("AT Customer", value))
            continue
        if field in {"accounting_entry"}:
            setattr(doc, field, _normalize_link("AT Accounting Entry", value, required=True))
            continue
        if field in {"mismatch_type"}:
            setattr(
                doc,
                field,
                _normalize_option(value, {"Amount", "Currency", "Missing External", "Missing Local", "Status", "Other"}, default="Amount"),
            )
            continue
        if field in {"resolution_action"}:
            setattr(doc, field, _normalize_reconciliation_action(value))
            continue
        if field in {"local_amount", "local_amount_try", "external_amount", "external_amount_try"}:
            setattr(doc, field, flt(value) if value not in {None, ""} else 0)
            continue
        if field in {"currency"}:
            setattr(doc, field, ((value or "TRY").strip() or "TRY").upper())
            continue
