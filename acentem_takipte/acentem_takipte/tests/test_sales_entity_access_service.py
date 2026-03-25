from __future__ import annotations

import sys
import types
from types import SimpleNamespace

if "frappe" not in sys.modules:
    frappe_stub = types.ModuleType("frappe")
    frappe_stub._ = lambda message: message
    frappe_stub.throw = lambda message: (_ for _ in ()).throw(Exception(message))
    frappe_stub.flags = SimpleNamespace()
    frappe_stub.db = SimpleNamespace(exists=lambda *args, **kwargs: False, has_column=lambda *args, **kwargs: False)
    frappe_stub.session = SimpleNamespace(user="test@example.com")
    frappe_stub.get_roles = lambda user=None: []
    frappe_stub.get_all = lambda *args, **kwargs: []
    frappe_stub.get_doc = lambda *args, **kwargs: None
    frappe_stub.publish_realtime = lambda *args, **kwargs: None
    frappe_stub.cache = lambda: SimpleNamespace(
        get_value=lambda *args, **kwargs: None,
        set_value=lambda *args, **kwargs: None,
        delete_value=lambda *args, **kwargs: None,
    )
    sys.modules["frappe"] = frappe_stub

    utils_stub = types.ModuleType("frappe.utils")
    utils_stub.getdate = lambda value=None: value
    utils_stub.today = lambda: "2026-01-01"
    sys.modules["frappe.utils"] = utils_stub

    model_stub = types.ModuleType("frappe.model")
    document_stub = types.ModuleType("frappe.model.document")

    class Document:
        pass

    document_stub.Document = Document
    sys.modules["frappe.model"] = model_stub
    sys.modules["frappe.model.document"] = document_stub

from acentem_takipte.acentem_takipte.services import sales_entities as sales_entity_service


def test_get_allowed_sales_entity_names_expands_descendants(monkeypatch):
    monkeypatch.setattr(sales_entity_service, "user_can_access_all_sales_entities", lambda user=None: False)
    monkeypatch.setattr(sales_entity_service.frappe, "db", type("DB", (), {"exists": staticmethod(lambda *args, **kwargs: True)}))
    monkeypatch.setattr(
        sales_entity_service,
        "_get_cached_allowed_sales_entities",
        lambda user_id: None,
    )
    monkeypatch.setattr(
        sales_entity_service,
        "_get_user_sales_entity_access_rows",
        lambda user_id: [{"sales_entity": "ROOT", "scope_mode": sales_entity_service.DESCENDANT_SCOPE_MODE}],
    )
    monkeypatch.setattr(
        sales_entity_service,
        "_get_descendant_sales_entity_names",
        lambda seeds, include_inactive=False: {"CHILD-1", "CHILD-2"},
    )

    allowed = sales_entity_service.get_allowed_sales_entity_names("agent@example.com")

    assert allowed == {"ROOT", "CHILD-1", "CHILD-2"}


def test_normalize_requested_sales_entity_falls_back_to_default(monkeypatch):
    monkeypatch.setattr(sales_entity_service, "user_can_access_all_sales_entities", lambda user=None: False)
    monkeypatch.setattr(
        sales_entity_service,
        "get_allowed_sales_entity_names",
        lambda user=None, include_inactive=False: {"AT-ENT-1"},
    )
    monkeypatch.setattr(sales_entity_service, "get_default_sales_entity", lambda user=None: "AT-ENT-1")

    normalized = sales_entity_service.normalize_requested_sales_entity("AT-ENT-9", user="agent@example.com")

    assert normalized == "AT-ENT-1"


def test_get_allowed_sales_entity_names_returns_empty_when_doctype_missing(monkeypatch):
    monkeypatch.setattr(sales_entity_service, "user_can_access_all_sales_entities", lambda user=None: False)
    monkeypatch.setattr(sales_entity_service.frappe, "db", type("DB", (), {"exists": staticmethod(lambda *args, **kwargs: False)}))

    allowed = sales_entity_service.get_allowed_sales_entity_names("agent@example.com")

    assert allowed == set()


