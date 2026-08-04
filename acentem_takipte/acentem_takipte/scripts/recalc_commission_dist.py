import frappe
import json
from frappe.utils import flt
from acentem_takipte.acentem_takipte.domains.commissions.services.balance import (
    build_commission_distribution,
)

def execute():
    policies = frappe.get_all("AT Policy", filters={"status": ["in", ["Active", "Record"]], "commission_amount": [">", 0]}, fields=["name", "sales_entity", "commission_amount", "fx_rate", "commission_distribution"], limit_page_length=0)
    updated = 0
    failed = []
    for p in policies:
        old = p.get("commission_distribution") or "[]"
        try:
            # Canonical validation/rejection: an invalid share path raises here
            # instead of being silently clamped or truncated.
            new = build_commission_distribution(p.get("sales_entity"), p.get("commission_amount"), p.get("fx_rate"))
        except Exception as e:
            failed.append({"policy": p["name"], "error": str(e)})
            continue
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
    if failed:
        frappe.logger().info(
            "COMMISSION RECALC skipped %d invalid policy(ies): %s",
            len(failed),
            "; ".join(f"{f['policy']}: {f['error']}" for f in failed),
        )
    return {"updated": updated, "total": len(policies), "failed": len(failed)}
