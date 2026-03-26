from __future__ import annotations

from typing import Any

import frappe
from frappe.utils import add_days, cint, date_diff, flt, getdate, nowdate
from acentem_takipte.acentem_takipte.api.security import (
    assert_doctype_permission,
    assert_non_production_or_feature_flag,
)
from acentem_takipte.acentem_takipte.renewal.reminders import resolve_stage_for_days
from acentem_takipte.acentem_takipte.notification_seed_service import (
    upsert_default_notification_templates,
)
from acentem_takipte.acentem_takipte.services.renewals import build_renewal_stage_key
from acentem_takipte.acentem_takipte.tasks import build_renewal_key
from acentem_takipte.acentem_takipte.utils.permissions import assert_mutation_access

DEMO_SEED_ADMIN_ROLES = ("System Manager",)
SEED_CREATE_DOCTYPES = (
    "AT Insurance Company",
    "AT Branch",
    "AT Sales Entity",
    "AT Customer",
    "AT Lead",
    "AT Policy",
    "AT Claim",
    "AT Payment",
    "AT Renewal Task",
)
SEED_DELETE_DOCTYPES = (
    "AT Renewal Task",
    "AT Payment",
    "AT Claim",
    "AT Policy",
    "AT Lead",
    "AT Customer",
    "AT Sales Entity",
    "AT Branch",
    "AT Insurance Company",
)


def _assert_demo_seed_access(*, reset_existing: int | str = 0) -> None:
    assert_non_production_or_feature_flag(
        "at_enable_demo_endpoints",
        "Demo seed endpoint is disabled in production. Enable site_config 'at_enable_demo_endpoints' to allow it.",
    )
    assert_mutation_access(
        action="api.seed.seed_demo_data",
        roles=DEMO_SEED_ADMIN_ROLES,
        doctype_permissions=SEED_CREATE_DOCTYPES,
        permtype="create",
        details={"reset_existing": bool(cint(reset_existing))},
        role_message="Only System Manager can run demo seed operations.",
        post_message="Only POST requests are allowed for demo seed operations.",
    )
    if cint(reset_existing):
        for doctype in SEED_DELETE_DOCTYPES:
            assert_doctype_permission(
                doctype,
                "delete",
                f"Missing delete permission for {doctype} during demo seed reset.",
            )


