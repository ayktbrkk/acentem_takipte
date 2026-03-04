from __future__ import annotations

import json

import frappe
from frappe.permissions import add_permission, update_permission_property

from .utils.assets import ensure_site_asset_symlink

CORE_ROLES = ("Agent", "Manager", "Accountant")
CORE_ACCESS_ROLES = {"System Manager", "Agent", "Manager", "Accountant"}
CORE_SETUP_CACHE_KEY = "acentem_takipte:core_setup_done"
DESKTOP_ICON_LABEL = "Acentem Takipte"
DESKTOP_ICON_URL = "/at"
DESKTOP_ICON_IMAGE = "/assets/acentem_takipte/icons/acentem-takipte-at.svg"
WORKSPACE_SIDEBAR_TITLE = "Acentem Takipte"
WORKSPACE_SIDEBAR_MODULE = "Acentem Takipte"
WORKSPACE_SIDEBAR_APP = "acentem_takipte"
WORKSPACE_SIDEBAR_HEADER_ICON = "shield"
WORKSPACE_SIDEBAR_ITEMS = (
    {
        "type": "Link",
        "label": "Dashboard",
        "link_type": "URL",
        "url": "/at",
        "icon": "home",
    },
    {
        "type": "Section Break",
        "label": "Insurance Operations",
        "icon": "briefcase",
        "collapsible": 1,
    },
    {"type": "Link", "label": "Leads", "link_type": "DocType", "link_to": "AT Lead", "child": 1},
    {"type": "Link", "label": "Offers", "link_type": "DocType", "link_to": "AT Offer", "child": 1},
    {"type": "Link", "label": "Policies", "link_type": "DocType", "link_to": "AT Policy", "child": 1},
    {
        "type": "Link",
        "label": "Renewal Tasks",
        "link_type": "DocType",
        "link_to": "AT Renewal Task",
        "child": 1,
    },
    {"type": "Link", "label": "Claims", "link_type": "DocType", "link_to": "AT Claim", "child": 1},
    {"type": "Link", "label": "Payments", "link_type": "DocType", "link_to": "AT Payment", "child": 1},
    {
        "type": "Section Break",
        "label": "Customer & Communication",
        "icon": "message-circle",
        "collapsible": 1,
    },
    {
        "type": "Link",
        "label": "Customers",
        "link_type": "DocType",
        "link_to": "AT Customer",
        "child": 1,
    },
    {
        "type": "Link",
        "label": "Notification Drafts",
        "link_type": "DocType",
        "link_to": "AT Notification Draft",
        "child": 1,
    },
    {
        "type": "Link",
        "label": "Notification Outbox",
        "link_type": "DocType",
        "link_to": "AT Notification Outbox",
        "child": 1,
    },
    {
        "type": "Link",
        "label": "Notification Templates",
        "link_type": "DocType",
        "link_to": "AT Notification Template",
        "child": 1,
    },
    {
        "type": "Section Break",
        "label": "Finance & Control",
        "icon": "dollar-sign",
        "collapsible": 1,
    },
    {
        "type": "Link",
        "label": "Accounting Entries",
        "link_type": "DocType",
        "link_to": "AT Accounting Entry",
        "child": 1,
    },
    {
        "type": "Link",
        "label": "Reconciliation Items",
        "link_type": "DocType",
        "link_to": "AT Reconciliation Item",
        "child": 1,
    },
    {
        "type": "Section Break",
        "label": "Master Data",
        "icon": "database",
        "collapsible": 1,
    },
    {
        "type": "Link",
        "label": "Insurance Companies",
        "link_type": "DocType",
        "link_to": "AT Insurance Company",
        "child": 1,
    },
    {"type": "Link", "label": "Branches", "link_type": "DocType", "link_to": "AT Branch", "child": 1},
    {
        "type": "Link",
        "label": "Sales Entities",
        "link_type": "DocType",
        "link_to": "AT Sales Entity",
        "child": 1,
    },
)
PERMISSION_KEYS = (
    "read",
    "write",
    "create",
    "delete",
    "submit",
    "cancel",
    "amend",
    "report",
    "export",
    "import",
    "share",
    "print",
    "email",
)

