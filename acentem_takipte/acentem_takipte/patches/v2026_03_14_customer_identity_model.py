from __future__ import annotations

import frappe
from frappe.model.naming import make_autoname
from frappe.model.rename_doc import rename_doc

from acentem_takipte.acentem_takipte.doctype.at_customer.at_customer import (
    infer_customer_type_from_tax_id,
    normalize_customer_type,
    normalize_identity_number,
)


def execute() -> None:
    _backfill_customer_identity_fields()
    _rename_legacy_customer_names()


def _backfill_customer_identity_fields() -> None:
    # unbounded: all customers for identity field backfill, bounded by total customer count - expected max ~100k rows
    rows = frappe.get_all(
        "AT Customer",
        fields=[
            "name",
            "tax_id",
            "customer_type",
            "birth_date",
            "gender",
            "marital_status",
            "occupation",
        ],
        limit_page_length=0,
    )
    for row in rows:
        identity_number = normalize_identity_number(row.get("tax_id"))
        existing_type = str(row.get("customer_type") or "").strip()
        inferred_type = infer_customer_type_from_tax_id(identity_number)
        customer_type = (
            normalize_customer_type(existing_type, identity_number)
            if existing_type not in {"", "Individual", "Corporate"}
            else inferred_type
        )
        updates: dict[str, object] = {}

        if identity_number != str(row.get("tax_id") or ""):
            updates["tax_id"] = identity_number
        if customer_type != str(row.get("customer_type") or ""):
            updates["customer_type"] = customer_type
        if customer_type == "Corporate":
            if row.get("birth_date"):
                updates["birth_date"] = None
            if str(row.get("gender") or "Unknown") != "Unknown":
                updates["gender"] = "Unknown"
            if str(row.get("marital_status") or "Unknown") != "Unknown":
                updates["marital_status"] = "Unknown"
            if row.get("occupation"):
                updates["occupation"] = None

        if updates:
            frappe.db.set_value(
                "AT Customer", row["name"], updates, update_modified=False
            )

    frappe.db.commit()


def _rename_legacy_customer_names() -> None:
    # unbounded: legacy customer names for rename, filtered by non-AT-CUST- prefix - expected max ~100k rows
    names = frappe.get_all(
        "AT Customer",
        filters={"name": ["not like", "AT-CUST-%"]},
        pluck="name",
        limit_page_length=0,
    )
    for current_name in names:
        rename_doc(
            "AT Customer",
            current_name,
            _next_customer_name(),
            force=True,
            merge=False,
            show_alert=False,
        )

    frappe.db.commit()


def _next_customer_name() -> str:
    while True:
        candidate = make_autoname("AT-CUST-.YYYY.-.######")
        if not frappe.db.exists("AT Customer", candidate):
            return candidate
