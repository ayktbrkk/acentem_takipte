from __future__ import annotations

from typing import Any

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_days, add_to_date, getdate, now_datetime, nowdate

from acentem_takipte.acentem_takipte.platform.utils.metrics import build_metric_event


class ATAccessLog(Document):
    def save(self, *args, **kwargs):
        # Access log records are append-only. Existing rows must never be
        # edited; only the privileged retention cleanup may bypass this. Guard
        # at the save() entry point so immutability is enforced before Frappe
        # runs link or other validation that could mask the real error.
        if not self.is_new() and not _privileged():
            frappe.throw(
                _("Access log records are immutable and cannot be edited."),
                frappe.PermissionError,
            )
        return super().save(*args, **kwargs)

    def on_trash(self):
        if not _privileged():
            frappe.throw(
                _("Access log records are immutable and cannot be deleted."),
                frappe.PermissionError,
            )

    def before_rename(self, old: str, new: str, merge: bool = False) -> str:
        if not _privileged():
            frappe.throw(
                _("Access log records are immutable and cannot be renamed."),
                frappe.PermissionError,
            )
        return new


def _privileged() -> bool:
    return bool(getattr(frappe.flags, "at_access_log_privileged", False))


DEFAULT_ACCESS_LOG_RETENTION_DAYS = 365
ACCESS_LOG_RETENTION_CONFIG_KEY = "at_access_log_retention_days"
MAX_ACCESS_LOG_RETENTION_DAYS = 3650


def _retention_logger():
    return frappe.logger("acentem_takipte")


def resolve_access_log_retention_days(
    site_config: dict[str, Any] | None = None,
) -> int | None:
    """Resolve the configured access log retention window in days.

    Missing/empty config falls back to the documented 365-day default. Returns
    None when the value is not a positive integer (non-numeric, 0, negative, or
    above the safe upper bound); no cleanup run is performed in that case.
    """
    source = site_config if site_config is not None else (frappe.get_site_config() or {})
    raw = source.get(ACCESS_LOG_RETENTION_CONFIG_KEY)
    if raw is None or str(raw).strip() == "":
        return DEFAULT_ACCESS_LOG_RETENTION_DAYS
    try:
        days = int(raw)
    except (TypeError, ValueError):
        _retention_logger().warning(
            "AT access log retention config %s=%r is not a valid integer; skipping purge.",
            ACCESS_LOG_RETENTION_CONFIG_KEY,
            raw,
        )
        return None
    if days <= 0:
        _retention_logger().warning(
            "AT access log retention config %s=%r must be positive; skipping purge.",
            ACCESS_LOG_RETENTION_CONFIG_KEY,
            raw,
        )
        return None
    if days > MAX_ACCESS_LOG_RETENTION_DAYS:
        _retention_logger().warning(
            "AT access log retention config %s=%r exceeds the upper bound %s; skipping purge.",
            ACCESS_LOG_RETENTION_CONFIG_KEY,
            raw,
            MAX_ACCESS_LOG_RETENTION_DAYS,
        )
        return None
    return days


def resolve_access_log_retention_cutoff(
    site_config: dict[str, Any] | None = None,
):
    """Return the purge cutoff (a past date) for the configured retention window.

    None when the config is invalid or the computed cutoff is not in the past;
    no records may be deleted in either case.
    """
    days = resolve_access_log_retention_days(site_config)
    if not days:
        return None
    cutoff = getdate(add_days(getdate(nowdate()), -days))
    if cutoff >= getdate(nowdate()):
        _retention_logger().warning(
            "AT access log retention cutoff %s is not in the past; skipping purge.",
            cutoff,
        )
        return None
    return cutoff