FULL_ACCESS = {
    "read": 1,
    "write": 1,
    "create": 1,
    "delete": 1,
    "report": 1,
    "export": 1,
    "share": 1,
    "print": 1,
    "email": 1,
}
RW_ACCESS = {
    "read": 1,
    "write": 1,
    "create": 1,
    "report": 1,
    "print": 1,
    "email": 1,
}
READ_ACCESS = {
    "read": 1,
    "report": 1,
    "print": 1,
}

PERMISSION_MATRIX = {
    "AT Lead": {
        "Agent": {0: RW_ACCESS},
        "Manager": {0: FULL_ACCESS},
        "Accountant": {0: READ_ACCESS},
    },
    "AT Offer": {
        "Agent": {0: RW_ACCESS},
        "Manager": {0: FULL_ACCESS},
        "Accountant": {0: READ_ACCESS},
    },
    "AT Policy": {
        "Agent": {0: READ_ACCESS},
        "Manager": {0: FULL_ACCESS},
        "Accountant": {0: RW_ACCESS},
    },
    "AT Policy Endorsement": {
        "Agent": {0: RW_ACCESS},
        "Manager": {0: FULL_ACCESS},
        "Accountant": {0: RW_ACCESS},
    },
    "AT Policy Snapshot": {
        "Agent": {0: READ_ACCESS},
        "Manager": {0: FULL_ACCESS},
        "Accountant": {0: READ_ACCESS},
    },
    "AT Claim": {
        "Agent": {0: RW_ACCESS},
        "Manager": {0: FULL_ACCESS},
        "Accountant": {0: RW_ACCESS},
    },
    "AT Payment": {
        "Agent": {0: RW_ACCESS},
        "Manager": {0: FULL_ACCESS},
        "Accountant": {0: FULL_ACCESS},
    },
    "AT Renewal Task": {
        "Agent": {0: RW_ACCESS},
        "Manager": {0: FULL_ACCESS},
        "Accountant": {0: RW_ACCESS},
    },
    "AT Customer": {
        "Agent": {0: READ_ACCESS},
        "Manager": {0: FULL_ACCESS, 1: {"read": 1, "write": 1}},
        "Accountant": {0: READ_ACCESS, 1: {"read": 1}},
    },
    "AT Sales Entity": {
        "Agent": {0: READ_ACCESS},
        "Manager": {0: FULL_ACCESS},
        "Accountant": {0: READ_ACCESS},
    },
    "AT Insurance Company": {
        "Agent": {0: READ_ACCESS},
        "Manager": {0: FULL_ACCESS},
        "Accountant": {0: READ_ACCESS},
    },
    "AT Branch": {
        "Agent": {0: READ_ACCESS},
        "Manager": {0: FULL_ACCESS},
        "Accountant": {0: READ_ACCESS},
    },
    "AT Notification Template": {
        "Manager": {0: FULL_ACCESS},
        "Accountant": {0: READ_ACCESS},
    },
    "AT Notification Draft": {
        "Agent": {0: READ_ACCESS},
        "Manager": {0: FULL_ACCESS},
        "Accountant": {0: RW_ACCESS},
    },
    "AT Notification Outbox": {
        "Agent": {0: READ_ACCESS},
        "Manager": {0: FULL_ACCESS},
        "Accountant": {0: RW_ACCESS},
    },
    "AT Accounting Entry": {
        "Agent": {0: READ_ACCESS},
        "Manager": {0: FULL_ACCESS},
        "Accountant": {0: FULL_ACCESS},
    },
    "AT Reconciliation Item": {
        "Agent": {0: READ_ACCESS},
        "Manager": {0: FULL_ACCESS},
        "Accountant": {0: FULL_ACCESS},
    },
    "AT Access Log": {
        "Manager": {0: READ_ACCESS},
        "Accountant": {0: READ_ACCESS},
    },
}

