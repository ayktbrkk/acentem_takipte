from __future__ import annotations

import json
from collections import Counter
from typing import Any

import frappe
from frappe import _
from frappe.utils import flt

from acentem_takipte.acentem_takipte.platform.api.security import (
    assert_authenticated,
    assert_doctype_permission,
)

# AuxWorkbench screens that request full-dataset summary aggregates. Restricting
# the doctype here prevents the generic endpoint from being abused for
# arbitrary reads beyond the app's aux screens.
SUMMARY_DOCTYPES = {
    "AT Task",
    "AT Reminder",
    "AT Notification Draft",
    "AT Notification Outbox",
    "AT Access Log",
    "AT Customer Segment Snapshot",
    "File",
}

_COMPARISON_OPS = {">", ">=", "<", "<=", "=", "!=", "like"}


def _coerce_json(value: Any) -> Any:
    if value is None or value == "":
        return None
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return value
    return value


def _match(row: dict, condition: list) -> bool:
    if not isinstance(condition, list) or len(condition) < 3:
        return True
    field, op, target = condition[0], str(condition[1]).strip(), condition[2]
    actual = row.get(field)
    op = op.lower()
    if op == "=":
        return str(actual or "") == str(target or "")
    if op == "!=":
        return str(actual or "") != str(target or "")
    if op == "like":
        return str(target or "") in str(actual or "")
    try:
        a = float(actual)
        b = float(target)
    except (TypeError, ValueError):
        a = str(actual or "")
        b = str(target or "")
    if op == ">":
        return a > b
    if op == ">=":
        return a >= b
    if op == "<":
        return a < b
    if op == "<=":
        return a <= b
    return False


@frappe.whitelist()
def get_aux_workbench_summary(
    doctype: str,
    filters: str | dict | None = None,
    or_filters: str | list | None = None,
    group_fields: str | list | None = None,
    matches: str | list | None = None,
    numeric_fields: str | list | None = None,
) -> dict[str, Any]:
    """Return exact summary aggregates over the FULL filtered, permission-scoped
    dataset for an AuxWorkbench screen. No row cap: the frontend receives a
    small summary dict, never the underlying rows.

    - group_fields: fields to GROUP BY, returned as {field: {value: count}}.
    - matches: [{key, conditions: [[field, op, value], ...]}] exact match counts.
    - numeric_fields: fields to SUM/COUNT (e.g. score) -> {field: {sum, count}}.
    """
    assert_authenticated()

    safe_doctype = str(doctype or "").strip()
    if safe_doctype not in SUMMARY_DOCTYPES:
        frappe.throw(_("Unsupported summary doctype"))

    assert_doctype_permission(
        safe_doctype,
        "read",
        _("You do not have permission to view {0} summaries.").format(safe_doctype),
    )

    coerced_filters = _coerce_json(filters) or {}
    if not isinstance(coerced_filters, dict):
        coerced_filters = {}
    coerced_or = _coerce_json(or_filters) or None
    group_fields = [str(f) for f in (_coerce_json(group_fields) or []) if f]
    matches = _coerce_json(matches) or []
    if not isinstance(matches, list):
        matches = []
    numeric_fields = [str(f) for f in (_coerce_json(numeric_fields) or []) if f]

    fields = []
    seen = set()
    for f in list(group_fields) + numeric_fields:
        if f and f not in seen:
            fields.append(f)
            seen.add(f)

    rows = frappe.get_list(
        safe_doctype,
        fields=fields or ["name"],
        filters=coerced_filters,
        or_filters=coerced_or or None,
        limit_page_length=0,
    )

    result: dict[str, Any] = {
        "total": len(rows),
        "group_by": {},
        "matches": {},
        "numeric": {},
    }

    for field in group_fields:
        counter: Counter = Counter()
        for row in rows:
            value = row.get(field)
            if value is None:
                value = ""
            counter[str(value)] += 1
        result["group_by"][field] = dict(counter)

    for spec in matches:
        if not isinstance(spec, dict):
            continue
        key = str(spec.get("key") or "").strip()
        if not key:
            continue
        conditions = spec.get("conditions") or []
        if not isinstance(conditions, list):
            conditions = []
        any_conditions = spec.get("any_conditions") or []
        if not isinstance(any_conditions, list):
            any_conditions = []
        result["matches"][key] = sum(
            1
            for row in rows
            if all(_match(row, cond) for cond in conditions)
            and (not any_conditions or any(_match(row, cond) for cond in any_conditions))
        )

    for field in numeric_fields:
        total_value = 0.0
        count_value = 0
        for row in rows:
            value = row.get(field)
            numeric = flt(value)
            if value is None or value == "":
                continue
            total_value += numeric
            count_value += 1
        result["numeric"][field] = {"sum": round(total_value, 2), "count": count_value}

    return result
