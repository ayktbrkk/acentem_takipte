from acentem_takipte.acentem_takipte.services import follow_up_sla


def test_build_follow_up_sla_payload_uses_admin_defaults(monkeypatch):
    monkeypatch.setattr(follow_up_sla, "nowdate", lambda: "2026-05-04")
    monkeypatch.setattr(
        follow_up_sla,
        "get_follow_up_defaults",
        lambda: {"follow_up_due_soon_days": 3, "follow_up_preview_limit": 2},
    )
    monkeypatch.setattr(
        follow_up_sla,
        "_get_claim_follow_ups",
        lambda **kwargs: [
            {"name": "CLM-1", "next_follow_up_on": "2026-05-06", "customer": "CUST-1", "claim_status": "Open", "customer_full_name": "Ada"},
            {"name": "CLM-2", "next_follow_up_on": "2026-05-09", "customer": "CUST-2", "claim_status": "Open", "customer_full_name": "Bora"},
        ],
    )
    monkeypatch.setattr(follow_up_sla, "_get_renewal_follow_ups", lambda **kwargs: [])
    monkeypatch.setattr(follow_up_sla, "_get_assignment_follow_ups", lambda **kwargs: [])
    monkeypatch.setattr(follow_up_sla, "_get_call_note_follow_ups", lambda **kwargs: [])

    payload = follow_up_sla.build_follow_up_sla_payload()

    assert payload["summary"] == {"total": 2, "overdue": 0, "due_today": 0, "due_soon": 1}
    assert payload["meta"]["settings"] == {"follow_up_due_soon_days": 3, "follow_up_preview_limit": 2}
    assert len(payload["items"]) == 2
    assert payload["items"][0]["source_name"] == "CLM-1"