from __future__ import annotations

import frappe
from frappe.utils import cint, flt

from acentem_takipte.acentem_takipte.platform.api.security import (
    assert_authenticated,
    assert_doctype_permission,
)
from acentem_takipte.acentem_takipte.domains.commissions.services.balance import (
    compute_commission_balances,
    compute_commission_policy_detail,
    compute_entity_hierarchy,
    validate_share_pct_totals,
)
from acentem_takipte.acentem_takipte.domains.accounting.services.statement_import import (
    build_statement_import_preview,
    generate_missing_external_for_commission_statement,
    import_commission_statement_rows,
)


@frappe.whitelist()
def get_commission_balances(
    office_branch: str | None = None,
    aging_bucket: str = "all",
    limit: int = 100,
    from_date: str | None = None,
    to_date: str | None = None,
    insurance_company: str | None = None,
) -> dict:
    assert_authenticated()
    assert_doctype_permission(
        "AT Policy",
        "read",
        "You do not have permission to view commission balances.",
    )
    assert_doctype_permission(
        "AT Payment",
        "read",
        "You do not have permission to view commission balances.",
    )
    return compute_commission_balances(
        office_branch=office_branch,
        aging_bucket=aging_bucket,
        limit=max(cint(limit), 1),
        from_date=from_date,
        to_date=to_date,
        insurance_company=insurance_company,
    )


@frappe.whitelist()
def get_commission_policy_detail(
    entity_name: str,
    insurance_company: str | None = None,
    limit: int = 50,
    from_date: str | None = None,
    to_date: str | None = None,
) -> dict:
    assert_authenticated()
    assert_doctype_permission(
        "AT Policy",
        "read",
        "You do not have permission to view commission details.",
    )
    return compute_commission_policy_detail(
        entity_name=entity_name,
        insurance_company=insurance_company,
        limit=max(cint(limit), 1),
        from_date=from_date,
        to_date=to_date,
    )


@frappe.whitelist()
def upload_commission_statement_preview(
    csv_text: str,
    office_branch: str | None = None,
    insurance_company: str | None = None,
    delimiter: str = ",",
    limit: int = 200,
) -> dict:
    assert_authenticated()
    assert_doctype_permission(
        "AT Policy",
        "read",
        "You do not have permission to preview commission statements.",
    )
    assert_doctype_permission(
        "AT Accounting Entry",
        "read",
        "You do not have permission to preview commission statements.",
    )
    return build_statement_import_preview(
        csv_text=csv_text,
        office_branch=office_branch,
        insurance_company=insurance_company,
        delimiter=delimiter,
        limit=min(max(cint(limit), 1), 1000),
        statement_type="commission",
    )


@frappe.whitelist()
def import_commission_statement(
    csv_text: str,
    office_branch: str | None = None,
    insurance_company: str | None = None,
    delimiter: str = ",",
    limit: int = 200,
    generate_missing: bool = True,
) -> dict:
    assert_authenticated()
    assert_doctype_permission(
        "AT Policy",
        "read",
        "You do not have permission to import commission statements.",
    )
    assert_doctype_permission(
        "AT Accounting Entry",
        "write",
        "You do not have permission to import commission statements.",
    )
    assert_doctype_permission(
        "AT Reconciliation Item",
        "write",
        "You do not have permission to import commission statements.",
    )
    return import_commission_statement_rows(
        csv_text=csv_text,
        office_branch=office_branch,
        insurance_company=insurance_company,
        delimiter=delimiter,
        limit=min(max(cint(limit), 1), 1000),
        generate_missing=bool(generate_missing),
    )


@frappe.whitelist()
def generate_commission_missing_external(
    policy_refs: str,
    insurance_company: str | None = None,
    office_branch: str | None = None,
) -> dict:
    assert_authenticated()
    assert_doctype_permission(
        "AT Policy",
        "read",
        "You do not have permission to generate missing external items.",
    )
    assert_doctype_permission(
        "AT Accounting Entry",
        "write",
        "You do not have permission to generate missing external items.",
    )
    assert_doctype_permission(
        "AT Reconciliation Item",
        "write",
        "You do not have permission to generate missing external items.",
    )
    refs = frappe.parse_json(policy_refs) if isinstance(policy_refs, str) else policy_refs
    return generate_missing_external_for_commission_statement(
        policy_refs_from_statement=list(refs or []),
        insurance_company=insurance_company,
        office_branch=office_branch,
    )


