from __future__ import annotations

from acentem_takipte.acentem_takipte.claims.notifications import resolve_claim_status_template_key


def test_resolve_claim_status_template_key_maps_known_statuses():
    assert resolve_claim_status_template_key("Approved") == "claim_status_approved"
    assert resolve_claim_status_template_key("Paid") == "claim_status_paid"


def test_resolve_claim_status_template_key_returns_none_for_unknown_status():
    assert resolve_claim_status_template_key("Draft") is None

