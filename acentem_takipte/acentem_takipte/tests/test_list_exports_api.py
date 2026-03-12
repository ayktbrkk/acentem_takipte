import pytest

from acentem_takipte.acentem_takipte.api import list_exports


def test_get_screen_export_payload_enforces_auth_and_permission(monkeypatch):
    calls = []

    monkeypatch.setattr(list_exports, "assert_authenticated", lambda: calls.append(("auth",)))
    monkeypatch.setattr(
        list_exports,
        "assert_doctype_permission",
        lambda doctype, permtype: calls.append(("perm", doctype, permtype)),
    )
    monkeypatch.setattr(
        list_exports,
        "get_screen_export_definition",
        lambda screen: {"permission_doctype": "AT Lead"} if screen == "lead_list" else {},
    )
    monkeypatch.setattr(
        list_exports,
        "build_screen_export_payload",
        lambda screen, query=None, limit=1000: {
            "screen": screen,
            "rows": [{"Lead": "LEAD-001"}],
            "columns": ["Lead"],
            "filters": query or {},
            "limit": limit,
        },
    )

    payload = list_exports.get_screen_export_payload("lead_list", query={"filters": {"status": "Open"}}, limit=250)

    assert payload["screen"] == "lead_list"
    assert payload["rows"][0]["Lead"] == "LEAD-001"
    assert calls == [
        ("auth",),
        ("perm", "AT Lead", "read"),
    ]


