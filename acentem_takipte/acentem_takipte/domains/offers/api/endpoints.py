from __future__ import annotations

import frappe

from acentem_takipte.acentem_takipte.doctype.at_offer.at_offer import (
    convert_to_policy,
    create_quick_offer,
)


@frappe.whitelist()
def quick_create_offer(
    customer: str | None = None,
    customer_name: str | None = None,
    customer_type: str | None = None,
    tax_id: str | None = None,
    phone: str | None = None,
    email: str | None = None,
    branch: str | None = None,
    office_branch: str | None = None,
    notes: str | None = None,
    currency: str | None = None,
    offer_date: str | None = None,
    valid_until: str | None = None,
    insurance_company: str | None = None,
    sales_entity: str | None = None,
    status: str | None = None,
    gross_premium: float | None = None,
    net_premium: float | None = None,
    tax_amount: float | None = None,
    commission_amount: float | None = None,
) -> dict[str, str | int]:
    return create_quick_offer(
        customer=customer,
        customer_name=customer_name,
        customer_type=customer_type,
        tax_id=tax_id,
        phone=phone,
        email=email,
        branch=branch,
        office_branch=office_branch,
        notes=notes,
        currency=currency,
        offer_date=offer_date,
        valid_until=valid_until,
        insurance_company=insurance_company,
        sales_entity=sales_entity,
        status=status,
        gross_premium=gross_premium,
        net_premium=net_premium,
        tax_amount=tax_amount,
        commission_amount=commission_amount,
    )


@frappe.whitelist()
def convert_offer_to_policy(
    offer_name: str,
    start_date: str | None = None,
    end_date: str | None = None,
    commission: float | None = None,
    commission_amount: float | None = None,
    tax_amount: float | None = None,
    net_premium: float | None = None,
    policy_no: str | None = None,
) -> dict[str, str]:
    return convert_to_policy(
        offer_name=offer_name,
        start_date=start_date,
        end_date=end_date,
        commission=commission,
        commission_amount=commission_amount,
        tax_amount=tax_amount,
        net_premium=net_premium,
        policy_no=policy_no,
    )
