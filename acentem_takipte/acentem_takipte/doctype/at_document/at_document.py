from __future__ import annotations

import frappe
from frappe.model.document import Document


class ATDocument(Document):
    pass


@frappe.whitelist()
def toggle_verified(docname: str) -> dict:
    doc = frappe.get_doc("AT Document", docname)
    frappe.has_permission("AT Document", ptype="write", doc=doc, throw=True)
    doc.is_verified = 0 if doc.is_verified else 1
    doc.save(ignore_permissions=False)
    return {"is_verified": doc.is_verified}
