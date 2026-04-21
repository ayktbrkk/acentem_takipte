from __future__ import annotations

import frappe
from frappe import _


@frappe.whitelist()
def upload_document(
    file_name: str,
    attached_to_doctype: str = "",
    attached_to_name: str = "",
    document_kind: str = "",
    document_sub_type: str = "",
    document_date: str = "",
    notes: str = "",
    is_private: int = 1,
    is_sensitive: int = 0,
    is_verified: int = 0,
) -> dict:
    """
    Upload a document and create an AT Document metadata record.

    Expects the file to already be uploaded via Frappe's native
    /api/method/upload_file endpoint. This endpoint creates the
    AT Document metadata record linked to the uploaded File.

    Args:
        file_name: Name (ID) of the File record created by upload_file.
        attached_to_doctype: DocType the file belongs to.
        attached_to_name: Name of the record the file belongs to.
        document_kind: One of Policy / Endorsement / Claim / Other.
        document_date: ISO date string (YYYY-MM-DD), optional.
        notes: Free-text notes.
        is_private: 1 = private, 0 = public. Mirrors the File record.

    Returns:
        {"at_document": <name of created AT Document record>}
    """
    # Validate the File record exists and caller has read permission
    if not frappe.db.exists("File", file_name):
        frappe.throw(_("File not found: {0}").format(file_name), frappe.DoesNotExistError)

    doc_data: dict = {
        "doctype": "AT Document",
        "file": file_name,
        "status": "Active",
        "version_no": 1,
    }

    if document_kind:
        doc_data["document_kind"] = document_kind
    if document_sub_type:
        doc_data["document_sub_type"] = document_sub_type
    if document_date:
        doc_data["document_date"] = document_date
    if notes:
        doc_data["notes"] = notes
    if is_sensitive:
        doc_data["is_sensitive"] = 1
    if is_verified:
        doc_data["is_verified"] = 1

    # Wire reference fields
    if attached_to_doctype and attached_to_name:
        doc_data["reference_doctype"] = attached_to_doctype
        doc_data["reference_name"] = attached_to_name

        if attached_to_doctype == "AT Policy":
            doc_data["policy"] = attached_to_name
            # Resolve customer from policy
            customer = frappe.db.get_value("AT Policy", attached_to_name, "customer")
            if customer:
                doc_data["customer"] = customer

        elif attached_to_doctype == "AT Claim":
            doc_data["claim"] = attached_to_name
            # Resolve policy and customer from claim
            claim_fields = frappe.db.get_value(
                "AT Claim", attached_to_name, ["policy", "customer"], as_dict=True
            )
            if claim_fields:
                if claim_fields.get("policy"):
                    doc_data["policy"] = claim_fields["policy"]
                if claim_fields.get("customer"):
                    doc_data["customer"] = claim_fields["customer"]

        elif attached_to_doctype == "AT Customer":
            doc_data["customer"] = attached_to_name

    at_doc = frappe.get_doc(doc_data)
    at_doc.insert(ignore_permissions=False)

    return {"at_document": at_doc.name}


@frappe.whitelist()
def share_document(docname: str, method: str = "whatsapp") -> dict:
    """
    Return a shareable URL for an AT Document record.

    For WhatsApp, returns a wa.me deep-link pre-filled with the file URL.
    If the document is marked is_sensitive, a warning is included but the
    link is still returned — the final decision rests with the user.

    Args:
        docname: Name of the AT Document record.
        method:  "whatsapp" (default) or "url".

    Returns:
        {"url": str, "phone": str, "warning": str|None}
    """
    doc = frappe.get_doc("AT Document", docname)
    frappe.has_permission("AT Document", ptype="read", doc=doc, throw=True)

    warning = None
    if doc.is_sensitive:
        warning = _("This document is marked as sensitive. Sharing is not recommended.")

    if not doc.file:
        frappe.throw(_("AT Document has no linked file."))

    file_doc = frappe.get_doc("File", doc.file)
    file_url = frappe.utils.get_url(file_doc.file_url)

    phone = ""
    if doc.customer:
        phone = frappe.db.get_value("AT Customer", doc.customer, "mobile_no") or ""
    # Normalise: strip non-digit chars (spaces, dashes, parens) for wa.me
    phone_digits = "".join(c for c in phone if c.isdigit() or c == "+")

    if method == "whatsapp":
        import urllib.parse
        wa_url = f"https://wa.me/{phone_digits}?text={urllib.parse.quote(file_url, safe='')}"
        return {"url": wa_url, "phone": phone_digits, "warning": warning}

    return {"url": file_url, "phone": phone_digits, "warning": warning}
