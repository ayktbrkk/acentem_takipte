"""Dataclass payloads for quick_create API functions.

These payloads document the intended parameter shapes while keeping the
legacy kwargs-based API available for backward compatibility.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import asdict, dataclass, fields, is_dataclass
from typing import Any, ClassVar


def _payload_data(payload: object | None, kwargs: Mapping[str, Any]) -> dict[str, Any]:
    data: dict[str, Any] = {}
    if payload is None:
        pass
    elif isinstance(payload, Mapping):
        data.update(payload)
    elif is_dataclass(payload) and not isinstance(payload, type):
        data.update(asdict(payload))
    else:
        raise TypeError(f"Unsupported payload type: {type(payload)!r}")

    data.update(kwargs)
    return data


def _filtered_payload_kwargs(cls: type[Any], data: dict[str, Any]) -> dict[str, Any]:
    aliases = getattr(cls, "__field_aliases__", {})
    for alias, canonical in aliases.items():
        if canonical not in data or data[canonical] in {None, ""}:
            alias_value = data.get(alias)
            if alias_value not in {None, ""}:
                data[canonical] = alias_value

    allowed = {field.name for field in fields(cls)}
    return {key: value for key, value in data.items() if key in allowed}


class _QuickPayloadBase:
    __field_aliases__: ClassVar[dict[str, str]] = {}

    @classmethod
    def from_input(cls, payload: object | None = None, /, **kwargs: Any):
        data = _payload_data(payload, kwargs)
        return cls(**_filtered_payload_kwargs(cls, data))


@dataclass
class QuickPolicyPayload(_QuickPayloadBase):
    customer: str | None = None
    customer_full_name: str | None = None
    customer_type: str | None = None
    customer_tax_id: str | None = None
    customer_phone: str | None = None
    customer_email: str | None = None
    customer_birth_date: str | None = None
    sales_entity: str | None = None
    insurance_company: str | None = None
    branch: str | None = None
    office_branch: str | None = None
    policy_no: str | None = None
    status: str | None = None
    issue_date: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    currency: str | None = None
    net_premium: float | None = None
    tax_amount: float | None = None
    commission_amount: float | None = None
    gross_premium: float | None = None
    source_offer: str | None = None
    notes: str | None = None


@dataclass
class QuickPaymentPayload(_QuickPayloadBase):
    __field_aliases__: ClassVar[dict[str, str]] = {
        "paid_date": "payment_date",
        "amount_try": "amount",
        "external_ref": "reference_no",
    }

    customer: str | None = None
    policy: str | None = None
    claim: str | None = None
    sales_entity: str | None = None
    office_branch: str | None = None
    payment_direction: str | None = None
    payment_purpose: str | None = None
    status: str | None = None
    payment_date: str | None = None
    paid_date: str | None = None
    due_date: str | None = None
    installment_count: int | None = None
    installment_interval_days: int | None = None
    currency: str | None = None
    amount: float | None = None
    amount_try: float | None = None
    reference_no: str | None = None
    external_ref: str | None = None
    notes: str | None = None
    bank_account: str | None = None


@dataclass
class QuickNotificationTemplatePayload(_QuickPayloadBase):
    template_key: str | None = None
    event_key: str | None = None
    channel: str | None = None
    language: str | None = None
    subject: str | None = None
    body_template: str | None = None
    sms_body_template: str | None = None
    email_body_template: str | None = None
    whatsapp_body_template: str | None = None
    provider_template_name: str | None = None
    provider_template_category: str | None = None
    variables_schema_json: str | None = None
    content_mode: str | None = None
    is_active: Any = None
    office_branch: str | None = None
    notes: str | None = None


@dataclass
class QuickOwnershipAssignmentPayload(_QuickPayloadBase):
    customer: str | None = None
    policy: str | None = None
    assigned_to: str | None = None
    assignment_role: str | None = None
    source_doctype: str | None = None
    source_name: str | None = None
    office_branch: str | None = None
    status: str | None = None
    priority: str | None = None
    due_date: str | None = None
    notes: str | None = None
    is_active: Any = None
    reference_doctype: str | None = None
    reference_name: str | None = None
    share_level: str | None = None


@dataclass
class QuickTaskPayload(_QuickPayloadBase):
    task_title: str | None = None
    customer: str | None = None
    policy: str | None = None
    claim: str | None = None
    assigned_to: str | None = None
    task_type: str | None = None
    status: str | None = None
    priority: str | None = None
    due_date: str | None = None
    reminder_at: str | None = None
    source_doctype: str | None = None
    source_name: str | None = None
    office_branch: str | None = None
    notes: str | None = None
    completed_at: str | None = None
    completed_by: str | None = None


@dataclass
class QuickAccountingEntryPayload(_QuickPayloadBase):
    source_doctype: str | None = None
    source_name: str | None = None
    entry_type: str | None = None
    status: str | None = None
    office_branch: str | None = None
    sales_entity: str | None = None
    insurance_company: str | None = None
    policy: str | None = None
    customer: str | None = None
    local_amount: float | None = None
    local_amount_try: float | None = None
    external_amount: float | None = None
    external_amount_try: float | None = None
    currency: str | None = None
    notes: str | None = None
    external_ref: str | None = None
