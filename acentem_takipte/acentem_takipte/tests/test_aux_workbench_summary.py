from __future__ import annotations

import frappe
import pytest
from frappe.utils import now

from acentem_takipte.acentem_takipte.platform.api.aux_workbench_summary import get_aux_workbench_summary

PDF = 1500
IMG = 500
CUSTOMER = 1000
POLICY = 600
CLAIM = 400
TOTAL = PDF + IMG


def _insert_bulk_files(prefix: str) -> None:
    fields = [
        "name",
        "creation",
        "modified",
        "modified_by",
        "owner",
        "docstatus",
        "idx",
        "file_name",
        "file_type",
        "attached_to_doctype",
        "is_private",
        "file_size",
    ]
    values = []
    now_dt = now()
    # file_type distribution: PDF then IMG; doctype distribution interleaved
    seq = 0
    for i in range(TOTAL):
        file_type = "application/pdf" if i < PDF else "image/png"
        if i < CUSTOMER:
            doctype = "AT Customer"
        elif i < CUSTOMER + POLICY:
            doctype = "AT Policy"
        else:
            doctype = "AT Claim"
        seq += 1
        values.append(
            (
                f"bulk-{prefix}-{seq}",
                now_dt,
                now_dt,
                "Administrator",
                "Administrator",
                0,
                0,
                f"{prefix}-file-{seq}.pdf" if file_type == "application/pdf" else f"{prefix}-file-{seq}.png",
                file_type,
                doctype,
                0,
                100,
            )
        )
    frappe.db.bulk_insert("File", fields, values)


def test_aux_summary_full_dataset_no_cap():
    frappe.set_user("Administrator")
    prefix = frappe.generate_hash(length=8)
    _insert_bulk_files(prefix)

    try:
        result = get_aux_workbench_summary.__wrapped__(
            doctype="File",
            filters={"file_name": ["like", f"%{prefix}%"]},
            group_fields=["file_type", "attached_to_doctype"],
            matches=[
                {"key": "customer", "conditions": [["attached_to_doctype", "=", "AT Customer"]]},
                {"key": "policy", "conditions": [["attached_to_doctype", "=", "AT Policy"]]},
                {"key": "claim", "conditions": [["attached_to_doctype", "=", "AT Claim"]]},
            ],
            numeric_fields=[],
        )

        assert result["total"] == TOTAL, f"expected {TOTAL}, got {result['total']}"
        file_type = result["group_by"]["file_type"]
        assert file_type.get("application/pdf") == PDF, file_type
        assert file_type.get("image/png") == IMG, file_type
        assert result["matches"]["customer"] == CUSTOMER
        assert result["matches"]["policy"] == POLICY
        assert result["matches"]["claim"] == CLAIM
        # sub-counts reconcile with the total
        assert result["matches"]["customer"] + result["matches"]["policy"] + result["matches"]["claim"] == TOTAL
    finally:
        frappe.db.rollback()


def test_aux_summary_respects_filters_scope():
    frappe.set_user("Administrator")
    prefix = frappe.generate_hash(length=8)
    _insert_bulk_files(prefix)

    try:
        # Only PDFs
        result = get_aux_workbench_summary.__wrapped__(
            doctype="File",
            filters={"file_name": ["like", f"%{prefix}%"], "file_type": "application/pdf"},
            group_fields=["file_type", "attached_to_doctype"],
            matches=[{"key": "customer", "conditions": [["attached_to_doctype", "=", "AT Customer"]]}],
            numeric_fields=[],
        )
        assert result["total"] == PDF, f"expected {PDF}, got {result['total']}"
        assert result["matches"]["customer"] == CUSTOMER, result["matches"]
    finally:
        frappe.db.rollback()


def test_aux_summary_rejects_unknown_doctype():
    frappe.set_user("Administrator")
    with pytest.raises(Exception) as exc:
        get_aux_workbench_summary.__wrapped__(
            doctype="AT SomeSecret",
            filters={},
            group_fields=["name"],
            matches=[],
            numeric_fields=[],
        )
    assert "Unsupported summary doctype" in str(exc.value)
    frappe.db.rollback()
