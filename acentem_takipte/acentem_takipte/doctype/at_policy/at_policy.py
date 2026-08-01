from __future__ import annotations

import json
import requests
import xml.etree.ElementTree as ET

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.naming import make_autoname
from frappe.utils import add_days, flt, getdate, now_datetime, nowdate
from acentem_takipte.acentem_takipte.notifications import create_notification_drafts
from acentem_takipte.acentem_takipte.policy_documents import (
    attach_policy_pdf_to_customer_folder,
)
from acentem_takipte.acentem_takipte.utils.financials import normalize_financial_amounts
from acentem_takipte.acentem_takipte.utils.logging import log_redacted_error

POLICY_SNAPSHOT_FIELDS = [
    "name",
    "policy_no",
    "customer",
    "sales_entity",
    "insurance_company",
    "branch",
    "status",
    "issue_date",
    "start_date",
    "end_date",
    "currency",
    "fx_rate",
    "fx_date",
    "net_premium",
    "tax_amount",
    "commission_amount",
    "gross_premium",
    "commission",
    "commission_rate",
    "gwp_try",
    "plate",
    "document_serial_no",
    "brand_code",
    "model_year",
    "vehicle_make_model",
    "motor_no",
    "chassis_no",
    "uavt_code",
    "floor_count",
    "structure_type",
    "coverage_type",
    "network_type",
    "address",
    "gross_area_m2",
    "usage_type",
    "current_floor",
    "construction_year",
    "damage_status",
    "insurance_type",
    "inpatient_treatment",
    "outpatient_treatment",
    "maternity_coverage",
    "parent_policy",
    "endorsement_reference",
    "policy_version",
]


