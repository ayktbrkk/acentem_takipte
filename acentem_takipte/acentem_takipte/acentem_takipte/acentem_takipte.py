from frappe import _


def get_data():
    return [
        {
            "label": _("Insurance Ops"),
            "icon": "fa fa-briefcase",
            "items": [
                {
                    "type": "doctype",
                    "name": "AT Lead",
                    "description": _("Lead pipeline"),
                    "onboard": 1,
                },
                {
                    "type": "doctype",
                    "name": "AT Offer",
                    "description": _("Offer board and conversion"),
                    "onboard": 1,
                },
                {
                    "type": "doctype",
                    "name": "AT Policy",
                    "description": _("Policy lifecycle management"),
                    "onboard": 1,
                },
                {
                    "type": "doctype",
                    "name": "AT Policy Endorsement",
                    "description": _("Policy endorsement operations"),
                },
                {
                    "type": "doctype",
                    "name": "AT Claim",
                    "description": _("Claim operations"),
                },
                {
                    "type": "doctype",
                    "name": "AT Payment",
                    "description": _("Premium collections and payouts"),
                },
                {
                    "type": "doctype",
                    "name": "AT Renewal Task",
                    "description": _("Renewal follow-up"),
                },
            ],
        },
        {
            "label": _("Master Data"),
            "icon": "fa fa-database",
            "items": [
                {
                    "type": "doctype",
                    "name": "AT Customer",
                    "description": _("Customer records"),
                },
                {
                    "type": "doctype",
                    "name": "AT Sales Entity",
                    "description": _("Agency and sales hierarchy"),
                },
                {
                    "type": "doctype",
                    "name": "AT Insurance Company",
                    "description": _("Insurance company definitions"),
                },
                {
                    "type": "doctype",
                    "name": "AT Branch",
                    "description": _("Insurance branch definitions"),
                },
            ],
        },
        {
            "label": _("Control Center"),
            "icon": "fa fa-sliders",
            "items": [
                {
                    "type": "doctype",
                    "name": "AT Notification Template",
                    "description": _("Notification content templates"),
                },
                {
                    "type": "doctype",
                    "name": "AT Notification Draft",
                    "description": _("Prepared outbound notifications"),
                },
                {
                    "type": "doctype",
                    "name": "AT Notification Outbox",
                    "description": _("Notification delivery queue"),
                },
                {
                    "type": "doctype",
                    "name": "AT Accounting Entry",
                    "description": _("Accounting synchronization entries"),
                },
                {
                    "type": "doctype",
                    "name": "AT Reconciliation Item",
                    "description": _("Reconciliation work items"),
                },
                {
                    "type": "doctype",
                    "name": "AT Access Log",
                    "description": _("Access audit log"),
                },
            ],
        },
    ]
