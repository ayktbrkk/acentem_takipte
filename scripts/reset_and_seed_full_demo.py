"""
Full database reset + comprehensive 5-per-entity demo seed with Turkish data.

Usage (from bench environment):
    # Preview current data
    bench --site at.localhost execute scripts.reset_and_seed_full_demo.inspect

    # Reset everything + seed 5 per entity
    bench --site at.localhost execute scripts.reset_and_seed_full_demo.reset_all

    # Reset + seed with detailed output
    bench --site at.localhost execute scripts.reset_and_seed_full_demo.run

Security: requires developer_mode to prevent accidental production runs.
"""

from __future__ import annotations

import json
import random
from typing import Any

import frappe
from frappe.utils import add_days, add_months, cint, flt, getdate, now, nowdate


def _guard_dev():
    if not frappe.conf.developer_mode:
        frappe.throw(
            "Seed operations require developer_mode. Set developer_mode=1 in site_config.json.",
            title="Developer Mode Required",
        )


# ── TCKN Generator ───────────────────────────────────────────────────────

def _make_valid_tckn(seed: str | int) -> str:
    raw = "".join(c for c in str(seed) if c.isdigit())[:9].ljust(9, "0")
    if raw.startswith("0"):
        raw = f"1{raw[1:]}"
    digits = [int(c) for c in raw]
    t10 = ((sum(digits[0:9:2]) * 7) - sum(digits[1:8:2])) % 10
    t11 = (sum(digits) + t10) % 10
    return f"{raw}{t10}{t11}"


# ── Reset ─────────────────────────────────────────────────────────────────

DELETE_ORDER = [
    # Communication / access
    ("AT Access Log", None, None),
    ("AT Notification Outbox", None, None),
    ("AT Notification Draft", None, None),
    ("AT Campaign", None, None),
    ("AT Segment", None, None),
    ("AT Notification Template", "template_key", "DMO-"),
    # Operations
    ("AT Call Note", None, None),
    ("AT Ownership Assignment", None, None),
    ("AT Activity", None, None),
    ("AT Task", None, None),
    ("AT Reminder", None, None),
    # Documents
    ("AT Document", None, None),
    ("AT Insured Asset", None, None),
    # Snapshots
    ("AT Report Snapshot", None, None),
    ("AT Customer Segment Snapshot", None, None),
    ("AT Policy Snapshot", None, None),
    # Data Import
    ("AT Data Import Job", None, None),
    # Renewal outcomes then tasks
    ("AT Renewal Outcome", None, None),
    ("AT Renewal Task", None, None),
    # Accounting
    ("AT Reconciliation Item", None, None),
    ("AT Accounting Entry", None, None),
    # Payments + installments
    ("AT Payment Installment", None, None),
    ("AT Payment", None, None),
    # Claims
    ("AT Claim", None, None),
    # Endorsements
    ("AT Policy Endorsement", None, None),
    # Policies
    ("AT Policy", None, None),
    # Offers
    ("AT Offer", None, None),
    # Leads
    ("AT Lead", None, None),
    # Customers + relations
    ("AT Customer Relation", None, None),
    ("AT Customer", None, None),
    # Hierarchy
    ("AT Branch", None, None),
    ("AT Insurance Company", None, None),
    ("AT Sales Entity", None, None),
    ("AT Office Branch", None, None),
    # Access control
    ("AT User Sales Entity Access", None, None),
    ("AT User Branch Access", None, None),
]


def _safe_delete_all():
    """Delete ALL AT data in safe dependency order."""
    _guard_dev()
    deleted_counts: dict[str, int] = {}
    for doctype, _filter_field, _filter_value in DELETE_ORDER:
        names = frappe.get_all(doctype, pluck="name", limit_page_length=0)
        count = 0
        for name in names:
            try:
                frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
                count += 1
            except Exception:
                pass
        if count:
            deleted_counts[doctype] = count
    frappe.db.commit()
    return deleted_counts


# ── Helpers ───────────────────────────────────────────────────────────────


def _gen_name(prefix: str, year_suffix: str, idx: int) -> str:
    """Generate an explicit name when autoname format: patterns are not set up."""
    return f"{prefix}-{year_suffix}-{idx:05d}"


def _init_naming_series(prefix: str) -> None:
    """Ensure naming series exists with current year expanded for format: autoname."""
    from datetime import date
    year = str(date.today().year)
    correct_name = f"{prefix}-{year}-"
    wrong_name = f"{prefix}-.YYYY.-"
    # Remove incorrectly formatted series entry
    frappe.db.sql("DELETE FROM tabSeries WHERE name = %s", (wrong_name,))
    # Insert correct one
    frappe.db.sql(
        "INSERT IGNORE INTO tabSeries (name, current) VALUES (%s, 0)",
        (correct_name,),
    )
    frappe.db.commit()


def _insert(doctype: str, values: dict[str, Any], name: str | None = None):
    payload = {"doctype": doctype, **values}
    if name:
        payload["name"] = name
    try:
        return frappe.get_doc(payload).insert(ignore_permissions=True)
    except (frappe.exceptions.DuplicateEntryError, frappe.exceptions.MandatoryError):
        if not name:
            raise
        # Delete any existing record with this name (from previous partial runs)
        table = f"tab{doctype}"
        frappe.db.sql(f"DELETE FROM `{table}` WHERE name = %s", (name,))
        frappe.db.commit()
        doc = frappe.new_doc(doctype)
        doc.update(values)
        doc.name = name
        doc.flags.ignore_mandatory = True
        doc.db_insert()
        return doc


def _upsert_by_field(
    doctype: str, field: str, value: str, payload: dict[str, Any]
):
    existing = frappe.db.get_value(doctype, {field: value}, "name")
    if existing:
        doc = frappe.get_doc(doctype, existing)
        for k, v in payload.items():
            doc.set(k, v)
        doc.save(ignore_permissions=True)
        return doc
    return _insert(doctype, payload)


# ── Main Seed Function ────────────────────────────────────────────────────


