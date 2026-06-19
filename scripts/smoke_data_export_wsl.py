#!/usr/bin/env python3
"""One-shot WSL smoke for /at/data-export download_export flow."""

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

    from acentem_takipte.acentem_takipte.api.list_exports import download_export

    _init_frappe()
    frappe.connect()
    frappe.set_user("Administrator")
    frappe.local.response = frappe._dict()

    download_export(
        screen="claims_board",
        export_format="xlsx",
        start_date="",
        end_date="",
        status="",
        filename="smoke_claims",
        limit=10,
    )

    response = frappe.local.response
    filename = str(response.get("filename") or "")
    filecontent = response.get("filecontent") or b""
    print(
        json.dumps(
            {
                "filename": filename,
                "content_type": response.get("content_type"),
                "bytes": len(filecontent) if isinstance(filecontent, (bytes, bytearray)) else 0,
            },
            ensure_ascii=False,
        )
    )
    if not filename.endswith(".xlsx") or not filecontent:
        return 1
    print("SMOKE OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
