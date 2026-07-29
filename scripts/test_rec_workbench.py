import frappe, json, traceback
frappe.init(site="at.localhost", sites_path="/home/aykut/frappe-bench/sites")
frappe.connect()

try:
    from acentem_takipte.acentem_takipte.domains.accounting.services.runtime import build_reconciliation_workbench
    result = build_reconciliation_workbench()
    print("Result keys:", list(result.keys()) if result else "None")
    print("Row count:", len(result.get("rows", [])))
except Exception as e:
    traceback.print_exc()
