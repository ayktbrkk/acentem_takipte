from __future__ import annotations

from frappe.utils import flt


def resolve_commission_amount(commission_amount=None, legacy_commission=None) -> float:
    if commission_amount not in (None, ""):
        return flt(commission_amount)
    return flt(legacy_commission)


def sync_legacy_commission_fields(doc, commission_amount=None) -> float:
    resolved_amount = resolve_commission_amount(
        commission_amount,
        getattr(doc, "commission", None),
    )
    if hasattr(doc, "commission_amount"):
        doc.commission_amount = resolved_amount
    if hasattr(doc, "commission"):
        doc.commission = resolved_amount
    return resolved_amount


def commission_sql_expr(alias: str = "") -> str:
    prefix = alias or ""
    return f"ifnull({prefix}commission_amount, {prefix}commission)"
