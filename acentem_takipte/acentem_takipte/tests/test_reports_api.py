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


def test_get_scheduled_report_configs_coerces_invalid_summary_shape(monkeypatch):
    monkeypatch.setattr(reports, "assert_authenticated", lambda: "Administrator")
    monkeypatch.setattr(reports, "assert_roles", lambda *args, **kwargs: None)
    monkeypatch.setattr(reports, "get_scheduled_report_config_summary", lambda: {"items": ["bad"], "total": -1})

    payload = reports.get_scheduled_report_configs()

    assert payload == {"items": [], "total": 0}


def test_save_scheduled_report_config_coerces_blank_index(monkeypatch):
    monkeypatch.setattr(reports, "assert_authenticated", lambda: "Administrator")
    monkeypatch.setattr(reports, "assert_post_request", lambda *args, **kwargs: None)
    monkeypatch.setattr(reports, "assert_roles", lambda *args, **kwargs: None)
    captured = {}
    monkeypatch.setattr(
        reports,
        "save_scheduled_report",
        lambda index=None, config=None: captured.update({"index": index, "config": config}) or {"ok": True},
    )

    reports.save_scheduled_report_config(index="", config={"report_key": "policy_list"})

    assert captured["index"] is None


def test_remove_scheduled_report_config_coerces_string_index(monkeypatch):
    monkeypatch.setattr(reports, "assert_authenticated", lambda: "Administrator")
    monkeypatch.setattr(reports, "assert_post_request", lambda *args, **kwargs: None)
    monkeypatch.setattr(reports, "assert_roles", lambda *args, **kwargs: None)
    captured = {}
    monkeypatch.setattr(
        reports,
        "remove_scheduled_report",
        lambda index: captured.update({"index": index}) or {"ok": True},
    )

    reports.remove_scheduled_report_config(index="2")

    assert captured["index"] == 2


def test_get_ops_alert_channel_settings_coerces_response_shape(monkeypatch):
    monkeypatch.setattr(reports, "assert_authenticated", lambda: "Administrator")
    monkeypatch.setattr(reports, "assert_roles", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        reports,
        "load_ops_alert_channel_settings",
        lambda: {
            "slack_webhook_url": " https://hooks.slack.test/services/demo ",
            "telegram_bot_token": " bot-token ",
            "telegram_chat_id": " 909781070 ",
            "slack_configured": 1,
            "telegram_configured": 1,
        },
    )

    payload = reports.get_ops_alert_channel_settings()

    assert payload == {
        "slack_webhook_url": "https://hooks.slack.test/services/demo",
        "telegram_bot_token": "bot-token",
        "telegram_chat_id": "909781070",
        "slack_configured": True,
        "telegram_configured": True,
    }


def test_save_ops_alert_channel_settings_api_passes_config(monkeypatch):
    monkeypatch.setattr(reports, "assert_authenticated", lambda: "Administrator")
    monkeypatch.setattr(reports, "assert_post_request", lambda *args, **kwargs: None)
    monkeypatch.setattr(reports, "assert_roles", lambda *args, **kwargs: None)
    captured = {}
    monkeypatch.setattr(
        reports,
        "save_ops_alert_channel_settings",
        lambda config=None: captured.update({"config": config}) or {"slack_configured": True},
    )

    payload = reports.save_ops_alert_channel_settings_api(config={"slack_webhook_url": "https://hooks.slack.test/services/demo"})

    assert captured["config"] == {"slack_webhook_url": "https://hooks.slack.test/services/demo"}
    assert payload["slack_configured"] is True


def test_send_ops_alert_channel_test_api_coerces_channels(monkeypatch):
    monkeypatch.setattr(reports, "assert_authenticated", lambda: "Administrator")
    monkeypatch.setattr(reports, "assert_post_request", lambda *args, **kwargs: None)
    monkeypatch.setattr(reports, "assert_roles", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        reports,
        "send_ops_alert_channel_test",
        lambda config=None: {"ok": True, "channels": ["Slack", "telegram", " "]},
    )

    payload = reports.send_ops_alert_channel_test_api(config={"telegram_chat_id": "909781070"})

    assert payload == {"ok": True, "channels": ["slack", "telegram"]}


def test_get_report_payload_coerces_json_filters_and_positive_limit(monkeypatch):
    monkeypatch.setattr(reports, "assert_authenticated", lambda: None)
    monkeypatch.setattr(reports, "assert_doctype_permission", lambda *args, **kwargs: None)
    monkeypatch.setattr(reports, "get_report_definition", lambda key: {"permission_doctype": "AT Policy"})
    captured = {}
    monkeypatch.setattr(
        reports,
        "build_safe_report_payload",
        lambda report_key, filters=None, limit=0: captured.update(
            {"report_key": report_key, "filters": filters, "limit": limit}
        ) or {"report_key": report_key},
    )

    reports._get_report_payload(" policy_list ", filters='{"office_branch":"Istanbul"}', limit=0)

    assert captured["report_key"] == "policy_list"
    assert captured["filters"] == {"office_branch": "Istanbul"}
    assert captured["limit"] == 1


def test_respond_with_report_file_coerces_invalid_download_payload(monkeypatch):
    monkeypatch.setattr(
        reports,
        "build_report_download_response",
        lambda **kwargs: {"filename": " ", "filecontent": None, "content_type": " ", "type": " "},
    )
    monkeypatch.setattr(reports.frappe, "response", {})

    reports._respond_with_report_file(
        report_key="policy_list",
        columns=[],
        rows=[],
        filters={},
        export_format="xlsx",
    )

    assert reports.frappe.response["filename"] == "report.xlsx"
    assert reports.frappe.response["type"] == "download"
    assert reports.frappe.response["content_type"] == "application/octet-stream"
    assert reports.frappe.response["filecontent"] == b""


