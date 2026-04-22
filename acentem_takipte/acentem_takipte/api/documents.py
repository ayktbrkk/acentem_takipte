from __future__ import annotations

import os
import re
import unicodedata
import posixpath
from urllib.parse import unquote, urlparse

import frappe
from frappe import _
from frappe.utils import nowdate

from acentem_takipte.acentem_takipte.doctype.at_access_log.at_access_log import (
    log_decision_event,
)

# Whitelist: upload_document yalnızca bu DocType'lara bağlanabilir
_ALLOWED_REFERENCE_DOCTYPES = frozenset({"AT Policy", "AT Customer", "AT Claim", ""})

_DOCUMENT_KIND_CANONICAL_MAP = {
    "policy": "Policy",
    "police": "Policy",
    "endorsement": "Endorsement",
    "zeyilname": "Endorsement",
    "claim": "Claim",
    "hasar": "Claim",
    "other": "Other",
    "diger": "Other",
    "diğer": "Other",
}

_DOCUMENT_SUB_TYPE_CANONICAL_MAP = {
    "vehicle registration": "Vehicle Registration",
    "ruhsat": "Vehicle Registration",
    "id document": "ID Document",
    "kimlik": "ID Document",
    "policy copy": "Policy Copy",
    "police kopyasi": "Policy Copy",
    "poliçe kopyası": "Policy Copy",
    "damage photo": "Damage Photo",
    "hasar fotografi": "Damage Photo",
    "hasar fotoğrafı": "Damage Photo",
    "other": "Other",
    "diger": "Other",
    "diğer": "Other",
}

_LEGACY_SELECT_VALUES = {
    "document_kind": {
        "Policy": "Poliçe",
        "Endorsement": "Zeyilname",
        "Claim": "Hasar",
        "Other": "Diğer",
    },
    "document_sub_type": {
        "Vehicle Registration": "Ruhsat",
        "ID Document": "Kimlik",
        "Policy Copy": "Poliçe Kopyası",
        "Damage Photo": "Hasar Fotoğrafı",
        "Other": "Diğer",
    },
}


def _resolve_uploaded_file_name(file_name: str = "", file_url: str = "") -> str:
    """Resolve a File document name from upload_file outputs.

    upload_file response may provide either the File docname, file_url, or user-facing
    file_name depending on context/version. This helper normalizes those variants.
    """
    raw_name = str(file_name or "").strip()
    raw_url = str(file_url or "").strip()

    if raw_name and frappe.db.exists("File", raw_name):
        return raw_name

    def _lookup_by_url(url_value: str) -> str:
        if not url_value:
            return ""
        normalized = url_value
        if url_value.lower().startswith("http://") or url_value.lower().startswith("https://"):
            normalized = urlparse(url_value).path or ""
        normalized = str(normalized or "").strip()
        if not normalized:
            return ""
        return str(frappe.db.get_value("File", {"file_url": normalized}, "name") or "")

    # Prefer exact file_url lookup when provided.
    by_url = _lookup_by_url(raw_url) or _lookup_by_url(raw_name)
    if by_url:
        return by_url

    # Fallback: treat raw_name as File.file_name (human-readable). Prioritize current user.
    if raw_name:
        owner_filters = {"file_name": raw_name, "owner": frappe.session.user}
        owner_rows = frappe.get_all(
            "File",
            filters=owner_filters,
            fields=["name"],
            order_by="creation desc",
            limit_page_length=1,
        )
        if owner_rows:
            return str(owner_rows[0].name)

        any_rows = frappe.get_all(
            "File",
            filters={"file_name": raw_name},
            fields=["name"],
            order_by="creation desc",
            limit_page_length=1,
        )
        if any_rows:
            return str(any_rows[0].name)

    return ""


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


def _canonicalize_document_taxonomy(fieldname: str, value: str) -> str:
    raw_value = str(value or "").strip()
    if not raw_value:
        return ""

    normalized = raw_value.lower()
    if fieldname == "document_kind":
        return _DOCUMENT_KIND_CANONICAL_MAP.get(normalized, raw_value)
    if fieldname == "document_sub_type":
        return _DOCUMENT_SUB_TYPE_CANONICAL_MAP.get(normalized, raw_value)
    return raw_value


