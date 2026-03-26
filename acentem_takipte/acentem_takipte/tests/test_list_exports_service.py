from types import SimpleNamespace

from acentem_takipte.acentem_takipte.services import list_exports


def test_collect_dashboard_rows_paginates_until_total():
    pages = {
        1: {"rows": [{"name": "ROW-1"}, {"name": "ROW-2"}], "total": 3},
        2: {"rows": [{"name": "ROW-3"}], "total": 3},
    }

    def _fetcher(filters=None, page=1, page_length=20):
        return pages[page]

    rows = list_exports._collect_dashboard_rows(_fetcher, filters={"status": "Open"}, limit=10)

    assert [row["name"] for row in rows] == ["ROW-1", "ROW-2", "ROW-3"]


def test_collect_dashboard_rows_stops_on_non_dict_payload():
    rows = list_exports._collect_dashboard_rows(lambda **kwargs: "bad-payload", filters={}, limit=10)

    assert rows == []


def test_collect_dashboard_rows_ignores_non_dict_rows():
    pages = {1: {"rows": [{"name": "ROW-1"}, "bad-row", 123], "total": 1}}

    rows = list_exports._collect_dashboard_rows(lambda **kwargs: pages[kwargs["page"]], filters={}, limit=10)

    assert rows == [{"name": "ROW-1"}]


def test_build_screen_export_payload_formats_policy_rows(monkeypatch):
    monkeypatch.setattr(list_exports.frappe, "local", SimpleNamespace(lang="tr"))
    monkeypatch.setattr(
        list_exports.frappe,
        "get_list",
        lambda doctype, fields=None, filters=None, or_filters=None, order_by=None, limit_start=0, limit_page_length=0: [
            {
                "name": "POL-001",
                "policy_no": "P-001",
                "customer": "Açme",
                "insurance_company": "Demo Sigorta",
                "status": "Active",
                "currency": "TRY",
                "end_date": "2026-03-31",
                "gross_premium": 1250,
                "commission_amount": 175,
                "commission": None,
                "gwp_try": 1250,
                "modified": "2026-03-10 09:15:00",
            }
        ],
    )

    payload = list_exports.build_screen_export_payload(
        "policy_list",
        query={"filters": {"status": "Active"}, "order_by": "modified desc"},
        limit=100,
    )

    assert payload["columns"][0] == "Kayıt No"
    assert payload["rows"][0]["Kayıt No"] == "POL-001"
    assert payload["rows"][0]["Komisyon"] == "175.00 TRY"


def test_build_screen_export_payload_handles_invalid_json_query(monkeypatch):
    monkeypatch.setattr(list_exports.frappe, "local", SimpleNamespace(lang="tr"))
    monkeypatch.setattr(
        list_exports.frappe,
        "get_list",
        lambda *args, **kwargs: [],
    )

    payload = list_exports.build_screen_export_payload("policy_list", query="{invalid-json}", limit=100)

    assert payload["filters"] == {}
    assert payload["rows"] == []


def test_build_screen_export_payload_uses_full_locale_before_base_locale(monkeypatch):
    monkeypatch.setattr(list_exports.frappe, "local", SimpleNamespace(lang="tr-TR"))
    monkeypatch.setattr(
        list_exports.frappe,
        "get_list",
        lambda *args, **kwargs: [],
    )
    original_columns = list_exports.SCREEN_EXPORTS["policy_list"]["columns"]
    monkeypatch.setitem(
        list_exports.SCREEN_EXPORTS["policy_list"],
        "columns",
        [
            {
                "field": "policy_no",
                "label": {"tr-TR": "Poliçe No", "tr": "Poliçe No", "en": "Policy No"},
                "formatter": None,
                "currency_field": None,
                "getter": None,
            }
        ],
    )

    try:
        payload = list_exports.build_screen_export_payload("policy_list", query={}, limit=100)
    finally:
        monkeypatch.setitem(list_exports.SCREEN_EXPORTS["policy_list"], "columns", original_columns)

    assert payload["columns"] == ["Poliçe No"]


