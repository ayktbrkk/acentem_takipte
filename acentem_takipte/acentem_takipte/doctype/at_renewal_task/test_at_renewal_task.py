from __future__ import annotations

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase as IntegrationTestCase
from frappe.utils import add_days, nowdate

from acentem_takipte.acentem_takipte.api import dashboard as dashboard_api
from acentem_takipte.acentem_takipte.patches.v2026_02_26_renewal_status_completed_to_done import (
    execute as run_renewal_status_completed_to_done_patch,
)
from acentem_takipte.acentem_takipte.tasks import RENEWAL_LOOKAHEAD_DAYS, build_renewal_key, create_renewal_tasks


class TestATRenewalTask(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.db.rollback()

    def test_scheduler_is_idempotent_for_same_policy(self):
        deps = _create_dependencies()
        policy = _create_policy(deps=deps, end_date=add_days(nowdate(), 12))

        first_summary = create_renewal_tasks()
        second_summary = create_renewal_tasks()

        tasks = frappe.get_all(
            "AT Renewal Task",
            filters={"policy": policy.name},
            fields=["name", "unique_key", "due_date"],
            limit_page_length=0,
        )

        self.assertLessEqual(len(tasks), 1)
        self.assertTrue(first_summary.get("scanned", 0) >= 0)
        self.assertTrue(second_summary.get("skipped_existing", 0) >= 0)
        if tasks:
            self.assertTrue(tasks[0].unique_key)

    def test_scheduler_skips_legacy_task_without_unique_key(self):
        deps = _create_dependencies()
        policy = _create_policy(deps=deps, end_date=add_days(nowdate(), 8))
        due_date = add_days(policy.end_date, -RENEWAL_LOOKAHEAD_DAYS)

        task = frappe.get_doc(
            {
                "doctype": "AT Renewal Task",
                "policy": policy.name,
                "customer": deps["customer"],
                "policy_end_date": policy.end_date,
                "renewal_date": policy.end_date,
                "due_date": due_date,
                "status": "Open",
                "auto_created": 1,
            }
        ).insert(ignore_permissions=True)

        frappe.db.sql("update `tabAT Renewal Task` set unique_key = null where name = %s", task.name)

        create_renewal_tasks()

        names = frappe.get_all(
            "AT Renewal Task",
            filters={"policy": policy.name, "due_date": due_date},
            pluck="name",
            limit_page_length=0,
        )
        self.assertEqual(len(names), 1)

    def test_validate_normalizes_unique_key(self):
        deps = _create_dependencies()
        policy = _create_policy(deps=deps, end_date=add_days(nowdate(), 20))
        due_date = add_days(policy.end_date, -RENEWAL_LOOKAHEAD_DAYS)
        expected_key = build_renewal_key(policy.name, due_date)

        task = frappe.get_doc(
            {
                "doctype": "AT Renewal Task",
                "policy": policy.name,
                "customer": deps["customer"],
                "policy_end_date": policy.end_date,
                "renewal_date": policy.end_date,
                "due_date": due_date,
                "status": "Open",
                "auto_created": 1,
                "unique_key": "legacy-key",
            }
        ).insert(ignore_permissions=True)

        self.assertTrue(task.unique_key)
        self.assertIn(policy.name, task.unique_key)
        self.assertTrue(task.unique_key.endswith(str(due_date)))

    def test_dashboard_status_summary_normalizes_legacy_completed(self):
        sql_rows = [
            [{"status": "Done", "total": 1}, {"status": "Completed", "total": 1}, {"status": "Open", "total": 1}, {"status": "Cancelled", "total": 1}],
            [],
        ]
        with patch.object(dashboard_api.frappe.db, "sql", side_effect=sql_rows):
            with patch.object(dashboard_api.frappe, "get_all", return_value=[]):
                payload = dashboard_api._renewal_status_and_buckets(
                    office_branch=None,
                    branch=None,
                    allowed_customers=None,
                )

        counts = {row["status"]: row["total"] for row in payload["status_rows"]}
        self.assertEqual(counts["Done"], 2)
        self.assertEqual(counts["Open"], 1)
        self.assertEqual(counts["Cancelled"], 1)

    def test_patch_migrates_completed_status_to_done(self):
        deps = _create_dependencies()
        policy = _create_policy(deps=deps, end_date=add_days(nowdate(), 14))
        due_date = add_days(policy.end_date, -RENEWAL_LOOKAHEAD_DAYS)

        task = frappe.get_doc(
            {
                "doctype": "AT Renewal Task",
                "policy": policy.name,
                "customer": deps["customer"],
                "policy_end_date": policy.end_date,
                "renewal_date": policy.end_date,
                "due_date": due_date,
                "status": "Open",
                "auto_created": 1,
            }
        ).insert(ignore_permissions=True)

        frappe.db.sql("update `tabAT Renewal Task` set status = 'Completed' where name = %s", task.name)
        self.assertEqual(frappe.db.get_value("AT Renewal Task", task.name, "status"), "Completed")

        run_renewal_status_completed_to_done_patch()

        self.assertEqual(frappe.db.get_value("AT Renewal Task", task.name, "status"), "Done")


def _create_policy(*, deps: dict[str, str], end_date):
    return frappe.get_doc(
        {
            "doctype": "AT Policy",
            "customer": deps["customer"],
            "sales_entity": deps["sales_entity"],
            "insurance_company": deps["insurance_company"],
            "branch": deps["branch"],
            "status": "Active",
            "issue_date": nowdate(),
            "start_date": nowdate(),
            "end_date": end_date,
            "currency": "TRY",
            "net_premium": 900,
            "tax_amount": 50,
            "commission_amount": 50,
        }
    ).insert(ignore_permissions=True)


def _create_dependencies() -> dict[str, str]:
    suffix = frappe.generate_hash(length=8)

    insurance_company = frappe.get_doc(
        {
            "doctype": "AT Insurance Company",
            "company_name": f"Renewal Insurance {suffix}",
            "company_code": f"RIN{suffix[:4]}",
        }
    ).insert(ignore_permissions=True)

    branch = frappe.get_doc(
        {
            "doctype": "AT Branch",
            "branch_name": f"Renewal Branch {suffix}",
            "branch_code": f"RB{suffix[:4]}",
            "insurance_company": insurance_company.name,
        }
    ).insert(ignore_permissions=True)

    office_branch_name = frappe.db.get_value("AT Office Branch", {"is_active": 1}, "name")
    if not office_branch_name:
        office_branch_name = frappe.get_doc(
            {
                "doctype": "AT Office Branch",
                "office_branch_name": f"Renewal Office {suffix}",
                "office_branch_code": f"ROB{suffix[:4]}",
                "city": "Istanbul",
                "is_active": 1,
                "is_head_office": 1,
            }
        ).insert(ignore_permissions=True).name

    sales_entity = frappe.get_doc(
        {
            "doctype": "AT Sales Entity",
            "entity_type": "Agency",
            "full_name": f"Renewal Agency {suffix}",
            "office_branch": office_branch_name,
        }
    ).insert(ignore_permissions=True)

    customer = frappe.get_doc(
        {
            "doctype": "AT Customer",
            "tax_id": _random_tax_id(),
            "full_name": f"Renewal Customer {suffix}",
            "phone": "05559876543",
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


