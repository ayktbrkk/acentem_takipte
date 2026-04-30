from __future__ import annotations

import frappe
from frappe.utils import cint


def enforce_production_safety_flags(bootinfo=None):
    config = frappe.get_site_config() or {}
    if getattr(frappe.flags, "in_test", False):
        return bootinfo

    if cint(config.get("developer_mode", 0)):
        frappe.logger("acentem_takipte.startup").warning(
            "Production safety check skipped because developer_mode is enabled. "
            "Disable developer_mode before production deployment."
        )
        return bootinfo

    if cint(config.get("at_enable_demo_endpoints", 0)):
        message = (
            "Production safety check failed: 'at_enable_demo_endpoints' is enabled. "
            "Disable demo/smoke endpoints in site_config before allowing desk boot."
        )
        frappe.logger("acentem_takipte.startup").error(message)
        frappe.throw(message)

    return bootinfo