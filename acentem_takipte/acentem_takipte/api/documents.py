from __future__ import annotations

import os
import re
import unicodedata
import posixpath
from urllib.parse import unquote, urlparse

import frappe
from frappe import _
from frappe.utils import nowdate


def _ascii_slug(value: str, default: str = "DOC", keep_case: bool = False) -> str:
    text = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-")
    if not text:
        return default
    return text if keep_case else text.upper()


def _upper_slug(value: str, default: str = "DIGER") -> str:
    ascii_text = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii")
    parts = [part for part in re.split(r"[^A-Za-z0-9]+", ascii_text) if part]
    if not parts:
        return default
    return "-".join(p.upper() for p in parts)


def _file_extension(file_doc) -> str:
    file_name = str(getattr(file_doc, "file_name", "") or "").strip()
    file_url = str(getattr(file_doc, "file_url", "") or "").strip()

    source_name = file_name
    if file_url:
        parsed = urlparse(file_url)
        from_url = unquote(posixpath.basename(parsed.path or "")).strip()
        if from_url:
            source_name = from_url

    if "." not in source_name:
        return "BIN"
    ext = source_name.rsplit(".", 1)[-1].strip().upper()
    return ext or "BIN"


def _resolve_reference_token(reference_doctype: str, reference_name: str) -> str:
    dt = str(reference_doctype or "").strip()
    dn = str(reference_name or "").strip()

    if dt == "AT Policy":
        policy_row = frappe.db.get_value(
            "AT Policy", dn, ["name", "policy_no"], as_dict=True
        ) or {}
        raw = str(policy_row.get("policy_no") or policy_row.get("name") or dn)
        return f"POL-{_ascii_slug(raw, 'POL')}"

    if dt == "AT Claim":
        claim_row = frappe.db.get_value(
            "AT Claim", dn, ["name", "claim_no"], as_dict=True
        ) or {}
        raw = str(claim_row.get("claim_no") or claim_row.get("name") or dn)
        return f"CLM-{_ascii_slug(raw, 'CLM')}"

    if dt == "AT Customer":
        customer_row = frappe.db.get_value(
            "AT Customer", dn, ["name", "customer_no", "tax_id"], as_dict=True
        ) or {}
        raw = str(
            customer_row.get("customer_no")
            or customer_row.get("name")
            or customer_row.get("tax_id")
            or dn
        )
        return f"CUS-{_ascii_slug(raw, 'CUS')}"

    return f"DOC-{_ascii_slug(dn or dt, 'DOC')}"


def _reserve_display_name(
    *,
    reference_doctype: str,
    reference_name: str,
    document_sub_type: str,
    upload_date: str,
    extension: str,
) -> dict:
    ref_token = _resolve_reference_token(reference_doctype, reference_name)
    subtype_token = _upper_slug(document_sub_type or "Diger", "DIGER")
    yyyymmdd = str(upload_date or nowdate()).replace("-", "")
    ext = str(extension or "bin").strip(".").upper() or "BIN"

    naming_key = f"{ref_token}|{subtype_token}|{yyyymmdd}|{ext}"
    lock_key = f"ATDOC-DISPLAY::{naming_key}"

    lock_row = frappe.db.sql("SELECT GET_LOCK(%s, 5)", (lock_key,)) or [[0]]
    lock_acquired = int(lock_row[0][0] or 0) == 1
    if not lock_acquired:
        frappe.throw(_("Document naming lock could not be acquired. Please retry."))

    try:
        for seq in range(1, 1001):
            candidate = f"{ref_token}_{subtype_token}_{yyyymmdd}_{str(seq).zfill(3)}.{ext}"
            if not frappe.db.exists("AT Document", {"display_name": candidate}):
                return {
                    "display_name": candidate,
                    "sequence_no": seq,
                    "naming_key": naming_key,
                }
    finally:
        frappe.db.sql("SELECT RELEASE_LOCK(%s)", (lock_key,))

    frappe.throw(_("Could not generate a unique document name. Please retry."))


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

    file_doc = frappe.get_doc("File", file_name)
    current_upload_date = nowdate()
    naming_identity = _reserve_display_name(
        reference_doctype=attached_to_doctype,
        reference_name=attached_to_name,
        document_sub_type=document_sub_type,
        upload_date=current_upload_date,
        extension=_file_extension(file_doc),
    )

    doc_data: dict = {
        "doctype": "AT Document",
        "file": file_name,
        "display_name": naming_identity["display_name"],
        "status": "Active",
        "upload_date": current_upload_date,
        "sequence_no": naming_identity["sequence_no"],
        "naming_key": naming_identity["naming_key"],
        "version_no": 1,
        "original_file_name": file_doc.file_name,
        "secondary_file_name": naming_identity["display_name"],
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

    # Rename the physical file and update File record (file_name + file_url).
    new_display_name = naming_identity["display_name"]
    old_file_url = str(file_doc.file_url or "")
    if old_file_url:
        # Determine directory portion of the URL path
        old_url_path = urlparse(old_file_url).path  # e.g. /private/files/foo.PDF
        url_dir = posixpath.dirname(old_url_path)   # e.g. /private/files
        new_file_url = posixpath.join(url_dir, new_display_name)  # /private/files/POL-...

        # Rename the actual file on disk
        site_path = frappe.get_site_path()
        old_abs = os.path.join(site_path, old_url_path.lstrip("/"))
        new_abs = os.path.join(site_path, new_file_url.lstrip("/"))
        if os.path.exists(old_abs) and old_abs != new_abs:
            os.rename(old_abs, new_abs)

        frappe.db.set_value(
            "File",
            file_doc.name,
            {"file_name": new_display_name, "file_url": new_file_url},
            update_modified=False,
        )
    else:
        frappe.db.set_value(
            "File",
            file_doc.name,
            "file_name",
            new_display_name,
            update_modified=False,
        )

    return {"at_document": at_doc.name}


@frappe.whitelist()
def get_document_context(doctype: str, docname: str) -> dict:
    """
    Return display info for a linked record (Policy, Claim, Customer)
    so the upload modal can show the record name + customer name.

    Args:
        doctype: AT Policy / AT Claim / AT Customer
        docname: Name of the record

    Returns:
        {"record_name": str, "customer_name": str | None, "customer_id": str | None}
    """
    if not doctype or not docname:
        return {"record_name": docname, "customer_name": None, "customer_id": None}

    record_name = docname
    customer_name = None
    customer_id = None

    if doctype == "AT Policy":
        row = frappe.db.get_value(
            "AT Policy", docname, ["name", "customer"], as_dict=True
        )
        if row:
            record_name = row.name
            if row.customer:
                customer_id = row.customer
                customer_name = frappe.db.get_value(
                    "AT Customer", row.customer, "full_name"
                ) or ""

    elif doctype == "AT Claim":
        row = frappe.db.get_value(
            "AT Claim", docname, ["name", "customer"], as_dict=True
        )
        if row:
            record_name = row.name
            if row.customer:
                customer_id = row.customer
                customer_name = frappe.db.get_value(
                    "AT Customer", row.customer, "full_name"
                ) or ""

    elif doctype == "AT Customer":
        row = frappe.db.get_value(
            "AT Customer", docname, ["name", "full_name", "tax_id"], as_dict=True
        )
        if row:
            record_name = row.full_name or row.name
            customer_id = row.tax_id or ""

    return {
        "record_name": record_name,
        "customer_name": customer_name,
        "customer_id": customer_id,
    }


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
