from __future__ import annotations

import frappe
from frappe.tests import IntegrationTestCase
from frappe.utils import add_days, flt, nowdate


class TestATPolicy(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.db.rollback()

    def test_policy_calculates_financials(self):
        deps = _create_dependencies()
        policy = frappe.get_doc(
            {
                "doctype": "AT Policy",
                "customer": deps["customer"],
                "sales_entity": deps["sales_entity"],
                "insurance_company": deps["insurance_company"],
                "branch": deps["branch"],
                "status": "Active",
                "issue_date": nowdate(),
                "start_date": nowdate(),
                "end_date": add_days(nowdate(), 365),
                "currency": "TRY",
                "tax_amount": 120,
                "commission_amount": 80,
                "net_premium": 1000,
            }
        ).insert()

        self.assertAlmostEqual(flt(policy.gross_premium), 1200, places=2)
        self.assertAlmostEqual(flt(policy.commission_amount), 80, places=2)
        self.assertAlmostEqual(flt(policy.commission), 80, places=2)
        self.assertAlmostEqual(flt(policy.gwp_try), 1200, places=2)

    def test_policy_financial_mismatch_throws(self):
        deps = _create_dependencies()

        with self.assertRaises(frappe.ValidationError):
            frappe.get_doc(
                {
                    "doctype": "AT Policy",
                    "customer": deps["customer"],
                    "sales_entity": deps["sales_entity"],
                    "insurance_company": deps["insurance_company"],
                    "branch": deps["branch"],
                    "status": "Active",
                    "issue_date": nowdate(),
                    "start_date": nowdate(),
                    "end_date": add_days(nowdate(), 365),
                    "currency": "TRY",
                    "tax_amount": 100,
                    "commission_amount": 100,
                    "net_premium": 1000,
                    "gross_premium": 1500,
                }
            ).insert()


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

    tax_id = _random_tax_id()
    customer = frappe.get_doc(
        {
            "doctype": "AT Customer",
            "tax_id": tax_id,
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
    # Keep 11-digit numeric format compatible with AT Customer validation.
    seed = frappe.generate_hash(length=11)
    digits = "".join(char for char in seed if char.isdigit())
    if len(digits) >= 11:
        return digits[:11]
    return (digits + "12345678901")[:11]
