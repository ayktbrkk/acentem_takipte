from __future__ import annotations

import frappe

from acentem_takipte.acentem_takipte.platform.permissions.sales_entities import (
    create_pool_sales_entity,
)


def ensure_pool_for_branch(office_branch: str) -> str:
    """Ensure the office branch has both a root and a pool sales entity.

    Required because:
    - `AT Sales Entity._validate_root_constraints` demands a root entity per branch.
    - `AT Sales Entity._validate_pool_constraints` demands a pool entity per
      active branch.

    Idempotent: returns the existing pool if one already exists.
    """
    existing_root = frappe.db.get_value(
        "AT Sales Entity",
        {"office_branch": office_branch, "is_root": 1},
        "name",
    )
    if not existing_root:
        branch_label = (
            frappe.db.get_value("AT Office Branch", office_branch, "office_branch_name")
            or office_branch
        )
        frappe.get_doc(
            {
                "doctype": "AT Sales Entity",
                "entity_type": "Agency",
                "full_name": f"{branch_label} Root",
                "office_branch": office_branch,
                "is_root": 1,
            }
        ).insert(ignore_permissions=True)
    return create_pool_sales_entity(office_branch)
