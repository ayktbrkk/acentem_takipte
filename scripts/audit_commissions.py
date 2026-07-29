import frappe, json, traceback
frappe.init(site="at.localhost", sites_path="/home/aykut/frappe-bench/sites")
frappe.connect()

print("=== Commission Balances ===")
try:
    from acentem_takipte.acentem_takipte.domains.commissions.api.endpoints import get_commission_balances, get_commission_entity_detail
    result = get_commission_balances()
    print(f"Summary: {json.dumps(result.get('summary', {}), indent=2, default=str)}")
    print(f"Entities: {len(result.get('entities', []))}")
    for e in result.get("entities", []):
        print(f"  {e['entity_name']}: accrued={e['accrued_try']}, paid={e['paid_try']}, remaining={e['remaining_try']}, aging={e['aging']}")

    if result.get("entities"):
        first = result["entities"][0]["entity_name"]
        print(f"\n=== Entity Detail: {first} ===")
        detail = get_commission_entity_detail(first)
        print(f"Policies: {len(detail.get('accrued_policies', []))}")
        print(f"Payments: {len(detail.get('payments', []))}")
except Exception as e:
    traceback.print_exc()

print("\n=== Backend Tests ===")
