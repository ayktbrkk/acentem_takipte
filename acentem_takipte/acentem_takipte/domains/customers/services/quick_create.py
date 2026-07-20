from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint, nowdate

from acentem_takipte.acentem_takipte.api.quick_payloads import QuickPaymentPayload
from acentem_takipte.acentem_takipte.doctype.at_customer.at_customer import (
    normalize_customer_type,
)
from acentem_takipte.acentem_takipte.services.quick_create_core import (
    create_claim as create_claim_service,
    create_customer as create_customer_service,
    create_lead as create_lead_service,
    create_payment as create_payment_service,
)
from acentem_takipte.acentem_takipte.services.quick_create_helpers import (
    _assert_create_permission,
    _digits_only,
    _normalize_date,
    _normalize_link,
    _normalize_option,
    _resolve_office_branch,
    _split_full_name,
)
from acentem_takipte.acentem_takipte.services.quick_customer import (
    resolve_or_create_quick_customer,
)
from acentem_takipte.acentem_takipte.utils.normalization import (
    safe_float as shared_safe_float,
)
from acentem_takipte.acentem_takipte.utils.notes import normalize_note_text
from acentem_takipte.acentem_takipte.utils.statuses import (
    ATClaimStatus,
    ATLeadStatus,
    ATPaymentStatus,
)


@frappe.whitelist()
def create_quick_customer(
    customer_type: str | None = None,
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
    office_branch: str | None = None,
) -> dict[str, str]:
    _assert_create_permission(
        "AT Customer", _("You do not have permission to create customers.")
    )

    payload = {
        "doctype": "AT Customer",
        "customer_type": normalize_customer_type(customer_type, tax_id),
        "full_name": (full_name or "").strip(),
        "tax_id": _digits_only(tax_id),
        "phone": (phone or "").strip() or None,
        "email": (email or "").strip() or None,
        "address": (address or "").strip() or None,
        "office_branch": _resolve_office_branch(office_branch),
        "birth_date": birth_date or None,
        "gender": _normalize_option(
            gender, {"Unknown", "Male", "Female", "Other"}, default="Unknown"
        ),
        "marital_status": _normalize_option(
            marital_status,
            {"Unknown", "Single", "Married", "Divorced", "Widowed"},
            default="Unknown",
        ),
        "occupation": (occupation or "").strip() or None,
        "consent_status": _normalize_option(
            consent_status, {"Unknown", "Granted", "Revoked"}, default="Unknown"
        ),
        "assigned_agent": (assigned_agent or "").strip() or None,
    }

    return create_customer_service(payload)


