from __future__ import annotations

import frappe
import pytest
from frappe.utils import add_days, nowdate

from acentem_takipte.acentem_takipte.domains.claims.api.endpoints import get_claims_workbench_summary


def _random_tax_id() -> str:
    raw = "".join(c for c in frappe.generate_hash(length=12) if c.isdigit())[:9].ljust(9, "1")
    if raw.startswith("0"):
        raw = f"1{raw[1:]}"
    digits = [int(ch) for ch in raw]
    tenth = ((sum(digits[0:9:2]) * 7) - sum(digits[1:8:2])) % 10
    eleventh = (sum(digits) + tenth) % 10
    return f"{raw}{tenth}{eleventh}"


def _deps():
    frappe.set_user("Administrator")
    from acentem_takipte.acentem_takipte.tests.test_utils import ensure_test_office_branch

    suffix = frappe.generate_hash(length=8)
    office_branch = ensure_test_office_branch(suffix)
    insurance_company = frappe.get_doc(
        {
            "doctype": "AT Insurance Company",
            "company_name": f"ClaimCur Ins {suffix}",
            "company_code": f"CC{suffix[:4]}",
        }
    ).insert(ignore_permissions=True)
    branch = frappe.get_doc(
        {
            "doctype": "AT Branch",
            "branch_name": f"ClaimCur Branch {suffix}",
            "branch_code": f"CCB{suffix[:4]}",
            "insurance_company": insurance_company.name,
        }
    ).insert(ignore_permissions=True)
    sales_entity = frappe.get_doc(
        {
            "doctype": "AT Sales Entity",
            "entity_type": "Agency",
            "full_name": f"ClaimCur Agency {suffix}",
            "office_branch": office_branch,
        }
    ).insert(ignore_permissions=True)
    customer = frappe.get_doc(
        {
            "doctype": "AT Customer",
            "tax_id": _random_tax_id(),
            "full_name": f"ClaimCur Customer {suffix}",
            "customer_type": "Individual",
        }
    ).insert(ignore_permissions=True)
    today = nowdate()
    policy = frappe.get_doc(
        {
            "doctype": "AT Policy",
            "customer": customer.name,
            "sales_entity": sales_entity.name,
            "insurance_company": insurance_company.name,
            "branch": branch.name,
            "office_branch": office_branch,
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
    return {
        "office_branch": office_branch,
        "customer": customer.name,
        "policy": policy.name,
    }


def _claim(deps, *, currency="TRY", amount=1000, fx_payout=None):
    claim = frappe.get_doc(
        {
            "doctype": "AT Claim",
            "policy": deps["policy"],
            "customer": deps["customer"],
            "office_branch": deps["office_branch"],
            "claim_type": "Damage",
            "claim_status": "Approved",
            "incident_date": nowdate(),
            "reported_date": nowdate(),
            "currency": currency,
            "estimated_amount": amount,
            "approved_amount": amount,
        }
    ).insert(ignore_permissions=True)
    if fx_payout:
        frappe.get_doc(
            {
                "doctype": "AT Payment",
                "claim": claim.name,
                "policy": claim.policy,
                "customer": claim.customer,
                "office_branch": deps["office_branch"],
                "payment_direction": "Outbound",
                "payment_purpose": "Claim Payout",
                "status": "Paid",
                "payment_date": nowdate(),
                "currency": currency,
                "fx_rate": fx_payout,
                "amount": 1,
            }
        ).insert(ignore_permissions=True)
    return claim


def _summary(deps):
    return get_claims_workbench_summary(office_branch=deps["office_branch"])


@pytest.fixture
def offline_tcmb(monkeypatch):
    """Force the TCMB fallback offline so fx resolution is deterministic."""
    import acentem_takipte.acentem_takipte.doctype.at_policy.at_policy as at_policy_mod

    monkeypatch.setattr(at_policy_mod, "fetch_tcmb_rate", lambda currency, date: (None, None))


def test_try_claim_reserve_is_1_to_1():
    deps = _deps()
    _claim(deps, currency="TRY", amount=1000)
    s = _summary(deps)
    assert s["reserve_try"] == 1000.0
    assert s["non_try_breakdown"] == {}
    assert s["missing_fx_count"] == 0
    frappe.db.rollback()


def test_usd_claim_with_fx_rate_converts_reserve():
    deps = _deps()
    _claim(deps, currency="USD", amount=100, fx_payout=31.25)
    s = _summary(deps)
    assert s["reserve_try"] == 3125.0
    assert s["non_try_breakdown"]["USD"]["reserve_native"] == 100.0
    assert s["non_try_breakdown"]["USD"]["reserve_try"] == 3125.0
    assert s["missing_fx_count"] == 0
    frappe.db.rollback()


def test_eur_claim_with_fx_rate_converts_reserve():
    deps = _deps()
    _claim(deps, currency="EUR", amount=50, fx_payout=35.0)
    s = _summary(deps)
    assert s["reserve_try"] == 1750.0
    assert s["non_try_breakdown"]["EUR"]["reserve_try"] == 1750.0
    assert s["missing_fx_count"] == 0
    frappe.db.rollback()


def test_missing_fx_claim_excluded_from_try_and_surfaced(offline_tcmb):
    deps = _deps()
    _claim(deps, currency="USD", amount=200)  # no payout -> no fx -> TCMB offline
    s = _summary(deps)
    assert s["reserve_try"] == 0.0
    assert s["missing_fx_count"] == 1
    assert s["missing_fx_claims"][0]["currency"] == "USD"
    assert s["missing_fx_claims"][0]["reserve_native"] == 200.0
    assert s["non_try_breakdown"]["USD"]["reserve_native"] == 200.0
    frappe.db.rollback()


def test_mixed_currency_claims_keep_totals_separate(offline_tcmb):
    deps = _deps()
    _claim(deps, currency="TRY", amount=500)
    _claim(deps, currency="USD", amount=100, fx_payout=31.25)
    _claim(deps, currency="USD", amount=200)  # missing fx
    s = _summary(deps)
    assert s["reserve_try"] == 500.0 + 3125.0
    assert s["missing_fx_count"] == 1
    assert s["non_try_breakdown"]["USD"]["reserve_native"] == 300.0
    assert s["non_try_breakdown"]["USD"]["reserve_try"] == 3125.0
    frappe.db.rollback()
