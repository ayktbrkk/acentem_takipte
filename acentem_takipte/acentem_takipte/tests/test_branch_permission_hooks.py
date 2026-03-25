from __future__ import annotations

from types import SimpleNamespace

from acentem_takipte.acentem_takipte.doctype import branch_permissions
from acentem_takipte.acentem_takipte.doctype.at_customer import at_customer


def test_build_office_branch_permission_query_returns_empty_for_all_access_user(monkeypatch):
    monkeypatch.setattr(branch_permissions, "user_can_access_all_office_branches", lambda user=None: True)

    assert branch_permissions.build_office_branch_permission_query("AT Policy", user="admin@example.com") == ""


def test_build_office_branch_permission_query_returns_in_clause(monkeypatch):
    monkeypatch.setattr(branch_permissions, "user_can_access_all_office_branches", lambda user=None: False)
    monkeypatch.setattr(branch_permissions, "get_allowed_office_branch_names", lambda user=None: {"IST", "ANK"})

    condition = branch_permissions.build_office_branch_permission_query("AT Policy", user="manager@example.com")

    assert "`tabAT Policy`.`office_branch` in (" in condition


def test_build_branch_and_sales_entity_permission_query_combines_conditions(monkeypatch):
    monkeypatch.setattr(branch_permissions, "user_can_access_all_office_branches", lambda user=None: False)
    monkeypatch.setattr(branch_permissions, "user_can_access_all_sales_entities", lambda user=None: False)
    monkeypatch.setattr(branch_permissions, "get_allowed_office_branch_names", lambda user=None: {"IST"})
    monkeypatch.setattr(branch_permissions, "get_allowed_sales_entity_names", lambda user=None: {"ENT-1"})
    monkeypatch.setattr(branch_permissions, "_doctype_has_column", lambda doctype, fieldname: True)

    condition = branch_permissions.build_branch_and_sales_entity_permission_query(
        "AT Policy", user="manager@example.com"
    )

    assert "office_branch" in condition
    assert "sales_entity" in condition
    assert " and " in condition


def test_build_branch_and_sales_entity_permission_query_falls_back_to_branch_when_no_entity_access(monkeypatch):
    monkeypatch.setattr(branch_permissions, "user_can_access_all_office_branches", lambda user=None: False)
    monkeypatch.setattr(branch_permissions, "user_can_access_all_sales_entities", lambda user=None: False)
    monkeypatch.setattr(branch_permissions, "get_allowed_office_branch_names", lambda user=None: {"IST"})
    monkeypatch.setattr(branch_permissions, "get_allowed_sales_entity_names", lambda user=None: set())
    monkeypatch.setattr(branch_permissions, "_doctype_has_column", lambda doctype, fieldname: True)

    condition = branch_permissions.build_branch_and_sales_entity_permission_query(
        "AT Policy", user="manager@example.com"
    )

    assert "office_branch" in condition
    assert "sales_entity" not in condition


def test_customer_permission_query_conditions_combine_agent_and_branch_scope(monkeypatch):
    monkeypatch.setattr(at_customer, "_can_access_all_customers", lambda user: False)
    monkeypatch.setattr(
        at_customer,
        "frappe",
        SimpleNamespace(get_roles=lambda user: ["Agent"], db=SimpleNamespace(escape=lambda value: f"'{value}'")),
    )
    monkeypatch.setattr(
        at_customer,
        "build_office_branch_permission_query",
        lambda doctype, user=None: "`tabAT Customer`.`office_branch` in ('ANK')",
    )

    condition = at_customer.get_permission_query_conditions("agent@example.com")

    assert "assigned_agent" in condition
    assert "office_branch" in condition


def test_has_branch_and_sales_entity_permission_checks_both(monkeypatch):
    monkeypatch.setattr(branch_permissions, "user_can_access_all_office_branches", lambda user=None: False)
    monkeypatch.setattr(branch_permissions, "user_can_access_all_sales_entities", lambda user=None: False)
    monkeypatch.setattr(branch_permissions, "has_office_branch_permission", lambda doc, fieldname="office_branch", user=None: True)
    monkeypatch.setattr(branch_permissions, "get_allowed_sales_entity_names", lambda user=None: {"ENT-1"})

    doc = SimpleNamespace(office_branch="IST", sales_entity="ENT-1")

    assert branch_permissions.has_branch_and_sales_entity_permission(doc, user="manager@example.com") is True