class ATPolicy(Document):
    def autoname(self):
        # Versioned policies created via apply_endorsement have name set
        # explicitly (e.g. AT-POL-2025-000001-01). Frappe desk manual
        # creation uses the autoname pattern below.
        if self.name:
            return
        self.name = make_autoname("AT-POL-.YYYY.-.######")

    def on_update(self):
        # Cache invalidation handled by hooks.py (_p360) — no direct call needed.
        if self.currency != "TRY" and (not self.fx_rate or self.is_new()):
            frappe.enqueue(
                "acentem_takipte.acentem_takipte.doctype.at_policy.at_policy.update_policy_fx_rate_async",
                policy_name=self.name,
                now=frappe.flags.in_test,
                enqueue_after_commit=True,
            )

    def on_trash(self):
        # Cache invalidation handled by hooks.py (_p360) — no direct call needed.
        pass

    def validate(self):
        self.policy_no = (self.policy_no or "").strip() or None
        issue_date = getdate(self.issue_date) if self.issue_date else None
        start_date = getdate(self.start_date) if self.start_date else None
        end_date = getdate(self.end_date) if self.end_date else None
        normalized = normalize_financial_amounts(
            net_premium=self.net_premium,
            tax_amount=self.tax_amount,
            commission_amount=flt(self.commission_amount) or flt(self.commission),
            gross_premium=self.gross_premium,
            zero_message_context="policy",
        )

        if issue_date and start_date and issue_date > start_date:
            frappe.throw(_("Issue date cannot be later than start date."))

        if start_date and end_date and start_date > end_date:
            frappe.throw(_("Start date cannot be later than end date."))

        self._validate_company_policy_number_uniqueness()
        self._validate_commission_period_lock()
        self.net_premium = normalized["net_premium"]
        self.tax_amount = normalized["tax_amount"]
        self.commission_amount = normalized["commission_amount"]
        self.commission = normalized["commission_amount"]
        self.gross_premium = normalized["gross_premium"]
        self.commission_rate = (
            (self.commission_amount / self.gross_premium) * 100
            if self.gross_premium
            else 0
        )
        self._set_exchange_rate()
        # gwp_try will be recalculated in background if fx_rate is updated
        self.gwp_try = self.gross_premium * flt(self.fx_rate)
        self.commission_distribution = _build_commission_distribution(
            self.sales_entity,
            self.commission_amount,
            flt(self.fx_rate),
        )
        self._validate_commission_distribution_total()

    def _validate_commission_distribution_total(self) -> None:
        """Ensure commission distribution total equals commission_amount."""
        if not self.commission_distribution or self.commission_distribution == "[]":
            return
        import json
        entries = json.loads(self.commission_distribution)
        total = sum(flt(e.get("amount", 0)) for e in entries)
        if total <= 0:
            return
        if abs(total - flt(self.commission_amount)) > 0.01:
            frappe.throw(
                _("Commission distribution total ({0}) does not match commission amount ({1}).").format(
                    round(total, 2), round(flt(self.commission_amount), 2)
                )
            )

    def _validate_company_policy_number_uniqueness(self) -> None:
        if not self.policy_no or not self.insurance_company:
            return

        duplicate_name = frappe.db.get_value(
            "AT Policy",
            {
                "insurance_company": self.insurance_company,
                "policy_no": self.policy_no,
                "name": ["!=", self.name or ""],
            },
            "name",
        )
        if duplicate_name:
            frappe.throw(
                _("Carrier policy number already exists for {0}: {1}").format(
                    frappe.bold(self.insurance_company),
                    frappe.bold(self.policy_no),
                )
            )

    def _validate_commission_period_lock(self) -> None:
        if not self.insurance_company or not self.issue_date:
            return
        from acentem_takipte.acentem_takipte.doctype.at_commission_period.at_commission_period import (
            is_commission_period_locked,
        )
        if is_commission_period_locked(self.insurance_company, self.issue_date):
            if not self.is_new():
                old_commission = frappe.db.get_value(
                    "AT Policy", self.name, "commission_amount"
                )
                if flt(old_commission) != flt(self.commission_amount):
                    frappe.throw(
                        _("Cannot change commission amount for a policy in a locked commission period.")
                    )
            else:
                frappe.throw(
                    _("Cannot create a policy in a locked commission period.")
                )

    def after_insert(self):
        notification_policy_no = self.policy_no or self.name
        try:
            baseline_snapshot = create_policy_snapshot(
                self,
                snapshot_type=_("Baseline"),
                source_doctype=self.doctype,
                source_name=self.name,
                snapshot_version=1,
                notes=_("Baseline snapshot"),
            )
            self.db_set(
                "current_version",
                baseline_snapshot.snapshot_version,
                update_modified=False,
            )
        except Exception:
            log_redacted_error(
                "AT Policy Baseline Snapshot Error",
                details={"policy": self.name, "customer": self.customer},
            )

        try:
            create_notification_drafts(
                event_key="policy_created",
                template_key="policy_delivery",
                reference_doctype=self.doctype,
                reference_name=self.name,
                customer=self.customer,
                context={
                    "policy_no": notification_policy_no,
                    "carrier_policy_no": self.policy_no,
                    "record_no": self.name,
                    "issue_date": self.issue_date,
                    "start_date": self.start_date,
                    "end_date": self.end_date,
                    "currency": self.currency,
                    "net_premium": self.net_premium,
                    "tax_amount": self.tax_amount,
                    "commission_amount": self.commission_amount,
                    "gross_premium": self.gross_premium,
                    "commission": self.commission,
                    "insurance_company": self.insurance_company,
                    "branch": self.branch,
                },
            )
        except Exception:
            log_redacted_error(
                "AT Policy Notification Draft Error",
                details={
                    "policy": self.name,
                    "policy_no": self.policy_no,
                    "customer": self.customer,
                },
            )

        try:
            attach_policy_pdf_to_customer_folder(self)
        except Exception:
            log_redacted_error(
                "AT Policy PDF Attachment Error",
                details={
                    "policy": self.name,
                    "policy_no": self.policy_no,
                    "customer": self.customer,
                },
            )

    def _set_exchange_rate(self):
        self.currency = (self.currency or "TRY").upper()
        self.fx_rate = flt(self.fx_rate)

        if self.currency == "TRY":
            self.fx_rate = 1
            if not self.fx_date:
                self.fx_date = self.start_date or self.issue_date or nowdate()
            return

        if self.fx_rate > 0:
            if not self.fx_date:
                self.fx_date = self.start_date or self.issue_date or nowdate()
            return

        # If currency is not TRY and rate is not set, we don't block validation.
        # It will be fetched asynchronously in on_update/after_insert.
        if not self.fx_date:
            self.fx_date = self.start_date or self.issue_date or nowdate()

