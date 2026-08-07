from __future__ import annotations

import sys
from types import SimpleNamespace

from acentem_takipte.acentem_takipte import startup
from acentem_takipte.acentem_takipte.platform.utils import sentry


class _FakeLoggingIntegration:
    def __init__(self, level, event_level):
        self.level = level
        self.event_level = event_level


class _FakeRedisIntegration:
    pass


class _FakeSentrySDK:
    init_calls = []
    captured = []

    @classmethod
    def init(cls, **kwargs):
        cls.init_calls.append(kwargs)

    @classmethod
    def capture_exception(cls, exception=None):
        cls.captured.append(exception)


def _install_fake_sdk(monkeypatch):
    fake_logging = SimpleNamespace(LoggingIntegration=_FakeLoggingIntegration)
    fake_redis = SimpleNamespace(RedisIntegration=_FakeRedisIntegration)
    integrations = SimpleNamespace(logging=fake_logging, redis=fake_redis)
    monkeypatch.setitem(sys.modules, "sentry_sdk", _FakeSentrySDK)
    monkeypatch.setitem(sys.modules, "sentry_sdk.integrations", integrations)
    monkeypatch.setitem(sys.modules, "sentry_sdk.integrations.logging", fake_logging)
    monkeypatch.setitem(sys.modules, "sentry_sdk.integrations.redis", fake_redis)
    _FakeSentrySDK.init_calls.clear()
    _FakeSentrySDK.captured.clear()
    return _FakeSentrySDK


def _patch_flags(monkeypatch, initialized=False):
    flags = SimpleNamespace(sentry_initialized=initialized)
    monkeypatch.setattr(sentry.frappe, "flags", flags, raising=False)
    return flags


def test_init_skips_when_no_dsn(monkeypatch):
    fake = _install_fake_sdk(monkeypatch)
    monkeypatch.setattr(sentry.frappe, "get_site_config", lambda: {})
    flags = _patch_flags(monkeypatch)

    sentry.init_sentry()

    assert fake.init_calls == []
    assert flags.sentry_initialized is False


def test_init_initializes_when_dsn_present(monkeypatch):
    fake = _install_fake_sdk(monkeypatch)
    monkeypatch.setattr(
        sentry.frappe,
        "get_site_config",
        lambda: {"sentry_dsn": "https://fake-key@fake-org.ingest.sentry.invalid/1"},
    )
    flags = _patch_flags(monkeypatch)

    sentry.init_sentry()

    assert len(fake.init_calls) == 1
    assert fake.init_calls[0]["dsn"] == "https://fake-key@fake-org.ingest.sentry.invalid/1"
    assert fake.init_calls[0]["environment"] == "production"
    assert flags.sentry_initialized is True


def test_init_uses_sentry_environment_when_present(monkeypatch):
    fake = _install_fake_sdk(monkeypatch)
    monkeypatch.setattr(
        sentry.frappe,
        "get_site_config",
        lambda: {
            "sentry_dsn": "https://fake-key@fake-org.ingest.sentry.invalid/1",
            "sentry_environment": "staging",
        },
    )
    _patch_flags(monkeypatch)

    sentry.init_sentry()

    assert len(fake.init_calls) == 1
    assert fake.init_calls[0]["environment"] == "staging"


def test_init_is_idempotent(monkeypatch):
    fake = _install_fake_sdk(monkeypatch)
    monkeypatch.setattr(
        sentry.frappe,
        "get_site_config",
        lambda: {"sentry_dsn": "https://fake-key@fake-org.ingest.sentry.invalid/1"},
    )
    flags = _patch_flags(monkeypatch)

    sentry.init_sentry()
    assert len(fake.init_calls) == 1

    flags.sentry_initialized = True
    sentry.init_sentry()

    assert len(fake.init_calls) == 1


def test_init_noop_when_sdk_missing(monkeypatch):
    monkeypatch.setitem(sys.modules, "sentry_sdk", None)
    monkeypatch.setattr(
        sentry.frappe,
        "get_site_config",
        lambda: {"sentry_dsn": "https://fake-key@fake-org.ingest.sentry.invalid/1"},
    )
    flags = _patch_flags(monkeypatch)

    sentry.init_sentry()

    assert flags.sentry_initialized is False


def test_init_handles_failure_without_crashing(monkeypatch):
    _install_fake_sdk(monkeypatch)
    logged = []

    def _boom_init(**kwargs):
        raise RuntimeError("sentry_sdk is unavailable")

    monkeypatch.setattr(_FakeSentrySDK, "init", staticmethod(_boom_init))
    monkeypatch.setattr(
        sentry.frappe,
        "get_site_config",
        lambda: {"sentry_dsn": "https://fake-key@fake-org.ingest.sentry.invalid/1"},
    )
    flags = _patch_flags(monkeypatch)
    monkeypatch.setattr(
        sentry.frappe, "log_error", lambda **kw: logged.append(kw), raising=False
    )

    sentry.init_sentry()

    assert logged
    assert logged[0].get("title") == "Sentry Initialization Error"
    assert flags.sentry_initialized is False


def test_init_never_leaks_dsn_into_error_log(monkeypatch):
    _install_fake_sdk(monkeypatch)
    logged = []

    def _boom_init(**kwargs):
        raise RuntimeError("init failed for https://fake-key@fake-org.ingest.sentry.invalid/1")

    monkeypatch.setattr(_FakeSentrySDK, "init", staticmethod(_boom_init))
    monkeypatch.setattr(
        sentry.frappe,
        "get_site_config",
        lambda: {"sentry_dsn": "https://fake-key@fake-org.ingest.sentry.invalid/1"},
    )
    _patch_flags(monkeypatch)
    monkeypatch.setattr(
        sentry.frappe, "log_error", lambda **kw: logged.append(kw), raising=False
    )

    sentry.init_sentry()

    assert logged
    message = str(logged[0].get("message", ""))
    assert "secretkey" not in message
    assert "ingest.sentry.io" not in message
    assert "[REDACTED]" in message


def test_boot_hook_calls_init_sentry_in_production(monkeypatch):
    calls = []
    monkeypatch.setattr(startup, "init_sentry", lambda: calls.append(True))
    monkeypatch.setattr(
        startup.frappe, "get_site_config", lambda: {"developer_mode": 0}
    )
    monkeypatch.setattr(
        startup.frappe, "flags", SimpleNamespace(in_test=False), raising=False
    )

    result = startup.enforce_production_safety_flags({"ok": True})

    assert result == {"ok": True}
    assert calls == [True]


def test_boot_hook_skips_init_sentry_in_test(monkeypatch):
    calls = []
    monkeypatch.setattr(startup, "init_sentry", lambda: calls.append(True))
    monkeypatch.setattr(
        startup.frappe, "get_site_config", lambda: {"developer_mode": 0}
    )
    monkeypatch.setattr(
        startup.frappe, "flags", SimpleNamespace(in_test=True), raising=False
    )

    result = startup.enforce_production_safety_flags({"ok": True})

    assert result == {"ok": True}
    assert calls == []
