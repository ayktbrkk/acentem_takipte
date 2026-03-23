from types import SimpleNamespace

from acentem_takipte.doctype.at_offer import at_offer as offer_module


def test_resolve_offer_office_branch_prefers_explicit_value(monkeypatch):
    monkeypatch.setattr(offer_module, "get_default_office_branch", lambda: "DEFAULT")

    customer = SimpleNamespace(office_branch="CUSTOMER-BRANCH")

    assert (
        offer_module._resolve_offer_office_branch("EXPLICIT-BRANCH", customer)
        == "EXPLICIT-BRANCH"
    )


def test_resolve_offer_office_branch_uses_customer_branch(monkeypatch):
    monkeypatch.setattr(offer_module, "get_default_office_branch", lambda: "DEFAULT")

    customer = SimpleNamespace(office_branch="CUSTOMER-BRANCH")

    assert (
        offer_module._resolve_offer_office_branch(None, customer)
        == "CUSTOMER-BRANCH"
    )


def test_resolve_offer_office_branch_falls_back_to_default(monkeypatch):
    monkeypatch.setattr(offer_module, "get_default_office_branch", lambda: "DEFAULT")

    customer = SimpleNamespace(office_branch=None)

    assert offer_module._resolve_offer_office_branch(None, customer) == "DEFAULT"
