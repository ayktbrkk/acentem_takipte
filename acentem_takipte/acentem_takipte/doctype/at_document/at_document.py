from __future__ import annotations

import frappe
from frappe.model.document import Document


class ATDocument(Document):
    def before_insert(self):
        self.display_name = _build_display_name(self)

    def before_save(self):
        # Yalnızca display_name boşsa yeniden hesapla (kullanıcı düzenlemiş olabilir)
        if not self.display_name:
            self.display_name = _build_display_name(self)


def _build_display_name(doc) -> str:
    """AT Document için okunabilir görünen ad üretir.

    Format: ``[SubType]_[CustomerName]_[Date]``
    Eksik alanlar varsa fallback yapılır.
    """
    from frappe.utils import getdate
    
    sub_type = (doc.document_sub_type or "").strip() or "Document"
    
    # Müşteri adını çek (direct müşteri veya poliçe/hasar üzerinden)
    customer_name = ""
    if doc.customer:
        customer_name = frappe.db.get_value("AT Customer", doc.customer, "full_name") or ""
    elif doc.policy:
        policy_customer = frappe.db.get_value("AT Policy", doc.policy, "customer")
        if policy_customer:
            customer_name = frappe.db.get_value("AT Customer", policy_customer, "full_name") or ""
    elif doc.claim:
        claim_customer = frappe.db.get_value("AT Claim", doc.claim, "customer")
        if claim_customer:
            customer_name = frappe.db.get_value("AT Customer", claim_customer, "full_name") or ""
    
    customer_name = (customer_name or "").replace(" ", "_").replace("-", "_")
    
    # Tarih (creation ya da document_date)
    date_val = doc.document_date or doc.creation or getdate()
    date_str = str(date_val).split(" ")[0]  # YYYY-MM-DD
    
    # Format: [SubType]_[CustomerName]_[Date]
    if customer_name and date_str:
        return f"{sub_type}_{customer_name}_{date_str}"
    elif customer_name:
        return f"{sub_type}_{customer_name}"
    elif date_str:
        return f"{sub_type}_{date_str}"
    else:
        return sub_type


@frappe.whitelist()
def toggle_verified(docname: str) -> dict:
    doc = frappe.get_doc("AT Document", docname)
    frappe.has_permission("AT Document", ptype="write", doc=doc, throw=True)
    doc.is_verified = 0 if doc.is_verified else 1
    doc.save(ignore_permissions=False)
    return {"is_verified": doc.is_verified}
