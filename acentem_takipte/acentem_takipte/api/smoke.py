from __future__ import annotations

from frappe.utils import add_days, now_datetime, nowdate

import frappe
import time

from acentem_takipte.acentem_takipte.api.security import (
    assert_authenticated,
    assert_doctype_permission,
    assert_non_production_or_feature_flag,
    assert_roles,
    audit_admin_action,
)
from acentem_takipte.acentem_takipte.doctype.at_lead.at_lead import convert_to_offer
from acentem_takipte.acentem_takipte.doctype.at_offer.at_offer import convert_to_policy
from acentem_takipte.acentem_takipte.doctype.at_policy_endorsement.at_policy_endorsement import (
    apply_endorsement,
)
# Moved local import inside run_backend_smoke_test to avoid circular dependency
from acentem_takipte.acentem_takipte.tasks import run_renewal_task_job
from acentem_takipte.acentem_takipte.utils.permissions import assert_mutation_access

SMOKE_ADMIN_ROLES = ("System Manager",)
SMOKE_MUTATION_DOCTYPES = (
    "AT Insurance Company",
    "AT Branch",
    "AT Sales Entity",
    "AT Customer",
    "AT Notification Template",
    "AT Lead",
    "AT Policy Endorsement",
    "AT Claim",
    "AT Payment",
    "AT Notification Draft",
    "AT Renewal Task",
)


def _assert_smoke_write_access() -> None:
    assert_non_production_or_feature_flag(
        "at_enable_demo_endpoints",
        "Backend smoke endpoint is disabled in production. Enable site_config 'at_enable_demo_endpoints' to allow it.",
    )
    assert_mutation_access(
        action="api.smoke.run_backend_smoke_test",
        roles=SMOKE_ADMIN_ROLES,
        doctype_permissions=SMOKE_MUTATION_DOCTYPES,
        permtype="create",
        role_message="Only System Manager can run backend smoke tests.",
        post_message="Only POST requests are allowed for backend smoke tests.",
    )
    for doctype in SMOKE_MUTATION_DOCTYPES:
        assert_doctype_permission(
            doctype,
            "delete",
            f"Missing delete permission for {doctype} during backend smoke cleanup.",
        )


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
    metrics = {}
    result = {
        "doctype_exists": doctype_exists,
        "created": {},
        "performance_metrics": metrics,
    }

    def _timed_run(key, func, *args, **kwargs):
        start = time.perf_counter()
        res = func(*args, **kwargs)
        end = time.perf_counter()
        metrics[key] = f"{((end - start) * 1000):.2f}ms"
        return res

    try:
        company = frappe.get_doc(
            {
                "doctype": "AT Insurance Company",
                "company_name": f"Smoke Company {marker}",
                "company_code": f"SMK-{marker[-6:]}",
            }
        ).insert()
        created_docs.append(("AT Insurance Company", company.name))

        branch = frappe.get_doc(
            {
                "doctype": "AT Branch",
                "branch_name": f"Smoke Branch {marker}",
                "branch_code": f"BR-{marker[-6:]}",
                "insurance_company": company.name,
            }
        ).insert()
        created_docs.append(("AT Branch", branch.name))

        entity = frappe.get_doc(
            {
                "doctype": "AT Sales Entity",
                "entity_type": "Agency",
                "full_name": f"Smoke Agency {marker}",
            }
        ).insert()
        created_docs.append(("AT Sales Entity", entity.name))

        customer = frappe.get_doc(
            {
                "doctype": "AT Customer",
                "tax_id": f"9{marker[-10:]}",
                "full_name": f"Smoke Customer {marker}",
                "phone": "5550000000",
            }
        ).insert()
        created_docs.append(("AT Customer", customer.name))

        policy_template = frappe.get_doc(
            {
                "doctype": "AT Notification Template",
                "template_key": f"smoke-policy-{marker}",
                "event_key": "policy_created",
                "channel": "SMS",
                "language": "en",
                "subject": "Your policy has been created: {{ policy_no }}",
                "body_template": "Dear {{ customer.full_name }}, your policy has been created.",
                "is_active": 1,
            }
        ).insert()
        created_docs.append(("AT Notification Template", policy_template.name))

        renewal_template = frappe.get_doc(
            {
                "doctype": "AT Notification Template",
                "template_key": f"smoke-renewal-{marker}",
                "event_key": "renewal_due",
                "channel": "SMS",
                "language": "en",
                "subject": "Your policy renewal is due",
                "body_template": "Dear {{ customer.full_name }}, the renewal date is {{ renewal_date }}.",
                "is_active": 1,
            }
        ).insert()
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
        ).insert()
        created_docs.append(("AT Lead", lead.name))

        offer_result = _timed_run("lead_to_offer_conversion", convert_to_offer, lead.name)
        offer_name = offer_result["offer"]
        offer = frappe.get_doc("AT Offer", offer_name)
        created_docs.append(("AT Offer", offer.name))

        policy_result = _timed_run(
            "offer_to_policy_conversion",
            convert_to_policy,
            offer_name=offer.name,
            start_date=nowdate(),
            end_date=add_days(nowdate(), 30),
            commission_amount=150,
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
                        "commission_amount": 175,
                    }
                ),
                "notes": "Smoke endorsement",
            }
        ).insert()
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
        ).insert()
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
        ).insert()
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
        ).insert()
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

        from acentem_takipte.acentem_takipte.api.dashboard import get_dashboard_kpis
        dashboard = _timed_run("dashboard_kpi_load", get_dashboard_kpis, {"months": 3})

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
                frappe.delete_doc(doctype, name, force=True)
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