DEFAULT_NOTIFICATION_TEMPLATES = (
    {
        "template_key": "policy_created_tr",
        "event_key": "policy_created",
        "channel": "Both",
        "language": "tr",
        "subject": "Policeniz olusturuldu: {{ policy_no }}",
        "body_template": (
            "Sayin {{ customer.full_name }},\n"
            "Policeniz olusturuldu.\n"
            "Police No: {{ policy_no }}\n"
            "Baslangic: {{ start_date }}\n"
            "Bitis: {{ end_date }}\n"
            "Prim: {{ gross_premium }} {{ currency }}"
        ),
    },
    {
        "template_key": "policy_created_en",
        "event_key": "policy_created",
        "channel": "Both",
        "language": "en",
        "subject": "Your policy has been created: {{ policy_no }}",
        "body_template": (
            "Dear {{ customer.full_name }},\n"
            "Your policy has been created.\n"
            "Policy No: {{ policy_no }}\n"
            "Start: {{ start_date }}\n"
            "End: {{ end_date }}\n"
            "Premium: {{ gross_premium }} {{ currency }}"
        ),
    },
    {
        "template_key": "renewal_due_tr",
        "event_key": "renewal_due",
        "channel": "Both",
        "language": "tr",
        "subject": "Police yenileme hatirlatmasi",
        "body_template": (
            "Sayin {{ customer.full_name }},\n"
            "Policenizin yenileme tarihi yaklasiyor.\n"
            "Police: {{ policy }}\n"
            "Yenileme: {{ renewal_date }}\n"
            "Son tarih: {{ due_date }}"
        ),
    },
    {
        "template_key": "renewal_due_en",
        "event_key": "renewal_due",
        "channel": "Both",
        "language": "en",
        "subject": "Policy renewal reminder",
        "body_template": (
            "Dear {{ customer.full_name }},\n"
            "Your policy renewal date is approaching.\n"
            "Policy: {{ policy }}\n"
            "Renewal date: {{ renewal_date }}\n"
            "Due date: {{ due_date }}"
        ),
    },
)


def after_install():
    ensure_core_setup()


def after_migrate():
    ensure_core_setup()


def ensure_core_setup_once():
    cache = frappe.cache()
    if cache.get_value(CORE_SETUP_CACHE_KEY):
        return
    ensure_core_setup()
    cache.set_value(CORE_SETUP_CACHE_KEY, 1)


def ensure_core_setup():
    changed = False
    ensure_site_asset_symlink()
    changed |= ensure_roles()
    changed |= ensure_role_permissions()
    changed |= ensure_default_notification_templates()
    changed |= ensure_desktop_icon()
    changed |= ensure_desktop_layout_shortcut()
    changed |= ensure_workspace_sidebar()
    if changed:
        frappe.db.commit()


def ensure_user_default_role(user: str | None = None) -> bool:
    target_user = user or frappe.session.user
    if target_user in {"Guest", "Administrator"}:
        return False

    roles = set(frappe.get_roles(target_user))
    if roles.intersection(CORE_ACCESS_ROLES):
        return False

    if not frappe.db.exists("Has Role", {"parent": target_user, "role": "Agent"}):
        frappe.get_doc(
            {
                "doctype": "Has Role",
                "parent": target_user,
                "parentfield": "roles",
                "parenttype": "User",
                "role": "Agent",
            }
        ).insert(ignore_permissions=True)
        frappe.clear_cache(user=target_user)
        return True

    return False


def ensure_roles() -> bool:
    changed = False
    for role_name in CORE_ROLES:
        if frappe.db.exists("Role", role_name):
            continue
        frappe.get_doc(
            {
                "doctype": "Role",
                "role_name": role_name,
                "desk_access": 1,
            }
        ).insert(ignore_permissions=True)
        changed = True
    return changed


