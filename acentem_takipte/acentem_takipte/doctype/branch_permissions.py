from __future__ import annotations

import frappe

from acentem_takipte.acentem_takipte.services.branches import (
    get_allowed_office_branch_names,
    user_can_access_all_office_branches,
)
from acentem_takipte.acentem_takipte.services.break_glass import is_break_glass_active
from acentem_takipte.acentem_takipte.services.sales_entities import (
    get_allowed_sales_entity_names,
    user_can_access_all_sales_entities,
)


def build_office_branch_permission_query(
    doctype: str,
    *,
    fieldname: str = "office_branch",
    table_name: str | None = None,
    user: str | None = None,
) -> str:
    user_id = user or frappe.session.user
    if user_can_access_all_office_branches(user_id):
        return ""

    allowed_branch_names = sorted(get_allowed_office_branch_names(user_id))
    if not allowed_branch_names:
        return "1=0"

    target_table = table_name or f"`tab{doctype}`"
    escaped_branch_names = ", ".join(_escape_sql_literal(branch) for branch in allowed_branch_names)
    return f"{target_table}.`{fieldname}` in ({escaped_branch_names})"


def build_branch_and_sales_entity_permission_query(
    doctype: str,
    *,
    office_branch_fieldname: str = "office_branch",
    sales_entity_fieldname: str = "sales_entity",
    table_name: str | None = None,
    user: str | None = None,
    strict_sales_entity: bool = False,
) -> str:
    user_id = user or frappe.session.user
    if user_can_access_all_office_branches(user_id) and user_can_access_all_sales_entities(user_id):
        return ""

    branch_condition = build_office_branch_permission_query(
        doctype,
        fieldname=office_branch_fieldname,
        table_name=table_name,
        user=user_id,
    )
    if not _doctype_has_column(doctype, sales_entity_fieldname):
        return branch_condition

    allowed_sales_entities = sorted(get_allowed_sales_entity_names(user_id))
    if not allowed_sales_entities:
        if strict_sales_entity:
            return "1=0"
        return branch_condition

    target_table = table_name or f"`tab{doctype}`"
    escaped_entity_names = ", ".join(_escape_sql_literal(name) for name in allowed_sales_entities)
    entity_condition = f"{target_table}.`{sales_entity_fieldname}` in ({escaped_entity_names})"
    if branch_condition:
        return f"({branch_condition}) and ({entity_condition})"
    return entity_condition


def _escape_sql_literal(value: str) -> str:
    """Escape values for SQL IN clauses even when frappe.db is unavailable in tests."""
    try:
        return frappe.db.escape(value)
    except RuntimeError:
        normalized = str(value).replace("'", "''")
        return f"'{normalized}'"


def _doctype_has_column(doctype: str, fieldname: str) -> bool:
    try:
        return bool(frappe.db.has_column(doctype, fieldname))
    except RuntimeError:
        return True


def has_office_branch_permission(
    doc,
    *,
    fieldname: str = "office_branch",
    user: str | None = None,
) -> bool:
    user_id = user or frappe.session.user
    if user_can_access_all_office_branches(user_id):
        return True

    allowed_branch_names = get_allowed_office_branch_names(user_id)
    branch_name = getattr(doc, fieldname, None)
    if branch_name is None and hasattr(doc, "get"):
        branch_name = doc.get(fieldname)
    return str(branch_name or "").strip() in allowed_branch_names


def has_branch_and_sales_entity_permission(
    doc,
    *,
    office_branch_fieldname: str = "office_branch",
    sales_entity_fieldname: str = "sales_entity",
    user: str | None = None,
    strict_sales_entity: bool = False,
) -> bool:
    user_id = user or frappe.session.user
    if user_can_access_all_office_branches(user_id) and user_can_access_all_sales_entities(user_id):
        return True

    if not has_office_branch_permission(doc, fieldname=office_branch_fieldname, user=user_id):
        return False

    entity_name = getattr(doc, sales_entity_fieldname, None)
    if entity_name is None and hasattr(doc, "get"):
        entity_name = doc.get(sales_entity_fieldname)
    entity_name = str(entity_name or "").strip()
    if not entity_name:
        return not strict_sales_entity

    allowed_entities = get_allowed_sales_entity_names(user_id)
    if not allowed_entities:
        return not strict_sales_entity
    return entity_name in allowed_entities


def get_lead_permission_query_conditions(user=None):
    # AT Lead uses origin_office_branch for permission queries per kanon branch model
    # (docs/acente-erisim.md#L999-L1008)
    return build_branch_and_sales_entity_permission_query(
        "AT Lead",
        office_branch_fieldname="origin_office_branch",
        sales_entity_fieldname="sales_entity",
        user=user,
    )


