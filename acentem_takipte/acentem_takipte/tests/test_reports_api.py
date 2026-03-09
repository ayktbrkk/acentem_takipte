import pytest

from acentem_takipte.acentem_takipte.api import reports


@pytest.mark.parametrize(
    ("method_name", "report_key", "permission_doctype"),
    [
        ("get_policy_list_report", "policy_list", "AT Policy"),
        ("get_payment_status_report", "payment_status", "AT Payment"),
        ("get_renewal_performance_report", "renewal_performance", "AT Renewal Task"),
        ("get_claim_loss_ratio_report", "claim_loss_ratio", "AT Claim"),
        ("get_agent_performance_report", "agent_performance", "AT Policy"),
        ("get_customer_segmentation_report", "customer_segmentation", "AT Customer"),
    ],
)
def test_report_getters_enforce_auth_and_build_payload(monkeypatch, method_name, report_key, permission_doctype):
    calls = []

    monkeypatch.setattr(reports, "assert_authenticated", lambda: calls.append(("auth", None)))
    monkeypatch.setattr(
        reports,
        "assert_doctype_permission",
        lambda doctype, permtype: calls.append(("perm", doctype, permtype)),
    )
    monkeypatch.setattr(
        reports,
        "get_report_definition",
        lambda key: {"permission_doctype": permission_doctype} if key == report_key else {},
    )
    monkeypatch.setattr(
        reports,
        "build_report_payload",
        lambda key, filters=None, limit=500: {
            "report_key": key,
            "columns": ["name", "status"],
            "rows": [{"name": "ROW-001", "status": "Active"}],
            "filters": filters or {},
            "limit": limit,
        },
    )

    payload = getattr(reports, method_name)(filters={"office_branch": "BR-IST"}, limit=100)

    assert payload["report_key"] == report_key
    assert payload["rows"][0]["name"] == "ROW-001"
    assert calls == [
        ("auth", None),
        ("perm", permission_doctype, "read"),
    ]


def test_export_policy_list_report_sets_download_response(monkeypatch):
    monkeypatch.setattr(
        reports,
        "get_policy_list_report",
        lambda filters=None, limit=1000: {
            "report_key": "policy_list",
            "columns": ["name"],
            "rows": [{"name": "POL-001"}],
            "filters": {"office_branch": "BR-IST"},
        },
    )
    monkeypatch.setattr(reports, "render_report_xlsx", lambda **kwargs: b"xlsx-bytes")
    monkeypatch.setattr(reports, "build_report_filename", lambda report_key, export_format: "policy_list.xlsx")
    monkeypatch.setattr(reports.frappe, "response", {})

    reports.export_policy_list_report(filters={"office_branch": "FORBIDDEN"}, export_format="xlsx", limit=100)

    assert reports.frappe.response["filename"] == "policy_list.xlsx"
    assert reports.frappe.response["filecontent"] == b"xlsx-bytes"
    assert reports.frappe.response["type"] == "download"


def test_export_payment_status_report_sets_pdf_response(monkeypatch):
    monkeypatch.setattr(
        reports,
        "get_payment_status_report",
        lambda filters=None, limit=1000: {
            "report_key": "payment_status",
            "columns": ["name"],
            "rows": [{"name": "PAY-001"}],
            "filters": {"office_branch": "BR-ANK"},
        },
    )
    monkeypatch.setattr(reports, "render_report_pdf", lambda **kwargs: b"pdf-bytes")
    monkeypatch.setattr(reports, "build_report_filename", lambda report_key, export_format: "payment_status.pdf")
    monkeypatch.setattr(reports.frappe, "response", {})

    reports.export_payment_status_report(filters={"office_branch": "FORBIDDEN"}, export_format="pdf", limit=100)

    assert reports.frappe.response["filename"] == "payment_status.pdf"
    assert reports.frappe.response["filecontent"] == b"pdf-bytes"
    assert reports.frappe.response["content_type"] == "application/pdf"


