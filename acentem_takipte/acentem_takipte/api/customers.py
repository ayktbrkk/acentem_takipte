from __future__ import annotations

import frappe
from frappe import _

from acentem_takipte.acentem_takipte.api.security import assert_authenticated
from acentem_takipte.acentem_takipte.api.security import assert_post_request
from acentem_takipte.acentem_takipte.doctype.at_access_log.at_access_log import log_decision_event
from acentem_takipte.acentem_takipte.doctype.at_customer.at_customer import (
    has_sensitive_access,
    normalize_identity_number,
)
from acentem_takipte.acentem_takipte.services.branches import normalize_requested_office_branch
from acentem_takipte.acentem_takipte.services.privacy_masking import masked_query_gate


def _mask_email(value: str | None) -> str:
    email = str(value or "").strip()
    if not email or "@" not in email:
        return ""
    local, domain = email.split("@", 1)
    if not local:
        return f"***@{domain}"
    if len(local) == 1:
        return f"{local}***@{domain}"
    return f"{local[0]}***@{domain}"


def _safe_translate(message: str) -> str:
    try:
        return _(message)
    except Exception:
        return message


@frappe.whitelist()
def search_customer_by_identity(identity_number: str, office_branch: str | None = None) -> dict:
    user = assert_authenticated()
    identity = normalize_identity_number(identity_number)
    if len(identity) not in {10, 11}:
        frappe.throw(_safe_translate("Identity number must be 10 or 11 digits."))

    normalized_office_branch = normalize_requested_office_branch(office_branch, user=user)
    filters = {"tax_id": identity}
    if normalized_office_branch:
        filters["office_branch"] = normalized_office_branch

    customer = frappe.db.get_value(
        "AT Customer",
        filters,
        ["name", "full_name", "tax_id", "masked_tax_id", "phone", "masked_phone", "email", "office_branch"],
        as_dict=True,
    )
    if not customer:
        return {
            "exists": False,
            "is_masked": False,
            "mask_reason": None,
            "access_request_allowed": False,
            "customer": None,
        }

    if has_sensitive_access(user):
        return {
            "exists": True,
            "is_masked": False,
            "mask_reason": None,
            "access_request_allowed": False,
            "customer": {
                "name": customer.get("name"),
                "full_name": customer.get("full_name"),
                "tax_id": customer.get("tax_id"),
                "phone": customer.get("phone"),
                "email": customer.get("email"),
                "office_branch": customer.get("office_branch"),
            },
        }

    masked_query_gate(user, endpoint="customer_global_search", row_count=1)
    return {
        "exists": True,
        "is_masked": True,
        "mask_reason": "insufficient_sensitive_scope",
        "access_request_allowed": True,
        "customer": {
            "name": customer.get("name"),
            "full_name": customer.get("full_name"),
            "tax_id": customer.get("masked_tax_id"),
            "phone": customer.get("masked_phone"),
            "email": _mask_email(customer.get("email")),
            "office_branch": customer.get("office_branch"),
        },
    }


@frappe.whitelist()
def create_customer_access_request(
    customer_name: str,
    justification: str,
    request_kind: str = "access",
) -> dict:
    user = assert_authenticated()
    assert_post_request("Only POST requests are allowed for access request creation.")

    customer_id = str(customer_name or "").strip()
    if not customer_id:
        frappe.throw(_safe_translate("Customer is required."))
    if not frappe.db.exists("AT Customer", customer_id):
        frappe.throw(_safe_translate("Customer not found: {0}").format(customer_id))

    reason = str(justification or "").strip()
    if len(reason) < 10:
        frappe.throw(_safe_translate("Justification must be at least 10 characters."))

    kind = str(request_kind or "access").strip().lower() or "access"
    if kind not in {"access", "transfer", "share"}:
        frappe.throw(_safe_translate("Request kind must be access, transfer or share."))

    log_decision_event(
        reference_doctype="AT Customer",
        reference_name=customer_id,
        action="Create",
        action_summary=f"{kind.upper()}_REQUEST",
        decision_context=f"requested_by={user}; justification={reason[:500]}",
    )

    return {
        "ok": True,
        "request_kind": kind,
        "reference_doctype": "AT Customer",
        "reference_name": customer_id,
        "message": _safe_translate("Access request has been created."),
    }
