from __future__ import annotations

import pytest

from acentem_takipte.acentem_takipte.domains.admin.services import general_settings


def test_sanitize_settings_payload_preserves_zero_values(monkeypatch):
    monkeypatch.setattr(general_settings.frappe, "throw", lambda *args, **kwargs: pytest.fail("Should not throw"))

    payload = general_settings._sanitize_settings_payload(
        {
            "default_commission_rate": 0,
            "renewal_reminder_lead_days": 0,
            "dashboard_refresh_seconds": 0,
        }
    )

    assert payload["at_default_commission_rate"] == 0.0
    assert payload["at_renewal_reminder_lead_days"] == 0
    assert payload["at_dashboard_refresh_seconds"] == 0


def test_sanitize_settings_payload_accepts_revoked_consent(monkeypatch):
    monkeypatch.setattr(general_settings.frappe, "throw", lambda *args, **kwargs: pytest.fail("Should not throw"))

    payload = general_settings._sanitize_settings_payload({"kvkk_consent_default": "Revoked"})

    assert payload["at_kvkk_consent_default"] == "Revoked"


def test_sanitize_settings_payload_rejects_unsupported_commission_rate():
    from frappe.exceptions import ValidationError

    with pytest.raises(ValidationError):
        general_settings._sanitize_settings_payload({"default_commission_rate": 150})


def test_sanitize_settings_payload_json_string_input(monkeypatch):
    monkeypatch.setattr(general_settings.frappe, "throw", lambda *args, **kwargs: pytest.fail("Should not throw"))

    payload = general_settings._sanitize_settings_payload('{"default_locale": "en"}')

    assert payload["at_default_locale"] == "en"