def run(
    seed_count: int = 5,
    clean_first: bool = True,
    print_output: bool = True,
):
    _guard_dev()
    today = getdate(nowdate())

    if clean_first:
        deleted = _safe_delete_all()
        if print_output and deleted:
            for dt, cnt in deleted.items():
                print(f"  Deleted {cnt} {dt}")

    _init_naming_series("AT-CALL")
    _init_naming_series("AT-SEG")
    _init_naming_series("AT-CAMP")
    _init_naming_series("AT-DOC")
    _init_naming_series("AT-NOTIF")
    _init_naming_series("AT-BR")
    _init_naming_series("AT-IC")
    _init_naming_series("AT-OB")
    _init_naming_series("AT-NTF")

    summary: dict[str, int] = {}

    def _inc(key):
        summary[key] = summary.get(key, 0) + 1

    # ══════════════════════════════════════════════════════════════════════
    # 1. Office Branches -- 5
    # ══════════════════════════════════════════════════════════════════════
    branch_by_code: dict[str, str] = {}
    # First create the head office without parent
    head_doc = _upsert_by_field(
        "AT Office Branch",
        "office_branch_name",
        "Istanbul Merkez",
        {
            "office_branch_name": "Istanbul Merkez",
            "office_branch_code": "IST",
            "city": "Istanbul",
            "is_head_office": 1,
            "is_active": 1,
        },
    )
    branch_by_code["IST"] = head_doc.name
    _inc("office_branches")

    for bdef in [
        {
            "office_branch_name": "Ankara Sube",
            "office_branch_code": "ANK",
            "city": "Ankara",
            "is_head_office": 0,
            "is_active": 1,
        },
        {
            "office_branch_name": "Izmir Sube",
            "office_branch_code": "IZM",
            "city": "Izmir",
            "is_head_office": 0,
            "is_active": 1,
        },
        {
            "office_branch_name": "Bursa Sube",
            "office_branch_code": "BRS",
            "city": "Bursa",
            "is_head_office": 0,
            "is_active": 1,
        },
        {
            "office_branch_name": "Antalya Sube",
            "office_branch_code": "ANT",
            "city": "Antalya",
            "is_head_office": 0,
            "is_active": 1,
        },
    ]:
        bdef["parent_office_branch"] = head_doc.name
        doc = _upsert_by_field(
            "AT Office Branch",
            "office_branch_name",
            bdef["office_branch_name"],
            bdef,
        )
        branch_by_code[bdef["office_branch_code"]] = doc.name
        _inc("office_branches")
    if print_output:
        print(f"  Seeded {summary['office_branches']} office branches")

    # ══════════════════════════════════════════════════════════════════════
    # 2. Insurance Companies -- 5
    # ══════════════════════════════════════════════════════════════════════
    company_defs = [
        ("Anadolu Sigorta", "ANA"),
        ("Aksigorta", "AKS"),
        ("Allianz Sigorta", "ALZ"),
        ("Zurich Sigorta", "ZRC"),
        ("Mapfre Sigorta", "MPF"),
    ]
    company_name_to_id: dict[str, str] = {}
    for cname, ccode in company_defs[:seed_count]:
        doc = _upsert_by_field(
            "AT Insurance Company",
            "company_name",
            cname,
            {"company_name": cname, "company_code": ccode, "is_active": 1},
        )
        company_name_to_id[cname] = doc.name
        _inc("insurance_companies")
    if print_output:
        print(f"  Seeded {summary['insurance_companies']} insurance companies")

    # ══════════════════════════════════════════════════════════════════════
    # 3. Branches -- 5 (insurance branches)
    # ══════════════════════════════════════════════════════════════════════
    branch_defs = [
        ("Trafik", "TRF", "Anadolu Sigorta"),
        ("Kasko", "KAS", "Aksigorta"),
        ("Saglik", "SAG", "Allianz Sigorta"),
        ("Yangin", "YNG", "Zurich Sigorta"),
        ("DASK", "DSK", "Mapfre Sigorta"),
    ]
    branch_name_to_id: dict[str, str] = {}
    for bname, bcode, cname in branch_defs[:seed_count]:
        doc = _upsert_by_field(
            "AT Branch",
            "branch_name",
            bname,
            {
                "branch_name": bname,
                "branch_code": bcode,
                "insurance_company": company_name_to_id[cname],
                "is_active": 1,
            },
        )
        branch_name_to_id[bname] = doc.name
        _inc("branches")
    if print_output:
        print(f"  Seeded {summary['branches']} branches")

    # ══════════════════════════════════════════════════════════════════════
    # 4. Sales Entities -- 5 (one pool per office branch)
    # ══════════════════════════════════════════════════════════════════════
    se_ist = _upsert_by_field(
        "AT Sales Entity",
        "full_name",
        "Istanbul Merkez Acente",
        {
            "entity_type": "Agency",
            "full_name": "Istanbul Merkez Acente",
            "office_branch": branch_by_code["IST"],
            "is_root": 1,
            "is_pool": 1,
            "commission_share_pct": 50,
            "is_active": 1,
        },
    )
    _inc("sales_entities")

    se_ank = _upsert_by_field(
        "AT Sales Entity",
        "full_name",
        "Ankara Acentesi",
        {
            "entity_type": "Agency",
            "full_name": "Ankara Acentesi",
            "office_branch": branch_by_code["ANK"],
            "is_root": 1,
            "is_pool": 1,
            "commission_share_pct": 50,
            "is_active": 1,
        },
    )
    _inc("sales_entities")

    se_izm = _upsert_by_field(
        "AT Sales Entity",
        "full_name",
        "Izmir Acentesi",
        {
            "entity_type": "Agency",
            "full_name": "Izmir Acentesi",
            "office_branch": branch_by_code["IZM"],
            "is_root": 1,
            "is_pool": 1,
            "commission_share_pct": 50,
            "is_active": 1,
        },
    )
    _inc("sales_entities")

    se_brs = _upsert_by_field(
        "AT Sales Entity",
        "full_name",
        "Bursa Acentesi",
        {
            "entity_type": "Agency",
            "full_name": "Bursa Acentesi",
            "office_branch": branch_by_code["BRS"],
            "is_root": 1,
            "is_pool": 1,
            "commission_share_pct": 50,
            "is_active": 1,
        },
    )
    _inc("sales_entities")

    se_ant = _upsert_by_field(
        "AT Sales Entity",
        "full_name",
        "Antalya Acentesi",
        {
            "entity_type": "Agency",
            "full_name": "Antalya Acentesi",
            "office_branch": branch_by_code["ANT"],
            "is_root": 1,
            "is_pool": 1,
            "commission_share_pct": 50,
            "is_active": 1,
        },
    )
    _inc("sales_entities")
    if print_output:
        print(f"  Seeded {summary['sales_entities']} sales entities")

    # ══════════════════════════════════════════════════════════════════════
    # 5. Customers -- 5
    # ══════════════════════════════════════════════════════════════════════
    customer_data = [
        {
            "customer_type": "Individual",
            "tax_id": _make_valid_tckn("101010001"),
            "full_name": "Ali Yilmaz",
            "birth_date": add_days(today, -(42 * 365)),
            "gender": "Male",
            "marital_status": "Married",
            "occupation": "Muhendis",
            "phone": "05321000001",
            "email": "ali.yilmaz@example.com",
            "address": "Kadikoy, Istanbul",
            "office_branch": branch_by_code["IST"],
            "assigned_agent": "Administrator",
        },
        {
            "customer_type": "Individual",
            "tax_id": _make_valid_tckn("202020002"),
            "full_name": "Ayse Demir",
            "birth_date": add_days(today, -(35 * 365)),
            "gender": "Female",
            "marital_status": "Married",
            "occupation": "Ogretmen",
            "phone": "05321000002",
            "email": "ayse.demir@example.com",
            "address": "Cankaya, Ankara",
            "office_branch": branch_by_code["ANK"],
            "assigned_agent": "Administrator",
        },
        {
            "customer_type": "Individual",
            "tax_id": _make_valid_tckn("303030003"),
            "full_name": "Mehmet Kaya",
            "birth_date": add_days(today, -(28 * 365)),
            "gender": "Male",
            "marital_status": "Single",
            "occupation": "Avukat",
            "phone": "05321000003",
            "email": "mehmet.kaya@example.com",
            "address": "Karsiyaka, Izmir",
            "office_branch": branch_by_code["IZM"],
            "assigned_agent": "Administrator",
        },
        {
            "customer_type": "Individual",
            "tax_id": _make_valid_tckn("404040004"),
            "full_name": "Zeynep Ozturk",
            "birth_date": add_days(today, -(31 * 365)),
            "gender": "Female",
            "marital_status": "Single",
            "occupation": "Mimar",
            "phone": "05321000004",
            "email": "zeynep.ozturk@example.com",
            "address": "Nilufer, Bursa",
            "office_branch": branch_by_code["BRS"],
            "assigned_agent": "Administrator",
        },
        {
            "customer_type": "Corporate",
            "tax_id": "7340087631",
            "full_name": "Cinar Insaat Ltd Sti",
            "phone": "02121000005",
            "email": "info@cinarinsaat.com",
            "address": "Muratpasa, Antalya",
            "office_branch": branch_by_code["ANT"],
            "assigned_agent": "Administrator",
        },
    ]
    customer_map: dict[str, str] = {}
    for i, cdata in enumerate(customer_data[:seed_count], start=1):
        label = f"cust_{i}"
        existing = frappe.db.get_value(
            "AT Customer", {"tax_id": cdata["tax_id"]}, "name"
        )
        if existing:
            doc = frappe.get_doc("AT Customer", existing)
            for k, v in cdata.items():
                doc.set(k, v)
            doc.save(ignore_permissions=True)
        else:
            doc = _insert("AT Customer", cdata)
        customer_map[label] = doc.name
        _inc("customers")
    if print_output:
        print(f"  Seeded {summary['customers']} customers")

    # ══════════════════════════════════════════════════════════════════════
    # 6. Leads -- 5
    # ══════════════════════════════════════════════════════════════════════
    lead_data = [
        {
            "first_name": "Ali", "last_name": "Yilmaz",
            "email": "ali.yilmaz.lead@example.com", "phone": "05321000001",
            "status": "Open", "tax_id": "10101000188",
            "customer": customer_map["cust_1"],
            "sales_entity": se_ist.name,
            "insurance_company": company_name_to_id["Anadolu Sigorta"],
            "branch": branch_name_to_id["Trafik"],
            "office_branch": branch_by_code["IST"],
            "estimated_gross_premium": 8500,
            "notes": "Trafik sigortasi icin fiyat talebi",
        },
        {
            "first_name": "Ahmet", "last_name": "Celik",
            "email": "ahmet.celik@example.com", "phone": "05321000006",
            "status": "Draft", "tax_id": _make_valid_tckn("505050005"),
            "customer": None,
            "sales_entity": se_ank.name,
            "insurance_company": company_name_to_id["Aksigorta"],
            "branch": branch_name_to_id["Kasko"],
            "office_branch": branch_by_code["ANK"],
            "estimated_gross_premium": 12400,
            "notes": "Yeni arac icin kasko talebi",
        },
        {
            "first_name": "Ayse", "last_name": "Demir",
            "email": "ayse.demir.lead@example.com",
            "status": "Replied",
            "customer": customer_map["cust_2"],
            "sales_entity": se_ist.name,
            "insurance_company": company_name_to_id["Allianz Sigorta"],
            "branch": branch_name_to_id["Saglik"],
            "office_branch": branch_by_code["ANK"],
            "estimated_gross_premium": 15800,
            "notes": "Tamamlayici saglik sigortasi",
        },
        {
            "first_name": "Zeynep", "last_name": "Ozturk",
            "email": "zeynep.ozturk.lead@example.com",
            "status": "Closed",
            "customer": customer_map["cust_4"],
            "sales_entity": se_ist.name,
            "insurance_company": company_name_to_id["Zurich Sigorta"],
            "branch": branch_name_to_id["Yangin"],
            "office_branch": branch_by_code["BRS"],
            "estimated_gross_premium": 5600,
            "notes": "Konut sigortasi - fiyat yuksek geldi",
        },
        {
            "first_name": "Burak", "last_name": "Arslan",
            "email": "burak.arslan@example.com", "phone": "05321000007",
            "status": "Open",
            "customer": None,
            "sales_entity": se_ank.name,
            "insurance_company": company_name_to_id["Mapfre Sigorta"],
            "branch": branch_name_to_id["DASK"],
            "office_branch": branch_by_code["ANT"],
            "estimated_gross_premium": 3200,
            "notes": "DASK zorunlu deprem sigortasi",
        },
    ]
    for ldata in lead_data[:seed_count]:
        _insert("AT Lead", ldata)
        _inc("leads")
    if print_output:
        print(f"  Seeded {summary['leads']} leads")

    # ══════════════════════════════════════════════════════════════════════
    # 7. Offers -- 5
    # ══════════════════════════════════════════════════════════════════════
    offer_data = [
        {
            "customer": customer_map["cust_1"],
            "sales_entity": se_ist.name,
            "insurance_company": company_name_to_id["Anadolu Sigorta"],
            "branch": branch_name_to_id["Trafik"],
            "office_branch": branch_by_code["IST"],
            "offer_date": add_days(today, -30),
            "valid_until": add_days(today, -15),
            "currency": "TRY",
            "gross_premium": 8500,
            "net_premium": 7000,
            "tax_amount": 600,
            "commission_amount": 900,
            "status": "Sent",
            "notes": "Trafik sigortasi teklifi gonderildi",
        },
        {
            "customer": customer_map["cust_2"],
            "sales_entity": se_ist.name,
            "insurance_company": company_name_to_id["Allianz Sigorta"],
            "branch": branch_name_to_id["Saglik"],
            "office_branch": branch_by_code["ANK"],
            "offer_date": add_days(today, -20),
            "valid_until": add_days(today, 10),
            "currency": "TRY",
            "gross_premium": 15800,
            "net_premium": 13000,
            "tax_amount": 1100,
            "commission_amount": 1700,
            "status": "Accepted",
            "notes": "TSS teklifi kabul edildi",
        },
        {
            "customer": customer_map["cust_3"],
            "sales_entity": se_ank.name,
            "insurance_company": company_name_to_id["Aksigorta"],
            "branch": branch_name_to_id["Kasko"],
            "office_branch": branch_by_code["IZM"],
            "offer_date": add_days(today, -14),
            "valid_until": add_days(today, 16),
            "currency": "TRY",
            "gross_premium": 12400,
            "net_premium": 10200,
            "tax_amount": 900,
            "commission_amount": 1300,
            "status": "Draft",
            "notes": "Kasko teklifi hazirlaniyor",
        },
        {
            "customer": customer_map["cust_5"],
            "sales_entity": se_ank.name,
            "insurance_company": company_name_to_id["Mapfre Sigorta"],
            "branch": branch_name_to_id["DASK"],
            "office_branch": branch_by_code["ANT"],
            "offer_date": add_days(today, -7),
            "valid_until": add_days(today, 23),
            "currency": "TRY",
            "gross_premium": 3200,
            "net_premium": 2800,
            "tax_amount": 200,
            "commission_amount": 200,
            "status": "Accepted",
            "notes": "DASK teklifi kabul edildi",
        },
        {
            "customer": customer_map["cust_1"],
            "sales_entity": se_ist.name,
            "insurance_company": company_name_to_id["Zurich Sigorta"],
            "branch": branch_name_to_id["Yangin"],
            "office_branch": branch_by_code["IST"],
            "offer_date": add_days(today, -3),
            "valid_until": add_days(today, 27),
            "currency": "EUR",
            "gross_premium": 420,
            "net_premium": 350,
            "tax_amount": 30,
            "commission_amount": 40,
            "status": "Draft",
            "notes": "Konut sigortasi EUR teklif",
        },
    ]
    offer_map: dict[str, str] = {}
    for i, odata in enumerate(offer_data[:seed_count], start=1):
        doc = _insert("AT Offer", odata)
        offer_map[f"offer_{i}"] = doc.name
        _inc("offers")
    if print_output:
        print(f"  Seeded {summary['offers']} offers")

    # ══════════════════════════════════════════════════════════════════════
    # 8. Policies -- 5
    # ══════════════════════════════════════════════════════════════════════
    policy_data = [
        {
            "policy_no": "ANAD-2026-00123",
            "customer": customer_map["cust_1"],
            "sales_entity": se_ist.name,
            "insurance_company": company_name_to_id["Anadolu Sigorta"],
            "branch": branch_name_to_id["Trafik"],
            "office_branch": branch_by_code["IST"],
            "status": "Active",
            "issue_date": add_days(today, -90),
            "start_date": add_days(today, -90),
            "end_date": add_days(today, 275),
            "currency": "TRY",
            "gross_premium": 8500,
            "net_premium": 7000,
            "tax_amount": 600,
            "commission_amount": 900,
            "plate": "34 ABC 123",
            "brand_code": "BMW",
            "model_year": 2020,
            "vehicle_make_model": "BMW 320i",
            "notes": "Trafik sigortasi - aktif",
        },
        {
            "policy_no": "AKSG-2026-00456",
            "customer": customer_map["cust_3"],
            "sales_entity": se_ank.name,
            "insurance_company": company_name_to_id["Aksigorta"],
            "branch": branch_name_to_id["Kasko"],
            "office_branch": branch_by_code["IZM"],
            "status": "Active",
            "issue_date": add_days(today, -45),
            "start_date": add_days(today, -45),
            "end_date": add_days(today, 320),
            "currency": "TRY",
            "gross_premium": 12400,
            "net_premium": 10200,
            "tax_amount": 900,
            "commission_amount": 1300,
            "plate": "35 DEF 456",
            "brand_code": "VW",
            "model_year": 2021,
            "vehicle_make_model": "Volkswagen Passat",
            "notes": "Kasko - aktif",
        },
        {
            "policy_no": "ALZ-2026-00789",
            "customer": customer_map["cust_2"],
            "sales_entity": se_ist.name,
            "insurance_company": company_name_to_id["Allianz Sigorta"],
            "branch": branch_name_to_id["Saglik"],
            "office_branch": branch_by_code["ANK"],
            "status": "Record",
            "issue_date": add_days(today, -150),
            "start_date": add_days(today, -150),
            "end_date": add_days(today, 215),
            "currency": "TRY",
            "gross_premium": 15800,
            "net_premium": 13000,
            "tax_amount": 1100,
            "commission_amount": 1700,
            "insurance_type": "Tamamlayici Saglik",
            "inpatient_treatment": 1,
            "outpatient_treatment": 1,
            "notes": "TSS - kayda alindi",
        },
        {
            "policy_no": "MPFR-2026-00101",
            "customer": customer_map["cust_5"],
            "sales_entity": se_ank.name,
            "insurance_company": company_name_to_id["Mapfre Sigorta"],
            "branch": branch_name_to_id["DASK"],
            "office_branch": branch_by_code["ANT"],
            "status": "Active",
            "issue_date": add_days(today, -30),
            "start_date": add_days(today, -30),
            "end_date": add_days(today, 335),
            "currency": "TRY",
            "gross_premium": 3200,
            "net_premium": 2800,
            "tax_amount": 200,
            "commission_amount": 200,
            "coverage_type": "Standart",
            "address": "Muratpasa Mah. 123. Sok. No:5 Antalya",
            "notes": "DASK zorunlu deprem sigortasi",
        },
        {
            "policy_no": "ZRC-2026-00202",
            "customer": customer_map["cust_4"],
            "sales_entity": se_ist.name,
            "insurance_company": company_name_to_id["Zurich Sigorta"],
            "branch": branch_name_to_id["Yangin"],
            "office_branch": branch_by_code["BRS"],
            "status": "Cancelled",
            "issue_date": add_days(today, -180),
            "start_date": add_days(today, -180),
            "end_date": add_days(today, 185),
            "currency": "TRY",
            "gross_premium": 5600,
            "net_premium": 4600,
            "tax_amount": 400,
            "commission_amount": 600,
            "coverage_type": "Genis Kapsamli",
            "address": "Nilufer Mah. Cumhuriyet Cad. No:12 Bursa",
            "structure_type": "Betonarme",
            "floor_count": 5,
            "current_floor": 3,
            "gross_area_m2": 120,
            "construction_year": 2015,
            "usage_type": "Konut",
            "notes": "Konut sigortasi - iptal edildi",
        },
    ]
    policy_map: dict[str, str] = {}
    for pdata in policy_data[:seed_count]:
        doc = _insert("AT Policy", pdata)
        policy_map[pdata["policy_no"]] = doc.name
        _inc("policies")
    if print_output:
        print(f"  Seeded {summary['policies']} policies")

    # ══════════════════════════════════════════════════════════════════════
    # 9. Claims -- 5
    # ══════════════════════════════════════════════════════════════════════
    claim_data = [
        {
            "claim_no": "CLM-ANAD-001",
            "policy": policy_map["ANAD-2026-00123"],
            "customer": customer_map["cust_1"],
            "office_branch": branch_by_code["IST"],
            "claim_type": "Damage",
            "claim_status": "Under Review",
            "incident_date": add_days(today, -15),
            "reported_date": add_days(today, -14),
            "currency": "TRY",
            "estimated_amount": 12000,
            "approved_amount": 0,
            "notes": "Arac hasar dosyasi incelemede",
        },
        {
            "claim_no": "CLM-AKSG-001",
            "policy": policy_map["AKSG-2026-00456"],
            "customer": customer_map["cust_3"],
            "office_branch": branch_by_code["IZM"],
            "claim_type": "Theft",
            "claim_status": "Open",
            "incident_date": add_days(today, -10),
            "reported_date": add_days(today, -9),
            "currency": "TRY",
            "estimated_amount": 180000,
            "approved_amount": 0,
            "notes": "Arac calinti hasari",
        },
        {
            "claim_no": "CLM-ALZ-001",
            "policy": policy_map["ALZ-2026-00789"],
            "customer": customer_map["cust_2"],
            "office_branch": branch_by_code["ANK"],
            "claim_type": "Health",
            "claim_status": "Approved",
            "incident_date": add_days(today, -60),
            "reported_date": add_days(today, -58),
            "currency": "TRY",
            "estimated_amount": 3500,
            "approved_amount": 2800,
            "notes": "Ayakta tedavi masrafi onaylandi",
        },
        {
            "claim_no": "CLM-MPFR-001",
            "policy": policy_map["MPFR-2026-00101"],
            "customer": customer_map["cust_5"],
            "office_branch": branch_by_code["ANT"],
            "claim_type": "Liability",
            "claim_status": "Paid",
            "incident_date": add_days(today, -90),
            "reported_date": add_days(today, -88),
            "currency": "TRY",
            "estimated_amount": 25000,
            "approved_amount": 22000,
            "notes": "Deprem hasari odemesi yapildi",
        },
        {
            "claim_no": "CLM-ZRC-001",
            "policy": policy_map["ZRC-2026-00202"],
            "customer": customer_map["cust_4"],
            "office_branch": branch_by_code["BRS"],
            "claim_type": "Damage",
            "claim_status": "Rejected",
            "incident_date": add_days(today, -120),
            "reported_date": add_days(today, -119),
            "currency": "TRY",
            "estimated_amount": 8000,
            "approved_amount": 0,
            "rejection_reason": "Teminat disi hasar",
            "notes": "Su baskinindan kaynakli hasar - teminat disi",
        },
    ]
    claim_map: dict[str, str] = {}
    for cdata in claim_data[:seed_count]:
        doc = _insert("AT Claim", cdata)
        claim_map[cdata["claim_no"]] = doc.name
        _inc("claims")
    if print_output:
        print(f"  Seeded {summary['claims']} claims")

    # ══════════════════════════════════════════════════════════════════════
    # 10. Payments -- 5
    # ══════════════════════════════════════════════════════════════════════
    payment_data = [
        {
            "payment_no": "PAY-2026-001",
            "policy": policy_map["ANAD-2026-00123"],
            "customer": customer_map["cust_1"],
            "sales_entity": se_ist.name,
            "office_branch": branch_by_code["IST"],
            "payment_direction": "Inbound",
            "payment_purpose": "Premium Collection",
            "status": "Paid",
            "payment_date": add_days(today, -85),
            "due_date": add_days(today, -84),
            "currency": "TRY",
            "amount": 8500,
            "installment_count": 1,
            "reference_no": "TAH-2026001",
            "notes": "Trafik prim tahsilati",
        },
        {
            "payment_no": "PAY-2026-002",
            "policy": policy_map["AKSG-2026-00456"],
            "customer": customer_map["cust_3"],
            "sales_entity": se_ank.name,
            "office_branch": branch_by_code["IZM"],
            "payment_direction": "Inbound",
            "payment_purpose": "Premium Collection",
            "status": "Paid",
            "payment_date": add_days(today, -40),
            "due_date": add_days(today, -39),
            "currency": "TRY",
            "amount": 12400,
            "installment_count": 1,
            "reference_no": "TAH-2026002",
            "notes": "Kasko prim tahsilati",
        },
        {
            "payment_no": "PAY-2026-003",
            "policy": policy_map["ANAD-2026-00123"],
            "customer": customer_map["cust_1"],
            "sales_entity": se_ist.name,
            "office_branch": branch_by_code["IST"],
            "payment_direction": "Outbound",
            "payment_purpose": "Commission Payout",
            "status": "Paid",
            "payment_date": add_days(today, -60),
            "due_date": add_days(today, -59),
            "currency": "TRY",
            "amount": 900,
            "installment_count": 1,
            "reference_no": "KOM-2026001",
            "notes": "Trafik komisyon odemesi",
        },
        {
            "payment_no": "PAY-2026-004",
            "policy": policy_map["ANAD-2026-00123"],
            "claim": claim_map["CLM-ANAD-001"],
            "customer": customer_map["cust_1"],
            "office_branch": branch_by_code["IST"],
            "payment_direction": "Outbound",
            "payment_purpose": "Claim Payout",
            "status": "Draft",
            "payment_date": add_days(today, -5),
            "due_date": add_days(today, 0),
            "currency": "TRY",
            "amount": 12000,
            "installment_count": 1,
            "reference_no": "HSR-2026001",
            "notes": "Hasar odemesi bekleniyor",
        },
        {
            "payment_no": "PAY-2026-005",
            "policy": policy_map["ALZ-2026-00789"],
            "customer": customer_map["cust_2"],
            "sales_entity": se_ist.name,
            "office_branch": branch_by_code["ANK"],
            "payment_direction": "Inbound",
            "payment_purpose": "Premium Collection",
            "status": "Draft",
            "payment_date": add_days(today, -3),
            "due_date": add_days(today, 27),
            "currency": "TRY",
            "amount": 15800,
            "installment_count": 4,
            "installment_interval_days": 30,
            "reference_no": "TAH-2026005",
            "notes": "TSS 4 taksit - bekleyen",
        },
    ]
    payment_map: dict[str, str] = {}
    for paydata in payment_data[:seed_count]:
        doc = _insert("AT Payment", paydata)
        payment_map[paydata["payment_no"]] = doc.name
        _inc("payments")
    if print_output:
        print(f"  Seeded {summary['payments']} payments")

    # ══════════════════════════════════════════════════════════════════════
    # 11. Tasks -- 5
    # ══════════════════════════════════════════════════════════════════════
    task_data = [
        {
            "task_title": "Ali Yilmaz trafik yenileme takibi",
            "task_type": "Renewal",
            "customer": customer_map["cust_1"],
            "policy": policy_map["ANAD-2026-00123"],
            "office_branch": branch_by_code["IST"],
            "assigned_to": "Administrator",
            "status": "Open",
            "priority": "High",
            "due_date": add_days(today, 7),
            "notes": "Policenin bitisine 90 gun kala yenileme gorusmesi",
        },
        {
            "task_title": "Mehmet Kaya kasko hasar takibi",
            "task_type": "Claim",
            "customer": customer_map["cust_3"],
            "policy": policy_map["AKSG-2026-00456"],
            "claim": claim_map["CLM-AKSG-001"],
            "office_branch": branch_by_code["IZM"],
            "assigned_to": "Administrator",
            "status": "In Progress",
            "priority": "Critical",
            "due_date": add_days(today, 3),
            "notes": "Calinti hasar dosyasi eksper raporu beklemede",
        },
        {
            "task_title": "Cinar Insaat police gorusmesi",
            "task_type": "Visit",
            "customer": customer_map["cust_5"],
            "office_branch": branch_by_code["ANT"],
            "assigned_to": "Administrator",
            "status": "Open",
            "priority": "Normal",
            "due_date": add_days(today, 14),
            "notes": "Kurumsal police paket gorusmesi",
        },
        {
            "task_title": "Ayse Demir TSS kontrol",
            "task_type": "Review",
            "customer": customer_map["cust_2"],
            "policy": policy_map["ALZ-2026-00789"],
            "office_branch": branch_by_code["ANK"],
            "assigned_to": "Administrator",
            "status": "Done",
            "priority": "Normal",
            "due_date": add_days(today, -10),
            "completed_on": add_days(today, -8),
            "notes": "TSS police kontrolu yapildi",
        },
        {
            "task_title": "Zeynep Ozturk konut sigortasi teklif hazirla",
            "task_type": "Follow-up",
            "customer": customer_map["cust_4"],
            "office_branch": branch_by_code["BRS"],
            "assigned_to": "Administrator",
            "status": "Open",
            "priority": "Low",
            "due_date": add_days(today, 21),
            "notes": "Iptal edilen konut icin yeni teklif hazirla",
        },
    ]
    for tdata in task_data[:seed_count]:
        _insert("AT Task", tdata)
        _inc("tasks")
    if print_output:
        print(f"  Seeded {summary['tasks']} tasks")

    # ══════════════════════════════════════════════════════════════════════
    # 12. Activities -- 5
    # ══════════════════════════════════════════════════════════════════════
    activity_data = [
        {
            "activity_title": "Ali Yilmaz ile telefon gorusmesi",
            "activity_type": "Call",
            "customer": customer_map["cust_1"],
            "office_branch": branch_by_code["IST"],
            "activity_at": add_days(today, -60),
            "status": "Logged",
            "notes": "Trafik sigortasi teklifi hakkinda bilgi verildi",
        },
        {
            "activity_title": "Mehmet Kaya ofis ziyareti",
            "activity_type": "Visit",
            "customer": customer_map["cust_3"],
            "office_branch": branch_by_code["IZM"],
            "activity_at": add_days(today, -30),
            "status": "Logged",
            "notes": "Kasko police detaylari gorusuldu",
        },
        {
            "activity_title": "Ayse Demir TSS police guncelleme",
            "activity_type": "Claim Update",
            "customer": customer_map["cust_2"],
            "policy": policy_map["ALZ-2026-00789"],
            "office_branch": branch_by_code["ANK"],
            "activity_at": add_days(today, -15),
            "status": "Logged",
            "notes": "TSS teminat guncellemesi yapildi",
        },
        {
            "activity_title": "Cinar Insaat yenileme takvimi olusturma",
            "activity_type": "Renewal Update",
            "customer": customer_map["cust_5"],
            "office_branch": branch_by_code["ANT"],
            "activity_at": add_days(today, -7),
            "status": "Shared",
            "notes": "Kurumsal yenileme takvimi paylasildi",
        },
        {
            "activity_title": "Zeynep Ozturk yeni konut teklifi notu",
            "activity_type": "Note",
            "customer": customer_map["cust_4"],
            "office_branch": branch_by_code["BRS"],
            "activity_at": add_days(today, -2),
            "status": "Logged",
            "notes": "Iptal edilen police sonrasi yeni teklif alternatifleri",
        },
    ]
    for adata in activity_data[:seed_count]:
        _insert("AT Activity", adata)
        _inc("activities")
    if print_output:
        print(f"  Seeded {summary['activities']} activities")

    # ══════════════════════════════════════════════════════════════════════
    # 13. Call Notes -- 5
    # ══════════════════════════════════════════════════════════════════════
    call_note_data = [
        {
            "customer": customer_map["cust_1"],
            "office_branch": branch_by_code["IST"],
            "channel": "Phone Call",
            "direction": "Outbound",
            "call_status": "Completed",
            "call_outcome": "Teklif gonderildi",
            "note_at": add_days(today, -58),
            "notes": "Trafik teklifi telefonda anlatildi, mail atildi",
        },
        {
            "customer": customer_map["cust_3"],
            "office_branch": branch_by_code["IZM"],
            "channel": "Phone Call",
            "direction": "Inbound",
            "call_status": "Completed",
            "call_outcome": "Hasar bildirimi alindi",
            "note_at": add_days(today, -9),
            "notes": "Mustakil arac calinti ihbari",
        },
        {
            "customer": customer_map["cust_2"],
            "office_branch": branch_by_code["ANK"],
            "channel": "WhatsApp Call",
            "direction": "Outbound",
            "call_status": "Completed",
            "call_outcome": "Police yenileme onayi",
            "note_at": add_days(today, -20),
            "notes": "TSS yenilemesi WhatsApp uzerinden onaylandi",
        },
        {
            "customer": customer_map["cust_5"],
            "office_branch": branch_by_code["ANT"],
            "channel": "Video Call",
            "direction": "Outbound",
            "call_status": "Completed",
            "call_outcome": "Kurumsal teklif sunumu",
            "note_at": add_days(today, -5),
            "notes": "Cinar Insaat yoneticisi ile gorusme yapildi",
        },
        {
            "customer": customer_map["cust_4"],
            "office_branch": branch_by_code["BRS"],
            "channel": "Phone Call",
            "direction": "Outbound",
            "call_status": "Missed",
            "call_outcome": "Ulasilamadi",
            "note_at": add_days(today, -1),
            "next_follow_up_on": add_days(today, 2),
            "notes": "Zeynep Hanim'a ulasilamadi, 2 gun sonra tekrar aranacak",
        },
    ]
    for i, cndata in enumerate(call_note_data[:seed_count], start=1):
        _insert("AT Call Note", cndata, name=_gen_name("AT-CALL", today.strftime("%Y"), i))
        _inc("call_notes")
    if print_output:
        print(f"  Seeded {summary['call_notes']} call notes")

    # ══════════════════════════════════════════════════════════════════════
    # 14. Renewal Tasks -- 5
    # ══════════════════════════════════════════════════════════════════════
    renewal_data = [
        {
            "policy": policy_map["ANAD-2026-00123"],
            "customer": customer_map["cust_1"],
            "office_branch": branch_by_code["IST"],
            "renewal_date": add_days(today, 275),
            "due_date": add_days(today, 0),
            "status": "Open",
            "assigned_to": "Administrator",
            "auto_created": 0,
            "notes": "Trafik sigortasi yenileme - 90 gun kala",
        },
        {
            "policy": policy_map["AKSG-2026-00456"],
            "customer": customer_map["cust_3"],
            "office_branch": branch_by_code["IZM"],
            "renewal_date": add_days(today, 320),
            "due_date": add_days(today, 0),
            "status": "In Progress",
            "assigned_to": "Administrator",
            "auto_created": 0,
            "notes": "Kasko yenileme calismasi basladi",
        },
        {
            "policy": policy_map["ALZ-2026-00789"],
            "customer": customer_map["cust_2"],
            "office_branch": branch_by_code["ANK"],
            "renewal_date": add_days(today, 215),
            "due_date": add_days(today, 0),
            "status": "Done",
            "assigned_to": "Administrator",
            "auto_created": 0,
            "notes": "TSS yenilendi",
        },
        {
            "policy": policy_map["MPFR-2026-00101"],
            "customer": customer_map["cust_5"],
            "office_branch": branch_by_code["ANT"],
            "renewal_date": add_days(today, 335),
            "due_date": add_days(today, 0),
            "status": "Open",
            "assigned_to": "Administrator",
            "auto_created": 0,
            "notes": "DASK yenileme takibi",
        },
        {
            "policy": policy_map["ZRC-2026-00202"],
            "customer": customer_map["cust_4"],
            "office_branch": branch_by_code["BRS"],
            "renewal_date": add_days(today, 185),
            "due_date": add_days(today, 0),
            "status": "Cancelled",
            "assigned_to": "Administrator",
            "auto_created": 0,
            "notes": "Konut police iptal - yenileme yok",
        },
    ]
    for rdata in renewal_data[:seed_count]:
        _insert("AT Renewal Task", rdata)
        _inc("renewal_tasks")
    if print_output:
        print(f"  Seeded {summary['renewal_tasks']} renewal tasks")

    # ══════════════════════════════════════════════════════════════════════
    # 15. Accounting Entries -- 5
    # ══════════════════════════════════════════════════════════════════════
    accounting_data = [
        {
            "source_doctype": "AT Policy",
            "source_name": policy_map["ANAD-2026-00123"],
            "entry_type": "Policy",
            "policy": policy_map["ANAD-2026-00123"],
            "customer": customer_map["cust_1"],
            "sales_entity": se_ist.name,
            "insurance_company": company_name_to_id["Anadolu Sigorta"],
            "office_branch": branch_by_code["IST"],
            "status": "Synced",
            "currency": "TRY",
            "local_amount": 8500,
            "local_amount_try": 8500,
            "external_amount": 8500,
            "external_amount_try": 8500,
        },
        {
            "source_doctype": "AT Policy",
            "source_name": policy_map["AKSG-2026-00456"],
            "entry_type": "Policy",
            "policy": policy_map["AKSG-2026-00456"],
            "customer": customer_map["cust_3"],
            "sales_entity": se_izm.name,
            "insurance_company": company_name_to_id["Aksigorta"],
            "office_branch": branch_by_code["IZM"],
            "status": "Synced",
            "currency": "TRY",
            "local_amount": 12400,
            "local_amount_try": 12400,
            "external_amount": 12400,
            "external_amount_try": 12400,
        },
        {
            "source_doctype": "AT Policy",
            "source_name": policy_map["ALZ-2026-00789"],
            "entry_type": "Policy",
            "policy": policy_map["ALZ-2026-00789"],
            "customer": customer_map["cust_2"],
            "sales_entity": se_ank.name,
            "insurance_company": company_name_to_id["Allianz Sigorta"],
            "office_branch": branch_by_code["ANK"],
            "status": "Synced",
            "currency": "TRY",
            "local_amount": 15800,
            "local_amount_try": 15800,
            "external_amount": 15800,
            "external_amount_try": 15800,
        },
        {
            "source_doctype": "AT Payment",
            "source_name": payment_map["PAY-2026-003"],
            "entry_type": "Payment",
            "customer": customer_map["cust_1"],
            "office_branch": branch_by_code["IST"],
            "status": "Draft",
            "currency": "TRY",
            "local_amount": 900,
            "local_amount_try": 900,
        },
        {
            "source_doctype": "AT Claim",
            "source_name": claim_map["CLM-MPFR-001"],
            "entry_type": "Claim",
            "customer": customer_map["cust_5"],
            "office_branch": branch_by_code["ANT"],
            "status": "Synced",
            "currency": "TRY",
            "local_amount": 22000,
            "local_amount_try": 22000,
            "external_amount": 22000,
            "external_amount_try": 22000,
        },
    ]
    acc_entry_map: dict[str, str] = {}
    for i, acdata in enumerate(accounting_data[:seed_count], start=1):
        doc = _insert("AT Accounting Entry", acdata)
        key = str(acdata["source_name"]) if acdata["source_name"] else ""
        acc_entry_map[key] = doc.name
        _inc("accounting_entries")
    if print_output:
        print(f"  Seeded {summary['accounting_entries']} accounting entries")

    # ══════════════════════════════════════════════════════════════════════
    # 16. Segments -- 5
    # ══════════════════════════════════════════════════════════════════════
    segment_data = [
        {
            "segment_name": "Yuksek Risk Yenileme",
            "segment_type": "Dynamic",
            "channel_focus": "WHATSAPP",
            "office_branch": branch_by_code["IST"],
            "status": "Active",
            "criteria_json": json.dumps(
                {"days_to_end": {"$lte": 30}, "premium_band": "high"}
            ),
            "notes": "30 gun icinde bitecek yuksek primli policeler",
        },
        {
            "segment_name": "Kasko 30 Gun",
            "segment_type": "Static",
            "channel_focus": "SMS",
            "office_branch": branch_by_code["ANK"],
            "status": "Active",
            "criteria_json": json.dumps(
                {"branch": "Kasko", "days_to_end": {"$lte": 30}}
            ),
            "notes": "Kasko bitisine 30 gun kalan musteriler",
        },
        {
            "segment_name": "Saglik Kampanya",
            "segment_type": "Operational",
            "channel_focus": "Email",
            "office_branch": branch_by_code["IZM"],
            "status": "Draft",
            "criteria_json": json.dumps(
                {"branch": "Saglik", "age": {"$gte": 25, "$lte": 55}}
            ),
            "notes": "TSS potansiyel musteriler",
        },
        {
            "segment_name": "Kurumsal Portfoy",
            "segment_type": "Static",
            "channel_focus": "Phone Call",
            "office_branch": branch_by_code["BRS"],
            "status": "Active",
            "criteria_json": json.dumps(
                {"customer_type": "Corporate"}
            ),
            "notes": "Kurumsal musteriler",
        },
        {
            "segment_name": "Trafik Yenileme Takip",
            "segment_type": "Dynamic",
            "channel_focus": "WHATSAPP",
            "office_branch": branch_by_code["ANT"],
            "status": "Active",
            "criteria_json": json.dumps(
                {"branch": "Trafik", "days_to_end": {"$lte": 45}}
            ),
            "notes": "Trafik sigortasi bitisine 45 gun kala",
        },
    ]
    segment_map: dict[str, str] = {}
    for i, sdata in enumerate(segment_data[:seed_count], start=1):
        sname = _gen_name("AT-SEG", today.strftime("%Y"), i)
        doc = _insert("AT Segment", sdata, name=sname)
        segment_map[f"seg_{i}"] = doc.name
        _inc("segments")
    if print_output:
        print(f"  Seeded {summary['segments']} segments")

    # ══════════════════════════════════════════════════════════════════════
    # 17. Notification Templates -- 5
    # ══════════════════════════════════════════════════════════════════════
    template_data = [
        {
            "template_key": "DMO-RENEWAL-90",
            "event_key": "renewal_reminder_90",
            "channel": "WHATSAPP",
            "content_mode": "template",
            "language": "tr",
            "subject": "Policeniz 90 Gun Sonra Bitecek",
            "body_template": "Sayin {{full_name}}, {{policy_type}} policeniz {{days_left}} gun sonra sona eriyor. Yenileme icin bizimle iletisime gecin.",
            "is_active": 1,
        },
        {
            "template_key": "DMO-RENEWAL-30",
            "event_key": "renewal_reminder_30",
            "channel": "WHATSAPP",
            "content_mode": "template",
            "language": "tr",
            "subject": "Policeniz 30 Gun Sonra Bitecek",
            "body_template": "Sayin {{full_name}}, {{policy_type}} policeniz {{days_left}} gun sonra sona eriyor. Guncel teklifiniz hazir.",
            "is_active": 1,
        },
        {
            "template_key": "DMO-RENEWAL-7",
            "event_key": "renewal_reminder_7",
            "channel": "WHATSAPP",
            "content_mode": "template",
            "language": "tr",
            "subject": "Policeniz 7 Gun Sonra Bitecek",
            "body_template": "Sayin {{full_name}}, {{policy_type}} policeniz {{days_left}} gun sonra sona eriyor. Hemen yenileyin!",
            "is_active": 1,
        },
        {
            "template_key": "DMO-PAYMENT-DUE",
            "event_key": "payment_due_7",
            "channel": "SMS",
            "content_mode": "freeform",
            "language": "tr",
            "subject": "Odeme Hatirlatmasi",
            "body_template": "Sayin {{full_name}}, {{policy_type}} policesi icin {{amount}} TL tutarindaki odemenizin son gunu {{due_date}}.",
            "sms_body_template": "{{full_name}}, {{policy_type}} odeme hatirlatmasi: {{amount}} TL, son gun: {{due_date}}",
            "is_active": 1,
        },
        {
            "template_key": "DMO-CLAIM-APPROVED",
            "event_key": "claim_status_approved",
            "channel": "SMS",
            "content_mode": "freeform",
            "language": "tr",
            "subject": "Hasar Dosyaniz Onaylandi",
            "body_template": "Sayin {{full_name}}, {{claim_no}} numarali hasar dosyaniz onaylandi. {{approved_amount}} TL odeme yapilacaktir.",
            "sms_body_template": "{{full_name}}, hasariniz onaylandi: {{claim_no}}, tutar: {{approved_amount}} TL",
            "is_active": 1,
        },
    ]
    for tdata in template_data[:seed_count]:
        _upsert_by_field(
            "AT Notification Template",
            "template_key",
            tdata["template_key"],
            tdata,
        )
        _inc("notification_templates")
    if print_output:
        print(f"  Seeded {summary['notification_templates']} notification templates")

    # ══════════════════════════════════════════════════════════════════════
    # 18. Campaigns -- 5
    # ══════════════════════════════════════════════════════════════════════
    campaign_data = [
        {
            "campaign_name": "Mart Yenileme Kampanyasi",
            "segment": segment_map["seg_1"],
            "channel": "WHATSAPP",
            "office_branch": branch_by_code["IST"],
            "status": "Running",
            "scheduled_for": add_days(today, -5),
            "sent_count": 128,
            "matched_customer_count": 150,
            "skipped_count": 22,
            "last_run_on": add_days(today, -2),
            "last_run_summary": "128 gonderi basarili",
            "notes": "Mart ayi yenileme bildirimleri",
        },
        {
            "campaign_name": "Nisan Kasko Kampanyasi",
            "segment": segment_map["seg_2"],
            "channel": "SMS",
            "office_branch": branch_by_code["ANK"],
            "status": "Planned",
            "scheduled_for": add_days(today, 10),
            "notes": "Kasko yenileme kampanyasi planlandi",
        },
        {
            "campaign_name": "Saglik Bilgilendirme",
            "segment": segment_map["seg_3"],
            "channel": "Email",
            "office_branch": branch_by_code["IZM"],
            "status": "Draft",
            "notes": "TSS avantajlari bilgilendirme",
        },
        {
            "campaign_name": "Kurumsal Portfoy Gorusmesi",
            "segment": segment_map["seg_4"],
            "channel": "Phone Call",
            "office_branch": branch_by_code["ANT"],
            "status": "Running",
            "scheduled_for": add_days(today, -15),
            "sent_count": 12,
            "matched_customer_count": 12,
            "last_run_on": add_days(today, -7),
            "last_run_summary": "12 gorusme tamamlandi",
            "notes": "Kurumsal musterilerle birebir gorusme",
        },
        {
            "campaign_name": "Gecmis Donem Tamamlandi",
            "segment": segment_map["seg_5"],
            "channel": "WHATSAPP",
            "office_branch": branch_by_code["BRS"],
            "status": "Completed",
            "scheduled_for": add_days(today, -60),
            "sent_count": 85,
            "matched_customer_count": 100,
            "skipped_count": 15,
            "last_run_on": add_days(today, -45),
            "last_run_summary": "85/100 basarili",
            "notes": "Ocak yenileme kampanyasi tamamlandi",
        },
    ]
    for i, cdata in enumerate(campaign_data[:seed_count], start=1):
        _insert("AT Campaign", cdata, name=_gen_name("AT-CAMP", today.strftime("%Y"), i))
        _inc("campaigns")
    if print_output:
        print(f"  Seeded {summary['campaigns']} campaigns")

    # ══════════════════════════════════════════════════════════════════════
    # 19. Reminders -- 5
    # ══════════════════════════════════════════════════════════════════════
    reminder_data = [
        {
            "reminder_title": "Ali Yilmaz yenileme gorusmesi",
            "customer": customer_map["cust_1"],
            "policy": policy_map["ANAD-2026-00123"],
            "office_branch": branch_by_code["IST"],
            "assigned_to": "Administrator",
            "status": "Open",
            "priority": "High",
            "remind_at": add_days(today, 3),
            "notes": "Yenileme teklifi icin arama zamani",
        },
        {
            "reminder_title": "Mehmet Kaya hasar takip",
            "customer": customer_map["cust_3"],
            "claim": claim_map["CLM-AKSG-001"],
            "office_branch": branch_by_code["IZM"],
            "assigned_to": "Administrator",
            "status": "Open",
            "priority": "Critical",
            "remind_at": add_days(today, 1),
            "notes": "Eksper raporu geldi mi kontrol et",
        },
        {
            "reminder_title": "TSS police son kontrol",
            "customer": customer_map["cust_2"],
            "policy": policy_map["ALZ-2026-00789"],
            "office_branch": branch_by_code["ANK"],
            "assigned_to": "Administrator",
            "status": "Done",
            "priority": "Normal",
            "remind_at": add_days(today, -5),
            "completed_on": add_days(today, -4),
            "notes": "Police kontrol edildi",
        },
        {
            "reminder_title": "Kurumsal gorusme hatirlatmasi",
            "customer": customer_map["cust_5"],
            "office_branch": branch_by_code["ANT"],
            "assigned_to": "Administrator",
            "status": "Open",
            "priority": "Normal",
            "remind_at": add_days(today, 7),
            "notes": "Cinar Insaat gorusmesi oncesi hazirlik",
        },
        {
            "reminder_title": "Zeynep Ozturk geri arama",
            "customer": customer_map["cust_4"],
            "office_branch": branch_by_code["BRS"],
            "assigned_to": "Administrator",
            "status": "Open",
            "priority": "Low",
            "remind_at": add_days(today, 2),
            "notes": "Ulasilamayan musteriye tekrar ara",
        },
    ]
    for rdata in reminder_data[:seed_count]:
        _insert("AT Reminder", rdata)
        _inc("reminders")
    if print_output:
        print(f"  Seeded {summary['reminders']} reminders")

    # ══════════════════════════════════════════════════════════════════════
    # 20. Documents -- 5
    # ══════════════════════════════════════════════════════════════════════
    document_data = [
        {
            "original_file_name": "Trafik_Sigortasi_ANAD-2026-00123.pdf",
            "display_name": "Trafik Police PDF",
            "document_kind": "Policy Document",
            "document_sub_type": "Original",
            "status": "Active",
            "reference_doctype": "AT Policy",
            "reference_name": policy_map["ANAD-2026-00123"],
            "policy": policy_map["ANAD-2026-00123"],
            "customer": customer_map["cust_1"],
        },
        {
            "original_file_name": "Kasko_Sigortasi_AKSG-2026-00456.pdf",
            "display_name": "Kasko Police PDF",
            "document_kind": "Policy Document",
            "document_sub_type": "Original",
            "status": "Active",
            "reference_doctype": "AT Policy",
            "reference_name": policy_map["AKSG-2026-00456"],
            "policy": policy_map["AKSG-2026-00456"],
            "customer": customer_map["cust_3"],
        },
        {
            "original_file_name": "Hasar_Fotografi_CLM-AKSG-001.jpg",
            "display_name": "Hasar Fotografi",
            "document_kind": "Claim Evidence",
            "status": "Active",
            "reference_doctype": "AT Claim",
            "reference_name": claim_map["CLM-AKSG-001"],
            "customer": customer_map["cust_3"],
            "claim": claim_map["CLM-AKSG-001"],
        },
        {
            "original_file_name": "Kimlik_TCKN_10101000188.jpg",
            "display_name": "Kimlik Fotokopisi",
            "document_kind": "ID Document",
            "document_sub_type": "National ID",
            "is_sensitive": 1,
            "status": "Active",
            "reference_doctype": "AT Customer",
            "reference_name": customer_map["cust_1"],
            "customer": customer_map["cust_1"],
        },
        {
            "original_file_name": "Vergi_Levha_Cinar_2026.pdf",
            "display_name": "Vergi Levhasi 2026",
            "document_kind": "Tax Document",
            "document_sub_type": "Tax Certificate",
            "is_sensitive": 1,
            "status": "Active",
            "reference_doctype": "AT Customer",
            "reference_name": customer_map["cust_5"],
            "customer": customer_map["cust_5"],
        },
    ]
    for i, ddata in enumerate(document_data[:seed_count], start=1):
        _insert("AT Document", ddata, name=_gen_name("AT-DOC", today.strftime("%Y"), i))
        _inc("documents")
    if print_output:
        print(f"  Seeded {summary['documents']} documents")

    # ══════════════════════════════════════════════════════════════════════
    # 21. Insured Assets -- 5
    # ══════════════════════════════════════════════════════════════════════
    asset_data = [
        {
            "customer": customer_map["cust_1"],
            "policy": policy_map["ANAD-2026-00123"],
            "asset_type": "Vehicle",
            "asset_label": "BMW 320i 2020",
            "asset_identifier": "34ABC123",
            "notes": "Trafik sigortali arac",
        },
        {
            "customer": customer_map["cust_3"],
            "policy": policy_map["AKSG-2026-00456"],
            "asset_type": "Vehicle",
            "asset_label": "VW Passat 2021",
            "asset_identifier": "35DEF456",
            "notes": "Kaskolu arac",
        },
        {
            "customer": customer_map["cust_4"],
            "policy": policy_map["ZRC-2026-00202"],
            "asset_type": "Home",
            "asset_label": "Bursa Nilufer Daire",
            "asset_identifier": "BRS-NIL-012",
            "notes": "Konut sigortali daire",
        },
        {
            "customer": customer_map["cust_5"],
            "policy": policy_map["MPFR-2026-00101"],
            "asset_type": "Workplace",
            "asset_label": "Cinar Insaat Ofis",
            "asset_identifier": "ANT-MRP-005",
            "notes": "DASK sigortali ofis",
        },
        {
            "customer": customer_map["cust_2"],
            "asset_type": "Health Person",
            "asset_label": "Ayse Demir TSS",
            "asset_identifier": "TCKN-202020002",
            "notes": "Tamamlayici saglik sigortasi",
        },
    ]
    for adata in asset_data[:seed_count]:
        _insert("AT Insured Asset", adata)
        _inc("insured_assets")
    if print_output:
        print(f"  Seeded {summary['insured_assets']} insured assets")

    # ══════════════════════════════════════════════════════════════════════
    # 22. Reconciliation Items -- 5
    # ══════════════════════════════════════════════════════════════════════
    reconciliation_data = [
        {
            "source_doctype": "AT Policy",
            "source_name": policy_map["ANAD-2026-00123"],
            "status": "Open",
            "mismatch_type": "Amount",
            "local_amount_try": 8500,
            "external_amount_try": 8450,
            "details_json": json.dumps({"reason": "Kur farki"}),
            "notes": "Trafik prim tutar uyusmazligi",
        },
        {
            "source_doctype": "AT Policy",
            "source_name": policy_map["ALZ-2026-00789"],
            "status": "Resolved",
            "mismatch_type": "Amount",
            "local_amount_try": 15800,
            "external_amount_try": 15800,
            "resolution_action": "Matched",
            "resolved_by": "Administrator",
            "resolved_on": add_days(today, -30),
            "notes": "Cozuldu",
        },
        {
            "source_doctype": "AT Payment",
            "source_name": payment_map["PAY-2026-003"],
            "status": "Open",
            "mismatch_type": "Missing External",
            "local_amount_try": 900,
            "external_amount_try": 0,
            "notes": "Harici sistemde komisyon kaydi yok",
        },
        {
            "source_doctype": "AT Claim",
            "source_name": claim_map["CLM-MPFR-001"],
            "status": "Open",
            "mismatch_type": "Status",
            "local_amount_try": 22000,
            "external_amount_try": 22000,
            "notes": "Harici sistemde durum farkli",
        },
        {
            "source_doctype": "AT Policy",
            "source_name": policy_map["AKSG-2026-00456"],
            "status": "Ignored",
            "mismatch_type": "Currency",
            "local_amount_try": 12400,
            "external_amount_try": 12450,
            "notes": "Onemsiz fark - yok sayildi",
        },
    ]
    for i, rdata in enumerate(reconciliation_data[:seed_count], start=1):
        rec_name = _gen_name("AT-REC", today.strftime("%Y"), i)
        acct_name = frappe.db.get_value(
            "AT Accounting Entry",
            {"source_doctype": rdata["source_doctype"], "source_name": rdata["source_name"]},
            "name",
        )
        if acct_name:
            rdata["accounting_entry"] = acct_name
        _insert("AT Reconciliation Item", rdata, name=rec_name)
        _inc("reconciliation_items")
    if print_output:
        print(f"  Seeded {summary['reconciliation_items']} reconciliation items")

    frappe.db.commit()

    total = sum(summary.values())
    if print_output:
        print(f"\n{'='*50}")
        print(f"  Total seeded: {total} records across {len(summary)} entity types")
        print(f"{'='*50}")

    return {
        "deleted": deleted if clean_first else {},
        "seeded": summary,
        "total": total,
    }


