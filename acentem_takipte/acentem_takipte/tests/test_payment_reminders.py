from __future__ import annotations

from acentem_takipte.acentem_takipte.payments.reminders import build_payment_dedupe_key, resolve_payment_stage


def test_resolve_payment_stage_returns_matching_due_windows():
    assert resolve_payment_stage(7).code == "D7"
    assert resolve_payment_stage(1).code == "D1"
    assert resolve_payment_stage(0).code == "D0"


def test_resolve_payment_stage_maps_negative_days_to_overdue():
    assert resolve_payment_stage(-3).code == "OVERDUE"


def test_build_payment_dedupe_key_is_stable():
    assert build_payment_dedupe_key("PAY-0001", "D1", "2026-03-06") == "PAY-0001:D1:2026-03-06"
