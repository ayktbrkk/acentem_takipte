from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from acentem_takipte.acentem_takipte.payments.reminders import build_payment_dedupe_key, resolve_payment_stage


@dataclass(frozen=True)
class PaymentReminderPayload:
    payment: str
    customer: str
    policy: str | None
    due_date: str
    stage_code: str
    template_key: str
    dedupe_key: str


def build_payment_reminder_payload(*, payment_name: str, customer: str, policy: str | None, due_date: date, business_date: date) -> PaymentReminderPayload | None:
    if not payment_name or not customer or not due_date or not business_date:
        return None

    stage = resolve_payment_stage((due_date - business_date).days)
    if not stage:
        return None

    return PaymentReminderPayload(
        payment=payment_name,
        customer=customer,
        policy=policy,
        due_date=str(due_date),
        stage_code=stage.code,
        template_key=stage.template_key,
        dedupe_key=build_payment_dedupe_key(payment_name, stage.code, str(business_date)),
    )
