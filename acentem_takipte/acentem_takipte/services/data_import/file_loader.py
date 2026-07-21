from __future__ import annotations

import frappe
from frappe import _

from acentem_takipte.acentem_takipte.platform.import_export.data_import.parsers.base import ParsedSheet
from acentem_takipte.acentem_takipte.platform.import_export.data_import.parsers.csv_parser import parse_csv_text
from acentem_takipte.acentem_takipte.platform.import_export.data_import.parsers.xlsx_parser import (
    list_xlsx_sheet_names,
    parse_xlsx_bytes,
)
from acentem_takipte.acentem_takipte.platform.import_export.data_import.registry import MAX_FILE_BYTES, PREVIEW_ROW_LIMIT


def parse_job_file(
    *,
    file_url: str,
    delimiter: str = ",",
    sheet_name: str | None = None,
    limit: int = PREVIEW_ROW_LIMIT,
) -> ParsedSheet:
    lower_url = str(file_url or "").lower()
    if lower_url.endswith(".csv"):
        text = load_attached_file_text(file_url)
        return parse_csv_text(text=text, delimiter=delimiter, limit=limit)
    if lower_url.endswith(".xlsx"):
        data = load_attached_file_bytes(file_url)
        return parse_xlsx_bytes(data=data, sheet_name=sheet_name, limit=limit)
    frappe.throw(_("Only CSV and XLSX imports are supported."))


def list_job_file_sheets(file_url: str) -> list[str]:
    lower_url = str(file_url or "").lower()
    if not lower_url.endswith(".xlsx"):
        return []
    data = load_attached_file_bytes(file_url)
    return list_xlsx_sheet_names(data)


def load_attached_file_bytes(file_url: str) -> bytes:
    file_doc = _get_file_doc(file_url)
    content = file_doc.get_content()
    if isinstance(content, str):
        return content.encode("utf-8")
    return bytes(content or b"")


def load_attached_file_text(file_url: str) -> str:
    content = load_attached_file_bytes(file_url)
    for encoding in ("utf-8-sig", "utf-8", "cp1254", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    return content.decode("utf-8", errors="replace")


def _get_file_doc(file_url: str):
    safe_url = str(file_url or "").strip()
    if not safe_url:
        frappe.throw(_("Source file is required."))

    file_name = frappe.db.get_value("File", {"file_url": safe_url}, "name")
    if not file_name:
        file_name = frappe.db.get_value("File", safe_url, "name")
    if not file_name:
        frappe.throw(_("Uploaded file could not be resolved."))

    file_doc = frappe.get_doc("File", file_name)
    file_size = int(file_doc.file_size or 0)
    if file_size > MAX_FILE_BYTES:
        frappe.throw(_("Import file exceeds the 10 MB limit."))
    return file_doc
