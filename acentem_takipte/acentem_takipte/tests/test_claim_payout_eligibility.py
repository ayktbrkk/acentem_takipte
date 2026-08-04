from __future__ import annotations

import frappe
import pytest
from frappe.utils import add_days, nowdate


def _random_tax_id() -> str:
    raw = "".join(c for c in frappe.generate_hash(length=12) if c.isdigit())[:9].ljust(9, "1")
    if raw.startswith("0"):
        raw = f"1{raw[1:]}"
    digits = [int(ch) for ch in raw]
    tenth = ((sum(digits[0:9:2]) * 7) - sum(digits[1:8:2])) % 10
    eleventh = (sum(digits) + tenth) % 10
    return f"{raw}{tenth}{eleventh}"


def _create_dependencies() -> dict[str, str]:
    from acentem_takipte.acentem_takipte.tests.test_utils import ensure_test_office_branch

    suffix = frappe.generate_hash(length=8)
    office_branch = ensure_test_office_branch(suffix)
    insurance_company = frappe.get_doc(
        {
            "doctype": "AT Insurance Company",
            "company_name": f"ClaimPay Ins {suffix}",
            "company_code": f"CP{suffix[:4]}",
        }
    ).insert(ignore_permissions=True)
    branch = frappe.get_doc(
        {
            "doctype": "AT Branch",
            "branch_name": f"ClaimPay Branch {suffix}",
            "branch_code": f"CPB{suffix[:4]}",
            "insurance_company": insurance_company.name,
        }
    ).insert(ignore_permissions=True)
    sales_entity = frappe.get_doc(
        {
            "doctype": "AT Sales Entity",
            "entity_type": "Agency",
            "full_name": f"ClaimPay Agency {suffix}",
            "office_branch": office_branch,
        }
    ).insert(ignore_permissions=True)
    customer = frappe.get_doc(
        {
            "doctype": "AT Customer",
            "tax_id": _random_tax_id(),
            "full_name": f"ClaimPay Customer {suffix}",
            "customer_type": "Individual",
        }
    ).insert(ignore_permissions=True)
    return {
        "insurance_company": insurance_company.name,
        "branch": branch.name,
        "sales_entity": sales_entity.name,
        "customer": customer.name,
        "office_branch": office_branch,
    }


def _create_policy(deps):
    today = nowdate()
    return frappe.get_doc(
        {
            "doctype": "AT Policy",
            "customer": deps["customer"],
            "sales_entity": deps["sales_entity"],
            "insurance_company": deps["insurance_company"],
            "branch": deps["branch"],
            "status": "Active",
            "issue_date": today,
            "start_date": today,
            "end_date": add_days(today, 365),
            "currency": "TRY",
            "net_premium": 1200,
            "tax_amount": 120,
            "commission_amount": 120,
        }
    ).insert(ignore_permissions=True)


def _create_claim(deps, *, claim_status="Approved", approved_amount, currency="TRY"):
    claim_payload = {
        "doctype": "AT Claim",
        "policy": deps["policy"],
        "customer": deps["customer"],
        "claim_type": "Damage",
        "claim_status": claim_status,
        "incident_date": nowdate(),
        "reported_date": nowdate(),
        "currency": currency,
        "estimated_amount": approved_amount,
        "approved_amount": approved_amount,
    }
    if claim_status == "Rejected":
        claim_payload["rejection_reason"] = "Test rejection"
    return frappe.get_doc(claim_payload).insert(ignore_permissions=True)


def _payout_attempt(claim, amount, *, status="Draft", currency="TRY", fx_rate=1):
    return frappe.get_doc(
        {
            "doctype": "AT Payment",
            "claim": claim.name,
            "policy": claim.policy,
            "customer": claim.customer,
            "payment_direction": "Outbound",
            "payment_purpose": "Claim Payout",
            "status": status,
            "payment_date": nowdate(),
            "currency": currency,
            "fx_rate": fx_rate,
            "amount": amount,
        }
    ).insert(ignore_permissions=True)


@pytest.mark.parametrize(
    "claim_status",
    ["Rejected", "Closed", "Paid"],
)
def test_claim_payout_rejected_for_terminal_claims(claim_status):
    deps = _create_dependencies()
    deps["policy"] = _create_policy(deps).name
    claim = _create_claim(deps, claim_status=claim_status, approved_amount=1000)
    with pytest.raises(Exception):
        _payout_attempt(claim, 100)
    frappe.db.rollback()


def test_claim_payout_allowed_for_approved_with_remaining_amount():
    deps = _create_dependencies()
    deps["policy"] = _create_policy(deps).name
    claim = _create_claim(deps, approved_amount=1000)
    payout = _payout_attempt(claim, 400)
    assert payout.name
    frappe.db.rollback()


def test_claim_payout_rejected_when_exceeds_approved_amount():
    deps = _create_dependencies()
    deps["policy"] = _create_policy(deps).name
    claim = _create_claim(deps, approved_amount=500)
    _payout_attempt(claim, 300, status="Paid")
    with pytest.raises(Exception):
        _payout_attempt(claim, 250)
    frappe.db.rollback()


def test_claim_payout_allows_full_approved_amount():
    deps = _create_dependencies()
    deps["policy"] = _create_policy(deps).name
    claim = _create_claim(deps, approved_amount=500)
    p1 = _payout_attempt(claim, 300, status="Paid")
    p2 = _payout_attempt(claim, 200, status="Paid")
    assert p1.name and p2.name
    frappe.db.rollback()


def test_claim_payout_cap_uses_claim_currency_for_non_try_claims():
    # A USD claim is capped in USD; the TRY equivalent must not be compared
    # against the USD approved amount.
    deps = _create_dependencies()
    deps["policy"] = _create_policy(deps).name
    claim = _create_claim(deps, approved_amount=100, currency="USD")
    _payout_attempt(claim, 80, status="Paid", currency="USD", fx_rate=31.25)
    with pytest.raises(Exception):
        _payout_attempt(claim, 25, currency="USD", fx_rate=31.25)
    frappe.db.rollback()


def test_claim_payout_non_try_allows_remaining_usd_amount():
    deps = _create_dependencies()
    deps["policy"] = _create_policy(deps).name
    claim = _create_claim(deps, approved_amount=100, currency="USD")
    p1 = _payout_attempt(claim, 60, status="Paid", currency="USD", fx_rate=31.25)
    p2 = _payout_attempt(claim, 40, currency="USD", fx_rate=31.25)
    assert p1.name and p2.name
    frappe.db.rollback()
