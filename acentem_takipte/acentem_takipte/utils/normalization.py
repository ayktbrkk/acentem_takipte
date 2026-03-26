"""Shared normalization helpers used across quick_create, reporting, and list exports."""

from __future__ import annotations

from typing import Any

import frappe
from frappe.utils import cstr, getdate, flt


def normalize_option(value: str | None) -> str | None:
    text = str(value or "").strip()
    return text or None


def normalize_link(doctype: str, value: str | None) -> str | None:
    text = str(value or "").strip()
    if not text:
        return None
    if frappe.db.exists(doctype, text):
        return text
    return None


def normalize_date(value: str | None):
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return getdate(text)
    except Exception:
        return None


def normalize_datetime(value: str | None):
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return frappe.utils.get_datetime(text)
    except Exception:
        return None


def safe_float(value: Any) -> float:
    if value is None or value == "":
        return 0.0
    return flt(value)


def as_check(value: Any) -> int:
    return 1 if value else 0