@frappe.whitelist()
def seed_demo_data(reset_existing: int | str = 0) -> dict[str, Any]:
    _assert_demo_seed_access(reset_existing=reset_existing)
    reset = bool(cint(reset_existing))
    if reset:
        _cleanup_demo_data()

    today = getdate(nowdate())
    summary = {
        "insurance_companies": 0,
        "branches": 0,
        "sales_entities": 0,
        "customers": 0,
        "leads": 0,
        "policies": 0,
        "claims": 0,
        "payments": 0,
        "renewal_tasks": 0,
        "notification_templates": 0,
    }

    template_summary = upsert_default_notification_templates()
    summary["notification_templates"] = template_summary["total"]

    company_names = [
        "DEMO Anadolu Sigorta",
        "DEMO Aksigorta",
        "DEMO Zurich Sigorta",
    ]
    for idx, company_name in enumerate(company_names, start=1):
        doc = _upsert_by_name(
            "AT Insurance Company",
            company_name,
            {
                "company_name": company_name,
                "company_code": f"DEMO{idx:02d}",
                "is_active": 1,
            },
        )
        summary["insurance_companies"] += 1 if doc else 0

    branch_map = {
        "DEMO Trafik": ("DTF", company_names[0]),
        "DEMO Kasko": ("DKS", company_names[1]),
        "DEMO Sağlık": ("DSG", company_names[2]),
    }
    for branch_name, (branch_code, insurance_company) in branch_map.items():
        doc = _upsert_by_name(
            "AT Branch",
            branch_name,
            {
                "branch_name": branch_name,
                "branch_code": branch_code,
                "insurance_company": insurance_company,
                "is_active": 1,
            },
        )
        summary["branches"] += 1 if doc else 0

    main_entity = _upsert_sales_entity("DEMO Main Agency", "Agency")
    alpha_entity = _upsert_sales_entity(
        "DEMO Team Alpha", "Sub-Account", parent_entity=main_entity.name
    )
    rep_entity = _upsert_sales_entity(
        "DEMO Rep Ayse", "Representative", parent_entity=alpha_entity.name
    )
    summary["sales_entities"] += 3

    demo_agent = _pick_demo_agent()

    customers = [
        {
            "seed_alias": "1000000001",
            "customer_type": "Individual",
            "tax_id": _make_valid_tckn("100000001"),
            "full_name": "DEMO Ahmet Yilmaz",
            "birth_date": add_days(today, -(35 * 365)),
            "phone": "05320000001",
            "email": "demo.ahmet@example.com",
            "address": "Istanbul",
            "assigned_agent": demo_agent,
        },
        {
            "seed_alias": "1000000002",
            "customer_type": "Individual",
            "tax_id": _make_valid_tckn("100000002"),
            "full_name": "DEMO Elif Kara",
            "birth_date": add_days(today, -(29 * 365)),
            "phone": "05320000002",
            "email": "demo.elif@example.com",
            "address": "Ankara",
            "assigned_agent": demo_agent,
        },
        {
            "seed_alias": "1000000003",
            "customer_type": "Individual",
            "tax_id": _make_valid_tckn("100000003"),
            "full_name": "DEMO Mert Demir",
            "birth_date": add_days(today, -(42 * 365)),
            "phone": "05320000003",
            "email": "demo.mert@example.com",
            "address": "Izmir",
            "assigned_agent": demo_agent,
        },
        {
            "seed_alias": "1000000004",
            "customer_type": "Individual",
            "tax_id": _make_valid_tckn("100000004"),
            "full_name": "DEMO Sude Acar",
            "birth_date": add_days(today, -(31 * 365)),
            "phone": "05320000004",
            "email": "demo.sude@example.com",
            "address": "Bursa",
            "assigned_agent": demo_agent,
        },
    ]
    customer_name_map: dict[str, str] = {}
    for row in customers:
        payload = {key: value for key, value in row.items() if key != "seed_alias"}
        doc = _upsert_customer(payload)
        customer_name_map[row["seed_alias"]] = doc.name
        summary["customers"] += 1

    leads = [
        {
            "lookup_key": "demo.can@example.com",
            "first_name": "Can",
            "last_name": "Aydin",
            "email": "demo.can@example.com",
            "status": "Open",
            "customer": "1000000001",
            "sales_entity": rep_entity.name,
            "insurance_company": company_names[0],
            "branch": "DEMO Trafik",
            "estimated_gross_premium": 14500,
            "notes": "DEMO_SEED - trafik lead",
        },
        {
            "lookup_key": "demo.elif.lead@example.com",
            "first_name": "Elif",
            "last_name": "Sari",
            "email": "demo.elif.lead@example.com",
            "status": "Draft",
            "customer": "1000000002",
            "sales_entity": alpha_entity.name,
            "insurance_company": company_names[1],
            "branch": "DEMO Kasko",
            "estimated_gross_premium": 9200,
            "notes": "DEMO_SEED - kasko lead",
        },
        {
            "lookup_key": "demo.mert.lead@example.com",
            "first_name": "Mert",
            "last_name": "Kilic",
            "email": "demo.mert.lead@example.com",
            "status": "Replied",
            "customer": "1000000003",
            "sales_entity": rep_entity.name,
            "insurance_company": company_names[2],
            "branch": "DEMO Sağlık",
            "estimated_gross_premium": 17800,
            "notes": "DEMO_SEED - sağlık lead",
        },
        {
            "lookup_key": "demo.sude.lead@example.com",
            "first_name": "Sude",
            "last_name": "Ak",
            "email": "demo.sude.lead@example.com",
            "status": "Closed",
            "customer": "1000000004",
            "sales_entity": alpha_entity.name,
            "insurance_company": company_names[0],
            "branch": "DEMO Trafik",
            "estimated_gross_premium": 6100,
            "notes": "DEMO_SEED - kapali lead",
        },
        {
            "lookup_key": "demo.omer.lead@example.com",
            "first_name": "Omer",
            "last_name": "Tas",
            "email": "demo.omer.lead@example.com",
            "status": "Open",
            "sales_entity": rep_entity.name,
            "insurance_company": company_names[1],
            "branch": "DEMO Kasko",
            "estimated_gross_premium": 11200,
            "notes": "DEMO_SEED - yeni lead",
        },
    ]
    for row in leads:
        if row.get("customer"):
            row["customer"] = customer_name_map.get(
                str(row["customer"]), row["customer"]
            )
        _upsert_lead(row)
        summary["leads"] += 1

    policies = [
        {
            "policy_no": "DEMO-POL-001",
            "customer": "1000000001",
            "sales_entity": rep_entity.name,
            "insurance_company": company_names[0],
            "branch": "DEMO Trafik",
            "status": "Active",
            "issue_date": add_days(today, -62),
            "start_date": add_days(today, -60),
            "end_date": add_days(today, 305),
            "currency": "TRY",
            "gross_premium": 18500,
            "commission_amount": 2100,
        },
        {
            "policy_no": "DEMO-POL-002",
            "customer": "1000000002",
            "sales_entity": alpha_entity.name,
            "insurance_company": company_names[1],
            "branch": "DEMO Kasko",
            "status": "Active",
            "issue_date": add_days(today, -24),
            "start_date": add_days(today, -20),
            "end_date": add_days(today, 340),
            "currency": "TRY",
            "gross_premium": 9200,
            "commission_amount": 950,
        },
        {
            "policy_no": "DEMO-POL-003",
            "customer": "1000000003",
            "sales_entity": rep_entity.name,
            "insurance_company": company_names[2],
            "branch": "DEMO Sağlık",
            "status": "KYT",
            "issue_date": add_days(today, -121),
            "start_date": add_days(today, -120),
            "end_date": add_days(today, 240),
            "currency": "TRY",
            "gross_premium": 13400,
            "commission_amount": 1600,
        },
        {
            "policy_no": "DEMO-POL-004",
            "customer": "1000000004",
            "sales_entity": alpha_entity.name,
            "insurance_company": company_names[1],
            "branch": "DEMO Kasko",
            "status": "IPT",
            "issue_date": add_days(today, -150),
            "start_date": add_days(today, -145),
            "end_date": add_days(today, 190),
            "currency": "TRY",
            "gross_premium": 7800,
            "commission_amount": 700,
        },
        {
            "policy_no": "DEMO-POL-005",
            "customer": "1000000001",
            "sales_entity": rep_entity.name,
            "insurance_company": company_names[2],
            "branch": "DEMO Sağlık",
            "status": "Active",
            "issue_date": add_days(today, -10),
            "start_date": add_days(today, -9),
            "end_date": add_days(today, 355),
            "currency": "USD",
            "fx_rate": 38.25,
            "fx_date": add_days(today, -9),
            "gross_premium": 480,
            "commission_amount": 55,
        },
    ]
    policy_name_map: dict[str, str] = {}
    for row in policies:
        if row.get("customer"):
            row["customer"] = customer_name_map.get(
                str(row["customer"]), row["customer"]
            )
        doc = _upsert_policy(row)
        policy_name_map[row["policy_no"]] = doc.name
        summary["policies"] += 1

    claims = [
        {
            "claim_no": "DEMO-CLM-001",
            "policy": policy_name_map["DEMO-POL-001"],
            "customer": "1000000001",
            "claim_type": "Damage",
            "claim_status": "Open",
            "incident_date": add_days(today, -12),
            "reported_date": add_days(today, -11),
            "currency": "TRY",
            "estimated_amount": 12000,
            "approved_amount": 0,
            "notes": "DEMO_SEED - open claim",
        },
        {
            "claim_no": "DEMO-CLM-002",
            "policy": policy_name_map["DEMO-POL-003"],
            "customer": "1000000003",
            "claim_type": "Health",
            "claim_status": "Approved",
            "incident_date": add_days(today, -28),
            "reported_date": add_days(today, -27),
            "currency": "TRY",
            "estimated_amount": 18000,
            "approved_amount": 12000,
            "notes": "DEMO_SEED - approved claim",
        },
    ]
    for row in claims:
        if row.get("customer"):
            row["customer"] = customer_name_map.get(
                str(row["customer"]), row["customer"]
            )
        _upsert_by_name("AT Claim", row["claim_no"], row)
        summary["claims"] += 1

    payments = [
        {
            "payment_no": "DEMO-PAY-001",
            "policy": policy_name_map["DEMO-POL-001"],
            "customer": "1000000001",
            "sales_entity": rep_entity.name,
            "payment_direction": "Inbound",
            "payment_purpose": "Premium Collection",
            "status": "Paid",
            "payment_date": add_days(today, -15),
            "due_date": add_days(today, -14),
            "currency": "TRY",
            "amount": 18500,
            "reference_no": "COLL-001",
            "notes": "DEMO_SEED - premium collection",
        },
        {
            "payment_no": "DEMO-PAY-002",
            "policy": policy_name_map["DEMO-POL-002"],
            "customer": "1000000002",
            "sales_entity": alpha_entity.name,
            "payment_direction": "Inbound",
            "payment_purpose": "Premium Collection",
            "status": "Paid",
            "payment_date": add_days(today, -10),
            "due_date": add_days(today, -9),
            "currency": "TRY",
            "amount": 9200,
            "reference_no": "COLL-002",
            "notes": "DEMO_SEED - premium collection",
        },
        {
            "payment_no": "DEMO-PAY-003",
            "policy": policy_name_map["DEMO-POL-001"],
            "customer": "1000000001",
            "sales_entity": rep_entity.name,
            "payment_direction": "Outbound",
            "payment_purpose": "Commission Payout",
            "status": "Paid",
            "payment_date": add_days(today, -8),
            "due_date": add_days(today, -7),
            "currency": "TRY",
            "amount": 2100,
            "reference_no": "COMM-001",
            "notes": "DEMO_SEED - commission payout",
        },
        {
            "payment_no": "DEMO-PAY-004",
            "policy": policy_name_map["DEMO-POL-003"],
            "claim": "DEMO-CLM-002",
            "customer": "1000000003",
            "sales_entity": rep_entity.name,
            "payment_direction": "Outbound",
            "payment_purpose": "Claim Payout",
            "status": "Paid",
            "payment_date": add_days(today, -5),
            "due_date": add_days(today, -4),
            "currency": "TRY",
            "amount": 3000,
            "reference_no": "CLM-001",
            "notes": "DEMO_SEED - claim payout",
        },
    ]
    for row in payments:
        if row.get("customer"):
            row["customer"] = customer_name_map.get(
                str(row["customer"]), row["customer"]
            )
        _upsert_by_name("AT Payment", row["payment_no"], row)
        summary["payments"] += 1

    renewals = [
        {
            "policy": policy_name_map["DEMO-POL-001"],
            "customer": "1000000001",
            "policy_end_date": add_days(today, 305),
            "renewal_date": add_days(today, 7),
            "due_date": today,
            "unique_key": build_renewal_stage_key(
                policy_name_map["DEMO-POL-001"], "1000000001", "D7", today
            ),
            "status": "Open",
            "assigned_to": "Administrator",
            "auto_created": 0,
            "notes": "DEMO_SEED - renewal open",
        },
        {
            "policy": policy_name_map["DEMO-POL-003"],
            "customer": "1000000003",
            "policy_end_date": add_days(today, 240),
            "renewal_date": add_days(today, 15),
            "due_date": today,
            "unique_key": build_renewal_stage_key(
                policy_name_map["DEMO-POL-003"], "1000000003", "D15", today
            ),
            "status": "In Progress",
            "assigned_to": "Administrator",
            "auto_created": 0,
            "notes": "DEMO_SEED - renewal in progress",
        },
    ]
    for row in renewals:
        if row.get("customer"):
            row["customer"] = customer_name_map.get(
                str(row["customer"]), row["customer"]
            )
        row.pop("unique_key", None)
        _upsert_renewal_task(row)
        summary["renewal_tasks"] += 1

    frappe.db.commit()
    summary["dashboard"] = frappe.get_attr(
        "acentem_takipte.api.dashboard.get_dashboard_kpis"
    )()
    return summary


