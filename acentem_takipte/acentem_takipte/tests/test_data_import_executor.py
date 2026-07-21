from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from acentem_takipte.acentem_takipte.platform.import_export.data_import import executor


@pytest.fixture(autouse=True)
def _mock_frappe(monkeypatch):
    monkeypatch.setattr(executor, "_", lambda value: value, raising=False)

    def fake_throw(message):
        raise ValueError(str(message))

    monkeypatch.setattr(executor.frappe, "throw", fake_throw)
    monkeypatch.setattr(executor.frappe, "flags", SimpleNamespace(in_import=False, in_test=True))
    monkeypatch.setattr(executor.frappe, "db", MagicMock())

    job = SimpleNamespace(
        name="AT-IMP-2026-000001",
        dataset="customers",
        status="Queued",
        error_log_file="",
        mark_running=MagicMock(),
        mark_completed=MagicMock(),
        mark_failed=MagicMock(),
    )
    monkeypatch.setattr(executor.frappe, "get_doc", lambda doctype, name: job)
    return job


def test_execute_import_job_counts_created_and_skipped(monkeypatch):
    preview_rows = [
        {
            "row_number": 1,
            "row_status": "ready",
            "values": {"full_name": "Ali Veli", "tax_id": "11111111110"},
            "office_branch": "IST",
        },
        {
            "row_number": 2,
            "row_status": "skipped",
            "values": {"full_name": "Existing", "tax_id": "22222222222"},
            "office_branch": "IST",
        },
        {
            "row_number": 3,
            "row_status": "error",
            "error_message": "Invalid tax id",
            "values": {"full_name": "Bad", "tax_id": "123"},
            "office_branch": "IST",
        },
    ]
    monkeypatch.setattr(executor, "build_import_rows_for_job", lambda job_name: preview_rows)
    monkeypatch.setattr(executor, "_insert_customer_row", lambda row: "CUST-001")
    monkeypatch.setattr(executor, "_write_error_log", lambda *args, **kwargs: None)

    result = executor.execute_data_import_job("AT-IMP-2026-000001")

    assert result == {"created": 1, "skipped": 1, "failed": 1, "total_rows": 3}


def test_execute_import_job_rejects_non_queued_status(_mock_frappe):
    _mock_frappe.status = "Draft"
    with pytest.raises(ValueError, match="not queued"):
        executor.execute_data_import_job("AT-IMP-2026-000001")
