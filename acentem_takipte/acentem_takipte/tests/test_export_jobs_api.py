from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

import frappe
import acentem_takipte.acentem_takipte.platform.api.list_exports as list_exports


@pytest.fixture(autouse=True)
def _ensure_test_flags():
    previous_flags = getattr(frappe.local, "flags", None)

    class _Flags(dict):
        def __getattr__(self, key):
            return self.get(key, False)

    frappe.local.flags = _Flags(
        in_test=True,
        in_migrate=False,
        dev_server=False,
        in_safe_exec=False,
        in_render_safe_exec=False,
    )
    try:
        yield
    finally:
        if previous_flags is None:
            try:
                del frappe.local.flags
            except Exception:
                pass
        else:
            frappe.local.flags = previous_flags


def test_record_export_job_creates_job_document(monkeypatch):
    created = {}

    class FakeJob:
        @staticmethod
        def create_export_job(**kwargs):
            created.update(kwargs)
            return None

    import sys

    fake_module = SimpleNamespace(ATDataExportJob=FakeJob)
    monkeypatch.setitem(
        sys.modules,
        "acentem_takipte.acentem_takipte.doctype.at_data_export_job.at_data_export_job",
        fake_module,
    )

    list_exports._record_export_job(
        screen="policy_list",
        export_format="xlsx",
        filename="policies.xlsx",
        payload={
            "screen": "policy_list",
            "title": "Policy List",
            "applied_filters": {"status": "Active", "office_branch": "BR-001"},
            "total_count": 7,
        },
    )

    assert created["screen"] == "policy_list"
    assert created["dataset_label"] == "Policy List"
    assert created["export_format"] == "xlsx"
    assert created["office_branch"] == "BR-001"
    assert created["filters"] == {"status": "Active", "office_branch": "BR-001"}
    assert created["row_count"] == 7
    assert created["filename"] == "policies.xlsx"


def test_record_export_job_swallows_errors(monkeypatch):
    import sys

    def boom(**kwargs):
        raise RuntimeError("boom")

    monkeypatch.setitem(
        sys.modules,
        "acentem_takipte.acentem_takipte.doctype.at_data_export_job.at_data_export_job",
        SimpleNamespace(ATDataExportJob=SimpleNamespace(create_export_job=boom)),
    )
    monkeypatch.setattr(
        list_exports.frappe,
        "log_error",
        lambda *args, **kwargs: None,
        raising=False,
    )

    list_exports._record_export_job(
        screen="policy_list",
        export_format="xlsx",
        filename="",
        payload={"total_count": 1},
    )


def test_list_export_jobs_returns_serialized_rows(monkeypatch):
    monkeypatch.setattr(list_exports, "assert_authenticated", lambda: "admin")
    monkeypatch.setattr(list_exports, "assert_doctype_permission", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        list_exports.frappe,
        "get_all",
        lambda doctype, fields, order_by, limit_page_length: [
            {
                "name": "AT-EXP-2026-000001",
                "screen": "policy_list",
                "dataset_label": "Policy List",
                "status": "Completed",
                "export_format": "xlsx",
                "office_branch": "BR-001",
                "row_count": 10,
                "filename": "policies.xlsx",
                "file_url": "/private/files/policies.xlsx",
                "expiry_at": None,
                "requested_by": "admin",
                "exported_at": None,
            }
        ],
    )

    rows = list_exports.list_export_jobs.__wrapped__(limit=5)

    assert len(rows) == 1
    assert rows[0]["export_job_name"] == "AT-EXP-2026-000001"
    assert rows[0]["row_count"] == 10
    assert rows[0]["screen"] == "policy_list"
    assert rows[0]["file_url"] == "/private/files/policies.xlsx"


def test_store_export_file_persists_artifact(monkeypatch):
    created_file = {}
    saved_job = {}
    monkeypatch.setattr(list_exports.frappe.utils, "now_datetime", lambda: "2026-08-06 00:00:00")

    class FakeFile:
        def __init__(self, **kwargs):
            created_file.update(kwargs)
            self.file_url = "/private/files/policies.xlsx"

        def insert(self, ignore_permissions=True):
            return self

    class FakeJob:
        def __init__(self, name):
            self.name = name
            self.file_url = ""
            self.downloaded_at = None

        def save(self, ignore_permissions=True):
            saved_job["file_url"] = self.file_url
            return self

    calls = {"get_doc": []}

    def fake_get_doc(doctype, name=None):
        calls["get_doc"].append((doctype, name))
        if isinstance(doctype, dict):
            if doctype.get("doctype") == "File":
                return FakeFile(**{k: v for k, v in doctype.items() if k != "doctype"})
        elif doctype == "AT Data Export Job":
            return FakeJob(name or "AT-EXP-2026-000001")
        elif doctype == "File":
            return FakeFile()
        return None

    monkeypatch.setattr(list_exports.frappe, "get_doc", fake_get_doc)

    url = list_exports._store_export_file(
        job_name="AT-EXP-2026-000001",
        filename="policies.xlsx",
        file_content=b"xlsx-bytes",
    )

    assert url == "/private/files/policies.xlsx"
    assert created_file["attached_to_doctype"] == "AT Data Export Job"
    assert created_file["attached_to_name"] == "AT-EXP-2026-000001"
    assert created_file["is_private"] == 1
    assert saved_job["file_url"] == "/private/files/policies.xlsx"

