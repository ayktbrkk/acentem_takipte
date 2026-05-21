from __future__ import annotations

import pytest

from acentem_takipte.acentem_takipte.services.access_policy import (
    AccessPolicyError,
        build_access_policy,
    clear_access_policy_cache,
    get_default_access_policy_path,
    load_access_policy,
)


def test_load_default_access_policy_template():
    clear_access_policy_cache()

    policy = load_access_policy(use_cache=False)

    assert get_default_access_policy_path().exists()
    assert policy.version == 1
    assert policy.roles_for_family("operational") == ("AT Agent", "AT Accountant", "AT Manager")
    assert policy.visible_doctypes_for_family("operational")

    customer_policy = policy.get_doctype_policy("AT Customer")
    assert customer_policy is not None
    assert customer_policy.permission_bundle == "operational_full"
    assert customer_policy.runtime_scope["type"] == "branch_plus_personal_portfolio"

    document_policy = policy.get_doctype_policy("AT Document")
    assert document_policy is not None
    assert document_policy.permission_bundle == "operational_document_limited"
    assert document_policy.runtime_scope["type"] == "linked_record_or_owner_fallback"

    task_policy = policy.get_doctype_policy("AT Task")
    assert task_policy is not None
    assert task_policy.runtime_scope["type"] == "branch_only"

    accounting_policy = policy.get_doctype_policy("AT Accounting Entry")
    assert accounting_policy is not None
    assert accounting_policy.visible_to == "system"
    assert accounting_policy.runtime_scope["type"] == "branch_and_sales_entity"


def test_access_policy_loader_rejects_duplicate_doctypes():
    raw_policy = {
        "version": 1,
        "role_families": {"operational": {"roles": ["AT Agent"]}},
        "scope_sources": {},
        "permission_bundles": {"operational_full": {"read": True}},
        "governance_rules": {},
        "doctype_policies": [
            {
                "doctype": "AT Lead",
                "visible_to": "operational",
                "permission_bundle": "operational_full",
                "runtime_scope": {"type": "branch_only"},
            },
            {
                "doctype": "AT Lead",
                "visible_to": "operational",
                "permission_bundle": "operational_full",
                "runtime_scope": {"type": "branch_only"},
            },
        ],
        "risk_checks": [],
    }

    with pytest.raises(AccessPolicyError, match="duplicate doctype"):
        build_access_policy(raw_policy, source_name="duplicate.yml")


def test_access_policy_loader_rejects_unknown_bundle():
    raw_policy = {
        "version": 1,
        "role_families": {"operational": {"roles": ["AT Agent"]}},
        "scope_sources": {},
        "permission_bundles": {"operational_full": {"read": True}},
        "governance_rules": {},
        "doctype_policies": [
            {
                "doctype": "AT Lead",
                "visible_to": "operational",
                "permission_bundle": "missing_bundle",
                "runtime_scope": {"type": "branch_only"},
            }
        ],
        "risk_checks": [],
    }

    with pytest.raises(AccessPolicyError, match="unknown permission bundle"):
        build_access_policy(raw_policy, source_name="unknown_bundle.yml")