from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.exceptions import DuplicateEntryError
from frappe.model.document import Document
from frappe.utils import getdate, now_datetime

from acentem_takipte.acentem_takipte.platform.api.security import (
    assert_authenticated,
    assert_doc_permission,
    assert_post_request,
    audit_admin_action,
)
from acentem_takipte.acentem_takipte.doctype.at_policy.at_policy import (
    create_policy_snapshot,
    serialize_policy_snapshot,
)
from acentem_takipte.acentem_takipte.utils.commissions import (
    sync_legacy_commission_fields,
)
from acentem_takipte.acentem_takipte.utils.statuses import (
    ATPolicyEndorsementStatus,
    ATPolicyStatus,
)

ALLOWED_ENDORSEMENT_FIELDS = {
    "insurance_company",
    "branch",
    "status",
    "issue_date",
    "start_date",
    "end_date",
    "currency",
    "fx_rate",
    "fx_date",
    "net_premium",
    "tax_amount",
    "commission_amount",
    "gross_premium",
    "commission",
}


class ATPolicyEndorsement(Document):
    def validate(self):
        if self.policy and not frappe.db.exists("AT Policy", self.policy):
            frappe.throw(_("Policy not found."))

        if self.endorsement_date:
            getdate(self.endorsement_date)

        _parse_payload(self.change_payload, validate_keys=True)


@frappe.whitelist()
def apply_endorsement(endorsement_name: str) -> dict[str, str]:
    user = assert_authenticated()
    assert_post_request("Only POST requests are allowed for endorsement application.")
    endorsement_name = str(endorsement_name or "").strip()
    endorsement = assert_doc_permission(
        "AT Policy Endorsement", endorsement_name, "write"
    )
    if endorsement.status == ATPolicyEndorsementStatus.APPLIED:
        return {
            "policy": endorsement.policy,
            "snapshot": endorsement.snapshot_record,
            "message": _("Endorsement already applied."),
        }

    original = assert_doc_permission("AT Policy", endorsement.policy, "write")
    if original.status == ATPolicyStatus.CANCELLED:
        frappe.throw(_("Cannot apply endorsement to a cancelled policy."))
    next_version = _next_policy_version(original.name)
    is_cancellation = endorsement.endorsement_type == "Cancellation"

    payload = _parse_payload(endorsement.change_payload, validate_keys=True)

    # Build new versioned policy
    versioned_name = f"{original.name}-{next_version:02d}"
    new_policy = frappe.get_doc({
        "doctype": "AT Policy",
        "name": versioned_name,
        "parent_policy": original.name,
        "endorsement_reference": endorsement.name,
        "policy_version": next_version,
        "customer": original.customer,
        "office_branch": original.office_branch,
        "origin_office_branch": original.origin_office_branch,
        "current_office_branch": original.current_office_branch,
        "sales_entity": original.sales_entity,
        "insurance_company": original.insurance_company,
        "branch": original.branch,
        "policy_no": None,
        "source_offer": original.source_offer,
        "status": ATPolicyStatus.CANCELLED if is_cancellation else ATPolicyStatus.RECORD,
        "issue_date": original.issue_date,
        "start_date": original.start_date,
        "end_date": original.end_date,
        "currency": original.currency,
        "fx_rate": original.fx_rate,
        "fx_date": original.fx_date,
        "net_premium": original.net_premium,
        "tax_amount": original.tax_amount,
        "commission_amount": original.commission_amount,
        "gross_premium": original.gross_premium,
        "plate": original.plate,
        "document_serial_no": original.document_serial_no,
        "brand_code": original.brand_code,
        "model_year": original.model_year,
        "vehicle_make_model": original.vehicle_make_model,
        "motor_no": original.motor_no,
        "chassis_no": original.chassis_no,
        "uavt_code": original.uavt_code,
        "floor_count": original.floor_count,
        "structure_type": original.structure_type,
        "coverage_type": original.coverage_type,
        "network_type": original.network_type,
        "notes": original.notes,
        "archived": 0,
    })

    # Apply changes from payload (if any)
    for fieldname in ALLOWED_ENDORSEMENT_FIELDS:
        if fieldname in payload:
            new_policy.set(fieldname, payload[fieldname])

    for attempt in range(2):
        try:
            new_policy.insert(ignore_permissions=True)
            break
        except DuplicateEntryError:
            if attempt == 0:
                next_version = _next_policy_version(original.name)
                versioned_name = f"{original.name}-{next_version:02d}"
                new_policy.name = versioned_name
                new_policy.policy_version = next_version
            else:
                raise

    new_policy.reload()

    # Cancellation: mark original status as Cancelled, values unchanged
    if is_cancellation:
        pre_status = original.status
        endorsement.db_set("pre_cancellation_status", pre_status, update_modified=False)
        original.db_set("status", ATPolicyStatus.CANCELLED, update_modified=False)

    # Snapshot of the new versioned policy only
    next_snapshot_version = _next_snapshot_version(original.name)
    after_snapshot = serialize_policy_snapshot(new_policy)

    snapshot = create_policy_snapshot(
        new_policy,
        snapshot_type="Endorsement",
        source_doctype=endorsement.doctype,
        source_name=endorsement.name,
        snapshot_version=next_snapshot_version,
        notes=endorsement.notes,
    )

    endorsement.db_set("snapshot_version", next_snapshot_version, update_modified=False)
    endorsement.db_set("snapshot_record", snapshot.name, update_modified=False)
    endorsement.db_set("before_snapshot", frappe.as_json({}), update_modified=False)
    endorsement.db_set("after_snapshot", frappe.as_json(after_snapshot), update_modified=False)
    endorsement.db_set("status", ATPolicyEndorsementStatus.APPLIED, update_modified=False)
    endorsement.db_set("applied_on", now_datetime(), update_modified=False)
    endorsement.db_set("applied_by", frappe.session.user, update_modified=False)

    new_policy.db_set("current_version", next_snapshot_version, update_modified=False)

    # Invalidate caches since db_set bypasses hooks
    from acentem_takipte.acentem_takipte.domains.policies.services.policy_360 import invalidate_policy_360_cache
    invalidate_policy_360_cache(original.name)
    invalidate_policy_360_cache(new_policy.name)

    audit_admin_action(
        "doctype.at_policy_endorsement.apply_endorsement",
        {
            "endorsement": endorsement.name,
            "original_policy": original.name,
            "versioned_policy": new_policy.name,
            "applied_by": user,
        },
    )
    frappe.db.commit()

    return {
        "original_policy": original.name,
        "versioned_policy": new_policy.name,
        "snapshot": snapshot.name,
        "message": _("Endorsement applied successfully. New policy version created: {0}").format(new_policy.name),
    }


