from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import add_days, cint, flt, getdate, nowdate

from acentem_takipte.acentem_takipte.api.security import (
    assert_authenticated,
    assert_doctype_permission,
)
from acentem_takipte.acentem_takipte.services.branches import (
    assert_office_branch_access,
    get_default_office_branch,
)
from acentem_takipte.acentem_takipte.services.quick_create import (
    create_campaign as create_campaign_service,
    create_call_note as create_call_note_service,
    create_claim as create_claim_service,
    create_customer_relation as create_customer_relation_service,
    create_customer as create_customer_service,
    create_insured_asset as create_insured_asset_service,
    create_lead as create_lead_service,
    create_ownership_assignment as create_ownership_assignment_service,
    create_activity as create_activity_service,
    create_reminder as create_reminder_service,
    create_payment as create_payment_service,
    create_policy as create_policy_service,
    create_renewal_task as create_renewal_task_service,
    create_segment as create_segment_service,
    create_task as create_task_service,
    delete_aux_record as delete_aux_record_service,
    update_aux_record as update_aux_record_service,
)
from acentem_takipte.acentem_takipte.services.quick_customer import resolve_or_create_quick_customer
from acentem_takipte.acentem_takipte.doctype.at_offer.at_offer import convert_to_policy as convert_offer_to_policy
from acentem_takipte.acentem_takipte.doctype.at_customer.at_customer import normalize_customer_type
from acentem_takipte.acentem_takipte.utils.notes import normalize_note_text
from acentem_takipte.acentem_takipte.utils.permissions import assert_mutation_access
from acentem_takipte.acentem_takipte.utils.statuses import (
    ATAccountingEntryStatus,
    ATClaimStatus,
    ATLeadStatus,
    ATPaymentStatus,
    ATPolicyStatus,
    ATReconciliationItemStatus,
    ATRenewalTaskStatus,
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
    _assert_create_permission("AT Customer", _("You do not have permission to create customers."))

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
    _assert_create_permission("AT Lead", _("You do not have permission to create leads."))

    normalized_customer = _normalize_link("AT Customer", customer)
    resolved_office_branch = _resolve_office_branch(office_branch, customer=normalized_customer)
    full_name = str(full_name or "").strip() or " ".join(
        part for part in [(first_name or "").strip(), (last_name or "").strip()] if part
    ).strip()
    resolved_first_name, resolved_last_name = _split_full_name(full_name)
    auto_customer, _ = resolve_or_create_quick_customer(
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
        "status": _normalize_option(status, set(ATLeadStatus.VALID), default=ATLeadStatus.OPEN),
        "customer": auto_customer,
        "office_branch": resolved_office_branch,
        "sales_entity": _normalize_link("AT Sales Entity", sales_entity),
        "insurance_company": _normalize_link("AT Insurance Company", insurance_company),
        "branch": _normalize_link("AT Branch", branch),
        "estimated_gross_premium": flt(estimated_gross_premium) if estimated_gross_premium not in {None, ""} else 0,
        "notes": normalize_note_text(notes),
    }

    return create_lead_service(payload)


@frappe.whitelist()
def create_quick_policy(
    customer: str | None = None,
    customer_full_name: str | None = None,
    customer_type: str | None = None,
    customer_tax_id: str | None = None,
    customer_phone: str | None = None,
    customer_email: str | None = None,
    sales_entity: str | None = None,
    insurance_company: str | None = None,
    branch: str | None = None,
    office_branch: str | None = None,
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
    _assert_create_permission("AT Policy", _("You do not have permission to create policies."))

    normalized_offer = _normalize_link("AT Offer", source_offer)

    if normalized_offer:
        return convert_offer_to_policy(
            offer_name=normalized_offer,
            start_date=start_date,
            end_date=end_date,
            commission_amount=commission_amount,
            tax_amount=tax_amount,
            net_premium=net_premium,
            policy_no=policy_no,
        )

    issue = getdate(issue_date) if issue_date else getdate(nowdate())
    start = getdate(start_date) if start_date else issue
    end = getdate(end_date) if end_date else add_days(start, 365)
    resolved_office_branch = _resolve_office_branch(office_branch, customer=customer)
    resolved_customer, _ = resolve_or_create_quick_customer(
        customer=customer,
        full_name=customer_full_name,
        customer_type=normalize_customer_type(customer_type, customer_tax_id),
        tax_id=customer_tax_id,
        phone=customer_phone,
        email=customer_email,
        office_branch=resolved_office_branch,
        require_customer=True,
    )

    payload = {
        "doctype": "AT Policy",
        "customer": resolved_customer,
        "office_branch": resolved_office_branch,
        "sales_entity": _normalize_link("AT Sales Entity", sales_entity, required=True),
        "insurance_company": _normalize_link("AT Insurance Company", insurance_company, required=True),
        "branch": _normalize_link("AT Branch", branch, required=True),
        "policy_no": (policy_no or "").strip() or None,
        "status": _normalize_option(status, set(ATPolicyStatus.VALID), default=ATPolicyStatus.ACTIVE),
        "issue_date": issue,
        "start_date": start,
        "end_date": end,
        "currency": ((currency or "TRY").strip() or "TRY").upper(),
        "net_premium": flt(net_premium) if net_premium not in {None, ""} else 0,
        "tax_amount": flt(tax_amount) if tax_amount not in {None, ""} else 0,
        "commission_amount": flt(commission_amount) if commission_amount not in {None, ""} else 0,
        "gross_premium": flt(gross_premium) if gross_premium not in {None, ""} else 0,
        "source_offer": None,
        "notes": normalize_note_text(notes),
    }

    return create_policy_service(payload)


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
    _assert_create_permission("AT Claim", _("You do not have permission to create claims."))

    today = getdate(nowdate())
    incident = getdate(incident_date) if incident_date else today
    reported = getdate(reported_date) if reported_date else today

    payload = {
        "doctype": "AT Claim",
        "policy": _normalize_link("AT Policy", policy, required=True),
        "customer": _normalize_link("AT Customer", customer, required=True),
        "office_branch": _resolve_office_branch(office_branch, customer=customer, policy=policy),
        "claim_no": (claim_no or "").strip() or None,
        "claim_type": _normalize_option(
            claim_type,
            {"Damage", "Health", "Theft", "Liability", "Other"},
            default="Damage",
        ),
        "claim_status": _normalize_option(claim_status, set(ATClaimStatus.VALID), default=ATClaimStatus.OPEN),
        "incident_date": incident,
        "reported_date": reported,
        "currency": ((currency or "TRY").strip() or "TRY").upper(),
        "estimated_amount": flt(estimated_amount) if estimated_amount not in {None, ""} else 0,
        "approved_amount": flt(approved_amount) if approved_amount not in {None, ""} else 0,
        "notes": normalize_note_text(notes),
    }

    return create_claim_service(payload)


@frappe.whitelist()
def create_quick_payment(
    customer: str | None = None,
    policy: str | None = None,
    claim: str | None = None,
    sales_entity: str | None = None,
    office_branch: str | None = None,
    payment_direction: str | None = None,
    payment_purpose: str | None = None,
    status: str | None = None,
    payment_date: str | None = None,
    due_date: str | None = None,
    installment_count: int | str | None = None,
    installment_interval_days: int | str | None = None,
    currency: str | None = None,
    amount: float | None = None,
    reference_no: str | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_create_permission("AT Payment", _("You do not have permission to create payments."))

    payload = {
        "doctype": "AT Payment",
        "customer": _normalize_link("AT Customer", customer, required=True),
        "policy": normalized_policy,
        "claim": _normalize_link("AT Claim", claim),
        "office_branch": _resolve_office_branch(office_branch, customer=customer, policy=policy),
        "sales_entity": _normalize_link("AT Sales Entity", sales_entity),
        "payment_direction": _normalize_option(payment_direction, {"Inbound", "Outbound"}, default="Inbound"),
        "payment_purpose": _normalize_option(
            payment_purpose,
            {"Premium Collection", "Commission Payout", "Claim Payout", "Other"},
            default="Premium Collection",
        ),
        "status": _normalize_option(status, set(ATPaymentStatus.VALID), default=ATPaymentStatus.DRAFT),
        "payment_date": getdate(payment_date) if payment_date else getdate(nowdate()),
        "due_date": getdate(due_date) if due_date else None,
        "installment_count": max(cint(installment_count or 1), 1),
        "installment_interval_days": max(cint(installment_interval_days or 30), 1),
        "currency": ((currency or "TRY").strip() or "TRY").upper(),
        "amount": flt(amount) if amount not in {None, ""} else 0,
        "reference_no": (reference_no or "").strip() or None,
        "notes": normalize_note_text(notes),
    }

    return create_payment_service(payload)


@frappe.whitelist()
def create_quick_renewal_task(
    policy: str | None = None,
    customer: str | None = None,
    office_branch: str | None = None,
    renewal_date: str | None = None,
    due_date: str | None = None,
    status: str | None = None,
    lost_reason_code: str | None = None,
    competitor_name: str | None = None,
    assigned_to: str | None = None,
    notes: str | None = None,
    auto_created: int | None = 0,
) -> dict[str, str]:
    _assert_create_permission("AT Renewal Task", _("You do not have permission to create renewal tasks."))

    today = getdate(nowdate())
    renewal = getdate(renewal_date) if renewal_date else add_days(today, 30)
    due = getdate(due_date) if due_date else add_days(renewal, -15)

    payload = {
        "doctype": "AT Renewal Task",
        "policy": _normalize_link("AT Policy", policy, required=True),
        "customer": _normalize_link("AT Customer", customer, required=True),
        "office_branch": _resolve_office_branch(office_branch, customer=customer, policy=policy),
        "renewal_date": renewal,
        "due_date": due,
        "status": _normalize_option(status, set(ATRenewalTaskStatus.VALID), default=ATRenewalTaskStatus.OPEN),
        "lost_reason_code": _normalize_option(
            lost_reason_code,
            {"Price", "Competitor", "Service", "Customer Declined", "Coverage Mismatch", "Other"},
            default="Competitor",
        )
        if (lost_reason_code or "").strip()
        else None,
        "competitor_name": (competitor_name or "").strip() or None,
        "assigned_to": (assigned_to or "").strip() or None,
        "notes": normalize_note_text(notes),
        "auto_created": 1 if str(auto_created or 0) in {"1", "true", "True"} else 0,
    }

    return create_renewal_task_service(payload)


@frappe.whitelist()
def create_quick_customer_relation(
    customer: str | None = None,
    related_customer: str | None = None,
    relation_type: str | None = None,
    is_household: int | str | bool | None = 0,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_create_permission("AT Customer Relation", _("You do not have permission to create customer relations."))

    payload = {
        "doctype": "AT Customer Relation",
        "customer": _normalize_link("AT Customer", customer, required=True),
        "related_customer": _normalize_link("AT Customer", related_customer, required=True),
        "relation_type": _normalize_option(
            relation_type,
            {"Spouse", "Child", "Parent", "Sibling", "Partner", "Household", "Other"},
            default="Other",
        ),
        "is_household": _as_check(is_household, default=0),
        "notes": normalize_note_text(notes),
    }
    return create_customer_relation_service(payload)


@frappe.whitelist()
def create_quick_insured_asset(
    customer: str | None = None,
    policy: str | None = None,
    asset_type: str | None = None,
    asset_label: str | None = None,
    asset_identifier: str | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_create_permission("AT Insured Asset", _("You do not have permission to create insured assets."))

    payload = {
        "doctype": "AT Insured Asset",
        "customer": _normalize_link("AT Customer", customer, required=True),
        "policy": normalized_policy,
        "asset_type": _normalize_option(
            asset_type,
            {"Vehicle", "Home", "Health Person", "Workplace", "Travel", "Boat", "Farm", "Other"},
            default="Other",
        ),
        "asset_label": (asset_label or "").strip(),
        "asset_identifier": (asset_identifier or "").strip() or None,
        "notes": normalize_note_text(notes),
    }
    return create_insured_asset_service(payload)


@frappe.whitelist()
def create_quick_call_note(
    customer: str | None = None,
    policy: str | None = None,
    claim: str | None = None,
    office_branch: str | None = None,
    channel: str | None = None,
    direction: str | None = None,
    call_status: str | None = None,
    call_outcome: str | None = None,
    note_at: str | None = None,
    next_follow_up_on: str | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_create_permission("AT Call Note", _("You do not have permission to create call notes."))

    payload = {
        "doctype": "AT Call Note",
        "customer": _normalize_link("AT Customer", customer, required=True),
        "policy": normalized_policy,
        "claim": _normalize_link("AT Claim", claim),
        "office_branch": _resolve_office_branch(office_branch, customer=customer, policy=policy),
        "channel": _normalize_option(channel, {"Phone Call", "WhatsApp Call", "Video Call", "Other"}, default="Phone Call"),
        "direction": _normalize_option(direction, {"Inbound", "Outbound"}, default="Outbound"),
        "call_status": _normalize_option(call_status, {"Planned", "Completed", "Missed", "No Answer", "Cancelled"}, default="Completed"),
        "call_outcome": (call_outcome or "").strip() or None,
        "note_at": note_at or frappe.utils.now_datetime(),
        "next_follow_up_on": getdate(next_follow_up_on) if next_follow_up_on else None,
        "notes": normalize_note_text(notes),
    }
    return create_call_note_service(payload)


@frappe.whitelist()
def create_quick_segment(
    segment_name: str | None = None,
    segment_type: str | None = None,
    channel_focus: str | None = None,
    office_branch: str | None = None,
    status: str | None = None,
    criteria_json: str | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_create_permission("AT Segment", _("You do not have permission to create segments."))

    payload = {
        "doctype": "AT Segment",
        "segment_name": (segment_name or "").strip(),
        "segment_type": _normalize_option(segment_type, {"Static", "Dynamic", "Operational"}, default="Static"),
        "channel_focus": _normalize_option(channel_focus, {"WHATSAPP", "SMS", "Email", "Phone Call"}, default="WHATSAPP"),
        "office_branch": _resolve_office_branch(office_branch),
        "status": _normalize_option(status, {"Draft", "Active", "Archived"}, default="Draft"),
        "criteria_json": (criteria_json or "").strip() or None,
        "notes": normalize_note_text(notes),
    }
    return create_segment_service(payload)


@frappe.whitelist()
def create_quick_campaign(
    campaign_name: str | None = None,
    segment: str | None = None,
    template: str | None = None,
    channel: str | None = None,
    office_branch: str | None = None,
    status: str | None = None,
    scheduled_for: str | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_create_permission("AT Campaign", _("You do not have permission to create campaigns."))

    payload = {
        "doctype": "AT Campaign",
        "campaign_name": (campaign_name or "").strip(),
        "segment": _normalize_link("AT Segment", segment, required=True),
        "template": _normalize_link("AT Notification Template", template),
        "channel": _normalize_option(channel, {"WHATSAPP", "SMS", "Email", "Phone Call"}, default="WHATSAPP"),
        "office_branch": _resolve_office_branch(office_branch),
        "status": _normalize_option(status, {"Draft", "Planned", "Running", "Completed", "Cancelled"}, default="Draft"),
        "scheduled_for": frappe.utils.get_datetime(scheduled_for) if scheduled_for else None,
        "notes": normalize_note_text(notes),
    }
    return create_campaign_service(payload)


@frappe.whitelist()
def create_quick_ownership_assignment(
    source_doctype: str | None = None,
    source_name: str | None = None,
    customer: str | None = None,
    policy: str | None = None,
    office_branch: str | None = None,
    assigned_to: str | None = None,
    assignment_role: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    due_date: str | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_create_permission("AT Ownership Assignment", _("You do not have permission to create ownership assignments."))

    normalized_source_doctype = _normalize_option(
        source_doctype,
        {"AT Customer", "AT Policy", "AT Claim", "AT Renewal Task", "AT Campaign"},
        default=None,
    )
    normalized_source_name = (source_name or "").strip() or None
    if normalized_source_doctype and normalized_source_name and not frappe.db.exists(normalized_source_doctype, normalized_source_name):
        frappe.throw(_("Linked source record was not found"))

    payload = {
        "doctype": "AT Ownership Assignment",
        "source_doctype": normalized_source_doctype,
        "source_name": normalized_source_name,
        "customer": normalized_customer,
        "policy": normalized_policy,
        "office_branch": _resolve_office_branch(office_branch, customer=customer, policy=policy),
        "assigned_to": _normalize_link("User", assigned_to, required=True),
        "assignment_role": _normalize_option(assignment_role, {"Owner", "Assignee", "Reviewer", "Follower"}, default="Owner"),
        "status": _normalize_option(status, {"Open", "In Progress", "Blocked", "Done", "Cancelled"}, default="Open"),
        "priority": _normalize_option(priority, {"Low", "Normal", "High", "Critical"}, default="Normal"),
        "due_date": getdate(due_date) if due_date else None,
        "notes": normalize_note_text(notes),
    }
    return create_ownership_assignment_service(payload)


@frappe.whitelist()
def create_quick_task(
    task_title: str | None = None,
    task_type: str | None = None,
    source_doctype: str | None = None,
    source_name: str | None = None,
    customer: str | None = None,
    policy: str | None = None,
    claim: str | None = None,
    office_branch: str | None = None,
    assigned_to: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    due_date: str | None = None,
    reminder_at: str | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_create_permission("AT Task", _("You do not have permission to create tasks."))

    normalized_source_doctype = _normalize_option(
        source_doctype,
        {"AT Customer", "AT Policy", "AT Claim", "AT Renewal Task", "AT Campaign", "AT Ownership Assignment", "AT Call Note"},
        default=None,
    )
    normalized_source_name = (source_name or "").strip() or None
    if normalized_source_doctype and normalized_source_name and not frappe.db.exists(normalized_source_doctype, normalized_source_name):
        frappe.throw(_("Linked source record was not found"))

    payload = {
        "doctype": "AT Task",
        "task_title": (task_title or "").strip(),
        "task_type": _normalize_option(task_type, {"Follow-up", "Visit", "Call", "Collection", "Claim", "Renewal", "Review", "Other"}, default="Follow-up"),
        "source_doctype": normalized_source_doctype,
        "source_name": normalized_source_name,
        "customer": normalized_customer,
        "policy": normalized_policy,
        "claim": _normalize_link("AT Claim", claim),
        "office_branch": _resolve_office_branch(office_branch, customer=customer, policy=policy),
        "assigned_to": _normalize_link("User", assigned_to, required=True),
        "status": _normalize_option(status, {"Open", "In Progress", "Blocked", "Done", "Cancelled"}, default="Open"),
        "priority": _normalize_option(priority, {"Low", "Normal", "High", "Critical"}, default="Normal"),
        "due_date": getdate(due_date) if due_date else None,
        "reminder_at": frappe.utils.get_datetime(reminder_at) if reminder_at else None,
        "notes": normalize_note_text(notes),
    }
    return create_task_service(payload)


@frappe.whitelist()
def create_quick_activity(
    activity_title: str | None = None,
    activity_type: str | None = None,
    source_doctype: str | None = None,
    source_name: str | None = None,
    customer: str | None = None,
    policy: str | None = None,
    claim: str | None = None,
    office_branch: str | None = None,
    assigned_to: str | None = None,
    activity_at: str | None = None,
    status: str | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_create_permission("AT Activity", _("You do not have permission to create activities."))

    payload = {
        "doctype": "AT Activity",
        "activity_title": (activity_title or "").strip(),
        "activity_type": _normalize_option(
            activity_type,
            {"Call", "Visit", "Note", "Claim Update", "Renewal Update", "Collection", "Campaign", "Review", "Other"},
            default="Note",
        ),
        "source_doctype": _normalize_doctype_or_blank(source_doctype),
        "source_name": _normalize_source_name(source_doctype, source_name),
        "customer": _normalize_link("AT Customer", customer) if (customer or "").strip() else None,
        "policy": _normalize_link("AT Policy", policy) if (policy or "").strip() else None,
        "claim": _normalize_link("AT Claim", claim) if (claim or "").strip() else None,
        "office_branch": _resolve_office_branch(office_branch, customer=customer, policy=policy),
        "assigned_to": _normalize_link("User", assigned_to) if (assigned_to or "").strip() else None,
        "activity_at": frappe.utils.get_datetime(activity_at) if activity_at else frappe.utils.now_datetime(),
        "status": _normalize_option(status, {"Logged", "Shared", "Archived"}, default="Logged"),
        "notes": normalize_note_text(notes),
    }
    return create_activity_service(payload)


@frappe.whitelist()
def create_quick_reminder(
    reminder_title: str | None = None,
    source_doctype: str | None = None,
    source_name: str | None = None,
    customer: str | None = None,
    policy: str | None = None,
    claim: str | None = None,
    office_branch: str | None = None,
    assigned_to: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    remind_at: str | None = None,
    notes: str | None = None,
) -> dict[str, str]:
    _assert_create_permission("AT Reminder", _("You do not have permission to create reminders."))

    normalized_source_doctype = _normalize_option(
        source_doctype,
        {"AT Customer", "AT Policy", "AT Claim", "AT Renewal Task", "AT Campaign", "AT Ownership Assignment", "AT Call Note", "AT Task"},
        default=None,
    )
    normalized_source_name = (source_name or "").strip() or None
    if normalized_source_doctype and normalized_source_name and not frappe.db.exists(normalized_source_doctype, normalized_source_name):
        frappe.throw(_("Linked source record was not found"))

    payload = {
        "doctype": "AT Reminder",
        "reminder_title": (reminder_title or "").strip(),
        "source_doctype": normalized_source_doctype,
        "source_name": normalized_source_name,
        "customer": normalized_customer,
        "policy": normalized_policy,
        "claim": _normalize_link("AT Claim", claim),
        "office_branch": _resolve_office_branch(office_branch, customer=customer, policy=policy),
        "assigned_to": _normalize_link("User", assigned_to, required=True),
        "status": _normalize_option(status, {"Open", "Done", "Cancelled"}, default="Open"),
        "priority": _normalize_option(priority, {"Low", "Normal", "High", "Critical"}, default="Normal"),
        "remind_at": frappe.utils.get_datetime(remind_at) if remind_at else frappe.utils.now_datetime(),
        "notes": normalize_note_text(notes),
    }
    return create_reminder_service(payload)


@frappe.whitelist()
def create_quick_insurance_company(
    company_name: str | None = None,
    company_code: str | None = None,
    is_active: int | str | bool | None = 1,
) -> dict[str, str]:
    _assert_create_permission("AT Insurance Company", _("You do not have permission to create insurance companies."))

    payload = {
        "doctype": "AT Insurance Company",
        "company_name": (company_name or "").strip(),
        "company_code": (company_code or "").strip() or None,
        "is_active": _as_check(is_active, default=1),
    }
    doc = frappe.get_doc(payload)
    doc.insert()
    frappe.db.commit()
    return {"company": doc.name}


@frappe.whitelist()
def create_quick_branch(
    branch_name: str | None = None,
    branch_code: str | None = None,
    insurance_company: str | None = None,
    is_active: int | str | bool | None = 1,
) -> dict[str, str]:
    _assert_create_permission("AT Branch", _("You do not have permission to create branches."))

    payload = {
        "doctype": "AT Branch",
        "branch_name": (branch_name or "").strip(),
        "branch_code": (branch_code or "").strip() or None,
        "insurance_company": _normalize_link("AT Insurance Company", insurance_company),
        "is_active": _as_check(is_active, default=1),
    }
    doc = frappe.get_doc(payload)
    doc.insert()
    frappe.db.commit()
    return {"branch": doc.name}


@frappe.whitelist()
def create_quick_sales_entity(
    entity_type: str | None = None,
    full_name: str | None = None,
    parent_entity: str | None = None,
) -> dict[str, str]:
    _assert_create_permission("AT Sales Entity", _("You do not have permission to create sales entities."))

    payload = {
        "doctype": "AT Sales Entity",
        "entity_type": _normalize_option(entity_type, {"Agency", "Sub-Account", "Representative"}, default="Agency"),
        "full_name": (full_name or "").strip(),
        "parent_entity": _normalize_link("AT Sales Entity", parent_entity),
    }
    doc = frappe.get_doc(payload)
    doc.insert()
    frappe.db.commit()
    return {"sales_entity": doc.name}


@frappe.whitelist()
def create_quick_notification_template(
    template_key: str | None = None,
    event_key: str | None = None,
    channel: str | None = None,
    content_mode: str | None = None,
    language: str | None = None,
    provider_template_name: str | None = None,
    provider_template_category: str | None = None,
    variables_schema_json: str | None = None,
    subject: str | None = None,
    body_template: str | None = None,
    sms_body_template: str | None = None,
    email_body_template: str | None = None,
    whatsapp_body_template: str | None = None,
    is_active: int | str | bool | None = 1,
) -> dict[str, str]:
    _assert_create_permission("AT Notification Template", _("You do not have permission to create notification templates."))

    payload = {
        "doctype": "AT Notification Template",
        "template_key": (template_key or "").strip(),
        "event_key": (event_key or "").strip(),
        "channel": _normalize_option(channel, {"SMS", "Email", "WHATSAPP", "Both"}, default="Both"),
        "content_mode": _normalize_option(content_mode, {"freeform", "template"}, default="freeform"),
        "language": _normalize_option(language, {"tr", "en"}, default="tr"),
        "provider_template_name": (provider_template_name or "").strip() or None,
        "provider_template_category": _normalize_option(
            provider_template_category,
            {"UTILITY", "MARKETING", "AUTHENTICATION"},
            default="UTILITY",
        ),
        "variables_schema_json": (variables_schema_json or "").strip() or None,
        "subject": (subject or "").strip() or None,
        "body_template": (body_template or "").strip(),
        "sms_body_template": (sms_body_template or "").strip() or None,
        "email_body_template": (email_body_template or "").strip() or None,
        "whatsapp_body_template": (whatsapp_body_template or "").strip() or None,
        "is_active": _as_check(is_active, default=1),
    }
    doc = frappe.get_doc(payload)
    doc.insert()
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
    office_branch: str | None = None,
    insurance_company: str | None = None,
    currency: str | None = None,
    local_amount: float | None = None,
    local_amount_try: float | None = None,
    external_amount: float | None = None,
    external_amount_try: float | None = None,
    external_ref: str | None = None,
) -> dict[str, str]:
    _assert_create_permission("AT Accounting Entry", _("You do not have permission to create accounting entries."))

    source_dt = (source_doctype or "").strip()
    source_nm = (source_name or "").strip()
    normalized_policy = _normalize_link("AT Policy", policy)
    normalized_customer = _normalize_link("AT Customer", customer)

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
        "entry_type": _normalize_option(entry_type, {"Policy", "Payment", "Claim"}, default="Policy"),
        "status": _normalize_option(status, set(ATAccountingEntryStatus.VALID), default=ATAccountingEntryStatus.DRAFT),
        "policy": normalized_policy,
        "customer": normalized_customer,
        "office_branch": _resolve_office_branch(office_branch, customer=customer, policy=policy),
        "insurance_company": _normalize_link("AT Insurance Company", insurance_company),
        "currency": ((currency or "TRY").strip() or "TRY").upper(),
        "local_amount": flt(local_amount) if local_amount not in {None, ""} else 0,
        "local_amount_try": flt(local_amount_try) if local_amount_try not in {None, ""} else 0,
        "external_amount": flt(external_amount) if external_amount not in {None, ""} else 0,
        "external_amount_try": flt(external_amount_try) if external_amount_try not in {None, ""} else 0,
        "external_ref": (external_ref or "").strip() or None,
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
    _assert_create_permission("AT Reconciliation Item", _("You do not have permission to create reconciliation items."))

    source_dt = _normalize_doctype_or_blank(source_doctype)
    source_nm = _normalize_source_name(source_doctype, source_name)
    if accounting_entry:
        accounting_entry_doc = frappe.get_doc("AT Accounting Entry", _normalize_link("AT Accounting Entry", accounting_entry, required=True))
        source_dt = accounting_entry_doc.source_doctype or ""
        source_nm = accounting_entry_doc.source_name or ""

    payload = {
        "doctype": "AT Reconciliation Item",
        "accounting_entry": _normalize_link("AT Accounting Entry", accounting_entry, required=True),
        "source_doctype": source_dt,
        "source_name": source_nm,
        "status": _normalize_option(status, set(ATReconciliationItemStatus.RESOLUTION_REQUIRED | ATReconciliationItemStatus.CLOSED), default=ATReconciliationItemStatus.OPEN),
        "mismatch_type": _normalize_option(
            mismatch_type,
            {"Amount", "Currency", "Missing External", "Missing Local", "Status", "Other"},
            default="Amount",
        ),
        "local_amount_try": flt(local_amount_try) if local_amount_try not in {None, ""} else 0,
        "external_amount_try": flt(external_amount_try) if external_amount_try not in {None, ""} else 0,
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
    _assert_write_permission(normalized_doctype, _("You do not have permission to update this record."))

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
    _assert_delete_permission(normalized_doctype, _("You do not have permission to delete this record."))

    record_name = (name or "").strip()
    if not record_name:
        frappe.throw(_("Record name is required."))
    doc = frappe.get_doc(normalized_doctype, record_name)
    doc.check_permission("delete")
    return delete_aux_record_service(doc)


MAX_QUICK_OPTION_SEARCH_LIMIT = 50

QUICK_OPTION_SEARCH_SOURCES: dict[str, dict] = {
    "customers": {
        "doctype": "AT Customer",
        "display_fields": ["full_name", "customer_type", "tax_id"],
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
    "insuredAssets": {
        "doctype": "AT Insured Asset",
        "display_fields": ["asset_label", "asset_type", "asset_identifier"],
        "search_fields": ["name", "asset_label", "asset_type", "asset_identifier", "customer", "policy"],
        "order_by": "modified desc",
    },
    "segments": {
        "doctype": "AT Segment",
        "display_fields": ["segment_name", "segment_type", "status"],
        "search_fields": ["name", "segment_name", "segment_type", "channel_focus", "status"],
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
        description = _join_non_empty([_value_or_fallback(row, "status"), _value_or_fallback(row, "offer_date")])
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
        description = _join_non_empty([_value_or_fallback(row, "channel"), _value_or_fallback(row, "language")])
    elif source_key == "accountingEntries":
        source = _join_non_empty([_value_or_fallback(row, "source_doctype"), _value_or_fallback(row, "source_name")])
        label = f"{name} - {source}" if source else name
        description = _join_non_empty([_value_or_fallback(row, "status"), _value_or_fallback(row, "external_ref")])
    elif source_key == "insuredAssets":
        asset_label = _value_or_fallback(row, "asset_label", name)
        label = asset_label
        description = _join_non_empty([_value_or_fallback(row, "asset_type"), _value_or_fallback(row, "asset_identifier")])

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
    assert_mutation_access(
        action=f"api.quick_create.create_{doctype.lower().replace(' ', '_')}",
        roles=("System Manager", "Manager", "Agent", "Accountant"),
        doctype_permissions=(doctype,),
        permtype="create",
        details={"doctype": doctype, "permtype": "create"},
        role_message=message,
        post_message="Only POST requests are allowed for quick create/update operations.",
    )


def _assert_write_permission(doctype: str, message: str) -> None:
    assert_mutation_access(
        action=f"api.quick_create.update_{doctype.lower().replace(' ', '_')}",
        roles=("System Manager", "Manager", "Agent", "Accountant"),
        doctype_permissions=(doctype,),
        permtype="write",
        details={"doctype": doctype, "permtype": "write"},
        role_message=message,
        post_message="Only POST requests are allowed for quick create/update operations.",
    )


def _assert_delete_permission(doctype: str, message: str) -> None:
    assert_mutation_access(
        action=f"api.quick_create.delete_{doctype.lower().replace(' ', '_')}",
        roles=("System Manager", "Manager", "Agent", "Accountant"),
        doctype_permissions=(doctype,),
        permtype="delete",
        details={"doctype": doctype, "permtype": "delete"},
        role_message=message,
        post_message="Only POST requests are allowed for quick create/update operations.",
    )


def _digits_only(value: str | None) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _split_full_name(full_name: str | None) -> tuple[str, str | None]:
    cleaned = " ".join(str(full_name or "").strip().split())
    if not cleaned:
        frappe.throw(_("Full name is required."))
    parts = cleaned.split(" ")
    if len(parts) == 1:
        return parts[0], None
    return " ".join(parts[:-1]), parts[-1]


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


def _resolve_office_branch(
    office_branch: str | None = None,
    *,
    customer: str | None = None,
    policy: str | None = None,
) -> str | None:
    explicit_branch = _normalize_link("AT Office Branch", office_branch) if office_branch else None
    if explicit_branch:
        return assert_office_branch_access(explicit_branch)

    policy_name = (policy or "").strip()
    if policy_name and frappe.db.exists("AT Policy", policy_name):
        policy_branch = frappe.db.get_value("AT Policy", policy_name, "office_branch")
        if policy_branch:
            return policy_branch

    customer_name = (customer or "").strip()
    if customer_name and frappe.db.exists("AT Customer", customer_name):
        customer_branch = frappe.db.get_value("AT Customer", customer_name, "office_branch")
        if customer_branch:
            return customer_branch

    return get_default_office_branch()


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
    "AT Call Note": {
        "customer",
        "policy",
        "claim",
        "office_branch",
        "channel",
        "direction",
        "call_status",
        "call_outcome",
        "note_at",
        "next_follow_up_on",
        "notes",
    },
    "AT Segment": {
        "segment_name",
        "segment_type",
        "channel_focus",
        "office_branch",
        "status",
        "criteria_json",
        "notes",
    },
    "AT Campaign": {
        "campaign_name",
        "segment",
        "template",
        "channel",
        "office_branch",
        "status",
        "scheduled_for",
        "notes",
    },
    "AT Claim": {
        "assigned_expert",
        "claim_status",
        "rejection_reason",
        "appeal_status",
        "next_follow_up_on",
        "approved_amount",
        "notes",
    },
    "AT Customer Relation": {"customer", "related_customer", "relation_type", "is_household", "notes"},
    "AT Insured Asset": {"customer", "policy", "asset_type", "asset_label", "asset_identifier", "notes"},
    "AT Ownership Assignment": {
        "source_doctype",
        "source_name",
        "customer",
        "policy",
        "office_branch",
        "assigned_to",
        "assignment_role",
        "status",
        "priority",
        "due_date",
        "notes",
    },
    "AT Task": {
        "task_title",
        "task_type",
        "source_doctype",
        "source_name",
        "customer",
        "policy",
        "claim",
        "office_branch",
        "assigned_to",
        "status",
        "priority",
        "due_date",
        "reminder_at",
        "notes",
    },
    "AT Activity": {
        "activity_title",
        "activity_type",
        "source_doctype",
        "source_name",
        "customer",
        "policy",
        "claim",
        "office_branch",
        "assigned_to",
        "activity_at",
        "status",
        "notes",
    },
    "AT Reminder": {
        "reminder_title",
        "source_doctype",
        "source_name",
        "customer",
        "policy",
        "claim",
        "office_branch",
        "assigned_to",
        "status",
        "priority",
        "remind_at",
        "notes",
    },
    "AT Insurance Company": {"company_name", "company_code", "is_active"},
    "AT Branch": {"branch_name", "branch_code", "insurance_company", "is_active"},
    "AT Sales Entity": {"entity_type", "full_name", "parent_entity"},
    "AT Notification Template": {
        "template_key",
        "event_key",
        "channel",
        "content_mode",
        "language",
        "provider_template_name",
        "provider_template_category",
        "variables_schema_json",
        "subject",
        "body_template",
        "sms_body_template",
        "email_body_template",
        "whatsapp_body_template",
        "is_active",
    },
    "AT Accounting Entry": {
        "source_doctype",
        "source_name",
        "entry_type",
        "status",
        "policy",
        "customer",
        "office_branch",
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


def _normalize_aux_delete_doctype(doctype: str | None) -> str:
    value = (doctype or "").strip()
    if value not in {"AT Customer Relation", "AT Insured Asset", "AT Ownership Assignment"}:
        frappe.throw(_("Unsupported quick delete doctype: {0}").format(value))
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
        if field in {
            "company_name",
            "company_code",
            "branch_name",
            "branch_code",
            "full_name",
            "template_key",
            "event_key",
            "provider_template_name",
            "variables_schema_json",
            "subject",
            "body_template",
            "sms_body_template",
            "email_body_template",
            "whatsapp_body_template",
            "external_ref",
            "notes",
        }:
            setattr(doc, field, (value or "").strip() or None)
            continue
        if field in {"is_active"}:
            setattr(doc, field, _as_check(value))
            continue
        if field in {"insurance_company"}:
            setattr(doc, field, _normalize_link("AT Insurance Company", value))
            continue
        if field in {"segment"}:
            setattr(doc, field, _normalize_link("AT Segment", value, required=True))
            continue
        if field in {"template"}:
            setattr(doc, field, _normalize_link("AT Notification Template", value))
            continue
        if field in {"customer", "related_customer"} and doc.doctype == "AT Customer Relation":
            setattr(doc, field, _normalize_link("AT Customer", value, required=True))
            continue
        if field in {"customer"} and doc.doctype == "AT Insured Asset":
            setattr(doc, field, _normalize_link("AT Customer", value, required=True))
            continue
        if field in {"policy"} and doc.doctype == "AT Insured Asset":
            setattr(doc, field, _normalize_link("AT Policy", value))
            continue
        if field in {"customer"} and doc.doctype == "AT Ownership Assignment":
            setattr(doc, field, _normalize_link("AT Customer", value))
            continue
        if field in {"policy"} and doc.doctype == "AT Ownership Assignment":
            setattr(doc, field, _normalize_link("AT Policy", value))
            continue
        if field in {"assigned_to"} and doc.doctype == "AT Ownership Assignment":
            setattr(doc, field, _normalize_link("User", value, required=True))
            continue
        if field in {"assigned_to"} and doc.doctype == "AT Task":
            setattr(doc, field, _normalize_link("User", value, required=True))
            continue
        if field in {"assigned_to"} and doc.doctype == "AT Reminder":
            setattr(doc, field, _normalize_link("User", value, required=True))
            continue
        if field in {"source_doctype"} and doc.doctype == "AT Ownership Assignment":
            setattr(doc, field, _normalize_option(value, {"AT Customer", "AT Policy", "AT Claim", "AT Renewal Task", "AT Campaign"}, default=None))
            continue
        if field in {"source_doctype"} and doc.doctype == "AT Task":
            setattr(doc, field, _normalize_option(value, {"AT Customer", "AT Policy", "AT Claim", "AT Renewal Task", "AT Campaign", "AT Ownership Assignment", "AT Call Note"}, default=None))
            continue
        if field in {"source_doctype"} and doc.doctype == "AT Reminder":
            setattr(doc, field, _normalize_option(value, {"AT Customer", "AT Policy", "AT Claim", "AT Renewal Task", "AT Campaign", "AT Ownership Assignment", "AT Call Note", "AT Task"}, default=None))
            continue
        if field in {"source_name"} and doc.doctype == "AT Ownership Assignment":
            setattr(doc, field, (value or "").strip() or None)
            continue
        if field in {"source_name"} and doc.doctype == "AT Task":
            setattr(doc, field, (value or "").strip() or None)
            continue
        if field in {"source_name"} and doc.doctype == "AT Reminder":
            setattr(doc, field, (value or "").strip() or None)
            continue
        if field in {"office_branch"} and doc.doctype == "AT Ownership Assignment":
            setattr(doc, field, _normalize_link("AT Office Branch", value))
            continue
        if field in {"office_branch"} and doc.doctype == "AT Task":
            setattr(doc, field, _normalize_link("AT Office Branch", value))
            continue
        if field in {"office_branch"} and doc.doctype == "AT Reminder":
            setattr(doc, field, _normalize_link("AT Office Branch", value))
            continue
        if field in {"relation_type"}:
            setattr(doc, field, _normalize_option(value, {"Spouse", "Child", "Parent", "Sibling", "Partner", "Household", "Other"}, default="Other"))
            continue
        if field in {"asset_type"}:
            setattr(doc, field, _normalize_option(value, {"Vehicle", "Home", "Health Person", "Workplace", "Travel", "Boat", "Farm", "Other"}, default="Other"))
            continue
        if field in {"asset_label", "asset_identifier"}:
            setattr(doc, field, (value or "").strip() or None)
            continue
        if field in {"parent_entity"}:
            setattr(doc, field, _normalize_link("AT Sales Entity", value))
            continue
        if field in {"entity_type"}:
            setattr(doc, field, _normalize_option(value, {"Agency", "Sub-Account", "Representative"}, default="Agency"))
            continue
        if field in {"channel"}:
            setattr(doc, field, _normalize_option(value, {"SMS", "Email", "WHATSAPP", "Both"}, default="Both"))
            continue
        if field in {"content_mode"}:
            setattr(doc, field, _normalize_option(value, {"freeform", "template"}, default="freeform"))
            continue
        if field in {"language"}:
            setattr(doc, field, _normalize_option(value, {"tr", "en"}, default="tr"))
            continue
        if field in {"provider_template_category"}:
            setattr(doc, field, _normalize_option(value, {"UTILITY", "MARKETING", "AUTHENTICATION"}, default="UTILITY"))
            continue
        if field in {"segment_type"}:
            setattr(doc, field, _normalize_option(value, {"Static", "Dynamic", "Operational"}, default="Static"))
            continue
        if field in {"channel_focus"}:
            setattr(doc, field, _normalize_option(value, {"WHATSAPP", "SMS", "Email", "Phone Call"}, default="WHATSAPP"))
            continue
        if field in {"assignment_role"}:
            setattr(doc, field, _normalize_option(value, {"Owner", "Assignee", "Reviewer", "Follower"}, default="Owner"))
            continue
        if field in {"task_type"}:
            setattr(doc, field, _normalize_option(value, {"Follow-up", "Visit", "Call", "Collection", "Claim", "Renewal", "Review", "Other"}, default="Follow-up"))
            continue
        if field in {"priority"}:
            setattr(doc, field, _normalize_option(value, {"Low", "Normal", "High", "Critical"}, default="Normal"))
            continue
        if field in {"criteria_json"}:
            setattr(doc, field, (value or "").strip() or None)
            continue
        if field in {"status"} and doc.doctype == "AT Ownership Assignment":
            setattr(doc, field, _normalize_option(value, {"Open", "In Progress", "Blocked", "Done", "Cancelled"}, default="Open"))
            continue
        if field in {"status"} and doc.doctype == "AT Task":
            setattr(doc, field, _normalize_option(value, {"Open", "In Progress", "Blocked", "Done", "Cancelled"}, default="Open"))
            continue
        if field in {"status"} and doc.doctype == "AT Reminder":
            setattr(doc, field, _normalize_option(value, {"Open", "Done", "Cancelled"}, default="Open"))
            continue
        if field in {"due_date"} and doc.doctype == "AT Ownership Assignment":
            setattr(doc, field, getdate(value) if value else None)
            continue
        if field in {"due_date"} and doc.doctype == "AT Task":
            setattr(doc, field, getdate(value) if value else None)
            continue
        if field in {"reminder_at"} and doc.doctype == "AT Task":
            setattr(doc, field, frappe.utils.get_datetime(value) if value else None)
            continue
        if field in {"remind_at"} and doc.doctype == "AT Reminder":
            setattr(doc, field, frappe.utils.get_datetime(value) if value else None)
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
            setattr(doc, field, _normalize_option(value, set(ATAccountingEntryStatus.VALID), default=ATAccountingEntryStatus.DRAFT))
            continue
        if field in {"status"} and doc.doctype == "AT Reconciliation Item":
            setattr(
                doc,
                field,
                _normalize_option(
                    value,
                    set(ATReconciliationItemStatus.RESOLUTION_REQUIRED | ATReconciliationItemStatus.CLOSED),
                    default=ATReconciliationItemStatus.OPEN,
                ),
            )
            continue
        if field in {"status"} and doc.doctype == "AT Segment":
            setattr(doc, field, _normalize_option(value, {"Draft", "Active", "Archived"}, default="Draft"))
            continue
        if field in {"status"} and doc.doctype == "AT Campaign":
            setattr(doc, field, _normalize_option(value, {"Draft", "Planned", "Running", "Completed", "Cancelled"}, default="Draft"))
            continue
        if field in {"channel"} and doc.doctype == "AT Campaign":
            setattr(doc, field, _normalize_option(value, {"WHATSAPP", "SMS", "Email", "Phone Call"}, default="WHATSAPP"))
            continue
        if field in {"policy"}:
            setattr(doc, field, _normalize_link("AT Policy", value))
            continue
        if field in {"claim"}:
            setattr(doc, field, _normalize_link("AT Claim", value))
            continue
        if field in {"customer"}:
            setattr(doc, field, _normalize_link("AT Customer", value))
            continue
        if field in {"office_branch"}:
            setattr(doc, field, _normalize_link("AT Office Branch", value))
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
        if field in {"scheduled_for"}:
            setattr(doc, field, frappe.utils.get_datetime(value) if value else None)
            continue

