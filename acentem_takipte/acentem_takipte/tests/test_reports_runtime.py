from types import SimpleNamespace

from acentem_takipte.acentem_takipte.services import reports_runtime
from acentem_takipte.acentem_takipte.utils.i18n import translate_text


def test_normalize_export_format_accepts_pdf_and_defaults_to_xlsx():
    assert reports_runtime.normalize_export_format("pdf") == "pdf"
    assert reports_runtime.normalize_export_format("PDF") == "pdf"
    assert reports_runtime.normalize_export_format("application/pdf") == "pdf"
    assert reports_runtime.normalize_export_format("application/x-pdf") == "pdf"
    assert reports_runtime.normalize_export_format("xls") == "xlsx"
    assert reports_runtime.normalize_export_format("xlsm") == "xlsx"
    assert reports_runtime.normalize_export_format("xlsb") == "xlsx"
    assert reports_runtime.normalize_export_format("excel") == "xlsx"
    assert reports_runtime.normalize_export_format("application/vnd.ms-excel") == "xlsx"
    assert reports_runtime.normalize_export_format("xlsx") == "xlsx"
    assert reports_runtime.normalize_export_format(None) == "xlsx"
    assert reports_runtime.normalize_export_format("unknown") == "xlsx"


def test_get_scheduled_report_config_summary_returns_empty_on_error(monkeypatch):
    captured = {}

    def _log_redacted_error(message, details=None):
        captured["message"] = message
        captured["details"] = details or {}

    monkeypatch.setattr(reports_runtime, "summarize_scheduled_report_configs", lambda: 1 / 0)
    monkeypatch.setattr(reports_runtime, "log_redacted_error", _log_redacted_error)

    result = reports_runtime.get_scheduled_report_config_summary()

    assert result["items"] == []
    assert result["total"] == 0
    assert captured["message"] == "Scheduled report config summary failed"


def test_get_scheduled_report_config_summary_coerces_invalid_shape(monkeypatch):
    monkeypatch.setattr(
        reports_runtime,
        "summarize_scheduled_report_configs",
        lambda: [
            {
                "report_key": " production-summary ",
                "label": " ",
                "frequency": "",
                "delivery_channel": " sms ",
                "recipients": "ops@example.com, finance@example.com",
                "locale": " tr-TR ",
                "last_status": None,
            },
            "bad",
        ],
    )

    result = reports_runtime.get_scheduled_report_config_summary()

    assert result["total"] == 2
    assert result["items"][0]["report_key"] == "production-summary"
    assert result["items"][0]["label"] == "production-summary"
    assert result["items"][0]["frequency"] == "daily"
    assert result["items"][0]["channel"] == "sms"
    assert result["items"][0]["recipients"] == ["ops@example.com", "finance@example.com"]
    assert result["items"][0]["locale"] == "tr-TR"
    assert result["items"][1]["report_key"] == "report"