def run_access_log_retention_purge(
    site_config: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Scheduled retention cleanup entrypoint for access logs.

    Reads the retention window, derives a validated past cutoff, and delegates
    to the privileged purge. Invalid config or a non-past cutoff skip the run
    without deleting anything. Logs only counts, never record payloads.
    """
    cutoff = resolve_access_log_retention_cutoff(site_config)
    if not cutoff:
        _retention_logger().warning("AT access log retention cleanup skipped.")
        return {"deleted": 0, "skipped": True}
    result = purge_access_logs(before=cutoff)
    deleted = int(result.get("deleted") or 0)
    _retention_logger().info(
        "AT access log retention cleanup complete: %s",
        build_metric_event(
            "access_log.retention_purge",
            values={"deleted": deleted, "skipped": False},
        ),
    )
    return {"deleted": deleted, "skipped": False}


def log_access(
    reference_doctype: str, reference_name: str, action: str = "View"
) -> None:
    _insert_access_log(reference_doctype, reference_name, action=action)


def log_decision_event(
    reference_doctype: str,
    reference_name: str,
    action: str,
    action_summary: str | None = None,
    decision_context: str | None = None,
) -> None:
    _insert_access_log(
        reference_doctype,
        reference_name,
        action=action,
        action_summary=action_summary,
        decision_context=decision_context,
    )


def _insert_access_log(
    reference_doctype: str,
    reference_name: str,
    action: str = "View",
    action_summary: str | None = None,
    decision_context: str | None = None,
) -> None:
    user = frappe.session.user if frappe.session else "Guest"
    if not user or user == "Guest":
        return

    cutoff = add_to_date(now_datetime(), minutes=-2)
    recent_entries = frappe.get_all(
        "AT Access Log",
        filters={
            "reference_doctype": reference_doctype,
            "reference_name": reference_name,
            "viewed_by": user,
            "action": action,
            "creation": [">=", cutoff],
        },
        fields=["name"],
        limit=1,
    )
    if recent_entries:
        return

    ip_address = getattr(frappe.local, "request_ip", None)
    doc = frappe.get_doc(
        {
            "doctype": "AT Access Log",
            "reference_doctype": reference_doctype,
            "reference_name": reference_name,
            "viewed_by": user,
            "action": action,
            "ip_address": ip_address,
            "viewed_on": now_datetime(),
            "action_summary": action_summary,
            "decision_context": decision_context,
        }
    )
    # ignore_permissions + ignore_links: Audit log insertion is a system-level
    # operation; the referenced record may have been deleted, so the audit row
    # must not fail on link existence.
    doc.insert(ignore_permissions=True, ignore_links=True)


def purge_access_logs(before) -> dict[str, int]:
    """Delete access log records older than ``before`` (system-level retention).

    Requires a non-empty, parseable cutoff. Every run is audited with a new
    access log row so the cleanup itself stays traceable. Deletion is the
    privileged path that temporarily allows the immutable controller to remove
    expired rows; normal users still cannot update/delete/rename access logs.
    """
    from acentem_takipte.acentem_takipte.platform.api.security import assert_roles

    assert_roles("System Manager", message="Only System Manager may purge access log records.")

    cutoff_value = str(before).strip() if before is not None else ""
    if not cutoff_value:
        frappe.throw(_("A cutoff date is required to purge access logs."), frappe.ValidationError)
    cutoff = getdate(cutoff_value)
    if not cutoff:
        frappe.throw(_("A valid cutoff date is required to purge access logs."), frappe.ValidationError)

    names = frappe.get_all(
        "AT Access Log",
        filters={"viewed_on": ["<", cutoff]},
        fields=["name"],
        order_by="viewed_on asc",
        limit_page_length=0,
    )

    frappe.flags.at_access_log_privileged = True
    try:
        deleted = 0
        for row in names:
            frappe.delete_doc("AT Access Log", row["name"], force=True)
            deleted += 1
        if deleted:
            _record_purge_audit(cutoff, deleted)
    finally:
        frappe.flags.pop("at_access_log_privileged", None)

    if not frappe.flags.in_test:
        frappe.db.commit()

    return {"deleted": deleted}


def _record_purge_audit(cutoff, deleted: int) -> None:
    # ignore_links: the synthetic reference target for a purge run does not
    # exist as a document; the audit row itself is the source of truth.
    frappe.get_doc(
        {
            "doctype": "AT Access Log",
            "reference_doctype": "AT Access Log",
            "reference_name": "retention_purge",
            "viewed_by": frappe.session.user or "Administrator",
            "action": "Delete",
            "action_summary": f"Purged {deleted} access log record(s) older than {cutoff}.",
            "decision_context": "access_log_retention_purge",
            "viewed_on": now_datetime(),
        }
    ).insert(ignore_permissions=True, ignore_links=True)
