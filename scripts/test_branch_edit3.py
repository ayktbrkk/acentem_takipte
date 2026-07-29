import frappe
frappe.init(site="at.localhost", sites_path="/home/aykut/frappe-bench/sites")
frappe.connect()

doc = frappe.get_doc("AT Branch", "Saglik")
print(f"Before: name={doc.name}, branch_name={doc.branch_name}")
doc.branch_name = "Sa\u011fl\u0131k"
doc.name = "Sa\u011fl\u0131k"  # Must also change the doc name
try:
    doc.save()
    print(f"After: {frappe.db.get_value('AT Branch', 'Sa\u011fl\u0131k', 'branch_name')}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
