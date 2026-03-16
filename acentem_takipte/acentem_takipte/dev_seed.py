from __future__ import annotations

import runpy
from pathlib import Path

import frappe


def reset_and_seed_demo_data(
    count: int = 5,
    preserve_templates: int = 1,
    print_output: int = 1,
    only_if_name_like: str = "Demo%",
    force: int = 0,
):
    """Reset AT module demo/test data and seed fresh sample data.

    Example:
        bench --site localhost execute acentem_takipte.acentem_takipte.dev_seed.reset_and_seed_demo_data \
          --args "[5, 1, 1, 'Demo%', 0]"
    """
    # Security guard: prevent accidental execution in production
    if not frappe.conf.developer_mode:
        frappe.throw(
            "Seed data operations are only allowed in developer mode.",
            title="Security: Developer Mode Required"
        )

    count = int(count or 5)
    preserve_templates = int(preserve_templates)
    print_output = int(print_output)
    only_if_name_like = None if only_if_name_like in ("", "None", None) else str(only_if_name_like)
    force = int(force or 0)

    if count < 1:
        raise ValueError("count must be >= 1")

    script_path = Path(__file__).resolve().parents[1] / "scripts" / "reset_and_seed_at_data.py"
    namespace = runpy.run_path(
        str(script_path),
        init_globals={
            "SEED_COUNT": count,
            "PRESERVE_TEMPLATES": preserve_templates,
            "ONLY_IF_NAME_LIKE": only_if_name_like,
            "FORCE_PURGE": force,
        },
        run_name="at_seed_module",
    )
    run = namespace["run"]
    return run(
        seed_count=count,
        preserve_templates=bool(preserve_templates),
        print_output=bool(print_output),
        only_if_name_like=only_if_name_like,
        force=bool(force),
    )


def reset_and_seed_5(
    preserve_templates: int = 1,
    print_output: int = 1,
    only_if_name_like: str = "Demo%",
    force: int = 0,
):
    return reset_and_seed_demo_data(
        5,
        preserve_templates,
        print_output,
        only_if_name_like,
        force,
    )


def reset_and_seed_10(
    preserve_templates: int = 1,
    print_output: int = 1,
    only_if_name_like: str = "Demo%",
    force: int = 0,
):
    return reset_and_seed_demo_data(
        10,
        preserve_templates,
        print_output,
        only_if_name_like,
        force,
    )


def inspect_at_seed_snapshot():
    # Security guard: prevent accidental execution in production
    if not frappe.conf.developer_mode:
        frappe.throw(
            "Seed inspection is only allowed in developer mode.",
            title="Security: Developer Mode Required"
        )

    doctypes = [
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
    return {
        "counts": {dt: frappe.db.count(dt) for dt in doctypes},
        "companies": frappe.get_all(
            "AT Insurance Company",
            fields=["company_name", "company_code"],
            order_by="company_name asc",
        ),
        "branches": frappe.get_all(
            "AT Branch",
            fields=["branch_name", "insurance_company"],
            order_by="creation asc",
        ),
        "customers": frappe.get_all(
            "AT Customer",
            fields=["name", "full_name", "gender", "marital_status", "occupation", "email"],
            order_by="creation asc",
            limit_page_length=10,
        ),
        "offers": frappe.get_all(
            "AT Offer",
            fields=[
                "name",
                "customer",
                "insurance_company",
                "branch",
                "status",
                "gross_premium",
                "converted_policy",
            ],
            order_by="creation asc",
            limit_page_length=10,
        ),
        "policies": frappe.get_all(
            "AT Policy",
            fields=[
                "name",
                "policy_no",
                "customer",
                "insurance_company",
                "branch",
                "status",
                "end_date",
                "gross_premium",
            ],
            order_by="creation asc",
            limit_page_length=10,
        ),
        "renewals": frappe.get_all(
            "AT Renewal Task",
            fields=["name", "policy", "customer", "status", "renewal_date", "due_date"],
            order_by="creation asc",
            limit_page_length=10,
        ),
    }
