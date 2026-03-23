from __future__ import annotations

from unittest.mock import patch

import frappe
from frappe.tests import IntegrationTestCase
from frappe.utils import add_days, flt, nowdate

from acentem_takipte.acentem_takipte.doctype.at_offer import at_offer as at_offer_api
from acentem_takipte.acentem_takipte.doctype.at_offer.at_offer import convert_to_policy


class TestATOffer(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.db.rollback()

    def test_convert_offer_to_policy(self):
        deps = _create_dependencies()
        offer = _create_offer(deps=deps, status="Sent")

        result = convert_to_policy(
            offer_name=offer.name,
            start_date=nowdate(),
            end_date=add_days(nowdate(), 365),
            policy_no="EXT-OFFER-001",
        )
        policy_name = result.get("policy")
        self.assertTrue(policy_name)

        policy = frappe.get_doc("AT Policy", policy_name)
        self.assertEqual(policy.customer, deps["customer"])
        self.assertEqual(policy.sales_entity, deps["sales_entity"])
        self.assertEqual(policy.policy_no, "EXT-OFFER-001")
        self.assertNotEqual(policy.name, policy.policy_no)
        self.assertAlmostEqual(flt(policy.gross_premium), 1000, places=2)
        self.assertAlmostEqual(flt(policy.commission_amount), 100, places=2)
        self.assertAlmostEqual(flt(policy.tax_amount), 50, places=2)
        self.assertAlmostEqual(flt(policy.net_premium), 850, places=2)

        offer.reload()
        self.assertEqual(offer.status, "Converted")
        self.assertEqual(offer.converted_policy, policy.name)

    def test_convert_offer_requires_convertible_status(self):
        deps = _create_dependencies()
        offer = _create_offer(deps=deps, status="Draft")

        with self.assertRaises(frappe.ValidationError):
            convert_to_policy(offer_name=offer.name)

    def test_convert_offer_to_policy_requires_permission(self):
        deps = _create_dependencies()
        offer = _create_offer(deps=deps, status="Sent")

        with patch.object(
            at_offer_api,
            "assert_doctype_permission",
            side_effect=frappe.PermissionError("No permission to create policies."),
        ):
            with self.assertRaises(Exception) as error:
                convert_to_policy(offer_name=offer.name)
            self.assertIn("permission", str(error.exception).lower())


def _create_offer(*, deps: dict[str, str], status: str) -> frappe.model.document.Document:
    return frappe.get_doc(
        {
            "doctype": "AT Offer",
            "customer": deps["customer"],
            "sales_entity": deps["sales_entity"],
            "insurance_company": deps["insurance_company"],
            "branch": deps["branch"],
            "offer_date": nowdate(),
            "valid_until": add_days(nowdate(), 15),
            "currency": "TRY",
            "status": status,
            "net_premium": 850,
            "tax_amount": 50,
            "commission_amount": 100,
            "gross_premium": 1000,
        }
    ).insert(ignore_permissions=True)


def _create_dependencies() -> dict[str, str]:
    suffix = frappe.generate_hash(length=8)

    insurance_company = frappe.get_doc(
        {
            "doctype": "AT Insurance Company",
            "company_name": f"Test Insurance {suffix}",
            "company_code": f"TIC{suffix[:4]}",
        }
    ).insert(ignore_permissions=True)

    branch = frappe.get_doc(
        {
            "doctype": "AT Branch",
            "branch_name": f"Test Branch {suffix}",
            "branch_code": f"TB{suffix[:4]}",
            "insurance_company": insurance_company.name,
        }
    ).insert(ignore_permissions=True)

    sales_entity = frappe.get_doc(
        {
            "doctype": "AT Sales Entity",
            "entity_type": "Agency",
            "full_name": f"Test Agency {suffix}",
        }
    ).insert(ignore_permissions=True)

    customer = frappe.get_doc(
        {
            "doctype": "AT Customer",
            "tax_id": _random_tax_id(),
            "full_name": f"Test Customer {suffix}",
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
    digits = "".join(char for char in seed if char.isdigit())
    if len(digits) >= 11:
        return digits[:11]
    return (digits + "12345678901")[:11]

