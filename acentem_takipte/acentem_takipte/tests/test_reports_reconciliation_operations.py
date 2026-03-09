from acentem_takipte.acentem_takipte.api import reports


def test_get_reconciliation_operations_report_enforces_auth_and_builds_payload(monkeypatch):
    calls = []

    monkeypatch.setattr(reports, "assert_authenticated", lambda: calls.append(("auth", None)))
    monkeypatch.setattr(
        reports,
        "assert_doctype_permission",
        lambda doctype, permtype: calls.append(("perm", doctype, permtype)),
    )
    monkeypatch.setattr(
        reports,
        "build_safe_report_payload",
        lambda key, filters=None, limit=500: {
            "report_key": key,
            "columns": ["accounting_entry", "difference_try"],
            "rows": [{"accounting_entry": "ACC-001", "difference_try": 1250}],
            "filters": filters or {},
            "limit": limit,
        },
    )

    payload = reports.get_reconciliation_operations_report(filters={"status": "Open"}, limit=100)

    assert payload["report_key"] == "reconciliation_operations"
    assert payload["rows"][0]["accounting_entry"] == "ACC-001"
    assert calls == [
        ("auth", None),
        ("perm", "AT Reconciliation Item", "read"),
    ]