@frappe.whitelist()
def get_commission_statement_history(
    insurance_company: str | None = None,
    limit: int = 10,
) -> dict:
    """Return recent commission statement imports with summary stats."""
    assert_authenticated()
    assert_doctype_permission(
        "AT Accounting Entry",
        "read",
        "You do not have permission to view statement history.",
    )

    filters: dict = {
        "source_doctype": "AT Policy",
        "entry_type": "Policy",
    }
    if insurance_company:
        filters["insurance_company"] = insurance_company

    entries = frappe.get_all(
        "AT Accounting Entry",
        filters=filters,
        fields=["name", "insurance_company", "external_ref", "local_amount_try",
                "external_amount_try", "external_ref", "creation", "payload_json"],
        order_by="creation desc",
        limit_page_length=max(cint(limit), 1),
    )

    result: list[dict] = []
    for e in entries:
        payload = {}
        try:
            raw = e.get("payload_json") or "{}"
            payload = frappe.parse_json(raw) if isinstance(raw, str) else raw
        except Exception:
            pass
        result.append({
            "name": e["name"],
            "insurance_company": e.get("insurance_company") or "",
            "external_ref": e.get("external_ref") or payload.get("external_ref", ""),
            "local_total": flt(e.get("local_amount_try") or 0),
            "external_total": flt(e.get("external_amount_try") or 0),
            "created": str(e.get("creation") or ""),
            "import_source": payload.get("import_source", ""),
        })

    return {"history": result}


@frappe.whitelist()
def get_commission_periods(
    insurance_company: str | None = None,
) -> list[dict]:
    assert_authenticated()
    from acentem_takipte.acentem_takipte.doctype.at_commission_period.at_commission_period import (
        get_active_periods,
    )
    return get_active_periods(insurance_company=insurance_company)


@frappe.whitelist()
def lock_commission_period(
    insurance_company: str,
    period_start: str,
    period_end: str,
) -> dict:
    assert_authenticated()
    assert_doctype_permission(
        "AT Commission Period",
        "write",
        "You do not have permission to lock commission periods.",
    )
    from acentem_takipte.acentem_takipte.doctype.at_commission_period.at_commission_period import (
        is_commission_period_locked,
    )
    from frappe.utils import now_datetime

    existing = frappe.db.get_value(
        "AT Commission Period",
        {
            "insurance_company": insurance_company,
            "period_start": period_start,
            "period_end": period_end,
        },
        "name",
    )
    if existing:
        frappe.db.set_value("AT Commission Period", existing, "status", "Locked")
        frappe.db.set_value("AT Commission Period", existing, "locked_by", frappe.session.user)
        frappe.db.set_value("AT Commission Period", existing, "locked_on", now_datetime())
        return {"name": existing, "status": "Locked"}

    doc = frappe.get_doc({
        "doctype": "AT Commission Period",
        "insurance_company": insurance_company,
        "period_start": period_start,
        "period_end": period_end,
        "status": "Locked",
    })
    doc.insert(ignore_permissions=True)
    return {"name": doc.name, "status": "Locked"}


@frappe.whitelist()
def get_entity_hierarchy(
    office_branch: str | None = None,
) -> dict:
    """Get the sales entity hierarchy tree for visualization."""
    assert_authenticated()
    assert_doctype_permission(
        "AT Sales Entity",
        "read",
        "You do not have permission to view sales entities.",
    )
    return compute_entity_hierarchy(office_branch=office_branch)


@frappe.whitelist()
def validate_entity_share_totals(
    office_branch: str | None = None,
) -> dict:
    """Validate that share_pct totals don't exceed 100%."""
    assert_authenticated()
    assert_doctype_permission(
        "AT Sales Entity",
        "read",
        "You do not have permission to view sales entities.",
    )
    violations = validate_share_pct_totals(office_branch=office_branch)
    return {"valid": len(violations) == 0, "violations": violations}