@frappe.whitelist()
def delete_applied_endorsement(endorsement_name: str) -> dict[str, str]:
    """Delete an applied endorsement and roll back the versioned policy."""
    user = assert_authenticated()
    assert_post_request("Only POST requests are allowed.")
    endorsement = assert_doc_permission(
        "AT Policy Endorsement", str(endorsement_name or "").strip(), "write"
    )
    if endorsement.status != ATPolicyEndorsementStatus.APPLIED:
        frappe.throw(_("Only applied endorsements can be rolled back."))

    original = assert_doc_permission("AT Policy", endorsement.policy, "write")
    is_cancellation = endorsement.endorsement_type == "Cancellation"

    versioned = frappe.db.get_value(
        "AT Policy",
        {"endorsement_reference": endorsement.name},
        "name",
    )

    # Clear endorsement_reference on versioned policy (policy → endorsement FK)
    if versioned:
        frappe.db.set_value("AT Policy", versioned, "endorsement_reference", None, update_modified=False)

    # Clear snapshot_record on endorsement (endorsement → snapshot FK)
    endorsement.db_set("snapshot_record", None, update_modified=False)

    # Delete snapshots linked to versioned policy
    if versioned:
        snapshots = frappe.get_all(
            "AT Policy Snapshot",
            filters={"policy": versioned},
            fields=["name"],
            limit_page_length=0,
        )
        for snap in snapshots:
            frappe.delete_doc("AT Policy Snapshot", snap.name, ignore_permissions=True)

    # Delete versioned policy
    if versioned:
        frappe.delete_doc("AT Policy", versioned, ignore_permissions=True)
        # Clean up orphaned accounting entry from versioned policy
        frappe.db.delete("AT Accounting Entry", {"source_doctype": "AT Policy", "source_name": versioned})
        frappe.db.delete("AT Reconciliation Item", {"source_doctype": "AT Policy", "source_name": versioned})

    # Delete endorsement
    pre_cancel_status = getattr(endorsement, "pre_cancellation_status", None)
    frappe.delete_doc("AT Policy Endorsement", endorsement.name, ignore_permissions=True)

    if is_cancellation and original.status == ATPolicyStatus.CANCELLED:
        restore_status = pre_cancel_status or ATPolicyStatus.ACTIVE
        original.db_set("status", restore_status, update_modified=False)

    from acentem_takipte.acentem_takipte.domains.policies.services.policy_360 import invalidate_policy_360_cache
    invalidate_policy_360_cache(original.name)

    audit_admin_action(
        "doctype.at_policy_endorsement.delete_applied_endorsement",
        {
            "endorsement": endorsement.name,
            "original_policy": original.name,
            "versioned_policy": versioned,
            "deleted_by": user,
        },
    )
    frappe.db.commit()

    return {
        "original_policy": original.name,
        "message": _("Endorsement deleted and policy rolled back successfully."),
    }


def _parse_payload(raw_payload, validate_keys: bool = False) -> dict:
    if not raw_payload:
        return {}

    payload = frappe.parse_json(raw_payload)
    if not isinstance(payload, dict):
        frappe.throw(_("Change Payload must be a JSON object."))

    if validate_keys:
        unknown = sorted(set(payload.keys()) - ALLOWED_ENDORSEMENT_FIELDS)
        if unknown:
            frappe.throw(
                _("Unsupported endorsement fields: {0}").format(", ".join(unknown))
            )

    # Normalize payload for deterministic snapshots/logging.
    return json.loads(frappe.as_json(payload))


def _next_policy_version(parent_name: str) -> int:
    current = frappe.db.sql(
        """
        select COALESCE(MAX(policy_version), 0)
        from `tabAT Policy`
        where parent_policy = %s
        """,
        parent_name,
    )[0][0]
    return int(current) + 1


def _next_snapshot_version(policy_name: str) -> int:
    current = frappe.db.sql(
        """
        select max(snapshot_version)
        from `tabAT Policy Snapshot`
        where policy = %s
        """,
        policy_name,
    )[0][0]
    return (int(current) if current else 0) + 1
