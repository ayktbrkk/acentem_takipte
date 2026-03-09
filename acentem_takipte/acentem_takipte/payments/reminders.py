from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PaymentReminderStage:
    code: str
    day_offset: int
    template_key: str


PAYMENT_REMINDER_STAGES: tuple[PaymentReminderStage, ...] = (
    PaymentReminderStage(code="D7", day_offset=7, template_key="payment_due_7"),
    PaymentReminderStage(code="D1", day_offset=1, template_key="payment_due_1"),
    PaymentReminderStage(code="D0", day_offset=0, template_key="payment_due_today"),
    PaymentReminderStage(code="OVERDUE", day_offset=-1, template_key="payment_due_overdue"),
)


def resolve_payment_stage(days_until_due: int) -> PaymentReminderStage | None:
    target = int(days_until_due)
    if target < 0:
        return next(stage for stage in PAYMENT_REMINDER_STAGES if stage.code == "OVERDUE")
    for stage in PAYMENT_REMINDER_STAGES:
        if stage.day_offset == target:
            return stage
    return None


def build_payment_dedupe_key(payment_name: str, stage_code: str, business_date: str) -> str:
    return f"{payment_name}:{stage_code}:{business_date}"
