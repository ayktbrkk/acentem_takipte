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


def test_build_screen_export_payload_formats_policy_rows(monkeypatch):
    monkeypatch.setattr(list_exports.frappe, "local", SimpleNamespace(lang="tr"))
    monkeypatch.setattr(
        list_exports.frappe,
        "get_list",
        lambda doctype, fields=None, filters=None, or_filters=None, order_by=None, limit_start=0, limit_page_length=0: [
            {
                "name": "POL-001",
                "policy_no": "P-001",
                "customer": "Acme",
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

    assert payload["columns"][0] == "Police No"
    assert payload["rows"][0]["Police No"] == "P-001"
    assert payload["rows"][0]["Komisyon"] == "175.00 TRY"


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
