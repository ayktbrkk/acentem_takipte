import frappe
frappe.init(site="at.localhost", sites_path="/home/aykut/frappe-bench/sites")
frappe.connect()
total = frappe.db.count("AT Policy")
with_dist = frappe.db.count("AT Policy", {"commission_distribution": ["!=", "[]"]})
with_comm = frappe.db.count("AT Policy", {"commission_amount": [">", 0]})
active_with_comm = frappe.db.count("AT Policy", {"status": "Active", "commission_amount": [">", 0]})
print(f"Total policies: {total}")
print(f"With commission_distribution: {with_dist}")
print(f"With commission_amount > 0: {with_comm}")
print(f"Active + commission > 0: {active_with_comm}")

# Check AT Payment sales_entity
pay_se = frappe.db.count("AT Payment", {"sales_entity": ["!=", ""], "payment_purpose": "Commission Payout"})
print(f"Commission payouts with sales_entity: {pay_se}")
