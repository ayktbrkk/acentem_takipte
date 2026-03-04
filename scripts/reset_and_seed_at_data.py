import json
from collections import OrderedDict

import frappe
from frappe.utils import add_days, now_datetime, nowdate


SEED_COUNT = int(globals().get("SEED_COUNT", 5) or 5)
PRESERVE_TEMPLATES = bool(int(globals().get("PRESERVE_TEMPLATES", 1)))
ONLY_IF_NAME_LIKE = globals().get("ONLY_IF_NAME_LIKE", "Demo%")
FORCE_PURGE = bool(int(globals().get("FORCE_PURGE", 0)))

# Scope: only acentem_takipte module doctypes (templates are preserved as setup config)
PURGE_ORDER = [
    "AT Access Log",
    "AT Notification Outbox",
    "AT Notification Draft",
    "AT Reconciliation Item",
    "AT Accounting Entry",
    "AT Policy Endorsement",
    "AT Policy Snapshot",
    "AT Renewal Task",
    "AT Payment",
    "AT Claim",
    "AT Offer",
    "AT Lead",
    "AT Policy",
    "AT Customer",
    "AT Branch",
    "AT Sales Entity",
    "AT Insurance Company",
]

PURGE_SAFETY_RULES = [
    ("AT Insurance Company", "company_name"),
    ("AT Branch", "branch_name"),
    ("AT Sales Entity", "full_name"),
    ("AT Customer", "full_name"),
]


TR_COMPANY_SEEDS = [
    {"company_name": "Doga Sigorta", "company_code": "DOGA"},
    {"company_name": "Quick Sigorta", "company_code": "QUICK"},
    {"company_name": "Sompo Sigorta", "company_code": "SOMPO"},
    {"company_name": "Hepiyi Sigorta", "company_code": "HEPIYI"},
    {"company_name": "Anadolu Sigorta", "company_code": "ANADOLU"},
]

TR_BRANCH_SEEDS = [
    {"branch_name": "Doga Sigorta - Trafik", "branch_code": "DOGA-TRF", "company_idx": 0},
    {"branch_name": "Quick Sigorta - Kasko", "branch_code": "QCK-KSK", "company_idx": 1},
    {"branch_name": "Sompo Sigorta - Konut", "branch_code": "SMP-KNT", "company_idx": 2},
    {"branch_name": "Hepiyi Sigorta - Trafik", "branch_code": "HPY-TRF", "company_idx": 3},
    {"branch_name": "Anadolu Sigorta - DASK", "branch_code": "AND-DSK", "company_idx": 4},
]

TR_CUSTOMER_SEEDS = [
    {
        "tax_id": "90000000101",
        "full_name": "Yunus Emre Erdogan",
        "birth_date": "1990-06-24",
        "gender": "Male",
        "marital_status": "Married",
        "occupation": "Sirket Calisani",
        "phone": "05327424562",
        "email": "yunus.erdogan@ornekmail.test",
        "address": "Esenyurt Mah. Divit Sok. No:37/9 Umraniye Istanbul",
        "consent_status": "Granted",
    },
    {
        "tax_id": "90000000102",
        "full_name": "Ayse Nur Demir",
        "birth_date": "1988-11-12",
        "gender": "Female",
        "marital_status": "Married",
        "occupation": "Muhasebe Uzmani",
        "phone": "05332451187",
        "email": "aysenur.demir@ornekmail.test",
        "address": "Mimar Sinan Mah. Bagdat Cad. No:112 Kadikoy Istanbul",
        "consent_status": "Granted",
    },
    {
        "tax_id": "90000000103",
        "full_name": "Mehmet Ali Kaya",
        "birth_date": "1985-03-09",
        "gender": "Male",
        "marital_status": "Married",
        "occupation": "Esnaf",
        "phone": "05354381290",
        "email": "mehmet.kaya@ornekmail.test",
        "address": "Ataturk Mah. 2145 Sok. No:8 Bornova Izmir",
        "consent_status": "Unknown",
    },
    {
        "tax_id": "90000000104",
        "full_name": "Elif Su Acar",
        "birth_date": "1994-08-17",
        "gender": "Female",
        "marital_status": "Single",
        "occupation": "Mimar",
        "phone": "05308340122",
        "email": "elif.acar@ornekmail.test",
        "address": "Cumhuriyet Mah. 1432 Cad. No:21 Cankaya Ankara",
        "consent_status": "Granted",
    },
    {
        "tax_id": "90000000105",
        "full_name": "Murat Can Yildiz",
        "birth_date": "1979-01-30",
        "gender": "Male",
        "marital_status": "Married",
        "occupation": "Lojistik Firma Sahibi",
        "phone": "05325244110",
        "email": "murat.yildiz@ornekmail.test",
        "address": "Karatas Mah. Inonu Bulv. No:54 Seyhan Adana",
        "consent_status": "Revoked",
    },
]


