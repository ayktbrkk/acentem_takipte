import frappe
from frappe.utils import now


def execute():
    """
    Migration: Add origin_office_branch and current_office_branch fields to AT Payment Installment
    per kanon branch model (docs/acente-erisim.md#L995-L1008).
    """
    if not frappe.db.has_column("AT Payment Installment", "origin_office_branch"):
        frappe.db.add_column(
            "AT Payment Installment",
            "origin_office_branch",
            "VARCHAR(140) NULL"
        )
        # Backfill origin_office_branch from office_branch
        frappe.db.sql("""
            UPDATE `tabAT Payment Installment`
            SET origin_office_branch = office_branch
            WHERE origin_office_branch IS NULL OR origin_office_branch = ''
        """)

    if not frappe.db.has_column("AT Payment Installment", "current_office_branch"):
        frappe.db.add_column(
            "AT Payment Installment",
            "current_office_branch",
            "VARCHAR(140) NULL"
        )
        # Backfill current_office_branch from office_branch
        frappe.db.sql("""
            UPDATE `tabAT Payment Installment`
            SET current_office_branch = office_branch
            WHERE current_office_branch IS NULL OR current_office_branch = ''
        """)

    # Create indexes for permission queries using origin_office_branch
    if not frappe.db.has_index("tabAT Payment Installment", "idx_origin_office_branch"):
        frappe.db.sql("""
            CREATE INDEX idx_origin_office_branch
            ON `tabAT Payment Installment` (origin_office_branch)
        """)

    if not frappe.db.has_index("tabAT Payment Installment", "idx_current_office_branch"):
        frappe.db.sql("""
            CREATE INDEX idx_current_office_branch
            ON `tabAT Payment Installment` (current_office_branch)
        """)

    frappe.db.commit()