# ── Entry Points ──────────────────────────────────────────────────────────


def inspect():
    """Print current AT data counts."""
    doctypes = [
        "AT Office Branch",
        "AT Insurance Company",
        "AT Branch",
        "AT Sales Entity",
        "AT Customer",
        "AT Lead",
        "AT Offer",
        "AT Policy",
        "AT Policy Endorsement",
        "AT Claim",
        "AT Payment",
        "AT Payment Installment",
        "AT Renewal Task",
        "AT Renewal Outcome",
        "AT Accounting Entry",
        "AT Reconciliation Item",
        "AT Task",
        "AT Reminder",
        "AT Activity",
        "AT Call Note",
        "AT Document",
        "AT Insured Asset",
        "AT Segment",
        "AT Campaign",
        "AT Notification Template",
        "AT Notification Draft",
        "AT Notification Outbox",
        "AT Access Log",
        "AT User Branch Access",
        "AT User Sales Entity Access",
    ]
    print("\nCurrent AT Data Counts:")
    print("-" * 45)
    total = 0
    for dt in doctypes:
        cnt = frappe.db.count(dt)
        total += cnt
        print(f"  {dt:<40} {cnt:>6}")
    print("-" * 45)
    print(f"  {'TOTAL':<40} {total:>6}")
    return total


def reset_all():
    """Delete all AT data and return deleted counts."""
    return _safe_delete_all()


if __name__ == "__main__":
    run(clean_first=True, print_output=True)