def count_map(doctypes):
    return OrderedDict((dt, frappe.db.count(dt)) for dt in doctypes)


def pick_agent_user():
    candidates = frappe.get_all(
        "Has Role",
        filters={"role": "Agent"},
        fields=["parent"],
        order_by="creation asc",
    )
    for row in candidates:
        user = row.parent
        if not user or user == "Administrator":
            continue
        if frappe.db.get_value("User", user, "enabled"):
            return user

    managers = frappe.get_all(
        "Has Role",
        filters={"role": ["in", ["Manager", "Accountant"]]},
        fields=["parent"],
        order_by="creation asc",
    )
    for row in managers:
        user = row.parent
        if not user or user == "Administrator":
            continue
        if frappe.db.get_value("User", user, "enabled"):
            return user

    return "Administrator"


def assert_safe_to_purge(*, only_if_name_like=None, force=False):
    if force:
        return

    pattern = (only_if_name_like or "").strip()
    if not pattern:
        return

    violations = []
    for doctype, fieldname in PURGE_SAFETY_RULES:
        if not frappe.db.exists("DocType", doctype):
            continue

        bad_rows = frappe.get_all(
            doctype,
            filters={fieldname: ["not like", pattern]},
            fields=["name", fieldname],
            limit=5,
            order_by="modified desc",
        )
        if not bad_rows:
            continue

        samples = ", ".join(
            f"{row.name} ({(row.get(fieldname) or '').strip()})" for row in bad_rows
        )
        violations.append(f"{doctype}.{fieldname}: {samples}")

    if violations:
        raise Exception(
            "Safety check blocked purge. Some records do not match only_if_name_like="
            f"'{pattern}'. Use force=1 to override.\n" + "\n".join(violations)
        )


def purge_module_data(*, only_if_name_like=None, force=False):
    assert_safe_to_purge(only_if_name_like=only_if_name_like, force=force)

    # Cleanup customer folder/file artifacts stored in File records for old test data.
    try:
        frappe.db.delete(
            "File",
            {
                "attached_to_doctype": [
                    "in",
                    [
                        "AT Customer",
                        "AT Policy",
                        "AT Offer",
                        "AT Claim",
                        "AT Payment",
                        "AT Renewal Task",
                    ],
                ]
            },
        )
        frappe.db.delete("File", {"folder": ["like", "Home/customers%"]})
        frappe.db.delete("File", {"file_url": ["like", "/private/files/customers/%"]})
    except Exception:
        # File cleanup is best-effort; main goal is record reset.
        frappe.log_error(frappe.get_traceback(), "AT seed file cleanup failed")

    for doctype in PURGE_ORDER:
        frappe.db.delete(doctype, {})

    if not PRESERVE_TEMPLATES:
        frappe.db.delete("AT Notification Template", {})

    # Reset AT naming series to keep generated names clean in local dev.
    frappe.db.sql("delete from `tabSeries` where name like 'AT-%'")


def ensure_templates():
    if frappe.db.count("AT Notification Template"):
        return
    from acentem_takipte.acentem_takipte.setup import ensure_default_notification_templates

    ensure_default_notification_templates()


