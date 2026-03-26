from __future__ import annotations

from pathlib import Path

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.naming import make_autoname
from frappe.utils import getdate, nowdate

from acentem_takipte.acentem_takipte.doctype.at_access_log.at_access_log import (
    log_access,
)
from acentem_takipte.acentem_takipte.doctype.branch_permissions import (
    build_office_branch_permission_query,
    has_office_branch_permission,
)
from acentem_takipte.acentem_takipte.services.branches import (
    user_can_access_all_office_branches,
)
from acentem_takipte.acentem_takipte.utils.logging import log_redacted_error

SENSITIVE_ROLES = {"System Manager", "Manager", "Accountant"}
CUSTOMER_TYPES = {"Individual", "Corporate"}


class ATCustomer(Document):
    def autoname(self):
        if self.name:
            return
        self.name = make_autoname("AT-CUST-.YYYY.-.######")

    def validate(self):
        self.customer_type = normalize_customer_type(self.customer_type, self.tax_id)
        self.tax_id = normalize_identity_number(self.tax_id)
        if not self.tax_id:
            frappe.throw(_("Identity Number is required."))

        validate_customer_identity(self.tax_id, self.customer_type)

        self.full_name = (self.full_name or "").strip()
        if not self.full_name:
            frappe.throw(_("Full Name is required."))

        self.phone = (self.phone or "").strip()
        self.email = (self.email or "").strip()
        self.occupation = (self.occupation or "").strip() or None

        if self.customer_type == "Corporate":
            self.birth_date = None
            self.gender = "Unknown"
            self.marital_status = "Unknown"
            self.occupation = None
        elif self.birth_date and getdate(self.birth_date) > getdate(nowdate()):
            frappe.throw(_("Birth Date cannot be in the future."))

        self.masked_tax_id = mask_tax_id(self.tax_id)
        self.masked_phone = mask_phone(self.phone)

        if not self.assigned_agent and frappe.session.user not in {
            "Guest",
            "Administrator",
        }:
            self.assigned_agent = frappe.session.user

    def after_insert(self):
        self.ensure_private_folder()

    def after_rename(self, old, new, merge=False):
        old_name = str(old or "").strip()
        new_name = str(new or "").strip()
        if not old_name or not new_name or old_name == new_name:
            return
        _rename_private_customer_folder(old_name, new_name)
        _rename_file_folder_tree(old_name, new_name)
        self.ensure_private_folder()

    def onload(self):
        self.set_onload("masked_tax_id", mask_tax_id(self.tax_id))
        self.set_onload("masked_phone", mask_phone(self.phone))
        self.set_onload("can_view_sensitive", has_sensitive_access())
        try:
            log_access(
                reference_doctype=self.doctype, reference_name=self.name, action="View"
            )
        except Exception:
            log_redacted_error(
                "AT Customer Access Log Error", details={"customer": self.name}
            )

    def ensure_private_folder(self):
        relative_folder = f"/private/files/customers/{self.name}"
        folder_path = Path(
            frappe.get_site_path("private", "files", "customers", self.name)
        )
        folder_path.mkdir(parents=True, exist_ok=True)
        _ensure_file_folder_tree(self.name)
        self.db_set("customer_folder", relative_folder, update_modified=False)


def normalize_customer_type(value: str | None, tax_id: str | None = None) -> str:
    normalized = str(value or "").strip()
    if normalized in CUSTOMER_TYPES:
        return normalized
    return infer_customer_type_from_tax_id(tax_id)


def infer_customer_type_from_tax_id(tax_id: str | None) -> str:
    if len(normalize_identity_number(tax_id)) == 10:
        return "Corporate"
    return "Individual"


def normalize_identity_number(value: str | None) -> str:
    return "".join(char for char in str(value or "").strip() if char.isdigit())


def validate_customer_identity(identity_number: str, customer_type: str) -> None:
    if not identity_number.isdigit():
        frappe.throw(_("Identity Number must contain only digits."))

    if customer_type == "Corporate":
        if len(identity_number) != 10:
            frappe.throw(_("Tax Number must be 10 digits long."))
        return

    if len(identity_number) != 11:
        frappe.throw(_("T.C. Identity Number must be 11 digits long."))
    if not is_valid_tckn(identity_number):
        frappe.throw(_("Please enter a valid T.C. Identity Number."))


def is_valid_tckn(value: str) -> bool:
    raw = normalize_identity_number(value)
    if len(raw) != 11 or raw[0] == "0":
        return False

    digits = [int(char) for char in raw]
    tenth = ((sum(digits[0:9:2]) * 7) - sum(digits[1:8:2])) % 10
    eleventh = sum(digits[:10]) % 10
    return digits[9] == tenth and digits[10] == eleventh


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
        # ignore_permissions: Internal folder creation for customer file attachments; not user-facing mutation.
    ).insert(ignore_permissions=True)


def _rename_private_customer_folder(old_name: str, new_name: str) -> None:
    old_path = Path(frappe.get_site_path("private", "files", "customers", old_name))
    new_path = Path(frappe.get_site_path("private", "files", "customers", new_name))
    if old_path.exists() and old_path != new_path and not new_path.exists():
        old_path.rename(new_path)
    else:
        new_path.mkdir(parents=True, exist_ok=True)


def _rename_file_folder_tree(old_name: str, new_name: str) -> None:
    folder_doc_name = frappe.db.get_value(
        "File",
        {"file_name": old_name, "is_folder": 1, "folder": "Home/customers"},
        "name",
    )
    if folder_doc_name:
        frappe.db.set_value(
            "File", folder_doc_name, "file_name", new_name, update_modified=False
        )

    old_folder_path = f"Home/customers/{old_name}"
    new_folder_path = f"Home/customers/{new_name}"
    # Batch UPDATE: rename all file folder paths matching the old prefix
    frappe.db.sql(
        """
        UPDATE `tabFile`
        SET folder = REPLACE(folder, %(old_path)s, %(new_path)s)
        WHERE folder LIKE %(pattern)s
    """,
        {
            "old_path": old_folder_path,
            "new_path": new_folder_path,
            "pattern": f"{old_folder_path}%",
        },
    )


def get_permission_query_conditions(user=None):
    user = user or frappe.session.user
    if _can_access_all_customers(user):
        return ""

    roles = set(frappe.get_roles(user))
    # AT Customer uses origin_office_branch for permission queries per kanon branch model
    # (docs/acente-erisim.md#L999-L1008)
    branch_condition = build_office_branch_permission_query(
        "AT Customer",
        fieldname="origin_office_branch",
        user=user,
    )
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
    # AT Customer uses origin_office_branch for permission checks per kanon branch model
    if "Agent" in roles:
        return (
            doc.assigned_agent == user or doc.owner == user
        ) and has_office_branch_permission(
            doc, fieldname="origin_office_branch", user=user
        )

    return has_office_branch_permission(
        doc, fieldname="origin_office_branch", user=user
    )


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
