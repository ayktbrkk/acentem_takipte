from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import add_days, nowdate

from acentem_takipte.acentem_takipte.api.quick_payloads import (
    QuickPolicyPayload,
    QuickTaskPayload,
)
from acentem_takipte.acentem_takipte.doctype.at_customer.at_customer import (
    normalize_customer_type,
)
from acentem_takipte.acentem_takipte.doctype.at_offer.at_offer import (
    convert_to_policy as convert_offer_to_policy,
)
from acentem_takipte.acentem_takipte.services.quick_create import (
    create_policy as create_policy_service,
    create_task as create_task_service,
)
from acentem_takipte.acentem_takipte.services.quick_create_helpers import (
    _assert_create_permission,
    _digits_only,
    _normalize_date,
    _normalize_datetime,
    _normalize_link,
    _normalize_option,
    _resolve_office_branch,
)
from acentem_takipte.acentem_takipte.services.quick_customer import (
    resolve_or_create_quick_customer,
)
from acentem_takipte.acentem_takipte.utils.normalization import (
    safe_float as shared_safe_float,
)
from acentem_takipte.acentem_takipte.utils.notes import normalize_note_text
from acentem_takipte.acentem_takipte.utils.statuses import ATPolicyStatus


@frappe.whitelist()
def create_quick_policy(
    payload: QuickPolicyPayload | None = None,
    **kwargs,
) -> dict[str, str]:
    quick_payload = QuickPolicyPayload.from_input(payload, **kwargs)
    _assert_create_permission(
        "AT Policy", _("You do not have permission to create policies.")
    )

    normalized_offer = _normalize_link("AT Offer", quick_payload.source_offer)

    if normalized_offer:
        return convert_offer_to_policy(
            offer_name=normalized_offer,
            start_date=quick_payload.start_date,
            end_date=quick_payload.end_date,
            commission_amount=quick_payload.commission_amount,
            tax_amount=quick_payload.tax_amount,
            net_premium=quick_payload.net_premium,
            policy_no=quick_payload.policy_no,
        )

    today = _normalize_date(nowdate())
    issue = _normalize_date(quick_payload.issue_date) or today
    start = _normalize_date(quick_payload.start_date) or issue
    end = _normalize_date(quick_payload.end_date) or add_days(start, 365)
    resolved_office_branch = _resolve_office_branch(
        quick_payload.office_branch, customer=quick_payload.customer
    )
    normalized_customer_type = normalize_customer_type(
        quick_payload.customer_type, quick_payload.customer_tax_id
    )
    normalized_birth_date = (
        _normalize_date(quick_payload.customer_birth_date)
        if quick_payload.customer_birth_date
        else None
    )
    resolved_customer, _customer_created = resolve_or_create_quick_customer(
        customer=quick_payload.customer,
        full_name=quick_payload.customer_full_name,
        customer_type=normalized_customer_type,
        tax_id=quick_payload.customer_tax_id,
        phone=quick_payload.customer_phone,
        email=quick_payload.customer_email,
        office_branch=resolved_office_branch,
        birth_date=normalized_birth_date
        if normalized_customer_type != "Corporate"
        else None,
        require_customer=True,
    )

    payload = {
        "doctype": "AT Policy",
        "customer": resolved_customer,
        "office_branch": resolved_office_branch,
        "sales_entity": _normalize_link(
            "AT Sales Entity", quick_payload.sales_entity, required=True
        ),
        "insurance_company": _normalize_link(
            "AT Insurance Company", quick_payload.insurance_company, required=True
        ),
        "branch": _normalize_link("AT Branch", quick_payload.branch, required=True),
        "policy_no": (quick_payload.policy_no or "").strip() or None,
        "status": _normalize_option(
            quick_payload.status, set(ATPolicyStatus.VALID), default=ATPolicyStatus.ACTIVE
        ),
        "issue_date": issue,
        "start_date": start,
        "end_date": end,
        "currency": ((quick_payload.currency or "TRY").strip() or "TRY").upper(),
        "net_premium": shared_safe_float(quick_payload.net_premium)
        if quick_payload.net_premium not in {None, ""}
        else 0,
        "tax_amount": shared_safe_float(quick_payload.tax_amount)
        if quick_payload.tax_amount not in {None, ""}
        else 0,
        "commission_amount": shared_safe_float(quick_payload.commission_amount)
        if quick_payload.commission_amount not in {None, ""}
        else 0,
        "gross_premium": shared_safe_float(quick_payload.gross_premium)
        if quick_payload.gross_premium not in {None, ""}
        else 0,
        "source_offer": None,
        "notes": normalize_note_text(quick_payload.notes),
    }

    return create_policy_service(payload)


@frappe.whitelist()
def create_quick_task(
    payload: QuickTaskPayload | None = None,
    **kwargs,
) -> dict[str, str]:
    quick_payload = QuickTaskPayload.from_input(payload, **kwargs)
    _assert_create_permission("AT Task", _("You do not have permission to create tasks."))

    normalized_source_doctype = _normalize_option(
        quick_payload.source_doctype,
        {
            "AT Customer",
            "AT Policy",
            "AT Claim",
            "AT Renewal Task",
            "AT Campaign",
            "AT Ownership Assignment",
            "AT Call Note",
        },
        default=None,
    )
    normalized_source_name = (quick_payload.source_name or "").strip() or None
    if (
        normalized_source_doctype
        and normalized_source_name
        and not frappe.db.exists(normalized_source_doctype, normalized_source_name)
    ):
        frappe.throw(_("Linked source record was not found"))
    normalized_customer = _normalize_link("AT Customer", quick_payload.customer)
    normalized_policy = _normalize_link("AT Policy", quick_payload.policy)
    normalized_claim = _normalize_link("AT Claim", quick_payload.claim)
    normalized_assigned_to = _normalize_link("User", quick_payload.assigned_to, required=True)

    payload = {
        "doctype": "AT Task",
        "task_title": (quick_payload.task_title or "").strip(),
        "task_type": _normalize_option(
            quick_payload.task_type,
            {
                "Follow-up",
                "Visit",
                "Call",
                "Collection",
                "Claim",
                "Renewal",
                "Review",
                "Other",
            },
            default="Follow-up",
        ),
        "source_doctype": normalized_source_doctype,
        "source_name": normalized_source_name,
        "customer": normalized_customer,
        "policy": normalized_policy,
        "claim": normalized_claim,
        "office_branch": _resolve_office_branch(
            quick_payload.office_branch,
            customer=normalized_customer,
            policy=normalized_policy,
        ),
        "assigned_to": normalized_assigned_to,
        "status": _normalize_option(
            quick_payload.status,
            {"Open", "In Progress", "Blocked", "Done", "Cancelled"},
            default="Open",
        ),
        "priority": _normalize_option(
            quick_payload.priority, {"Low", "Normal", "High", "Critical"}, default="Normal"
        ),
        "due_date": _normalize_date(quick_payload.due_date) if quick_payload.due_date else None,
        "reminder_at": _normalize_datetime(quick_payload.reminder_at)
        if quick_payload.reminder_at
        else None,
        "notes": normalize_note_text(quick_payload.notes),
    }
    return create_task_service(payload)
