from __future__ import annotations

from acentem_takipte.acentem_takipte.notifications_catalog import get_template_keys_for_event, is_valid_template_key


def test_get_template_keys_for_event_returns_expected_payment_templates():
    assert get_template_keys_for_event("payment_due") == [
        "payment_due_7",
        "payment_due_1",
        "payment_due_today",
        "payment_due_overdue",
    ]


def test_is_valid_template_key_recognizes_claim_status_templates():
    assert is_valid_template_key("claim_status_update", "claim_status_paid") is True
    assert is_valid_template_key("claim_status_update", "policy_delivery") is False