def test_build_tabular_payload_export_response_uses_given_columns(monkeypatch):
    calls = []

    monkeypatch.setattr(
        list_exports,
        "build_tabular_download_response",
        lambda **kwargs: calls.append(kwargs) or {"filename": "aux.xlsx"},
    )

    response = list_exports.build_tabular_payload_export_response(
        query={
            "export_key": "aux_tasks",
            "title": "Tasks",
            "columns": ["Task", "Due"],
            "rows": [{"Task": "RT-0001", "Due": "2026-03-11", "Extra": "ignored"}],
            "filters": {"status": "Open"},
        },
        export_format="xlsx",
    )

    assert response == {"filename": "aux.xlsx"}
    assert calls[0]["export_key"] == "aux_tasks"
    assert calls[0]["title"] == "Tasks"
    assert calls[0]["columns"] == ["Task", "Due"]
    assert calls[0]["rows"] == [{"Task": "RT-0001", "Due": "2026-03-11"}]
    assert calls[0]["filters"] == {"status": "Open"}


def test_build_tabular_payload_export_response_handles_invalid_json(monkeypatch):
    calls = []

    monkeypatch.setattr(
        list_exports,
        "build_tabular_download_response",
        lambda **kwargs: calls.append(kwargs) or {"filename": "aux.xlsx"},
    )

    response = list_exports.build_tabular_payload_export_response(
        query="{invalid-json}",
        export_format="xlsx",
    )

    assert response == {"filename": "aux.xlsx"}
    assert calls[0]["export_key"] == "workbench"
    assert calls[0]["columns"] == []
    assert calls[0]["rows"] == []
    assert calls[0]["filters"] == {}


def test_build_tabular_payload_export_response_trims_blank_title(monkeypatch):
    calls = []

    monkeypatch.setattr(
        list_exports,
        "build_tabular_download_response",
        lambda **kwargs: calls.append(kwargs) or {"filename": "aux.xlsx"},
    )

    list_exports.build_tabular_payload_export_response(
        query={"export_key": "aux_tasks", "title": "   ", "rows": [{"Task": "RT-0001"}]},
        export_format="xlsx",
    )

    assert calls[0]["title"] == "aux_tasks"


def test_build_tabular_payload_export_response_infers_columns_from_rows(monkeypatch):
    calls = []

    monkeypatch.setattr(
        list_exports,
        "build_tabular_download_response",
        lambda **kwargs: calls.append(kwargs) or {"filename": "aux.xlsx"},
    )

    list_exports.build_tabular_payload_export_response(
        query={
            "export_key": "aux_tasks",
            "rows": [{"Task": "RT-0001", "Due": "2026-03-11"}],
            "filters": {"status": "Open"},
        },
        export_format="xlsx",
    )

    assert calls[0]["columns"] == ["Task", "Due"]
    assert calls[0]["rows"] == [{"Task": "RT-0001", "Due": "2026-03-11"}]


def test_build_tabular_payload_export_response_accepts_comma_separated_columns(monkeypatch):
    calls = []

    monkeypatch.setattr(
        list_exports,
        "build_tabular_download_response",
        lambda **kwargs: calls.append(kwargs) or {"filename": "aux.xlsx"},
    )

    list_exports.build_tabular_payload_export_response(
        query={
            "export_key": "aux_tasks",
            "columns": "Task, Due, Task",
            "rows": [{"Task": "RT-0001", "Due": "2026-03-11"}],
        },
        export_format="xlsx",
    )

    assert calls[0]["columns"] == ["Task", "Due"]


def test_build_tabular_payload_export_response_deduplicates_columns(monkeypatch):
    calls = []

    monkeypatch.setattr(
        list_exports,
        "build_tabular_download_response",
        lambda **kwargs: calls.append(kwargs) or {"filename": "aux.xlsx"},
    )

    list_exports.build_tabular_payload_export_response(
        query={
            "export_key": "aux_tasks",
            "columns": ["Task", "Due", "Task", " "],
            "rows": [{"Task": "RT-0001", "Due": "2026-03-11"}],
        },
        export_format="xlsx",
    )

    assert calls[0]["columns"] == ["Task", "Due"]


def test_build_tabular_payload_export_response_ignores_invalid_filter_shape(monkeypatch):
    calls = []

    monkeypatch.setattr(
        list_exports,
        "build_tabular_download_response",
        lambda **kwargs: calls.append(kwargs) or {"filename": "aux.xlsx"},
    )

    list_exports.build_tabular_payload_export_response(
        query={
            "export_key": "aux_tasks",
            "columns": ["Task"],
            "rows": [{"Task": "RT-0001"}],
            "filters": "status=Open",
        },
        export_format="xlsx",
    )

    assert calls[0]["filters"] == {}