def test_get_scheduled_report_configs_normalizes_summary_items(monkeypatch):
    monkeypatch.setattr(reports, "assert_authenticated", lambda: "Administrator")
    monkeypatch.setattr(reports, "assert_roles", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        reports,
        "get_scheduled_report_config_summary",
        lambda: {
            "items": [
                {
                    "index": "2",
                    "enabled": 1,
                    "report_key": " policy_list ",
                    "frequency": " DAILY ",
                    "format": " XLSX ",
                    "delivery_channel": " EMAIL ",
                    "locale": " tr-TR ",
                    "recipients": " a@example.com, a@example.com, b@example.com ",
                    "filters": '{"office_branch":"Istanbul"}',
                    "limit": 0,
                    "weekday": -1,
                    "day_of_month": 0,
                    "is_valid_report_key": 1,
                    "last_status": " SENT ",
                    "last_summary": '{"sent":1}',
                }
            ],
            "total": 0,
        },
    )

    payload = reports.get_scheduled_report_configs()

    assert payload["total"] == 1
    item = payload["items"][0]
    assert item["index"] == 2
    assert item["enabled"] is True
    assert item["report_key"] == "policy_list"
    assert item["frequency"] == "daily"
    assert item["format"] == "xlsx"
    assert item["delivery_channel"] == "email"
    assert item["locale"] == "tr-TR"
    assert item["recipients"] == ["a@example.com", "b@example.com"]
    assert item["filters"] == {"office_branch": "Istanbul"}
    assert item["limit"] == 1
    assert item["weekday"] == 0
    assert item["day_of_month"] == 1
    assert item["last_status"] == "sent"
    assert item["last_summary"] == {"sent": 1}


def test_respond_with_report_file_uses_filename_extension_for_content_type(monkeypatch):
    monkeypatch.setattr(
        reports,
        "build_report_download_response",
        lambda **kwargs: {"filename": "policy_list.pdf", "filecontent": bytearray(b"pdf"), "content_type": "", "type": ""},
    )
    monkeypatch.setattr(reports.frappe, "response", {})

    reports._respond_with_report_file(
        report_key="policy_list",
        columns=[],
        rows=[],
        filters={},
        export_format="pdf",
    )

    assert reports.frappe.response["content_type"] == "application/pdf"
    assert reports.frappe.response["filecontent"] == b"pdf"


def test_respond_with_report_file_encodes_string_filecontent(monkeypatch):
    monkeypatch.setattr(
        reports,
        "build_report_download_response",
        lambda **kwargs: {"filename": "policy_list.xlsx", "filecontent": "xlsx", "content_type": "", "type": "download"},
    )
    monkeypatch.setattr(reports.frappe, "response", {})

    reports._respond_with_report_file(
        report_key="policy_list",
        columns=[],
        rows=[],
        filters={},
        export_format="xlsx",
    )

    assert reports.frappe.response["content_type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert reports.frappe.response["filecontent"] == b"xlsx"


def test_get_report_payload_coerces_invalid_report_shape(monkeypatch):
    monkeypatch.setattr(reports, "assert_authenticated", lambda: None)
    monkeypatch.setattr(reports, "assert_doctype_permission", lambda *args, **kwargs: None)
    monkeypatch.setattr(reports, "get_report_definition", lambda key: {"permission_doctype": "AT Policy"})
    monkeypatch.setattr(reports, "build_safe_report_payload", lambda *args, **kwargs: {"report_key": " ", "columns": "name", "rows": {"bad": 1}, "filters": "status=Open"})

    payload = reports._get_report_payload(" policy_list ", filters='{"office_branch":"Istanbul"}', limit=0)

    assert payload["report_key"] == "policy_list"
    assert payload["columns"] == []
    assert payload["rows"] == []
    assert payload["filters"] == {"office_branch": "Istanbul"}


def test_get_report_payload_falls_back_when_safe_builder_returns_non_dict(monkeypatch):
    monkeypatch.setattr(reports, "assert_authenticated", lambda: None)
    monkeypatch.setattr(reports, "assert_doctype_permission", lambda *args, **kwargs: None)
    monkeypatch.setattr(reports, "get_report_definition", lambda key: {"permission_doctype": "AT Policy"})
    monkeypatch.setattr(reports, "build_safe_report_payload", lambda *args, **kwargs: None)

    payload = reports._get_report_payload("policy_list", filters={"status": "Open"}, limit=50)

    assert payload == {
        "report_key": "policy_list",
        "columns": [],
        "rows": [],
        "filters": {"status": "Open"},
    }


def test_save_scheduled_report_config_coerces_response_shape(monkeypatch):
    monkeypatch.setattr(reports, "assert_authenticated", lambda: "Administrator")
    monkeypatch.setattr(reports, "assert_post_request", lambda *args, **kwargs: None)
    monkeypatch.setattr(reports, "assert_roles", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        reports,
        "save_scheduled_report",
        lambda index=None, config=None: {"index": "2", "config": {"report_key": "policy_list"}},
    )

    payload = reports.save_scheduled_report_config(index=2, config={"report_key": "policy_list"})

    assert payload == {"ok": True, "index": 2, "config": {"report_key": "policy_list"}}


def test_remove_scheduled_report_config_coerces_remaining(monkeypatch):
    monkeypatch.setattr(reports, "assert_authenticated", lambda: "Administrator")
    monkeypatch.setattr(reports, "assert_post_request", lambda *args, **kwargs: None)
    monkeypatch.setattr(reports, "assert_roles", lambda *args, **kwargs: None)
    monkeypatch.setattr(reports, "remove_scheduled_report", lambda index: {"remaining": -5})

    payload = reports.remove_scheduled_report_config(index=2)

    assert payload == {"ok": True, "remaining": 0}