def test_clear_user_scope_cache_delegates_to_branch_service(monkeypatch):
    captured: list[str] = []

    monkeypatch.setattr(
        sales_entity_service.branch_service,
        "clear_user_scope_cache",
        lambda user: captured.append(user),
    )

    sales_entity_service.clear_user_scope_cache("agent@example.com")

    assert captured == ["agent@example.com"]


def test_get_pool_sales_entity_name_uses_branch_and_pool_filters(monkeypatch):
    captured: dict[str, object] = {}

    db = SimpleNamespace(
        has_column=lambda doctype, column: column == "is_pool",
        get_value=lambda doctype, filters, fieldname, order_by=None: captured.update(
            {
                "doctype": doctype,
                "filters": filters,
                "fieldname": fieldname,
                "order_by": order_by,
            }
        ) or "POOL-ENTITY",
    )
    monkeypatch.setattr(sales_entity_service, "frappe", SimpleNamespace(db=db))

    pool_name = sales_entity_service.get_pool_sales_entity_name("ANK", include_inactive=True)

    assert pool_name == "POOL-ENTITY"
    assert captured["doctype"] == "AT Sales Entity"
    assert captured["filters"] == {"office_branch": "ANK", "is_pool": 1}
    assert captured["fieldname"] == "name"


def test_reassign_sales_entity_records_to_branch_pool_updates_only_open_rows(monkeypatch):
    updated: list[tuple[str, str, str, str]] = []

    def fake_get_all(doctype, filters=None, fields=None, limit_page_length=0, order_by=None):
        if doctype == "AT Lead":
            assert filters == {"sales_entity": "SE-1", "office_branch": "BR-1", "status": ["in", ["Draft", "Open", "Replied"]]}
            return [{"name": "LEAD-1"}, {"name": "LEAD-2"}]
        if doctype == "AT Offer":
            return []
        if doctype == "AT Policy":
            return [{"name": "POL-1"}]
        if doctype == "AT Payment":
            return []
        raise AssertionError(f"Unexpected doctype {doctype}")

    db = SimpleNamespace(
        has_column=lambda doctype, column: True,
        get_value=lambda doctype, name, fieldname: "BR-1",
        set_value=lambda doctype, name, fieldname, value, update_modified=False: updated.append(
            (doctype, name, fieldname, value)
        ),
    )
    monkeypatch.setattr(
        sales_entity_service,
        "frappe",
        SimpleNamespace(db=db, get_all=fake_get_all),
    )
    monkeypatch.setattr(
        sales_entity_service,
        "get_pool_sales_entity_name",
        lambda office_branch, include_inactive=False, exclude_sales_entity=None: "POOL-1",
    )

    result = sales_entity_service.reassign_sales_entity_records_to_branch_pool(
        "SE-1",
        office_branch="BR-1",
    )

    assert result == {"AT Lead": 2, "AT Policy": 1}
    assert updated == [
        ("AT Lead", "LEAD-1", "sales_entity", "POOL-1"),
        ("AT Lead", "LEAD-2", "sales_entity", "POOL-1"),
        ("AT Policy", "POL-1", "sales_entity", "POOL-1"),
    ]


def test_handle_office_branch_update_deactivates_branch_entities_on_disable(monkeypatch):
    calls: list[tuple[str, object]] = []

    monkeypatch.setattr(
        sales_entity_service.branch_service,
        "invalidate_scope_cache_for_hierarchy_change",
        lambda doc=None, method=None: calls.append(("invalidate", getattr(doc, "name", None))),
    )
    monkeypatch.setattr(
        sales_entity_service,
        "deactivate_branch_sales_entities_and_reassign",
        lambda office_branch: calls.append(("deactivate", office_branch)),
    )
    monkeypatch.setattr(
        sales_entity_service,
        "frappe",
        SimpleNamespace(db=SimpleNamespace(has_column=lambda doctype, column: True)),
    )

    doc = SimpleNamespace(
        name="BR-1",
        is_active=0,
        has_value_changed=lambda fieldname: fieldname == "is_active",
        get_doc_before_save=lambda: SimpleNamespace(is_active=1),
    )

    sales_entity_service.handle_office_branch_update(doc)

    assert calls == [("invalidate", "BR-1"), ("deactivate", "BR-1")]