def has_lead_permission(doc, user=None, permission_type="read"):
    # AT Lead uses origin_office_branch for permission checks per kanon branch model
    return has_branch_and_sales_entity_permission(
        doc,
        office_branch_fieldname="origin_office_branch",
        sales_entity_fieldname="sales_entity",
        user=user,
    )


def get_offer_permission_query_conditions(user=None):
    # AT Offer uses origin_office_branch for permission queries per kanon branch model
    # (docs/acente-erisim.md#L999-L1008)
    return build_branch_and_sales_entity_permission_query(
        "AT Offer",
        office_branch_fieldname="origin_office_branch",
        sales_entity_fieldname="sales_entity",
        user=user,
    )


def has_offer_permission(doc, user=None, permission_type="read"):
    # AT Offer uses origin_office_branch for permission checks per kanon branch model
    return has_branch_and_sales_entity_permission(
        doc,
        office_branch_fieldname="origin_office_branch",
        sales_entity_fieldname="sales_entity",
        user=user,
    )


def get_policy_permission_query_conditions(user=None):
    # AT Policy uses origin_office_branch for permission queries per kanon branch model
    # (docs/acente-erisim.md#L999-L1008)
    # List view permission = origin_office_branch (historical access preserved)
    # Operational queries = current_office_branch (handled separately)
    return build_branch_and_sales_entity_permission_query(
        "AT Policy",
        office_branch_fieldname="origin_office_branch",
        sales_entity_fieldname="sales_entity",
        user=user,
    )


def has_policy_permission(doc, user=None, permission_type="read"):
    # AT Policy uses origin_office_branch for permission checks per kanon branch model
    return has_branch_and_sales_entity_permission(
        doc,
        office_branch_fieldname="origin_office_branch",
        sales_entity_fieldname="sales_entity",
        user=user,
    )


def get_payment_permission_query_conditions(user=None):
    # AT Payment uses origin_office_branch for permission queries per kanon branch model
    # (docs/acente-erisim.md#L999-L1008)
    return build_branch_and_sales_entity_permission_query(
        "AT Payment",
        office_branch_fieldname="origin_office_branch",
        sales_entity_fieldname="sales_entity",
        user=user,
    )


def has_payment_permission(doc, user=None, permission_type="read"):
    # AT Payment uses origin_office_branch for permission checks per kanon branch model
    return has_branch_and_sales_entity_permission(
        doc,
        office_branch_fieldname="origin_office_branch",
        sales_entity_fieldname="sales_entity",
        user=user,
    )


def get_claim_permission_query_conditions(user=None):
    # AT Claim uses origin_office_branch for permission queries per kanon branch model
    # (docs/acente-erisim.md#L999-L1008)
    if is_break_glass_active(user, "AT Claim"):
        return ""
    return build_office_branch_permission_query(
        "AT Claim",
        fieldname="origin_office_branch",
        user=user,
    )


def has_claim_permission(doc, user=None, permission_type="read"):
    # AT Claim uses origin_office_branch for permission checks per kanon branch model
    if has_office_branch_permission(doc, fieldname="origin_office_branch", user=user):
        return True
    return is_break_glass_active(user, "AT Claim")


def get_renewal_task_permission_query_conditions(user=None):
    # AT Renewal Task uses origin_office_branch for permission queries per kanon branch model
    # (docs/acente-erisim.md#L999-L1008)
    return build_office_branch_permission_query(
        "AT Renewal Task",
        fieldname="origin_office_branch",
        user=user,
    )


def has_renewal_task_permission(doc, user=None, permission_type="read"):
    # AT Renewal Task uses origin_office_branch for permission checks per kanon branch model
    return has_office_branch_permission(
        doc,
        fieldname="origin_office_branch",
        user=user,
    )


def get_accounting_entry_permission_query_conditions(user=None):
    # AT Accounting Entry uses origin_office_branch for permission queries per kanon branch model
    # (docs/acente-erisim.md#L999-L1008)
    # List view permission = origin_office_branch (historical access preserved)
    # Historical reports = origin_office_branch (accounting consistency)
    return build_branch_and_sales_entity_permission_query(
        "AT Accounting Entry",
        office_branch_fieldname="origin_office_branch",
        sales_entity_fieldname="sales_entity",
        user=user,
    )


def has_accounting_entry_permission(doc, user=None, permission_type="read"):
    # AT Accounting Entry uses origin_office_branch for permission checks per kanon branch model
    return has_branch_and_sales_entity_permission(
        doc,
        office_branch_fieldname="origin_office_branch",
        sales_entity_fieldname="sales_entity",
        user=user,
    )


