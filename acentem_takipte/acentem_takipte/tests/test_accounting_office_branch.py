from acentem_takipte.acentem_takipte import accounting as accounting_module


class _DocStub:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

    def __getattr__(self, name):
        return None

    def get(self, key, default=None):
        return getattr(self, key, default)


def test_build_policy_payload_includes_policy_office_branch():
    policy = _DocStub(name="POL-0001", office_branch="IST-HQ")

    payload = accounting_module._build_policy_payload(policy)

    assert payload["office_branch"] == "IST-HQ"


def test_build_payment_payload_falls_back_to_policy_office_branch(monkeypatch):
    monkeypatch.setattr(
        accounting_module.frappe.db,
        "get_value",
        lambda doctype, name, fieldname: "IST-HQ"
        if doctype == "AT Policy" and name == "POL-0001" and fieldname == "office_branch"
        else None,
    )

    payment = _DocStub(name="PAY-0001", policy="POL-0001", office_branch=None)

    payload = accounting_module._build_payment_payload(payment)

    assert payload["office_branch"] == "IST-HQ"


def test_build_claim_payload_falls_back_to_policy_office_branch(monkeypatch):
    monkeypatch.setattr(
        accounting_module.frappe.db,
        "get_value",
        lambda doctype, name, fieldname: "IST-HQ"
        if doctype == "AT Policy" and name == "POL-0001" and fieldname == "office_branch"
        else None,
    )

    claim = _DocStub(name="CLM-0001", policy="POL-0001", office_branch=None)

    payload = accounting_module._build_claim_payload(claim)

    assert payload["office_branch"] == "IST-HQ"