def _upsert_by_name(doctype: str, name: str, values: dict[str, Any]):
    if frappe.db.exists(doctype, name):
        doc = frappe.get_doc(doctype, name)
        _apply_values(doc, values)
        doc.save()
        return doc

    payload = {"doctype": doctype, **values}
    return frappe.get_doc(payload).insert()


def _upsert_customer(values: dict[str, Any]):
    identity_number = str(values.get("tax_id") or "").strip()
    existing_name = frappe.db.get_value(
        "AT Customer", {"tax_id": identity_number}, "name"
    )
    if existing_name:
        doc = frappe.get_doc("AT Customer", existing_name)
        _apply_values(doc, values)
        doc.save()
        return doc

    return frappe.get_doc({"doctype": "AT Customer", **values}).insert()


def _upsert_policy(values: dict[str, Any]):
    policy_no = str(values.get("policy_no") or "").strip()
    insurance_company = values.get("insurance_company")
    existing_name = None

    if policy_no and insurance_company:
        existing_name = frappe.db.get_value(
            "AT Policy",
            {"insurance_company": insurance_company, "policy_no": policy_no},
            "name",
        )
    if not existing_name and policy_no:
        existing_name = frappe.db.get_value(
            "AT Policy", {"policy_no": policy_no}, "name"
        )

    if existing_name:
        doc = frappe.get_doc("AT Policy", existing_name)
        _apply_values(doc, values)
        doc.save()
        return doc

    return frappe.get_doc({"doctype": "AT Policy", **values}).insert()


