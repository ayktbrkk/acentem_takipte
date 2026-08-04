from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint, flt

from acentem_takipte.acentem_takipte.platform.api.security import (
    assert_authenticated,
    assert_doctype_permission,
)
from acentem_takipte.acentem_takipte.platform.api.mutation_access import (
    assert_role_based_write_access,
)
from acentem_takipte.acentem_takipte.utils.permissions import build_doctype_permission_map
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

COMMISSION_ADMIN_ROLES = ("System Manager", "AT Manager", "AT Accountant")
COMMISSION_MUTATION_DOCTYPES = build_doctype_permission_map(
    upload_preview=("AT Accounting Entry", "AT Policy"),
    import_statement=("AT Accounting Entry", "AT Reconciliation Item"),
    generate_missing=("AT Accounting Entry", "AT Reconciliation Item"),
    lock_period=("AT Commission Period",),
)


def _assert_commission_mutation_access(
    action: str,
    *,
    details: dict | None = None,
    permission_targets: tuple[str, ...],
) -> None:
    assert_role_based_write_access(
        action=action,
        roles=COMMISSION_ADMIN_ROLES,
        permission_targets=permission_targets,
        details=details,
        role_message="You do not have permission to run commission operations.",
        post_message="Only POST requests are allowed for commission mutations.",
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
    _assert_commission_mutation_access(
        "api.commissions.upload_commission_statement_preview",
        details={
            "office_branch": office_branch,
            "insurance_company": insurance_company,
            "delimiter": delimiter,
            "limit": limit,
        },
        permission_targets=COMMISSION_MUTATION_DOCTYPES["upload_preview"],
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
    _assert_commission_mutation_access(
        "api.commissions.import_commission_statement",
        details={
            "office_branch": office_branch,
            "insurance_company": insurance_company,
            "delimiter": delimiter,
            "limit": limit,
            "generate_missing": generate_missing,
        },
        permission_targets=COMMISSION_MUTATION_DOCTYPES["import_statement"],
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
    statement_batch: str | None = None,
    statement_period: str | None = None,
) -> dict:
    _assert_commission_mutation_access(
        "api.commissions.generate_commission_missing_external",
        details={
            "insurance_company": insurance_company,
            "office_branch": office_branch,
            "statement_batch": statement_batch,
            "statement_period": statement_period,
        },
        permission_targets=COMMISSION_MUTATION_DOCTYPES["generate_missing"],
    )
    refs = frappe.parse_json(policy_refs) if isinstance(policy_refs, str) else policy_refs
    from acentem_takipte.acentem_takipte.domains.accounting.services.statement_import import (
        _build_statement_batch_id,
    )

    refs = list(refs or [])

    # The batch identity must come from an explicit statement_batch or an
    # explicit statement_period — NEVER from the policy reference list. A
    # period-based batch is deterministic for the same (company, period) so
    # re-running the same period is idempotent while different periods get
    # distinct batches for the same policy.
    batch = str(statement_batch or "").strip()
    if not batch:
        period = str(statement_period or "").strip()
        if period:
            batch = _build_statement_batch_id(f"period:{period}", insurance_company)
        else:
            frappe.throw(
                _("A statement_batch or statement_period is required to generate Missing External entries.")
            )

    return generate_missing_external_for_commission_statement(
        policy_refs_from_statement=refs,
        insurance_company=insurance_company,
        office_branch=office_branch,
        statement_batch=batch,
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

    from acentem_takipte.acentem_takipte.domains.commissions.services.balance import (
        _is_commission_entry,
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
                "external_amount_try", "creation", "payload_json", "statement_type",
                "statement_batch", "import_source"],
        order_by="creation desc",
        limit_page_length=0,
    )
    entries = [e for e in entries if _is_commission_entry(e)][: max(cint(limit), 1)]

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
            "import_source": e.get("import_source") or payload.get("import_source", ""),
            "statement_type": e.get("statement_type") or payload.get("statement_type", ""),
            "statement_batch": e.get("statement_batch") or payload.get("statement_batch", ""),
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
    _assert_commission_mutation_access(
        "api.commissions.lock_commission_period",
        details={"insurance_company": insurance_company, "period_start": period_start, "period_end": period_end},
        permission_targets=COMMISSION_MUTATION_DOCTYPES["lock_period"],
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
