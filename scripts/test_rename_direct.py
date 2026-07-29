import frappe
frappe.init(site="at.localhost", sites_path="/home/aykut/frappe-bench/sites")
frappe.connect()

# Check current state
print("Before:", frappe.db.get_value("AT Branch", "Saglik", "branch_name") or "NOT FOUND")
print("Before Sa\u011fl\u0131k:", frappe.db.exists("AT Branch", "Sa\u011fl\u0131k"))

# Do the rename
try:
    result = frappe.rename_doc("AT Branch", "Saglik", "Sa\u011fl\u0131k", merge=False)
    print("Rename result:", result)
except Exception as e:
    print("Error:", e)

frappe.db.commit()

# Check after
print("After Saglik:", frappe.db.exists("AT Branch", "Saglik"))
print("After Sa\u011fl\u0131k:", frappe.db.exists("AT Branch", "Sa\u011fl\u0131k"))
print("After value:", frappe.db.get_value("AT Branch", "Sa\u011fl\u0131k", "branch_name") or "NOT FOUND")
