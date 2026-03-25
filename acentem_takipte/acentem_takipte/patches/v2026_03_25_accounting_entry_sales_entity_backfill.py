"""Backfill sales_entity dimension on AT Accounting Entry from source records."""

from __future__ import annotations

import frappe


def execute():
    if not frappe.db.has_column("AT Accounting Entry", "sales_entity"):
        return

    frappe.db.sql(
        """
        UPDATE `tabAT Accounting Entry` ae
        LEFT JOIN `tabAT Policy` p
            ON p.name = ae.policy
        LEFT JOIN `tabAT Payment` pay
            ON ae.source_doctype = 'AT Payment' AND pay.name = ae.source_name
        LEFT JOIN `tabAT Policy` srcp
            ON ae.source_doctype = 'AT Policy' AND srcp.name = ae.source_name
        SET ae.sales_entity = COALESCE(ae.sales_entity, p.sales_entity, pay.sales_entity, srcp.sales_entity)
        WHERE (ae.sales_entity IS NULL OR ae.sales_entity = '')
          AND COALESCE(p.sales_entity, pay.sales_entity, srcp.sales_entity, '') != ''
        """
    )

    try:
        existing_indexes = frappe.db.sql(
            "SHOW INDEXES FROM `tabAT Accounting Entry` WHERE Key_name = %s",
            ("at_accounting_entry_office_branch_sales_entity_idx",),
        )
        if not existing_indexes:
            frappe.db.sql(
                "ALTER TABLE `tabAT Accounting Entry` ADD INDEX at_accounting_entry_office_branch_sales_entity_idx (`office_branch`, `sales_entity`)"
            )
    except Exception:
        # Safe fallback: index may already exist or database may reject duplicate/additional index.
        pass
