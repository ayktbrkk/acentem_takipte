from __future__ import annotations

from collections import defaultdict

import frappe

from acentem_takipte.acentem_takipte.services import (
    sales_entities as sales_entity_service,
)


def execute() -> None:
    if not frappe.db.has_column("AT Sales Entity", "is_pool"):
        return

    _normalize_sales_entity_flags()
    _repair_branch_pool_entities()


def _normalize_sales_entity_flags() -> None:
    # unbounded: all sales entities for flag normalization, bounded by total entity count - expected max ~10k rows
    for row in frappe.get_all(
        "AT Sales Entity",
        fields=["name", "is_active", "is_pool"],
        limit_page_length=0,
    ):
        name = str(row.get("name") or "").strip()
        if not name:
            continue

        updates: dict[str, int] = {}
        if row.get("is_active") in (None, ""):
            updates["is_active"] = 1
        if row.get("is_pool") in (None, ""):
            updates["is_pool"] = 0
        if updates:
            frappe.db.set_value("AT Sales Entity", name, updates, update_modified=False)


def _repair_branch_pool_entities() -> None:
    # unbounded: all office branches for pool repair, bounded by total branch count - expected max ~500 rows
    branches = frappe.get_all(
        "AT Office Branch",
        fields=["name", "office_branch_name", "is_active"],
        order_by="creation asc",
        limit_page_length=0,
    )
    if not branches:
        return

    # unbounded: pool entities for branch pool repair, filtered by is_pool flag - expected max ~500 rows
    pool_rows = frappe.get_all(
        "AT Sales Entity",
        filters={"is_pool": 1},
        fields=["name", "office_branch", "is_active", "creation"],
        order_by="creation asc",
        limit_page_length=0,
    )

    pools_by_branch: dict[str, list[dict]] = defaultdict(list)
    for row in pool_rows:
        branch_name = str(row.get("office_branch") or "").strip()
        if branch_name:
            pools_by_branch[branch_name].append(row)

    for branch in branches:
        branch_name = str(branch.get("name") or "").strip()
        if not branch_name:
            continue

        branch_is_active = int(branch.get("is_active") or 0)
        branch_pools = pools_by_branch.get(branch_name, [])
        if not branch_pools:
            pool_name = sales_entity_service.create_pool_sales_entity(
                branch_name,
                full_name=f"{str(branch.get('office_branch_name') or branch_name).strip()} Pool",
                is_active=branch_is_active,
            )
            pools_by_branch[branch_name] = [
                {
                    "name": pool_name,
                    "office_branch": branch_name,
                    "is_active": branch_is_active,
                }
            ]
            continue

        primary_pool = str(branch_pools[0].get("name") or "").strip()
        if (
            primary_pool
            and int(branch_pools[0].get("is_active") or 0) != branch_is_active
        ):
            frappe.db.set_value(
                "AT Sales Entity",
                primary_pool,
                "is_active",
                branch_is_active,
                update_modified=False,
            )

        for extra_pool in branch_pools[1:]:
            extra_name = str(extra_pool.get("name") or "").strip()
            if not extra_name:
                continue
            frappe.db.set_value(
                "AT Sales Entity",
                extra_name,
                "is_pool",
                0,
                update_modified=False,
            )
