import frappe
frappe.init(site="at.localhost", sites_path="/home/aykut/frappe-bench/sites")
frappe.connect()
meta = frappe.get_meta("AT Branch")
print("allow_rename:", getattr(meta, "allow_rename", "NOT FOUND"))
print("naming_rule:", meta.autoname)

# Also test rename directly
try:
    frappe.rename_doc("AT Branch", "Saglik", "Sa\u011fl\u0131k", merge=False)
    print("Rename succeeded")
except Exception as e:
    print(f"Rename error: {e}")
