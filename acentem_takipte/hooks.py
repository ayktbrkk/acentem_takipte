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
