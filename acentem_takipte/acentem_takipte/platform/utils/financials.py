from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import flt


MONEY_TOLERANCE = 0.01


def normalize_financial_amounts(
    *,
    net_premium,
    tax_amount,
    commission_amount,
    gross_premium,
    allow_all_zero: bool = False,
    zero_message_context: str = "record",
) -> dict[str, float]:
    gross_value = flt(gross_premium)
    net_value = flt(net_premium)
    tax_value = flt(tax_amount)
    commission_value = flt(commission_amount)

    if allow_all_zero and gross_value <= 0 and net_value <= 0 and tax_value == 0 and commission_value == 0:
        return {
            "net_premium": 0,
            "tax_amount": 0,
            "commission_amount": 0,
            "gross_premium": 0,
        }

    if tax_value < 0:
        frappe.throw(_("Tax amount cannot be negative."))
    if commission_value < 0:
        frappe.throw(_("Commission amount cannot be negative."))

    if net_value <= 0 and gross_value <= 0:
        frappe.throw(_("Either Net Premium or Gross Premium must be greater than zero for this {0}.").format(_(zero_message_context)))

    if net_value <= 0 and gross_value > 0:
        net_value = gross_value - tax_value - commission_value

    if net_value <= 0:
        frappe.throw(_("Net premium must be greater than zero after deductions."))

    calculated_gross = net_value + tax_value + commission_value
    if calculated_gross <= 0:
        frappe.throw(_("Gross premium must be greater than zero."))

    if gross_value > 0 and abs(gross_value - calculated_gross) > MONEY_TOLERANCE:
        frappe.throw(_("Gross premium must equal Net Premium + Commission Amount + Tax Amount."))

    return {
        "net_premium": net_value,
        "tax_amount": tax_value,
        "commission_amount": commission_value,
        "gross_premium": calculated_gross,
    }
