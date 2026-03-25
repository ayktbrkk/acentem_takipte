from __future__ import annotations

from types import SimpleNamespace

import pytest

from acentem_takipte.acentem_takipte.doctype.at_accounting_entry.at_accounting_entry import (
    ATAccountingEntry,
)
from acentem_takipte.acentem_takipte.doctype.at_accounting_entry import at_accounting_entry as accounting_entry_module


def test_accounting_entry_autofills_dimensions_from_policy(monkeypatch):
    doc = SimpleNamespace(
        policy="POL-001",
        customer=None,
        office_branch=None,
        sales_entity=None,
        local_amount_try=100,
        external_amount_try=100,
        status="Synced",
    )

    def _fake_get_value(doctype, name, fieldname, as_dict=False):
        if doctype == "AT Policy" and name == "POL-001":
            return {
                "customer": "CUS-001",
                "office_branch": "BR-IST",
                "sales_entity": "SE-001",
            }
        return None

    monkeypatch.setattr(accounting_entry_module.frappe.db, "get_value", _fake_get_value)

    ATAccountingEntry.validate(doc)

    assert doc.customer == "CUS-001"
    assert doc.office_branch == "BR-IST"
    assert doc.sales_entity == "SE-001"


def test_accounting_entry_rejects_sales_entity_office_mismatch(monkeypatch):
    doc = SimpleNamespace(
        policy=None,
        customer=None,
        office_branch="BR-IST",
        sales_entity="SE-ANK",
        local_amount_try=100,
        external_amount_try=100,
        status="Synced",
    )

    def _fake_get_value(doctype, name, fieldname, as_dict=False):
        if doctype == "AT Sales Entity" and name == "SE-ANK" and fieldname == "office_branch":
            return "BR-ANK"
        return None

    monkeypatch.setattr(accounting_entry_module.frappe.db, "get_value", _fake_get_value)

    with pytest.raises(Exception):
        ATAccountingEntry.validate(doc)
