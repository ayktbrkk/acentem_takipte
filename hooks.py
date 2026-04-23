app_name = "acentem_takipte"
app_title = "Acentem Takipte"
app_publisher = "ayktbrkk"
app_description = "Acentem Takipte Core Application"
app_email = "ayktbrkk@gmail.com"
app_license = "mit"

# NOTE: This file is NOT loaded by Frappe. The canonical hooks file is:
#       acentem_takipte/hooks.py  (the Python package hooks)
# This file is kept as a human-readable reference and must stay in sync with
# acentem_takipte/hooks.py. Do NOT add executable logic here.

_p360 = "acentem_takipte.acentem_takipte.services.policy_360.invalidate_policy_from_doc_event"
_o360 = "acentem_takipte.acentem_takipte.services.offer_360.invalidate_offer_from_doc_event"
_c360 = "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event"
_l360 = "acentem_takipte.acentem_takipte.services.lead_360.invalidate_lead_from_doc_event"
_pay360 = "acentem_takipte.acentem_takipte.services.payment_360.invalidate_payment_from_doc_event"
_cl360 = "acentem_takipte.acentem_takipte.services.claim_360.invalidate_claim_from_doc_event"
_acct = "acentem_takipte.acentem_takipte.accounting.sync_doc_event"
_dash = "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache"
_rt = "acentem_takipte.acentem_takipte.realtime.on_record_change"

doc_events = {
    "AT Policy": {
        "after_insert": [_acct, _dash, _rt, _p360, _c360],
        "on_update":    [_acct, _dash, _rt, _p360, _c360],
        "on_trash":     [_dash, _rt, _p360, _c360],
    },
    "AT Policy Endorsement": {
        "on_update": _p360,
        "on_trash":  _p360,
    },
    "AT Policy Snapshot": {
        "on_update": _p360,
        "on_trash":  _p360,
    },
    "AT Lead": {
        "after_insert": [_dash, _rt, _l360],
        "on_update":    [_dash, _rt, _l360],
        "on_trash":     [_dash, _rt, _l360],
    },
    "AT Offer": {
        "after_insert": [_dash, _rt, _o360, _c360, _l360],
        "on_update":    [_dash, _rt, _o360, _c360, _l360],
        "on_trash":     [_dash, _rt, _o360, _c360, _l360],
    },
    "AT Claim": {
        "after_insert": [_acct, _dash, _rt, _cl360, _c360],
        "on_update":    [_acct, _dash, _rt, _cl360, _c360],
        "on_trash":     [_dash, _rt, _cl360, _c360],
    },
    "AT Payment": {
        "after_insert": [_pay360, _p360, _c360, _o360],
        "on_update":    [_pay360, _p360, _c360, _o360],
        "on_trash":     [_pay360],
    },
    "AT Payment Installment": {
        "on_update": [_pay360],
        "on_trash":  [_pay360],
    },
    "AT Customer": {
        "after_insert": [_dash, _rt, _c360],
        "on_update":    [_dash, _rt, _c360],
        "on_trash":     [_dash, _rt, _c360],
    },
    "AT Renewal Task": {
        "on_update": [_p360, _c360, _o360],
        "on_trash":  [_p360, _c360, _o360],
    },
    "AT Document": {
        "on_update": [_p360, _pay360, _c360, _o360, _cl360],
        "on_trash":  [_p360, _pay360, _c360, _o360, _cl360],
    },
    "Comment": {
        "after_insert": [_p360, _c360, _o360, _l360],
    },
    "Communication": {
        "after_insert": [_p360, _c360, _o360, _l360],
        "on_update":    [_p360, _c360, _o360, _l360],
    },
    "AT Task": {
        "after_insert": _rt,
        "on_update":    _rt,
        "on_trash":     _rt,
    },
    "AT Reminder": {
        "after_insert": _rt,
        "on_update":    _rt,
        "on_trash":     _rt,
    },
    "AT Activity": {
        "after_insert": _rt,
        "on_update":    _rt,
        "on_trash":     _rt,
    },
}

