from __future__ import annotations

from acentem_takipte.acentem_takipte.notification_seed_data import DEFAULT_NOTIFICATION_TEMPLATES


def test_default_notification_templates_include_whatsapp_flows():
    template_keys = {row["template_key"] for row in DEFAULT_NOTIFICATION_TEMPLATES}

    assert "renewal_reminder_30" in template_keys
    assert "payment_due_7" in template_keys
    assert "claim_status_approved" in template_keys
    assert "policy_delivery" in template_keys


def test_default_notification_templates_use_template_mode_for_whatsapp():
    whatsapp_rows = [row for row in DEFAULT_NOTIFICATION_TEMPLATES if row["channel"] == "WHATSAPP"]

    assert whatsapp_rows
    assert all(row["content_mode"] == "template" for row in whatsapp_rows)


def test_default_notification_templates_use_english_source_language():
    assert {row["language"] for row in DEFAULT_NOTIFICATION_TEMPLATES} == {"en"}

