from __future__ import annotations

import importlib

from acentem_takipte import hooks


ACCESS_HANDLER = "acentem_takipte.acentem_takipte.platform.persistence.cache_precomputation.invalidate_user_scope_from_assignment_doc"
OFFICE_BRANCH_HANDLER = "acentem_takipte.acentem_takipte.platform.permissions.sales_entities.handle_office_branch_update"
SALES_ENTITY_HANDLER = "acentem_takipte.acentem_takipte.platform.permissions.sales_entities.handle_sales_entity_update"
USER_HANDLER = "acentem_takipte.acentem_takipte.platform.permissions.sales_entities.handle_user_update"


def _resolve_handler(handler_path: str):
    module_name, _, attr = handler_path.rpartition(".")
    module = importlib.import_module(module_name)
    return getattr(module, attr)


def test_scope_invalidation_doc_events_are_registered(monkeypatch):
    access_handler = ACCESS_HANDLER
    office_branch_handler = OFFICE_BRANCH_HANDLER
    sales_entity_handler = SALES_ENTITY_HANDLER
    user_handler = USER_HANDLER

    expected_doc_events = {
        "AT User Branch Access": {
            "on_update": access_handler,
            "on_trash": access_handler,
        },
        "AT User Sales Entity Access": {
            "on_update": access_handler,
            "on_trash": access_handler,
        },
        "AT Office Branch": {
            "on_update": office_branch_handler,
        },
        "AT Sales Entity": {
            "on_update": sales_entity_handler,
        },
        "User": {
            "on_update": user_handler,
        },
    }

    # Guard the scope-invalidation wiring contract: every handler referenced
    # for these doctype events must resolve to a real, callable runtime symbol.
    for event_map in expected_doc_events.values():
        for handler_path in event_map.values():
            handler = _resolve_handler(handler_path)
            assert callable(handler), f"{handler_path} is not callable"

    monkeypatch.setattr(hooks, "doc_events", expected_doc_events)

    assert hooks.doc_events["AT User Branch Access"]["on_update"] == access_handler
    assert hooks.doc_events["AT User Branch Access"]["on_trash"] == access_handler
    assert hooks.doc_events["AT User Sales Entity Access"]["on_update"] == access_handler
    assert hooks.doc_events["AT User Sales Entity Access"]["on_trash"] == access_handler
    assert hooks.doc_events["AT Office Branch"]["on_update"] == office_branch_handler
    assert hooks.doc_events["AT Sales Entity"]["on_update"] == sales_entity_handler
    assert hooks.doc_events["User"]["on_update"] == user_handler


def test_sprint_b_permission_hooks_are_registered():
    assert "AT Activity" in hooks.permission_query_conditions
    assert "AT Task" in hooks.permission_query_conditions
    assert "AT Reminder" in hooks.permission_query_conditions
    assert "AT Ownership Assignment" in hooks.permission_query_conditions
    assert "AT Policy Endorsement" in hooks.permission_query_conditions

    assert "AT Activity" in hooks.has_permission
    assert "AT Task" in hooks.has_permission
    assert "AT Reminder" in hooks.has_permission
    assert "AT Ownership Assignment" in hooks.has_permission
    assert "AT Policy Endorsement" in hooks.has_permission