def _coerce_select_value_for_current_meta(fieldname: str, canonical_value: str) -> str:
    value = str(canonical_value or "").strip()
    if not value:
        return ""

    meta = frappe.get_meta("AT Document")
    field = meta.get_field(fieldname)
    options = {
        str(option).strip()
        for option in str(getattr(field, "options", "") or "").splitlines()
        if str(option).strip()
    }
    if not options or value in options:
        return value

    legacy_value = _LEGACY_SELECT_VALUES.get(fieldname, {}).get(value)
    if legacy_value and legacy_value in options:
        return legacy_value

    return value


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
            "AT Customer", dn, ["name", "tax_id"], as_dict=True
        ) or {}
        raw = str(
            customer_row.get("tax_id")
            or customer_row.get("name")
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


def _load_at_document(docname: str):
    docname = str(docname or "").strip()
    if not docname:
        frappe.throw(_("Document not found."), frappe.DoesNotExistError)
    return frappe.get_doc("AT Document", docname)


def _assert_at_document_write_access(doc) -> None:
    frappe.has_permission("AT Document", ptype="write", doc=doc, throw=True)


def _assert_at_document_delete_access(doc) -> None:
    if "System Manager" not in set(frappe.get_roles() or []):
        frappe.throw(_("You do not have permission to delete documents permanently."), frappe.PermissionError)
    frappe.has_permission("AT Document", ptype="delete", doc=doc, throw=True)


def _log_document_decision(doc, action: str, action_summary: str, decision_context: str | None = None) -> None:
    try:
        log_decision_event(
            "AT Document",
            doc.name,
            action=action,
            action_summary=action_summary,
            decision_context=decision_context,
        )
    except Exception:
        # Audit logging must never block the lifecycle operation.
        pass


@frappe.whitelist()
def archive_document(docname: str) -> dict:
    doc = _load_at_document(docname)
    _assert_at_document_write_access(doc)

    if str(doc.status or "").strip() == "Archived":
        return {"status": "success", "message": _("Document is already archived.")}

    doc.status = "Archived"
    doc.save(ignore_permissions=True)
    _log_document_decision(
        doc,
        action="Archive",
        action_summary=_("Document archived"),
        decision_context=_("Document status changed from Active to Archived."),
    )
    return {"status": "success", "message": _("Document archived.")}


@frappe.whitelist()
def restore_document(docname: str) -> dict:
    doc = _load_at_document(docname)
    _assert_at_document_write_access(doc)

    if str(doc.status or "").strip() == "Active":
        return {"status": "success", "message": _("Document is already active.")}

    doc.status = "Active"
    doc.save(ignore_permissions=True)
    _log_document_decision(
        doc,
        action="Restore",
        action_summary=_("Document restored"),
        decision_context=_("Document status changed from Archived to Active."),
    )
    return {"status": "success", "message": _("Document restored.")}


@frappe.whitelist()
def permanent_delete_document(docname: str) -> dict:
    doc = _load_at_document(docname)
    _assert_at_document_delete_access(doc)

    linked_file_name = str(doc.file or "").strip()
    linked_file_url = ""
    if linked_file_name and frappe.db.exists("File", linked_file_name):
        linked_file_url = str(frappe.db.get_value("File", linked_file_name, "file_url") or "").strip()
        frappe.db.set_value("AT Document", doc.name, "file", "", update_modified=False)

    at_document_name = doc.name
    frappe.delete_doc("AT Document", at_document_name, ignore_permissions=True)

    if linked_file_name and frappe.db.exists("File", linked_file_name):
        frappe.delete_doc("File", linked_file_name, ignore_permissions=True, force=True)

    _log_document_decision(
        doc,
        action="Delete",
        action_summary=_("Document permanently deleted"),
        decision_context=_(
            "File record and physical file removed permanently."
        )
        if linked_file_name
        else _("Document record removed permanently."),
    )
    return {
        "status": "success",
        "message": _("Document permanently deleted."),
        "deleted_file": linked_file_name,
        "deleted_file_url": linked_file_url,
    }


@frappe.whitelist()
def upload_document(
    file_name: str,
    file_url: str = "",
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
    # Güvenlik: yalnızca izin verilen DocType'lara bağlanabilir
    attached_to_doctype = str(attached_to_doctype or "").strip()
    attached_to_name = str(attached_to_name or "").strip()

    if attached_to_doctype not in _ALLOWED_REFERENCE_DOCTYPES:
        frappe.throw(
            _("Invalid reference doctype: {0}").format(attached_to_doctype),
            frappe.ValidationError,
        )

    # Validate/resolve the File record from docname, url or uploaded display name.
    resolved_file_name = _resolve_uploaded_file_name(file_name=file_name, file_url=file_url)
    if not resolved_file_name:
        frappe.throw(_("File not found: {0}").format(file_name), frappe.DoesNotExistError)

    file_doc = frappe.get_doc("File", resolved_file_name)
    canonical_document_kind = _canonicalize_document_taxonomy("document_kind", document_kind)
    canonical_document_sub_type = _canonicalize_document_taxonomy("document_sub_type", document_sub_type)
    stored_document_kind = _coerce_select_value_for_current_meta("document_kind", canonical_document_kind)
    stored_document_sub_type = _coerce_select_value_for_current_meta("document_sub_type", canonical_document_sub_type)
    current_upload_date = nowdate()
    naming_identity = _reserve_display_name(
        reference_doctype=attached_to_doctype,
        reference_name=attached_to_name,
        document_sub_type=canonical_document_sub_type,
        upload_date=current_upload_date,
        extension=_file_extension(file_doc),
    )

    doc_data: dict = {
        "doctype": "AT Document",
        "file": resolved_file_name,
        "display_name": naming_identity["display_name"],
        "status": "Active",
        "upload_date": current_upload_date,
        "sequence_no": naming_identity["sequence_no"],
        "naming_key": naming_identity["naming_key"],
        "version_no": 1,
        "original_file_name": file_doc.file_name,
        "secondary_file_name": naming_identity["display_name"],
    }

    if stored_document_kind:
        doc_data["document_kind"] = stored_document_kind
    if stored_document_sub_type:
        doc_data["document_sub_type"] = stored_document_sub_type
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

    can_create_at_document = bool(frappe.has_permission("AT Document", ptype="create"))
    allow_via_reference_write = False

    if not can_create_at_document and attached_to_doctype and attached_to_name:
        reference_doc = frappe.get_doc(attached_to_doctype, attached_to_name)
        allow_via_reference_write = bool(
            frappe.has_permission(attached_to_doctype, ptype="write", doc=reference_doc)
        )

    if not can_create_at_document and not allow_via_reference_write:
        frappe.throw(
            _("You are not allowed to create document metadata for this record."),
            frappe.PermissionError,
        )

    at_doc = frappe.get_doc(doc_data)
    at_doc.insert(ignore_permissions=allow_via_reference_write)

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
            customer_name = row.full_name or row.name
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

    if not doc.file:
        frappe.throw(_("AT Document has no linked file."))

    file_doc = frappe.get_doc("File", doc.file)

    warning = None
    if doc.is_sensitive:
        warning = _("This document is marked as sensitive. Sharing is not recommended.")
    if file_doc.is_private:
        private_warning = _("This file is private and requires authentication to access. Recipients may not be able to open the shared link.")
        warning = f"{warning}\n{private_warning}" if warning else private_warning
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


@frappe.whitelist()
def toggle_verified(docname: str) -> dict:
    """Toggle is_verified flag on an AT Document record.

    Returns:
        {"is_verified": int}
    """
    doc = frappe.get_doc("AT Document", docname)
    frappe.has_permission("AT Document", ptype="write", doc=doc, throw=True)
    doc.is_verified = 0 if doc.is_verified else 1
    doc.save(ignore_permissions=False)
    return {"is_verified": doc.is_verified}
