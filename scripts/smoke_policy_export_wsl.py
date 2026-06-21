#!/usr/bin/env python3
"""Smoke policy_list export via download_export (workbench empty-query path)."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path


def main() -> int:
    import frappe

    from acentem_takipte.acentem_takipte.api.list_exports import download_export

    site = os.environ.get("FRAPPE_SITE", "at.localhost")
    bench_root = Path(os.environ.get("FRAPPE_BENCH_ROOT", Path.home() / "frappe-bench"))
    frappe.init(site=site, sites_path=str(bench_root / "sites"))
    frappe.connect()
    frappe.set_user("Administrator")
    frappe.local.response = frappe._dict()

    download_export(screen="policy_list", export_format="xlsx", limit=5, filename="smoke_policy")

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
    print("SMOKE OK policy_list")
    return 0


if __name__ == "__main__":
    sys.exit(main())
