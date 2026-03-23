from acentem_takipte.api import reports


def test_get_claims_operations_report_enforces_auth_and_builds_payload(monkeypatch):
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
            "columns": ["claim_no", "claim_status"],
            "rows": [{"claim_no": "CLM-001", "claim_status": "Rejected"}],
            "filters": filters or {},
            "limit": limit,
        },
    )

    payload = reports.get_claims_operations_report(filters={"status": "Rejected"}, limit=75)

    assert payload["report_key"] == "claims_operations"
    assert payload["rows"][0]["claim_no"] == "CLM-001"
    assert calls == [
        ("auth", None),
        ("perm", "AT Claim", "read"),
    ]
