from __future__ import annotations


NOTIFICATION_TEMPLATE_CATALOG = {
    "renewal_due": [
        "renewal_reminder_90",
        "renewal_reminder_60",
        "renewal_reminder_30",
        "renewal_reminder_15",
        "renewal_reminder_7",
        "renewal_reminder_1",
    ],
    "payment_due": [
        "payment_due_7",
        "payment_due_1",
        "payment_due_today",
        "payment_due_overdue",
    ],
    "claim_status_update": [
        "claim_status_open",
        "claim_status_under_review",
        "claim_status_approved",
        "claim_status_rejected",
        "claim_status_paid",
        "claim_status_closed",
    ],
    "policy_created": [
        "policy_delivery",
    ],
}


def get_template_keys_for_event(event_key: str) -> list[str]:
    return list(NOTIFICATION_TEMPLATE_CATALOG.get(str(event_key or "").strip(), ()))


def is_valid_template_key(event_key: str, template_key: str | None) -> bool:
    if not template_key:
        return False
    return template_key in NOTIFICATION_TEMPLATE_CATALOG.get(str(event_key or "").strip(), ())
