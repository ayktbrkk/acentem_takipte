from acentem_takipte.api import reports


def test_get_communication_operations_report_enforces_auth_and_builds_payload(monkeypatch):
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
            "columns": ["campaign_name", "sent_count"],
            "rows": [{"campaign_name": "March Renewal", "sent_count": 3}],
            "filters": filters or {},
            "limit": limit,
        },
    )

    payload = reports.get_communication_operations_report(filters={"status": "Completed"}, limit=100)

    assert payload["report_key"] == "communication_operations"
    assert payload["rows"][0]["sent_count"] == 3
    assert calls == [
        ("auth", None),
        ("perm", "AT Campaign", "read"),
    ]