def seed():
    actor_user = pick_agent_user()
    today = nowdate()
    now_dt = now_datetime()
    seed_n = min(SEED_COUNT, len(TR_CUSTOMER_SEEDS), len(TR_COMPANY_SEEDS), len(TR_BRANCH_SEEDS))
    if seed_n < 5:
        raise Exception("Turkish realistic seed profile requires at least 5 rows")

    created = OrderedDict()

    companies = []
    for i in range(seed_n):
        company_seed = TR_COMPANY_SEEDS[i]
        companies.append(
            frappe.get_doc(
                {
                    "doctype": "AT Insurance Company",
                    "company_name": company_seed["company_name"],
                    "company_code": company_seed["company_code"],
                    "is_active": 1,
                }
            ).insert(ignore_permissions=True)
        )
    created["AT Insurance Company"] = [d.name for d in companies]

    branches = []
    for i in range(seed_n):
        branch_seed = TR_BRANCH_SEEDS[i]
        branches.append(
            frappe.get_doc(
                {
                    "doctype": "AT Branch",
                    "branch_name": branch_seed["branch_name"],
                    "branch_code": branch_seed["branch_code"],
                    "insurance_company": companies[branch_seed["company_idx"]].name,
                    "is_active": 1,
                }
            ).insert(ignore_permissions=True)
        )
    created["AT Branch"] = [d.name for d in branches]

    sales_entities = []
    root_entity = frappe.get_doc(
        {
            "doctype": "AT Sales Entity",
            "entity_type": "Agency",
            "full_name": "Acentem Takipte Merkez Acente",
        }
    ).insert(ignore_permissions=True)
    sales_entities.append(root_entity)
    sales_entity_names = [
        ("Representative", "Kadikoy Temsilcilik"),
        ("Representative", "Ankara Cankaya Temsilcilik"),
        ("Sub-Account", "Izmir Kurumsal Hesap"),
        ("Representative", "Bursa Nilufer Temsilcilik"),
        ("Sub-Account", "Adana Seyhan Kurumsal Hesap"),
        ("Representative", "Antalya Merkez Temsilcilik"),
        ("Representative", "Konya Merkez Temsilcilik"),
        ("Sub-Account", "Trabzon Karadeniz Kurumsal"),
        ("Representative", "Ankara Yenimahalle Temsilcilik"),
    ]
    for i in range(1, seed_n):
        ent_type, ent_name = sales_entity_names[(i - 1) % len(sales_entity_names)]
        sales_entities.append(
            frappe.get_doc(
                {
                    "doctype": "AT Sales Entity",
                    "entity_type": ent_type,
                    "full_name": ent_name,
                    "parent_entity": root_entity.name,
                }
            ).insert(ignore_permissions=True)
        )
    created["AT Sales Entity"] = [d.name for d in sales_entities]

    customers = []
    for i in range(seed_n):
        customer_seed = TR_CUSTOMER_SEEDS[i]
        customers.append(
            frappe.get_doc(
                {
                    "doctype": "AT Customer",
                    "tax_id": customer_seed["tax_id"],
                    "full_name": customer_seed["full_name"],
                    "birth_date": customer_seed["birth_date"],
                    "gender": customer_seed["gender"],
                    "marital_status": customer_seed["marital_status"],
                    "occupation": customer_seed["occupation"],
                    "phone": customer_seed["phone"],
                    "email": customer_seed["email"],
                    "address": customer_seed["address"],
                    "assigned_agent": actor_user if actor_user != "Administrator" else None,
                    "consent_status": customer_seed["consent_status"],
                }
            ).insert(ignore_permissions=True)
        )
    created["AT Customer"] = [d.name for d in customers]

    leads = []
    lead_statuses = ["Open", "Open", "Replied", "Draft", "Closed"]
    lead_notes = [
        "Trafik yenileme teklifi talep edildi.",
        "Kasko fiyat karsilastirmasi icin geri donus bekleniyor.",
        "Konut + DASK paket teklifi talebi.",
        "Telefon ile tekrar aranacak.",
        "Evrak eksikligi nedeniyle kapatildi.",
    ]
    for i in range(seed_n):
        full_name_parts = (customers[i].full_name or "").split()
        first_name = full_name_parts[0] if full_name_parts else f"Lead{i + 1}"
        last_name = " ".join(full_name_parts[1:]) if len(full_name_parts) > 1 else ""
        leads.append(
            frappe.get_doc(
                {
                    "doctype": "AT Lead",
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": customers[i].email,
                    "status": lead_statuses[i],
                    "customer": customers[i].name,
                    "sales_entity": sales_entities[i].name,
                    "insurance_company": branches[i].insurance_company,
                    "branch": branches[i].name,
                    "estimated_gross_premium": [18500, 24350, 6400, 12900, 2200][i],
                    "notes": lead_notes[i],
                }
            ).insert(ignore_permissions=True)
        )
    created["AT Lead"] = [d.name for d in leads]

    offers = []
    offer_statuses = ["Sent", "Accepted", "Accepted", "Rejected", "Sent"]
    net_premiums = [15800, 21400, 5200, 11100, 1800]
    tax_amounts = [790, 1070, 520, 1110, 180]
    commission_amounts = [1264, 1712, 624, 999, 216]
    offer_valid_days = [6, 9, 12, 5, 14]
    for i in range(seed_n):
        tax_amount = tax_amounts[i]
        commission_amount = commission_amounts[i]
        net_premium = net_premiums[i]
        gross_premium = net_premium + tax_amount + commission_amount
        offers.append(
            frappe.get_doc(
                {
                    "doctype": "AT Offer",
                    "source_lead": leads[i].name,
                    "customer": customers[i].name,
                    "sales_entity": sales_entities[i].name,
                    "insurance_company": branches[i].insurance_company,
                    "branch": branches[i].name,
                    "offer_date": add_days(today, -i),
                    "valid_until": add_days(today, offer_valid_days[i]),
                    "currency": "TRY",
                    "net_premium": net_premium,
                    "tax_amount": tax_amount,
                    "commission_amount": commission_amount,
                    "gross_premium": gross_premium,
                    "status": offer_statuses[i],
                    "notes": f"{TR_BRANCH_SEEDS[i]['branch_name']} teklifi - {customers[i].full_name}",
                }
            ).insert(ignore_permissions=True)
        )
    created["AT Offer"] = [d.name for d in offers]

    policies = []
    policy_statuses = ["Active", "KYT", "Active", "IPT", "Active"]
    policy_start_offsets = [-330, -210, -60, -400, -15]
    policy_line_prefix = ["TRF", "KSK", "KNT", "TRF", "DSK"]
    policy_net = [17100, 23800, 6100, 12400, 2100]
    policy_tax = [855, 1190, 610, 620, 210]
    policy_comm = [1368, 1904, 732, 868, 252]
    for i in range(seed_n):
        tax_amount = policy_tax[i]
        commission_amount = policy_comm[i]
        net_premium = policy_net[i]
        gross_premium = net_premium + tax_amount + commission_amount
        start_date = add_days(today, policy_start_offsets[i])
        end_date = add_days(start_date, 365)
        policy = frappe.get_doc(
            {
                "doctype": "AT Policy",
                "customer": customers[i].name,
                "sales_entity": sales_entities[i].name,
                "insurance_company": branches[i].insurance_company,
                "branch": branches[i].name,
                "policy_no": f"{policy_line_prefix[i]}-{now_dt.year}-{i + 1:06d}",
                "status": policy_statuses[i],
                "issue_date": add_days(start_date, -2),
                "start_date": start_date,
                "end_date": end_date,
                "currency": "TRY",
                "net_premium": net_premium,
                "tax_amount": tax_amount,
                "commission_amount": commission_amount,
                "commission": commission_amount,
                "gross_premium": gross_premium,
            }
        ).insert(ignore_permissions=True)
        policies.append(policy)
    created["AT Policy"] = [d.name for d in policies]

    # Link first two offers as converted to policies for richer sample state.
    for i in range(min(2, seed_n)):
        offers[i].db_set("converted_policy", policies[i].name, update_modified=False)
        offers[i].db_set("status", "Converted", update_modified=False)
        leads[i].db_set("converted_offer", offers[i].name, update_modified=False)
        leads[i].db_set("converted_policy", policies[i].name, update_modified=False)
        leads[i].db_set("status", "Closed", update_modified=False)

    endorsements = []
    for i in range(seed_n):
        payload = {
            "end_date": str(add_days(policies[i].end_date, 15)),
            "gross_premium": float(policies[i].gross_premium) + (500 * (i + 1)),
            "net_premium": float(policies[i].net_premium) + (300 * (i + 1)),
            "tax_amount": float(policies[i].tax_amount),
            "commission_amount": float(policies[i].commission_amount) + (200 * (i + 1)),
        }
        endorsements.append(
            frappe.get_doc(
                {
                    "doctype": "AT Policy Endorsement",
                    "policy": policies[i].name,
                    "endorsement_type": "Premium Update",
                    "endorsement_date": add_days(today, -i),
                    "status": "Draft",
                    "change_payload": json.dumps(payload),
                    "notes": f"{policies[i].policy_no or policies[i].name} icin zeyil taslagi",
                }
            ).insert(ignore_permissions=True)
        )
    created["AT Policy Endorsement"] = [d.name for d in endorsements]

    claims = []
    claim_statuses = ["Open", "Under Review", "Approved", "Paid", "Closed"]
    claim_amounts = [7800, 12400, 4200, 9300, 1600]
    approved_amounts = [6800, 10800, 3500, 9300, 0]
    claim_types = ["Damage", "Damage", "Damage", "Damage", "Other"]
    for i in range(seed_n):
        estimated = claim_amounts[i]
        approved = approved_amounts[i]
        claims.append(
            frappe.get_doc(
                {
                    "doctype": "AT Claim",
                    "policy": policies[i].name,
                    "customer": customers[i].name,
                    "claim_type": claim_types[i],
                    "claim_status": claim_statuses[i],
                    "incident_date": add_days(today, -(10 + i)),
                    "reported_date": add_days(today, -(8 + i)),
                    "currency": "TRY",
                    "estimated_amount": estimated,
                    "approved_amount": approved,
                    "notes": f"{customers[i].full_name} hasar kaydi",
                }
            ).insert(ignore_permissions=True)
        )
    created["AT Claim"] = [d.name for d in claims]

    payments = []
    payment_specs = [
        {
            "customer": customers[0].name,
            "policy": policies[0].name,
            "payment_direction": "Inbound",
            "payment_purpose": "Premium Collection",
            "status": "Paid",
            "amount": 4500,
            "due_date": add_days(today, -7),
        },
        {
            "customer": customers[1].name,
            "policy": policies[1].name,
            "payment_direction": "Inbound",
            "payment_purpose": "Premium Collection",
            "status": "Draft",
            "amount": 5200,
            "due_date": add_days(today, 3),
        },
        {
            "customer": customers[2].name,
            "policy": policies[2].name,
            "claim": claims[2].name,
            "payment_direction": "Outbound",
            "payment_purpose": "Claim Payout",
            "status": "Paid",
            "amount": 3000,
            "due_date": add_days(today, -1),
        },
        {
            "customer": customers[3].name,
            "policy": policies[3].name,
            "claim": claims[3].name,
            "payment_direction": "Outbound",
            "payment_purpose": "Claim Payout",
            "status": "Paid",
            "amount": 3500,
            "due_date": add_days(today, -2),
        },
        {
            "customer": customers[4].name,
            "policy": policies[4].name,
            "payment_direction": "Outbound",
            "payment_purpose": "Commission Payout",
            "status": "Cancelled",
            "amount": 1800,
            "due_date": add_days(today, 5),
        },
    ]
    for i, spec in enumerate(payment_specs):
        payload = {
            "doctype": "AT Payment",
            "customer": spec["customer"],
            "policy": spec.get("policy"),
            "claim": spec.get("claim"),
            "sales_entity": sales_entities[i].name,
            "payment_direction": spec["payment_direction"],
            "payment_purpose": spec["payment_purpose"],
            "status": spec["status"],
            "payment_date": add_days(today, -i),
            "due_date": spec["due_date"],
            "currency": "TRY",
            "amount": spec["amount"],
            "reference_no": f"TRPAY-{now_dt.year}-{i + 1:03d}",
            "notes": f"{spec['payment_purpose']} - {customers[i].full_name}",
        }
        payments.append(frappe.get_doc(payload).insert(ignore_permissions=True))
    created["AT Payment"] = [d.name for d in payments]

    renewal_tasks = []
    renewal_statuses = ["Open", "In Progress", "Done", "Cancelled", "Open"]
    for i in range(seed_n):
        renewal_date = add_days(policies[i].end_date, -15)
        due_date = add_days(renewal_date, -7)
        renewal_tasks.append(
            frappe.get_doc(
                {
                    "doctype": "AT Renewal Task",
                    "policy": policies[i].name,
                    "customer": customers[i].name,
                    "policy_end_date": policies[i].end_date,
                    "renewal_date": renewal_date,
                    "due_date": due_date,
                    "status": renewal_statuses[i],
                    "assigned_to": actor_user if actor_user != "Administrator" else None,
                    "auto_created": 1 if i % 2 == 0 else 0,
                    "notes": f"{customers[i].full_name} yenileme takibi",
                }
            ).insert(ignore_permissions=True)
        )
    created["AT Renewal Task"] = [d.name for d in renewal_tasks]

    # Re-normalize auto-generated communication/accounting side effects to exact 5 sample rows.
    frappe.db.delete("AT Notification Outbox", {})
    frappe.db.delete("AT Notification Draft", {})
    frappe.db.delete("AT Reconciliation Item", {})
    frappe.db.delete("AT Accounting Entry", {})

    ensure_templates()
    templates = frappe.get_all(
        "AT Notification Template",
        fields=["name", "template_key", "event_key", "channel", "language"],
        order_by="creation asc",
        limit=50,
    )
    if not templates:
        raise Exception("AT Notification Template not found after ensure_templates()")

    notification_drafts = []
    for i in range(seed_n):
        tpl = templates[i % len(templates)]
        customer = customers[i]
        channel = "SMS" if tpl.channel in {"SMS", "Both"} else "Email"
        language = tpl.language or ("tr" if i % 2 == 0 else "en")
        recipient = customer.phone if channel == "SMS" else (customer.email or f"demo{i + 1}@example.com")
        draft = frappe.get_doc(
            {
                "doctype": "AT Notification Draft",
                "template": tpl.name,
                "event_key": tpl.event_key or "renewal_notice",
                "channel": channel,
                "language": language,
                "customer": customer.name,
                "recipient": recipient,
                "reference_doctype": "AT Policy",
                "reference_name": policies[i].name,
                "subject": f"{customers[i].full_name} bildirim taslagi",
                "body": f"{customers[i].full_name} icin test bildirim icerigi {i + 1}",
                "status": ["Draft", "Queued", "Sent", "Failed", "Draft"][i],
            }
        ).insert(ignore_permissions=True)
        notification_drafts.append(draft)
    created["AT Notification Draft"] = [d.name for d in notification_drafts]

    notification_outbox = []
    for i in range(seed_n):
        draft = notification_drafts[i]
        customer = customers[i]
        channel = draft.channel
        recipient = customer.phone if channel == "SMS" else (customer.email or f"demo{i + 1}@example.com")
        outbox = frappe.get_doc(
            {
                "doctype": "AT Notification Outbox",
                "draft": draft.name,
                "event_key": draft.event_key,
                "channel": channel,
                "priority": i,
                "recipient": recipient,
                "customer": customer.name,
                "reference_doctype": draft.reference_doctype or "AT Policy",
                "reference_name": draft.reference_name or policies[i].name,
                "provider": "NetGSM" if channel == "SMS" else "Mailgun",
                "status": ["Queued", "Processing", "Sent", "Failed", "Dead"][i],
                "attempt_count": i if i < 3 else 3,
                "max_attempts": 3,
                "error_message": "" if i < 3 else "Saglayici zaman asimi",
                "response_log": f"Provider response {i + 1}",
            }
        ).insert(ignore_permissions=True)
        notification_outbox.append(outbox)
        draft.db_set("outbox_record", outbox.name, update_modified=False)
    created["AT Notification Outbox"] = [d.name for d in notification_outbox]

    accounting_entries = []
    accounting_sources = [
        ("AT Policy", policies[0].name, "Policy", policies[0], 14000, 14000),
        ("AT Policy", policies[1].name, "Policy", policies[1], 16000, 15950),
        ("AT Payment", payments[0].name, "Payment", policies[0], 4500, 4500),
        ("AT Claim", claims[2].name, "Claim", policies[2], 3000, 2950),
        ("AT Payment", payments[3].name, "Payment", policies[3], 3500, 3500),
    ]
    for i, (src_dt, src_name, entry_type, policy_ref, local_amt, ext_amt) in enumerate(accounting_sources):
        accounting_entries.append(
            frappe.get_doc(
                {
                    "doctype": "AT Accounting Entry",
                    "source_doctype": src_dt,
                    "source_name": src_name,
                    "entry_type": entry_type,
                    "status": ["Synced", "Failed", "Draft", "Synced", "Failed"][i],
                    "policy": policy_ref.name,
                    "customer": policy_ref.customer,
                    "insurance_company": policy_ref.insurance_company,
                    "currency": "TRY",
                    "local_amount": local_amt,
                    "local_amount_try": local_amt,
                    "external_amount": ext_amt,
                    "external_amount_try": ext_amt,
                    "external_ref": f"EXT-{i + 1:04d}",
                    "sync_attempt_count": i,
                    "error_message": "" if i % 2 == 0 else "Tutar uyumsuzlugu",
                    "integration_hash": f"hash-{i + 1}",
                    "payload_json": json.dumps({"demo": True, "index": i + 1}),
                }
            ).insert(ignore_permissions=True)
        )
    created["AT Accounting Entry"] = [d.name for d in accounting_entries]

    reconciliation_items = []
    mismatch_types = ["Amount", "Status", "Currency", "Missing External", "Other"]
    rec_statuses = ["Open", "Resolved", "Ignored", "Open", "Resolved"]
    for i in range(seed_n):
        ae = accounting_entries[i]
        local_amt = float(ae.local_amount_try or 0)
        ext_amt = float(ae.external_amount_try or 0)
        if local_amt == ext_amt:
            ext_amt = local_amt + (100 if i % 2 == 0 else -50)
        reconciliation_items.append(
            frappe.get_doc(
                {
                    "doctype": "AT Reconciliation Item",
                    "accounting_entry": ae.name,
                    "status": rec_statuses[i],
                    "mismatch_type": mismatch_types[i],
                    "local_amount_try": local_amt,
                    "external_amount_try": ext_amt,
                    "details_json": json.dumps({"demo": True, "note": f"Reconciliation item {i + 1}"}),
                    "notes": f"Mutabakat kalemi {i + 1}",
                }
            ).insert(ignore_permissions=True)
        )
    created["AT Reconciliation Item"] = [d.name for d in reconciliation_items]

    access_logs = []
    refs = [
        ("AT Customer", customers[0].name),
        ("AT Policy", policies[0].name),
        ("AT Offer", offers[1].name),
        ("AT Claim", claims[2].name),
        ("AT Payment", payments[0].name),
    ]
    for i, (ref_dt, ref_name) in enumerate(refs):
        access_logs.append(
            frappe.get_doc(
                {
                    "doctype": "AT Access Log",
                    "reference_doctype": ref_dt,
                    "reference_name": ref_name,
                    "viewed_by": actor_user if frappe.db.exists("User", actor_user) else "Administrator",
                    "action": ["View", "Edit", "View", "Export", "View"][i],
                    "ip_address": f"192.168.10.{10 + i}",
                    "viewed_on": now_dt,
                }
            ).insert(ignore_permissions=True)
        )
    created["AT Access Log"] = [d.name for d in access_logs]

    frappe.db.commit()
    return created


