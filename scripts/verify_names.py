import frappe
frappe.init(site="at.localhost", sites_path="/home/aykut/frappe-bench/sites")
frappe.connect()
for doctype, display_field in [
    ("AT Office Branch", "office_branch_name"),
    ("AT Insurance Company", "company_name"),
    ("AT Branch", "branch_name"),
]:
    rows = frappe.get_all(doctype, fields=["name", display_field])
    print(f"\n{doctype}:")
    for r in rows:
        print(f"  {r['name']} -> {r[display_field]}")
