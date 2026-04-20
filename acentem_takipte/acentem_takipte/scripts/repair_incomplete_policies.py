from __future__ import annotations

from dataclasses import dataclass

import frappe
from frappe.utils import add_days, flt, getdate, nowdate


REQUIRED_POLICY_FIELDS = (
    "customer",
    "sales_entity",
    "insurance_company",
    "branch",
    "status",
    "issue_date",
    "start_date",
    "end_date",
    "currency",
)


@dataclass
class RepairDecision:
    policy_name: str
    source_offer: str | None
    changed_fields: list[str]
    skipped_reason: str | None = None


def _as_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    text = str(value or "").strip().lower()
    return text in {"1", "true", "yes", "on"}


def _is_missing(value) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    return False


def _has_financial_mismatch(doc) -> bool:
    gross = flt(doc.get("gross_premium") or 0)
    net = flt(doc.get("net_premium") or 0)
    tax = flt(doc.get("tax_amount") or 0)
    commission = flt(doc.get("commission_amount") or doc.get("commission") or 0)
    expected = round(net + tax + commission, 2)
    return gross <= 0 or abs(round(gross, 2) - expected) > 0.01


def _is_incomplete_policy(doc) -> bool:
    if any(_is_missing(doc.get(field)) for field in REQUIRED_POLICY_FIELDS):
        return True
    return _has_financial_mismatch(doc)


def _load_offer(offer_name: str | None):
    if not offer_name:
        return None
    if not frappe.db.exists("AT Offer", offer_name):
        return None
    return frappe.get_doc("AT Offer", offer_name)


def _apply_field(doc, fieldname: str, value, changed_fields: list[str]) -> None:
    if _is_missing(doc.get(fieldname)) and not _is_missing(value):
        doc.set(fieldname, value)
        changed_fields.append(fieldname)


def _repair_policy_from_offer(doc, offer, changed_fields: list[str]) -> None:
    if not offer:
        return

    _apply_field(doc, "customer", offer.get("customer"), changed_fields)
    _apply_field(doc, "office_branch", offer.get("office_branch"), changed_fields)
    _apply_field(doc, "sales_entity", offer.get("sales_entity"), changed_fields)
    _apply_field(doc, "insurance_company", offer.get("insurance_company"), changed_fields)
    _apply_field(doc, "branch", offer.get("branch"), changed_fields)

    _apply_field(doc, "issue_date", offer.get("offer_date"), changed_fields)
    _apply_field(doc, "start_date", offer.get("offer_date"), changed_fields)
    _apply_field(doc, "end_date", offer.get("valid_until"), changed_fields)
    _apply_field(doc, "currency", (offer.get("currency") or "TRY"), changed_fields)

    _apply_field(doc, "net_premium", flt(offer.get("net_premium") or 0), changed_fields)
    _apply_field(doc, "tax_amount", flt(offer.get("tax_amount") or 0), changed_fields)
    _apply_field(
        doc,
        "commission_amount",
        flt(offer.get("commission_amount") or 0),
        changed_fields,
    )

    gross_offer = flt(offer.get("gross_premium") or 0)
    if flt(doc.get("gross_premium") or 0) <= 0 and gross_offer > 0:
        doc.set("gross_premium", gross_offer)
        changed_fields.append("gross_premium")


def _apply_defaults(doc, changed_fields: list[str]) -> None:
    today = getdate(nowdate())
    if _is_missing(doc.get("status")):
        doc.set("status", "Active")
        changed_fields.append("status")

    if _is_missing(doc.get("issue_date")):
        doc.set("issue_date", today)
        changed_fields.append("issue_date")

    if _is_missing(doc.get("start_date")):
        doc.set("start_date", doc.get("issue_date") or today)
        changed_fields.append("start_date")

    if _is_missing(doc.get("end_date")):
        start = getdate(doc.get("start_date") or today)
        doc.set("end_date", add_days(start, 365))
        changed_fields.append("end_date")

    if _is_missing(doc.get("currency")):
        doc.set("currency", "TRY")
        changed_fields.append("currency")

    if flt(doc.get("gross_premium") or 0) <= 0:
        net = flt(doc.get("net_premium") or 0)
        tax = flt(doc.get("tax_amount") or 0)
        commission = flt(doc.get("commission_amount") or doc.get("commission") or 0)
        computed = round(net + tax + commission, 2)
        if computed > 0:
            doc.set("gross_premium", computed)
            changed_fields.append("gross_premium")


def _candidate_policies(limit: int) -> list[str]:
    rows = frappe.get_all(
        "AT Policy",
        fields=["name"],
        order_by="modified desc",
        limit_page_length=max(limit, 1),
    )
    return [str(row.get("name") or "").strip() for row in rows if row.get("name")]


def execute(dry_run=1, limit=500, require_source_offer=1) -> dict:
    dry_run_flag = _as_bool(dry_run)
    require_source_offer_flag = _as_bool(require_source_offer)
    limit_value = int(limit or 500)

    decisions: list[RepairDecision] = []
    repaired_count = 0
    skipped_count = 0

    for policy_name in _candidate_policies(limit_value):
        doc = frappe.get_doc("AT Policy", policy_name)
        if not _is_incomplete_policy(doc):
            continue

        source_offer = str(doc.get("source_offer") or "").strip() or None
        offer = _load_offer(source_offer)
        if require_source_offer_flag and not offer:
            skipped_count += 1
            decisions.append(
                RepairDecision(
                    policy_name=policy_name,
                    source_offer=source_offer,
                    changed_fields=[],
                    skipped_reason="source_offer_missing_or_invalid",
                )
            )
            continue

        changed_fields: list[str] = []
        _repair_policy_from_offer(doc, offer, changed_fields)
        _apply_defaults(doc, changed_fields)

        if not changed_fields:
            skipped_count += 1
            decisions.append(
                RepairDecision(
                    policy_name=policy_name,
                    source_offer=source_offer,
                    changed_fields=[],
                    skipped_reason="no_fillable_fields",
                )
            )
            continue

        if _is_incomplete_policy(doc):
            skipped_count += 1
            decisions.append(
                RepairDecision(
                    policy_name=policy_name,
                    source_offer=source_offer,
                    changed_fields=sorted(set(changed_fields)),
                    skipped_reason="still_incomplete_after_fill",
                )
            )
            continue

        if not dry_run_flag:
            # ignore_permissions: Administrative repair script.
            doc.save(ignore_permissions=True)

        repaired_count += 1
        decisions.append(
            RepairDecision(
                policy_name=policy_name,
                source_offer=source_offer,
                changed_fields=sorted(set(changed_fields)),
            )
        )

    if dry_run_flag:
        frappe.db.rollback()
    else:
        frappe.db.commit()

    preview = [
        {
            "policy": row.policy_name,
            "source_offer": row.source_offer,
            "changed_fields": row.changed_fields,
            "skipped_reason": row.skipped_reason,
        }
        for row in decisions[:100]
    ]

    return {
        "dry_run": dry_run_flag,
        "limit": limit_value,
        "require_source_offer": require_source_offer_flag,
        "repaired": repaired_count,
        "skipped": skipped_count,
        "preview": preview,
    }
