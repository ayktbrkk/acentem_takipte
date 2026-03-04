from __future__ import annotations

import frappe
from frappe.tests import IntegrationTestCase
from frappe.utils import add_days, nowdate


class TestATClaim(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.db.rollback()

    def test_try_claim_paid_amount_and_paid_amount_try_are_synced(self):
        deps = _create_dependencies()
        policy = _create_policy(deps=deps)
        claim = _create_claim(
            policy=policy.name,
            customer=deps["customer"],
            currency="TRY",
            approved_amount=750,
        )

        _create_claim_payment(claim=claim.name, currency="TRY", amount=750, fx_rate=1)

        claim.reload()
        self.assertEqual(claim.paid_amount, 750)
        self.assertEqual(claim.paid_amount_try, 750)
        self.assertEqual(claim.claim_status, "Paid")

    def test_non_try_claim_paid_amount_uses_claim_currency_and_tracks_try_total(self):
        deps = _create_dependencies()
        policy = _create_policy(deps=deps)
        claim = _create_claim(
            policy=policy.name,
            customer=deps["customer"],
            currency="USD",
            approved_amount=100,
        )

        _create_claim_payment(claim=claim.name, currency="USD", amount=100, fx_rate=31.25)

        claim.reload()
        self.assertEqual(claim.paid_amount, 100)
        self.assertEqual(claim.paid_amount_try, 3125)
        self.assertEqual(claim.claim_status, "Paid")

    def test_claim_payment_currency_must_match_claim_currency(self):
        deps = _create_dependencies()
        policy = _create_policy(deps=deps)
        claim = _create_claim(
            policy=policy.name,
            customer=deps["customer"],
            currency="USD",
            approved_amount=50,
        )

        with self.assertRaises(frappe.ValidationError):
            _create_claim_payment(claim=claim.name, currency="TRY", amount=50, fx_rate=1)


def _create_claim(*, policy: str, customer: str, currency: str, approved_amount: float):
    return frappe.get_doc(
        {
            "doctype": "AT Claim",
            "policy": policy,
            "customer": customer,
            "claim_type": "Damage",
            "claim_status": "Approved",
            "incident_date": nowdate(),
            "reported_date": nowdate(),
            "currency": currency,
            "estimated_amount": approved_amount,
            "approved_amount": approved_amount,
        }
    ).insert(ignore_permissions=True)


def _create_claim_payment(*, claim: str, currency: str, amount: float, fx_rate: float):
    claim_data = frappe.db.get_value("AT Claim", claim, ["customer", "policy"], as_dict=True)
    return frappe.get_doc(
        {
            "doctype": "AT Payment",
            "claim": claim,
            "policy": claim_data.policy,
            "customer": claim_data.customer,
            "payment_direction": "Outbound",
            "payment_purpose": "Claim Payout",
            "status": "Paid",
            "payment_date": nowdate(),
            "currency": currency,
            "fx_rate": fx_rate,
            "amount": amount,
        }
    ).insert(ignore_permissions=True)


def _create_policy(*, deps: dict[str, str]):
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


def _create_dependencies() -> dict[str, str]:
    suffix = frappe.generate_hash(length=8)

    insurance_company = frappe.get_doc(
        {
            "doctype": "AT Insurance Company",
            "company_name": f"Claim Insurance {suffix}",
            "company_code": f"CI{suffix[:4]}",
        }
    ).insert(ignore_permissions=True)

    branch = frappe.get_doc(
        {
            "doctype": "AT Branch",
            "branch_name": f"Claim Branch {suffix}",
            "branch_code": f"CB{suffix[:4]}",
            "insurance_company": insurance_company.name,
        }
    ).insert(ignore_permissions=True)

    sales_entity = frappe.get_doc(
        {
            "doctype": "AT Sales Entity",
            "entity_type": "Agency",
            "full_name": f"Claim Agency {suffix}",
        }
    ).insert(ignore_permissions=True)

    customer = frappe.get_doc(
        {
            "doctype": "AT Customer",
            "tax_id": _random_tax_id(),
            "full_name": f"Claim Customer {suffix}",
            "phone": "05551234567",
        }
    ).insert(ignore_permissions=True)

    return {
        "insurance_company": insurance_company.name,
        "branch": branch.name,
        "sales_entity": sales_entity.name,
        "customer": customer.name,
    }


def _random_tax_id() -> str:
    seed = frappe.generate_hash(length=11)
    digits = "".join(ch for ch in seed if ch.isdigit())
    if len(digits) >= 11:
        return digits[:11]
    return (digits + "12345678901")[:11]
