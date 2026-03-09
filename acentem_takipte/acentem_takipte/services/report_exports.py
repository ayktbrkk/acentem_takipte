from __future__ import annotations

from datetime import datetime
from io import BytesIO
from typing import Any

import frappe
from frappe.utils.pdf import get_pdf
from openpyxl import Workbook
from openpyxl.styles import Font


REPORT_TITLES = {
    "policy_list": {"tr": "Police Listesi Raporu", "en": "Policy List Report"},
    "payment_status": {"tr": "Tahsilat Durumu Raporu", "en": "Payment Status Report"},
    "renewal_performance": {"tr": "Yenileme Performans Raporu", "en": "Renewal Performance Report"},
    "claim_loss_ratio": {"tr": "Hasar Prim Orani Raporu", "en": "Claim Loss Ratio Report"},
    "agent_performance": {"tr": "Acente Uretim Karnesi", "en": "Agency Performance Scorecard"},
    "customer_segmentation": {"tr": "Musteri Segmentasyon Raporu", "en": "Customer Segmentation Report"},
}


def build_report_filename(report_key: str, export_format: str) -> str:
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_key = "".join(char if char.isalnum() or char in {"_", "-"} else "_" for char in str(report_key or "report"))
    extension = "pdf" if export_format == "pdf" else "xlsx"
    return f"{safe_key}_{timestamp}.{extension}"


def build_report_title(report_key: str, locale: str = "tr") -> str:
    entry = REPORT_TITLES.get(report_key, {})
    return entry.get(locale) or entry.get("en") or str(report_key or "Report")


def render_report_pdf(
    *,
    report_key: str,
    columns: list[str],
    rows: list[dict[str, Any]],
    filters: dict[str, Any],
    locale: str = "tr",
) -> bytes:
    report_title = build_report_title(report_key, locale)
    html = frappe.render_template(
        """
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; font-size: 11px; color: #0f172a; }
              .header { margin-bottom: 16px; }
              .title { font-size: 18px; font-weight: 700; }
              .meta { margin-top: 6px; color: #475569; font-size: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; }
              th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
              th { background: #e2e8f0; font-weight: 700; }
              .summary { margin-top: 10px; font-size: 10px; color: #334155; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">{{ report_title }}</div>
              <div class="meta">Filters: {{ filters }}</div>
              <div class="summary">Total rows: {{ rows|length }}</div>
            </div>
            <table>
              <thead>
                <tr>
                  {% for column in columns %}
                  <th>{{ column }}</th>
                  {% endfor %}
                </tr>
              </thead>
              <tbody>
                {% for row in rows %}
                <tr>
                  {% for column in columns %}
                  <td>{{ row.get(column, "") }}</td>
                  {% endfor %}
                </tr>
                {% endfor %}
              </tbody>
            </table>
          </body>
        </html>
        """,
        {
            "report_title": report_title,
            "columns": columns,
            "rows": rows,
            "filters": filters,
        },
    )
    return get_pdf(html)


def render_report_xlsx(
    *,
    report_key: str,
    columns: list[str],
    rows: list[dict[str, Any]],
    filters: dict[str, Any],
    locale: str = "tr",
) -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Report"

    title = build_report_title(report_key, locale)
    sheet["A1"] = title
    sheet["A1"].font = Font(bold=True, size=14)
    sheet["A2"] = f"Filters: {filters}"
    sheet["A3"] = f"Total rows: {len(rows)}"

    header_row = 5
    for index, column in enumerate(columns, start=1):
        cell = sheet.cell(row=header_row, column=index, value=column)
        cell.font = Font(bold=True)

    for row_index, row in enumerate(rows, start=header_row + 1):
        for column_index, column in enumerate(columns, start=1):
            sheet.cell(row=row_index, column=column_index, value=row.get(column))

    buffer = BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()
