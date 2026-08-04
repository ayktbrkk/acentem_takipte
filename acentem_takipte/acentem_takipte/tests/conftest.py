from __future__ import annotations

import unittest
from types import SimpleNamespace

import pytest
import frappe

# Same type frappe.init() uses for ``local.flags`` (see frappe/__init__.py:
# ``local.flags = _dict({...})``). ``_dict`` exposes keys as attributes and
# returns ``None`` for unknown attributes (via ``dict.get``), so runtime code
# that reads flags such as ``in_migrate`` / ``dev_server`` keeps its real
# behavior instead of hitting ``AttributeError`` on a bare SimpleNamespace.
from frappe.types.frappedict import _dict

_MISSING = object()


def pytest_collection_modifyitems(session, config, items):
    """Runner separation: unittest.TestCase classes are the `bench run-tests`
    domain (they need the bench environment: before_tests hooks, test records,
    and a real session user). Pytest runs the plain pytest-function tests. This
    hook stops pytest from collecting unittest.TestCase classes so they are not
    silently run under the wrong runner and fail for environment reasons."""
    filtered = []
    for item in items:
        cls = getattr(item, "cls", None)
        if cls is not None and isinstance(cls, type) and issubclass(cls, unittest.TestCase):
            continue
        filtered.append(item)
    items[:] = filtered


@pytest.fixture(autouse=True)
def bind_frappe_local_context():
    """Bind a fresh, test-mode Frappe local context for every test.

    ``frappe.local`` is a werkzeug Local: reading an attribute that was never
    set raises AttributeError, and ``monkeypatch.setattr`` cannot attach new
    attributes to it. So this fixture reads the current values defensively and
    sets/restores them directly, always restoring the pre-test state in a
    ``finally`` block. No Frappe global state leaks between tests.

    - ``flags`` is a fresh ``_dict`` carrying the test-mode flags and the same
      defaults frappe.init() sets, so every flag a runtime path reads is either
      defined or reads ``None`` exactly like real Frappe.
    - ``request`` is cleared.
    - ``session`` keeps the real Session object (so runtime code that reads
      ``frappe.session.data`` / ``.sid`` keeps working) but simulates an
      anonymous user by setting ``user`` to ``Guest``. The original user is
      restored afterwards. Only when no real session exists (frappe.local not
      bound to a connected site) is a minimal session stub created.
    """
    original_flags = getattr(frappe.local, "flags", _MISSING)
    original_request = getattr(frappe.local, "request", _MISSING)
    original_session = getattr(frappe.local, "session", _MISSING)
    original_conf = getattr(frappe.local, "conf", _MISSING)
    original_user = (
        getattr(original_session, "user", _MISSING)
        if original_session is not _MISSING
        else _MISSING
    )
    try:
        frappe.local.flags = _dict(
            currently_saving=[],
            redirect_location="",
            in_install_db=False,
            in_install_app=False,
            in_import=False,
            in_test=True,
            mute_messages=True,
            ignore_links=False,
            mute_emails=False,
            has_dataurl=False,
            new_site=False,
            read_only=False,
        )
        frappe.local.request = None
        # A few tests replace frappe.local wholesale; make sure the site conf
        # (read by frappe.conf -> LocalProxy -> local.conf for e.g. db_name in
        # cache keys) is always present so later tests don't hit an unbound proxy.
        if original_conf is not _MISSING:
            frappe.local.conf = original_conf
        elif not getattr(frappe.local, "conf", None):
            try:
                frappe.local.conf = frappe.get_site_config()
            except Exception:
                frappe.local.conf = _dict()
        if original_session is not _MISSING:
            frappe.local.session.user = "Guest"
        else:
            frappe.local.session = SimpleNamespace(user="Guest", data={})
        yield
    finally:
        frappe.local.flags = original_flags
        if original_request is not _MISSING:
            frappe.local.request = original_request
        if original_conf is not _MISSING:
            frappe.local.conf = original_conf
        if original_session is not _MISSING:
            if original_user is not _MISSING:
                frappe.local.session.user = original_user
        else:
            frappe.local.session = original_session
