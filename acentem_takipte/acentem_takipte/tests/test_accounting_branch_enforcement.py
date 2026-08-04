from __future__ import annotations

import acentem_takipte.acentem_takipte.domains.accounting.api.endpoints as accounting_api
from acentem_takipte.acentem_takipte.domains.accounting.services import runtime


def test_get_reconciliation_workbench_normalizes_office_branch(monkeypatch):
    captured = {"filters": []}

    monkeypatch.setattr(accounting_api, "assert_authenticated", lambda: "manager@example.com")
    monkeypatch.setattr(accounting_api, "assert_doctype_permission", lambda *args, **kwargs: None)

    # normalize_requested_office_branch lives in platform/permissions/branches.py
    # and is imported INTO domains/accounting/services/runtime.py, which is where
    # build_reconciliation_workbench actually calls it. Patch that runtime symbol
    # so the enforcement path (endpoint -> runtime -> normalize -> filter) is
    # exercised against the real import site.
    monkeypatch.setattr(
        runtime,
        "normalize_requested_office_branch",
        lambda office_branch=None, user=None: "ANK",
    )

    def _fake_get_all(doctype, filters=None, fields=None, order_by=None, limit_page_length=0, pluck=None, **kwargs):
        captured["filters"].append((doctype, filters, pluck))
        if doctype == "AT Accounting Entry" and pluck == "name":
            return ["AE-0001"]
        return []

    monkeypatch.setattr(runtime.frappe, "get_all", _fake_get_all)
    monkeypatch.setattr(runtime.frappe.db, "count", lambda doctype, filters=None: 0)

    payload = accounting_api.get_reconciliation_workbench(office_branch="FORBIDDEN")

    assert payload["rows"] == []
    assert captured["filters"][0][0] == "AT Accounting Entry"
    assert captured["filters"][0][1]["office_branch"] == "ANK"