def ensure_role_permissions() -> bool:
    changed = False
    for doctype, role_map in PERMISSION_MATRIX.items():
        if not frappe.db.exists("DocType", doctype):
            continue
        for role, permlevels in role_map.items():
            for permlevel, rule in permlevels.items():
                if not frappe.db.exists(
                    "Custom DocPerm",
                    {"parent": doctype, "role": role, "permlevel": permlevel, "if_owner": 0},
                ):
                    add_permission(doctype, role, permlevel=permlevel)
                    changed = True

                for key in PERMISSION_KEYS:
                    target_value = int(rule.get(key, 0))
                    current_value = frappe.db.get_value(
                        "Custom DocPerm",
                        {"parent": doctype, "role": role, "permlevel": permlevel, "if_owner": 0},
                        key,
                    )
                    if int(current_value or 0) == target_value:
                        continue
                    update_permission_property(
                        doctype,
                        role,
                        permlevel,
                        key,
                        value=target_value,
                        validate=False,
                    )
                    changed = True
        frappe.clear_cache(doctype=doctype)
    return changed


def ensure_default_notification_templates() -> bool:
    changed = False
    for template in DEFAULT_NOTIFICATION_TEMPLATES:
        if frappe.db.exists("AT Notification Template", template["template_key"]):
            continue

        frappe.get_doc(
            {
                "doctype": "AT Notification Template",
                "template_key": template["template_key"],
                "event_key": template["event_key"],
                "channel": template["channel"],
                "language": template["language"],
                "subject": template["subject"],
                "body_template": template["body_template"],
                "is_active": 1,
            }
        ).insert(ignore_permissions=True)
        changed = True
    return changed


def ensure_desktop_icon() -> bool:
    if not frappe.db.exists("DocType", "Desktop Icon"):
        return False

    changed = False
    existing_name = frappe.db.get_value("Desktop Icon", {"label": DESKTOP_ICON_LABEL}, "name")
    payload = {
        "doctype": "Desktop Icon",
        "label": DESKTOP_ICON_LABEL,
        "icon_type": "Link",
        "link_type": "External",
        "link": DESKTOP_ICON_URL,
        "link_to": None,
        "parent_icon": None,
        "standard": 0,
        "hidden": 0,
        "restrict_removal": 0,
        "bg_color": "blue",
        "logo_url": DESKTOP_ICON_IMAGE,
        "icon_image": DESKTOP_ICON_IMAGE,
    }

    if not existing_name:
        frappe.get_doc(payload).insert(ignore_permissions=True)
        return True

    doc = frappe.get_doc("Desktop Icon", existing_name)
    if doc.icon_type != payload["icon_type"]:
        doc.icon_type = payload["icon_type"]
        changed = True
    if doc.link_type != payload["link_type"]:
        doc.link_type = payload["link_type"]
        changed = True
    if doc.link != payload["link"]:
        doc.link = payload["link"]
        changed = True
    if doc.link_to:
        doc.link_to = None
        changed = True
    if doc.parent_icon:
        doc.parent_icon = None
        changed = True
    if int(doc.hidden or 0) != payload["hidden"]:
        doc.hidden = payload["hidden"]
        changed = True
    if int(doc.restrict_removal or 0) != payload["restrict_removal"]:
        doc.restrict_removal = payload["restrict_removal"]
        changed = True
    if doc.bg_color != payload["bg_color"]:
        doc.bg_color = payload["bg_color"]
        changed = True
    if (doc.logo_url or None) != payload["logo_url"]:
        doc.logo_url = payload["logo_url"]
        changed = True
    if (doc.icon_image or None) != payload["icon_image"]:
        doc.icon_image = payload["icon_image"]
        changed = True

    if changed:
        doc.save(ignore_permissions=True)
    return changed


