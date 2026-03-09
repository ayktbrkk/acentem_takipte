from __future__ import annotations

import frappe
from frappe.utils import flt, getdate, nowdate


def _insert_doc(payload: dict, result_key: str) -> dict[str, str]:
    doc = frappe.get_doc(payload)
    doc.insert()
    frappe.db.commit()
    return {result_key: doc.name}


def update_aux_record(doc) -> dict[str, str]:
    doc.save()
    frappe.db.commit()
    return {"record": doc.name}


def delete_aux_record(doc) -> dict[str, str | bool]:
    record_name = doc.name
    doctype = doc.doctype
    doc.delete()
    frappe.db.commit()
    return {"record": record_name, "doctype": doctype, "deleted": True}


def create_customer(payload: dict) -> dict[str, str]:
    return _insert_doc(
        {
            "doctype": "AT Customer",
            "full_name": payload.get("full_name"),
            "tax_id": payload.get("tax_id"),
            "phone": payload.get("phone"),
            "email": payload.get("email"),
            "address": payload.get("address"),
            "office_branch": payload.get("office_branch"),
            "birth_date": payload.get("birth_date"),
            "gender": payload.get("gender"),
            "marital_status": payload.get("marital_status"),
            "occupation": payload.get("occupation"),
            "consent_status": payload.get("consent_status"),
            "assigned_agent": payload.get("assigned_agent"),
        },
        "customer",
    )


def create_lead(payload: dict) -> dict[str, str]:
    return _insert_doc(
        {
            "doctype": "AT Lead",
            "first_name": payload.get("first_name"),
            "last_name": payload.get("last_name"),
            "phone": payload.get("phone"),
            "tax_id": payload.get("tax_id"),
            "email": payload.get("email"),
            "status": payload.get("status"),
            "customer": payload.get("customer"),
            "office_branch": payload.get("office_branch"),
            "sales_entity": payload.get("sales_entity"),
            "insurance_company": payload.get("insurance_company"),
            "branch": payload.get("branch"),
            "estimated_gross_premium": flt(payload.get("estimated_gross_premium") or 0),
            "notes": payload.get("notes"),
        },
        "lead",
    )


def create_policy(payload: dict) -> dict[str, str]:
    issue = getdate(payload.get("issue_date")) if payload.get("issue_date") else getdate(nowdate())
    start = getdate(payload.get("start_date")) if payload.get("start_date") else issue
    end = getdate(payload.get("end_date")) if payload.get("end_date") else issue

    return _insert_doc(
        {
            "doctype": "AT Policy",
            "customer": payload.get("customer"),
            "office_branch": payload.get("office_branch"),
            "sales_entity": payload.get("sales_entity"),
            "insurance_company": payload.get("insurance_company"),
            "branch": payload.get("branch"),
            "policy_no": payload.get("policy_no"),
            "status": payload.get("status"),
            "issue_date": issue,
            "start_date": start,
            "end_date": end,
            "currency": payload.get("currency"),
            "net_premium": flt(payload.get("net_premium") or 0),
            "tax_amount": flt(payload.get("tax_amount") or 0),
            "commission_amount": flt(payload.get("commission_amount") or 0),
            "gross_premium": flt(payload.get("gross_premium") or 0),
            "source_offer": payload.get("source_offer"),
            "notes": payload.get("notes"),
        },
        "policy",
    )


def create_claim(payload: dict) -> dict[str, str]:
    incident = getdate(payload.get("incident_date")) if payload.get("incident_date") else getdate(nowdate())
    reported = getdate(payload.get("reported_date")) if payload.get("reported_date") else getdate(nowdate())

    return _insert_doc(
        {
            "doctype": "AT Claim",
            "policy": payload.get("policy"),
            "customer": payload.get("customer"),
            "office_branch": payload.get("office_branch"),
            "claim_no": payload.get("claim_no"),
            "claim_type": payload.get("claim_type"),
            "claim_status": payload.get("claim_status"),
            "incident_date": incident,
            "reported_date": reported,
            "currency": payload.get("currency"),
            "estimated_amount": flt(payload.get("estimated_amount") or 0),
            "approved_amount": flt(payload.get("approved_amount") or 0),
            "notes": payload.get("notes"),
        },
        "claim",
    )


def create_payment(payload: dict) -> dict[str, str]:
    return _insert_doc(
        {
            "doctype": "AT Payment",
            "customer": payload.get("customer"),
            "policy": payload.get("policy"),
            "claim": payload.get("claim"),
            "office_branch": payload.get("office_branch"),
            "sales_entity": payload.get("sales_entity"),
            "payment_direction": payload.get("payment_direction"),
            "payment_purpose": payload.get("payment_purpose"),
            "status": payload.get("status"),
            "payment_date": getdate(payload.get("payment_date")) if payload.get("payment_date") else getdate(nowdate()),
            "due_date": getdate(payload.get("due_date")) if payload.get("due_date") else None,
            "currency": payload.get("currency"),
            "amount": flt(payload.get("amount") or 0),
            "reference_no": payload.get("reference_no"),
            "notes": payload.get("notes"),
        },
        "payment",
    )


def create_renewal_task(payload: dict) -> dict[str, str]:
    renewal = getdate(payload.get("renewal_date")) if payload.get("renewal_date") else getdate(nowdate())
    due = getdate(payload.get("due_date")) if payload.get("due_date") else None

    return _insert_doc(
        {
            "doctype": "AT Renewal Task",
            "policy": payload.get("policy"),
            "customer": payload.get("customer"),
            "office_branch": payload.get("office_branch"),
            "renewal_date": renewal,
            "due_date": due,
            "status": payload.get("status"),
            "lost_reason_code": payload.get("lost_reason_code"),
            "competitor_name": payload.get("competitor_name"),
            "assigned_to": payload.get("assigned_to"),
            "notes": payload.get("notes"),
            "auto_created": payload.get("auto_created"),
        },
        "renewal_task",
    )


def create_customer_relation(payload: dict) -> dict[str, str]:
    return _insert_doc(
        {
            "doctype": "AT Customer Relation",
            "customer": payload.get("customer"),
            "related_customer": payload.get("related_customer"),
            "relation_type": payload.get("relation_type"),
            "is_household": payload.get("is_household"),
            "notes": payload.get("notes"),
        },
        "customer_relation",
    )


def create_insured_asset(payload: dict) -> dict[str, str]:
    return _insert_doc(
        {
            "doctype": "AT Insured Asset",
            "customer": payload.get("customer"),
            "policy": payload.get("policy"),
            "asset_type": payload.get("asset_type"),
            "asset_label": payload.get("asset_label"),
            "asset_identifier": payload.get("asset_identifier"),
            "notes": payload.get("notes"),
        },
        "insured_asset",
    )
