from __future__ import annotations

from pathlib import Path

import frappe
from frappe.utils.pdf import get_pdf


def attach_policy_pdf_to_customer_folder(policy_doc, print_format: str | None = None) -> str | None:
    if not policy_doc or not policy_doc.get("customer"):
        return None

    existing_file = frappe.db.get_value(
        "File",
        {
            "attached_to_doctype": policy_doc.doctype,
            "attached_to_name": policy_doc.name,
            "file_name": _policy_pdf_filename(policy_doc),
            "is_private": 1,
        },
    )
    if existing_file:
        return existing_file

    html = frappe.get_print(
        policy_doc.doctype,
        policy_doc.name,
        print_format=print_format,
        as_pdf=False,
    )
    pdf_content = get_pdf(html)

    folder = _ensure_customer_folder(policy_doc.customer)
    file_doc = frappe.get_doc(
        {
            "doctype": "File",
            "file_name": _policy_pdf_filename(policy_doc),
            "folder": folder,
            "is_private": 1,
            "attached_to_doctype": policy_doc.doctype,
            "attached_to_name": policy_doc.name,
            "content": pdf_content,
        }
    ).insert(ignore_permissions=True)
    return file_doc.name


def _policy_pdf_filename(policy_doc) -> str:
    policy_ref = (policy_doc.get("policy_no") or policy_doc.name or "policy").strip()
    safe_policy_ref = "".join(char if char.isalnum() or char in {"-", "_"} else "-" for char in policy_ref)
    return f"{safe_policy_ref}.pdf"


def _ensure_customer_folder(customer_name: str) -> str:
    _ensure_private_fs_path(customer_name)
    _ensure_file_folder(name="customers", folder="Home")
    _ensure_file_folder(name=customer_name, folder="Home/customers")
    return f"Home/customers/{customer_name}"


def _ensure_private_fs_path(customer_name: str) -> None:
    private_folder_path = Path(frappe.get_site_path("private", "files", "customers", customer_name))
    private_folder_path.mkdir(parents=True, exist_ok=True)


def _ensure_file_folder(name: str, folder: str) -> None:
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
