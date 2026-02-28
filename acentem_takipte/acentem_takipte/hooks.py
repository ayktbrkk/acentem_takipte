app_name = "acentem_takipte"
app_title = "Acentem Takipte"
app_publisher = "Acentem Takipte"
app_description = "Insurance agency CRM and policy management"
app_email = "dev@acentemtakipte.local"
app_license = "MIT"

# /at SPA assets are injected dynamically in www/at.py from latest Vite manifest.
app_include_js = []
app_include_css = []

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

after_install = "acentem_takipte.acentem_takipte.setup_utils.after_install"
after_migrate = "acentem_takipte.acentem_takipte.setup_utils.after_migrate"

website_route_rules = [
    {"from_route": "/at", "to_route": "at"},
    {"from_route": "/at/<path:app_path>", "to_route": "at"},
]

permission_query_conditions = {
    "AT Customer": "acentem_takipte.acentem_takipte.doctype.at_customer.at_customer.get_permission_query_conditions",
}

has_permission = {
    "AT Customer": "acentem_takipte.acentem_takipte.doctype.at_customer.at_customer.has_permission",
}

doc_events = {
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
        ],
    },
    "daily": [
        "acentem_takipte.acentem_takipte.tasks.create_renewal_tasks",
        "acentem_takipte.acentem_takipte.tasks.run_accounting_reconciliation_job",
    ]
}
