from __future__ import annotations

import frappe

from acentem_takipte.acentem_takipte.doctype.at_claim.at_claim import _get_paid_amount_totals


def execute():
    claims = frappe.get_all("AT Claim", fields=["name", "currency"], limit_page_length=0)
    for row in claims:
        totals = _get_paid_amount_totals(row.name, row.currency)
        frappe.db.set_value("AT Claim", row.name, "paid_amount", totals["paid_amount"], update_modified=False)
        frappe.db.set_value("AT Claim", row.name, "paid_amount_try", totals["paid_amount_try"], update_modified=False)

