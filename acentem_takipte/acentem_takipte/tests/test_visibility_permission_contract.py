from __future__ import annotations

from acentem_takipte.acentem_takipte import setup_utils
from acentem_takipte import hooks


OPERATIONAL_VISIBLE_DIRECT_READ_DOCTYPES = {
    "AT Lead",
    "AT Offer",
    "AT Policy",
    "AT Claim",
    "AT Payment",
    "AT Payment Installment",
    "AT Renewal Task",
    "AT Call Note",
    "AT Segment",
    "AT Campaign",
    "AT Document",
    "AT Ownership Assignment",
    "AT Activity",
    "AT Task",
    "AT Reminder",
}

OPERATIONAL_ROLES = ("AT Agent", "AT Manager", "AT Accountant")


def test_visible_operational_doctypes_have_operational_read_access():
    for doctype in OPERATIONAL_VISIBLE_DIRECT_READ_DOCTYPES:
        role_map = setup_utils.PERMISSION_MATRIX.get(doctype)
        assert role_map, f"{doctype} is visible to operational users but missing from PERMISSION_MATRIX"
        for role in OPERATIONAL_ROLES:
            assert role in role_map, f"{doctype} is visible to {role} but has no role entry"
            assert role_map[role][0]["read"] == 1, f"{doctype} is visible to {role} but lacks read permission"


def test_visible_operational_doctypes_have_scope_hooks():
    for doctype in OPERATIONAL_VISIBLE_DIRECT_READ_DOCTYPES:
        assert doctype in hooks.permission_query_conditions, f"{doctype} is visible but has no permission query hook"
        assert doctype in hooks.has_permission, f"{doctype} is visible but has no has_permission hook"


def test_system_only_notification_queues_stay_outside_operational_permission_matrix():
    for doctype in ("AT Notification Draft", "AT Notification Outbox"):
        role_map = setup_utils.PERMISSION_MATRIX.get(doctype, {})
        assert "AT Agent" not in role_map
        assert "AT Manager" not in role_map
        assert "AT Accountant" not in role_map


def test_at_document_keeps_permanent_delete_outside_operational_visibility():
    role_map = setup_utils.PERMISSION_MATRIX["AT Document"]
    for role in OPERATIONAL_ROLES:
        assert role_map[role][0]["delete"] == 0