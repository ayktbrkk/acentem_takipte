import frappe
frappe.init(site="at.localhost", sites_path="/home/aykut/frappe-bench/sites")
frappe.connect()
meta = frappe.get_meta("AT Branch")
for f in meta.fields:
    if f.fieldname in ("branch_name", "branch_code", "insurance_company"):
        print(f"{f.fieldname}: type={f.fieldtype}, readonly={f.read_only}, permlevel={f.permlevel}")

# Check autoname behavior
print(f"\nAutoname: {meta.autoname}")

# Try changing via rename_doc
doc = frappe.get_doc("AT Branch", "Saglik")
print(f"\nBefore: name={doc.name}, branch_name={doc.branch_name}")
try:
    frappe.rename_doc("AT Branch", "Saglik", "Sa\u011fl\u0131k", merge=False)
    print(f"After rename: {frappe.db.get_value('AT Branch', 'Sa\u011fl\u0131k', 'branch_name')}")
except Exception as e:
    print(f"Rename error: {e}")
