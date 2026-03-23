from __future__ import annotations

from unittest.mock import patch

from acentem_takipte.api.quick_create import create_quick_task
from acentem_takipte.services.work_management import build_my_tasks_payload


def test_build_my_tasks_payload_summarizes_due_buckets():
    rows = [
        {"name": "TASK-1", "task_title": "Call customer", "due_date": "2026-03-08", "status": "Open"},
        {"name": "TASK-2", "task_title": "Review quote", "due_date": "2026-03-09", "status": "In Progress"},
        {"name": "TASK-3", "task_title": "Visit branch", "due_date": "2026-03-12", "status": "Open"},
        {"name": "TASK-4", "task_title": "No due date", "due_date": None, "status": "Open"},
    ]
    with patch("acentem_takipte.services.work_management.frappe.get_list", return_value=rows):
        with patch("acentem_takipte.services.work_management.frappe.session.user", "agent@example.com"):
            payload = build_my_tasks_payload(limit=10)

    assert payload["summary"] == {"total": 3, "overdue": 1, "due_today": 1, "due_soon": 1}
    assert payload["items"][0]["name"] == "TASK-1"


def test_create_quick_task_normalizes_payload_and_uses_service():
    with patch("acentem_takipte.api.quick_create._assert_create_permission") as permission_mock:
        with patch("acentem_takipte.api.quick_create.create_task_service", return_value={"task": "TASK-0001"}) as service_mock:
            with patch("acentem_takipte.api.quick_create.frappe.db.exists", return_value=True):
                result = create_quick_task(
                    task_title=" Call customer ",
                    task_type="Call",
                    source_doctype="AT Customer",
                    source_name="CUST-001",
                    customer="CUST-001",
                    assigned_to="agent@example.com",
                    status="Open",
                    priority="High",
                    due_date="2026-03-10",
                    notes=" Needs callback ",
                )

    permission_mock.assert_called_once()
    service_mock.assert_called_once()
    payload = service_mock.call_args.args[0]
    assert payload["task_title"] == "Call customer"
    assert payload["task_type"] == "Call"
    assert payload["source_doctype"] == "AT Customer"
    assert payload["source_name"] == "CUST-001"
    assert payload["assigned_to"] == "agent@example.com"
    assert payload["priority"] == "High"
    assert payload["notes"] == "Needs callback"
    assert result == {"task": "TASK-0001"}
