from __future__ import annotations

import frappe


def build_lead_detail_payload(
    lead,
    *,
    get_offer_link_preview_fn,
    get_policy_link_preview_fn,
    lead_detail_activity_events_fn,
    access_log_events_fn,
    sort_activity_events_fn,
    get_notification_draft_preview_rows_fn,
    get_notification_outbox_preview_rows_fn,
    get_payment_detail_preview_rows_fn,
    get_renewal_detail_preview_rows_fn,
) -> dict:
    related_offers = []
    related_policies = []
    if lead.customer:
        related_offers = frappe.get_list(
            "AT Offer",
            fields=["name", "status", "offer_date", "gross_premium", "currency", "modified"],
            filters={"customer": lead.customer},
            order_by="modified desc",
            limit_page_length=5,
        )
        related_policies = frappe.get_list(
            "AT Policy",
            fields=["name", "policy_no", "status", "end_date", "gross_premium", "currency", "modified"],
            filters={"customer": lead.customer},
            order_by="modified desc",
            limit_page_length=5,
        )

    linked_offer = get_offer_link_preview_fn(lead.converted_offer) if lead.converted_offer else None
    linked_policy = get_policy_link_preview_fn(lead.converted_policy) if lead.converted_policy else None
    reference_pairs = [("AT Lead", lead.name)]
    if lead.converted_offer:
        reference_pairs.append(("AT Offer", lead.converted_offer))
    if lead.converted_policy:
        reference_pairs.append(("AT Policy", lead.converted_policy))

    activity = lead_detail_activity_events_fn(lead)
    activity.extend(access_log_events_fn("AT Lead", lead.name))
    activity = sort_activity_events_fn(activity)

    return {
        "related_offers": related_offers,
        "related_policies": related_policies,
        "linked_offer": linked_offer,
        "linked_policy": linked_policy,
        "activity": activity[:12],
        "notification_drafts": get_notification_draft_preview_rows_fn(customer=lead.customer, references=reference_pairs, limit=5),
        "notification_outbox": get_notification_outbox_preview_rows_fn(customer=lead.customer, references=reference_pairs, limit=5),
        "payments": get_payment_detail_preview_rows_fn(customer=lead.customer, policy=lead.converted_policy, limit=5),
        "renewals": get_renewal_detail_preview_rows_fn(customer=lead.customer, policy=lead.converted_policy, limit=5),
    }
