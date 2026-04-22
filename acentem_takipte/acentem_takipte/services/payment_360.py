import frappe
from frappe import _
from frappe.utils import flt, getdate

def get_payment_360_payload(payment_name):
    """
    Aggregates payment data, installments, and linked documents for a 360-degree view.
    Includes caching for performance.
    """
    if not payment_name:
        return {}

    cache_key = f"at_payment_360:{payment_name}"
    cached_data = frappe.cache().get_value(cache_key)
    if cached_data:
        return cached_data

    # Fetch main payment record
    payment = frappe.get_doc("AT Payment", payment_name)
    
    # Fetch installments
    installments = frappe.get_all(
        "AT Payment Installment",
        filters={"payment": payment_name},
        fields=["*"],
        order_by="installment_no asc"
    )

    # Fetch associated documents (via AT Document)
    documents = frappe.get_all(
        "AT Document",
        filters={
            "reference_doctype": "AT Payment",
            "reference_name": payment_name,
            "is_archived": 0
        },
        fields=["*"],
        order_by="creation desc"
    )

    # Build payload
    payload = {
        "payment": payment.as_dict(),
        "installments": installments,
        "documents": documents,
        "metadata": {
            "is_claim_payment": bool(payment.claim),
            "is_policy_payment": bool(payment.policy),
            "total_installments": len(installments),
            "paid_installments": len([i for i in installments if i.status == "Paid"])
        }
    }

    # Cache for 5 minutes
    frappe.cache().set_value(cache_key, payload, expires_in_sec=300)
    
    return payload

def invalidate_payment_360_cache(payment_name):
    if not payment_name:
        return
    frappe.cache().delete_value(f"at_payment_360:{payment_name}")

def invalidate_payment_from_doc_event(doc, method=None):
    """Bridge for hooks.py to invalidate payment cache from related documents."""
    if doc.doctype == "AT Payment":
        invalidate_payment_360_cache(doc.name)
        return

    payment_name = doc.get("payment") or (
        doc.get("reference_name") if doc.get("reference_doctype") == "AT Payment" else None
    )
    if payment_name:
        invalidate_payment_360_cache(payment_name)
