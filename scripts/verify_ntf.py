import frappe
frappe.init(site="at.localhost", sites_path="/home/aykut/frappe-bench/sites")
frappe.connect()
rows = frappe.get_all("AT Notification Template", fields=["name", "template_key"])
print("AT Notification Template:")
for r in rows:
    print(f"  {r['name']} -> {r['template_key']}")