@frappe.whitelist()
def create_quick_lead(
    full_name: str | None = None,
    first_name: str | None = None,
    last_name: str | None = None,
    customer_type: str | None = None,
    phone: str | None = None,
    tax_id: str | None = None,
    email: str | None = None,
    status: str | None = None,
    customer: str | None = None,
    sales_entity: str | None = None,
    insurance_company: str | None = None,
    branch: str | None = None,
    office_branch: str | None = None,
    estimated_gross_premium: float | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_create_permission(
        "AT Lead", _("You do not have permission to create leads.")
    )

    normalized_customer = _normalize_link("AT Customer", customer)
    resolved_office_branch = _resolve_office_branch(
        office_branch, customer=normalized_customer
    )
    full_name = (
        str(full_name or "").strip()
        or " ".join(
            part
            for part in [(first_name or "").strip(), (last_name or "").strip()]
            if part
        ).strip()
    )
    resolved_first_name, resolved_last_name = _split_full_name(full_name)
    auto_customer, _customer_created = resolve_or_create_quick_customer(
        customer=normalized_customer,
        full_name=full_name,
        customer_type=normalize_customer_type(customer_type, tax_id),
        tax_id=tax_id,
        phone=phone,
        email=email,
        office_branch=resolved_office_branch,
        require_customer=False,
    )

    payload = {
        "doctype": "AT Lead",
        "first_name": resolved_first_name,
        "last_name": resolved_last_name,
        "phone": (phone or "").strip() or None,
        "tax_id": _digits_only(tax_id) or None,
        "email": (email or "").strip() or None,
        "status": _normalize_option(
            status, set(ATLeadStatus.VALID), default=ATLeadStatus.OPEN
        ),
        "customer": auto_customer,
        "office_branch": resolved_office_branch,
        "sales_entity": _normalize_link("AT Sales Entity", sales_entity),
        "insurance_company": _normalize_link("AT Insurance Company", insurance_company),
        "branch": _normalize_link("AT Branch", branch),
        "estimated_gross_premium": shared_safe_float(estimated_gross_premium)
        if estimated_gross_premium not in {None, ""}
        else 0,
        "notes": normalize_note_text(notes),
    }

    return create_lead_service(payload)


@frappe.whitelist()
def create_quick_claim(
    policy: str | None = None,
    customer: str | None = None,
    office_branch: str | None = None,
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
    _assert_create_permission(
        "AT Claim", _("You do not have permission to create claims.")
    )

    today = _normalize_date(nowdate())
    incident = _normalize_date(incident_date) or today
    reported = _normalize_date(reported_date) or today

    payload = {
        "doctype": "AT Claim",
        "policy": _normalize_link("AT Policy", policy, required=True),
        "customer": _normalize_link("AT Customer", customer, required=True),
        "office_branch": _resolve_office_branch(
            office_branch, customer=customer, policy=policy
        ),
        "claim_no": (claim_no or "").strip() or None,
        "claim_type": _normalize_option(
            claim_type,
            {"Damage", "Health", "Theft", "Liability", "Other"},
            default="Damage",
        ),
        "claim_status": _normalize_option(
            claim_status, set(ATClaimStatus.VALID), default=ATClaimStatus.OPEN
        ),
        "incident_date": incident,
        "reported_date": reported,
        "currency": ((currency or "TRY").strip() or "TRY").upper(),
        "estimated_amount": shared_safe_float(estimated_amount)
        if estimated_amount not in {None, ""}
        else 0,
        "approved_amount": shared_safe_float(approved_amount)
        if approved_amount not in {None, ""}
        else 0,
        "notes": normalize_note_text(notes),
    }

    return create_claim_service(payload)


@frappe.whitelist()
def create_quick_payment(
    payload: QuickPaymentPayload | None = None,
    **kwargs,
) -> dict[str, str]:
    quick_payload = QuickPaymentPayload.from_input(payload, **kwargs)
    _assert_create_permission(
        "AT Payment", _("You do not have permission to create payments.")
    )
    today = _normalize_date(nowdate())
    normalized_customer = _normalize_link(
        "AT Customer", quick_payload.customer, required=True
    )
    normalized_policy = _normalize_link("AT Policy", quick_payload.policy)
    resolved_payment_date = quick_payload.payment_date or quick_payload.paid_date
    resolved_amount = quick_payload.amount
    if resolved_amount in {None, ""} and quick_payload.amount_try not in {None, ""}:
        resolved_amount = quick_payload.amount_try
    resolved_reference_no = quick_payload.reference_no or quick_payload.external_ref

    payload = {
        "doctype": "AT Payment",
        "customer": normalized_customer,
        "policy": normalized_policy,
        "claim": _normalize_link("AT Claim", quick_payload.claim),
        "office_branch": _resolve_office_branch(
            quick_payload.office_branch,
            customer=normalized_customer,
            policy=normalized_policy,
        ),
        "sales_entity": _normalize_link("AT Sales Entity", quick_payload.sales_entity),
        "payment_direction": _normalize_option(
            quick_payload.payment_direction, {"Inbound", "Outbound"}, default="Inbound"
        ),
        "payment_purpose": _normalize_option(
            quick_payload.payment_purpose,
            {"Premium Collection", "Commission Payout", "Claim Payout", "Other"},
            default="Premium Collection",
        ),
        "status": _normalize_option(
            quick_payload.status,
            set(ATPaymentStatus.VALID),
            default=ATPaymentStatus.DRAFT,
        ),
        "payment_date": _normalize_date(resolved_payment_date) or today,
        "due_date": _normalize_date(quick_payload.due_date)
        if quick_payload.due_date
        else None,
        "installment_count": max(cint(quick_payload.installment_count or 1), 1),
        "installment_interval_days": max(
            cint(quick_payload.installment_interval_days or 30), 1
        ),
        "currency": ((quick_payload.currency or "TRY").strip() or "TRY").upper(),
        "amount": shared_safe_float(resolved_amount)
        if resolved_amount not in {None, ""}
        else 0,
        "amount_try": shared_safe_float(resolved_amount)
        if resolved_amount not in {None, ""}
        else 0,
        "reference_no": (resolved_reference_no or "").strip() or None,
        "notes": normalize_note_text(quick_payload.notes),
    }

    return create_payment_service(payload)
