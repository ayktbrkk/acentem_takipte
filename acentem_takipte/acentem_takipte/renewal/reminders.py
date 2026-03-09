from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Iterable, List


@dataclass(frozen=True)
class RenewalReminderStage:
    code: str
    days_before_expiry: int
    template_key: str
    priority: int


REMINDER_STAGES: tuple[RenewalReminderStage, ...] = (
    RenewalReminderStage(code="D90", days_before_expiry=90, template_key="renewal_reminder_90", priority=10),
    RenewalReminderStage(code="D60", days_before_expiry=60, template_key="renewal_reminder_60", priority=20),
    RenewalReminderStage(code="D30", days_before_expiry=30, template_key="renewal_reminder_30", priority=30),
    RenewalReminderStage(code="D15", days_before_expiry=15, template_key="renewal_reminder_15", priority=40),
    RenewalReminderStage(code="D7", days_before_expiry=7, template_key="renewal_reminder_7", priority=50),
    RenewalReminderStage(code="D1", days_before_expiry=1, template_key="renewal_reminder_1", priority=60),
)


def get_reminder_stages() -> tuple[RenewalReminderStage, ...]:
    return REMINDER_STAGES


def resolve_stage_for_days(days_before_expiry: int) -> RenewalReminderStage | None:
    for stage in REMINDER_STAGES:
        if stage.days_before_expiry == int(days_before_expiry):
            return stage
    return None


def resolve_due_stages(days_before_expiry: int) -> List[RenewalReminderStage]:
    target = int(days_before_expiry)
    return [stage for stage in REMINDER_STAGES if stage.days_before_expiry == target]


def build_dedupe_key(*, policy: str, customer: str | None, stage_code: str, business_date: date | str) -> str:
    customer_value = customer or "-"
    return f"{policy}:{customer_value}:{stage_code}:{business_date}"


def build_template_keys(stages: Iterable[RenewalReminderStage]) -> list[str]:
    return [stage.template_key for stage in stages]
