from __future__ import annotations

from acentem_takipte.acentem_takipte.doctype.at_customer.at_customer import (
    normalize_customer_type,
    normalize_identity_number,
    validate_customer_identity,
)
from acentem_takipte.acentem_takipte.services.data_import.registry import normalize_field_key
from acentem_takipte.acentem_takipte.services.data_import.resolvers import (
    resolve_customer_ref,
    resolve_link_ref,
)
from acentem_takipte.acentem_takipte.utils.financials import normalize_financial_amounts
from acentem_takipte.acentem_takipte.utils.normalization import normalize_date
from acentem_takipte.acentem_takipte.utils.statuses import ATOfferStatus, ATPolicyStatus


def apply_column_mapping(
    raw_row: dict[str, str],
    column_mapping: dict[str, str],
) -> dict[str, str]:
    mapped: dict[str, str] = {}
    for source_column, target_field in (column_mapping or {}).items():
        target_key = normalize_field_key(target_field)
        if not target_key:
            continue
        mapped[target_key] = str(raw_row.get(source_column) or "").strip()
    return mapped


def normalize_customer_row(fields: dict[str, str]) -> dict:
    tax_id = normalize_identity_number(fields.get("tax_id"))
    customer_type = normalize_customer_type(fields.get("customer_type"), tax_id)
    return {
        "full_name": str(fields.get("full_name") or "").strip(),
        "tax_id": tax_id,
        "phone": str(fields.get("phone") or "").strip() or None,
        "email": str(fields.get("email") or "").strip() or None,
        "customer_type": customer_type,
    }


def validate_customer_row(payload: dict) -> str | None:
    if not payload.get("full_name"):
        return "Full name is required."
    if not payload.get("tax_id"):
        return "Identity number is required."
    try:
        validate_customer_identity(payload["tax_id"], payload.get("customer_type") or "Individual")
    except Exception as exc:
        return str(exc)
    return None


def normalize_offer_row(fields: dict[str, str], *, office_branch: str | None) -> tuple[dict, str | None]:
    customer, customer_error = resolve_customer_ref(fields.get("customer"))
    if customer_error:
        return {}, customer_error

    sales_entity, sales_error = resolve_link_ref("AT Sales Entity", fields.get("sales_entity"), required=True)
    if sales_error:
        return {}, sales_error

    insurance_company, company_error = resolve_link_ref(
        "AT Insurance Company", fields.get("insurance_company"), required=True
    )
    if company_error:
        return {}, company_error

    branch, branch_error = resolve_link_ref("AT Branch", fields.get("branch"), required=True)
    if branch_error:
        return {}, branch_error

    offer_date = normalize_date(fields.get("offer_date"))
    if not offer_date:
        return {}, "Offer date is required."

    status = str(fields.get("status") or ATOfferStatus.DRAFT).strip() or ATOfferStatus.DRAFT
    if status not in ATOfferStatus.CREATION_ALLOWED:
        return {}, f"Unsupported offer status: {status}"

    financial_error = None
    try:
        financials = normalize_financial_amounts(
            net_premium=fields.get("net_premium"),
            tax_amount=fields.get("tax_amount") or 0,
            commission_amount=fields.get("commission_amount") or 0,
            gross_premium=fields.get("gross_premium"),
            allow_all_zero=status in {ATOfferStatus.DRAFT, "Draft"},
            zero_message_context="offer",
        )
    except Exception as exc:
        return {}, str(exc)

    return (
        {
            "customer": customer,
            "office_branch": office_branch,
            "sales_entity": sales_entity,
            "insurance_company": insurance_company,
            "branch": branch,
            "offer_date": str(offer_date),
            "valid_until": str(normalize_date(fields.get("valid_until")) or "") or None,
            "currency": (fields.get("currency") or "TRY").strip().upper() or "TRY",
            "status": status,
            "notes": fields.get("notes") or None,
            **financials,
        },
        None,
    )


def normalize_policy_row(fields: dict[str, str], *, office_branch: str | None) -> tuple[dict, str | None]:
    customer, customer_error = resolve_customer_ref(fields.get("customer"))
    if customer_error:
        return {}, customer_error

    sales_entity, sales_error = resolve_link_ref("AT Sales Entity", fields.get("sales_entity"), required=True)
    if sales_error:
        return {}, sales_error

    insurance_company, company_error = resolve_link_ref(
        "AT Insurance Company", fields.get("insurance_company"), required=True
    )
    if company_error:
        return {}, company_error

    branch, branch_error = resolve_link_ref("AT Branch", fields.get("branch"), required=True)
    if branch_error:
        return {}, branch_error

    policy_no = str(fields.get("policy_no") or "").strip()
    if not policy_no:
        return {}, "Policy number is required."

    issue_date = normalize_date(fields.get("issue_date"))
    start_date = normalize_date(fields.get("start_date"))
    end_date = normalize_date(fields.get("end_date"))
    if not issue_date or not start_date or not end_date:
        return {}, "Issue, start and end dates are required."

    status = str(fields.get("status") or "Active").strip() or "Active"
    if status not in ATPolicyStatus.VALID:
        return {}, f"Unsupported policy status: {status}"

    try:
        financials = normalize_financial_amounts(
            net_premium=fields.get("net_premium"),
            tax_amount=fields.get("tax_amount") or 0,
            commission_amount=fields.get("commission_amount") or 0,
            gross_premium=fields.get("gross_premium"),
            allow_all_zero=status == "Draft",
            zero_message_context="policy",
        )
    except Exception as exc:
        return {}, str(exc)

    return (
        {
            "customer": customer,
            "office_branch": office_branch,
            "sales_entity": sales_entity,
            "insurance_company": insurance_company,
            "branch": branch,
            "policy_no": policy_no,
            "issue_date": str(issue_date),
            "start_date": str(start_date),
            "end_date": str(end_date),
            "currency": (fields.get("currency") or "TRY").strip().upper() or "TRY",
            "status": status,
            "notes": fields.get("notes") or None,
            **financials,
        },
        None,
    )