def test_build_tabular_download_response_handles_none_rows(monkeypatch):
    monkeypatch.setattr(reports_runtime, "build_export_filename", lambda *args, **kwargs: "report.xlsx")
    monkeypatch.setattr(reports_runtime, "render_tabular_xlsx", lambda **kwargs: b"xlsx")

    response = reports_runtime.build_tabular_download_response(
        export_key="policy_list",
        title="Policy List",
        columns=None,
        rows=None,
        filters=None,
        export_format="xlsx",
    )

    assert response["filename"] == "report.xlsx"
    assert response["type"] == "download"
    assert response["content_type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def test_build_tabular_download_response_trims_blank_title(monkeypatch):
    captured = {}
    monkeypatch.setattr(reports_runtime, "build_export_filename", lambda *args, **kwargs: "report.xlsx")
    monkeypatch.setattr(
        reports_runtime,
        "render_tabular_xlsx",
        lambda **kwargs: captured.update({"title": kwargs["title"]}) or b"xlsx",
    )

    reports_runtime.build_tabular_download_response(
        export_key="policy_list",
        title="   ",
        columns=["name"],
        rows=[{"name": "POL-001"}],
        filters={},
        export_format="xlsx",
    )

    assert captured["title"] == "policy_list"


def test_build_tabular_download_response_uses_full_locale_before_base_locale(monkeypatch):
    captured = {}
    monkeypatch.setattr(reports_runtime, "build_export_filename", lambda *args, **kwargs: "report.xlsx")
    monkeypatch.setattr(
        reports_runtime,
        "render_tabular_xlsx",
        lambda **kwargs: captured.update({"title": kwargs["title"]}) or b"xlsx",
    )
    monkeypatch.setattr(reports_runtime.frappe, "local", SimpleNamespace(lang="tr-TR"), raising=False)

    reports_runtime.build_tabular_download_response(
        export_key="policy_list",
        title={"tr-TR": "Policy List", "tr": "Policy List", "en": "Policy List"},
        columns=["name"],
        rows=[{"name": "POL-001"}],
        filters={},
        export_format="xlsx",
    )

    assert captured["title"] == translate_text("Policy List", "tr-TR")


def test_build_safe_report_payload_logs_and_throws(monkeypatch):
    captured = {}

    def _log_redacted_error(message, details=None):
        captured["message"] = message
        captured["details"] = details or {}

    monkeypatch.setattr(reports_runtime, "build_report_payload", lambda *args, **kwargs: 1 / 0)
    monkeypatch.setattr(reports_runtime, "log_redacted_error", _log_redacted_error)
    monkeypatch.setattr(reports_runtime, "_", lambda text: text)
    monkeypatch.setattr(reports_runtime.frappe, "throw", lambda *args, **kwargs: (_ for _ in ()).throw(Exception("boom")))

    try:
        reports_runtime.build_safe_report_payload("policy_list", filters={"branch": "Kasko"}, limit=10)
    except Exception as exc:
        assert str(exc) == "boom"

    assert captured["message"] == "Report payload build failed"
    assert captured["details"]["report_key"] == "policy_list"


def test_build_download_response_ignores_invalid_payload_shapes(monkeypatch):
    captured = {}
    monkeypatch.setattr(reports_runtime, "build_export_filename", lambda *args, **kwargs: "report.xlsx")
    monkeypatch.setattr(
        reports_runtime,
        "render_tabular_xlsx",
        lambda **kwargs: captured.update(kwargs) or b"xlsx",
    )

    response = reports_runtime.build_tabular_download_response(
        export_key="policy_list",
        title="Policy List",
        columns="name",
        rows={"name": "POL-001"},
        filters="status=Open",
        export_format="xlsx",
    )

    assert response["filename"] == "report.xlsx"
    assert captured["columns"] == ["name"]
    assert captured["rows"] == []
    assert captured["filters"] == {}


def test_save_scheduled_report_handles_invalid_json_config(monkeypatch):
    captured = {}
    monkeypatch.setattr(
        reports_runtime,
        "upsert_scheduled_report_config",
        lambda index, config: captured.update({"index": index, "config": config}) or {"index": 1, "config": config},
    )

    payload = reports_runtime.save_scheduled_report(index=1, config="{invalid-json}")

    assert payload["ok"] is True
    assert captured["config"] == {}


def test_save_scheduled_report_handles_non_dict_json_config(monkeypatch):
    captured = {}
    monkeypatch.setattr(reports_runtime.frappe, "parse_json", lambda value: ["bad-shape"], raising=False)
    monkeypatch.setattr(
        reports_runtime,
        "upsert_scheduled_report_config",
        lambda index, config: captured.update({"config": config}) or {"index": 1, "config": config},
    )

    reports_runtime.save_scheduled_report(index=1, config='["bad-shape"]')

    assert captured["config"] == {}


def test_save_scheduled_report_coerces_response_shape(monkeypatch):
    monkeypatch.setattr(
        reports_runtime,
        "upsert_scheduled_report_config",
        lambda index, config: {
            "index": "5",
            "config": {
                "report_key": " production-summary ",
                "label": " ",
                "delivery_channel": " sms ",
                "recipients": "ops@example.com",
                "filters": '{"status":"Open"}',
                "format": " application/pdf ",
                "locale": " tr-TR ",
            },
        },
    )

    payload = reports_runtime.save_scheduled_report(index=2, config={"report_key": "production-summary"})

    assert payload["ok"] is True
    assert payload["index"] == 5
    assert payload["config"]["report_key"] == "production-summary"
    assert payload["config"]["label"] == "production-summary"
    assert payload["config"]["channel"] == "sms"
    assert payload["config"]["recipients"] == ["ops@example.com"]
    assert payload["config"]["filters"] == {"status": "Open"}
    assert payload["config"]["format"] == "pdf"
    assert payload["config"]["locale"] == "tr-TR"


def test_remove_scheduled_report_coerces_remaining(monkeypatch):
    monkeypatch.setattr(
        reports_runtime,
        "delete_scheduled_report_config",
        lambda index: {"remaining": "-4"},
    )

    payload = reports_runtime.remove_scheduled_report(3)

    assert payload == {"ok": True, "index": 0, "remaining": 0}


def test_build_download_response_accepts_string_columns_and_json_filters(monkeypatch):
    captured = {}
    monkeypatch.setattr(reports_runtime, "build_export_filename", lambda *args, **kwargs: "report.xlsx")
    monkeypatch.setattr(
        reports_runtime,
        "render_tabular_xlsx",
        lambda **kwargs: captured.update(kwargs) or b"xlsx",
    )

    response = reports_runtime.build_tabular_download_response(
        export_key="policy_list",
        title="Policy List",
        columns="name, amount, name",
        rows=[{"name": "A", "amount": 3}],
        filters='{"status":"Open"}',
        export_format="xlsx",
    )

    assert response["filename"] == "report.xlsx"
    assert captured["columns"] == ["name", "amount"]
    assert captured["filters"] == {"status": "Open"}


def test_build_safe_report_payload_coerces_json_filters(monkeypatch):
    captured = {}
    monkeypatch.setattr(
        reports_runtime,
        "build_report_payload",
        lambda report_key, filters=None, limit=0: captured.update({"filters": filters, "limit": limit}) or {"ok": True},
    )

    payload = reports_runtime.build_safe_report_payload("policy_list", '{"branch":"OTO"}', 5)

    assert payload == {"ok": True}
    assert captured["filters"] == {"branch": "OTO"}
    assert captured["limit"] == 5


def test_build_tabular_download_response_trims_title_before_render(monkeypatch):
    captured = {}
    monkeypatch.setattr(reports_runtime, "build_export_filename", lambda *args, **kwargs: "report.xlsx")
    monkeypatch.setattr(
        reports_runtime,
        "render_tabular_xlsx",
        lambda **kwargs: captured.update(kwargs) or b"xlsx",
    )

    reports_runtime.build_tabular_download_response(
        export_key="policy_list",
        title="  Policy List  ",
        columns=["name"],
        rows=[{"name": "A"}],
        filters={},
        export_format="xlsx",
    )

    assert captured["title"] == "Policy List"


def test_build_tabular_download_response_accepts_mapping_rows(monkeypatch):
    class MappingRow:
        def items(self):
            return {"name": "A"}.items()

    captured = {}
    monkeypatch.setattr(reports_runtime, "build_export_filename", lambda *args, **kwargs: "report.xlsx")
    monkeypatch.setattr(
        reports_runtime,
        "render_tabular_xlsx",
        lambda **kwargs: captured.update(kwargs) or b"xlsx",
    )

    reports_runtime.build_tabular_download_response(
        export_key="policy_list",
        title="Policy List",
        columns=["name"],
        rows=[MappingRow()],
        filters={},
        export_format="xlsx",
    )

    assert captured["rows"] == [{"name": "A"}]


def test_build_safe_report_payload_trims_report_key(monkeypatch):
    captured = {}
    monkeypatch.setattr(
        reports_runtime,
        "build_report_payload",
        lambda report_key, filters=None, limit=0: captured.update({"report_key": report_key}) or {"ok": True},
    )

    reports_runtime.build_safe_report_payload(" policy_list ", {}, 5)

    assert captured["report_key"] == "policy_list"


def test_build_tabular_download_response_uses_trimmed_export_key_fallback(monkeypatch):
    captured = {}
    monkeypatch.setattr(reports_runtime, "build_export_filename", lambda *args, **kwargs: "report.xlsx")
    monkeypatch.setattr(
        reports_runtime,
        "render_tabular_xlsx",
        lambda **kwargs: captured.update(kwargs) or b"xlsx",
    )

    reports_runtime.build_tabular_download_response(
        export_key=" policy_list ",
        title="   ",
        columns=["name"],
        rows=[{"name": "A"}],
        filters={},
        export_format="xlsx",
    )

    assert captured["title"] == "policy_list"

