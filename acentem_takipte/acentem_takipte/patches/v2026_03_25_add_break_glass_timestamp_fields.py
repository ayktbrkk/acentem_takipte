import frappe

# audit(f401): this migration no longer stamps rows directly, so `now` is not needed.


def execute():
    """
    Migration: Add missing timestamp fields to AT Break Glass Request
    These fields exist in JSON schema but are not in the database table.
    """
    # Add expires_at_ts column using direct SQL
    if not frappe.db.has_column("AT Break Glass Request", "expires_at_ts"):
        frappe.db.sql("""
            ALTER TABLE `tabAT Break Glass Request`
            ADD COLUMN `expires_at_ts` DATETIME(6) NULL
        """)
        print("Added expires_at_ts column")

    # Add approved_at_ts column
    if not frappe.db.has_column("AT Break Glass Request", "approved_at_ts"):
        frappe.db.sql("""
            ALTER TABLE `tabAT Break Glass Request`
            ADD COLUMN `approved_at_ts` DATETIME(6) NULL
        """)
        print("Added approved_at_ts column")

    # Add created_at_ts column
    if not frappe.db.has_column("AT Break Glass Request", "created_at_ts"):
        frappe.db.sql("""
            ALTER TABLE `tabAT Break Glass Request`
            ADD COLUMN `created_at_ts` DATETIME(6) NULL
        """)
        print("Added created_at_ts column")

    frappe.db.commit()
    print("Migration completed for AT Break Glass Request")