def update_policy_fx_rate_async(policy_name: str):
    """
    Background job to fetch FX rate from TCMB and update policy financials.
    """
    if not policy_name:
        return

    # Use db_get to avoid loading the whole doc if not needed yet
    currency, fx_rate, fx_date = frappe.db.get_value(
        "AT Policy", policy_name, ["currency", "fx_rate", "fx_date"]
    )

    if currency == "TRY" or flt(fx_rate) > 0:
        return

    # Fetch rate
    reference_date = getdate(fx_date or nowdate())
    rate, rate_date = fetch_tcmb_rate(currency, reference_date)

    if rate:
        # Update policy with new rate and recalculate gwp_try
        # We use frappe.get_doc to trigger any side effects if needed,
        # but since this is a background sync, db_set might be enough.
        # To be safe and ensure all calculated fields are correct, we load and save.
        doc = frappe.get_doc("AT Policy", policy_name)
        doc.fx_rate = rate
        doc.fx_date = rate_date
        doc.gwp_try = doc.gross_premium * flt(rate)
        doc.save(ignore_permissions=True)
        # Notify user via realtime if possible
        frappe.publish_realtime(
            "at_policy_fx_updated",
            {"policy": policy_name, "fx_rate": rate, "gwp_try": doc.gwp_try},
            user=doc.owner,
        )



def fetch_tcmb_rate(currency: str, reference_date):
    # 5-day window covers weekends + 1 holiday buffer; 8 was excessive.
    for day_offset in range(0, 5):
        lookup_date = add_days(reference_date, -day_offset)
        rate = _fetch_tcmb_rate_for_day(currency, lookup_date)
        if rate:
            return rate, lookup_date
    return None, None


def _fetch_tcmb_rate_for_day(currency: str, lookup_date):
    cache_key = f"tcmb_rate:{currency}:{lookup_date.strftime('%Y-%m-%d')}"
    cached_rate = frappe.cache().get_value(cache_key)
    if cached_rate:
        return flt(cached_rate)

    monthly_folder = lookup_date.strftime("%Y%m")
    daily_file = lookup_date.strftime("%d%m%Y")
    url = f"https://www.tcmb.gov.tr/kurlar/{monthly_folder}/{daily_file}.xml"

    try:
        response = requests.get(url, timeout=3)
        response.raise_for_status()
        xml_payload = response.content
    except requests.exceptions.RequestException:
        return None

    if _contains_unsafe_xml_constructs(xml_payload):
        return None

    try:
        parser = ET.XMLParser()
        parser.feed(xml_payload)
        xml_root = parser.close()
    except ET.ParseError:
        return None

    for currency_row in xml_root.findall("Currency"):
        if currency_row.attrib.get("CurrencyCode") != currency:
            continue

        raw_rate = (
            currency_row.findtext("ForexSelling")
            or currency_row.findtext("BanknoteSelling")
            or currency_row.findtext("ForexBuying")
            or currency_row.findtext("BanknoteBuying")
        )
        rate_found = _parse_tcmb_rate(raw_rate)
        if rate_found:
            frappe.cache().set_value(cache_key, rate_found, expires_in_sec=86400 * 7)
        return rate_found

    return None


def _parse_tcmb_rate(raw_rate: str | None):
    if not raw_rate:
        return None

    normalized = raw_rate.strip().replace(".", "").replace(",", ".")
    try:
        parsed_rate = flt(normalized)
    except Exception:
        return None

    return parsed_rate if parsed_rate > 0 else None


def _contains_unsafe_xml_constructs(xml_payload: bytes) -> bool:
    normalized = (xml_payload or b"").upper()
    return b"<!DOCTYPE" in normalized or b"<!ENTITY" in normalized


def serialize_policy_snapshot(policy_doc: ATPolicy) -> dict:
    return {
        fieldname: policy_doc.get(fieldname) for fieldname in POLICY_SNAPSHOT_FIELDS
    }


