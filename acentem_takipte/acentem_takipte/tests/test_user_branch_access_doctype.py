from __future__ import annotations

from types import SimpleNamespace

import pytest

from acentem_takipte.acentem_takipte.doctype.at_user_branch_access.at_user_branch_access import (
    ATUserBranchAccess,
)
from acentem_takipte.acentem_takipte.doctype.at_user_branch_access import (
    at_user_branch_access as module,
)


def _make_doc(**overrides):
    data = {
        "name": "agent@example.com::BR-1",
        "user": "agent@example.com",
        "office_branch": "BR-1",
        "scope_mode": "self_only",
        "is_default": 0,
        "is_active": 1,
        "valid_until": None,
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def test_validate_rejects_invalid_scope_mode():
    doc = _make_doc(scope_mode="invalid")

    with pytest.raises(Exception):
        ATUserBranchAccess.validate(doc)


def test_validate_rejects_multiple_active_defaults(monkeypatch):
    doc = _make_doc(is_default=1, is_active=1)

    monkeypatch.setattr(
        module.frappe,
        "db",
        SimpleNamespace(get_value=lambda *args, **kwargs: "agent@example.com::BR-2"),
    )

    with pytest.raises(Exception):
        ATUserBranchAccess.validate(doc)


def test_validate_auto_deactivates_expired_access(monkeypatch):
    doc = _make_doc(is_default=1, is_active=1, valid_until="2026-03-24")

    monkeypatch.setattr(module, "today", lambda: "2026-03-25")
    monkeypatch.setattr(
        module.frappe,
        "db",
        SimpleNamespace(get_value=lambda *args, **kwargs: None),
    )

    ATUserBranchAccess.validate(doc)

    assert doc.is_active == 0
    assert doc.is_default == 0
