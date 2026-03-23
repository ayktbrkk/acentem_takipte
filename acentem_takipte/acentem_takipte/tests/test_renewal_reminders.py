from __future__ import annotations

from datetime import date

from acentem_takipte.acentem_takipte.renewal.reminders import (
    build_dedupe_key,
    build_template_keys,
    get_reminder_stages,
    resolve_due_stages,
    resolve_stage_for_days,
)


def test_get_reminder_stages_returns_all_expected_windows():
    stages = get_reminder_stages()

    assert [stage.days_before_expiry for stage in stages] == [90, 60, 30, 15, 7, 1]


def test_resolve_stage_for_days_returns_matching_stage():
    stage = resolve_stage_for_days(30)

    assert stage is not None
    assert stage.code == "D30"
    assert stage.template_key == "renewal_reminder_30"


def test_resolve_due_stages_returns_empty_for_unknown_window():
    assert resolve_due_stages(45) == []


def test_build_dedupe_key_includes_policy_stage_and_business_date():
    dedupe_key = build_dedupe_key(
        policy="POL-0001",
        customer="CUS-0001",
        stage_code="D15",
        business_date=date(2026, 3, 6),
    )

    assert dedupe_key == "POL-0001:CUS-0001:D15:2026-03-06"


def test_build_template_keys_maps_stage_sequence():
    stages = [resolve_stage_for_days(15), resolve_stage_for_days(7)]

    assert build_template_keys(stage for stage in stages if stage is not None) == [
        "renewal_reminder_15",
        "renewal_reminder_7",
    ]