def create_policy_snapshot(
    policy_doc: ATPolicy,
    *,
    snapshot_type: str,
    source_doctype: str | None = None,
    source_name: str | None = None,
    snapshot_version: int | None = None,
    notes: str | None = None,
):
    if not snapshot_version:
        snapshot_version = _next_snapshot_version(policy_doc.name)

    snapshot_payload = serialize_policy_snapshot(policy_doc)
    snapshot_doc = frappe.get_doc(
        {
            "doctype": "AT Policy Snapshot",
            "policy": policy_doc.name,
            "snapshot_version": snapshot_version,
            "snapshot_type": snapshot_type,
            "source_doctype": source_doctype,
            "source_name": source_name,
            "snapshot_json": frappe.as_json(snapshot_payload),
            "captured_on": now_datetime(),
            "captured_by": frappe.session.user,
            "notes": notes,
        }
    )
    # ignore_permissions: Snapshot creation during policy update; internal operation.
    snapshot_doc.insert(ignore_permissions=True)
    return snapshot_doc


def _next_snapshot_version(policy_name: str) -> int:
    current = frappe.db.sql(
        """
        select max(snapshot_version)
        from `tabAT Policy Snapshot`
        where policy = %s
        """,
        policy_name,
    )[0][0]
    return (int(current) if current else 0) + 1


def _build_commission_distribution(
    sales_entity: str | None,
    commission_amount: float,
    fx_rate: float,
) -> str:
    """Build a head-office-centric commission distribution across the entity hierarchy.

    Each non-root entity retains commission_amount * share_pct / 100 of the original
    commission amount. The root entity receives all remaining commission.

    Example: Commission = 1000 TL, Rep(40%) → Sub(30%) → Agency(root):
      - Rep:     1000 × 40% = 400
      - Sub:     1000 × 30% = 300
      - Agency:  1000 − 400 − 300 = 300 (root gets remainder)
      Total: 400 + 300 + 300 = 1000

    Returns a JSON array of {entity, entity_name, level, share_pct, amount, amount_try, status}.
    Returns "[]" if commission <= 0 or no sales_entity."""
    commission = flt(commission_amount)
    fx = flt(fx_rate) or 1
    if commission <= 0 or not sales_entity:
        return "[]"
    entries: list[dict] = []
    level = 0
    current_entity: str | None = sales_entity
    visited: set[str] = set()
    non_root_total = 0.0
    remaining = commission
    root_entry: dict | None = None
    while current_entity and current_entity not in visited:
        visited.add(current_entity)
        entity_data = frappe.db.get_value(
            "AT Sales Entity",
            current_entity,
            ["commission_share_pct", "full_name", "parent_entity", "office_branch", "is_root"],
            as_dict=True,
        ) or {}
        share_pct = flt(entity_data.get("commission_share_pct") or 0)
        share_pct = max(0.0, min(100.0, share_pct))
        is_root = entity_data.get("is_root")
        parent = entity_data.get("parent_entity")
        entity_name = entity_data.get("full_name") or current_entity
        office_branch = entity_data.get("office_branch")
        if is_root:
            root_entry = {
                "entity": current_entity,
                "entity_name": entity_name,
                "level": level,
                "share_pct": share_pct,
                "amount": 0.0,
                "amount_try": 0.0,
                "status": "Accrued",
                "office_branch": office_branch,
                "is_root": True,
            }
            break
        entry_amount = round(commission * share_pct / 100, 2)
        non_root_total = round(non_root_total + entry_amount, 2)
        remaining = round(remaining - entry_amount, 2)
        entry_amount_try = round(entry_amount * fx, 2)
        entries.append({
            "entity": current_entity,
            "entity_name": entity_name,
            "level": level,
            "share_pct": share_pct,
            "amount": entry_amount,
            "amount_try": entry_amount_try,
            "status": "Accrued",
            "office_branch": office_branch,
            "is_root": False,
        })
        if remaining <= 0.01:
            break
        current_entity = parent
        level += 1
        if level > 20:
            break
    if root_entry is not None:
        root_amount = round(commission - non_root_total, 2)
        root_entry["amount"] = root_amount
        root_entry["amount_try"] = round(root_amount * fx, 2)
        entries.append(root_entry)
    return json.dumps(entries)