def get_reconciliation_item_permission_query_conditions(user=None):
    user_id = user or frappe.session.user
    if user_can_access_all_office_branches(user_id):
        return ""

    allowed_branch_names = sorted(get_allowed_office_branch_names(user_id))
    if not allowed_branch_names:
        return "1=0"

    escaped_branch_names = ", ".join(_escape_sql_literal(branch) for branch in allowed_branch_names)
    return (
        "`tabAT Reconciliation Item`.`accounting_entry` in ("
        "select name from `tabAT Accounting Entry` "
        f"where `office_branch` in ({escaped_branch_names}))"
    )


def has_reconciliation_item_permission(doc, user=None, permission_type="read"):
    user_id = user or frappe.session.user
    if user_can_access_all_office_branches(user_id):
        return True

    allowed_branch_names = get_allowed_office_branch_names(user_id)
    accounting_entry = getattr(doc, "accounting_entry", None)
    if accounting_entry is None and hasattr(doc, "get"):
        accounting_entry = doc.get("accounting_entry")
    if not accounting_entry:
        return False
    branch_name = frappe.db.get_value("AT Accounting Entry", accounting_entry, "office_branch")
    return str(branch_name or "").strip() in allowed_branch_names


def get_notification_draft_permission_query_conditions(user=None):
    # AT Notification Draft uses origin_office_branch for permission queries per kanon branch model
    # (docs/acente-erisim.md#L999-L1008)
    return build_office_branch_permission_query(
        "AT Notification Draft",
        fieldname="origin_office_branch",
        user=user,
    )


def has_notification_draft_permission(doc, user=None, permission_type="read"):
    # AT Notification Draft uses origin_office_branch for permission checks per kanon branch model
    return has_office_branch_permission(
        doc,
        fieldname="origin_office_branch",
        user=user,
    )


def get_renewal_outcome_permission_query_conditions(user=None):
    # AT Renewal Outcome uses origin_office_branch for permission queries per kanon branch model
    # (docs/acente-erisim.md#L999-L1008)
    return build_office_branch_permission_query(
        "AT Renewal Outcome",
        fieldname="origin_office_branch",
        user=user,
    )


def has_renewal_outcome_permission(doc, user=None, permission_type="read"):
    # AT Renewal Outcome uses origin_office_branch for permission checks per kanon branch model
    return has_office_branch_permission(
        doc,
        fieldname="origin_office_branch",
        user=user,
    )


def get_payment_installment_permission_query_conditions(user=None):
    # AT Payment Installment uses origin_office_branch for permission queries per kanon branch model
    # (docs/acente-erisim.md#L999-L1008)
    # Permission check via parent Payment using origin_office_branch
    user_id = user or frappe.session.user
    if user_can_access_all_office_branches(user_id):
        return ""

    allowed_branch_names = sorted(get_allowed_office_branch_names(user_id))
    if not allowed_branch_names:
        return "1=0"

    escaped_branch_names = ", ".join(_escape_sql_literal(branch) for branch in allowed_branch_names)
    return (
        "`tabAT Payment Installment`.`payment` in ("
        "select name from `tabAT Payment` "
        f"where `origin_office_branch` in ({escaped_branch_names}))"
    )


def has_payment_installment_permission(doc, user=None, permission_type="read"):
    # AT Payment Installment uses origin_office_branch for permission checks per kanon branch model
    user_id = user or frappe.session.user
    if user_can_access_all_office_branches(user_id):
        return True

    allowed_branch_names = get_allowed_office_branch_names(user_id)
    payment = getattr(doc, "payment", None)
    if payment is None and hasattr(doc, "get"):
        payment = doc.get("payment")
    if not payment:
        return False
    branch_name = frappe.db.get_value("AT Payment", payment, "origin_office_branch")
    return str(branch_name or "").strip() in allowed_branch_names


def get_call_note_permission_query_conditions(user=None):
    # AT Call Note uses origin_office_branch for permission queries per kanon branch model
    # (docs/acente-erisim.md#L999-L1008)
    return build_office_branch_permission_query(
        "AT Call Note",
        fieldname="origin_office_branch",
        user=user,
    )


def has_call_note_permission(doc, user=None, permission_type="read"):
    # AT Call Note uses origin_office_branch for permission checks per kanon branch model
    return has_office_branch_permission(
        doc,
        fieldname="origin_office_branch",
        user=user,
    )


def get_segment_permission_query_conditions(user=None):
    # AT Segment uses origin_office_branch for permission queries per kanon branch model
    # (docs/acente-erisim.md#L999-L1008)
    return build_office_branch_permission_query(
        "AT Segment",
        fieldname="origin_office_branch",
        user=user,
    )


