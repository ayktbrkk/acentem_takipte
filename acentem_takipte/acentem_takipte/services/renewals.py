from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from acentem_takipte.acentem_takipte.renewal.reminders import build_dedupe_key, resolve_stage_for_days


@dataclass(frozen=True)
class RenewalTaskPayload:
    policy: str
    customer: str
    office_branch: str | None
    policy_end_date: str
    renewal_date: date
    due_date: date
    status: str
    description: str
    auto_created: int
    unique_key: str
    stage_code: str


def build_renewal_stage_key(policy_name: str, customer: str | None, stage_code: str, business_date) -> str:
    return build_dedupe_key(
        policy=policy_name,
        customer=customer,
        stage_code=stage_code,
        business_date=str(business_date),
    )


def build_renewal_task_payload(
    *,
    policy_name: str,
    customer: str,
    office_branch: str | None = None,
    policy_end_date,
    business_date: date,
) -> RenewalTaskPayload | None:
    if not policy_name or not customer or not policy_end_date or not business_date:
        return None

    stage = resolve_stage_for_days((policy_end_date - business_date).days)
    if not stage:
        return None

    return RenewalTaskPayload(
        policy=policy_name,
        customer=customer,
        office_branch=(office_branch or "").strip() or None,
        policy_end_date=str(policy_end_date),
        renewal_date=policy_end_date,
        due_date=business_date,
        status="Open",
        description=f"[{stage.code}] Auto renewal reminder for policy {policy_name}",
        auto_created=1,
        unique_key=build_renewal_stage_key(policy_name, customer, stage.code, business_date),
        stage_code=stage.code,
    )
