from __future__ import annotations

from acentem_takipte.acentem_takipte.api import accounting as accounting_api


def test_get_reconciliation_workbench_normalizes_office_branch(monkeypatch):
    captured = {"filters": []}

    monkeypatch.setattr(accounting_api, "assert_authenticated", lambda: "manager@example.com")
    monkeypatch.setattr(accounting_api, "assert_doctype_permission", lambda *args, **kwargs: None)
    monkeypatch.setattr(accounting_api, "normalize_requested_office_branch", lambda office_branch=None, user=None: "ANK")

    def _fake_get_all(doctype, filters=None, fields=None, order_by=None, limit_page_length=0, pluck=None):
        captured["filters"].append((doctype, filters, pluck))
        if doctype == "AT Accounting Entry" and pluck == "name":
            return ["AE-0001"]
        if doctype == "AT Reconciliation Item":
            return []
        if doctype == "AT Accounting Entry":
            return []
        return []

    monkeypatch.setattr(accounting_api.frappe, "get_all", _fake_get_all)
    monkeypatch.setattr(accounting_api.frappe.db, "count", lambda doctype, filters=None: 0)

    payload = accounting_api.get_reconciliation_workbench(office_branch="FORBIDDEN")

    assert payload["rows"] == []
    assert captured["filters"][0][0] == "AT Accounting Entry"
    assert captured["filters"][0][1]["office_branch"] == "ANK"

