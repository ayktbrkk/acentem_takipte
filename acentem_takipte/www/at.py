import frappe
from frappe.utils import now

from acentem_takipte.api.session import (
    _build_session_capabilities,
    _build_realtime_config,
    _resolve_session_interface,
    resolve_current_user,
)
from acentem_takipte.setup_utils import ensure_core_setup_once, ensure_user_default_role
from acentem_takipte.utils.assets import ensure_site_asset_symlink, get_asset_includes


def get_context(context):
    context.no_cache = 1
    context.full_width = True
    frappe.local.response["http_status_code"] = 200
    if frappe.session.user == "Guest":
        frappe.local.flags.redirect_location = "/login?redirect-to=/at"
        raise frappe.Redirect
    current_user = resolve_current_user()

    try:
        ensure_core_setup_once()
        if ensure_user_default_role(current_user):
            frappe.db.commit()
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Acentem Takipte /at bootstrap failed")

    ensure_site_asset_symlink()
    js_includes, css_includes = get_asset_includes(entry="src/main.js")
    asset_version = now()
    interface = _resolve_session_interface(current_user)
    context.at_js_includes = [_append_version(path, asset_version) for path in js_includes]
    context.at_css_includes = [_append_version(path, asset_version) for path in css_includes]
    context.at_preferred_home = interface["preferred_home"]
    context.at_interface_mode = interface["interface_mode"]
    context.at_session = {
        "user": current_user,
        "full_name": frappe.db.get_value("User", current_user, "full_name") or current_user,
        "branch": frappe.defaults.get_user_default("AT Branch"),
        "locale": (
            frappe.db.get_value("User", current_user, "language") or frappe.local.lang or "tr"
        ).split("-")[0],
        "capabilities": _build_session_capabilities(),
        "realtime": _build_realtime_config(),
        "roles": interface["roles"],
        "preferred_home": interface["preferred_home"],
        "interface_mode": interface["interface_mode"],
    }


def _append_version(path: str, version: str) -> str:
    separator = "&" if "?" in path else "?"
    return f"{path}{separator}v={version}"
