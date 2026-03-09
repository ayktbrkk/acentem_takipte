from __future__ import annotations

import types
from unittest.mock import patch

from acentem_takipte.acentem_takipte.notification_seed_service import upsert_default_notification_templates


def test_upsert_default_notification_templates_creates_missing_templates():
    inserted = []

    class FakeInsertDoc:
        def __init__(self, payload):
            self.payload = payload

        def insert(self):
            inserted.append(self.payload)
            return self

    with patch("acentem_takipte.acentem_takipte.notification_seed_service.frappe.db.get_value", return_value=None):
        with patch(
            "acentem_takipte.acentem_takipte.notification_seed_service.frappe.get_doc",
            side_effect=lambda payload, name=None: FakeInsertDoc(payload) if isinstance(payload, dict) else None,
        ):
            result = upsert_default_notification_templates()

    assert result["created"] == result["total"]
    assert result["updated"] == 0
    assert inserted


def test_upsert_default_notification_templates_updates_existing_templates():
    updated_docs = []

    class FakeExistingDoc:
        def __init__(self):
            self.values = {}

        def set(self, key, value):
            self.values[key] = value

        def save(self):
            updated_docs.append(self.values.copy())
            return self

    def fake_get_doc(arg1, arg2=None):
        if isinstance(arg1, dict):
            raise AssertionError("Create path should not be used in update-only test")
        return FakeExistingDoc()

    with patch("acentem_takipte.acentem_takipte.notification_seed_service.frappe.db.get_value", return_value="TPL-0001"):
        with patch("acentem_takipte.acentem_takipte.notification_seed_service.frappe.get_doc", side_effect=fake_get_doc):
            result = upsert_default_notification_templates()

    assert result["created"] == 0
    assert result["updated"] == result["total"]
    assert updated_docs
    assert "template_key" in updated_docs[0]
