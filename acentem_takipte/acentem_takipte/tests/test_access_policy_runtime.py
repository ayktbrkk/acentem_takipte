from __future__ import annotations

from acentem_takipte.acentem_takipte.platform.permissions.access_policy_runtime import (
    build_permission_matrix,
    build_runtime_permission_hooks,
)


def test_permission_matrix_keeps_declarative_doctypes_aligned():
    matrix = build_permission_matrix()

    assert matrix["AT Lead"]["AT Agent"][0]["read"] == 1
    assert matrix["AT Document"]["AT Agent"][0]["delete"] == 0
    assert matrix["AT Task"]["AT Accountant"][0]["create"] == 1
    assert matrix["AT Notification Draft"] == {}
    assert matrix["AT Policy Snapshot"]["AT Manager"][0]["report"] == 1
    assert matrix["AT Accounting Entry"] == {}


def test_runtime_permission_hooks_cover_declarative_and_special_scope_doctypes():
    query_hooks, permission_hooks = build_runtime_permission_hooks()

    assert query_hooks["AT Lead"].endswith("branch_permissions.get_lead_permission_query_conditions")
    assert permission_hooks["AT Claim"].endswith("branch_permissions.has_claim_permission")
    assert query_hooks["AT Document"].endswith("at_document.at_document.get_permission_query_conditions")
    assert permission_hooks["AT Task"].endswith("branch_permissions.has_task_permission")
    assert query_hooks["AT Policy Endorsement"].endswith("branch_permissions.get_policy_endorsement_permission_query_conditions")
    assert permission_hooks["AT Reconciliation Item"].endswith("branch_permissions.has_reconciliation_item_permission")