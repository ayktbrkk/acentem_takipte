from __future__ import annotations

from types import SimpleNamespace

import pytest
import frappe


@pytest.fixture(autouse=True)
def bind_frappe_local_context():
    frappe.local.flags = SimpleNamespace(in_test=True, mute_messages=True)
    frappe.local.request = None
    frappe.local.session = SimpleNamespace(user="Guest")
    yield
