import frappe
from frappe import _

from acentem_takipte.acentem_takipte.services.customer_360 import (
    invalidate_customer_from_doc_event,
)
from acentem_takipte.acentem_takipte.services.offer_360 import (
    invalidate_offer_360_cache,
)
from acentem_takipte.acentem_takipte.services.lead_360 import (
    invalidate_lead_360_cache,
)

app_name = "acentem_takipte"
app_title = "Acentem Takipte"
app_publisher = "ayktbrkk"
app_description = "Acentem Takipte Core Application"
app_email = "ayktbrkk@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be added as a top-level menu in the desk
# desk_menus = [
# 	{
# 		"title": "Acentem Takipte",
# 		"color": "blue",
# 		"icon": "octicon octicon-briefcase",
# 		"type": "module",
# 		"label": "Acentem Takipte"
# 	}
# ]

# Each item in the list will be added as a shortcut in the desk for a specific doctype
# desk_shortcuts = [
# 	{
# 		"title": "Acentem Takipte",
# 		"target": "/app/acentem-takipte",
# 		"icon": "octicon octicon-briefcase",
# 		"type": "module",
# 		"label": "Acentem Takipte"
# 	}
# ]

# website_generators = ["AT Policy", "AT Customer"]

# Includes in <head>
# ------------------

# include_js = "/assets/acentem_takipte/js/acentem_takipte.js"
# include_css = "/assets/acentem_takipte/css/acentem_takipte.css"

# include_js = "acentem_takipte.bundle.js"

# Website user home page
# website_user_home_page = "at"

# Translation
# ------------------

# Each item in the list will be added as a translation source
# translation_sources = ["acentem_takipte/translations"]

# Each item in the list will be added as a translation file
# translation_files = ["acentem_takipte/translations/tr.csv"]

# Generators
# ----------

# before_install = "acentem_takipte.acentem_takipte.api.smoke.before_install"
# after_install = "acentem_takipte.acentem_takipte.api.smoke.after_install"

# Integration Setup
# ------------------

# after_migrate = "acentem_takipte.acentem_takipte.api.smoke.after_migrate"

# Document Events
# ---------------

