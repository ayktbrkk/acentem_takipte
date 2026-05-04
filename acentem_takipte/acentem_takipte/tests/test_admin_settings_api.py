from acentem_takipte.acentem_takipte.api import admin_settings


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