from __future__ import annotations

import requests
import xml.etree.ElementTree as ET

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.naming import make_autoname
from frappe.utils import add_days, flt, getdate, now_datetime, nowdate
from acentem_takipte.acentem_takipte.notifications import create_notification_drafts
from acentem_takipte.acentem_takipte.policy_documents import attach_policy_pdf_to_customer_folder

MONEY_TOLERANCE = 0.01

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
        self.policy_no = (self.policy_no or "").strip()
        if self.policy_no:
            self.name = self.policy_no
            return

        generated_name = make_autoname("AT-POL-.#####.")
        self.name = generated_name
        self.policy_no = generated_name

    def validate(self):
        self.policy_no = (self.policy_no or "").strip()
        net_premium = flt(self.net_premium)
        tax_value = flt(self.tax_amount)
        commission_value = flt(self.commission_amount) or flt(self.commission)
        gross_premium = flt(self.gross_premium)
        issue_date = getdate(self.issue_date) if self.issue_date else None
        start_date = getdate(self.start_date) if self.start_date else None
        end_date = getdate(self.end_date) if self.end_date else None

        if commission_value < 0:
            frappe.throw(_("Commission amount cannot be negative."))

        if tax_value < 0:
            frappe.throw(_("Tax amount cannot be negative."))

        if net_premium <= 0 and gross_premium <= 0:
            frappe.throw(_("Either Net Premium or Gross Premium must be greater than zero."))

        if net_premium <= 0 and gross_premium > 0:
            net_premium = gross_premium - commission_value - tax_value

        if net_premium <= 0:
            frappe.throw(_("Net premium must be greater than zero after deductions."))

        calculated_gross = net_premium + commission_value + tax_value
        if calculated_gross <= 0:
            frappe.throw(_("Gross premium must be greater than zero."))

        if gross_premium > 0 and abs(gross_premium - calculated_gross) > MONEY_TOLERANCE:
            frappe.throw(_("Gross premium must equal Net Premium + Commission Amount + Tax Amount."))

        if issue_date and start_date and issue_date > start_date:
            frappe.throw(_("Issue date cannot be later than start date."))

        if start_date and end_date and start_date > end_date:
            frappe.throw(_("Start date cannot be later than end date."))

        self.net_premium = net_premium
        self.tax_amount = tax_value
        self.commission_amount = commission_value
        self.commission = commission_value
        self.gross_premium = calculated_gross
        self.commission_rate = (commission_value / calculated_gross) * 100 if calculated_gross else 0
        self._set_exchange_rate()
        self.gwp_try = calculated_gross * flt(self.fx_rate)

    def after_insert(self):
        try:
            baseline_snapshot = create_policy_snapshot(
                self,
                snapshot_type="Baseline",
                source_doctype=self.doctype,
                source_name=self.name,
                snapshot_version=1,
                notes="Baseline snapshot",
            )
            self.db_set("current_version", baseline_snapshot.snapshot_version, update_modified=False)
        except Exception:
            frappe.log_error(frappe.get_traceback(), "AT Policy Baseline Snapshot Error")

        try:
            create_notification_drafts(
                event_key="policy_created",
                reference_doctype=self.doctype,
                reference_name=self.name,
                customer=self.customer,
                context={
                    "policy_no": self.policy_no,
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
            frappe.log_error(frappe.get_traceback(), "AT Policy Notification Draft Error")

        try:
            attach_policy_pdf_to_customer_folder(self)
        except Exception:
            frappe.log_error(frappe.get_traceback(), "AT Policy PDF Attachment Error")

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
            frappe.throw(_("TCMB exchange rate is unavailable. Enter FX Rate manually."))

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

    try:
        xml_root = ET.fromstring(xml_payload)
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


def serialize_policy_snapshot(policy_doc: ATPolicy) -> dict:
    return {fieldname: policy_doc.get(fieldname) for fieldname in POLICY_SNAPSHOT_FIELDS}


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
    ).insert(ignore_permissions=True)
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
