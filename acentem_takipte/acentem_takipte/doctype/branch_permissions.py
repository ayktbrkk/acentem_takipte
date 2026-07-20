from __future__ import annotations

import re

import frappe

from acentem_takipte.acentem_takipte.services.branches import (
    get_allowed_office_branch_names,
    user_can_access_all_office_branches,
)
from acentem_takipte.acentem_takipte.services.access_policy_runtime import (
    get_branch_scoped_doctype_policy,
    get_doctype_policy_definition,
)

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


def get_policy_scoped_permission_query_conditions(doctype: str, user=None):
    doctype_policy = _require_branch_scoped_policy(doctype)
    runtime_scope = doctype_policy.runtime_scope
    scope_type = str(runtime_scope.get("type") or "").strip()
    branch_field = str(runtime_scope.get("branch_field") or "office_branch")

    if _allows_break_glass(runtime_scope):
        return ""
    if scope_type == "branch_only":
        return build_office_branch_permission_query(doctype, fieldname=branch_field, user=user)
    if scope_type == "branch_and_sales_entity":
        sales_entity_field = str(runtime_scope.get("sales_entity_field") or "sales_entity")
        return build_branch_and_sales_entity_permission_query(
            doctype,
            office_branch_fieldname=branch_field,
            sales_entity_fieldname=sales_entity_field,
            user=user,
            strict_sales_entity=bool(runtime_scope.get("strict_sales_entity", False)),
        )
    raise ValueError(f"Unsupported policy-backed branch scope type '{scope_type}' for {doctype}.")


def has_policy_scoped_permission(doctype: str, doc, user=None, permission_type="read"):
    doctype_policy = _require_branch_scoped_policy(doctype)
    runtime_scope = doctype_policy.runtime_scope
    scope_type = str(runtime_scope.get("type") or "").strip()
    branch_field = str(runtime_scope.get("branch_field") or "office_branch")

    if scope_type == "branch_only":
        return has_office_branch_permission(doc, fieldname=branch_field, user=user)

    if scope_type == "branch_and_sales_entity":
        sales_entity_field = str(runtime_scope.get("sales_entity_field") or "sales_entity")
        return has_branch_and_sales_entity_permission(
            doc,
            office_branch_fieldname=branch_field,
            sales_entity_fieldname=sales_entity_field,
            user=user,
            strict_sales_entity=bool(runtime_scope.get("strict_sales_entity", False)),
        )

    raise ValueError(f"Unsupported policy-backed branch scope type '{scope_type}' for {doctype}.")


def _require_branch_scoped_policy(doctype: str):
    doctype_policy = get_branch_scoped_doctype_policy(doctype)
    if doctype_policy is None:
        raise KeyError(f"No policy-backed branch scope registered for {doctype}.")
    return doctype_policy


def _allows_break_glass(runtime_scope: dict[str, object]) -> bool:
    return False


def _validated_sql_identifier(value: str, *, field_name: str) -> str:
    normalized = str(value or "").strip()
    if not normalized or not re.fullmatch(r"[A-Za-z0-9_ ]+", normalized):
        raise ValueError(f"Invalid SQL identifier for {field_name}: {value!r}")
    return normalized


def get_linked_parent_permission_query_conditions(doctype: str, user=None):
    doctype_policy = _require_linked_parent_policy(doctype)
    runtime_scope = doctype_policy.runtime_scope
    child_doctype = _validated_sql_identifier(doctype, field_name="doctype")
    parent_doctype = _validated_sql_identifier(runtime_scope.get("parent_doctype") or "", field_name="parent_doctype")
    parent_field = _validated_sql_identifier(runtime_scope.get("parent_field") or "", field_name="parent_field")
    if not parent_doctype or not parent_field:
        raise ValueError(f"Linked parent scope for {child_doctype} must define parent_doctype and parent_field.")

    child_table = frappe.qb.DocType(child_doctype)
    parent_table = frappe.qb.DocType(parent_doctype)
    parent_criterion = _build_policy_scope_criterion(parent_doctype, parent_table, user=user)
    if parent_criterion is None:
        return ""
    if parent_criterion is False:
        return "1=0"

    parent_subquery = frappe.qb.from_(parent_table).select(parent_table.name)
    if parent_criterion is not None:
        parent_subquery = parent_subquery.where(parent_criterion)
    return getattr(child_table, parent_field).isin(parent_subquery).get_sql()


def has_linked_parent_permission(doctype: str, doc, user=None, permission_type="read"):
    doctype_policy = _require_linked_parent_policy(doctype)
    runtime_scope = doctype_policy.runtime_scope
    child_doctype = _validated_sql_identifier(doctype, field_name="doctype")
    parent_doctype = _validated_sql_identifier(runtime_scope.get("parent_doctype") or "", field_name="parent_doctype")
    parent_field = _validated_sql_identifier(runtime_scope.get("parent_field") or "", field_name="parent_field")
    if not parent_doctype or not parent_field:
        raise ValueError(f"Linked parent scope for {child_doctype} must define parent_doctype and parent_field.")

    parent_name = getattr(doc, parent_field, None)
    if parent_name is None and hasattr(doc, "get"):
        parent_name = doc.get(parent_field)
    parent_name = str(parent_name or "").strip()
    if not parent_name:
        return False

    parent_scope_policy = _require_branch_scoped_policy(parent_doctype)
    parent_scope = parent_scope_policy.runtime_scope
    parent_fields = [str(parent_scope.get("branch_field") or "office_branch")]
    if str(parent_scope.get("type") or "").strip() == "branch_and_sales_entity":
        parent_fields.append(str(parent_scope.get("sales_entity_field") or "sales_entity"))

    parent_row = frappe.db.get_value(parent_doctype, parent_name, parent_fields, as_dict=True) or {}
    if not parent_row:
        return False
    return has_policy_scoped_permission(parent_doctype, parent_row, user=user, permission_type=permission_type)


