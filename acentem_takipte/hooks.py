from acentem_takipte import __version__


app_name = "acentem_takipte"
app_title = "Acentem Takipte"
app_publisher = "ayktbrkk"
app_description = "Acentem Takipte Core Application"
app_email = "ayktbrkk@gmail.com"
app_license = "mit"
app_version = __version__
export_python_type_annotations = True

# Website routing
get_website_user_home_page = "acentem_takipte.acentem_takipte.api.session.get_website_user_home_page"

website_route_rules = [
    {"from_route": "/at/<path:path>", "to_route": "at"},
]

boot_session = "acentem_takipte.acentem_takipte.startup.enforce_production_safety_flags"

# ---------------------------------------------------------------------------
# Document Events
# Each handler is referenced by its full dotted path so Frappe can resolve it
# lazily — no top-level imports needed here.
# ---------------------------------------------------------------------------

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
    # ------------------------------------------------------------------
    # AT Policy — core document; triggers accounting + all related caches
    # ------------------------------------------------------------------
    "AT Policy": {
        "after_insert": [_acct, _dash, _rt, _p360, _c360],
        "on_update":    [_acct, _dash, _rt, _p360, _c360],
        "on_trash":     [_dash, _rt, _p360, _c360],
    },
    # ------------------------------------------------------------------
    # AT Policy sub-documents — only need policy cache invalidation
    # ------------------------------------------------------------------
    "AT Policy Endorsement": {
        "on_update": _p360,
        "on_trash":  _p360,
    },
    "AT Policy Snapshot": {
        "on_update": _p360,
        "on_trash":  _p360,
    },
    # ------------------------------------------------------------------
    # AT Lead
    # ------------------------------------------------------------------
    "AT Lead": {
        "after_insert": [_dash, _rt, _l360],
        "on_update":    [_dash, _rt, _l360],
        "on_trash":     [_dash, _rt, _l360],
    },
    # ------------------------------------------------------------------
    # AT Offer — affects offer, customer and lead caches
    # ------------------------------------------------------------------
    "AT Offer": {
        "after_insert": [_dash, _rt, _o360, _c360, _l360],
        "on_update":    [_dash, _rt, _o360, _c360, _l360],
        "on_trash":     [_dash, _rt, _o360, _c360, _l360],
    },
    # ------------------------------------------------------------------
    # AT Claim — triggers accounting; affects claim + customer caches
    # ------------------------------------------------------------------
    "AT Claim": {
        "after_insert": [_acct, _dash, _rt, _cl360, _c360],
        "on_update":    [_acct, _dash, _rt, _cl360, _c360],
        "on_trash":     [_dash, _rt, _cl360, _c360],
    },
    # ------------------------------------------------------------------
    # AT Payment — affects payment, policy, customer and offer caches
    # ------------------------------------------------------------------
    "AT Payment": {
        "after_insert": [_pay360, _p360, _c360, _o360],
        "on_update":    [_pay360, _p360, _c360, _o360],
        "on_trash":     [_pay360],
    },
    "AT Payment Installment": {
        "on_update": [_pay360],
        "on_trash":  [_pay360],
    },
    # ------------------------------------------------------------------
    # AT Customer
    # ------------------------------------------------------------------
    "AT Customer": {
        "after_insert": [_dash, _rt, _c360],
        "on_update":    [_dash, _rt, _c360],
        "on_trash":     [_dash, _rt, _c360],
    },
    # ------------------------------------------------------------------
    # AT Renewal Task — affects policy, customer and offer caches
    # ------------------------------------------------------------------
    "AT Renewal Task": {
        "on_update": [_p360, _c360, _o360],
        "on_trash":  [_p360, _c360, _o360],
    },
    # ------------------------------------------------------------------
    # AT Document — a file attached to any doctype; invalidate all caches
    # whose detail pages show documents (policy, payment, customer,
    # offer, claim).
    # ------------------------------------------------------------------
    "AT Document": {
        "on_update": [_p360, _pay360, _c360, _o360, _cl360],
        "on_trash":  [_p360, _pay360, _c360, _o360, _cl360],
    },
    # ------------------------------------------------------------------
    # Frappe built-ins that update activity timelines
    # ------------------------------------------------------------------
    "Comment": {
        "after_insert": [_p360, _c360, _o360, _l360],
    },
    "Communication": {
        "after_insert": [_p360, _c360, _o360, _l360],
        "on_update":    [_p360, _c360, _o360, _l360],
    },
    # ------------------------------------------------------------------
    # Lightweight realtime-only documents
    # ------------------------------------------------------------------
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

_branch_perms = "acentem_takipte.acentem_takipte.doctype.branch_permissions"

