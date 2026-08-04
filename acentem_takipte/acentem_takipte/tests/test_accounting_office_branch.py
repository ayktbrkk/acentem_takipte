from __future__ import annotations

import acentem_takipte.acentem_takipte.accounting as accounting_module


class _DocStub:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

    def __getattr__(self, name):
        return None

    def get(self, key, default=None):
        return getattr(self, key, default)


def test_build_policy_payload_includes_policy_office_branch(monkeypatch):
    policy = _DocStub(
        name="POL-0001",
        office_branch="IST-HQ",
        customer="CUST-001",
        sales_entity="SE-001",
        insurance_company="IC-001",
        currency="TRY",
        fx_rate=1,
        gross_premium=1000,
        gwp_try=1000,
        commission_amount=100,
        commission=100,
        status="Active",
        commission_distribution="[]",
    )

    monkeypatch.setattr(accounting_module.frappe, "get_doc", lambda doctype, name: policy)

    payload = accounting_module._build_policy_payload("POL-0001")

    assert payload["office_branch"] == "IST-HQ"
    assert payload["policy"] == "POL-0001"


def test_build_payment_payload_falls_back_to_policy_office_branch(monkeypatch):
    payment = _DocStub(
        name="PAY-0001",
        policy="POL-0001",
        office_branch=None,
        sales_entity=None,
        payment_direction="Inbound",
        amount=100,
        amount_try=100,
        fx_rate=1,
        customer="CUST-001",
        currency="TRY",
        payment_purpose="Premium",
        status="Draft",
    )

    def _fake_get_value(doctype, name, fieldname):
        if doctype == "AT Policy" and name == "POL-0001":
            return {
                "office_branch": "IST-HQ",
                "sales_entity": "SE-001",
                "insurance_company": "IC-001",
            }.get(fieldname)
        return None

    monkeypatch.setattr(accounting_module.frappe, "get_doc", lambda doctype, name: payment)
    monkeypatch.setattr(accounting_module.frappe.db, "get_value", _fake_get_value)

    payload = accounting_module._build_payment_payload("PAY-0001")

    assert payload["office_branch"] == "IST-HQ"


def test_build_claim_payload_falls_back_to_policy_office_branch(monkeypatch):
    claim = _DocStub(
        name="CLM-0001",
        policy="POL-0001",
        office_branch=None,
        approved_amount=500,
        estimated_amount=500,
        currency="TRY",
        customer="CUST-001",
        claim_status="Open",
    )

    def _fake_get_value(doctype, name, fieldname):
        if doctype == "AT Policy" and name == "POL-0001":
            return {
                "office_branch": "IST-HQ",
                "sales_entity": "SE-001",
                "insurance_company": "IC-001",
            }.get(fieldname)
        return None

    monkeypatch.setattr(accounting_module.frappe, "get_doc", lambda doctype, name: claim)
    monkeypatch.setattr(accounting_module.frappe.db, "get_value", _fake_get_value)

    payload = accounting_module._build_claim_payload("CLM-0001")

    assert payload["office_branch"] == "IST-HQ"
