from __future__ import annotations

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
]


class ATPolicy(Document):
    def autoname(self):
        if self.name:
            return
        self.name = make_autoname("AT-POL-.YYYY.-.######")

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
        self.gwp_try = self.gross_premium * flt(self.fx_rate)

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

    def after_insert(self):
        notification_policy_no = self.policy_no or self.name
        try:
            baseline_snapshot = create_policy_snapshot(
                self,
                snapshot_type="Baseline",
                source_doctype=self.doctype,
                source_name=self.name,
                snapshot_version=1,
                notes="Baseline snapshot",
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
            self.fx_date = self.start_date or self.issue_date or nowdate()
            return

        if self.fx_rate > 0:
            if not self.fx_date:
                self.fx_date = self.start_date or self.issue_date or nowdate()
            return

        reference_date = getdate(self.start_date or self.issue_date or nowdate())
        rate, rate_date = fetch_tcmb_rate(self.currency, reference_date)

        if not rate:
            frappe.throw(
                _("TCMB exchange rate is unavailable. Enter FX Rate manually.")
            )

        self.fx_rate = rate
        self.fx_date = rate_date


def fetch_tcmb_rate(currency: str, reference_date):
    for day_offset in range(0, 8):
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
        response = requests.get(url, timeout=5)
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
    doc.insert(ignore_permissions=True)
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
