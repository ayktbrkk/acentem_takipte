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

    Format: ``{Sub Type} | {dosya_adı}``
    Sub Type yoksa sadece dosya adı döner.
    """
    # Bağlı File kaydından dosya adını çek
    file_name = ""
    if doc.file:
        file_name = frappe.db.get_value("File", doc.file, "file_name") or ""

    sub_type = (doc.document_sub_type or "").strip()

    if sub_type and file_name:
        return f"{sub_type} | {file_name}"
    if file_name:
        return file_name
    if sub_type:
        return sub_type
    return doc.name or ""  # fallback: autoname değeri


@frappe.whitelist()
def toggle_verified(docname: str) -> dict:
    doc = frappe.get_doc("AT Document", docname)
    frappe.has_permission("AT Document", ptype="write", doc=doc, throw=True)
    doc.is_verified = 0 if doc.is_verified else 1
    doc.save(ignore_permissions=False)
    return {"is_verified": doc.is_verified}
