import frappe
from acentem_takipte.acentem_takipte.api.reports import get_policy_list_report

try:
    # Set dummy session user if needed
    frappe.set_user("Administrator")
    res = get_policy_list_report()
    print("SUCCESS")
    print(res.keys())
except Exception:
    print(frappe.get_traceback())
