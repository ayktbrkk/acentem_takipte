from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, now_datetime

from acentem_takipte.acentem_takipte.api.security import (
    assert_authenticated,
    assert_doc_permission,
    assert_post_request,
    audit_admin_action,
)
from acentem_takipte.acentem_takipte.doctype.at_policy.at_policy import (
    create_policy_snapshot,
    serialize_policy_snapshot,
)
from acentem_takipte.acentem_takipte.utils.commissions import sync_legacy_commission_fields
from acentem_takipte.acentem_takipte.utils.statuses import ATPolicyEndorsementStatus

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
    endorsement = assert_doc_permission("AT Policy Endorsement", endorsement_name, "write")
    if endorsement.status == ATPolicyEndorsementStatus.APPLIED:
        return {
            "policy": endorsement.policy,
            "snapshot": endorsement.snapshot_record,
            "message": _("Endorsement already applied."),
        }

    payload = _parse_payload(endorsement.change_payload, validate_keys=True)
    if not payload:
        frappe.throw(_("Change Payload cannot be empty when applying endorsement."))

    policy = assert_doc_permission("AT Policy", endorsement.policy, "write")
    before_snapshot = serialize_policy_snapshot(policy)
    next_version = _next_snapshot_version(policy.name)

    for fieldname in ALLOWED_ENDORSEMENT_FIELDS:
        if fieldname in payload:
            policy.set(fieldname, payload[fieldname])
    if "commission_amount" in payload or "commission" in payload:
        sync_legacy_commission_fields(
            policy,
            payload.get("commission_amount", payload.get("commission")),
        )

    policy.save(ignore_permissions=True)
    policy.reload()

    snapshot = create_policy_snapshot(
        policy,
        snapshot_type="Endorsement",
        source_doctype=endorsement.doctype,
        source_name=endorsement.name,
        snapshot_version=next_version,
        notes=endorsement.notes,
    )
    after_snapshot = serialize_policy_snapshot(policy)

    endorsement.db_set("snapshot_version", next_version, update_modified=False)
    endorsement.db_set("snapshot_record", snapshot.name, update_modified=False)
    endorsement.db_set("before_snapshot", frappe.as_json(before_snapshot), update_modified=False)
    endorsement.db_set("after_snapshot", frappe.as_json(after_snapshot), update_modified=False)
    endorsement.db_set("status", ATPolicyEndorsementStatus.APPLIED, update_modified=False)
    endorsement.db_set("applied_on", now_datetime(), update_modified=False)
    endorsement.db_set("applied_by", frappe.session.user, update_modified=False)

    policy.db_set("current_version", next_version, update_modified=False)
    audit_admin_action(
        "doctype.at_policy_endorsement.apply_endorsement",
        {
            "endorsement": endorsement.name,
            "policy": policy.name,
            "applied_by": user,
        },
    )
    frappe.db.commit()

    return {
        "policy": policy.name,
        "snapshot": snapshot.name,
        "message": _("Endorsement applied successfully."),
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
            frappe.throw(_("Unsupported endorsement fields: {0}").format(", ".join(unknown)))

    # Normalize payload for deterministic snapshots/logging.
    return json.loads(frappe.as_json(payload))


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

