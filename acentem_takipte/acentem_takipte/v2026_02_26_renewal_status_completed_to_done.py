from __future__ import annotations

import frappe


def execute():
    # Legacy installs may still contain renewal tasks with the pre-standardization status value.
    frappe.db.sql(
        """
        update `tabAT Renewal Task`
        set status = %s
        where status = %s
        """,
        ("Done", "Completed"),
    )

