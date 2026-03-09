from __future__ import annotations

from datetime import date

from acentem_takipte.acentem_takipte.services.payments import build_payment_reminder_payload


def test_build_payment_reminder_payload_returns_due_stage_payload():
    payload = build_payment_reminder_payload(
        payment_name="PAY-0001",
        customer="CUS-0001",
        policy="POL-0001",
        due_date=date(2026, 3, 13),
        business_date=date(2026, 3, 6),
    )

    assert payload is not None
    assert payload.stage_code == "D7"
    assert payload.template_key == "payment_due_7"
    assert payload.dedupe_key == "PAY-0001:D7:2026-03-06"


def test_build_payment_reminder_payload_returns_overdue_stage_payload():
    payload = build_payment_reminder_payload(
        payment_name="PAY-0002",
        customer="CUS-0002",
        policy=None,
        due_date=date(2026, 3, 4),
        business_date=date(2026, 3, 6),
    )

    assert payload is not None
    assert payload.stage_code == "OVERDUE"
    assert payload.template_key == "payment_due_overdue"
