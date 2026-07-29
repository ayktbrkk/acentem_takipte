import frappe
frappe.init(site="at.localhost", sites_path="/home/aykut/frappe-bench/sites")
frappe.connect()
from acentem_takipte.acentem_takipte.domains.reports.services.reporting import get_policy_list_report_rows
rows = get_policy_list_report_rows({}, limit=3)
for r in rows:
    ic = r.get("insurance_company", "N/A")
    br = r.get("branch", "N/A")
    ob = r.get("office_branch", "N/A")
    st = r.get("status", "N/A")
    print(f"{ic} | {br} | {ob} | {st}")
