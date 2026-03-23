app_name = "acentem_takipte"
app_title = "Acentem Takipte"
app_publisher = "Acentem Takipte"
app_description = "Insurance agency CRM and policy management"
app_email = "dev@acentemtakipte.local"
app_license = "MIT"

app_include_js = []
app_include_css = []

role_home_page = {
    "Manager": "/at",
    "Agent": "/at",
    "Accountant": "/at",
    "System Manager": "/at",
    "Administrator": "/at",
}

doctype_js = {
    "AT Lead": "public/js/at_lead.js",
    "AT Offer": "public/js/at_offer.js",
    "AT Policy": "public/js/at_policy.js",
    "AT Policy Endorsement": "public/js/at_policy_endorsement.js",
    "AT Customer": "public/js/at_customer.js",
    "AT Claim": "public/js/at_claim.js",
    "AT Payment": "public/js/at_payment.js",
    "AT Renewal Task": "public/js/at_renewal_task.js",
}

doctype_list_js = {
    "AT Lead": "public/js/at_listviews.js",
    "AT Offer": "public/js/at_listviews.js",
    "AT Policy": "public/js/at_listviews.js",
    "AT Customer": "public/js/at_listviews.js",
    "AT Claim": "public/js/at_listviews.js",
    "AT Payment": "public/js/at_listviews.js",
    "AT Renewal Task": "public/js/at_listviews.js",
}

after_install = "acentem_takipte.setup_utils.after_install"
after_migrate = "acentem_takipte.setup_utils.after_migrate"

website_route_rules = [
    {"from_route": "/at", "to_route": "at"},
    {"from_route": "/at/<path:app_path>", "to_route": "at"},
]

permission_query_conditions = {
    "AT Customer": "acentem_takipte.doctype.at_customer.at_customer.get_permission_query_conditions",
    "AT Lead": "acentem_takipte.doctype.branch_permissions.get_lead_permission_query_conditions",
    "AT Offer": "acentem_takipte.doctype.branch_permissions.get_offer_permission_query_conditions",
    "AT Policy": "acentem_takipte.doctype.branch_permissions.get_policy_permission_query_conditions",
    "AT Payment": "acentem_takipte.doctype.branch_permissions.get_payment_permission_query_conditions",
    "AT Claim": "acentem_takipte.doctype.branch_permissions.get_claim_permission_query_conditions",
    "AT Renewal Task": "acentem_takipte.doctype.branch_permissions.get_renewal_task_permission_query_conditions",
    "AT Accounting Entry": "acentem_takipte.doctype.branch_permissions.get_accounting_entry_permission_query_conditions",
    "AT Reconciliation Item": "acentem_takipte.doctype.branch_permissions.get_reconciliation_item_permission_query_conditions",
    "AT Notification Draft": "acentem_takipte.doctype.branch_permissions.get_notification_draft_permission_query_conditions",
    "AT Notification Outbox": "acentem_takipte.doctype.branch_permissions.get_notification_outbox_permission_query_conditions",
}

has_permission = {
    "AT Customer": "acentem_takipte.doctype.at_customer.at_customer.has_permission",
    "AT Lead": "acentem_takipte.doctype.branch_permissions.has_lead_permission",
    "AT Offer": "acentem_takipte.doctype.branch_permissions.has_offer_permission",
    "AT Policy": "acentem_takipte.doctype.branch_permissions.has_policy_permission",
    "AT Payment": "acentem_takipte.doctype.branch_permissions.has_payment_permission",
    "AT Claim": "acentem_takipte.doctype.branch_permissions.has_claim_permission",
    "AT Renewal Task": "acentem_takipte.doctype.branch_permissions.has_renewal_task_permission",
    "AT Accounting Entry": "acentem_takipte.doctype.branch_permissions.has_accounting_entry_permission",
    "AT Reconciliation Item": "acentem_takipte.doctype.branch_permissions.has_reconciliation_item_permission",
    "AT Notification Draft": "acentem_takipte.doctype.branch_permissions.has_notification_draft_permission",
    "AT Notification Outbox": "acentem_takipte.doctype.branch_permissions.has_notification_outbox_permission",
}

doc_events = {
    "AT Policy": {
        "after_insert": "acentem_takipte.accounting.sync_doc_event",
        "on_update": "acentem_takipte.accounting.sync_doc_event",
    },
    "AT Payment": {
        "after_insert": "acentem_takipte.accounting.sync_doc_event",
        "on_update": "acentem_takipte.accounting.sync_doc_event",
    },
    "AT Claim": {
        "after_insert": "acentem_takipte.accounting.sync_doc_event",
        "on_update": "acentem_takipte.accounting.sync_doc_event",
    },
}

scheduler_events = {
    "cron": {
        "*/10 * * * *": [
            "acentem_takipte.tasks.run_notification_queue_job",
        ],
        "0 * * * *": [
            "acentem_takipte.tasks.run_accounting_sync_job",
        ],
    },
    "daily": [
        "acentem_takipte.tasks.create_renewal_tasks",
        "acentem_takipte.tasks.run_stale_renewal_task_job",
        "acentem_takipte.tasks.run_payment_due_job",
        "acentem_takipte.tasks.run_due_campaigns_job",
        "acentem_takipte.tasks.run_customer_segment_snapshot_job",
        "acentem_takipte.tasks.run_scheduled_reports_job",
        "acentem_takipte.tasks.run_accounting_reconciliation_job",
    ]
}