from __future__ import annotations

from acentem_takipte import hooks


def test_scope_invalidation_doc_events_are_registered():
    access_handler = "acentem_takipte.acentem_takipte.services.cache_precomputation.invalidate_user_scope_from_assignment_doc"
    office_branch_handler = "acentem_takipte.acentem_takipte.services.sales_entities.handle_office_branch_update"
    sales_entity_handler = "acentem_takipte.acentem_takipte.services.sales_entities.handle_sales_entity_update"
    user_handler = "acentem_takipte.acentem_takipte.services.sales_entities.handle_user_update"

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
