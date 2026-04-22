import frappe
import json

errors = frappe.get_all('Error Log', 
    fields=['method', 'exception', 'creation'], 
    order_by='creation desc', 
    limit=5)

for err in errors:
    print("-" * 40)
    print(f"Creation: {err.creation}")
    print(f"Method: {err.method}")
    print(f"Exception: {err.exception[:500]}...")
