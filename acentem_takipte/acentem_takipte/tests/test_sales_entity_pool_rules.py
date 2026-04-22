from __future__ import annotations

import sys
import types
from types import SimpleNamespace

import pytest

if "frappe" not in sys.modules:
    frappe_stub = types.ModuleType("frappe")
    frappe_stub._ = lambda message: message
    frappe_stub.throw = lambda message: (_ for _ in ()).throw(Exception(message))
    frappe_stub.flags = SimpleNamespace()
    frappe_stub.db = SimpleNamespace(
        has_column=lambda *args, **kwargs: False,
        get_value=lambda *args, **kwargs: None,
    )
    sys.modules["frappe"] = frappe_stub

    model_stub = types.ModuleType("frappe.model")
    document_stub = types.ModuleType("frappe.model.document")

    class Document:
        pass

    document_stub.Document = Document
    sys.modules["frappe.model"] = model_stub
    sys.modules["frappe.model.document"] = document_stub

    utils_stub = types.ModuleType("frappe.utils")
    utils_stub.getdate = lambda value=None: value
    utils_stub.today = lambda: "2026-01-01"
    sys.modules["frappe.utils"] = utils_stub

from acentem_takipte.acentem_takipte.doctype.at_sales_entity.at_sales_entity import ATSalesEntity
from acentem_takipte.acentem_takipte.doctype.at_sales_entity import at_sales_entity as module


def _raising_throw(message):
    raise Exception(message)


def _make_doc(**overrides):
    data = {
        "name": "AT-ENT-1",
        "entity_type": "Agency",
        "full_name": "Entity 1",
        "office_branch": "BR-1",
        "parent_entity": None,
        "is_active": 1,
        "is_pool": 0,
    }
    data.update(overrides)
    return SimpleNamespace(**data, get=lambda key, default=None: getattr(SimpleNamespace(**data), key, default))


def test_validate_rejects_multiple_pool_entities(monkeypatch):
    doc = _make_doc(is_pool=1)

    monkeypatch.setattr(module.frappe, "throw", _raising_throw, raising=False)
    monkeypatch.setattr(
        module.frappe,
        "db",
        SimpleNamespace(
            has_column=lambda doctype, column: True,
            get_value=lambda doctype, name, fieldname: None,
        ),
    )
    monkeypatch.setattr(module.sales_entity_service, "is_office_branch_active", lambda office_branch: True)
    monkeypatch.setattr(
        module.sales_entity_service,
        "get_pool_sales_entity_name",
        lambda office_branch, include_inactive=True, exclude_sales_entity=None: "POOL-EXISTING",
    )

    with pytest.raises(Exception):
        ATSalesEntity.validate(doc)


def test_validate_rejects_deactivating_pool_in_active_branch(monkeypatch):
    doc = _make_doc(is_pool=1, is_active=0)

    monkeypatch.setattr(module.frappe, "throw", _raising_throw, raising=False)
    monkeypatch.setattr(module.frappe, "flags", SimpleNamespace())
    monkeypatch.setattr(
        module.frappe,
        "db",
        SimpleNamespace(
            has_column=lambda doctype, column: True,
            get_value=lambda doctype, name, fieldname: None,
        ),
    )
    monkeypatch.setattr(module.sales_entity_service, "is_office_branch_active", lambda office_branch: True)
    monkeypatch.setattr(
        module.sales_entity_service,
        "get_pool_sales_entity_name",
        lambda office_branch, include_inactive=True, exclude_sales_entity=None: None,
    )

    with pytest.raises(Exception):
        ATSalesEntity.validate(doc)


def test_validate_requires_pool_for_active_branch(monkeypatch):
    doc = _make_doc(is_pool=0, is_active=1)

    monkeypatch.setattr(module.frappe, "throw", _raising_throw, raising=False)
    monkeypatch.setattr(
        module.frappe,
        "db",
        SimpleNamespace(
            has_column=lambda doctype, column: True,
            get_value=lambda doctype, name, fieldname: None,
        ),
    )
    monkeypatch.setattr(module.sales_entity_service, "is_office_branch_active", lambda office_branch: True)
    monkeypatch.setattr(
        module.sales_entity_service,
        "get_pool_sales_entity_name",
        lambda office_branch, include_inactive=True, exclude_sales_entity=None: None,
    )

    with pytest.raises(Exception):
        ATSalesEntity.validate(doc)