scheduler_events = {
    "cron": {
        "*/10 * * * *": [
            "acentem_takipte.acentem_takipte.tasks.run_notification_queue_job",
        ],
        "0 * * * *": [
            "acentem_takipte.acentem_takipte.tasks.run_accounting_sync_job",
            "acentem_takipte.acentem_takipte.services.break_glass.expire_break_glass_grants",
        ],
        "0 1 * * *": [
            "acentem_takipte.acentem_takipte.tasks.run_due_campaigns_job",
            "acentem_takipte.acentem_takipte.tasks.run_customer_segment_snapshot_job",
        ],
        "0 2 * * *": [
            "acentem_takipte.acentem_takipte.tasks.run_accounting_reconciliation_job",
        ],
        "0 3 * * *": [
            "acentem_takipte.acentem_takipte.tasks.run_report_snapshot_job",
            "acentem_takipte.acentem_takipte.tasks.run_scheduled_reports_job",
            "acentem_takipte.acentem_takipte.services.break_glass.run_break_glass_audit_monitor",
        ],
    },
    "daily": [
        "acentem_takipte.acentem_takipte.tasks.create_renewal_tasks",
        "acentem_takipte.acentem_takipte.tasks.run_stale_renewal_task_job",
        "acentem_takipte.acentem_takipte.tasks.run_payment_due_job",
        "acentem_takipte.acentem_takipte.services.break_glass.expire_stale",
    ],
}
app_title = "Acentem Takipte"
app_publisher = "ayktbrkk"
app_description = "Acentem Takipte Core Application"
app_email = "ayktbrkk@gmail.com"
app_license = "mit"

doc_events = {
    "AT Policy": {
        "after_insert": [
            "acentem_takipte.acentem_takipte.accounting.sync_doc_event",
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
            "acentem_takipte.acentem_takipte.services.policy_360.invalidate_policy_from_doc_event",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
        ],
        "on_update": [
            "acentem_takipte.acentem_takipte.accounting.sync_doc_event",
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
            "acentem_takipte.acentem_takipte.services.policy_360.invalidate_policy_from_doc_event",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
        ],
        "on_trash": [
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
            "acentem_takipte.acentem_takipte.services.policy_360.invalidate_policy_from_doc_event",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
        ],
    },
    "AT Lead": {
        "after_insert": [
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
            "acentem_takipte.acentem_takipte.services.lead_360.invalidate_lead_from_doc_event",
        ],
        "on_update": [
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
            "acentem_takipte.acentem_takipte.services.lead_360.invalidate_lead_from_doc_event",
        ],
        "on_trash": [
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
            "acentem_takipte.acentem_takipte.services.lead_360.invalidate_lead_from_doc_event",
        ],
    },
    "AT Policy Endorsement": {
        "on_update": "acentem_takipte.acentem_takipte.services.policy_360.invalidate_policy_from_doc_event",
        "on_trash": "acentem_takipte.acentem_takipte.services.policy_360.invalidate_policy_from_doc_event",
    },
    "AT Policy Snapshot": {
        "on_update": "acentem_takipte.acentem_takipte.services.policy_360.invalidate_policy_from_doc_event",
        "on_trash": "acentem_takipte.acentem_takipte.services.policy_360.invalidate_policy_from_doc_event",
    },
    "AT Document": {
        "on_update": [
            "acentem_takipte.acentem_takipte.services.policy_360.invalidate_policy_from_doc_event",
            "acentem_takipte.acentem_takipte.services.payment_360.invalidate_payment_from_doc_event",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
        ],
        "on_trash": [
            "acentem_takipte.acentem_takipte.services.policy_360.invalidate_policy_from_doc_event",
            "acentem_takipte.acentem_takipte.services.payment_360.invalidate_payment_from_doc_event",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
        ],
    },
    "AT Payment": {
        "after_insert": [
            "acentem_takipte.acentem_takipte.services.policy_360.invalidate_policy_from_doc_event",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
            "acentem_takipte.acentem_takipte.services.offer_360.invalidate_offer_from_doc_event",
            "acentem_takipte.acentem_takipte.services.payment_360.invalidate_payment_from_doc_event",
        ],
        "on_update": [
            "acentem_takipte.acentem_takipte.services.policy_360.invalidate_policy_from_doc_event",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
            "acentem_takipte.acentem_takipte.services.policy_360.invalidate_policy_from_doc_event",
            "acentem_takipte.acentem_takipte.services.payment_360.invalidate_payment_from_doc_event",
        ],
        "on_trash": [
            "acentem_takipte.acentem_takipte.services.payment_360.invalidate_payment_from_doc_event",
        ],
    },
    "AT Payment Installment": {
        "on_update": [
            "acentem_takipte.acentem_takipte.services.payment_360.invalidate_payment_from_doc_event",
        ],
        "on_trash": [
            "acentem_takipte.acentem_takipte.services.payment_360.invalidate_payment_from_doc_event",
        ],
    },
    "AT Renewal Task": {
        "on_update": [
            "acentem_takipte.acentem_takipte.services.policy_360.invalidate_policy_from_doc_event",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
            "acentem_takipte.acentem_takipte.services.offer_360.invalidate_offer_from_doc_event",
        ],
    },
    "Comment": {
        "after_insert": [
            "acentem_takipte.acentem_takipte.services.policy_360.invalidate_policy_from_doc_event",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
            "acentem_takipte.acentem_takipte.services.offer_360.invalidate_offer_from_doc_event",
            "acentem_takipte.acentem_takipte.services.lead_360.invalidate_lead_from_doc_event",
        ],
    },
    "Communication": {
        "on_update": [
            "acentem_takipte.acentem_takipte.services.policy_360.invalidate_policy_from_doc_event",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
            "acentem_takipte.acentem_takipte.services.offer_360.invalidate_offer_from_doc_event",
            "acentem_takipte.acentem_takipte.services.lead_360.invalidate_lead_from_doc_event",
        ],
        "after_insert": [
            "acentem_takipte.acentem_takipte.services.policy_360.invalidate_policy_from_doc_event",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
            "acentem_takipte.acentem_takipte.services.offer_360.invalidate_offer_from_doc_event",
            "acentem_takipte.acentem_takipte.services.lead_360.invalidate_lead_from_doc_event",
        ],
    },
    "AT Claim": {
        "after_insert": [
            "acentem_takipte.acentem_takipte.accounting.sync_doc_event",
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
            "acentem_takipte.acentem_takipte.services.claim_360.invalidate_claim_from_doc_event",
        ],
        "on_update": [
            "acentem_takipte.acentem_takipte.accounting.sync_doc_event",
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
            "acentem_takipte.acentem_takipte.services.claim_360.invalidate_claim_from_doc_event",
        ],
        "on_trash": [
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
            "acentem_takipte.acentem_takipte.services.claim_360.invalidate_claim_from_doc_event",
        ],
    },
    "AT Offer": {
        "on_update": [
            "acentem_takipte.acentem_takipte.services.offer_360.invalidate_offer_from_doc_event",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
            "acentem_takipte.acentem_takipte.services.lead_360.invalidate_lead_from_doc_event",
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
        ],
        "on_trash": [
            "acentem_takipte.acentem_takipte.services.offer_360.invalidate_offer_from_doc_event",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
            "acentem_takipte.acentem_takipte.services.lead_360.invalidate_lead_from_doc_event",
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
        ],
    },
    "AT Customer": {
        "after_insert": [
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
        ],
        "on_update": [
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
        ],
        "on_trash": [
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
        ],
    },
    "AT Task": {
        "after_insert": "acentem_takipte.acentem_takipte.realtime.on_record_change",
        "on_update": "acentem_takipte.acentem_takipte.realtime.on_record_change",
        "on_trash": "acentem_takipte.acentem_takipte.realtime.on_record_change",
    },
    "AT Reminder": {
        "after_insert": "acentem_takipte.acentem_takipte.realtime.on_record_change",
        "on_update": "acentem_takipte.acentem_takipte.realtime.on_record_change",
        "on_trash": "acentem_takipte.acentem_takipte.realtime.on_record_change",
    },
    "AT Activity": {
        "after_insert": "acentem_takipte.acentem_takipte.realtime.on_record_change",
        "on_update": "acentem_takipte.acentem_takipte.realtime.on_record_change",
        "on_trash": "acentem_takipte.acentem_takipte.realtime.on_record_change",
    },
}

