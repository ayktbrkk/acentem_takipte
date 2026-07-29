import frappe, json
frappe.init(site="at.localhost", sites_path="/home/aykut/frappe-bench/sites")
frappe.connect()

from frappe.client import get_list
result = get_list(
    doctype="AT Policy",
    fields=[
        "name", "policy_no", "customer",
        "customer.full_name as customer_full_name",
        "insurance_company",
        "insurance_company.company_name as insurance_company_name",
        "branch",
        "branch.branch_name as branch_name",
    ],
    limit_page_length=2,
)
print("Result keys for row 2:", list(result[1].keys()) if len(result) > 1 else "N/A")
for r in result:
    print(f"POLICY: {r.get('name')}")
    print(f"  policy_no: {r.get('policy_no')}")
    print(f"  customer_full_name: {r.get('customer_full_name')}")
    print(f"  insurance_company: {r.get('insurance_company')}")
    print(f"  insurance_company_name: {r.get('insurance_company_name')}")
    print(f"  branch: {r.get('branch')}")
    print(f"  branch_name: {r.get('branch_name')}")
    print()
