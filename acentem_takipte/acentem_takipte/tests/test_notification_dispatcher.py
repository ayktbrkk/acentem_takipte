from __future__ import annotations

from unittest.mock import patch

import frappe
from frappe.tests import IntegrationTestCase

from acentem_takipte.acentem_takipte.api import communication as communication_api
from acentem_takipte.acentem_takipte.communication import process_notification_queue
from acentem_takipte.acentem_takipte.notifications import create_notification_drafts


class TestNotificationDispatcher(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.db.rollback()

    def test_communication_api_snapshot_and_mutations_require_permissions(self):
        previous_user = getattr(frappe.session, "user", None)
        frappe.session.user = "restricted.user@example.com"
        try:
            with patch.object(communication_api.frappe, "has_permission", return_value=False):
                with self.assertRaises(Exception) as snapshot_error:
                    communication_api.get_queue_snapshot(limit=1)
                self.assertIn("permission", str(snapshot_error.exception).lower())

                with self.assertRaises(Exception) as dispatch_error:
                    communication_api.run_dispatch_cycle(limit=1, include_failed=0)
                self.assertIn("permission", str(dispatch_error.exception).lower())
        finally:
            frappe.session.user = previous_user

    def test_draft_to_outbox_to_sent_pipeline(self):
        deps = _create_dependencies()
        template_key = f"test_notify_{frappe.generate_hash(length=8)}"
        template = frappe.get_doc(
            {
                "doctype": "AT Notification Template",
                "template_key": template_key,
                "event_key": "test_notification_dispatch",
                "channel": "SMS",
                "language": "tr",
                "subject": "Test Subject {{ customer.full_name }}",
                "body_template": "Merhaba {{ customer.full_name }}",
                "is_active": 1,
            }
        ).insert(ignore_permissions=True)

        created = create_notification_drafts(
            event_key=template.event_key,
            reference_doctype="AT Customer",
            reference_name=deps["customer"],
            customer=deps["customer"],
            context={"phone": "05550001122"},
            enqueue=True,
        )
        self.assertGreaterEqual(len(created), 1)

        draft_name = next(
            (
                name
                for name in created
                if frappe.db.get_value("AT Notification Draft", name, "template") == template.name
            ),
            created[0],
        )
        draft = frappe.get_doc("AT Notification Draft", draft_name)
        self.assertEqual(draft.status, "Queued")
        self.assertTrue(draft.outbox_record)

        dispatch_summary = process_notification_queue(limit=20)
        self.assertGreaterEqual(dispatch_summary.get("sent", 0), 1)

        draft.reload()
        self.assertEqual(draft.status, "Sent")

        outbox = frappe.get_doc("AT Notification Outbox", draft.outbox_record)
        self.assertEqual(outbox.status, "Sent")
        self.assertTrue(outbox.provider)

    def test_requeue_outbox_item_api_resets_processing_item_to_queue(self):
        deps = _create_dependencies()
        template_key = f"test_requeue_{frappe.generate_hash(length=8)}"
        template = frappe.get_doc(
            {
                "doctype": "AT Notification Template",
                "template_key": template_key,
                "event_key": "test_notification_requeue",
                "channel": "SMS",
                "language": "tr",
                "subject": "Test Subject {{ customer.full_name }}",
                "body_template": "Merhaba {{ customer.full_name }}",
                "is_active": 1,
            }
        ).insert(ignore_permissions=True)

        created = create_notification_drafts(
            event_key=template.event_key,
            reference_doctype="AT Customer",
            reference_name=deps["customer"],
            customer=deps["customer"],
            context={"phone": "05550001122"},
            enqueue=True,
        )
        self.assertGreaterEqual(len(created), 1)

        draft = frappe.get_doc("AT Notification Draft", created[0])
        self.assertTrue(draft.outbox_record)
        outbox = frappe.get_doc("AT Notification Outbox", draft.outbox_record)
        outbox.status = "Processing"
        outbox.save(ignore_permissions=True)

        result = communication_api.requeue_outbox_item(outbox.name)
        self.assertEqual(result.get("status"), "Queued")
        self.assertEqual(result.get("outbox"), outbox.name)

        outbox.reload()
        self.assertEqual(outbox.status, "Queued")


def _create_dependencies() -> dict[str, str]:
    suffix = frappe.generate_hash(length=8)

    insurance_company = frappe.get_doc(
        {
            "doctype": "AT Insurance Company",
            "company_name": f"Notify Insurance {suffix}",
            "company_code": f"NIC{suffix[:4]}",
        }
    ).insert(ignore_permissions=True)

    branch = frappe.get_doc(
        {
            "doctype": "AT Branch",
            "branch_name": f"Notify Branch {suffix}",
            "branch_code": f"NB{suffix[:4]}",
            "insurance_company": insurance_company.name,
        }
    ).insert(ignore_permissions=True)

    sales_entity = frappe.get_doc(
        {
            "doctype": "AT Sales Entity",
            "entity_type": "Agency",
            "full_name": f"Notify Agency {suffix}",
        }
    ).insert(ignore_permissions=True)

    customer = frappe.get_doc(
        {
            "doctype": "AT Customer",
            "tax_id": _random_tax_id(),
            "full_name": f"Notify Customer {suffix}",
            "phone": "05551234567",
            "email": f"notify.{suffix}@example.com",
            "assigned_agent": "Administrator",
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