def has_segment_permission(doc, user=None, permission_type="read"):
    # AT Segment uses origin_office_branch for permission checks per kanon branch model
    return has_office_branch_permission(
        doc,
        fieldname="origin_office_branch",
        user=user,
    )


def get_campaign_permission_query_conditions(user=None):
    # AT Campaign uses origin_office_branch for permission queries per kanon branch model
    # (docs/acente-erisim.md#L999-L1008)
    return build_office_branch_permission_query(
        "AT Campaign",
        fieldname="origin_office_branch",
        user=user,
    )


def has_campaign_permission(doc, user=None, permission_type="read"):
    # AT Campaign uses origin_office_branch for permission checks per kanon branch model
    return has_office_branch_permission(
        doc,
        fieldname="origin_office_branch",
        user=user,
    )


def get_notification_outbox_permission_query_conditions(user=None):
    # AT Notification Outbox uses origin_office_branch for permission queries per kanon branch model
    # (docs/acente-erisim.md#L999-L1008)
    return build_office_branch_permission_query(
        "AT Notification Outbox",
        fieldname="origin_office_branch",
        user=user,
    )


def has_notification_outbox_permission(doc, user=None, permission_type="read"):
    # AT Notification Outbox uses origin_office_branch for permission checks per kanon branch model
    return has_office_branch_permission(
        doc,
        fieldname="origin_office_branch",
        user=user,
    )


def get_activity_permission_query_conditions(user=None):
    # AT Activity uses origin_office_branch for permission queries per kanon branch model
    # (docs/acente-erisim.md#L999-L1008)
    return build_office_branch_permission_query(
        "AT Activity",
        fieldname="origin_office_branch",
        user=user,
    )


def has_activity_permission(doc, user=None, permission_type="read"):
    # AT Activity uses origin_office_branch for permission checks per kanon branch model
    return has_office_branch_permission(
        doc,
        fieldname="origin_office_branch",
        user=user,
    )


def get_task_permission_query_conditions(user=None):
    # AT Task uses origin_office_branch for permission queries per kanon branch model
    # (docs/acente-erisim.md#L999-L1008)
    return build_office_branch_permission_query(
        "AT Task",
        fieldname="origin_office_branch",
        user=user,
    )


def has_task_permission(doc, user=None, permission_type="read"):
    # AT Task uses origin_office_branch for permission checks per kanon branch model
    return has_office_branch_permission(
        doc,
        fieldname="origin_office_branch",
        user=user,
    )


def get_reminder_permission_query_conditions(user=None):
    # AT Reminder uses origin_office_branch for permission queries per kanon branch model
    # (docs/acente-erisim.md#L999-L1008)
    return build_office_branch_permission_query(
        "AT Reminder",
        fieldname="origin_office_branch",
        user=user,
    )


def has_reminder_permission(doc, user=None, permission_type="read"):
    # AT Reminder uses origin_office_branch for permission checks per kanon branch model
    return has_office_branch_permission(
        doc,
        fieldname="origin_office_branch",
        user=user,
    )


def get_ownership_assignment_permission_query_conditions(user=None):
    # AT Ownership Assignment uses origin_office_branch for permission queries per kanon branch model
    # (docs/acente-erisim.md#L999-L1008)
    return build_office_branch_permission_query(
        "AT Ownership Assignment",
        fieldname="origin_office_branch",
        user=user,
    )


def has_ownership_assignment_permission(doc, user=None, permission_type="read"):
    # AT Ownership Assignment uses origin_office_branch for permission checks per kanon branch model
    return has_office_branch_permission(
        doc,
        fieldname="origin_office_branch",
        user=user,
    )


def get_policy_endorsement_permission_query_conditions(user=None):
    policy_condition = get_policy_permission_query_conditions(user=user)
    if not policy_condition:
        return ""
    if policy_condition == "1=0":
        return "1=0"
    return (
        "`tabAT Policy Endorsement`.`policy` in ("
        "select name from `tabAT Policy` "
        f"where {policy_condition})"
    )


def has_policy_endorsement_permission(doc, user=None, permission_type="read"):
    user_id = user or frappe.session.user
    if user_can_access_all_office_branches(user_id):
        return True

    policy_name = getattr(doc, "policy", None)
    if policy_name is None and hasattr(doc, "get"):
        policy_name = doc.get("policy")
    policy_name = str(policy_name or "").strip()
    if not policy_name:
        return False

    policy_row = frappe.db.get_value(
        "AT Policy",
        policy_name,
        ["office_branch", "sales_entity"],
        as_dict=True,
    ) or {}
    if not policy_row:
        return False
    return has_policy_permission(policy_row, user=user_id, permission_type=permission_type)

