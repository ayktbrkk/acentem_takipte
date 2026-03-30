from types import SimpleNamespace

from acentem_takipte.acentem_takipte.doctype.at_offer import at_offer as offer_module


def test_resolve_offer_office_branch_prefers_explicit_value(monkeypatch):
    monkeypatch.setattr(offer_module, "get_default_office_branch", lambda: "DEFAULT")
    monkeypatch.setattr(offer_module, "assert_office_branch_access", lambda requested_office_branch=None, user=None: requested_office_branch)

    customer = SimpleNamespace(office_branch="CUSTOMER-BRANCH")

    assert (
        offer_module._resolve_offer_office_branch("EXPLICIT-BRANCH", customer)
        == "EXPLICIT-BRANCH"
    )


def test_resolve_offer_office_branch_uses_customer_branch(monkeypatch):
    monkeypatch.setattr(offer_module, "get_default_office_branch", lambda: "DEFAULT")
    monkeypatch.setattr(offer_module, "assert_office_branch_access", lambda requested_office_branch=None, user=None: requested_office_branch)
    monkeypatch.setattr(
        offer_module.frappe,
        "db",
        SimpleNamespace(
            exists=lambda doctype, name: doctype == "AT Customer" and name == "CUST-001",
            get_value=lambda *_args, **_kwargs: "CUSTOMER-BRANCH",
        ),
        raising=False,
    )

    assert (
        offer_module._resolve_offer_office_branch(None, "CUST-001")
        == "CUSTOMER-BRANCH"
    )


def test_resolve_offer_office_branch_falls_back_to_default(monkeypatch):
    monkeypatch.setattr(offer_module, "get_default_office_branch", lambda: "DEFAULT")
    monkeypatch.setattr(offer_module, "assert_office_branch_access", lambda requested_office_branch=None, user=None: requested_office_branch)
    monkeypatch.setattr(
        offer_module.frappe,
        "db",
        SimpleNamespace(
            exists=lambda *_args, **_kwargs: False,
            get_value=lambda *_args, **_kwargs: None,
        ),
        raising=False,
    )

    assert offer_module._resolve_offer_office_branch(None, None) == "DEFAULT"


def test_create_quick_offer_validates_derived_office_branch_access_before_insert(monkeypatch):
    """
    To reduce ignore_permissions bypass risk:
    the office_branch derived from the customer must still be validated inside create_quick_offer.
    """
    import pytest

    called = {"get_doc": False}

    monkeypatch.setattr(offer_module, "assert_authenticated", lambda: None)
    monkeypatch.setattr(offer_module, "assert_post_request", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(offer_module.frappe, "has_permission", lambda *_args, **_kwargs: True)
    monkeypatch.setattr(offer_module, "_resolve_or_create_quick_customer", lambda **_kwargs: ("CUST-1", False))
    monkeypatch.setattr(
        offer_module.frappe,
        "db",
        SimpleNamespace(
            exists=lambda doctype, name: doctype == "AT Customer" and name == "CUST-1",
            get_value=lambda doctype, name, fieldname: "BR-DERIVED"
            if (doctype, name, fieldname) == ("AT Customer", "CUST-1", "office_branch")
            else None,
        ),
        raising=False,
    )

    # Derived office_branch => "BR-DERIVED"
    # Scope must be denied before insert() is attempted.
    def _deny(*_args, **_kwargs):
        raise Exception("denied")

    monkeypatch.setattr(offer_module, "assert_office_branch_access", _deny)

    def _fake_get_doc(_payload):
        called["get_doc"] = True
        return SimpleNamespace(flags=SimpleNamespace(ignore_mandatory=False), insert=lambda: None)

    monkeypatch.setattr(offer_module.frappe, "get_doc", _fake_get_doc)

    with pytest.raises(Exception):
        offer_module.create_quick_offer(customer="CUST-1")

    assert called["get_doc"] is False

