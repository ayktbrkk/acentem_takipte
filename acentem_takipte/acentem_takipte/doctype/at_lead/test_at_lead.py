from __future__ import annotations

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase as IntegrationTestCase

from acentem_takipte.acentem_takipte.doctype.at_lead import at_lead as at_lead_api
from acentem_takipte.acentem_takipte.doctype.at_lead.at_lead import convert_to_offer


class TestATLead(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.db.rollback()

    def test_convert_lead_to_offer_requires_permission(self):
        deps = _create_dependencies()
        lead = frappe.get_doc(
            {
                "doctype": "AT Lead",
                "first_name": "Lead",
                "last_name": "Test",
                "email": f"lead.{frappe.generate_hash(length=6)}@example.com",
                "customer": deps["customer"],
                "sales_entity": deps["sales_entity"],
                "insurance_company": deps["insurance_company"],
                "branch": deps["branch"],
                "estimated_gross_premium": 1200,
                "status": "Draft",
            }
        ).insert(ignore_permissions=True)

        with patch.object(
            at_lead_api,
            "assert_doctype_permission",
            side_effect=frappe.PermissionError("No permission to create offers."),
        ):
            with self.assertRaises(Exception) as error:
                convert_to_offer(lead.name)
            self.assertIn("permission", str(error.exception).lower())


def _create_dependencies() -> dict[str, str]:
    suffix = frappe.generate_hash(length=8)

    insurance_company = frappe.get_doc(
        {
            "doctype": "AT Insurance Company",
            "company_name": f"Lead Test Insurance {suffix}",
            "company_code": f"LTI{suffix[:4]}",
        }
    ).insert(ignore_permissions=True)

    branch = frappe.get_doc(
        {
            "doctype": "AT Branch",
            "branch_name": f"Lead Test Branch {suffix}",
            "branch_code": f"LTB{suffix[:4]}",
            "insurance_company": insurance_company.name,
        }
    ).insert(ignore_permissions=True)

    office_branch_name = frappe.db.get_value("AT Office Branch", {"is_active": 1}, "name")
    if not office_branch_name:
        office_branch_name = frappe.get_doc(
            {
                "doctype": "AT Office Branch",
                "office_branch_name": f"Lead Office {suffix}",
                "office_branch_code": f"LOB{suffix[:4]}",
                "city": "Istanbul",
                "is_active": 1,
                "is_head_office": 1,
            }
        ).insert(ignore_permissions=True).name

    sales_entity = frappe.get_doc(
        {
            "doctype": "AT Sales Entity",
            "entity_type": "Agency",
            "full_name": f"Lead Test Agency {suffix}",
            "office_branch": office_branch_name,
        }
    ).insert(ignore_permissions=True)

    customer = frappe.get_doc(
        {
            "doctype": "AT Customer",
            "tax_id": _random_tax_id(),
            "full_name": f"Lead Test Customer {suffix}",
            "phone": "05550123456",
        }
    ).insert(ignore_permissions=True)

    return {
        "insurance_company": insurance_company.name,
        "branch": branch.name,
        "sales_entity": sales_entity.name,
        "customer": customer.name,
    }


def _random_tax_id() -> str:
    raw = "".join(char for char in frappe.generate_hash(length=12) if char.isdigit())[:9].ljust(9, "1")
    if raw.startswith("0"):
        raw = f"1{raw[1:]}"
    digits = [int(char) for char in raw]
    tenth = ((sum(digits[0:9:2]) * 7) - sum(digits[1:8:2])) % 10
    eleventh = (sum(digits) + tenth) % 10
    return f"{raw}{tenth}{eleventh}"


