from __future__ import annotations

from types import SimpleNamespace

from acentem_takipte.acentem_takipte.doctype.at_payment.at_payment import ATPayment
from acentem_takipte.acentem_takipte.services import accounting_runtime


def test_sync_installment_schedule_creates_equal_installments(monkeypatch):
    deleted = []
    inserted = []

    class FakeInstallmentDoc:
        def __init__(self, payload):
            self.payload = payload

        def insert(self, ignore_permissions=False):
            inserted.append((self.payload, ignore_permissions))
            return self

    payment = SimpleNamespace(
        name="PAY-0001",
        customer="CUST-001",
        policy="POL-001",
        office_branch="IST",
        installment_count=3,
        installment_interval_days=30,
        due_date="2026-03-20",
        payment_date="2026-03-20",
        amount=300,
        fx_rate=1,
        status="Draft",
        currency="TRY",
        notes="Taksitli tahsilat",
    )

    monkeypatch.setattr("acentem_takipte.doctype.at_payment.at_payment.nowdate", lambda: "2026-03-09")
    monkeypatch.setattr(
        "acentem_takipte.doctype.at_payment.at_payment.frappe.db.delete",
        lambda doctype, filters=None: deleted.append((doctype, filters)),
    )
    monkeypatch.setattr(
        "acentem_takipte.doctype.at_payment.at_payment.frappe.get_doc",
        lambda payload: FakeInstallmentDoc(payload),
    )

    ATPayment._sync_installment_schedule(payment)

    assert deleted == [("AT Payment Installment", {"payment": "PAY-0001"})]
    assert len(inserted) == 3
    first_payload, first_ignore_permissions = inserted[0]
    assert first_ignore_permissions is True
    assert first_payload["installment_no"] == 1
    assert first_payload["installment_count"] == 3
    assert first_payload["status"] == "Scheduled"
    assert first_payload["amount"] == 100
    assert first_payload["amount_try"] == 100


def test_get_overdue_collection_rows_prefers_installment_model(monkeypatch):
    calls = []

    def fake_get_all(doctype, **kwargs):
        calls.append(doctype)
        if doctype == "AT Payment Installment":
            return [
                {
                    "name": "PINS-001",
                    "payment": "PAY-0001",
                    "customer": "CUST-001",
                    "policy": "POL-001",
                    "status": "Overdue",
                    "due_date": "2026-03-01",
                    "amount": 400,
                    "amount_try": 400,
                    "installment_no": 1,
                    "installment_count": 3,
                }
            ]
        raise AssertionError("AT Payment fallback should not be queried when installments exist")

    monkeypatch.setattr(accounting_runtime.frappe, "get_all", fake_get_all)
    monkeypatch.setattr(accounting_runtime, "nowdate", lambda: "2026-03-09")

    rows = accounting_runtime._get_overdue_collection_rows("IST")

    assert calls == ["AT Payment Installment"]
    assert rows[0]["payment_no"] == "PAY-0001 / 1/3"


def test_get_overdue_collection_rows_falls_back_to_payment_model(monkeypatch):
    calls = []

    def fake_get_all(doctype, **kwargs):
        calls.append(doctype)
        if doctype == "AT Payment Installment":
            return []
        if doctype == "AT Payment":
            return [
                {
                    "name": "PAY-0009",
                    "payment_no": "PAY-0009",
                    "customer": "CUST-009",
                    "policy": "POL-009",
                    "status": "Draft",
                    "due_date": "2026-03-01",
                    "amount": 900,
                    "amount_try": 900,
                }
            ]
        return []

    monkeypatch.setattr(accounting_runtime.frappe, "get_all", fake_get_all)
    monkeypatch.setattr(accounting_runtime, "nowdate", lambda: "2026-03-09")

    rows = accounting_runtime._get_overdue_collection_rows(None)

    assert calls == ["AT Payment Installment", "AT Payment"]
    assert rows[0]["payment_no"] == "PAY-0009"