scheduler_events = {
    "cron": {
        "*/10 * * * *": [
            "acentem_takipte.acentem_takipte.tasks.run_notification_queue_job",
        ],
        "0 * * * *": [
            "acentem_takipte.acentem_takipte.tasks.run_accounting_sync_job",
            "acentem_takipte.acentem_takipte.services.break_glass.expire_break_glass_grants",
        ],
    },
    "daily": [
        "acentem_takipte.acentem_takipte.tasks.create_renewal_tasks",
        "acentem_takipte.acentem_takipte.tasks.run_stale_renewal_task_job",
        "acentem_takipte.acentem_takipte.tasks.run_payment_due_job",
        "acentem_takipte.acentem_takipte.tasks.run_due_campaigns_job",
        "acentem_takipte.acentem_takipte.tasks.run_customer_segment_snapshot_job",
        "acentem_takipte.acentem_takipte.tasks.run_report_snapshot_job",
        "acentem_takipte.acentem_takipte.tasks.run_scheduled_reports_job",
        "acentem_takipte.acentem_takipte.tasks.run_accounting_reconciliation_job",
        "acentem_takipte.acentem_takipte.services.break_glass.expire_stale",
        "acentem_takipte.acentem_takipte.services.break_glass.run_break_glass_audit_monitor",
    ],
}


