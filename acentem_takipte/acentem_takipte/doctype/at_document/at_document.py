from __future__ import annotations

import frappe
from frappe.model.document import Document


class ATDocument(Document):
    def before_insert(self):
        # Merkezi upload servisi display_name/sequence üretir.
        # Fallback olarak yalnızca boşsa hesapla.
        if not self.display_name:
            self.display_name = _build_display_name(self)

    def before_save(self):
        # Yalnızca display_name boşsa yeniden hesapla (kullanıcı düzenlemiş olabilir)
        if not self.display_name:
            self.display_name = _build_display_name(self)


def _build_display_name(doc) -> str:
    """AT Document için okunabilir görünen ad üretir.

    Fallback format: ``[SubType]_[YYYYMMDD]``
    Not: Merkezi ve sequence-safe isimlendirme upload API servisinde yapılır.
    """
    from frappe.utils import getdate

    sub_type = (doc.document_sub_type or "").strip() or "Document"

    # Tarih (creation ya da document_date)
    date_val = doc.document_date or doc.creation or getdate()
    date_str = str(date_val).split(" ")[0].replace("-", "")
    return f"{sub_type}_{date_str}" if date_str else sub_type


@frappe.whitelist()
def toggle_verified(docname: str) -> dict:
    doc = frappe.get_doc("AT Document", docname)
    frappe.has_permission("AT Document", ptype="write", doc=doc, throw=True)
    doc.is_verified = 0 if doc.is_verified else 1
    doc.save(ignore_permissions=False)
    return {"is_verified": doc.is_verified}
