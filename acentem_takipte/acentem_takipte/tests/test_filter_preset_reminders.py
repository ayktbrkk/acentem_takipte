from __future__ import annotations

import frappe
import pytest

from acentem_takipte.acentem_takipte.platform.api import filter_presets


def test_reminders_is_allowed_preset_screen():
    frappe.set_user("Administrator")
    assert "reminders" in filter_presets.ALLOWED_SCREENS


def test_get_filter_preset_state_accepts_reminders():
    frappe.set_user("Administrator")
    state = filter_presets.get_filter_preset_state.__wrapped__("reminders")
    assert isinstance(state, dict)
    assert "selected_key" in state
    frappe.db.rollback()


def test_get_filter_preset_state_rejects_unknown_screen():
    frappe.set_user("Administrator")
    with pytest.raises(Exception) as exc:
        filter_presets.get_filter_preset_state.__wrapped__("not_a_real_screen")
    assert "Invalid preset screen" in str(exc.value)
    frappe.db.rollback()


def test_set_filter_preset_state_accepts_reminders():
    frappe.set_user("Administrator")
    result = filter_presets.set_filter_preset_state.__wrapped__(
        "reminders",
        "custom",
        {"status": "Open"},
    )
    assert isinstance(result, dict)
    assert result.get("selected_key") == "custom"
    frappe.db.rollback()


def test_completed_reminder_cannot_be_reopened():
    frappe.set_user("Administrator")
    reminder = frappe.get_doc(
        {
            "doctype": "AT Reminder",
            "reminder_title": "Reopen guard",
            "status": "Open",
            "assigned_to": "Administrator",
            "remind_at": "2026-01-01 10:00:00",
        }
    ).insert(ignore_permissions=True)

    reminder.status = "Done"
    reminder.save(ignore_permissions=True)

    reminder.reload()
    assert reminder.status == "Done"

    with pytest.raises(Exception) as exc:
        reminder.status = "Open"
        reminder.save(ignore_permissions=True)
    assert "cannot be reopened" in str(exc.value)
    frappe.db.rollback()


def test_open_reminder_can_be_completed_and_cancelled():
    frappe.set_user("Administrator")

    done = frappe.get_doc(
        {"doctype": "AT Reminder", "reminder_title": "Complete me", "status": "Open", "assigned_to": "Administrator", "remind_at": "2026-01-01 10:00:00"}
    ).insert(ignore_permissions=True)
    done.status = "Done"
    done.save(ignore_permissions=True)
    done.reload()
    assert done.status == "Done"
    assert done.completed_on

    cancelled = frappe.get_doc(
        {"doctype": "AT Reminder", "reminder_title": "Cancel me", "status": "Open", "assigned_to": "Administrator", "remind_at": "2026-01-01 10:00:00"}
    ).insert(ignore_permissions=True)
    cancelled.status = "Cancelled"
    cancelled.save(ignore_permissions=True)
    cancelled.reload()
    assert cancelled.status == "Cancelled"
    assert cancelled.completed_on
    frappe.db.rollback()


def test_cancelled_reminder_cannot_be_reopened():
    frappe.set_user("Administrator")
    reminder = frappe.get_doc(
        {"doctype": "AT Reminder", "reminder_title": "Cancel reopen guard", "status": "Open", "assigned_to": "Administrator", "remind_at": "2026-01-01 10:00:00"}
    ).insert(ignore_permissions=True)

    reminder.status = "Cancelled"
    reminder.save(ignore_permissions=True)
    reminder.reload()
    assert reminder.status == "Cancelled"

    with pytest.raises(Exception) as exc:
        reminder.status = "Open"
        reminder.save(ignore_permissions=True)
    assert "cannot be reopened" in str(exc.value)
    frappe.db.rollback()


def test_terminal_guard_applies_to_all_users():
    frappe.set_user("Administrator")
    reminder = frappe.get_doc(
        {"doctype": "AT Reminder", "reminder_title": "User guard", "status": "Open", "assigned_to": "Administrator", "remind_at": "2026-01-01 10:00:00"}
    ).insert(ignore_permissions=True)
    reminder.status = "Done"
    reminder.save(ignore_permissions=True)

    # A non-admin user cannot bypass the terminal-state guard (it lives in the
    # controller validate, not in a UI check).
    frappe.set_user("support@example.com")
    doc = frappe.get_doc("AT Reminder", reminder.name)
    doc.status = "Open"
    with pytest.raises(Exception) as exc:
        doc.save(ignore_permissions=True)
    assert "cannot be reopened" in str(exc.value)
    frappe.db.rollback()


def test_terminal_reminder_allows_non_status_updates():
    frappe.set_user("Administrator")
    reminder = frappe.get_doc(
        {"doctype": "AT Reminder", "reminder_title": "Editable after done", "status": "Open", "assigned_to": "Administrator", "remind_at": "2026-01-01 10:00:00"}
    ).insert(ignore_permissions=True)
    reminder.status = "Done"
    reminder.save(ignore_permissions=True)

    reminder.notes = "Updated after completion"
    reminder.save(ignore_permissions=True)
    reminder.reload()
    assert reminder.status == "Done"
    assert reminder.notes == "Updated after completion"
    frappe.db.rollback()
