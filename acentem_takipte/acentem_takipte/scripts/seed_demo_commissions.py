import frappe
import json
from frappe.utils import flt, add_days, nowdate

def execute():
    """Create 10 demo policies with different commission distribution structures."""

    # --- Step 1: Create Office Branches ---
    # Find existing head office
    existing_ho = frappe.db.get_value("AT Office Branch", {"is_head_office": 1}, "name") or "AT-OB-2026-00001"

    branches = [
        {"name": "AT-OB-DEMO-002", "office_branch_name": "Kip Istanbul Subesi", "office_branch_code": "KIP-IST", "is_head_office": 0, "parent_office_branch": existing_ho, "city": "Istanbul"},
        {"name": "AT-OB-DEMO-003", "office_branch_name": "Kip Ankara Subesi", "office_branch_code": "KIP-ANK", "is_head_office": 0, "parent_office_branch": existing_ho, "city": "Ankara"},
        {"name": "AT-OB-DEMO-004", "office_branch_name": "Kip Izmir Subesi", "office_branch_code": "KIP-IZM", "is_head_office": 0, "parent_office_branch": existing_ho, "city": "Izmir"},
        {"name": "AT-OB-DEMO-005", "office_branch_name": "Yildiz Acentelik", "office_branch_code": "YLD-GEN", "is_head_office": 0, "parent_office_branch": existing_ho, "city": "Istanbul"},
        {"name": "AT-OB-DEMO-006", "office_branch_name": "Yildiz Kadikoy Subesi", "office_branch_code": "YLD-KDK", "is_head_office": 0, "parent_office_branch": existing_ho, "city": "Istanbul"},
        {"name": "AT-OB-DEMO-007", "office_branch_name": "Deniz Sigorta Acentesi", "office_branch_code": "DNZ-GEN", "is_head_office": 0, "parent_office_branch": existing_ho, "city": "Izmir"},
        {"name": "AT-OB-DEMO-008", "office_branch_name": "Deniz Antalya Subesi", "office_branch_code": "DNZ-ANT", "is_head_office": 0, "parent_office_branch": existing_ho, "city": "Antalya"},
        {"name": "AT-OB-DEMO-009", "office_branch_name": "Anadolu Acentelik", "office_branch_code": "ANA-GEN", "is_head_office": 0, "parent_office_branch": existing_ho, "city": "Bursa"},
        {"name": "AT-OB-DEMO-010", "office_branch_name": "Anadolu Eskisehir Subesi", "office_branch_code": "ANA-ESK", "is_head_office": 0, "parent_office_branch": existing_ho, "city": "Eskisehir"},
    ]

    for b in branches:
        if not frappe.db.exists("AT Office Branch", b["name"]) and not frappe.db.exists("AT Office Branch", {"office_branch_name": b["office_branch_name"]}):
            doc = frappe.get_doc({"doctype": "AT Office Branch", **b})
            doc.insert(ignore_permissions=True)

    # --- Step 2: Create Insurance Companies ---
    # Use existing insurance companies
    companies = []  # Skip - already exist

    for c in companies:
        if not frappe.db.exists("AT Insurance Company", c["name"]):
            doc = frappe.get_doc({"doctype": "AT Insurance Company", **c})
            doc.insert(ignore_permissions=True)

    # --- Step 3: Create Sales Entities ---
    # Use existing entities - no new entities needed
    entities = []  # Skip - already exist

    for e in entities:
        if not frappe.db.exists("AT Sales Entity", e["name"]):
            doc = frappe.get_doc({"doctype": "AT Sales Entity", **e})
            doc.insert(ignore_permissions=True)

    # --- Step 4: Create Customers ---
    # Skip customers - validation requires identity number
    customers = []

    for c in customers:
        if not frappe.db.exists("AT Customer", c["name"]):
            doc = frappe.get_doc({"doctype": "AT Customer", **c})
            doc.insert(ignore_permissions=True)

    # --- Step 5: Create Policies with Commission Distributions ---
    def make_distribution(sales_entity, commission_amount):
        """Build head-office-centric commission distribution."""
        commission = flt(commission_amount)
        entries = []
        remaining = commission
        level = 0
        current = sales_entity
        visited = set()
        non_root_total = 0.0
        root_entry = None

        while current and current not in visited:
            visited.add(current)
            ed = frappe.db.get_value("AT Sales Entity", current,
                ["commission_share_pct", "full_name", "parent_entity", "is_root", "office_branch"],
                as_dict=True) or {}
            pct = max(0.0, min(100.0, flt(ed.get("commission_share_pct") or 0)))
            is_root = ed.get("is_root")
            ob = ed.get("office_branch")

            if is_root:
                root_entry = {
                    "entity": current, "entity_name": ed.get("full_name") or current,
                    "level": level, "share_pct": pct, "amount": 0.0, "amount_try": 0.0,
                    "status": "Accrued", "office_branch": ob, "is_root": True,
                }
                break

            amt = round(commission * pct / 100, 2)
            non_root_total = round(non_root_total + amt, 2)
            remaining = round(remaining - amt, 2)

            entries.append({
                "entity": current, "entity_name": ed.get("full_name") or current,
                "level": level, "share_pct": pct, "amount": round(amt, 2),
                "amount_try": round(amt, 2), "status": "Accrued",
                "office_branch": ob, "is_root": False,
            })
            if remaining <= 0.01:
                break
            current = ed.get("parent_entity")
            level += 1
            if level > 20:
                break

        if root_entry is not None:
            root_amount = round(commission - non_root_total, 2)
            root_entry["amount"] = root_amount
            root_entry["amount_try"] = round(root_amount, 2)
            entries.append(root_entry)

        return json.dumps(entries)

    policies = [
        # 1. Istanbul Merkez Acente - DASK poliçesi
        {"name": "AT-POL-DEMO-001", "policy_no": "DASK-2026-0001", "customer": "AT-CUST-2026-000179", "insurance_company": "AT-IC-2026-00001", "branch": "AT-BR-2026-00001", "status": "Active", "issue_date": "2026-01-15", "start_date": "2026-01-15", "end_date": "2027-01-15", "sales_entity": "AT-ENT-2026-00004", "gross_premium": 8352, "net_premium": 6400, "tax_amount": 1152, "commission_amount": 800, "currency": "TRY", "fx_rate": 1},
        # 2. Ankara Acentesi - Kasko poliçesi
        {"name": "AT-POL-DEMO-002", "policy_no": "KSK-2026-0002", "customer": "AT-CUST-2026-000175", "insurance_company": "AT-IC-2026-00003", "branch": "AT-BR-2026-00001", "status": "Active", "issue_date": "2026-02-20", "start_date": "2026-02-20", "end_date": "2027-02-20", "sales_entity": "AT-ENT-2026-00005", "gross_premium": 15660, "net_premium": 12000, "tax_amount": 2160, "commission_amount": 1500, "currency": "TRY", "fx_rate": 1},
        # 3. Izmir Acentesi - Trafik poliçesi
        {"name": "AT-POL-DEMO-003", "policy_no": "TRF-2026-0003", "customer": "AT-CUST-2026-000176", "insurance_company": "AT-IC-2026-00005", "branch": "AT-BR-2026-00001", "status": "Active", "issue_date": "2026-03-10", "start_date": "2026-03-10", "end_date": "2027-03-10", "sales_entity": "AT-ENT-2026-00006", "gross_premium": 5220, "net_premium": 4000, "tax_amount": 720, "commission_amount": 500, "currency": "TRY", "fx_rate": 1},
        # 4. Bursa Acentesi - Saglik poliçesi
        {"name": "AT-POL-DEMO-004", "policy_no": "SGK-2026-0004", "customer": "AT-CUST-2026-000177", "insurance_company": "AT-IC-2026-00002", "branch": "AT-BR-2026-00001", "status": "Active", "issue_date": "2026-04-05", "start_date": "2026-04-05", "end_date": "2027-04-05", "sales_entity": "AT-ENT-2026-00007", "gross_premium": 12528, "net_premium": 9600, "tax_amount": 1728, "commission_amount": 1200, "currency": "TRY", "fx_rate": 1},
        # 5. Antalya Acentesi - Konut poliçesi
        {"name": "AT-POL-DEMO-005", "policy_no": "KNT-2026-0005", "customer": "AT-CUST-2026-000178", "insurance_company": "AT-IC-2026-00004", "branch": "AT-BR-2026-00001", "status": "Active", "issue_date": "2026-05-12", "start_date": "2026-05-12", "end_date": "2027-05-12", "sales_entity": "AT-ENT-2026-00008", "gross_premium": 6264, "net_premium": 4800, "tax_amount": 864, "commission_amount": 600, "currency": "TRY", "fx_rate": 1},
        # 6. Istanbul Merkez Acente - DASK poliçesi
        {"name": "AT-POL-DEMO-006", "policy_no": "DASK-2026-0006", "customer": "AT-CUST-2026-000179", "insurance_company": "AT-IC-2026-00001", "branch": "AT-BR-2026-00001", "status": "Active", "issue_date": "2026-06-01", "start_date": "2026-06-01", "end_date": "2027-06-01", "sales_entity": "AT-ENT-2026-00004", "gross_premium": 9396, "net_premium": 7200, "tax_amount": 1296, "commission_amount": 900, "currency": "TRY", "fx_rate": 1},
        # 7. Ankara Acentesi - Kasko poliçesi
        {"name": "AT-POL-DEMO-007", "policy_no": "KSK-2026-0007", "customer": "AT-CUST-2026-000175", "insurance_company": "AT-IC-2026-00003", "branch": "AT-BR-2026-00001", "status": "Active", "issue_date": "2026-07-15", "start_date": "2026-07-15", "end_date": "2027-07-15", "sales_entity": "AT-ENT-2026-00005", "gross_premium": 18792, "net_premium": 14400, "tax_amount": 2592, "commission_amount": 1800, "currency": "TRY", "fx_rate": 1},
        # 8. Izmir Acentesi - Trafik poliçesi
        {"name": "AT-POL-DEMO-008", "policy_no": "TRF-2026-0008", "customer": "AT-CUST-2026-000176", "insurance_company": "AT-IC-2026-00005", "branch": "AT-BR-2026-00001", "status": "Active", "issue_date": "2026-08-20", "start_date": "2026-08-20", "end_date": "2027-08-20", "sales_entity": "AT-ENT-2026-00006", "gross_premium": 4698, "net_premium": 3600, "tax_amount": 648, "commission_amount": 450, "currency": "TRY", "fx_rate": 1},
        # 9. Bursa Acentesi - Saglik poliçesi
        {"name": "AT-POL-DEMO-009", "policy_no": "SGK-2026-0009", "customer": "AT-CUST-2026-000177", "insurance_company": "AT-IC-2026-00002", "branch": "AT-BR-2026-00001", "status": "Active", "issue_date": "2026-09-10", "start_date": "2026-09-10", "end_date": "2027-09-10", "sales_entity": "AT-ENT-2026-00007", "gross_premium": 10440, "net_premium": 8000, "tax_amount": 1440, "commission_amount": 1000, "currency": "TRY", "fx_rate": 1},
        # 10. Antalya Acentesi - Konut poliçesi
        {"name": "AT-POL-DEMO-010", "policy_no": "KNT-2026-0010", "customer": "AT-CUST-2026-000178", "insurance_company": "AT-IC-2026-00004", "branch": "AT-BR-2026-00001", "status": "Active", "issue_date": "2026-10-05", "start_date": "2026-10-05", "end_date": "2027-10-05", "sales_entity": "AT-ENT-2026-00008", "gross_premium": 7830, "net_premium": 6000, "tax_amount": 1080, "commission_amount": 750, "currency": "TRY", "fx_rate": 1},
    ]

    created = 0
    skipped = 0
    for p in policies:
        if frappe.db.exists("AT Policy", p["name"]):
            skipped += 1
            continue
        print("Creating %s: gross=%s net=%s tax=%s comm=%s" % (p["name"], p["gross_premium"], p["net_premium"], p["tax_amount"], p["commission_amount"]))
        dist = make_distribution(p["sales_entity"], p["commission_amount"])
        p["commission_distribution"] = dist
        doc = frappe.get_doc({"doctype": "AT Policy", **p})
        doc.insert(ignore_permissions=True)
        created += 1

    frappe.db.commit()

    # Print summary
    print("Created %d policies, skipped %d existing" % (created, skipped))
    print("")
    for p in policies:
        dist = json.loads(p.get("commission_distribution", "[]"))
        total = sum(e["amount"] for e in dist)
        print("%s: %s (comm=%s, dist_sum=%s)" % (p["name"], p["policy_no"], p["commission_amount"], total))
        for e in dist:
            print("  %s: %s (%s%%)" % (e["entity_name"], e["amount"], e["share_pct"]))

    return {"created": created, "total": len(policies)}
