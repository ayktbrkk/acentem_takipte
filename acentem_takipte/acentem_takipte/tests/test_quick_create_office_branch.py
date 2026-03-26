from __future__ import annotations

from acentem_takipte.acentem_takipte.api import quick_create


def test_resolve_office_branch_prefers_explicit(monkeypatch):
    monkeypatch.setattr(quick_create, "_normalize_link", lambda doctype, value, required=False: value)

    resolved = quick_create._resolve_office_branch("BR-EXPLICIT")

    assert resolved == "BR-EXPLICIT"


def test_resolve_office_branch_falls_back_to_policy(monkeypatch):
    monkeypatch.setattr(quick_create, "_normalize_link", lambda doctype, value, required=False: value)
    monkeypatch.setattr(quick_create, "assert_office_branch_access", lambda office_branch=None, user=None: office_branch)
    monkeypatch.setattr(
        quick_create.frappe.db,
        "exists",
        lambda doctype, name: doctype == "AT Policy" and name == "POL-1",
    )
    monkeypatch.setattr(
        quick_create.frappe.db,
        "get_value",
        lambda doctype, name, fieldname: "BR-POLICY" if (doctype, name, fieldname) == ("AT Policy", "POL-1", "office_branch") else None,
    )

    resolved = quick_create._resolve_office_branch(policy="POL-1")

    assert resolved == "BR-POLICY"


def test_resolve_office_branch_validates_derived_policy_branch_access(monkeypatch):
    monkeypatch.setattr(quick_create, "_normalize_link", lambda doctype, value, required=False: value)

    def _deny(*args, **kwargs):
        raise Exception("denied")

    monkeypatch.setattr(quick_create, "assert_office_branch_access", _deny)
    monkeypatch.setattr(
        quick_create.frappe.db,
        "exists",
        lambda doctype, name: doctype == "AT Policy" and name == "POL-1",
    )
    monkeypatch.setattr(
        quick_create.frappe.db,
        "get_value",
        lambda doctype, name, fieldname: "BR-POLICY" if (doctype, name, fieldname) == ("AT Policy", "POL-1", "office_branch") else None,
    )

    import pytest

    with pytest.raises(Exception):
        quick_create._resolve_office_branch(policy="POL-1")


def test_resolve_office_branch_falls_back_to_customer_then_default(monkeypatch):
    monkeypatch.setattr(quick_create, "_normalize_link", lambda doctype, value, required=False: value)
    monkeypatch.setattr(quick_create, "assert_office_branch_access", lambda office_branch=None, user=None: office_branch)

    def fake_exists(doctype, name):
        return doctype == "AT Customer" and name == "CUST-1"

    def fake_get_value(doctype, name, fieldname):
        if (doctype, name, fieldname) == ("AT Customer", "CUST-1", "office_branch"):
            return "BR-CUSTOMER"
        return None

    monkeypatch.setattr(quick_create.frappe.db, "exists", fake_exists)
    monkeypatch.setattr(quick_create.frappe.db, "get_value", fake_get_value)
    monkeypatch.setattr(quick_create, "get_default_office_branch", lambda: "BR-DEFAULT")

    resolved = quick_create._resolve_office_branch(customer="CUST-1")

    assert resolved == "BR-CUSTOMER"


def test_resolve_office_branch_validates_derived_customer_branch_access(monkeypatch):
    monkeypatch.setattr(quick_create, "_normalize_link", lambda doctype, value, required=False: value)

    def _deny(*args, **kwargs):
        raise Exception("denied")

    monkeypatch.setattr(quick_create, "assert_office_branch_access", _deny)
    monkeypatch.setattr(
        quick_create.frappe.db,
        "exists",
        lambda doctype, name: doctype == "AT Customer" and name == "CUST-1",
    )
    monkeypatch.setattr(
        quick_create.frappe.db,
        "get_value",
        lambda doctype, name, fieldname: "BR-CUSTOMER"
        if (doctype, name, fieldname) == ("AT Customer", "CUST-1", "office_branch")
        else None,
    )

    import pytest

    with pytest.raises(Exception):
        quick_create._resolve_office_branch(customer="CUST-1")


def test_resolve_office_branch_uses_default_when_links_do_not_resolve(monkeypatch):
    monkeypatch.setattr(quick_create, "_normalize_link", lambda doctype, value, required=False: value)
    monkeypatch.setattr(quick_create.frappe.db, "exists", lambda doctype, name: False)
    monkeypatch.setattr(quick_create, "get_default_office_branch", lambda: "BR-DEFAULT")

    resolved = quick_create._resolve_office_branch()

    assert resolved == "BR-DEFAULT"

