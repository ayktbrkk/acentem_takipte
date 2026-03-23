from __future__ import annotations

from unittest.mock import patch

from acentem_takipte.acentem_takipte.api.quick_create import create_quick_reminder


def test_create_quick_reminder_normalizes_payload():
    with (
        patch("acentem_takipte.api.quick_create._assert_create_permission") as assert_permission,
        patch("acentem_takipte.api.quick_create.create_reminder_service", return_value={"reminder": "REM-0001"}) as create_service,
        patch("acentem_takipte.api.quick_create.frappe.db.exists", return_value=True),
    ):
        result = create_quick_reminder(
            reminder_title="  Follow up quote  ",
            source_doctype="AT Customer",
            source_name="CUST-0001",
            customer="CUST-0001",
            assigned_to="agent@example.com",
            status="Open",
            priority="High",
            remind_at="2026-03-10 14:30:00",
            notes="  Call after lunch  ",
        )

    assert result == {"reminder": "REM-0001"}
    assert_permission.assert_called_once()
    payload = create_service.call_args.args[0]
    assert payload["doctype"] == "AT Reminder"
    assert payload["reminder_title"] == "Follow up quote"
    assert payload["source_doctype"] == "AT Customer"
    assert payload["source_name"] == "CUST-0001"
    assert payload["customer"] == "CUST-0001"
    assert payload["assigned_to"] == "agent@example.com"
    assert payload["status"] == "Open"
    assert payload["priority"] == "High"
    assert payload["notes"] == "Call after lunch"

