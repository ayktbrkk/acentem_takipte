import frappe
import json

def list_policies():
    frappe.init(site="at.localhost")
    frappe.connect()
    try:
        policies = frappe.get_all("AT Policy", fields=["name", "policy_no", "customer", "status", "gross_premium", "currency"], limit=50)
        print(json.dumps(policies, indent=2, ensure_ascii=False))
    finally:
        frappe.destroy()

if __name__ == "__main__":
    list_policies()
