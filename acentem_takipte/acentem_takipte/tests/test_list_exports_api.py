import pytest
from types import SimpleNamespace

import frappe
from acentem_takipte.acentem_takipte.api import list_exports


@pytest.fixture(autouse=True)
def _ensure_test_flags():
    previous_flags = getattr(frappe.local, "flags", None)
    frappe.local.flags = SimpleNamespace(in_test=True)
    try:
        yield
    finally:
        if previous_flags is None:
            try:
                del frappe.local.flags
            except Exception:
                pass
        else:
            frappe.local.flags = previous_flags


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


def test_download_export_builds_query_and_sets_download_response(monkeypatch):
    monkeypatch.setattr(list_exports, "assert_authenticated", lambda: None)
    monkeypatch.setattr(list_exports, "assert_doctype_permission", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        list_exports,
        "get_screen_export_definition",
        lambda screen: {"permission_doctype": "AT Claim"},
    )
    captured = {}

    def _fake_build(screen, query=None, export_format="xlsx", limit=1000):
        captured["screen"] = screen
        captured["query"] = query
        captured["export_format"] = export_format
        captured["limit"] = limit
        return {
            "filename": "claims_board.xlsx",
            "filecontent": b"xlsx-bytes",
            "type": "download",
            "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }

    monkeypatch.setattr(list_exports, "build_screen_export_response", _fake_build)
    monkeypatch.setattr(list_exports.frappe, "response", {})
    monkeypatch.setattr(list_exports.frappe, "form_dict", {})

    list_exports.download_export(
        "claims_board",
        export_format="xlsx",
        start_date="2026-03-01",
        end_date="2026-03-31",
        status="Open",
        filename="hasar_export",
    )

    assert captured["screen"] == "claims_board"
    assert captured["query"]["filters"]["claim_status"] == "Open"
    assert list_exports.frappe.response["filename"] == "hasar_export.xlsx"
    assert list_exports.frappe.response["filecontent"] == b"xlsx-bytes"


def test_download_export_policy_list_without_query_uses_qualified_order_by(monkeypatch):
    """Regression: /data-export policy_list with no query must not pass bare modified to get_list."""
    monkeypatch.setattr(list_exports, "assert_authenticated", lambda: None)
    monkeypatch.setattr(list_exports, "assert_doctype_permission", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        list_exports,
        "get_screen_export_definition",
        lambda screen: {"permission_doctype": "AT Policy"},
    )
    captured = {}

    def _fake_build(screen, query=None, export_format="xlsx", limit=1000):
        captured["screen"] = screen
        captured["query"] = query
        captured["export_format"] = export_format
        captured["limit"] = limit
        return {
            "filename": "policy_list_workbench.xlsx",
            "filecontent": b"xlsx-bytes",
            "type": "download",
            "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }

    monkeypatch.setattr(list_exports, "build_screen_export_response", _fake_build)
    monkeypatch.setattr(list_exports.frappe, "response", {})
    monkeypatch.setattr(list_exports.frappe, "form_dict", {})

    list_exports.download_export("policy_list", export_format="xlsx", limit=5000)

    assert captured["screen"] == "policy_list"
    assert captured["query"]["order_by"] == "`tabAT Policy`.modified desc"
    assert captured["export_format"] == "xlsx"
    assert captured["limit"] == 5000


def test_build_workbench_export_query_maps_claim_status():
    from acentem_takipte.acentem_takipte.services.list_exports import build_workbench_export_query

    query = build_workbench_export_query(
        "claims_board",
        start_date="2026-03-01",
        end_date="2026-03-31",
        status="Open",
    )

    assert query["filters"]["claim_status"] == "Open"
    assert query["filters"]["incident_date"] == ["between", ["2026-03-01", "2026-03-31"]]


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
    assert payload["title"] == "report"
    assert payload["columns"] == ["Policy No"]
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

