from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from acentem_takipte.acentem_takipte.services import quick_create


def test_insert_doc_logs_create_audit_event():
    fake_doc = MagicMock()
    fake_doc.doctype = "AT Claim"
    fake_doc.name = "CLM-0001"

    fake_frappe = SimpleNamespace(
        get_doc=lambda payload: fake_doc,
        db=SimpleNamespace(commit=lambda: None),
    )

    with patch.object(quick_create, "frappe", fake_frappe):
        with patch.object(quick_create, "log_decision_event") as audit_mock:
            result = quick_create._insert_doc({"doctype": "AT Claim"}, "claim")

    audit_mock.assert_called_once_with(
        "AT Claim",
        "CLM-0001",
        action="Create",
        action_summary="AT Claim created",
        decision_context="claim",
    )
    assert result == {"claim": "CLM-0001"}


def test_update_aux_record_logs_edit_audit_event():
    fake_doc = MagicMock()
    fake_doc.doctype = "AT Ownership Assignment"
    fake_doc.name = "AT-ASN-0001"

    fake_frappe = SimpleNamespace(db=SimpleNamespace(commit=lambda: None))

    with patch.object(quick_create, "frappe", fake_frappe):
        with patch.object(quick_create, "log_decision_event") as audit_mock:
            result = quick_create.update_aux_record(fake_doc)

    fake_doc.save.assert_called_once_with()
    audit_mock.assert_called_once_with(
        "AT Ownership Assignment",
        "AT-ASN-0001",
        action="Edit",
        action_summary="AT Ownership Assignment updated",
        decision_context="quick_aux_edit",
    )
    assert result == {"record": "AT-ASN-0001"}


def test_delete_aux_record_logs_delete_audit_event():
    fake_doc = MagicMock()
    fake_doc.doctype = "AT Call Note"
    fake_doc.name = "AT-CALL-0001"

    fake_frappe = SimpleNamespace(db=SimpleNamespace(commit=lambda: None))

    with patch.object(quick_create, "frappe", fake_frappe):
        with patch.object(quick_create, "log_decision_event") as audit_mock:
            result = quick_create.delete_aux_record(fake_doc)

    fake_doc.delete.assert_called_once_with()
    audit_mock.assert_called_once_with(
        "AT Call Note",
        "AT-CALL-0001",
        action="Delete",
        action_summary="AT Call Note deleted",
        decision_context="quick_aux_delete",
    )
    assert result == {"record": "AT-CALL-0001", "doctype": "AT Call Note", "deleted": True}

