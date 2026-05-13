from __future__ import annotations

import frappe

ROLE_MAP = {
    "Agent": "AT Agent",
    "Manager": "AT Manager",
    "Accountant": "AT Accountant",
}


def execute():
    for old_name, new_name in ROLE_MAP.items():
        _rename_if_exists("tabRole", old_name, new_name, "name")
        _rename_if_exists("tabHas Role", old_name, new_name, "role")
        frappe.db.sql(
            """
            UPDATE `tabCustom DocPerm`
            SET role = %s
            WHERE role = %s
            AND EXISTS (SELECT 1 FROM `tabDocType` WHERE name = parent)
            """,
            (new_name, old_name),
        )

    frappe.db.commit()


def _rename_if_exists(table: str, old: str, new: str, column: str):
    frappe.db.sql(
        f"""
        UPDATE `{table}`
        SET {column} = %s
        WHERE {column} = %s
        """,
        (new, old),
    )
