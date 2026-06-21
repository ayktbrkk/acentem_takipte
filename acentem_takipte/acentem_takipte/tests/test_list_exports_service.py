from types import SimpleNamespace

import pytest

from acentem_takipte.acentem_takipte.services import list_exports
from acentem_takipte.acentem_takipte.utils.i18n import translate_text


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
                "customer": "CUST-001",
                "customer_full_name": "Acme A.Ş.",
                "customer_customer_type": "Corporate",
                "customer_masked_tax_id": "12*******01",
                "insurance_company": "Demo Sigorta",
                "branch": "Kasko",
                "status": "Active",
                "currency": "TRY",
                "issue_date": "2026-03-01",
                "end_date": "2026-03-31",
                "gross_premium": 1250,
                "commission_amount": 175,
            }
        ],
    )

    payload = list_exports.build_screen_export_payload(
        "policy_list",
        query={"filters": {"status": "Active"}, "order_by": "modified desc"},
        limit=100,
    )

    assert payload["title"] == translate_text("Policy List", "tr")
    assert payload["columns"][0] == translate_text("Record Number", "tr")
    assert payload["columns"][1] == translate_text("Policy No", "tr")
    assert payload["rows"][0][translate_text("Record Number", "tr")] == "POL-001"
    assert payload["rows"][0][translate_text("Policy No", "tr")] == "P-001"
    assert payload["rows"][0][translate_text("Customer", "tr")] == "Acme A.Ş."
    assert payload["rows"][0][translate_text("Commission", "tr")] == "175.00 TRY"


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
                "label": {
                    "tr-TR": "Carrier Policy Number",
                    "tr": "Carrier Policy Number",
                    "en": "Carrier Policy Number",
                },
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

    assert payload["columns"] == [translate_text("Carrier Policy Number", "tr-TR")]


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
    assert captured["order_by"] == "`tabAT Policy`.`modified` desc"


def test_qualified_order_by_qualifies_joined_doctype_fields():
    assert (
        list_exports._qualified_order_by("AT Policy", "modified desc")
        == "`tabAT Policy`.`modified` desc"
    )
    assert (
        list_exports._qualified_order_by("AT Renewal Task", "due_date asc, modified desc")
        == "`tabAT Renewal Task`.`due_date` asc, `tabAT Renewal Task`.`modified` desc"
    )


def test_build_workbench_export_query_then_fetch_is_idempotent(monkeypatch):
    monkeypatch.setattr(list_exports.frappe, "local", SimpleNamespace(lang="tr"))
    captured = {}
    monkeypatch.setattr(
        list_exports.frappe,
        "get_list",
        lambda doctype, fields=None, filters=None, or_filters=None, order_by=None, limit_start=0, limit_page_length=0: captured.update(
            {"order_by": order_by}
        ) or [],
    )

    query = list_exports.build_workbench_export_query("policy_list")
    list_exports.build_screen_export_payload("policy_list", query=query, limit=100)

    assert query["order_by"] == "`tabAT Policy`.`modified` desc"
    assert captured["order_by"] == "`tabAT Policy`.`modified` desc"


def test_build_workbench_export_query_policy_list_uses_qualified_order_in_fetch(monkeypatch):
    monkeypatch.setattr(list_exports.frappe, "local", SimpleNamespace(lang="tr"))
    captured = {}
    monkeypatch.setattr(
        list_exports.frappe,
        "get_list",
        lambda doctype, fields=None, filters=None, or_filters=None, order_by=None, limit_start=0, limit_page_length=0: captured.update(
            {"doctype": doctype, "filters": filters, "order_by": order_by}
        ) or [],
    )

    query = list_exports.build_workbench_export_query(
        "policy_list",
        start_date="2026-01-19",
        end_date="2026-06-19",
    )
    list_exports.build_screen_export_payload("policy_list", query=query, limit=100)

    assert query["order_by"] == "`tabAT Policy`.`modified` desc"
    assert captured["doctype"] == "AT Policy"
    assert captured["filters"]["end_date"] == ["between", ["2026-01-19", "2026-06-19"]]
    assert captured["order_by"] == "`tabAT Policy`.`modified` desc"


@pytest.mark.parametrize(
    "doctype",
    [
        "AT Policy",
        "AT Offer",
        "AT Claim",
        "AT Payment",
        "AT Renewal Task",
    ],
)
def test_qualified_order_by_for_all_doctype_exports(doctype):
    assert (
        list_exports._qualified_order_by(doctype, "modified desc")
        == f"`tab{doctype}`.`modified` desc"
    )


def test_qualified_order_by_preserves_already_qualified_clauses():
    already = "`tabAT Policy`.`modified` desc"
    assert list_exports._qualified_order_by("AT Policy", already) == already
    assert (
        list_exports._qualified_order_by("AT Policy", "due_date asc, `tabAT Policy`.`modified` desc")
        == "`tabAT Policy`.`due_date` asc, `tabAT Policy`.`modified` desc"
    )


def test_qualified_order_by_is_idempotent_for_workbench_query():
    once = list_exports._qualified_order_by("AT Policy", "modified desc")
    twice = list_exports._qualified_order_by("AT Policy", once)
    assert once == twice == "`tabAT Policy`.`modified` desc"


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

