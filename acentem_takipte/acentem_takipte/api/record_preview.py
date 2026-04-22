from __future__ import annotations
import frappe
from frappe import _
from acentem_takipte.acentem_takipte.api.security import assert_authenticated

@frappe.whitelist()
def get_record_preview(doctype: str, name: str) -> dict:
    assert_authenticated()
    if not frappe.has_permission(doctype, "read"):
        frappe.throw(_("You do not have permission to read this record."), frappe.PermissionError)

    doc = frappe.get_doc(doctype, name)
    
    # Base summary
    preview = {
        "doctype": doctype,
        "name": name,
        "title": name,
        "subtitle": doctype,
        "fields": [],
        "metrics": []
    }

    if doctype == "AT Policy":
        preview["title"] = doc.policy_no or name
        preview["subtitle"] = f"{doc.insurance_company} - {doc.branch}"
        preview["fields"] = [
            {"label": _("Customer"), "value": doc.customer},
            {"label": _("Status"), "value": doc.status},
            {"label": _("Start Date"), "value": doc.start_date},
            {"label": _("End Date"), "value": doc.end_date},
        ]
        preview["metrics"] = [
            {"label": _("Gross Premium"), "value": doc.gross_premium, "currency": doc.currency}
        ]

    elif doctype == "AT Customer":
        preview["title"] = doc.full_name or name
        preview["subtitle"] = doc.tax_id or ""
        preview["fields"] = [
            {"label": _("Email"), "value": doc.email},
            {"label": _("Phone"), "value": doc.mobile_phone},
            {"label": _("Type"), "value": doc.customer_type},
        ]

    elif doctype == "AT Claim":
        preview["title"] = doc.claim_no or name
        preview["subtitle"] = f"{doc.insurance_company} - {doc.branch}"
        preview["fields"] = [
            {"label": _("Policy"), "value": doc.policy},
            {"label": _("Status"), "value": doc.claim_status},
            {"label": _("Reported Date"), "value": doc.reported_date},
        ]
        preview["metrics"] = [
            {"label": _("Estimated"), "value": doc.estimated_amount, "currency": "TRY"},
            {"label": _("Paid"), "value": doc.paid_amount, "currency": "TRY"},
        ]

    return preview
