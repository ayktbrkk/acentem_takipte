import frappe
frappe.init(site="at.localhost", sites_path="/home/aykut/frappe-bench/sites")
frappe.connect()

# Test what the frontend would fetch
from frappe.client import get_list
import json

# Test case: fetch AT Insurance Company display name
result = get_list(
    doctype="AT Insurance Company",
    fields=["name", "company_name"],
    filters={"name": "AT-IC-2026-00001"},
    limit_page_length=1,
)
print("Test 1 - AT Insurance Company:")
print(json.dumps(result, indent=2, default=str))

# Test case: fetch AT Branch display name
result = get_list(
    doctype="AT Branch",
    fields=["name", "branch_name"],
    filters={"name": "AT-BR-2026-00001"},
    limit_page_length=1,
)
print("\nTest 2 - AT Branch:")
print(json.dumps(result, indent=2, default=str))

# Test case: fetch AT Office Branch display name
result = get_list(
    doctype="AT Office Branch",
    fields=["name", "office_branch_name"],
    filters={"name": "AT-OB-2026-00001"},
    limit_page_length=1,
)
print("\nTest 3 - AT Office Branch:")
print(json.dumps(result, indent=2, default=str))
