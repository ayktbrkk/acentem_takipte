from __future__ import annotations

from unittest.mock import patch
from types import SimpleNamespace

from frappe.tests.utils import FrappeTestCase as IntegrationTestCase

from acentem_takipte.acentem_takipte.platform.api.documents import (
    _resolve_reference_token,
    archive_document,
    get_document_context,
    share_document,
    track_document_view,
    permanent_delete_document,
    restore_document,
    upload_document,
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


class FakeFileDoc:
    def __init__(self, file_url: str = "/private/files/FILE-001.pdf", is_private: int = 1):
        self.file_url = file_url
        self.is_private = is_private


class TestDocumentsApi(IntegrationTestCase):
    def test_customer_reference_token_uses_existing_customer_fields(self):
        with patch(
            "acentem_takipte.acentem_takipte.platform.api.documents.frappe.db.get_value",
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
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.get_doc", return_value=fake_doc),
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.has_permission", return_value=True),
            patch("acentem_takipte.acentem_takipte.platform.api.documents.log_decision_event"),
        ):
            result = archive_document("AT-DOC-001")

        self.assertEqual(fake_doc.status, "Archived")
        self.assertTrue(fake_doc.saved)
        self.assertEqual(result["status"], "success")

    def test_restore_document_sets_status_to_active(self):
        fake_doc = FakeDoc("AT-DOC-001", "Archived")
        with (
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.get_doc", return_value=fake_doc),
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.has_permission", return_value=True),
            patch("acentem_takipte.acentem_takipte.platform.api.documents.log_decision_event"),
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
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.get_doc", side_effect=fake_get_doc),
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.db.exists", return_value=True),
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.db.get_value", return_value="/private/files/FILE-001.pdf"),
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.db.set_value", side_effect=fake_set_value),
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.delete_doc", side_effect=fake_delete_doc),
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.get_roles", return_value=["System Manager"]),
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.has_permission", return_value=True),
            patch("acentem_takipte.acentem_takipte.platform.api.documents.log_decision_event"),
        ):
            result = permanent_delete_document("AT-DOC-001")

        self.assertEqual(db_set_calls[0], ("AT Document", "AT-DOC-001", "file", "", False))
        self.assertEqual(delete_calls[0], ("AT Document", "AT-DOC-001", True, False))
        self.assertEqual(delete_calls[1], ("File", "FILE-001", True, True))
        self.assertEqual(result["status"], "success")

    def test_permanent_delete_document_requires_system_manager(self):
        fake_doc = FakeDoc("AT-DOC-001", "Active")
        with (
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.get_doc", return_value=fake_doc),
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.get_roles", return_value=["AT User"]),
        ):
            with self.assertRaises(Exception):
                permanent_delete_document("AT-DOC-001")

    def test_track_document_view_logs_access(self):
        calls = []

        with (
            patch(
                "acentem_takipte.acentem_takipte.platform.api.documents.assert_doc_permission",
                return_value=SimpleNamespace(name="AT-DOC-001"),
            ),
            patch(
                "acentem_takipte.acentem_takipte.platform.api.documents.log_access",
                side_effect=lambda reference_doctype, reference_name, action="View": calls.append(
                    (reference_doctype, reference_name, action)
                ),
            ),
        ):
            result = track_document_view("AT Document", "AT-DOC-001")

        self.assertEqual(result["status"], "success")
        self.assertEqual(calls[0], ("AT Document", "AT-DOC-001", "View"))

    def test_upload_document_rejects_public_files_for_attached_documents(self):
        file_doc = SimpleNamespace(name="FILE-001", file_name="policy.pdf", file_url="/files/policy.pdf", is_private=0)
        with (
            patch("acentem_takipte.acentem_takipte.platform.api.documents._resolve_uploaded_file_name", return_value="FILE-001"),
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.db.exists", return_value=True),
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.get_doc", return_value=file_doc),
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.throw", side_effect=RuntimeError),
        ):
            with self.assertRaises(RuntimeError):
                upload_document(
                    file_name="FILE-001",
                    attached_to_doctype="AT Policy",
                    attached_to_name="AT-POL-001",
                )

    def test_share_document_rejects_sensitive_documents(self):
        document_doc = SimpleNamespace(file="FILE-001", is_sensitive=1, customer=None)
        file_doc = FakeFileDoc(file_url="/files/policy.pdf", is_private=0)

        def fake_get_doc(doctype, name):
            if doctype == "AT Document":
                return document_doc
            if doctype == "File":
                return file_doc
            raise AssertionError(f"Unexpected get_doc call: {doctype} {name}")

        with (
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.get_doc", side_effect=fake_get_doc),
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.has_permission", return_value=True),
        ):
            with self.assertRaises(Exception) as err:
                share_document("AT-DOC-001", "url")

        self.assertIn("sensitive", str(err.exception).lower())

    def test_share_document_rejects_private_files(self):
        document_doc = SimpleNamespace(file="FILE-001", is_sensitive=0, customer="AT-CUST-001")
        file_doc = FakeFileDoc(file_url="/private/files/policy.pdf", is_private=1)

        def fake_get_doc(doctype, name):
            if doctype == "AT Document":
                return document_doc
            if doctype == "File":
                return file_doc
            raise AssertionError(f"Unexpected get_doc call: {doctype} {name}")

        with (
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.get_doc", side_effect=fake_get_doc),
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.has_permission", return_value=True),
        ):
            with self.assertRaises(Exception) as err:
                share_document("AT-DOC-001", "whatsapp")

        self.assertIn("private", str(err.exception).lower())

    def test_get_document_context_checks_permission_before_customer_lookup(self):
        with (
            patch(
                "acentem_takipte.acentem_takipte.platform.api.documents.assert_doc_permission",
                side_effect=PermissionError("denied"),
            ) as permission_mock,
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.db.get_value") as get_value_mock,
        ):
            with self.assertRaises(PermissionError):
                get_document_context("AT Customer", "AT-CUST-001")

        permission_mock.assert_called_once_with("AT Customer", "AT-CUST-001", "read")
        get_value_mock.assert_not_called()

    def test_get_document_context_masks_customer_identity(self):
        def fake_get_value(doctype, name, fields=None, as_dict=False):
            if doctype == "AT Customer":
                return SimpleNamespace(
                    name=name,
                    full_name="Aykut Bekir",
                    masked_tax_id="123******01",
                )
            raise AssertionError(f"Unexpected get_value call: {doctype} {name}")

        with (
            patch("acentem_takipte.acentem_takipte.platform.api.documents.assert_doc_permission"),
            patch("acentem_takipte.acentem_takipte.platform.api.documents.frappe.db.get_value", side_effect=fake_get_value),
        ):
            payload = get_document_context("AT Customer", "AT-CUST-001")

        self.assertEqual(payload["record_name"], "Aykut Bekir")
        self.assertEqual(payload["customer_name"], "Aykut Bekir")
        self.assertEqual(payload["customer_id"], "123******01")
        self.assertNotEqual(payload["customer_id"], "12345678901")
