from __future__ import annotations

import frappe


def execute():
    exists = frappe.db.sql(
        """
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'tabAT Document'
          AND index_name = 'idx_status'
        LIMIT 1
        """
    )
    if exists:
        return

    frappe.db.sql("ALTER TABLE `tabAT Document` ADD INDEX `idx_status` (`status`)")
