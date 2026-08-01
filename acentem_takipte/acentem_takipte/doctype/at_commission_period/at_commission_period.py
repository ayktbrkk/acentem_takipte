from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate, now_datetime

from acentem_takipte.acentem_takipte.domains.accounting.services.runtime import (
    COMMISSION_DUE_DAYS,
)


class ATCommissionPeriod(Document):
    def validate(self):
        self._set_period_label()
        self._validate_no_overlap()
        self._validate_dates()

    def _set_period_label(self):
        if self.period_start:
            start = getdate(self.period_start)
            self.period_label = f"{start.year}-{start.month:02d}"

    def _validate_dates(self):
        if self.period_start and self.period_end:
            if getdate(self.period_start) > getdate(self.period_end):
                frappe.throw(_("Period start cannot be after period end."))

    def _validate_no_overlap(self):
        if not self.insurance_company or not self.period_start or not self.period_end:
            return
        start = str(self.period_start)
        end = str(self.period_end)
        existing = frappe.db.get_value(
            "AT Commission Period",
            {
                "insurance_company": self.insurance_company,
                "name": ["!=", self.name or ""],
                "period_end": [">=", start],
                "period_start": ["<=", end],
            },
            "name",
        )
        if existing:
            frappe.throw(
                _("A commission period already exists for {0} in this date range: {1}").format(
                    self.insurance_company, existing
                )
            )

    def before_save(self):
        if self.status == "Locked" and not self.locked_by:
            self.locked_by = frappe.session.user
            self.locked_on = now_datetime()


def is_commission_period_locked(insurance_company: str, reference_date) -> bool:
    """Check if a commission period is locked for the given company and date."""
    if not insurance_company:
        return False
    date_val = str(reference_date)[:10] if reference_date else ""
    if not date_val:
        return False
    return bool(
        frappe.db.exists(
            "AT Commission Period",
            {
                "insurance_company": insurance_company,
                "status": "Locked",
                "period_start": ["<=", date_val],
                "period_end": [">=", date_val],
            },
        )
    )


def get_active_periods(insurance_company: str | None = None) -> list[dict]:
    """Return active/locked commission periods, optionally filtered by company."""
    filters = {"status": ["in", ["Open", "Reconciled", "Locked"]]}
    if insurance_company:
        filters["insurance_company"] = insurance_company
    periods = frappe.get_all(
        "AT Commission Period",
        filters=filters,
        fields=["name", "insurance_company", "period_start", "period_end",
                "period_label", "status", "locked_by", "locked_on"],
        order_by="period_start desc",
        limit_page_length=100,
    )
    return periods