permission_query_conditions = {
    "AT Lead": f"{_branch_perms}.get_lead_permission_query_conditions",
    "AT Offer": f"{_branch_perms}.get_offer_permission_query_conditions",
    "AT Policy": f"{_branch_perms}.get_policy_permission_query_conditions",
    "AT Payment": f"{_branch_perms}.get_payment_permission_query_conditions",
    "AT Claim": f"{_branch_perms}.get_claim_permission_query_conditions",
    "AT Renewal Task": f"{_branch_perms}.get_renewal_task_permission_query_conditions",
    "AT Accounting Entry": f"{_branch_perms}.get_accounting_entry_permission_query_conditions",
    "AT Reconciliation Item": f"{_branch_perms}.get_reconciliation_item_permission_query_conditions",
    "AT Notification Draft": f"{_branch_perms}.get_notification_draft_permission_query_conditions",
    "AT Renewal Outcome": f"{_branch_perms}.get_renewal_outcome_permission_query_conditions",
    "AT Payment Installment": f"{_branch_perms}.get_payment_installment_permission_query_conditions",
    "AT Call Note": f"{_branch_perms}.get_call_note_permission_query_conditions",
    "AT Segment": f"{_branch_perms}.get_segment_permission_query_conditions",
    "AT Campaign": f"{_branch_perms}.get_campaign_permission_query_conditions",
    "AT Document": "acentem_takipte.acentem_takipte.doctype.at_document.at_document.get_permission_query_conditions",
    "AT Notification Outbox": f"{_branch_perms}.get_notification_outbox_permission_query_conditions",
    "AT Activity": f"{_branch_perms}.get_activity_permission_query_conditions",
    "AT Task": f"{_branch_perms}.get_task_permission_query_conditions",
    "AT Reminder": f"{_branch_perms}.get_reminder_permission_query_conditions",
    "AT Ownership Assignment": f"{_branch_perms}.get_ownership_assignment_permission_query_conditions",
    "AT Policy Endorsement": f"{_branch_perms}.get_policy_endorsement_permission_query_conditions",
}

has_permission = {
    "AT Lead": f"{_branch_perms}.has_lead_permission",
    "AT Offer": f"{_branch_perms}.has_offer_permission",
    "AT Policy": f"{_branch_perms}.has_policy_permission",
    "AT Payment": f"{_branch_perms}.has_payment_permission",
    "AT Claim": f"{_branch_perms}.has_claim_permission",
    "AT Renewal Task": f"{_branch_perms}.has_renewal_task_permission",
    "AT Accounting Entry": f"{_branch_perms}.has_accounting_entry_permission",
    "AT Reconciliation Item": f"{_branch_perms}.has_reconciliation_item_permission",
    "AT Notification Draft": f"{_branch_perms}.has_notification_draft_permission",
    "AT Renewal Outcome": f"{_branch_perms}.has_renewal_outcome_permission",
    "AT Payment Installment": f"{_branch_perms}.has_payment_installment_permission",
    "AT Call Note": f"{_branch_perms}.has_call_note_permission",
    "AT Segment": f"{_branch_perms}.has_segment_permission",
    "AT Campaign": f"{_branch_perms}.has_campaign_permission",
    "AT Document": "acentem_takipte.acentem_takipte.doctype.at_document.at_document.has_permission",
    "AT Notification Outbox": f"{_branch_perms}.has_notification_outbox_permission",
    "AT Activity": f"{_branch_perms}.has_activity_permission",
    "AT Task": f"{_branch_perms}.has_task_permission",
    "AT Reminder": f"{_branch_perms}.has_reminder_permission",
    "AT Ownership Assignment": f"{_branch_perms}.has_ownership_assignment_permission",
    "AT Policy Endorsement": f"{_branch_perms}.has_policy_endorsement_permission",
}

# ---------------------------------------------------------------------------
# Scheduler Events
#
# Jobs are staggered across the night to avoid simultaneous heavy DB load:
#   00:00  urgent daily ops (renewal tasks, payment due, break-glass cleanup)
#   01:00  marketing / segmentation (campaigns, customer segments)
#   02:00  heavy reconciliation (accounting)
#   03:00  report generation (snapshots, scheduled reports, audit monitor)
#   */10m  notification queue
#   hourly accounting sync + break-glass grant expiry
# ---------------------------------------------------------------------------

scheduler_events = {
    "cron": {
        # Every 10 minutes — notification delivery queue
        "*/10 * * * *": [
            "acentem_takipte.acentem_takipte.tasks.run_notification_queue_job",
        ],
        # Every hour — incremental accounting sync + break-glass grant cleanup
        "0 * * * *": [
            "acentem_takipte.acentem_takipte.tasks.run_accounting_sync_job",
            "acentem_takipte.acentem_takipte.services.break_glass.expire_break_glass_grants",
            "acentem_takipte.acentem_takipte.services.ops_alerts.run_error_log_alert_monitor",
        ],
        # 01:00 — campaign dispatch + customer segment snapshot
        "0 1 * * *": [
            "acentem_takipte.acentem_takipte.tasks.run_due_campaigns_job",
            "acentem_takipte.acentem_takipte.tasks.run_customer_segment_snapshot_job",
        ],
        # 02:00 — heavy accounting reconciliation (isolated slot)
        "0 2 * * *": [
            "acentem_takipte.acentem_takipte.tasks.run_accounting_reconciliation_job",
        ],
        # 03:00 — report generation + break-glass audit monitor
        "0 3 * * *": [
            "acentem_takipte.acentem_takipte.tasks.run_report_snapshot_job",
            "acentem_takipte.acentem_takipte.tasks.run_scheduled_reports_job",
            "acentem_takipte.acentem_takipte.services.break_glass.run_break_glass_audit_monitor",
        ],
    },
    # 00:00 — urgent lightweight daily ops
    "daily": [
        "acentem_takipte.acentem_takipte.tasks.create_renewal_tasks",
        "acentem_takipte.acentem_takipte.tasks.run_policy_renewal_reminder_job",
        "acentem_takipte.acentem_takipte.tasks.run_stale_renewal_task_job",
        "acentem_takipte.acentem_takipte.tasks.run_payment_due_job",
        "acentem_takipte.acentem_takipte.services.break_glass.expire_stale",
    ],
}
