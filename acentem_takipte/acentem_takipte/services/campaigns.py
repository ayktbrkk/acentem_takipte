from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint, now_datetime

from acentem_takipte.acentem_takipte import communication as communication_logic
from acentem_takipte.acentem_takipte.doctype.at_access_log.at_access_log import log_decision_event
from acentem_takipte.acentem_takipte.services.segments import build_segment_membership_preview
from acentem_takipte.acentem_takipte.utils.statuses import ATNotificationDraftStatus


def execute_campaign(campaign_name: str, *, limit: int = 200) -> dict[str, object]:
    campaign_name = str(campaign_name or "").strip()
    if not campaign_name:
        frappe.throw(_("Campaign is required."))

    campaign = frappe.get_doc("AT Campaign", campaign_name)
    if not campaign.template:
        frappe.throw(_("Campaign template is required."))

    template = frappe.get_doc("AT Notification Template", campaign.template)
    preview = build_segment_membership_preview(campaign.segment, limit=limit)

    created = 0
    skipped = 0
    drafts: list[str] = []

    campaign.status = "Running"
    campaign.save(ignore_permissions=True)

    for customer_row in preview.get("customers") or []:
        customer_name = str(customer_row.get("name") or "").strip()
        if not customer_name:
            skipped += 1
            continue

        customer = frappe.db.get_value(
            "AT Customer",
            customer_name,
            ["name", "phone", "email", "office_branch"],
            as_dict=True,
        )
        recipient = _resolve_campaign_recipient(campaign.channel, customer or {})
        if not recipient:
            skipped += 1
            continue

        draft = frappe.get_doc(
            {
                "doctype": "AT Notification Draft",
                "template": template.name,
                "event_key": template.event_key,
                "channel": campaign.channel,
                "language": template.language or "tr",
                "provider_template_name": getattr(template, "provider_template_name", None),
                "customer": customer_name,
                "office_branch": (customer or {}).get("office_branch") or campaign.office_branch,
                "recipient": recipient,
                "reference_doctype": "AT Campaign",
                "reference_name": campaign.name,
                "subject": template.subject or None,
                "body": template.get("body_template") or " ",
                "status": ATNotificationDraftStatus.DRAFT,
            }
        ).insert(ignore_permissions=True)

        communication_logic.enqueue_notification_draft(draft.name)
        drafts.append(draft.name)
        created += 1

    campaign.sent_count = created
    campaign.matched_customer_count = preview.get("summary", {}).get("matched_count", 0) or 0
    campaign.skipped_count = skipped
    campaign.last_run_on = now_datetime()
    campaign.last_run_summary = (
        f"Created drafts: {created} | "
        f"Skipped: {skipped} | "
        f"Matched customers: {campaign.matched_customer_count}"
    )
    campaign.status = "Completed" if created else "Cancelled"
    campaign.save(ignore_permissions=True)
    log_decision_event(
        "AT Campaign",
        campaign.name,
        action="Run",
        action_summary=f"Campaign executed via segment {campaign.segment}",
        decision_context=f"created={created};skipped={skipped};matched={campaign.matched_customer_count}",
    )
    if not frappe.flags.in_test:
        frappe.db.commit()

    return {
        "campaign": campaign.name,
        "created": created,
        "skipped": skipped,
        "matched_customers": campaign.matched_customer_count,
        "drafts": drafts,
    }


def execute_due_campaigns(*, limit: int = 25, member_limit: int = 200) -> dict[str, object]:
    safe_limit = max(cint(limit), 1)
    safe_member_limit = max(cint(member_limit), 1)
    due_campaigns = frappe.get_all(
        "AT Campaign",
        filters={
            "status": ["in", ["Planned", "Running"]],
            "scheduled_for": ["<=", now_datetime()],
        },
        fields=["name"],
        order_by="scheduled_for asc, modified asc",
        limit_page_length=safe_limit,
    )

    processed = 0
    created = 0
    skipped = 0
    campaigns: list[dict[str, object]] = []

    for row in due_campaigns:
        result = execute_campaign(str(row.get("name") or "").strip(), limit=safe_member_limit)
        processed += 1
        created += int(result.get("created") or 0)
        skipped += int(result.get("skipped") or 0)
        campaigns.append(
            {
                "campaign": result.get("campaign"),
                "created": int(result.get("created") or 0),
                "skipped": int(result.get("skipped") or 0),
                "matched_customers": int(result.get("matched_customers") or 0),
            }
        )

    return {
        "processed": processed,
        "created": created,
        "skipped": skipped,
        "campaigns": campaigns,
    }


def _resolve_campaign_recipient(channel: str | None, customer: dict[str, object]) -> str | None:
    normalized_channel = str(channel or "").strip().upper()
    if normalized_channel in {"SMS", "WHATSAPP", "PHONE CALL"}:
        return str(customer.get("phone") or "").strip() or None
    if normalized_channel == "EMAIL":
        return str(customer.get("email") or "").strip() or None
    return None
