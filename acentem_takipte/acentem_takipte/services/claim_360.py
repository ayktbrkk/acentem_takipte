import frappe
from frappe import _

@frappe.whitelist()
def get_claim_360_payload(name):
    """
    Returns a unified 360-degree payload for a claim, including documents, payments, and related records.
    Cached for 5 minutes.
    """
    if not name:
        return {}
    
    cache_key = f"at_claim_360:{name}"
    cached_data = frappe.cache().get_value(cache_key)
    if cached_data:
        return cached_data

    # 1. Fetch Claim Record
    claim = frappe.get_doc("AT Claim", name)
    
    # 2. Fetch AT Documents
    documents = frappe.get_all(
        "AT Document",
        fields=["name", "file", "display_name", "document_kind", "document_sub_type",
                "document_date", "notes", "status", "is_sensitive", "is_verified", "creation"],
        filters={"claim": name},
        order_by="creation desc",
        limit_page_length=50
    )
    
    # 3. Fetch Payments
    payments = frappe.get_all(
        "AT Payment",
        fields=["name", "payment_no", "payment_date", "amount", "amount_try", "status", "creation", "currency", "payment_direction"],
        filters={"claim": name},
        order_by="creation desc",
        limit_page_length=20
    )
    
    # 4. Fetch Linked Customer brief
    customer = {}
    if claim.customer:
        try:
            customer = frappe.get_doc("AT Customer", claim.customer).as_dict()
            # Mask sensitive info if needed, but for detail view we usually show it
        except frappe.DoesNotExistError:
            pass

    payload = {
        "claim": claim.as_dict(),
        "documents": documents,
        "payments": payments,
        "customer": customer,
        "metadata": {
            "last_cached": frappe.utils.now(),
            "ttl": 300
        }
    }
    
    frappe.cache().set_value(cache_key, payload, expires_in_sec=300)
    return payload

def invalidate_claim_360_cache(name):
    if not name:
        return
    frappe.cache().delete_value(f"at_claim_360:{name}")

def invalidate_claim_from_doc_event(doc, method=None):
    """
    Called from hooks.py for various doctypes that affect claim view.
    """
    if doc.doctype == "AT Claim":
        invalidate_claim_360_cache(doc.name)
    elif hasattr(doc, "claim") and doc.claim:
        invalidate_claim_360_cache(doc.claim)
    elif doc.doctype in ["AT Document", "AT Payment"] and doc.claim:
         invalidate_claim_360_cache(doc.claim)
    elif doc.doctype in ["Communication", "Comment"] and doc.reference_doctype == "AT Claim":
        invalidate_claim_360_cache(doc.reference_name)