def _upsert_sales_entity(
    full_name: str, entity_type: str, parent_entity: str | None = None
):
    existing_name = frappe.db.get_value(
        "AT Sales Entity", {"full_name": full_name}, "name"
    )
    values = {
        "entity_type": entity_type,
        "full_name": full_name,
        "parent_entity": parent_entity,
    }
    if existing_name:
        doc = frappe.get_doc("AT Sales Entity", existing_name)
        _apply_values(doc, values)
        doc.save()
        return doc

    return frappe.get_doc({"doctype": "AT Sales Entity", **values}).insert()


def _upsert_lead(values: dict[str, Any]):
    lookup_key = values["lookup_key"]
    existing_name = frappe.db.get_value("AT Lead", {"email": lookup_key}, "name")
    payload = {k: v for k, v in values.items() if k != "lookup_key"}

    if existing_name:
        doc = frappe.get_doc("AT Lead", existing_name)
        _apply_values(doc, payload)
        doc.save()
        return doc

    return frappe.get_doc({"doctype": "AT Lead", **payload}).insert()


def _upsert_renewal_task(values: dict[str, Any]):
    if not values.get("unique_key") and values.get("policy") and values.get("due_date"):
        renewal_date = (
            getdate(values.get("renewal_date")) if values.get("renewal_date") else None
        )
        due_date = getdate(values.get("due_date")) if values.get("due_date") else None
        customer = values.get("customer")
        stage = (
            resolve_stage_for_days(date_diff(renewal_date, due_date))
            if renewal_date and due_date
            else None
        )
        if stage:
            values["unique_key"] = build_renewal_stage_key(
                values["policy"], customer, stage.code, due_date
            )
        else:
            values["unique_key"] = build_renewal_key(
                values["policy"], values["due_date"]
            )

    existing_name = frappe.db.get_value(
        "AT Renewal Task", {"unique_key": values["unique_key"]}, "name"
    )
    if existing_name:
        doc = frappe.get_doc("AT Renewal Task", existing_name)
        _apply_values(doc, values)
        doc.save()
        return doc

    return frappe.get_doc({"doctype": "AT Renewal Task", **values}).insert()


