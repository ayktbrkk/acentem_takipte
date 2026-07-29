import frappe
frappe.init(site="at.localhost", sites_path="/home/aykut/frappe-bench/sites")
frappe.connect()
meta = frappe.get_meta("AT Branch")
for f in meta.fields:
    if f.fieldname == "branch_name":
        print(f"Type: {f.fieldtype}, Unique: {f.unique}, Reqd: {f.reqd}")

from acentem_takipte.acentem_takipte.platform.services.quick_create_special import update_quick_aux_record
from acentem_takipte.acentem_takipte.platform.services.quick_create_helpers import _apply_aux_edit_payload

# Test with a manual approach
doc = frappe.get_doc("AT Branch", "Saglik")
print(f"Before apply: branch_name={doc.branch_name}")
_apply_aux_edit_payload(doc, {"branch_name": "Sa\u011fl\u0131k"})
print(f"After apply: branch_name={doc.branch_name}")
doc.save()
print(f"After save: {frappe.db.get_value('AT Branch', 'Saglik', 'branch_name')}")

# Check uniqueness
exists = frappe.db.exists("AT Branch", "Sa\u011fl\u0131k")
print(f"Exists Sa\u011fl\u0131k: {exists}")
