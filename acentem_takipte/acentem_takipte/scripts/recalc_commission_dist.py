import frappe
import json
from frappe.utils import flt

def execute():
    def recalc(sales_entity, commission_amount, fx_rate):
        commission = flt(commission_amount)
        fx = flt(fx_rate) or 1
        if commission <= 0 or not sales_entity:
            return "[]"
        entries = []
        remaining = commission
        level = 0
        current_entity = sales_entity
        visited = set()
        non_root_total = 0.0
        root_entry = None
        while current_entity and current_entity not in visited:
            visited.add(current_entity)
            ed = frappe.db.get_value("AT Sales Entity", current_entity,
                ["commission_share_pct", "full_name", "parent_entity", "is_root"],
                as_dict=True) or {}
            pct = max(0.0, min(100.0, flt(ed.get("commission_share_pct") or 0)))
            is_root = ed.get("is_root")
            if is_root:
                root_entry = {"entity": current_entity, "entity_name": ed.get("full_name") or current_entity, "level": level, "share_pct": pct, "amount": 0.0, "amount_try": 0.0, "status": "Accrued"}
                break
            amt = round(commission * pct / 100, 2)
            non_root_total = round(non_root_total + amt, 2)
            remaining = round(remaining - amt, 2)
            entries.append({"entity": current_entity, "entity_name": ed.get("full_name") or current_entity, "level": level, "share_pct": pct, "amount": round(amt, 2), "amount_try": round(amt * fx, 2), "status": "Accrued"})
            if remaining <= 0.01:
                break
            current_entity = ed.get("parent_entity")
            level += 1
            if level > 20:
                break
        if root_entry is not None:
            root_amount = round(commission - non_root_total, 2)
            root_entry["amount"] = root_amount
            root_entry["amount_try"] = round(root_amount * fx, 2)
            entries.append(root_entry)
        return json.dumps(entries)

    policies = frappe.get_all("AT Policy", filters={"status": ["in", ["Active", "Record"]], "commission_amount": [">", 0]}, fields=["name", "sales_entity", "commission_amount", "fx_rate", "commission_distribution"], limit_page_length=0)
    updated = 0
    for p in policies:
        old = p.get("commission_distribution") or "[]"
        new = recalc(p.get("sales_entity"), p.get("commission_amount"), p.get("fx_rate"))
        if old != new:
            frappe.db.set_value("AT Policy", p["name"], "commission_distribution", new)
            updated += 1
            oe = json.loads(old)
            ne = json.loads(new)
            ot = sum(e.get("amount", 0) for e in oe)
            nt = sum(e.get("amount", 0) for e in ne)
            if abs(ot - nt) > 0.01:
                frappe.logger().info("FIXED %s: %s -> %s" % (p["name"], ot, nt))
    frappe.db.commit()
    return {"updated": updated, "total": len(policies)}
