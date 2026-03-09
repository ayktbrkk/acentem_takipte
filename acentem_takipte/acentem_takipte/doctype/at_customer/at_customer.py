from __future__ import annotations

from pathlib import Path

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, nowdate

from acentem_takipte.acentem_takipte.doctype.branch_permissions import (
    build_office_branch_permission_query,
    has_office_branch_permission,
)
from acentem_takipte.acentem_takipte.doctype.at_access_log.at_access_log import log_access
from acentem_takipte.acentem_takipte.services.branches import user_can_access_all_office_branches
from acentem_takipte.acentem_takipte.utils.logging import log_redacted_error

SENSITIVE_ROLES = {"System Manager", "Manager", "Accountant"}


class ATCustomer(Document):
    def validate(self):
        self.tax_id = (self.tax_id or "").strip().replace(" ", "")
        if not self.tax_id:
            frappe.throw(_("Tax ID is required."))
        if not self.tax_id.isdigit() or len(self.tax_id) not in {10, 11}:
            frappe.throw(_("Tax ID must contain only digits and be 10 or 11 characters long."))

        self.full_name = (self.full_name or "").strip()
        if not self.full_name:
            frappe.throw(_("Full Name is required."))

        self.phone = (self.phone or "").strip()
        self.email = (self.email or "").strip()

        if self.birth_date and getdate(self.birth_date) > getdate(nowdate()):
            frappe.throw(_("Birth Date cannot be in the future."))

        self.masked_tax_id = mask_tax_id(self.tax_id)
        self.masked_phone = mask_phone(self.phone)

        if not self.assigned_agent and frappe.session.user not in {"Guest", "Administrator"}:
            self.assigned_agent = frappe.session.user

    def after_insert(self):
        self.ensure_private_folder()

    def onload(self):
        self.set_onload("masked_tax_id", mask_tax_id(self.tax_id))
        self.set_onload("masked_phone", mask_phone(self.phone))
        self.set_onload("can_view_sensitive", has_sensitive_access())
        try:
            log_access(reference_doctype=self.doctype, reference_name=self.name, action="View")
        except Exception:
            log_redacted_error("AT Customer Access Log Error", details={"customer": self.name})

    def ensure_private_folder(self):
        # Keep a stable relative path for file linking across environments.
        relative_folder = f"/private/files/customers/{self.name}"
        folder_path = Path(frappe.get_site_path("private", "files", "customers", self.name))
        folder_path.mkdir(parents=True, exist_ok=True)
        _ensure_file_folder_tree(self.name)
        self.db_set("customer_folder", relative_folder, update_modified=False)


def _ensure_file_folder_tree(customer_name: str) -> None:
    _ensure_folder(name="customers", folder="Home")
    _ensure_folder(name=customer_name, folder="Home/customers")


def _ensure_folder(name: str, folder: str) -> None:
    if frappe.db.exists("File", {"file_name": name, "is_folder": 1, "folder": folder}):
        return

    frappe.get_doc(
        {
            "doctype": "File",
            "file_name": name,
            "is_folder": 1,
            "folder": folder,
            "is_private": 1,
        }
    ).insert(ignore_permissions=True)


def get_permission_query_conditions(user=None):
    user = user or frappe.session.user
    if _can_access_all_customers(user):
        return ""

    roles = set(frappe.get_roles(user))
    branch_condition = build_office_branch_permission_query("AT Customer", user=user)
    if "Agent" in roles:
        escaped_user = frappe.db.escape(user)
        agent_condition = f"(`tabAT Customer`.`assigned_agent` = {escaped_user} OR `tabAT Customer`.`owner` = {escaped_user})"
        if branch_condition == "1=0":
            return "1=0"
        if branch_condition:
            return f"({agent_condition} AND {branch_condition})"
        return agent_condition

    return branch_condition or "1=0"


def has_permission(doc, user=None, permission_type="read"):
    user = user or frappe.session.user
    if _can_access_all_customers(user):
        return True

    roles = set(frappe.get_roles(user))
    if "Agent" in roles:
        return (doc.assigned_agent == user or doc.owner == user) and has_office_branch_permission(doc, user=user)

    return has_office_branch_permission(doc, user=user)


def has_sensitive_access(user=None) -> bool:
    user = user or frappe.session.user
    if user == "Administrator":
        return True

    roles = set(frappe.get_roles(user))
    return bool(roles.intersection(SENSITIVE_ROLES))


def mask_tax_id(value: str | None) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""
    if len(raw) <= 4:
        return "*" * len(raw)
    return f"{raw[:2]}{'*' * (len(raw) - 4)}{raw[-2:]}"


def mask_phone(value: str | None) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""
    if len(raw) <= 4:
        return "*" * len(raw)
    return f"{raw[:3]}{'*' * (len(raw) - 5)}{raw[-2:]}"


def _can_access_all_customers(user: str) -> bool:
    return user_can_access_all_office_branches(user)
