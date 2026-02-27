from __future__ import annotations

from frappe.utils import add_days, now_datetime, nowdate

import frappe

from acentem_takipte.api.security import (
    assert_authenticated,
    assert_non_production_or_feature_flag,
    assert_post_request,
    assert_roles,
    audit_admin_action,
)
from acentem_takipte.acentem_takipte.doctype.at_lead.at_lead import convert_to_offer
from acentem_takipte.acentem_takipte.doctype.at_offer.at_offer import convert_to_policy
from acentem_takipte.acentem_takipte.doctype.at_policy_endorsement.at_policy_endorsement import (
    apply_endorsement,
)
from acentem_takipte.api.dashboard import get_dashboard_kpis
from acentem_takipte.tasks import run_renewal_task_job


def _assert_smoke_write_access() -> None:
    assert_authenticated()
    assert_roles("System Manager", message="Only System Manager can run backend smoke tests.")
    assert_non_production_or_feature_flag(
        "at_enable_demo_endpoints",
        "Backend smoke endpoint is disabled in production. Enable site_config 'at_enable_demo_endpoints' to allow it.",
    )
    assert_post_request("Only POST requests are allowed for backend smoke tests.")
    audit_admin_action("api.smoke.run_backend_smoke_test")


def _assert_smoke_read_access() -> None:
    assert_authenticated()
    assert_roles("System Manager", message="Only System Manager can inspect AT DocType modules.")
    assert_non_production_or_feature_flag(
        "at_enable_demo_endpoints",
        "Smoke inspection endpoint is disabled in production. Enable site_config 'at_enable_demo_endpoints' to allow it.",
    )
    audit_admin_action("api.smoke.inspect_at_doctype_modules")


