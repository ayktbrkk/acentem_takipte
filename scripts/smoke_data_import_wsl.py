#!/usr/bin/env python3
"""One-shot WSL smoke for /at/data-import customers, offers, and policies."""

from __future__ import annotations

import os
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from smoke_import_helpers import ensure_smoke_reference_data, print_payload, run_dataset_smoke


def _init_frappe() -> None:
    import frappe

    site = os.environ.get("FRAPPE_SITE", "at.localhost")
    sites_path = os.environ.get("FRAPPE_SITES_PATH")
    if not sites_path:
        cwd = Path.cwd()
        if (cwd / site).exists():
            sites_path = str(cwd)
        else:
            bench_root = os.environ.get("FRAPPE_BENCH_ROOT", "")
            if bench_root and (Path(bench_root) / "sites" / site).exists():
                sites_path = str(Path(bench_root) / "sites")
    if sites_path:
        frappe.init(site=site, sites_path=sites_path)
    else:
        frappe.init(site=site)


def _verify_customer(_: dict) -> bool:
    import frappe

    return bool(frappe.db.get_value("AT Customer", {"tax_id": "11111111110"}, "name"))


def _verify_offer(_: dict) -> bool:
    import frappe

    customer = frappe.db.get_value("AT Customer", {"tax_id": "11111111110"}, "name")
    if not customer:
        return False
    return bool(
        frappe.db.get_value(
            "AT Offer",
            {
                "customer": customer,
                "insurance_company": "IC-001",
                "offer_date": "2026-06-01",
            },
            "name",
        )
    )


def _verify_policy(_: dict) -> bool:
    import frappe

    return bool(
        frappe.db.get_value(
            "AT Policy",
            {"insurance_company": "IC-001", "policy_no": "POL-SMOKE-IMPORT-001"},
            "name",
        )
    )


def main() -> int:
    import frappe

    _init_frappe()
    frappe.connect()
    frappe.set_user("Administrator")
    ensure_smoke_reference_data()

    steps = [
        ("customers", "customers_valid.csv", _verify_customer),
        ("offers", "offers_valid.csv", _verify_offer),
        ("policies", "policies_valid.csv", _verify_policy),
    ]

    for dataset, fixture_file, verify in steps:
        payload = run_dataset_smoke(dataset=dataset, fixture_file=fixture_file, verify=verify)
        print_payload(payload)
        if payload.get("error"):
            return 1

    print("SMOKE OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
