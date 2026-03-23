from __future__ import annotations

import frappe
from frappe.utils import flt, getdate, nowdate
from acentem_takipte.acentem_takipte.doctype.at_access_log.at_access_log import log_decision_event


def _insert_doc(payload: dict, result_key: str) -> dict[str, str]:
    doc = frappe.get_doc(payload)
    doc.insert()
    frappe.db.commit()
    log_decision_event(
        doc.doctype,
        doc.name,
        action="Create",
        action_summary=f"{doc.doctype} created",
        decision_context=result_key,
    )
    return {result_key: doc.name}


def update_aux_record(doc) -> dict[str, str]:
    doc.save()
    frappe.db.commit()
    log_decision_event(
        doc.doctype,
        doc.name,
        action="Edit",
        action_summary=f"{doc.doctype} updated",
        decision_context="quick_aux_edit",
    )
    return {"record": doc.name}


def delete_aux_record(doc) -> dict[str, str | bool]:
    record_name = doc.name
    doctype = doc.doctype
    doc.delete()
    frappe.db.commit()
    log_decision_event(
        doctype,
        record_name,
        action="Delete",
        action_summary=f"{doctype} deleted",
        decision_context="quick_aux_delete",
    )
    return {"record": record_name, "doctype": doctype, "deleted": True}


def create_customer(payload: dict) -> dict[str, str]:
    return _insert_doc(
        {
            "doctype": "AT Customer",
            "customer_type": payload.get("customer_type"),
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
            "installment_count": payload.get("installment_count"),
            "installment_interval_days": payload.get("installment_interval_days"),
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


def create_call_note(payload: dict) -> dict[str, str]:
    return _insert_doc(
        {
            "doctype": "AT Call Note",
            "customer": payload.get("customer"),
            "policy": payload.get("policy"),
            "claim": payload.get("claim"),
            "office_branch": payload.get("office_branch"),
            "channel": payload.get("channel"),
            "direction": payload.get("direction"),
            "call_status": payload.get("call_status"),
            "call_outcome": payload.get("call_outcome"),
            "note_at": payload.get("note_at"),
            "next_follow_up_on": payload.get("next_follow_up_on"),
            "notes": payload.get("notes"),
        },
        "call_note",
    )


def create_segment(payload: dict) -> dict[str, str]:
    return _insert_doc(
        {
            "doctype": "AT Segment",
            "segment_name": payload.get("segment_name"),
            "segment_type": payload.get("segment_type"),
            "channel_focus": payload.get("channel_focus"),
            "office_branch": payload.get("office_branch"),
            "status": payload.get("status"),
            "criteria_json": payload.get("criteria_json"),
            "notes": payload.get("notes"),
        },
        "segment",
    )


def create_campaign(payload: dict) -> dict[str, str]:
    return _insert_doc(
        {
            "doctype": "AT Campaign",
            "campaign_name": payload.get("campaign_name"),
            "segment": payload.get("segment"),
            "template": payload.get("template"),
            "channel": payload.get("channel"),
            "office_branch": payload.get("office_branch"),
            "status": payload.get("status"),
            "scheduled_for": payload.get("scheduled_for"),
            "notes": payload.get("notes"),
        },
        "campaign",
    )


def create_ownership_assignment(payload: dict) -> dict[str, str]:
    return _insert_doc(
        {
            "doctype": "AT Ownership Assignment",
            "source_doctype": payload.get("source_doctype"),
            "source_name": payload.get("source_name"),
            "customer": payload.get("customer"),
            "policy": payload.get("policy"),
            "office_branch": payload.get("office_branch"),
            "assigned_to": payload.get("assigned_to"),
            "assignment_role": payload.get("assignment_role"),
            "status": payload.get("status"),
            "priority": payload.get("priority"),
            "due_date": payload.get("due_date"),
            "notes": payload.get("notes"),
        },
        "ownership_assignment",
    )


def create_task(payload: dict) -> dict[str, str]:
    return _insert_doc(
        {
            "doctype": "AT Task",
            "task_title": payload.get("task_title"),
            "task_type": payload.get("task_type"),
            "source_doctype": payload.get("source_doctype"),
            "source_name": payload.get("source_name"),
            "customer": payload.get("customer"),
            "policy": payload.get("policy"),
            "claim": payload.get("claim"),
            "office_branch": payload.get("office_branch"),
            "assigned_to": payload.get("assigned_to"),
            "status": payload.get("status"),
            "priority": payload.get("priority"),
            "due_date": payload.get("due_date"),
            "reminder_at": payload.get("reminder_at"),
            "notes": payload.get("notes"),
        },
        "task",
    )


def create_activity(payload: dict) -> dict[str, str]:
    return _insert_doc(
        {
            "doctype": "AT Activity",
            "activity_title": payload.get("activity_title"),
            "activity_type": payload.get("activity_type"),
            "source_doctype": payload.get("source_doctype"),
            "source_name": payload.get("source_name"),
            "customer": payload.get("customer"),
            "policy": payload.get("policy"),
            "claim": payload.get("claim"),
            "office_branch": payload.get("office_branch"),
            "assigned_to": payload.get("assigned_to"),
            "activity_at": payload.get("activity_at"),
            "status": payload.get("status"),
            "notes": payload.get("notes"),
        },
        "activity",
    )


def create_reminder(payload: dict) -> dict[str, str]:
    return _insert_doc(
        {
            "doctype": "AT Reminder",
            "reminder_title": payload.get("reminder_title"),
            "source_doctype": payload.get("source_doctype"),
            "source_name": payload.get("source_name"),
            "customer": payload.get("customer"),
            "policy": payload.get("policy"),
            "claim": payload.get("claim"),
            "office_branch": payload.get("office_branch"),
            "assigned_to": payload.get("assigned_to"),
            "status": payload.get("status"),
            "priority": payload.get("priority"),
            "remind_at": payload.get("remind_at"),
            "notes": payload.get("notes"),
        },
        "reminder",
    )