def _make_job(monkeypatch, **overrides):
    job = frappe._dict(
        name="AT-EXP-2026-000099",
        screen="policy_list",
        dataset_label="Policy List",
        status="Completed",
        export_format="xlsx",
        office_branch=None,
        row_count=10,
        filename="policies.xlsx",
        file_url="/private/files/policies.xlsx",
        expiry_at=None,
        requested_by="user_a@example.com",
        exported_at="2026-08-06 00:00:00",
    )
    for key, value in overrides.items():
        job[key] = value
    return job


def test_download_export_file_before_expiry_serves_content(monkeypatch):
    job = _make_job(monkeypatch)
    monkeypatch.setattr(list_exports, "_get_export_job_or_throw", lambda name: job)
    monkeypatch.setattr(list_exports, "_assert_export_job_access", lambda job: None)
    monkeypatch.setattr(list_exports, "assert_authenticated", lambda: "user_a@example.com")

    class FakeFileDoc:
        file_url = "/private/files/policies.xlsx"
        file_name = "policies.xlsx"
        content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        def get_content(self):
            return b"xlsx-bytes"

    monkeypatch.setattr(list_exports.frappe, "response", {})
    monkeypatch.setattr(list_exports, "_find_export_file_doc", lambda job: FakeFileDoc())

    list_exports.download_export_file.__wrapped__("AT-EXP-2026-000099")

    assert list_exports.frappe.response["filecontent"] == b"xlsx-bytes"
    assert list_exports.frappe.response["filename"] == "policies.xlsx"
    assert list_exports.frappe.response["type"] == "download"


def test_download_export_file_after_expiry_is_rejected(monkeypatch):
    from datetime import datetime as dt

    monkeypatch.setattr(list_exports, "_", lambda value: value, raising=False)
    monkeypatch.setattr(list_exports, "now_datetime", lambda: dt(2026, 8, 6, 0, 0, 0))
    monkeypatch.setattr(list_exports, "get_datetime", lambda value: dt(2026, 8, 5, 0, 0, 0))
    job = _make_job(monkeypatch, expiry_at="2026-08-05 00:00:00")
    monkeypatch.setattr(
        list_exports.frappe,
        "throw",
        lambda message: (_ for _ in ()).throw(Exception(str(message))),
    )

    with pytest.raises(Exception) as excinfo:
        list_exports._assert_export_job_available(job)
    assert "expired" in str(excinfo.value).lower()


def test_download_export_file_unauthorized_user_rejected(monkeypatch):
    job = _make_job(monkeypatch, requested_by="user_a@example.com")
    monkeypatch.setattr(list_exports, "_get_export_job_or_throw", lambda name: job)
    monkeypatch.setattr(list_exports, "assert_authenticated", lambda: "user_b@example.com")
    monkeypatch.setattr(list_exports, "assert_doctype_permission", lambda *a, **k: None)
    monkeypatch.setattr(list_exports.frappe, "get_roles", lambda user: ["Agency User"])
    monkeypatch.setattr(list_exports, "user_can_access_all_office_branches", lambda user: False)
    monkeypatch.setattr(list_exports, "get_allowed_office_branch_names", lambda user: {"BR-002"})
    monkeypatch.setattr(
        list_exports.frappe,
        "throw",
        lambda message: (_ for _ in ()).throw(Exception(str(message))),
    )

    with pytest.raises(Exception) as excinfo:
        list_exports._assert_export_job_access(job)
    assert "not authorized" in str(excinfo.value).lower()


def test_download_export_file_owner_same_branch_allowed(monkeypatch):
    job = _make_job(monkeypatch, office_branch="BR-001")
    monkeypatch.setattr(list_exports, "assert_authenticated", lambda: "user_a@example.com")
    monkeypatch.setattr(list_exports, "assert_doctype_permission", lambda *a, **k: None)
    monkeypatch.setattr(list_exports.frappe, "get_roles", lambda user: ["Agency User"])
    monkeypatch.setattr(list_exports, "user_can_access_all_office_branches", lambda user: False)
    monkeypatch.setattr(list_exports, "get_allowed_office_branch_names", lambda user: {"BR-001"})

    list_exports._assert_export_job_access(job)


