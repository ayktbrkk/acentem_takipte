from __future__ import annotations

import frappe
from frappe.utils import cint


def _get_notification_draft_preview_rows(
    *,
    customer: str | None,
    references: list[tuple[str, str]] | None,
    limit: int = 5,
) -> list[dict]:
    if not frappe.has_permission("AT Notification Draft", "read"):
        return []
    return _collect_notification_preview_rows(
        doctype="AT Notification Draft",
        fields=[
            "name",
            "status",
            "channel",
            "recipient",
            "customer",
            "reference_doctype",
            "reference_name",
            "modified",
        ],
        customer=customer,
        references=references,
        limit=limit,
    )


def _get_notification_outbox_preview_rows(
    *,
    customer: str | None,
    references: list[tuple[str, str]] | None,
    limit: int = 5,
) -> list[dict]:
    if not frappe.has_permission("AT Notification Outbox", "read"):
        return []
    return _collect_notification_preview_rows(
        doctype="AT Notification Outbox",
        fields=[
            "name",
            "status",
            "channel",
            "recipient",
            "customer",
            "reference_doctype",
            "reference_name",
            "modified",
        ],
        customer=customer,
        references=references,
        limit=limit,
    )


def _collect_notification_preview_rows(
    *,
    doctype: str,
    fields: list[str],
    customer: str | None,
    references: list[tuple[str, str]] | None,
    limit: int,
) -> list[dict]:
    rows_by_name: dict[str, dict] = {}

    def add_rows(new_rows: list[dict]):
        for row in new_rows or []:
            name = str(row.get("name") or "").strip()
            if not name or name in rows_by_name:
                continue
            rows_by_name[name] = row

    if customer:
        add_rows(
            frappe.get_list(
                doctype,
                fields=fields,
                filters={"customer": customer},
                order_by="modified desc",
                limit_page_length=max(cint(limit), 1),
            )
        )

    for reference_doctype, reference_name in references or []:
        if not reference_doctype or not reference_name:
            continue
        add_rows(
            frappe.get_list(
                doctype,
                fields=fields,
                filters={
                    "reference_doctype": reference_doctype,
                    "reference_name": reference_name,
                },
                order_by="modified desc",
                limit_page_length=max(cint(limit), 1),
            )
        )

    rows = list(rows_by_name.values())
    rows.sort(key=lambda row: str(row.get("modified") or ""), reverse=True)
    return rows[: max(cint(limit), 1)]


def _get_payment_detail_preview_rows(
    *, customer: str | None, policy: str | None, limit: int = 5
) -> list[dict]:
    if not frappe.has_permission("AT Payment", "read"):
        return []
    filters = []
    if customer:
        filters.append(["customer", "=", customer])
    if policy:
        filters.append(["policy", "=", policy])
    if not filters:
        return []
    if len(filters) == 1:
        return frappe.get_list(
            "AT Payment",
            fields=[
                "name",
                "payment_no",
                "status",
                "payment_direction",
                "payment_date",
                "amount_try",
                "customer",
                "policy",
            ],
            filters={filters[0][0]: filters[0][2]},
            order_by="modified desc",
            limit_page_length=max(cint(limit), 1),
        )
    return frappe.get_list(
        "AT Payment",
        fields=[
            "name",
            "payment_no",
            "status",
            "payment_direction",
            "payment_date",
            "amount_try",
            "customer",
            "policy",
        ],
        or_filters=[["AT Payment", f[0], f[1], f[2]] for f in filters],
        order_by="modified desc",
        limit_page_length=max(cint(limit), 1),
    )


def _get_renewal_detail_preview_rows(
    *, customer: str | None, policy: str | None, limit: int = 5
) -> list[dict]:
    if not frappe.has_permission("AT Renewal Task", "read"):
        return []
    filters = []
    if customer:
        filters.append(["customer", "=", customer])
    if policy:
        filters.append(["policy", "=", policy])
    if not filters:
        return []
    if len(filters) == 1:
        return frappe.get_list(
            "AT Renewal Task",
            fields=[
                "name",
                "policy",
                "status",
                "due_date",
                "renewal_date",
                "customer",
                "assigned_to",
            ],
            filters={filters[0][0]: filters[0][2]},
            order_by="due_date asc",
            limit_page_length=max(cint(limit), 1),
        )
    return frappe.get_list(
        "AT Renewal Task",
        fields=[
            "name",
            "policy",
            "status",
            "due_date",
            "renewal_date",
            "customer",
            "assigned_to",
        ],
        or_filters=[["AT Renewal Task", f[0], f[1], f[2]] for f in filters],
        order_by="due_date asc",
        limit_page_length=max(cint(limit), 1),
    )


def _get_offer_link_preview(name: str | None) -> dict | None:
    name = str(name or "").strip()
    if not name:
        return None
    row = frappe.db.get_value(
        "AT Offer",
        name,
        ["name", "status", "offer_date", "gross_premium", "currency"],
        as_dict=True,
    )
    return dict(row) if row else None


def _get_policy_link_preview(name: str | None) -> dict | None:
    name = str(name or "").strip()
    if not name:
        return None
    row = frappe.db.get_value(
        "AT Policy",
        name,
        ["name", "policy_no", "status", "end_date", "gross_premium", "currency"],
        as_dict=True,
    )
    return dict(row) if row else None


def _get_lead_link_preview(name: str | None) -> dict | None:
    name = str(name or "").strip()
    if not name:
        return None
    row = frappe.db.get_value(
        "AT Lead",
        name,
        ["name", "first_name", "last_name", "status", "email", "modified"],
        as_dict=True,
    )
    if not row:
        return None
    row = dict(row)
    row["display_name"] = (
        " ".join(
            part for part in [row.get("first_name"), row.get("last_name")] if part
        ).strip()
        or row["name"]
    )
    return row