@frappe.whitelist()
def run_backend_smoke_test() -> dict:
    _assert_smoke_write_access()
    required = [
        "AT Sales Entity",
        "AT Customer",
        "AT Policy",
        "AT Insurance Company",
        "AT Branch",
        "AT Lead",
        "AT Offer",
        "AT Renewal Task",
        "AT Notification Template",
        "AT Notification Draft",
        "AT Policy Snapshot",
        "AT Policy Endorsement",
        "AT Claim",
        "AT Payment",
    ]
    doctype_exists = {name: bool(frappe.db.exists("DocType", name)) for name in required}

    marker = now_datetime().strftime("%Y%m%d%H%M%S")
    created_docs = []
    result = {
        "doctype_exists": doctype_exists,
        "created": {},
    }

    try:
        company = frappe.get_doc(
            {
                "doctype": "AT Insurance Company",
                "company_name": f"Smoke Company {marker}",
                "company_code": f"SMK-{marker[-6:]}",
            }
        ).insert(ignore_permissions=True)
        created_docs.append(("AT Insurance Company", company.name))

        branch = frappe.get_doc(
            {
                "doctype": "AT Branch",
                "branch_name": f"Smoke Branch {marker}",
                "branch_code": f"BR-{marker[-6:]}",
                "insurance_company": company.name,
            }
        ).insert(ignore_permissions=True)
        created_docs.append(("AT Branch", branch.name))

        entity = frappe.get_doc(
            {
                "doctype": "AT Sales Entity",
                "entity_type": "Agency",
                "full_name": f"Smoke Agency {marker}",
            }
        ).insert(ignore_permissions=True)
        created_docs.append(("AT Sales Entity", entity.name))

        customer = frappe.get_doc(
            {
                "doctype": "AT Customer",
                "tax_id": f"9{marker[-10:]}",
                "full_name": f"Smoke Customer {marker}",
                "phone": "5550000000",
            }
        ).insert(ignore_permissions=True)
        created_docs.append(("AT Customer", customer.name))

        policy_template = frappe.get_doc(
            {
                "doctype": "AT Notification Template",
                "template_key": f"smoke-policy-{marker}",
                "event_key": "policy_created",
                "channel": "SMS",
                "language": "tr",
                "subject": "Policeniz olusturuldu: {{ policy_no }}",
                "body_template": "Sayin {{ customer.full_name }}, policeniz olusturuldu.",
                "is_active": 1,
            }
        ).insert(ignore_permissions=True)
        created_docs.append(("AT Notification Template", policy_template.name))

        renewal_template = frappe.get_doc(
            {
                "doctype": "AT Notification Template",
                "template_key": f"smoke-renewal-{marker}",
                "event_key": "renewal_due",
                "channel": "SMS",
                "language": "tr",
                "subject": "Policeniz yenileme zamani",
                "body_template": "Sayin {{ customer.full_name }}, yenileme tarihi {{ renewal_date }}.",
                "is_active": 1,
            }
        ).insert(ignore_permissions=True)
        created_docs.append(("AT Notification Template", renewal_template.name))

        lead = frappe.get_doc(
            {
                "doctype": "AT Lead",
                "first_name": "Smoke",
                "last_name": "Lead",
                "email": f"smoke.{marker}@example.com",
                "status": "Open",
                "customer": customer.name,
                "sales_entity": entity.name,
                "insurance_company": company.name,
                "branch": branch.name,
                "estimated_gross_premium": 1000,
                "notes": "Smoke conversion flow",
            }
        ).insert(ignore_permissions=True)
        created_docs.append(("AT Lead", lead.name))

        offer_result = convert_to_offer(lead.name)
        offer_name = offer_result["offer"]
        offer = frappe.get_doc("AT Offer", offer_name)
        created_docs.append(("AT Offer", offer.name))

        policy_result = convert_to_policy(
            offer_name=offer.name,
            start_date=nowdate(),
            end_date=add_days(nowdate(), 30),
            commission=150,
            policy_no=None,
        )
        policy = frappe.get_doc("AT Policy", policy_result["policy"])
        created_docs.append(("AT Policy", policy.name))

        baseline_snapshots = frappe.get_all(
            "AT Policy Snapshot",
            filters={"policy": policy.name, "snapshot_type": "Baseline"},
            fields=["name", "snapshot_version", "snapshot_type"],
            limit_page_length=5,
        )
        for row in baseline_snapshots:
            created_docs.append(("AT Policy Snapshot", row.name))

        endorsement = frappe.get_doc(
            {
                "doctype": "AT Policy Endorsement",
                "policy": policy.name,
                "endorsement_type": "Premium Update",
                "endorsement_date": nowdate(),
                "change_payload": frappe.as_json(
                    {
                        "commission": 175,
                    }
                ),
                "notes": "Smoke endorsement",
            }
        ).insert(ignore_permissions=True)
        created_docs.append(("AT Policy Endorsement", endorsement.name))

        endorsement_result = apply_endorsement(endorsement.name)
        endorsement.reload()
        policy.reload()

        endorsement_snapshot = None
        if endorsement.snapshot_record:
            endorsement_snapshot = frappe.get_doc("AT Policy Snapshot", endorsement.snapshot_record)
            created_docs.append(("AT Policy Snapshot", endorsement_snapshot.name))

        claim = frappe.get_doc(
            {
                "doctype": "AT Claim",
                "policy": policy.name,
                "customer": customer.name,
                "claim_type": "Damage",
                "claim_status": "Approved",
                "incident_date": nowdate(),
                "reported_date": nowdate(),
                "currency": "TRY",
                "estimated_amount": 600,
                "approved_amount": 400,
                "notes": "Smoke claim flow",
            }
        ).insert(ignore_permissions=True)
        created_docs.append(("AT Claim", claim.name))

        inbound_payment = frappe.get_doc(
            {
                "doctype": "AT Payment",
                "policy": policy.name,
                "customer": customer.name,
                "sales_entity": entity.name,
                "payment_direction": "Inbound",
                "payment_purpose": "Premium Collection",
                "status": "Paid",
                "payment_date": nowdate(),
                "currency": "TRY",
                "amount": 1000,
                "notes": "Smoke premium collection",
            }
        ).insert(ignore_permissions=True)
        created_docs.append(("AT Payment", inbound_payment.name))

        claim_payment = frappe.get_doc(
            {
                "doctype": "AT Payment",
                "policy": policy.name,
                "claim": claim.name,
                "customer": customer.name,
                "sales_entity": entity.name,
                "payment_direction": "Outbound",
                "payment_purpose": "Claim Payout",
                "status": "Paid",
                "payment_date": nowdate(),
                "currency": "TRY",
                "amount": 300,
                "notes": "Smoke claim payout",
            }
        ).insert(ignore_permissions=True)
        created_docs.append(("AT Payment", claim_payment.name))
        claim.reload()

        policy_notification_drafts = frappe.get_all(
            "AT Notification Draft",
            filters={
                "event_key": "policy_created",
                "reference_doctype": "AT Policy",
                "reference_name": policy.name,
            },
            fields=["name", "channel", "recipient", "status"],
            limit_page_length=10,
        )
        for row in policy_notification_drafts:
            created_docs.append(("AT Notification Draft", row.name))

        renewal_result = run_renewal_task_job()
        renewal_tasks = frappe.get_all(
            "AT Renewal Task",
            filters={"policy": policy.name},
            fields=["name", "status", "due_date", "renewal_date"],
            limit_page_length=5,
        )
        for row in renewal_tasks:
            created_docs.append(("AT Renewal Task", row.name))

        renewal_task_names = [row.name for row in renewal_tasks]
        renewal_notification_drafts = []
        if renewal_task_names:
            renewal_notification_drafts = frappe.get_all(
                "AT Notification Draft",
                filters={
                    "event_key": "renewal_due",
                    "reference_doctype": "AT Renewal Task",
                    "reference_name": ["in", renewal_task_names],
                },
                fields=["name", "channel", "recipient", "status", "reference_name"],
                limit_page_length=10,
            )
            for row in renewal_notification_drafts:
                created_docs.append(("AT Notification Draft", row.name))

        customer.reload()
        policy.reload()
        dashboard = get_dashboard_kpis({"months": 3})

        result["created"] = {
            "company": company.name,
            "branch": branch.name,
            "sales_entity": entity.name,
            "customer": customer.name,
            "customer_folder": customer.customer_folder,
            "lead": lead.name,
            "policy": policy.name,
            "policy_no": policy.policy_no,
            "commission_rate": policy.commission_rate,
            "gwp_try": policy.gwp_try,
            "offer": offer.name,
            "policy_current_version": policy.current_version,
            "baseline_snapshots": baseline_snapshots,
            "endorsement": {
                "name": endorsement.name,
                "status": endorsement.status,
                "snapshot_record": endorsement.snapshot_record,
                "result": endorsement_result,
                "snapshot_version": endorsement.snapshot_version,
            },
            "endorsement_snapshot": {
                "name": endorsement_snapshot.name if endorsement_snapshot else None,
                "snapshot_version": endorsement_snapshot.snapshot_version if endorsement_snapshot else None,
            },
            "claim": {
                "name": claim.name,
                "status": claim.claim_status,
                "approved_amount": claim.approved_amount,
                "paid_amount": claim.paid_amount,
            },
            "payments": {
                "inbound": inbound_payment.name,
                "outbound": claim_payment.name,
            },
            "renewal_job": renewal_result,
            "renewal_tasks": renewal_tasks,
            "policy_notification_drafts": policy_notification_drafts,
            "renewal_notification_drafts": renewal_notification_drafts,
            "dashboard": dashboard,
        }
        result["ok"] = True
        return result
    finally:
        for doctype, name in reversed(created_docs):
            if frappe.db.exists(doctype, name):
                frappe.delete_doc(doctype, name, ignore_permissions=True, force=True)
        frappe.db.commit()


@frappe.whitelist()
def inspect_at_doctype_modules() -> list[dict]:
    _assert_smoke_read_access()
    names = [
        "AT Sales Entity",
        "AT Customer",
        "AT Policy",
        "AT Insurance Company",
        "AT Branch",
        "AT Lead",
        "AT Offer",
        "AT Renewal Task",
        "AT Notification Template",
        "AT Notification Draft",
        "AT Policy Snapshot",
        "AT Policy Endorsement",
        "AT Claim",
        "AT Payment",
    ]
    return frappe.get_all(
        "DocType",
        filters={"name": ["in", names]},
        fields=["name", "module", "app", "custom"],
        order_by="name asc",
    )
