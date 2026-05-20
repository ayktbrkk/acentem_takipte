from __future__ import annotations

import frappe
from frappe.model.document import Document

from acentem_takipte.acentem_takipte.doctype import branch_permissions
from acentem_takipte.acentem_takipte.doctype.at_customer import at_customer as at_customer_permissions


SYSTEM_DOCUMENT_ROLES = {"AT System Manager", "System Manager"}
_LINKED_REFERENCE_DOCTYPES = ("AT Policy", "AT Customer", "AT Claim")


class ATDocument(Document):
    def before_insert(self):
        # The upload service owns display_name/sequence generation.
        # This fallback only runs when the value is still empty.
        if not self.display_name:
            self.display_name = _build_display_name(self)

    def before_save(self):
        # Recompute only when blank; users may edit the visible name.
        if not self.display_name:
            self.display_name = _build_display_name(self)


def _build_display_name(doc) -> str:
    """Build a readable fallback display name for AT Document.

    Fallback format: ``[SubType]_[YYYYMMDD]``
    The central upload API service owns sequence-safe naming.
    """
    from frappe.utils import getdate

    sub_type = (doc.document_sub_type or "").strip() or "Document"

    # Date source: document_date, creation, or today.
    date_val = doc.document_date or doc.creation or getdate()
    date_str = str(date_val).split(" ")[0].replace("-", "")
    return f"{sub_type}_{date_str}" if date_str else sub_type


def _doc_value(doc, fieldname: str) -> str:
    value = getattr(doc, fieldname, None)
    if value is None and hasattr(doc, "get"):
        value = doc.get(fieldname)
    return str(value or "").strip()


def _has_system_document_access(user: str | None = None) -> bool:
    user_id = user or frappe.session.user
    if user_id == "Administrator":
        return True
    roles = set(frappe.get_roles(user_id) or [])
    return bool(roles.intersection(SYSTEM_DOCUMENT_ROLES))


def _build_link_condition(fieldname: str, target_doctype: str, target_condition: str) -> str:
    target_field = f"`tabAT Document`.`{fieldname}`"
    if target_condition == "1=0":
        return ""
    if not target_condition:
        return f"coalesce({target_field}, '') != ''"
    return f"{target_field} in (select name from `tab{target_doctype}` where {target_condition})"


def _build_reference_condition(target_doctype: str, target_condition: str) -> str:
    escaped_doctype = frappe.db.escape(target_doctype)
    if target_condition == "1=0":
        return ""
    if not target_condition:
        return (
            f"(`tabAT Document`.`reference_doctype` = {escaped_doctype} "
            "and coalesce(`tabAT Document`.`reference_name`, '') != '')"
        )
    return (
        f"(`tabAT Document`.`reference_doctype` = {escaped_doctype} and "
        f"`tabAT Document`.`reference_name` in (select name from `tab{target_doctype}` where {target_condition}))"
    )


def _build_unlinked_owner_condition(user: str) -> str:
    escaped_user = frappe.db.escape(user)
    return (
        f"(`tabAT Document`.`owner` = {escaped_user} and "
        "coalesce(`tabAT Document`.`policy`, '') = '' and "
        "coalesce(`tabAT Document`.`customer`, '') = '' and "
        "coalesce(`tabAT Document`.`claim`, '') = '' and "
        "coalesce(`tabAT Document`.`reference_name`, '') = '')"
    )


def _linked_record_has_permission(doctype: str, docname: str, user: str, permission_type: str) -> bool:
    linked_name = str(docname or "").strip()
    if not linked_name:
        return False
    try:
        linked_doc = frappe.get_doc(doctype, linked_name)
    except Exception:
        return False
    try:
        return bool(frappe.has_permission(doctype, ptype=permission_type, doc=linked_doc, user=user))
    except TypeError:
        return bool(frappe.has_permission(doctype, ptype=permission_type, doc=linked_doc))
    except Exception:
        return False


def get_permission_query_conditions(user=None):
    user_id = user or frappe.session.user
    if _has_system_document_access(user_id):
        return ""

    policy_condition = branch_permissions.get_policy_permission_query_conditions(user=user_id)
    customer_condition = at_customer_permissions.get_permission_query_conditions(user=user_id)
    claim_condition = branch_permissions.get_claim_permission_query_conditions(user=user_id)

    conditions = [
        _build_link_condition("policy", "AT Policy", policy_condition),
        _build_link_condition("customer", "AT Customer", customer_condition),
        _build_link_condition("claim", "AT Claim", claim_condition),
        _build_reference_condition("AT Policy", policy_condition),
        _build_reference_condition("AT Customer", customer_condition),
        _build_reference_condition("AT Claim", claim_condition),
        _build_unlinked_owner_condition(user_id),
    ]
    conditions = [condition for condition in conditions if condition]
    return " or ".join(f"({condition})" for condition in conditions) if conditions else "1=0"


def has_permission(doc, user=None, permission_type="read"):
    user_id = user or frappe.session.user
    if _has_system_document_access(user_id):
        return True

    for doctype, fieldname in (("AT Policy", "policy"), ("AT Customer", "customer"), ("AT Claim", "claim")):
        if _linked_record_has_permission(doctype, _doc_value(doc, fieldname), user_id, permission_type):
            return True

    reference_doctype = _doc_value(doc, "reference_doctype")
    reference_name = _doc_value(doc, "reference_name")
    if reference_doctype in _LINKED_REFERENCE_DOCTYPES and _linked_record_has_permission(
        reference_doctype, reference_name, user_id, permission_type
    ):
        return True

    if not any(_doc_value(doc, fieldname) for fieldname in ("policy", "customer", "claim", "reference_name")):
        return _doc_value(doc, "owner") == str(user_id or "").strip()

    return False
