from __future__ import annotations

from datetime import date

from acentem_takipte.services.renewals import build_renewal_task_payload


def test_build_renewal_task_payload_returns_stage_aware_payload():
    payload = build_renewal_task_payload(
        policy_name="POL-0001",
        customer="CUS-0001",
        office_branch="BR-IST",
        policy_end_date=date(2026, 4, 5),
        business_date=date(2026, 3, 6),
    )

    assert payload is not None
    assert payload.office_branch == "BR-IST"
    assert payload.stage_code == "D30"
    assert payload.description == "[D30] Auto renewal reminder for policy POL-0001"
    assert payload.unique_key == "POL-0001:CUS-0001:D30:2026-03-06"


def test_build_renewal_task_payload_returns_none_outside_supported_windows():
    payload = build_renewal_task_payload(
        policy_name="POL-0002",
        customer="CUS-0002",
        office_branch="BR-ANK",
        policy_end_date=date(2026, 4, 20),
        business_date=date(2026, 3, 6),
    )

    assert payload is None
