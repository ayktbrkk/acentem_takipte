import frappe
frappe.init(site="at.localhost", sites_path="/home/aykut/frappe-bench/sites")
frappe.connect()

recs = frappe.get_all("AT Reconciliation Item", fields=["name", "accounting_entry", "source_doctype", "source_name"])
print("Reconciliation items:")
for r in recs:
    print(f"  {r['name']}: acc_entry={r['accounting_entry']}, {r['source_doctype']}={r['source_name']}")

ents = frappe.get_all("AT Accounting Entry", fields=["name", "source_doctype", "source_name"])
print("\nAccounting entries:")
for e in ents:
    print(f"  {e['name']}: {e['source_doctype']}={e['source_name']}")
