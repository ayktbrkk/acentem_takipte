app_name = "acentem_takipte"
app_title = "Acentem Takipte"
app_publisher = "Acentem Takipte"
app_description = "Insurance agency CRM and policy management"
app_email = "dev@acentemtakipte.local"
app_license = "MIT"

# /at SPA assets are injected dynamically in www/at.py from latest Vite manifest.
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
    "AT Office Branch": "public/js/at_office_branch.js",
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

doctype_tree_js = {
    "AT Office Branch": "public/js/at_office_branch_tree.js",
}

after_install = "acentem_takipte.acentem_takipte.setup_utils.after_install"
after_migrate = "acentem_takipte.acentem_takipte.setup_utils.after_migrate"
on_session_creation = "acentem_takipte.acentem_takipte.setup_utils.precompute_user_scope_on_session_creation"
on_logout = (
    "acentem_takipte.acentem_takipte.setup_utils.invalidate_user_scope_on_logout"
)

website_route_rules = [
    {"from_route": "/at", "to_route": "at"},
    {"from_route": "/at/<path:app_path>", "to_route": "at"},
]

permission_query_conditions = {
    "AT Customer": "acentem_takipte.acentem_takipte.doctype.at_customer.at_customer.get_permission_query_conditions",
    "AT Lead": "acentem_takipte.acentem_takipte.doctype.branch_permissions.get_lead_permission_query_conditions",
    "AT Offer": "acentem_takipte.acentem_takipte.doctype.branch_permissions.get_offer_permission_query_conditions",
    "AT Policy": "acentem_takipte.acentem_takipte.doctype.branch_permissions.get_policy_permission_query_conditions",
    "AT Policy Endorsement": "acentem_takipte.acentem_takipte.doctype.branch_permissions.get_policy_endorsement_permission_query_conditions",
    "AT Payment": "acentem_takipte.acentem_takipte.doctype.branch_permissions.get_payment_permission_query_conditions",
    "AT Claim": "acentem_takipte.acentem_takipte.doctype.branch_permissions.get_claim_permission_query_conditions",
    "AT Activity": "acentem_takipte.acentem_takipte.doctype.branch_permissions.get_activity_permission_query_conditions",
    "AT Task": "acentem_takipte.acentem_takipte.doctype.branch_permissions.get_task_permission_query_conditions",
    "AT Reminder": "acentem_takipte.acentem_takipte.doctype.branch_permissions.get_reminder_permission_query_conditions",
    "AT Ownership Assignment": "acentem_takipte.acentem_takipte.doctype.branch_permissions.get_ownership_assignment_permission_query_conditions",
    "AT Renewal Task": "acentem_takipte.acentem_takipte.doctype.branch_permissions.get_renewal_task_permission_query_conditions",
    "AT Accounting Entry": "acentem_takipte.acentem_takipte.doctype.branch_permissions.get_accounting_entry_permission_query_conditions",
    "AT Reconciliation Item": "acentem_takipte.acentem_takipte.doctype.branch_permissions.get_reconciliation_item_permission_query_conditions",
    "AT Notification Draft": "acentem_takipte.acentem_takipte.doctype.branch_permissions.get_notification_draft_permission_query_conditions",
    "AT Notification Outbox": "acentem_takipte.acentem_takipte.doctype.branch_permissions.get_notification_outbox_permission_query_conditions",
}

has_permission = {
    "AT Customer": "acentem_takipte.acentem_takipte.doctype.at_customer.at_customer.has_permission",
    "AT Lead": "acentem_takipte.acentem_takipte.doctype.branch_permissions.has_lead_permission",
    "AT Offer": "acentem_takipte.acentem_takipte.doctype.branch_permissions.has_offer_permission",
    "AT Policy": "acentem_takipte.acentem_takipte.doctype.branch_permissions.has_policy_permission",
    "AT Policy Endorsement": "acentem_takipte.acentem_takipte.doctype.branch_permissions.has_policy_endorsement_permission",
    "AT Payment": "acentem_takipte.acentem_takipte.doctype.branch_permissions.has_payment_permission",
    "AT Claim": "acentem_takipte.acentem_takipte.doctype.branch_permissions.has_claim_permission",
    "AT Activity": "acentem_takipte.acentem_takipte.doctype.branch_permissions.has_activity_permission",
    "AT Task": "acentem_takipte.acentem_takipte.doctype.branch_permissions.has_task_permission",
    "AT Reminder": "acentem_takipte.acentem_takipte.doctype.branch_permissions.has_reminder_permission",
    "AT Ownership Assignment": "acentem_takipte.acentem_takipte.doctype.branch_permissions.has_ownership_assignment_permission",
    "AT Renewal Task": "acentem_takipte.acentem_takipte.doctype.branch_permissions.has_renewal_task_permission",
    "AT Accounting Entry": "acentem_takipte.acentem_takipte.doctype.branch_permissions.has_accounting_entry_permission",
    "AT Reconciliation Item": "acentem_takipte.acentem_takipte.doctype.branch_permissions.has_reconciliation_item_permission",
    "AT Notification Draft": "acentem_takipte.acentem_takipte.doctype.branch_permissions.has_notification_draft_permission",
    "AT Notification Outbox": "acentem_takipte.acentem_takipte.doctype.branch_permissions.has_notification_outbox_permission",
}

doc_events = {
    "AT User Branch Access": {
        "on_update": "acentem_takipte.acentem_takipte.services.cache_precomputation.invalidate_user_scope_from_assignment_doc",
        "on_trash": "acentem_takipte.acentem_takipte.services.cache_precomputation.invalidate_user_scope_from_assignment_doc",
    },
    "AT User Sales Entity Access": {
        "on_update": "acentem_takipte.acentem_takipte.services.cache_precomputation.invalidate_user_scope_from_assignment_doc",
        "on_trash": "acentem_takipte.acentem_takipte.services.cache_precomputation.invalidate_user_scope_from_assignment_doc",
    },
    "AT Office Branch": {
        "on_update": "acentem_takipte.acentem_takipte.services.sales_entities.handle_office_branch_update",
    },
    "AT Sales Entity": {
        "on_update": "acentem_takipte.acentem_takipte.services.sales_entities.handle_sales_entity_update",
    },
    "User": {
        "on_update": "acentem_takipte.acentem_takipte.services.sales_entities.handle_user_update",
    },
    "AT Policy": {
        "after_insert": "acentem_takipte.acentem_takipte.accounting.sync_doc_event",
        "on_update": "acentem_takipte.acentem_takipte.accounting.sync_doc_event",
    },
    "AT Payment": {
        "after_insert": "acentem_takipte.acentem_takipte.accounting.sync_doc_event",
        "on_update": "acentem_takipte.acentem_takipte.accounting.sync_doc_event",
    },
    "AT Claim": {
        "after_insert": "acentem_takipte.acentem_takipte.accounting.sync_doc_event",
        "on_update": "acentem_takipte.acentem_takipte.accounting.sync_doc_event",
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
        "acentem_takipte.acentem_takipte.tasks.run_scheduled_reports_job",
        "acentem_takipte.acentem_takipte.tasks.run_accounting_reconciliation_job",
        "acentem_takipte.acentem_takipte.services.break_glass.expire_stale",
        "acentem_takipte.acentem_takipte.services.break_glass.run_break_glass_audit_monitor",
    ],
}
