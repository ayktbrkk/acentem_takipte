"""
Migration: Add origin_office_branch and current_office_branch to AT Policy

This patch adds the two new canonical branch fields to AT Policy and backfills
them from the existing office_branch field:
- origin_office_branch: Set to current office_branch value (snapshot at migration time)
- current_office_branch: Set to current office_branch value (will diverge on branch transfer)

These fields implement the kanon branch model per docs/acente-erisim.md#L995-L1008:
- Permission queries use origin_office_branch (historical access rights preserved)
- Historical reports use origin_office_branch (accounting consistency)
- Operational task lists use current_office_branch (current responsibility)
- Transfer flows preserve both fields
"""

from frappe import _
import frappe


def execute():
    if not frappe.db.has_column("AT Policy", "office_branch"):
        frappe.throw(_("AT Policy office_branch column not found"))

    # Step 1: Add the new columns if they don't exist
    if not frappe.db.has_column("AT Policy", "origin_office_branch"):
        frappe.db.sql(
            "ALTER TABLE `tabAT Policy` ADD COLUMN origin_office_branch VARCHAR(255)"
        )
        frappe.db.commit()

    if not frappe.db.has_column("AT Policy", "current_office_branch"):
        frappe.db.sql(
            "ALTER TABLE `tabAT Policy` ADD COLUMN current_office_branch VARCHAR(255)"
        )
        frappe.db.commit()

    # Step 2: Backfill both fields from existing office_branch
    # origin_office_branch = current office_branch (snapshot at migration time)
    # current_office_branch = current office_branch (starts same, diverges on transfer)
    frappe.db.sql(
        """
        UPDATE `tabAT Policy`
        SET origin_office_branch = office_branch,
            current_office_branch = office_branch
        WHERE office_branch IS NOT NULL AND office_branch != ''
        """
    )
    frappe.db.commit()

    # Step 3: Add database indexes for query performance
    # These support the permission query isolation per Sprint D
    indexes = [
        ("at_policy_origin_office_branch_idx", "origin_office_branch"),
        ("at_policy_current_office_branch_idx", "current_office_branch"),
        ("at_policy_origin_current_branch_idx", ("origin_office_branch", "current_office_branch")),
    ]

    for idx_name, columns in indexes:
        # Check if index exists
        existing = frappe.db.sql(
            "SHOW INDEXES FROM `tabAT Policy` WHERE Key_name = %s",
            (idx_name,),
        )
        if not existing:
            if isinstance(columns, tuple):
                col_list = ", ".join(f"`{col}`" for col in columns)
            else:
                col_list = f"`{columns}`"
            frappe.db.sql(
                f"ALTER TABLE `tabAT Policy` ADD INDEX {idx_name} ({col_list})"
            )
            frappe.db.commit()

    frappe.publish_realtime(
        "bench_patch_completed",
        {"patch": "v2026_03_25_origin_current_office_branch_policy"},
        after_commit=True,
    )
