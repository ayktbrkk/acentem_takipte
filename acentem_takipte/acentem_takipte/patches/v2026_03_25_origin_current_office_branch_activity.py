"""
Migration: Add origin_office_branch and current_office_branch to AT Activity

This patch adds the two new canonical branch fields to AT Activity and backfills
them from the existing office_branch field.

These fields implement the kanon branch model per docs/acente-erisim.md#L995-L1008:
- Activity records use origin_office_branch for permission queries (historical access)
"""

import frappe


def execute():
    if not frappe.db.has_column("AT Activity", "office_branch"):
        frappe.throw("AT Activity office_branch column not found")

    # Step 1: Add the new columns if they don't exist
    if not frappe.db.has_column("AT Activity", "origin_office_branch"):
        frappe.db.sql(
            "ALTER TABLE `tabAT Activity` ADD COLUMN origin_office_branch VARCHAR(255)"
        )
        frappe.db.commit()

    if not frappe.db.has_column("AT Activity", "current_office_branch"):
        frappe.db.sql(
            "ALTER TABLE `tabAT Activity` ADD COLUMN current_office_branch VARCHAR(255)"
        )
        frappe.db.commit()

    # Step 2: Backfill both fields from existing office_branch
    frappe.db.sql(
        """
        UPDATE `tabAT Activity`
        SET origin_office_branch = office_branch,
            current_office_branch = office_branch
        WHERE office_branch IS NOT NULL AND office_branch != ''
        """
    )
    frappe.db.commit()

    # Step 3: Add database indexes for query performance
    indexes = [
        ("at_activity_origin_office_branch_idx", "origin_office_branch"),
        ("at_activity_current_office_branch_idx", "current_office_branch"),
    ]

    for idx_name, columns in indexes:
        existing = frappe.db.sql(
            f"SHOW INDEXES FROM `tabAT Activity` WHERE Key_name = %s",
            (idx_name,),
        )
        if not existing:
            frappe.db.sql(
                f"ALTER TABLE `tabAT Activity` ADD INDEX {idx_name} (`{columns}`)"
            )
            frappe.db.commit()

    frappe.publish_realtime(
        "bench_patch_completed",
        {"patch": "v2026_03_25_origin_current_office_branch_activity"},
        after_commit=True,
    )