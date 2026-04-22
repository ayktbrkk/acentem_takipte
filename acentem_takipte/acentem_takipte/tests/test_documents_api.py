from __future__ import annotations

from unittest.mock import patch

from frappe.tests.utils import FrappeTestCase as IntegrationTestCase

from acentem_takipte.acentem_takipte.api.documents import (
    _resolve_reference_token,
    archive_document,
    permanent_delete_document,
    restore_document,
)


class FakeDoc:
    def __init__(self, name: str, status: str = "Active", file_name: str = "FILE-001"):
        self.name = name
        self.status = status
        self.file = file_name
        self.saved = False

    def save(self, ignore_permissions=False):
        self.saved = True
        return self


class TestDocumentsApi(IntegrationTestCase):
    def test_customer_reference_token_uses_existing_customer_fields(self):
        with patch(
            "acentem_takipte.acentem_takipte.api.documents.frappe.db.get_value",
            return_value={"name": "AT-CUST-2026-000012", "tax_id": "12345678901"},
        ) as get_value_mock:
            token = _resolve_reference_token("AT Customer", "AT-CUST-2026-000012")

        get_value_mock.assert_called_once_with(
            "AT Customer",
            "AT-CUST-2026-000012",
            ["name", "tax_id"],
            as_dict=True,
        )
        self.assertEqual(token, "CUS-12345678901")

    def test_archive_document_sets_status_to_archived(self):
        fake_doc = FakeDoc("AT-DOC-001", "Active")
        with (
            patch("acentem_takipte.acentem_takipte.api.documents.frappe.get_doc", return_value=fake_doc),
            patch("acentem_takipte.acentem_takipte.api.documents.frappe.has_permission", return_value=True),
            patch("acentem_takipte.acentem_takipte.api.documents.log_decision_event"),
        ):
            result = archive_document("AT-DOC-001")

        self.assertEqual(fake_doc.status, "Archived")
        self.assertTrue(fake_doc.saved)
        self.assertEqual(result["status"], "success")

    def test_restore_document_sets_status_to_active(self):
        fake_doc = FakeDoc("AT-DOC-001", "Archived")
        with (
            patch("acentem_takipte.acentem_takipte.api.documents.frappe.get_doc", return_value=fake_doc),
            patch("acentem_takipte.acentem_takipte.api.documents.frappe.has_permission", return_value=True),
            patch("acentem_takipte.acentem_takipte.api.documents.log_decision_event"),
        ):
            result = restore_document("AT-DOC-001")

        self.assertEqual(fake_doc.status, "Active")
        self.assertTrue(fake_doc.saved)
        self.assertEqual(result["status"], "success")

    def test_permanent_delete_document_removes_file_then_doc(self):
        document_doc = FakeDoc("AT-DOC-001", "Active", "FILE-001")
        file_doc = FakeDoc("FILE-001", "Active")

        delete_calls = []
        db_set_calls = []

        def fake_delete_doc(doctype, name, ignore_permissions=False, force=False):
            delete_calls.append((doctype, name, ignore_permissions, force))

        def fake_set_value(doctype, name, fieldname, value, update_modified=False):
            db_set_calls.append((doctype, name, fieldname, value, update_modified))

        def fake_get_doc(doctype, name):
            if doctype == "AT Document":
                return document_doc
            if doctype == "File":
                return file_doc
            raise AssertionError(f"Unexpected get_doc call: {doctype} {name}")

        with (
            patch("acentem_takipte.acentem_takipte.api.documents.frappe.get_doc", side_effect=fake_get_doc),
            patch("acentem_takipte.acentem_takipte.api.documents.frappe.db.exists", return_value=True),
            patch("acentem_takipte.acentem_takipte.api.documents.frappe.db.get_value", return_value="/private/files/FILE-001.pdf"),
            patch("acentem_takipte.acentem_takipte.api.documents.frappe.db.set_value", side_effect=fake_set_value),
            patch("acentem_takipte.acentem_takipte.api.documents.frappe.delete_doc", side_effect=fake_delete_doc),
            patch("acentem_takipte.acentem_takipte.api.documents.frappe.get_roles", return_value=["System Manager"]),
            patch("acentem_takipte.acentem_takipte.api.documents.frappe.has_permission", return_value=True),
            patch("acentem_takipte.acentem_takipte.api.documents.log_decision_event"),
        ):
            result = permanent_delete_document("AT-DOC-001")

        self.assertEqual(db_set_calls[0], ("AT Document", "AT-DOC-001", "file", "", False))
        self.assertEqual(delete_calls[0], ("AT Document", "AT-DOC-001", True, False))
        self.assertEqual(delete_calls[1], ("File", "FILE-001", True, True))
        self.assertEqual(result["status"], "success")

    def test_permanent_delete_document_requires_system_manager(self):
        fake_doc = FakeDoc("AT-DOC-001", "Active")
        with (
            patch("acentem_takipte.acentem_takipte.api.documents.frappe.get_doc", return_value=fake_doc),
            patch("acentem_takipte.acentem_takipte.api.documents.frappe.get_roles", return_value=["AT User"]),
        ):
            with self.assertRaises(Exception):
                permanent_delete_document("AT-DOC-001")