def print_summary(before_counts, after_counts, created):
    print("\n=== BEFORE COUNTS ===")
    for dt, count in before_counts.items():
        print(f"{dt}: {count}")

    print("\n=== CREATED (seed) ===")
    for dt, names in created.items():
        print(f"{dt}: {len(names)}")

    print("\n=== AFTER COUNTS ===")
    for dt, count in after_counts.items():
        print(f"{dt}: {count}")


TRACK_COUNTS = [
    "AT Insurance Company",
    "AT Branch",
    "AT Sales Entity",
    "AT Customer",
    "AT Lead",
    "AT Offer",
    "AT Policy",
    "AT Policy Snapshot",
    "AT Policy Endorsement",
    "AT Claim",
    "AT Payment",
    "AT Renewal Task",
    "AT Notification Draft",
    "AT Notification Outbox",
    "AT Accounting Entry",
    "AT Reconciliation Item",
    "AT Access Log",
]


def run(seed_count=None, preserve_templates=None, print_output=True, only_if_name_like=None, force=None):
    global SEED_COUNT, PRESERVE_TEMPLATES, ONLY_IF_NAME_LIKE, FORCE_PURGE

    if seed_count is not None:
        SEED_COUNT = int(seed_count)
    if preserve_templates is not None:
        PRESERVE_TEMPLATES = bool(preserve_templates)
    if only_if_name_like is not None:
        ONLY_IF_NAME_LIKE = only_if_name_like
    if force is not None:
        FORCE_PURGE = bool(force)

    try:
        frappe.set_user("Administrator")
        before = count_map(TRACK_COUNTS)
        purge_module_data(only_if_name_like=ONLY_IF_NAME_LIKE, force=FORCE_PURGE)
        frappe.db.commit()
        created_rows = seed()
        after = count_map(TRACK_COUNTS)
        if print_output:
            print_summary(before, after, created_rows)
        return {
            "seed_count": SEED_COUNT,
            "preserve_templates": int(PRESERVE_TEMPLATES),
            "only_if_name_like": ONLY_IF_NAME_LIKE,
            "force": int(FORCE_PURGE),
            "before": dict(before),
            "after": dict(after),
            "created": {dt: len(names) for dt, names in created_rows.items()},
        }
    except Exception:
        frappe.db.rollback()
        if print_output:
            print("\n=== ERROR ===")
            print(frappe.get_traceback())
        raise


if __name__ == "__main__":
    run()
