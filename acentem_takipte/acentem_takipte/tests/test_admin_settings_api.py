import acentem_takipte.acentem_takipte.domains.admin.api.settings as admin_settings


def test_get_admin_general_settings_coerces_response_shape(monkeypatch):
    monkeypatch.setattr(admin_settings, "assert_authenticated", lambda: "Administrator")
    monkeypatch.setattr(admin_settings, "assert_roles", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        admin_settings,
        "load_admin_general_settings",
        lambda: {
            "default_locale": " EN ",
            "default_date_format": "YYYY-MM-DD",
            "follow_up_due_soon_days": "10",
            "follow_up_preview_limit": "12",
            "site_name": " at.localhost ",
            "environment": " staging ",
            "active_locale": " EN ",
        },
    )

    payload = admin_settings.get_admin_general_settings()

    assert payload == {
        "default_locale": "en",
        "default_date_format": "YYYY-MM-DD",
        "follow_up_due_soon_days": 10,
        "follow_up_preview_limit": 12,
        "default_policy_term_days": 365,
        "default_commission_rate": 10.0,
        "default_currency": "TRY",
        "renewal_reminder_lead_days": 30,
        "kvkk_consent_default": "Unknown",
        "dashboard_refresh_seconds": 0,
        "default_page_size": 20,
        "site_name": "at.localhost",
        "environment": "staging",
        "active_locale": "en",
    }


def test_save_admin_general_settings_api_passes_config(monkeypatch):
    monkeypatch.setattr(admin_settings, "assert_authenticated", lambda: "Administrator")
    monkeypatch.setattr(admin_settings, "assert_post_request", lambda *args, **kwargs: None)
    monkeypatch.setattr(admin_settings, "assert_roles", lambda *args, **kwargs: None)
    captured = {}
    monkeypatch.setattr(
        admin_settings,
        "save_admin_general_settings",
        lambda config=None: captured.update({"config": config}) or {"default_locale": "tr"},
    )

    payload = admin_settings.save_admin_general_settings_api(
        config={
            "default_locale": "tr",
            "default_date_format": "DD.MM.YYYY",
            "follow_up_due_soon_days": 10,
            "follow_up_preview_limit": 12,
        }
    )

    assert captured["config"] == {
        "default_locale": "tr",
        "default_date_format": "DD.MM.YYYY",
        "follow_up_due_soon_days": 10,
        "follow_up_preview_limit": 12,
    }
    assert payload["default_locale"] == "tr"


def test_coerce_general_settings_payload_preserves_zero_values():
    payload = admin_settings._coerce_general_settings_payload(
        {
            "default_commission_rate": 0,
            "renewal_reminder_lead_days": 0,
            "dashboard_refresh_seconds": 0,
        }
    )

    assert payload["default_commission_rate"] == 0.0
    assert payload["renewal_reminder_lead_days"] == 0
    assert payload["dashboard_refresh_seconds"] == 0


def test_coerce_general_settings_payload_accepts_revoked_consent():
    payload = admin_settings._coerce_general_settings_payload({"kvkk_consent_default": "Revoked"})

    assert payload["kvkk_consent_default"] == "Revoked"


def test_coerce_general_settings_payload_rejects_unsupported_values():
    payload = admin_settings._coerce_general_settings_payload(
        {
            "default_locale": "de",
            "default_commission_rate": 150,
            "renewal_reminder_lead_days": 7,
            "dashboard_refresh_seconds": 90,
            "default_currency": "GBP",
        }
    )

    assert payload["default_locale"] == "tr"
    assert payload["default_commission_rate"] == 10.0
    assert payload["renewal_reminder_lead_days"] == 30
    assert payload["dashboard_refresh_seconds"] == 0
    assert payload["default_currency"] == "TRY"