def test_export_agent_performance_report_sets_download_response(monkeypatch):
    monkeypatch.setattr(
        reports,
        "get_agent_performance_report",
        lambda filters=None, limit=1000: {
            "report_key": "agent_performance",
            "columns": ["sales_entity", "offer_conversion_rate", "renewal_success_rate"],
            "rows": [{"sales_entity": "AGENT-001", "offer_conversion_rate": 66.7, "renewal_success_rate": 80.0}],
            "filters": {"office_branch": "BR-IST"},
        },
    )
    monkeypatch.setattr(reports, "render_report_xlsx", lambda **kwargs: b"xlsx-bytes")
    monkeypatch.setattr(reports, "build_report_filename", lambda report_key, export_format: "agent_performance.xlsx")
    monkeypatch.setattr(reports.frappe, "response", {})

    reports.export_agent_performance_report(filters={"office_branch": "BR-IST"}, export_format="xlsx", limit=250)

    assert reports.frappe.response["filename"] == "agent_performance.xlsx"
    assert reports.frappe.response["filecontent"] == b"xlsx-bytes"
    assert reports.frappe.response["type"] == "download"


def test_export_customer_segmentation_report_sets_download_response(monkeypatch):
    monkeypatch.setattr(
        reports,
        "get_customer_segmentation_report",
        lambda filters=None, limit=1000: {
            "report_key": "customer_segmentation",
            "columns": ["name", "claim_history_segment", "loyalty_segment"],
            "rows": [{"name": "CUST-001", "claim_history_segment": "Hasarli", "loyalty_segment": "Sadik"}],
            "filters": {"office_branch": "BR-ANK"},
        },
    )
    monkeypatch.setattr(reports, "render_report_pdf", lambda **kwargs: b"pdf-bytes")
    monkeypatch.setattr(
        reports,
        "build_report_filename",
        lambda report_key, export_format: "customer_segmentation.pdf",
    )
    monkeypatch.setattr(reports.frappe, "response", {})

    reports.export_customer_segmentation_report(filters={"office_branch": "BR-ANK"}, export_format="pdf", limit=150)

    assert reports.frappe.response["filename"] == "customer_segmentation.pdf"
    assert reports.frappe.response["filecontent"] == b"pdf-bytes"
    assert reports.frappe.response["content_type"] == "application/pdf"


def test_build_report_payload_safe_normalizes_non_positive_limit(monkeypatch):
    captured = {}

    monkeypatch.setattr(
        reports,
        "build_report_payload",
        lambda key, filters=None, limit=500: captured.setdefault("payload", {"report_key": key, "limit": limit}),
    )

    payload = reports._build_report_payload_safe("policy_list", filters={"status": "Active"}, limit=0)

    assert payload["limit"] == 1
    assert payload["report_key"] == "policy_list"


def test_report_payload_error_is_wrapped_and_logged(monkeypatch):
    monkeypatch.setattr(reports, "assert_authenticated", lambda: None)
    monkeypatch.setattr(reports, "assert_doctype_permission", lambda doctype, permtype: None)
    monkeypatch.setattr(
        reports,
        "build_report_payload",
        lambda report_key, filters=None, limit=500: (_ for _ in ()).throw(ValueError("db down")),
    )
    captured = {}
    monkeypatch.setattr(
        reports,
        "log_redacted_error",
        lambda message, details=None, traceback_text=None: captured.update(
            {"message": message, "details": details, "traceback_text": traceback_text}
        ),
    )

    def _raise(message):
        raise RuntimeError(message)

    monkeypatch.setattr(reports.frappe, "throw", _raise)

    with pytest.raises(RuntimeError, match="Report cannot be loaded"):
        reports.get_policy_list_report(filters={"status": "Active"}, limit=20)

    assert captured["message"] == "Report payload build failed"
    assert captured["details"]["report_key"] == "policy_list"
    assert captured["details"]["filters"] == {"status": "Active"}
    assert captured["details"]["limit"] == 20
