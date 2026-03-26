from __future__ import annotations

import frappe
from frappe import _

from acentem_takipte.acentem_takipte.api.quick_payloads import (
    QuickAccountingEntryPayload,
    QuickNotificationTemplatePayload,
)
from acentem_takipte.acentem_takipte.services.quick_create import (
    delete_aux_record as delete_aux_record_service,
    update_aux_record as update_aux_record_service,
)
from acentem_takipte.acentem_takipte.services.quick_create_helpers import (
    _apply_aux_edit_payload,
    _assert_create_permission,
    _assert_delete_permission,
    _assert_doc_exists,
    _assert_write_permission,
    _as_check,
    _normalize_aux_delete_doctype,
    _normalize_aux_edit_doctype,
    _normalize_doctype_or_blank,
    _normalize_link,
    _normalize_option,
    _normalize_reconciliation_action,
    _normalize_source_name,
    _parse_update_payload,
    _resolve_office_branch,
)
from acentem_takipte.acentem_takipte.utils.normalization import (
    safe_float as shared_safe_float,
)
from acentem_takipte.acentem_takipte.utils.notes import normalize_note_text
from acentem_takipte.acentem_takipte.utils.statuses import (
    ATAccountingEntryStatus,
    ATReconciliationItemStatus,
)


@frappe.whitelist()
def create_quick_notification_template(
    payload: QuickNotificationTemplatePayload | None = None,
    **kwargs,
) -> dict[str, str]:
    quick_payload = QuickNotificationTemplatePayload.from_input(payload, **kwargs)
    _assert_create_permission(
        "AT Notification Template",
        _("You do not have permission to create notification templates."),
    )

    payload = {
        "doctype": "AT Notification Template",
        "template_key": (quick_payload.template_key or "").strip(),
        "event_key": (quick_payload.event_key or "").strip(),
        "channel": _normalize_option(
            quick_payload.channel, {"SMS", "Email", "WHATSAPP", "Both"}, default="Both"
        ),
        "content_mode": _normalize_option(
            quick_payload.content_mode, {"freeform", "template"}, default="freeform"
        ),
        "language": _normalize_option(quick_payload.language, {"tr", "en"}, default="tr"),
        "provider_template_name": (quick_payload.provider_template_name or "").strip()
        or None,
        "provider_template_category": _normalize_option(
            quick_payload.provider_template_category,
            {"UTILITY", "MARKETING", "AUTHENTICATION"},
            default="UTILITY",
        ),
        "variables_schema_json": (quick_payload.variables_schema_json or "").strip() or None,
        "subject": (quick_payload.subject or "").strip() or None,
        "body_template": (quick_payload.body_template or "").strip(),
        "sms_body_template": (quick_payload.sms_body_template or "").strip() or None,
        "email_body_template": (quick_payload.email_body_template or "").strip() or None,
        "whatsapp_body_template": (quick_payload.whatsapp_body_template or "").strip()
        or None,
        "is_active": _as_check(quick_payload.is_active, default=1),
    }
    doc = frappe.get_doc(payload)
    doc.insert()
    frappe.db.commit()
    return {"template": doc.name}


