from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase as IntegrationTestCase

from acentem_takipte.acentem_takipte.tests.test_utils import ensure_test_office_branch


def _random_tax_id() -> str:
    raw = "".join(char for char in frappe.generate_hash(length=12) if char.isdigit())[:9].ljust(9, "1")
    if raw.startswith("0"):
        raw = f"1{raw[1:]}"
    digits = [int(char) for char in raw]
    tenth = ((sum(digits[0:9:2]) * 7) - sum(digits[1:8:2])) % 10
    eleventh = (sum(digits) + tenth) % 10
    return f"{raw}{tenth}{eleventh}"



class TestATTaskTerminalStateGuard(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.db.rollback()

    def _deps(self):
        suffix = frappe.generate_hash(length=8)
        office_branch = ensure_test_office_branch(suffix)
        customer = frappe.get_doc(
            {
                "doctype": "AT Customer",
                "tax_id": _random_tax_id(),
                "full_name": f"Task Customer {suffix}",
                "phone": "05550000001",
                "office_branch": office_branch,
            }
        ).insert(ignore_permissions=True)
        return {"office_branch": office_branch, "customer": customer.name, "user": frappe.session.user}

    def _task(self, deps, status="Open"):
        return frappe.get_doc(
            {
                "doctype": "AT Task",
                "task_title": "Follow up quote",
                "task_type": "Follow-up",
                "assigned_to": deps["user"],
                "status": status,
                "priority": "Normal",
                "customer": deps["customer"],
            }
        ).insert(ignore_permissions=True)

    def test_done_task_cannot_be_reopened(self):
        deps = self._deps()
        task = self._task(deps, status="Done")
        task.status = "Open"
        with self.assertRaises(frappe.ValidationError):
            task.save()

    def test_cancelled_task_cannot_be_reopened(self):
        deps = self._deps()
        task = self._task(deps, status="Cancelled")
        task.status = "In Progress"
        with self.assertRaises(frappe.ValidationError):
            task.save()

    def test_open_task_backfills_origin_office_branch(self):
        deps = self._deps()
        task = self._task(deps, status="Open")
        self.assertEqual(task.origin_office_branch, deps["office_branch"])
        self.assertEqual(task.current_office_branch, deps["office_branch"])


class TestATReminderTerminalStateAndBranch(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.db.rollback()

    def _deps(self):
        suffix = frappe.generate_hash(length=8)
        office_branch = ensure_test_office_branch(suffix)
        customer = frappe.get_doc(
            {
                "doctype": "AT Customer",
                "tax_id": _random_tax_id(),
                "full_name": f"Reminder Customer {suffix}",
                "phone": "05550000002",
                "office_branch": office_branch,
            }
        ).insert(ignore_permissions=True)
        return {"office_branch": office_branch, "customer": customer.name, "user": frappe.session.user}

    def _reminder(self, deps, status="Open"):
        return frappe.get_doc(
            {
                "doctype": "AT Reminder",
                "reminder_title": "Call customer",
                "assigned_to": deps["user"],
                "status": status,
                "priority": "Normal",
                "remind_at": "2026-12-01 09:00:00",
                "customer": deps["customer"],
            }
        ).insert(ignore_permissions=True)

    def test_done_reminder_cannot_be_reopened(self):
        deps = self._deps()
        reminder = self._reminder(deps, status="Done")
        reminder.status = "Open"
        with self.assertRaises(frappe.ValidationError):
            reminder.save()

    def test_reminder_backfills_origin_office_branch(self):
        deps = self._deps()
        reminder = self._reminder(deps, status="Open")
        self.assertEqual(reminder.origin_office_branch, deps["office_branch"])
        self.assertEqual(reminder.current_office_branch, deps["office_branch"])


class TestATCallNoteBranchBackfill(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.db.rollback()

    def test_call_note_backfills_origin_office_branch(self):
        suffix = frappe.generate_hash(length=8)
        office_branch = ensure_test_office_branch(suffix)
        customer = frappe.get_doc(
            {
                "doctype": "AT Customer",
                "tax_id": _random_tax_id(),
                "full_name": f"Call Note Customer {suffix}",
                "phone": "05550000003",
                "office_branch": office_branch,
            }
        ).insert(ignore_permissions=True)

        call_note = frappe.get_doc(
            {
                "doctype": "AT Call Note",
                "customer": customer.name,
                "channel": "Phone Call",
                "direction": "Outbound",
                "call_status": "Completed",
                "note_at": "2026-12-01 10:00:00",
                "notes": "Spoke with customer",
            }
        ).insert(ignore_permissions=True)

        self.assertEqual(call_note.office_branch, office_branch)
        self.assertEqual(call_note.origin_office_branch, office_branch)
        self.assertEqual(call_note.current_office_branch, office_branch)


class TestATOwnershipAssignmentBranchBackfill(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.db.rollback()

    def test_assignment_backfills_origin_office_branch(self):
        suffix = frappe.generate_hash(length=8)
        office_branch = ensure_test_office_branch(suffix)
        customer = frappe.get_doc(
            {
                "doctype": "AT Customer",
                "tax_id": _random_tax_id(),
                "full_name": f"Assignment Customer {suffix}",
                "phone": "05550000004",
                "office_branch": office_branch,
            }
        ).insert(ignore_permissions=True)

        assignment = frappe.get_doc(
            {
                "doctype": "AT Ownership Assignment",
                "source_doctype": "AT Customer",
                "source_name": customer.name,
                "customer": customer.name,
                "assigned_to": frappe.session.user,
                "assignment_role": "Owner",
                "status": "Open",
                "priority": "Normal",
            }
        ).insert(ignore_permissions=True)

        self.assertEqual(assignment.office_branch, office_branch)
        self.assertEqual(assignment.origin_office_branch, office_branch)
        self.assertEqual(assignment.current_office_branch, office_branch)

    def test_active_ownership_overlap_is_rejected(self):
        suffix = frappe.generate_hash(length=8)
        office_branch = ensure_test_office_branch(suffix)
        customer = frappe.get_doc(
            {
                "doctype": "AT Customer",
                "tax_id": _random_tax_id(),
                "full_name": f"Overlap Customer {suffix}",
                "phone": "05550000005",
                "office_branch": office_branch,
            }
        ).insert(ignore_permissions=True)

        first = frappe.get_doc(
            {
                "doctype": "AT Ownership Assignment",
                "source_doctype": "AT Customer",
                "source_name": customer.name,
                "customer": customer.name,
                "assigned_to": frappe.session.user,
                "assignment_role": "Owner",
                "status": "Open",
                "priority": "Normal",
            }
        ).insert(ignore_permissions=True)

        second = frappe.get_doc(
            {
                "doctype": "AT Ownership Assignment",
                "source_doctype": "AT Customer",
                "source_name": customer.name,
                "customer": customer.name,
                "assigned_to": frappe.session.user,
                "assignment_role": "Owner",
                "status": "Open",
                "priority": "Normal",
            }
        )
        with self.assertRaises(frappe.ValidationError):
            second.insert(ignore_permissions=True)

    def test_completed_assignment_allows_new_active(self):
        suffix = frappe.generate_hash(length=8)
        office_branch = ensure_test_office_branch(suffix)
        customer = frappe.get_doc(
            {
                "doctype": "AT Customer",
                "tax_id": _random_tax_id(),
                "full_name": f"Completed Assignment Customer {suffix}",
                "phone": "05550000006",
                "office_branch": office_branch,
            }
        ).insert(ignore_permissions=True)

        closed = frappe.get_doc(
            {
                "doctype": "AT Ownership Assignment",
                "source_doctype": "AT Customer",
                "source_name": customer.name,
                "customer": customer.name,
                "assigned_to": frappe.session.user,
                "assignment_role": "Owner",
                "status": "Done",
                "priority": "Normal",
            }
        ).insert(ignore_permissions=True)

        reopened = frappe.get_doc(
            {
                "doctype": "AT Ownership Assignment",
                "source_doctype": "AT Customer",
                "source_name": customer.name,
                "customer": customer.name,
                "assigned_to": frappe.session.user,
                "assignment_role": "Owner",
                "status": "Open",
                "priority": "Normal",
            }
        ).insert(ignore_permissions=True)

        self.assertNotEqual(closed.name, reopened.name)


class TestCommunicationEndpointBranchChecks(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.db.rollback()

    def test_retry_outbox_item_asserts_branch_access(self):
        from unittest.mock import patch

        from acentem_takipte.acentem_takipte.domains.communications.api import endpoints as communication_api

        with patch.object(communication_api, "_assert_dispatch_mutation_access") as access_mock:
            with patch.object(communication_api, "assert_doc_permission") as doc_perm_mock:
                with patch.object(
                    communication_api,
                    "_assert_outbox_branch_access",
                ) as branch_assert_mock:
                    with patch.object(
                        communication_api.communication_logic,
                        "retry_notification_outbox",
                        return_value={"outbox": "OUT-1", "status": "Queued"},
                    ):
                        result = communication_api.retry_outbox_item("OUT-1")

        access_mock.assert_called_once()
        doc_perm_mock.assert_called_once_with("AT Notification Outbox", "OUT-1", "write")
        branch_assert_mock.assert_called_once_with("OUT-1")
        self.assertEqual(result["status"], "Queued")

    def test_send_draft_now_asserts_branch_access(self):
        from unittest.mock import patch

        from acentem_takipte.acentem_takipte.domains.communications.api import endpoints as communication_api

        with patch.object(communication_api, "_assert_dispatch_mutation_access") as access_mock:
            with patch.object(communication_api, "assert_doc_permission") as doc_perm_mock:
                with patch.object(
                    communication_api,
                    "_assert_draft_branch_access",
                ) as branch_assert_mock:
                    with patch.object(
                        communication_api.communication_logic,
                        "send_notification_draft_now",
                        return_value={"draft": "DRF-1", "status": "Sent"},
                    ):
                        result = communication_api.send_draft_now("DRF-1")

        access_mock.assert_called_once()
        doc_perm_mock.assert_called_once_with("AT Notification Draft", "DRF-1", "write")
        branch_assert_mock.assert_called_once_with("DRF-1")
        self.assertEqual(result["status"], "Sent")

    def test_branch_access_helper_uses_assert_office_branch_access(self):
        from unittest.mock import patch

        from acentem_takipte.acentem_takipte.domains.communications.api import endpoints as communication_api

        with patch.object(communication_api.frappe.db, "get_value", return_value="IST") as get_value_mock:
            with patch.object(communication_api, "assert_office_branch_access") as assert_branch_mock:
                communication_api._assert_draft_branch_access("DRF-2")

        get_value_mock.assert_called_once_with("AT Notification Draft", "DRF-2", "office_branch")
        assert_branch_mock.assert_called_once_with("IST")