def test_export_screen_list_sets_download_response(monkeypatch):
    monkeypatch.setattr(list_exports, "assert_authenticated", lambda: None)
    monkeypatch.setattr(list_exports, "assert_doctype_permission", lambda doctype, permtype: None)
    monkeypatch.setattr(
        list_exports,
        "get_screen_export_definition",
        lambda screen: {"permission_doctype": "AT Policy"} if screen == "policy_list" else {},
    )
    monkeypatch.setattr(
        list_exports,
        "build_screen_export_response",
        lambda screen, query=None, export_format="xlsx", limit=1000: {
            "filename": "policy_list_workbench.xlsx",
            "filecontent": b"xlsx-bytes",
            "type": "download",
            "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
    )
    monkeypatch.setattr(list_exports.frappe, "response", {})

    list_exports.export_screen_list("policy_list", query={"filters": {"status": "Active"}}, export_format="xlsx", limit=500)

    assert list_exports.frappe.response["filename"] == "policy_list_workbench.xlsx"
    assert list_exports.frappe.response["filecontent"] == b"xlsx-bytes"
    assert list_exports.frappe.response["type"] == "download"


def test_export_tabular_payload_sets_download_response(monkeypatch):
    monkeypatch.setattr(list_exports, "assert_authenticated", lambda: None)
    permission_calls = []
    monkeypatch.setattr(
        list_exports,
        "assert_doctype_permission",
        lambda doctype, permtype: permission_calls.append((doctype, permtype)),
    )
    monkeypatch.setattr(
        list_exports,
        "build_tabular_payload_export_response",
        lambda **kwargs: {"filename": "renewals.xlsx", "filecontent": b"payload-bytes", "type": "download"},
    )
    monkeypatch.setattr(list_exports.frappe, "response", {})

    list_exports.export_tabular_payload(
        permission_doctypes=["AT Renewal Task", "AT Policy"],
        query={"title": "Renewals", "columns": ["Task"], "rows": [{"Task": "RT-0001"}]},
        export_format="xlsx",
    )

    assert permission_calls == [("AT Renewal Task", "read"), ("AT Policy", "read")]
    assert list_exports.frappe.response["filename"] == "renewals.xlsx"
    assert list_exports.frappe.response["filecontent"] == b"payload-bytes"


def test_export_tabular_payload_normalizes_comma_separated_permission_doctypes(monkeypatch):
    monkeypatch.setattr(list_exports, "assert_authenticated", lambda: None)
    permission_calls = []
    monkeypatch.setattr(
        list_exports,
        "assert_doctype_permission",
        lambda doctype, permtype: permission_calls.append((doctype, permtype)),
    )
    monkeypatch.setattr(
        list_exports,
        "build_tabular_payload_export_response",
        lambda **kwargs: {"filename": "renewals.xlsx", "filecontent": b"payload-bytes", "type": "download"},
    )
    monkeypatch.setattr(list_exports.frappe, "response", {})

    list_exports.export_tabular_payload(
        permission_doctypes="AT Renewal Task, AT Policy, AT Renewal Task",
        query={"title": "Renewals", "columns": ["Task"], "rows": [{"Task": "RT-0001"}]},
        export_format="xlsx",
    )

    assert permission_calls == [("AT Renewal Task", "read"), ("AT Policy", "read")]


def test_export_tabular_payload_handles_invalid_permission_doctype_json(monkeypatch):
    monkeypatch.setattr(list_exports, "assert_authenticated", lambda: None)
    permission_calls = []
    monkeypatch.setattr(
        list_exports,
        "assert_doctype_permission",
        lambda doctype, permtype: permission_calls.append((doctype, permtype)),
    )
    monkeypatch.setattr(
        list_exports,
        "build_tabular_payload_export_response",
        lambda **kwargs: {"filename": "renewals.xlsx", "filecontent": b"payload-bytes", "type": "download"},
    )
    monkeypatch.setattr(list_exports.frappe, "response", {})

    list_exports.export_tabular_payload(
        permission_doctypes='["AT Renewal Task", invalid-json]',
        query={"title": "Renewals", "columns": ["Task"], "rows": [{"Task": "RT-0001"}]},
        export_format="xlsx",
    )

    assert permission_calls == [('["AT Renewal Task"', "read"), ("invalid-json]", "read")]


def test_export_tabular_payload_requires_permission_doctype(monkeypatch):
    monkeypatch.setattr(list_exports, "assert_authenticated", lambda: None)
    monkeypatch.setattr(list_exports.frappe, "throw", lambda message: (_ for _ in ()).throw(RuntimeError(message)))

    with pytest.raises(RuntimeError, match="At least one permission doctype is required for tabular export."):
        list_exports.export_tabular_payload(
            permission_doctypes=[],
            query={"title": "Renewals", "columns": ["Task"], "rows": [{"Task": "RT-0001"}]},
            export_format="xlsx",
        )


def test_get_screen_export_payload_unsupported_screen_raises(monkeypatch):
    monkeypatch.setattr(list_exports, "assert_authenticated", lambda: None)
    monkeypatch.setattr(list_exports, "get_screen_export_definition", lambda screen: (_ for _ in ()).throw(RuntimeError("boom")))

    with pytest.raises(RuntimeError, match="boom"):
        list_exports.get_screen_export_payload("unknown", query={}, limit=100)


def test_get_screen_export_payload_coerces_non_positive_limit(monkeypatch):
    monkeypatch.setattr(list_exports, "assert_authenticated", lambda: None)
    monkeypatch.setattr(list_exports, "assert_doctype_permission", lambda *args, **kwargs: None)
    monkeypatch.setattr(list_exports, "get_screen_export_definition", lambda screen: {"permission_doctype": "AT Policy"})
    captured = {}
    monkeypatch.setattr(
        list_exports,
        "build_screen_export_payload",
        lambda screen, query=None, limit=1000: captured.update({"limit": limit}) or {"screen": screen},
    )

    list_exports.get_screen_export_payload("policy_list", query={}, limit=0)

    assert captured["limit"] == 1


def test_get_screen_export_payload_coerces_invalid_shape(monkeypatch):
    monkeypatch.setattr(list_exports, "assert_authenticated", lambda: None)
    monkeypatch.setattr(list_exports, "assert_doctype_permission", lambda *args, **kwargs: None)
    monkeypatch.setattr(list_exports, "get_screen_export_definition", lambda screen: {"permission_doctype": "AT Policy"})
    monkeypatch.setattr(
        list_exports,
        "build_screen_export_payload",
        lambda screen, query=None, limit=1000: {
            "screen": " policy_list ",
            "export_key": " ",
            "title": " ",
            "columns": "Policy No",
            "rows": {"name": "bad"},
            "filters": "status=Open",
        },
    )

    payload = list_exports.get_screen_export_payload("policy_list", query={}, limit=100)

    assert payload["screen"] == "policy_list"
    assert payload["export_key"] == "report"
    assert payload["title"] == "Report"
    assert payload["columns"] == []
    assert payload["rows"] == []
    assert payload["filters"] == {}


def test_export_screen_list_coerces_download_payload(monkeypatch):
    monkeypatch.setattr(list_exports, "assert_authenticated", lambda: None)
    monkeypatch.setattr(list_exports, "assert_doctype_permission", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        list_exports,
        "get_screen_export_definition",
        lambda screen: {"permission_doctype": "AT Policy"} if screen == "policy_list" else {},
    )
    monkeypatch.setattr(
        list_exports,
        "build_screen_export_response",
        lambda screen, query=None, export_format="xlsx", limit=1000: {
            "filename": "policy_list.pdf",
            "filecontent": bytearray(b"pdf"),
            "content_type": "",
            "type": "",
        },
    )
    monkeypatch.setattr(list_exports.frappe, "response", {})

    list_exports.export_screen_list("policy_list", query={}, export_format="pdf", limit=10)

    assert list_exports.frappe.response["filename"] == "policy_list.pdf"
    assert list_exports.frappe.response["content_type"] == "application/pdf"
    assert list_exports.frappe.response["type"] == "download"
    assert list_exports.frappe.response["filecontent"] == b"pdf"


def test_export_tabular_payload_coerces_download_payload(monkeypatch):
    monkeypatch.setattr(list_exports, "assert_authenticated", lambda: None)
    monkeypatch.setattr(list_exports, "assert_doctype_permission", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        list_exports,
        "build_tabular_payload_export_response",
        lambda **kwargs: {
            "filename": "renewals.xlsx",
            "filecontent": "xlsx",
            "content_type": "",
            "type": "",
        },
    )
    monkeypatch.setattr(list_exports.frappe, "response", {})

    list_exports.export_tabular_payload(
        permission_doctypes=["AT Renewal Task"],
        query={"title": "Renewals"},
        export_format="xlsx",
    )

    assert list_exports.frappe.response["content_type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert list_exports.frappe.response["type"] == "download"
    assert list_exports.frappe.response["filecontent"] == b"xlsx"
