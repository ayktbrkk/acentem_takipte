import frappe, json
frappe.init(site="at.localhost", sites_path="/home/aykut/frappe-bench/sites")
frappe.connect()
from acentem_takipte.acentem_takipte.domains.commissions.api.endpoints import get_commission_policy_detail, get_commission_balances

# Test main balances
print("=== Balances ===")
r = get_commission_balances()
for e in r.get("entities", []):
    print(f"  {e['entity_name']}: accrued={e['accrued_try']}, paid={e['paid_try']}, policies={e.get('insurance_companies', [])}")

# Test policy detail with display name
if r.get("entities"):
    first = r["entities"][0]["entity_name"]
    print(f"\n=== Policy Detail for: {first} ===")
    try:
        d = get_commission_policy_detail(first)
        print(f"  Entity: {json.dumps(d.get('entity', {}), default=str)}")
        print(f"  Policies: {len(d.get('policies', []))}")
        print(f"  Payments: {len([p for p in d.get('policies', []) if p.get('payment')])}")
        print(f"  Totals: {json.dumps(d.get('totals', {}), default=str)}")
        if d.get("policies"):
            p0 = d["policies"][0]
            print(f"  First policy: {p0.get('policy_no')} - {p0.get('customer_name')} - {p0.get('commission_amount_try')}")
    except Exception as e:
        print(f"  ERROR: {e}")
        import traceback
        traceback.print_exc()