doc_events = {
    "AT Policy": {
        "after_insert": [
            "acentem_takipte.acentem_takipte.accounting.sync_doc_event",
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
            "acentem_takipte.acentem_takipte.services.policy_360.invalidate_from_doc_event",
        ],
        "on_update": [
            "acentem_takipte.acentem_takipte.accounting.sync_doc_event",
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
            "acentem_takipte.acentem_takipte.services.policy_360.invalidate_from_doc_event",
        ],
        "on_trash": [
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
            "acentem_takipte.acentem_takipte.services.policy_360.invalidate_from_doc_event",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
        ],
    },
    "AT Lead": {
        "after_insert": [
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
            "acentem_takipte.acentem_takipte.hooks.invalidate_lead_from_doc_event",
        ],
        "on_update": [
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
            "acentem_takipte.acentem_takipte.hooks.invalidate_lead_from_doc_event",
        ],
        "on_trash": [
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
            "acentem_takipte.acentem_takipte.hooks.invalidate_lead_from_doc_event",
        ],
    },
    "AT Policy Endorsement": {
        "on_update": "acentem_takipte.acentem_takipte.services.policy_360.invalidate_from_doc_event",
        "on_trash": "acentem_takipte.acentem_takipte.services.policy_360.invalidate_from_doc_event",
    },
    "AT Policy Snapshot": {
        "on_update": "acentem_takipte.acentem_takipte.services.policy_360.invalidate_from_doc_event",
        "on_trash": "acentem_takipte.acentem_takipte.services.policy_360.invalidate_from_doc_event",
    },
    "AT Document": {
        "on_update": "acentem_takipte.acentem_takipte.services.policy_360.invalidate_from_doc_event",
        "on_trash": "acentem_takipte.acentem_takipte.services.policy_360.invalidate_from_doc_event",
    },
    "AT Payment": {
        "after_insert": [
            "acentem_takipte.acentem_takipte.hooks.invalidate_policy_from_doc_event",
            "acentem_takipte.acentem_takipte.hooks.invalidate_customer_from_doc_event",
            "acentem_takipte.acentem_takipte.hooks.invalidate_offer_from_doc_event",
        ],
        "on_update": [
            "acentem_takipte.acentem_takipte.hooks.invalidate_policy_from_doc_event",
            "acentem_takipte.acentem_takipte.hooks.invalidate_customer_from_doc_event",
            "acentem_takipte.acentem_takipte.hooks.invalidate_offer_from_doc_event",
        ],
    },
    "AT Renewal Task": {
        "on_update": [
            "acentem_takipte.acentem_takipte.hooks.invalidate_policy_from_doc_event",
            "acentem_takipte.acentem_takipte.hooks.invalidate_customer_from_doc_event",
            "acentem_takipte.acentem_takipte.hooks.invalidate_offer_from_doc_event",
        ],
    },
    "Comment": {
        "after_insert": [
            "acentem_takipte.acentem_takipte.hooks.invalidate_policy_from_doc_event",
            "acentem_takipte.acentem_takipte.hooks.invalidate_customer_from_doc_event",
            "acentem_takipte.acentem_takipte.hooks.invalidate_offer_from_doc_event",
        ],
    },
    "Communication": {
        "on_update": [
            "acentem_takipte.acentem_takipte.hooks.invalidate_policy_from_doc_event",
            "acentem_takipte.acentem_takipte.hooks.invalidate_customer_from_doc_event",
            "acentem_takipte.acentem_takipte.hooks.invalidate_offer_from_doc_event",
        ],
        "after_insert": [
            "acentem_takipte.acentem_takipte.hooks.invalidate_policy_from_doc_event",
            "acentem_takipte.acentem_takipte.hooks.invalidate_customer_from_doc_event",
            "acentem_takipte.acentem_takipte.hooks.invalidate_offer_from_doc_event",
        ],
    },
    "AT Claim": {
        "after_insert": [
            "acentem_takipte.acentem_takipte.accounting.sync_doc_event",
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
            "acentem_takipte.acentem_takipte.services.customer_360.invalidate_customer_from_doc_event",
        ],
        "on_update": [
            "acentem_takipte.acentem_takipte.accounting.sync_doc_event",
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
    "AT Lead": {
        "after_insert": ["acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache", "acentem_takipte.acentem_takipte.realtime.on_record_change"],
        "on_update": ["acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache", "acentem_takipte.acentem_takipte.realtime.on_record_change"],
        "on_trash": ["acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache", "acentem_takipte.acentem_takipte.realtime.on_record_change"],
    },
    "AT Offer": {
        "on_update": [
            "acentem_takipte.acentem_takipte.hooks.invalidate_offer_from_doc_event",
            "acentem_takipte.acentem_takipte.hooks.invalidate_customer_from_doc_event",
            "acentem_takipte.acentem_takipte.hooks.invalidate_lead_from_doc_event",
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
        ],
        "on_trash": [
            "acentem_takipte.acentem_takipte.hooks.invalidate_offer_from_doc_event",
            "acentem_takipte.acentem_takipte.hooks.invalidate_customer_from_doc_event",
            "acentem_takipte.acentem_takipte.hooks.invalidate_lead_from_doc_event",
            "acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache",
            "acentem_takipte.acentem_takipte.realtime.on_record_change",
        ],
    },
    "AT Customer": {
        "after_insert": ["acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache", "acentem_takipte.acentem_takipte.realtime.on_record_change"],
        "on_update": ["acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache", "acentem_takipte.acentem_takipte.realtime.on_record_change"],
        "on_trash": ["acentem_takipte.acentem_takipte.api.dashboard_cache.invalidate_dashboard_cache", "acentem_takipte.acentem_takipte.realtime.on_record_change"],
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

def invalidate_policy_from_doc_event(doc, method=None):
    from acentem_takipte.acentem_takipte.services.policy_360 import invalidate_policy_360_cache
    if doc.doctype == "AT Policy":
        invalidate_policy_360_cache(doc.name)
    elif hasattr(doc, "policy") and doc.policy:
        invalidate_policy_360_cache(doc.policy)

def invalidate_offer_from_doc_event(doc, method=None):
    if doc.doctype == "AT Offer":
        invalidate_offer_360_cache(doc.name)
    elif hasattr(doc, "offer") and doc.offer:
        invalidate_offer_360_cache(doc.offer)
    elif doc.doctype in ["Communication", "Comment"] and doc.reference_doctype == "AT Offer":
        invalidate_offer_360_cache(doc.reference_name)

def invalidate_lead_from_doc_event(doc, method=None):
    if doc.doctype == "AT Lead":
        invalidate_lead_360_cache(doc.name)
    elif doc.doctype == "AT Offer" and doc.source_lead:
        invalidate_lead_360_cache(doc.source_lead)
    elif doc.doctype in ["Communication", "Comment"] and doc.reference_doctype == "AT Lead":
        invalidate_lead_360_cache(doc.reference_name)