def _build_policy_scope_criterion(doctype: str, table, *, user=None):
    doctype_policy = _require_branch_scoped_policy(doctype)
    runtime_scope = doctype_policy.runtime_scope
    scope_type = str(runtime_scope.get("type") or "").strip()
    user_id = user or frappe.session.user

    if scope_type == "branch_only":
        if _allows_break_glass(runtime_scope):
            return None
        if user_can_access_all_office_branches(user_id):
            return None
        allowed_branch_names = sorted(get_allowed_office_branch_names(user_id))
        if not allowed_branch_names:
            return False
        branch_field = _validated_sql_identifier(runtime_scope.get("branch_field") or "office_branch", field_name="branch_field")
        return getattr(table, branch_field).isin(allowed_branch_names)

    if scope_type == "branch_and_sales_entity":
        branch_field = _validated_sql_identifier(runtime_scope.get("branch_field") or "office_branch", field_name="branch_field")
        sales_entity_field = _validated_sql_identifier(
            runtime_scope.get("sales_entity_field") or "sales_entity",
            field_name="sales_entity_field",
        )
        strict_sales_entity = bool(runtime_scope.get("strict_sales_entity", False))

        branch_criterion = None
        if not user_can_access_all_office_branches(user_id):
            allowed_branch_names = sorted(get_allowed_office_branch_names(user_id))
            if not allowed_branch_names:
                return False
            branch_criterion = getattr(table, branch_field).isin(allowed_branch_names)

        entity_criterion = None
        if _doctype_has_column(doctype, sales_entity_field) and not user_can_access_all_sales_entities(user_id):
            allowed_sales_entities = sorted(get_allowed_sales_entity_names(user_id))
            if not allowed_sales_entities:
                if strict_sales_entity:
                    return False
            else:
                entity_criterion = getattr(table, sales_entity_field).isin(allowed_sales_entities)

        if branch_criterion is not None and entity_criterion is not None:
            return branch_criterion & entity_criterion
        if branch_criterion is not None:
            return branch_criterion
        if entity_criterion is not None:
            return entity_criterion
        return None

    raise ValueError(f"Unsupported criterion-backed scope type '{scope_type}' for {doctype}.")


def _require_linked_parent_policy(doctype: str):
    doctype_policy = get_doctype_policy_definition(doctype)
    if doctype_policy is None:
        raise KeyError(f"No declarative policy registered for {doctype}.")
    if str(doctype_policy.runtime_scope.get("type") or "").strip() not in {"policy_link_scope", "payment_link_scope"}:
        raise KeyError(f"{doctype} does not use a declarative linked parent scope.")
    return doctype_policy


def get_lead_permission_query_conditions(user=None):
    return get_policy_scoped_permission_query_conditions("AT Lead", user=user)


def has_lead_permission(doc, user=None, permission_type="read"):
    return has_policy_scoped_permission("AT Lead", doc, user=user, permission_type=permission_type)


def get_offer_permission_query_conditions(user=None):
    return get_policy_scoped_permission_query_conditions("AT Offer", user=user)


def has_offer_permission(doc, user=None, permission_type="read"):
    return has_policy_scoped_permission("AT Offer", doc, user=user, permission_type=permission_type)


def get_policy_permission_query_conditions(user=None):
    return get_policy_scoped_permission_query_conditions("AT Policy", user=user)


def has_policy_permission(doc, user=None, permission_type="read"):
    return has_policy_scoped_permission("AT Policy", doc, user=user, permission_type=permission_type)


def get_payment_permission_query_conditions(user=None):
    return get_policy_scoped_permission_query_conditions("AT Payment", user=user)


def has_payment_permission(doc, user=None, permission_type="read"):
    return has_policy_scoped_permission("AT Payment", doc, user=user, permission_type=permission_type)


def get_claim_permission_query_conditions(user=None):
    return get_policy_scoped_permission_query_conditions("AT Claim", user=user)


def has_claim_permission(doc, user=None, permission_type="read"):
    return has_policy_scoped_permission("AT Claim", doc, user=user, permission_type=permission_type)


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
    return get_policy_scoped_permission_query_conditions("AT Notification Draft", user=user)


def has_notification_draft_permission(doc, user=None, permission_type="read"):
    return has_policy_scoped_permission("AT Notification Draft", doc, user=user, permission_type=permission_type)


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
    return get_linked_parent_permission_query_conditions("AT Payment Installment", user=user)


def has_payment_installment_permission(doc, user=None, permission_type="read"):
    return has_linked_parent_permission("AT Payment Installment", doc, user=user, permission_type=permission_type)


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
    return get_policy_scoped_permission_query_conditions("AT Notification Outbox", user=user)


def has_notification_outbox_permission(doc, user=None, permission_type="read"):
    return has_policy_scoped_permission("AT Notification Outbox", doc, user=user, permission_type=permission_type)


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
    return get_linked_parent_permission_query_conditions("AT Policy Endorsement", user=user)


def has_policy_endorsement_permission(doc, user=None, permission_type="read"):
    return has_linked_parent_permission("AT Policy Endorsement", doc, user=user, permission_type=permission_type)

