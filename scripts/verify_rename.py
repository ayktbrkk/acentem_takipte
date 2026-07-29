import frappe
frappe.init(site="at.localhost", sites_path="/home/aykut/frappe-bench/sites")
frappe.connect()

# Check if renamed
new_name = "Sa\u011fl\u0131k"
old_name = "Saglik"
print(f"Exists old ({old_name}):", frappe.db.exists("AT Branch", old_name))
print(f"Exists new ({new_name}):", frappe.db.exists("AT Branch", new_name))
if frappe.db.exists("AT Branch", new_name):
    print(f"New branch_name:", frappe.db.get_value("AT Branch", new_name, "branch_name"))
    print(f"New branch_code:", frappe.db.get_value("AT Branch", new_name, "branch_code"))
