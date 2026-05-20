from __future__ import annotations

from types import SimpleNamespace

from acentem_takipte.acentem_takipte.doctype.at_document import at_document


def test_at_document_query_reuses_linked_record_scope(monkeypatch):
    monkeypatch.setattr(at_document, "_has_system_document_access", lambda user=None: False)
    monkeypatch.setattr(
        at_document.branch_permissions,
        "get_policy_permission_query_conditions",
        lambda user=None: "`tabAT Policy`.`origin_office_branch` in ('IST')",
    )
    monkeypatch.setattr(
        at_document.branch_permissions,
        "get_claim_permission_query_conditions",
        lambda user=None: "`tabAT Claim`.`origin_office_branch` in ('IST')",
    )
    monkeypatch.setattr(
        at_document.at_customer_permissions,
        "get_permission_query_conditions",
        lambda user=None: "`tabAT Customer`.`origin_office_branch` in ('IST')",
    )
    monkeypatch.setattr(at_document.frappe, "db", SimpleNamespace(escape=lambda value: f"'{value}'"))

    condition = at_document.get_permission_query_conditions("agent@example.com")

    assert "`tabAT Document`.`policy` in (select name from `tabAT Policy`" in condition
    assert "`tabAT Document`.`customer` in (select name from `tabAT Customer`" in condition
    assert "`tabAT Document`.`claim` in (select name from `tabAT Claim`" in condition
    assert "`tabAT Document`.`owner` = 'agent@example.com'" in condition


def test_at_document_has_permission_accepts_linked_record_access(monkeypatch):
    monkeypatch.setattr(at_document, "_has_system_document_access", lambda user=None: False)
    monkeypatch.setattr(
        at_document,
        "_linked_record_has_permission",
        lambda doctype, docname, user, permission_type: doctype == "AT Policy" and docname == "AT-POL-001",
    )

    doc = SimpleNamespace(policy="AT-POL-001", customer="", claim="", reference_doctype="", reference_name="", owner="owner@example.com")

    assert at_document.has_permission(doc, user="agent@example.com") is True


def test_at_document_has_permission_allows_unlinked_owner(monkeypatch):
    monkeypatch.setattr(at_document, "_has_system_document_access", lambda user=None: False)
    monkeypatch.setattr(at_document, "_linked_record_has_permission", lambda *args, **kwargs: False)

    doc = SimpleNamespace(policy="", customer="", claim="", reference_doctype="", reference_name="", owner="agent@example.com")

    assert at_document.has_permission(doc, user="agent@example.com") is True