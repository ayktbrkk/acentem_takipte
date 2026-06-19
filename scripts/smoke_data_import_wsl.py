#!/usr/bin/env python3
"""One-shot WSL smoke for /at/data-import customer CSV flow."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path


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


def main() -> int:
    import frappe
    from frappe.utils.file_manager import save_file

    from acentem_takipte.acentem_takipte.api.data_import import (
        create_import_job_draft,
        enqueue_data_import,
        get_import_job_status,
        preview_data_import,
    )
    from acentem_takipte.acentem_takipte.tasks import _process_data_import_job_logic

    _init_frappe()
    frappe.connect()
    frappe.set_user("Administrator")

    fixture = frappe.get_app_path(
        "acentem_takipte",
        "acentem_takipte",
        "tests",
        "fixtures",
        "data_import",
        "customers_valid.csv",
    )
    with open(fixture, "rb") as handle:
        content = handle.read()

    file_doc = save_file("smoke_customers.csv", content, None, None, is_private=1)
    draft = create_import_job_draft("customers", file_name=file_doc.name)
    job_name = draft["job_name"]
    mapping = {header: header for header in draft.get("headers", [])}
    preview = preview_data_import(
        job_name,
        column_mapping=mapping,
        import_options={"duplicate_policy": "skip"},
    )
    ready = int((preview.get("summary") or {}).get("ready") or 0)
    if ready <= 0:
        print(json.dumps({"error": "preview has no ready rows", "summary": preview.get("summary")}))
        return 1

    enqueue = enqueue_data_import(job_name)
    frappe.flags.in_test = True
    result = _process_data_import_job_logic(job_name, "Administrator")
    status = get_import_job_status(job_name)
    customer = frappe.db.get_value("AT Customer", {"tax_id": "11111111110"}, "name")
    payload = {
        "job_name": job_name,
        "preview_ready": ready,
        "enqueue_status": enqueue.get("status"),
        "result": result,
        "final_status": status.get("status"),
        "customer_created": customer,
    }
    print(json.dumps(payload, ensure_ascii=False))
    if status.get("status") != "Completed" or not customer:
        return 1
    print("SMOKE OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