def test_build_tabular_payload_export_response_accepts_json_filter_string(monkeypatch):
    calls = []

    monkeypatch.setattr(
        list_exports,
        "build_tabular_download_response",
        lambda **kwargs: calls.append(kwargs) or {"filename": "aux.xlsx"},
    )

    list_exports.build_tabular_payload_export_response(
        query={
            "export_key": "aux_tasks",
            "columns": ["Task"],
            "rows": [{"Task": "RT-0001"}],
            "filters": '{"status":"Open"}',
        },
        export_format="xlsx",
    )

    assert calls[0]["filters"] == {"status": "Open"}


def test_build_screen_export_payload_ignores_invalid_filter_shapes(monkeypatch):
    monkeypatch.setattr(list_exports.frappe, "local", SimpleNamespace(lang="tr"))
    captured = {}
    monkeypatch.setattr(
        list_exports.frappe,
        "get_list",
        lambda doctype, fields=None, filters=None, or_filters=None, order_by=None, limit_start=0, limit_page_length=0: captured.update(
            {"filters": filters, "or_filters": or_filters, "order_by": order_by}
        ) or [],
    )

    list_exports.build_screen_export_payload(
        "policy_list",
        query={"filters": "status=Active", "or_filters": "bad-shape", "order_by": "  "},
        limit=100,
    )

    assert captured["filters"] == {}
    assert captured["or_filters"] is None
    assert captured["order_by"] == "modified desc"


def test_build_screen_export_payload_accepts_json_filter_shapes(monkeypatch):
    monkeypatch.setattr(list_exports.frappe, "local", SimpleNamespace(lang="tr"))
    captured = {}
    monkeypatch.setattr(
        list_exports.frappe,
        "get_list",
        lambda doctype, fields=None, filters=None, or_filters=None, order_by=None, limit_start=0, limit_page_length=0: captured.update(
            {"filters": filters, "or_filters": or_filters}
        ) or [],
    )

    list_exports.build_screen_export_payload(
        "policy_list",
        query={"filters": '{"status":"Active"}', "or_filters": '[["status","=","Open"]]'},
        limit=100,
    )

    assert captured["filters"] == {"status": "Active"}
    assert captured["or_filters"] == [["status", "=", "Open"]]


def test_build_tabular_payload_export_response_ignores_invalid_rows_shape(monkeypatch):
    calls = []

    monkeypatch.setattr(
        list_exports,
        "build_tabular_download_response",
        lambda **kwargs: calls.append(kwargs) or {"filename": "aux.xlsx"},
    )

    list_exports.build_tabular_payload_export_response(
        query={
            "export_key": "aux_tasks",
            "columns": ["Task"],
            "rows": {"Task": "RT-0001"},
        },
        export_format="xlsx",
    )

    assert calls[0]["rows"] == []


def test_format_value_accepts_extended_boolean_tokens():
    assert list_exports._format_value("evet", formatter="boolean", locale="tr") == "Evet"
    assert list_exports._format_value("on", formatter="boolean", locale="en") == "Yes"


def test_normalize_payload_value_falls_back_when_json_encode_fails(monkeypatch):
    monkeypatch.setattr(list_exports.frappe, "as_json", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("boom")))

    value = list_exports._normalize_payload_value({"status": "Open"})

    assert value == "{'status': 'Open'}"


def test_build_tabular_payload_export_response_accepts_mapping_rows(monkeypatch):
    class MappingRow:
        def items(self):
            return {"Task": "RT-0001", "Due": "2026-03-11"}.items()

    calls = []
    monkeypatch.setattr(
        list_exports,
        "build_tabular_download_response",
        lambda **kwargs: calls.append(kwargs) or {"filename": "aux.xlsx"},
    )

    list_exports.build_tabular_payload_export_response(
        query={"export_key": "aux_tasks", "rows": [MappingRow()]},
        export_format="xlsx",
    )

    assert calls[0]["columns"] == ["Task", "Due"]
    assert calls[0]["rows"] == [{"Task": "RT-0001", "Due": "2026-03-11"}]

