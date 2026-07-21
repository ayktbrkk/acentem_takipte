from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from acentem_takipte.acentem_takipte.platform.import_export.data_import import normalizers, preview


@pytest.fixture(autouse=True)
def _mock_frappe(monkeypatch):
    monkeypatch.setattr(preview, "_", lambda value: value, raising=False)
    def fake_throw(message):
        raise ValueError(str(message))

    monkeypatch.setattr(preview.frappe, "throw", fake_throw)
    monkeypatch.setattr(
        preview,
        "assert_office_branch_access",
        lambda office_branch, user=None: office_branch,
    )
    monkeypatch.setattr(
        preview,
        "parse_job_file",
        lambda **kwargs: SimpleNamespace(
            headers=["full_name", "tax_id"],
            rows=[{"full_name": "Ali Veli", "tax_id": "12345678901"}],
        ),
    )
    fake_db = MagicMock()
    fake_db.exists.return_value = False
    fake_db.get_value.return_value = None
    monkeypatch.setattr(preview.frappe, "db", fake_db)

    job = SimpleNamespace(
        name="AT-IMP-2026-000001",
        dataset="customers",
        source_file="/private/files/customers.csv",
        column_mapping=None,
        import_options=None,
        preview_summary=None,
        preview_rows_json=None,
        status="Draft",
    )
    job.save = MagicMock()
    monkeypatch.setattr(preview.frappe, "get_doc", lambda doctype, name: job)
    return job


def test_build_customer_preview_marks_ready_row():
    rows = preview._build_customer_preview_rows(
        [{"full_name": "Ali Veli", "tax_id": "11111111110"}],
        {"full_name": "full_name", "tax_id": "tax_id"},
        office_branch="IST",
    )
    assert rows[0]["row_status"] == "ready"
    assert rows[0]["error_message"] is None


def test_build_customer_preview_marks_invalid_tckn_as_error():
    rows = preview._build_customer_preview_rows(
        [{"full_name": "Bad User", "tax_id": "12345678901"}],
        {"full_name": "full_name", "tax_id": "tax_id"},
        office_branch="IST",
    )
    assert rows[0]["row_status"] == "error"
    assert rows[0]["error_message"]


def test_normalize_customer_row_maps_mobile_phone_alias():
    mapped = normalizers.apply_column_mapping(
        {"Cep": "5551234567"},
        {"Cep": "mobile_phone"},
    )
    payload = normalizers.normalize_customer_row(mapped)
    assert payload["phone"] == "5551234567"
