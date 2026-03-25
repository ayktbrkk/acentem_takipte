import frappe
from frappe.utils import now


def execute():
    """
    Migration: Add origin_office_branch and current_office_branch fields to AT Call Note
    per kanon branch model (docs/acente-erisim.md#L995-L1008).
    """
    if not frappe.db.has_column("AT Call Note", "origin_office_branch"):
        frappe.db.add_column(
            "AT Call Note",
            "origin_office_branch",
            "VARCHAR(140) NULL"
        )
        # Backfill origin_office_branch from office_branch
        frappe.db.sql("""
            UPDATE `tabAT Call Note`
            SET origin_office_branch = office_branch
            WHERE origin_office_branch IS NULL OR origin_office_branch = ''
        """)

    if not frappe.db.has_column("AT Call Note", "current_office_branch"):
        frappe.db.add_column(
            "AT Call Note",
            "current_office_branch",
            "VARCHAR(140) NULL"
        )
        # Backfill current_office_branch from office_branch
        frappe.db.sql("""
            UPDATE `tabAT Call Note`
            SET current_office_branch = office_branch
            WHERE current_office_branch IS NULL OR current_office_branch = ''
        """)

    # Create indexes for permission queries using origin_office_branch
    if not frappe.db.has_index("tabAT Call Note", "idx_origin_office_branch"):
        frappe.db.sql("""
            CREATE INDEX idx_origin_office_branch
            ON `tabAT Call Note` (origin_office_branch)
        """)

    if not frappe.db.has_index("tabAT Call Note", "idx_current_office_branch"):
        frappe.db.sql("""
            CREATE INDEX idx_current_office_branch
            ON `tabAT Call Note` (current_office_branch)
        """)

    frappe.db.commit()