def test_has_branch_and_sales_entity_permission_denies_when_entity_out_of_scope(monkeypatch):
    monkeypatch.setattr(branch_permissions, "user_can_access_all_office_branches", lambda user=None: False)
    monkeypatch.setattr(branch_permissions, "user_can_access_all_sales_entities", lambda user=None: False)
    monkeypatch.setattr(branch_permissions, "has_office_branch_permission", lambda doc, fieldname="office_branch", user=None: True)
    monkeypatch.setattr(branch_permissions, "get_allowed_sales_entity_names", lambda user=None: {"ENT-1"})

    doc = SimpleNamespace(office_branch="IST", sales_entity="ENT-2")

    assert branch_permissions.has_branch_and_sales_entity_permission(doc, user="manager@example.com") is False


def test_customer_has_permission_requires_matching_branch_for_agent(monkeypatch):
    monkeypatch.setattr(at_customer, "_can_access_all_customers", lambda user: False)
    monkeypatch.setattr(at_customer.frappe, "get_roles", lambda user: ["Agent"])
    monkeypatch.setattr(at_customer, "has_office_branch_permission", lambda doc, user=None: False)

    doc = SimpleNamespace(assigned_agent="agent@example.com", owner="owner@example.com", office_branch="IST")

    assert at_customer.has_permission(doc, user="agent@example.com") is False


def test_reconciliation_item_permission_query_uses_accounting_entry_branch_scope(monkeypatch):
    monkeypatch.setattr(branch_permissions, "user_can_access_all_office_branches", lambda user=None: False)
    monkeypatch.setattr(branch_permissions, "get_allowed_office_branch_names", lambda user=None: {"ANK"})

    condition = branch_permissions.get_reconciliation_item_permission_query_conditions("agent@example.com")

    assert "`tabAT Reconciliation Item`.`accounting_entry` in (" in condition
    assert "`tabAT Accounting Entry`" in condition


def test_notification_draft_permission_query_uses_office_branch_scope(monkeypatch):
    monkeypatch.setattr(branch_permissions, "user_can_access_all_office_branches", lambda user=None: False)
    monkeypatch.setattr(branch_permissions, "get_allowed_office_branch_names", lambda user=None: {"IST"})

    condition = branch_permissions.get_notification_draft_permission_query_conditions("manager@example.com")

    assert "`tabAT Notification Draft`.`office_branch` in (" in condition


def test_notification_outbox_permission_query_uses_office_branch_scope(monkeypatch):
    monkeypatch.setattr(branch_permissions, "user_can_access_all_office_branches", lambda user=None: False)
    monkeypatch.setattr(branch_permissions, "get_allowed_office_branch_names", lambda user=None: {"IST"})

    condition = branch_permissions.get_notification_outbox_permission_query_conditions("manager@example.com")

    assert "`tabAT Notification Outbox`.`office_branch` in (" in condition


def test_activity_task_reminder_and_ownership_queries_use_branch_scope(monkeypatch):
    monkeypatch.setattr(branch_permissions, "user_can_access_all_office_branches", lambda user=None: False)
    monkeypatch.setattr(branch_permissions, "get_allowed_office_branch_names", lambda user=None: {"IST"})

    activity_q = branch_permissions.get_activity_permission_query_conditions("manager@example.com")
    task_q = branch_permissions.get_task_permission_query_conditions("manager@example.com")
    reminder_q = branch_permissions.get_reminder_permission_query_conditions("manager@example.com")
    ownership_q = branch_permissions.get_ownership_assignment_permission_query_conditions("manager@example.com")

    assert "`tabAT Activity`.`office_branch` in (" in activity_q
    assert "`tabAT Task`.`office_branch` in (" in task_q
    assert "`tabAT Reminder`.`office_branch` in (" in reminder_q
    assert "`tabAT Ownership Assignment`.`office_branch` in (" in ownership_q


def test_policy_endorsement_permission_query_inherits_policy_scope(monkeypatch):
    monkeypatch.setattr(
        branch_permissions,
        "get_policy_permission_query_conditions",
        lambda user=None: "`tabAT Policy`.`office_branch` in ('IST')",
    )

    condition = branch_permissions.get_policy_endorsement_permission_query_conditions("manager@example.com")

    assert "`tabAT Policy Endorsement`.`policy` in (" in condition
    assert "`tabAT Policy`" in condition


def test_policy_endorsement_has_permission_resolves_policy_scope(monkeypatch):
    monkeypatch.setattr(branch_permissions, "user_can_access_all_office_branches", lambda user=None: False)
    monkeypatch.setattr(
        branch_permissions.frappe,
        "db",
        SimpleNamespace(get_value=lambda *args, **kwargs: {"office_branch": "IST", "sales_entity": "ENT-1"}),
    )
    monkeypatch.setattr(
        branch_permissions,
        "has_policy_permission",
        lambda doc, user=None, permission_type="read": doc.get("office_branch") == "IST",
    )

    doc = SimpleNamespace(policy="POL-001")

    assert branch_permissions.has_policy_endorsement_permission(doc, user="manager@example.com") is True

