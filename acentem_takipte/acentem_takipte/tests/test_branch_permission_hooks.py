from __future__ import annotations

from types import SimpleNamespace

from acentem_takipte.doctype import branch_permissions
from acentem_takipte.doctype.at_customer import at_customer


def test_build_office_branch_permission_query_returns_empty_for_all_access_user(monkeypatch):
    monkeypatch.setattr(branch_permissions, "user_can_access_all_office_branches", lambda user=None: True)

    assert branch_permissions.build_office_branch_permission_query("AT Policy", user="admin@example.com") == ""


def test_build_office_branch_permission_query_returns_in_clause(monkeypatch):
    monkeypatch.setattr(branch_permissions, "user_can_access_all_office_branches", lambda user=None: False)
    monkeypatch.setattr(branch_permissions, "get_allowed_office_branch_names", lambda user=None: {"IST", "ANK"})

    condition = branch_permissions.build_office_branch_permission_query("AT Policy", user="manager@example.com")

    assert "`tabAT Policy`.`office_branch` in (" in condition


def test_customer_permission_query_conditions_combine_agent_and_branch_scope(monkeypatch):
    monkeypatch.setattr(at_customer, "_can_access_all_customers", lambda user: False)
    monkeypatch.setattr(at_customer.frappe, "get_roles", lambda user: ["Agent"])
    monkeypatch.setattr(at_customer.frappe.db, "escape", lambda value: f"'{value}'")
    monkeypatch.setattr(
        at_customer,
        "build_office_branch_permission_query",
        lambda doctype, user=None: "`tabAT Customer`.`office_branch` in ('ANK')",
    )

    condition = at_customer.get_permission_query_conditions("agent@example.com")

    assert "assigned_agent" in condition
    assert "office_branch" in condition


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
