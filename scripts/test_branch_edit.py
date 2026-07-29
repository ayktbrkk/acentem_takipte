import frappe
frappe.init(site="at.localhost", sites_path="/home/aykut/frappe-bench/sites")
frappe.connect()

# Find the Saglik branch
branch = frappe.db.get_value("AT Branch", {"branch_name": "Saglik"}, ["name", "branch_name", "branch_code", "insurance_company", "is_active"], as_dict=True)
print("Before:", branch)

if branch:
    try:
        from acentem_takipte.acentem_takipte.platform.services.quick_create_special import update_quick_aux_record
        result = update_quick_aux_record(
            doctype="AT Branch",
            name=branch["name"],
            data={"branch_name": "Sa\u011fl\u0131k"},
        )
        print("Result:", result)
        
        # Verify
        updated = frappe.db.get_value("AT Branch", branch["name"], "branch_name")
        print("After verify:", updated)
    except Exception as e:
        print(f"Error: {e}")
