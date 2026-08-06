from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

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


def test_verify_preview_integrity_accepts_unchanged_file(monkeypatch):
    job = SimpleNamespace(
        preview_summary='{"file_sha256": "abc123"}',
        source_file="/private/files/customers.csv",
    )
    monkeypatch.setattr(
        data_import_api,
        "_compute_file_sha256",
        lambda file_url: "abc123",
        raising=False,
    )
    data_import_api._verify_preview_integrity(job)


def test_verify_preview_integrity_rejects_changed_file(monkeypatch):
    job = SimpleNamespace(
        preview_summary='{"file_sha256": "abc123"}',
        source_file="/private/files/customers.csv",
    )
    monkeypatch.setattr(
        data_import_api,
        "_compute_file_sha256",
        lambda file_url: "changed-hash",
        raising=False,
    )
    with pytest.raises(Exception) as excinfo:
        data_import_api._verify_preview_integrity(job)
    assert "modified since the preview" in str(excinfo.value)


def test_enqueue_data_import_verifies_preview_integrity(monkeypatch):
    job = SimpleNamespace(
        status="Previewed",
        preview_summary='{"ready": 2, "file_sha256": "abc123"}',
        source_file="/private/files/customers.csv",
        name="AT-IMP-2026-000001",
        queue_job_id="",
    )
    job.save = MagicMock()
    monkeypatch.setattr(data_import_api, "_dataset_for_job", lambda name: "customers")
    monkeypatch.setattr(data_import_api, "_assert_data_import_mutation_access", lambda *args, **kwargs: None)
    monkeypatch.setattr(data_import_api, "assert_doc_permission", lambda *args, **kwargs: job)
    monkeypatch.setattr(data_import_api, "_verify_preview_integrity", lambda job: (_ for _ in ()).throw(Exception("modified since the preview")))
    monkeypatch.setattr(
        data_import_api.frappe,
        "throw",
        lambda message: (_ for _ in ()).throw(Exception(str(message))),
    )

    with pytest.raises(Exception) as excinfo:
        data_import_api.enqueue_data_import.__wrapped__("AT-IMP-2026-000001")
    assert "modified since the preview" in str(excinfo.value)
    assert job.status == "Previewed"
