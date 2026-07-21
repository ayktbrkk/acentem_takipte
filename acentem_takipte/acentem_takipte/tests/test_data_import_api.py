from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import acentem_takipte.acentem_takipte.platform.api.data_import as data_import_api


def test_create_import_job_draft_rejects_unsupported_dataset(monkeypatch):
    monkeypatch.setattr(data_import_api, "_assert_data_import_mutation_access", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        data_import_api.frappe,
        "throw",
        lambda message: (_ for _ in ()).throw(Exception(str(message))),
    )

    try:
        data_import_api.create_import_job_draft.__wrapped__("payments", file_name="FILE-1")
        assert False, "expected unsupported dataset failure"
    except Exception as exc:
        assert "not supported" in str(exc).lower()


def test_get_import_job_status_serializes_summary(monkeypatch):
    monkeypatch.setattr(data_import_api, "assert_authenticated", lambda: "admin@example.com")
    job = SimpleNamespace(
        name="AT-IMP-2026-000001",
        dataset="customers",
        status="Completed",
        preview_summary='{"ready": 1}',
        result_summary='{"created": 1, "skipped": 0, "failed": 0}',
        error_log_file="",
        queue_job_id="job-1",
        started_at=None,
        finished_at=None,
    )
    monkeypatch.setattr(data_import_api, "assert_doc_permission", lambda *args, **kwargs: job)

    result = data_import_api.get_import_job_status.__wrapped__("AT-IMP-2026-000001")
    assert result["status"] == "Completed"
    assert result["result_summary"]["created"] == 1