def test_download_export_file_other_branch_rejected(monkeypatch):
    job = _make_job(monkeypatch, office_branch="BR-001")
    monkeypatch.setattr(list_exports, "assert_authenticated", lambda: "user_a@example.com")
    monkeypatch.setattr(list_exports, "assert_doctype_permission", lambda *a, **k: None)
    monkeypatch.setattr(list_exports.frappe, "get_roles", lambda user: ["Agency User"])
    monkeypatch.setattr(list_exports, "user_can_access_all_office_branches", lambda user: False)
    monkeypatch.setattr(list_exports, "get_allowed_office_branch_names", lambda user: {"BR-002"})
    monkeypatch.setattr(
        list_exports.frappe,
        "throw",
        lambda message: (_ for _ in ()).throw(Exception(str(message))),
    )

    with pytest.raises(Exception) as excinfo:
        list_exports._assert_export_job_access(job)
    assert "not authorized" in str(excinfo.value).lower()


def test_download_export_file_missing_attached_file(monkeypatch):
    job = _make_job(monkeypatch, file_url="")
    monkeypatch.setattr(list_exports, "_get_export_job_or_throw", lambda name: job)
    monkeypatch.setattr(list_exports, "_assert_export_job_access", lambda job: None)
    monkeypatch.setattr(
        list_exports.frappe,
        "throw",
        lambda message: (_ for _ in ()).throw(Exception(str(message))),
    )

    with pytest.raises(Exception) as excinfo:
        list_exports._assert_export_job_available(job)
    assert "no export file" in str(excinfo.value).lower()


def test_download_export_file_missing_file_doc_rejected(monkeypatch):
    job = _make_job(monkeypatch, file_url="/private/files/policies.xlsx")
    monkeypatch.setattr(list_exports, "_get_export_job_or_throw", lambda name: job)
    monkeypatch.setattr(list_exports, "_assert_export_job_access", lambda job: None)
    monkeypatch.setattr(list_exports, "_assert_export_job_available", lambda job: None)
    monkeypatch.setattr(list_exports.frappe, "response", {})
    monkeypatch.setattr(list_exports, "_find_export_file_doc", lambda job: None)
    monkeypatch.setattr(
        list_exports.frappe,
        "throw",
        lambda message: (_ for _ in ()).throw(Exception(str(message))),
    )

    with pytest.raises(Exception) as excinfo:
        list_exports.download_export_file.__wrapped__("AT-EXP-2026-000099")
    assert "could not be found" in str(excinfo.value).lower()


def test_cleanup_expired_export_jobs_is_idempotent(monkeypatch):
    expired = [
        {"name": "AT-EXP-2026-000001", "expiry_at": "2026-01-01 00:00:00", "file_url": "/private/files/a.xlsx"},
        {"name": "AT-EXP-2026-000002", "expiry_at": "2026-01-02 00:00:00", "file_url": "/private/files/b.xlsx"},
    ]
    deleted = []

    monkeypatch.setattr(
        list_exports.frappe,
        "get_all",
        lambda doctype, fields, filters, limit_page_length: expired,
    )
    monkeypatch.setattr(
        list_exports.frappe.db,
        "exists",
        lambda doctype, filters: True if doctype == "AT Data Export Job" else "FILE-001",
    )
    monkeypatch.setattr(list_exports.frappe.db, "sql", lambda *args, **kwargs: None)

    class FakeJob(frappe._dict):
        def __init__(self, name, file_url):
            super().__init__(name=name, file_url=file_url)

    monkeypatch.setattr(
        list_exports.frappe,
        "get_doc",
        lambda doctype, name: FakeJob(name, "file"),
    )
    monkeypatch.setattr(
        list_exports,
        "_delete_export_doc",
        lambda doctype, name: deleted.append((doctype, name)),
    )
    monkeypatch.setattr(
        list_exports,
        "now_datetime",
        lambda: "2026-08-06 00:00:00",
    )

    first = list_exports.cleanup_expired_export_jobs()
    second = list_exports.cleanup_expired_export_jobs()

    assert first["deleted_jobs"] == 2
    assert first["deleted_files"] == 2
    assert second["deleted_jobs"] == 2


def test_content_type_for_filename():
    assert list_exports._content_type_for_filename("report.xlsx") == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert list_exports._content_type_for_filename("report.csv") == "text/csv"
    assert list_exports._content_type_for_filename("report.pdf") == "application/pdf"
    assert list_exports._content_type_for_filename("report.bin") == "application/octet-stream"
