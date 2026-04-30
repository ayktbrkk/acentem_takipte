from __future__ import annotations

from types import SimpleNamespace

import pytest

from acentem_takipte.acentem_takipte import startup


def _raise_runtime_error(message, *args, **kwargs):
    raise RuntimeError(str(message))


def test_production_guard_returns_bootinfo_when_demo_endpoints_disabled(monkeypatch):
    bootinfo = {"ok": True}

    monkeypatch.setattr(startup.frappe, "get_site_config", lambda: {"developer_mode": 0})
    monkeypatch.setattr(startup.frappe, "flags", SimpleNamespace(in_test=False), raising=False)

    assert startup.enforce_production_safety_flags(bootinfo) is bootinfo


def test_production_guard_allows_enabled_demo_endpoints_in_test(monkeypatch):
    bootinfo = {"ok": True}

    monkeypatch.setattr(
        startup.frappe,
        "get_site_config",
        lambda: {"developer_mode": 0, "at_enable_demo_endpoints": 1},
    )
    monkeypatch.setattr(startup.frappe, "flags", SimpleNamespace(in_test=True), raising=False)

    assert startup.enforce_production_safety_flags(bootinfo) is bootinfo


def test_production_guard_warns_when_developer_mode_enabled(monkeypatch):
    messages = []
    bootinfo = {"ok": True}

    monkeypatch.setattr(
        startup.frappe,
        "get_site_config",
        lambda: {"developer_mode": 1, "at_enable_demo_endpoints": 1},
    )
    monkeypatch.setattr(startup.frappe, "flags", SimpleNamespace(in_test=False), raising=False)
    monkeypatch.setattr(
        startup.frappe,
        "logger",
        lambda *args, **kwargs: SimpleNamespace(warning=lambda message: messages.append(message)),
    )

    assert startup.enforce_production_safety_flags(bootinfo) is bootinfo
    assert messages and "developer_mode" in messages[0]


def test_production_guard_blocks_boot_when_demo_endpoints_enabled(monkeypatch):
    messages = []

    monkeypatch.setattr(
        startup.frappe,
        "get_site_config",
        lambda: {"developer_mode": 0, "at_enable_demo_endpoints": 1},
    )
    monkeypatch.setattr(startup.frappe, "flags", SimpleNamespace(in_test=False), raising=False)
    monkeypatch.setattr(
        startup.frappe,
        "logger",
        lambda *args, **kwargs: SimpleNamespace(error=lambda message: messages.append(message)),
    )
    monkeypatch.setattr(startup.frappe, "throw", _raise_runtime_error)

    with pytest.raises(RuntimeError) as err:
        startup.enforce_production_safety_flags({})

    assert "at_enable_demo_endpoints" in str(err.value)
    assert messages and "at_enable_demo_endpoints" in messages[0]