from __future__ import annotations

import frappe


def build_offer_detail_payload(
    offer,
    *,
    get_lead_link_preview_fn,
    get_policy_link_preview_fn,
    offer_detail_activity_events_fn,
    access_log_events_fn,
    sort_activity_events_fn,
    get_notification_draft_preview_rows_fn,
    get_notification_outbox_preview_rows_fn,
    get_payment_detail_preview_rows_fn,
    get_renewal_detail_preview_rows_fn,
) -> dict:
    related_offers = []
    related_policies = []
    if offer.customer:
        related_offers = frappe.get_list(
            "AT Offer",
            fields=["name", "status", "offer_date", "gross_premium", "currency", "modified"],
            filters=[["customer", "=", offer.customer], ["name", "!=", offer.name]],
            order_by="modified desc",
            limit_page_length=5,
        )
        related_policies = frappe.get_list(
            "AT Policy",
            fields=["name", "policy_no", "status", "end_date", "gross_premium", "currency", "modified"],
            filters={"customer": offer.customer},
            order_by="modified desc",
            limit_page_length=5,
        )

    source_lead = get_lead_link_preview_fn(offer.source_lead) if offer.source_lead else None
    linked_policy = get_policy_link_preview_fn(offer.converted_policy) if offer.converted_policy else None
    reference_pairs = [("AT Offer", offer.name)]
    if offer.source_lead:
        reference_pairs.append(("AT Lead", offer.source_lead))
    if offer.converted_policy:
        reference_pairs.append(("AT Policy", offer.converted_policy))

    activity = offer_detail_activity_events_fn(offer)
    activity.extend(access_log_events_fn("AT Offer", offer.name))
    activity = sort_activity_events_fn(activity)

    return {
        "related_offers": related_offers,
        "related_policies": related_policies,
        "source_lead": source_lead,
        "linked_policy": linked_policy,
        "activity": activity[:12],
        "notification_drafts": get_notification_draft_preview_rows_fn(customer=offer.customer, references=reference_pairs, limit=5),
        "notification_outbox": get_notification_outbox_preview_rows_fn(customer=offer.customer, references=reference_pairs, limit=5),
        "payments": get_payment_detail_preview_rows_fn(customer=offer.customer, policy=offer.converted_policy, limit=5),
        "renewals": get_renewal_detail_preview_rows_fn(customer=offer.customer, policy=offer.converted_policy, limit=5),
    }
