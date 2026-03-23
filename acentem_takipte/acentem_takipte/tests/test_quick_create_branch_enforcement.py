from __future__ import annotations

import pytest

from acentem_takipte.acentem_takipte.api import quick_create


def test_resolve_office_branch_validates_explicit_branch_access(monkeypatch):
    monkeypatch.setattr(quick_create, "_normalize_link", lambda doctype, value, required=False: value)
    monkeypatch.setattr(quick_create, "assert_office_branch_access", lambda office_branch=None, user=None: "ANK")

    assert quick_create._resolve_office_branch("ANK") == "ANK"


def test_resolve_office_branch_raises_for_disallowed_explicit_branch(monkeypatch):
    monkeypatch.setattr(quick_create, "_normalize_link", lambda doctype, value, required=False: value)
    monkeypatch.setattr(
        quick_create,
        "assert_office_branch_access",
        lambda office_branch=None, user=None: (_ for _ in ()).throw(Exception("denied")),
    )

    with pytest.raises(Exception):
        quick_create._resolve_office_branch("IST")