def ensure_desktop_layout_shortcut() -> bool:
    if not frappe.db.exists("DocType", "Desktop Layout"):
        return False

    changed = False
    for row in frappe.get_all("Desktop Layout", fields=["name", "layout"]):
        layout = _parse_layout(row.layout)
        if not isinstance(layout, list):
            layout = []

        icon_exists = False
        normalized = []

        for item in layout:
            if not isinstance(item, dict):
                continue

            label = item.get("label") or item.get("name")
            url = item.get("url") or item.get("link")
            if label == DESKTOP_ICON_LABEL or url == DESKTOP_ICON_URL:
                icon_exists = True
                item = _desktop_layout_item()
            normalized.append(item)

        if not icon_exists:
            normalized.append(_desktop_layout_item())

        if normalized != layout:
            frappe.db.set_value("Desktop Layout", row.name, "layout", frappe.as_json(normalized))
            changed = True

    return changed


def _parse_layout(layout_raw: str | None) -> list:
    if not layout_raw:
        return []
    try:
        parsed = json.loads(layout_raw)
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return []


def _desktop_layout_item() -> dict:
    return {
        "label": DESKTOP_ICON_LABEL,
        "bg_color": "blue",
        "link": DESKTOP_ICON_URL,
        "link_type": "External",
        "app": "acentem_takipte",
        "icon_type": "Link",
        "parent_icon": None,
        "icon": "briefcase",
        "link_to": None,
        "idx": 0,
        "standard": 0,
        "logo_url": DESKTOP_ICON_IMAGE,
        "hidden": 0,
        "name": DESKTOP_ICON_LABEL,
        "restrict_removal": 0,
        "icon_image": DESKTOP_ICON_IMAGE,
        "url": DESKTOP_ICON_URL,
        "child_icons": [],
    }


def ensure_workspace_sidebar() -> bool:
    if not frappe.db.exists("DocType", "Workspace Sidebar"):
        return False

    sidebar_name = frappe.db.get_value(
        "Workspace Sidebar",
        {"title": WORKSPACE_SIDEBAR_TITLE},
        "name",
    )

    if sidebar_name:
        sidebar = frappe.get_doc("Workspace Sidebar", sidebar_name)
        is_new = False
    else:
        sidebar = frappe.new_doc("Workspace Sidebar")
        sidebar.title = WORKSPACE_SIDEBAR_TITLE
        is_new = True

    changed = is_new

    if sidebar.for_user:
        sidebar.for_user = None
        changed = True
    if sidebar.module != WORKSPACE_SIDEBAR_MODULE:
        sidebar.module = WORKSPACE_SIDEBAR_MODULE
        changed = True
    if sidebar.app != WORKSPACE_SIDEBAR_APP:
        sidebar.app = WORKSPACE_SIDEBAR_APP
        changed = True
    if sidebar.header_icon != WORKSPACE_SIDEBAR_HEADER_ICON:
        sidebar.header_icon = WORKSPACE_SIDEBAR_HEADER_ICON
        changed = True

    desired_items = _workspace_sidebar_items_payload()
    current_items = _workspace_sidebar_items_payload(sidebar.items)
    if desired_items != current_items:
        sidebar.set("items", desired_items)
        changed = True

    if is_new:
        sidebar.insert(ignore_permissions=True)
        return True
    if changed:
        sidebar.save(ignore_permissions=True)
    return changed


def _workspace_sidebar_items_payload(items=None) -> list[dict]:
    source = items or WORKSPACE_SIDEBAR_ITEMS
    payload = []
    for idx, item in enumerate(source, start=1):
        item_type = item.get("type", "Link")
        row = {
            "idx": idx,
            "type": item_type,
            "label": item.get("label"),
            "icon": item.get("icon"),
            "link_type": item.get("link_type"),
            "link_to": item.get("link_to"),
            "url": item.get("url"),
            "child": int(item.get("child", 0)),
            "collapsible": int(item.get("collapsible", 1 if item_type == "Section Break" else 0)),
            "indent": int(item.get("indent", 0)),
            "keep_closed": int(item.get("keep_closed", 0)),
            "show_arrow": int(item.get("show_arrow", 0)),
        }
        payload.append({k: v for k, v in row.items() if v is not None})
    return payload