@frappe.whitelist()
def create_quick_accounting_entry(
    payload: QuickAccountingEntryPayload | None = None,
    **kwargs,
) -> dict[str, str]:
    quick_payload = QuickAccountingEntryPayload.from_input(payload, **kwargs)
    _assert_create_permission(
        "AT Accounting Entry",
        _("You do not have permission to create accounting entries."),
    )

    source_dt = (quick_payload.source_doctype or "").strip()
    source_nm = (quick_payload.source_name or "").strip()
    normalized_policy = _normalize_link("AT Policy", quick_payload.policy)
    normalized_customer = _normalize_link("AT Customer", quick_payload.customer)

    if normalized_policy:
        source_dt = "AT Policy"
        source_nm = normalized_policy
    elif normalized_customer:
        source_dt = "AT Customer"
        source_nm = normalized_customer

    if not source_dt:
        frappe.throw(_("Policy or customer selection is required."))
    _assert_doc_exists("DocType", source_dt)
    if not source_nm:
        frappe.throw(_("Source record is required."))
    _assert_doc_exists(source_dt, source_nm)

    payload = {
        "doctype": "AT Accounting Entry",
        "source_doctype": source_dt,
        "source_name": source_nm,
        "entry_type": _normalize_option(
            quick_payload.entry_type, {"Policy", "Payment", "Claim"}, default="Policy"
        ),
        "status": _normalize_option(
            quick_payload.status,
            set(ATAccountingEntryStatus.VALID),
            default=ATAccountingEntryStatus.DRAFT,
        ),
        "policy": normalized_policy,
        "customer": normalized_customer,
        "office_branch": _resolve_office_branch(
            quick_payload.office_branch,
            customer=quick_payload.customer,
            policy=quick_payload.policy,
        ),
        "sales_entity": _normalize_link("AT Sales Entity", quick_payload.sales_entity),
        "insurance_company": _normalize_link(
            "AT Insurance Company", quick_payload.insurance_company
        ),
        "currency": ((quick_payload.currency or "TRY").strip() or "TRY").upper(),
        "local_amount": shared_safe_float(quick_payload.local_amount)
        if quick_payload.local_amount not in {None, ""}
        else 0,
        "local_amount_try": shared_safe_float(quick_payload.local_amount_try)
        if quick_payload.local_amount_try not in {None, ""}
        else 0,
        "external_amount": shared_safe_float(quick_payload.external_amount)
        if quick_payload.external_amount not in {None, ""}
        else 0,
        "external_amount_try": shared_safe_float(quick_payload.external_amount_try)
        if quick_payload.external_amount_try not in {None, ""}
        else 0,
        "external_ref": (quick_payload.external_ref or "").strip() or None,
    }
    doc = frappe.get_doc(payload)
    doc.insert()
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
    _assert_create_permission(
        "AT Reconciliation Item",
        _("You do not have permission to create reconciliation items."),
    )

    source_dt = _normalize_doctype_or_blank(source_doctype)
    source_nm = _normalize_source_name(source_doctype, source_name)
    if accounting_entry:
        accounting_entry_doc = frappe.get_doc(
            "AT Accounting Entry",
            _normalize_link("AT Accounting Entry", accounting_entry, required=True),
        )
        source_dt = accounting_entry_doc.source_doctype or ""
        source_nm = accounting_entry_doc.source_name or ""

    payload = {
        "doctype": "AT Reconciliation Item",
        "accounting_entry": _normalize_link(
            "AT Accounting Entry", accounting_entry, required=True
        ),
        "source_doctype": source_dt,
        "source_name": source_nm,
        "status": _normalize_option(
            status,
            set(
                ATReconciliationItemStatus.RESOLUTION_REQUIRED
                | ATReconciliationItemStatus.CLOSED
            ),
            default=ATReconciliationItemStatus.OPEN,
        ),
        "mismatch_type": _normalize_option(
            mismatch_type,
            {
                "Amount",
                "Currency",
                "Missing External",
                "Missing Local",
                "Status",
                "Other",
            },
            default="Amount",
        ),
        "local_amount_try": shared_safe_float(local_amount_try)
        if local_amount_try not in {None, ""}
        else 0,
        "external_amount_try": shared_safe_float(external_amount_try)
        if external_amount_try not in {None, ""}
        else 0,
        "resolution_action": _normalize_reconciliation_action(resolution_action),
        "notes": normalize_note_text(notes),
    }
    doc = frappe.get_doc(payload)
    doc.insert()
    frappe.db.commit()
    return {"reconciliation_item": doc.name}


@frappe.whitelist()
def update_quick_aux_record(
    doctype: str,
    name: str,
    data: dict | str | None = None,
) -> dict[str, str]:
    normalized_doctype = _normalize_aux_edit_doctype(doctype)
    _assert_write_permission(
        normalized_doctype, _("You do not have permission to update this record.")
    )

    record_name = (name or "").strip()
    if not record_name:
        frappe.throw(_("Record name is required."))
    doc = frappe.get_doc(normalized_doctype, record_name)
    doc.check_permission("write")

    payload = _parse_update_payload(data)
    _apply_aux_edit_payload(doc, payload)
    return update_aux_record_service(doc)


@frappe.whitelist()
def delete_quick_aux_record(
    doctype: str,
    name: str,
) -> dict[str, str | bool]:
    normalized_doctype = _normalize_aux_delete_doctype(doctype)
    _assert_delete_permission(
        normalized_doctype, _("You do not have permission to delete this record.")
    )

    record_name = (name or "").strip()
    if not record_name:
        frappe.throw(_("Record name is required."))
    doc = frappe.get_doc(normalized_doctype, record_name)
    doc.check_permission("delete")
    return delete_aux_record_service(doc)