def _apply_values(doc, values: dict[str, Any]):
    for key, value in values.items():
        if doc.get(key) == value:
            continue
        if isinstance(value, float):
            if flt(doc.get(key)) == flt(value):
                continue
        doc.set(key, value)


def _cleanup_demo_data():
    for doctype, fieldname, keyword in [
        ("AT Renewal Task", "unique_key", "DEMO-"),
        ("AT Payment", "payment_no", "DEMO-"),
        ("AT Claim", "claim_no", "DEMO-"),
        ("AT Policy", "policy_no", "DEMO-"),
        ("AT Lead", "email", "demo."),
        ("AT Customer", "full_name", "DEMO "),
        ("AT Branch", "branch_name", "DEMO "),
        ("AT Insurance Company", "company_name", "DEMO "),
    ]:
        # unbounded: demo data cleanup by keyword pattern, filtered by name prefix - expected max ~1k rows
        names = frappe.get_all(
            doctype,
            filters={fieldname: ["like", f"{keyword}%"]},
            pluck="name",
            limit_page_length=0,
        )
        for name in names:
            frappe.delete_doc(doctype, name, force=True)

    # unbounded: demo sales entity cleanup, filtered by name prefix - expected max ~1k rows
    sales_entities = frappe.get_all(
        "AT Sales Entity",
        filters={"full_name": ["like", "DEMO %"]},
        pluck="name",
        limit_page_length=0,
    )
    for name in sales_entities:
        frappe.delete_doc("AT Sales Entity", name, force=True)


def _pick_demo_agent() -> str:
    user = frappe.session.user
    if user not in {"Guest", "Administrator"}:
        return user

    non_system_users = frappe.get_all(
        "User",
        filters={
            "enabled": 1,
            "user_type": "System User",
            "name": ["not in", ["Administrator", "Guest"]],
        },
        pluck="name",
        limit_page_length=1,
    )
    return non_system_users[0] if non_system_users else "Administrator"


def _make_valid_tckn(seed: str | int) -> str:
    raw = "".join(char for char in str(seed) if char.isdigit())[:9].ljust(9, "0")
    if raw.startswith("0"):
        raw = f"1{raw[1:]}"
    digits = [int(char) for char in raw]
    tenth = ((sum(digits[0:9:2]) * 7) - sum(digits[1:8:2])) % 10
    eleventh = (sum(digits) + tenth) % 10
    return f"{raw}{tenth}{eleventh}"
