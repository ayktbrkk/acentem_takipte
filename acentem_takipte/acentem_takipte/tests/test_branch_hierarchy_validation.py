from __future__ import annotations

import pytest
import frappe

from acentem_takipte.acentem_takipte.doctype.at_office_branch.at_office_branch import (
    ATOfficeBranch,
)
from acentem_takipte.acentem_takipte.doctype.at_sales_entity.at_sales_entity import (
    ATSalesEntity,
)


class DummyDoc:
    def __init__(self, **values):
        for key, value in values.items():
            setattr(self, key, value)

    def get(self, key, default=None):
        return getattr(self, key, default)

    def _validate_no_parent_cycle(self, parent_name):
        return ATSalesEntity._validate_no_parent_cycle(self, parent_name)


def _raise_exception(message):
    raise Exception(str(message))


def test_head_office_cannot_have_parent(monkeypatch):
    doc = DummyDoc(name="AT Sigorta", office_branch_name="AT Sigorta", is_head_office=1, parent_office_branch="SUB-1")

    monkeypatch.setattr(frappe.db, "get_value", lambda *args, **kwargs: None, raising=False)
    monkeypatch.setattr(frappe, "throw", _raise_exception, raising=False)

    with pytest.raises(Exception):
        ATOfficeBranch._validate_head_office_rules(doc)


def test_non_head_branch_requires_parent_when_head_office_exists(monkeypatch):
    doc = DummyDoc(name="SUB-1", office_branch_name="Ankara", is_head_office=0, parent_office_branch="")

    monkeypatch.setattr(frappe.db, "get_value", lambda *args, **kwargs: "AT Sigorta", raising=False)
    monkeypatch.setattr(frappe, "throw", _raise_exception, raising=False)

    with pytest.raises(Exception):
        ATOfficeBranch._validate_parent_constraints(doc)


def test_branch_cycle_is_rejected(monkeypatch):
    doc = DummyDoc(name="SUB-1", office_branch_name="Ankara", is_head_office=0, parent_office_branch="SUB-2")

    def fake_get_value(doctype, name, fieldname):
        mapping = {
            ("AT Office Branch", "SUB-2", "parent_office_branch"): "SUB-1",
        }
        return mapping.get((doctype, name, fieldname))

    monkeypatch.setattr(frappe.db, "get_value", fake_get_value, raising=False)
    monkeypatch.setattr(frappe, "throw", _raise_exception, raising=False)

    with pytest.raises(Exception):
        ATOfficeBranch._validate_cycle(doc)


def test_sales_entity_parent_branch_must_match(monkeypatch):
    doc = DummyDoc(name="TEAM-2", parent_entity="TEAM-1", office_branch="SUB-2")

    monkeypatch.setattr(frappe.db, "get_value", lambda *args, **kwargs: "SUB-1", raising=False)
    monkeypatch.setattr(frappe, "throw", _raise_exception, raising=False)

    with pytest.raises(Exception):
        ATSalesEntity._validate_parent_constraints(doc)


def test_sales_entity_parent_branch_match_is_allowed(monkeypatch):
    doc = DummyDoc(name="TEAM-2", parent_entity="TEAM-1", office_branch="SUB-1")

    monkeypatch.setattr(frappe.db, "get_value", lambda *args, **kwargs: "SUB-1", raising=False)
    monkeypatch.setattr(frappe, "throw", _raise_exception, raising=False)

    ATSalesEntity._validate_parent_constraints(doc)
