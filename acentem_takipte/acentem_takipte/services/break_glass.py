"""Break-glass access service.

Provides helpers for checking whether a user holds an active emergency-access
grant, and a scheduled job that expires stale grants.

Usage in permission hooks (Sprint B integration point)
------------------------------------------------------
::

    from acentem_takipte.acentem_takipte.services.break_glass import is_break_glass_active

    def has_claim_permission(doc, user=None, permission_type="read"):
        user = user or frappe.session.user
        # … existing branch-scope check …
        if not permitted and is_break_glass_active(user, "AT Claim"):
            return True
        return permitted
"""

from __future__ import annotations

import frappe
from frappe.utils import add_to_date, now_datetime


BREAK_GLASS_APPROVER_ROLES = {"System Manager", "Administrator"}
BREAK_GLASS_AUDIT_ROLES = {"System Manager", "Administrator"}


def can_manage_break_glass(user: str | None = None) -> bool:
    user_id = str(user or frappe.session.user or "").strip()
    if not user_id or user_id == "Guest":
        return False
    if user_id == "Administrator":
        return True
    return bool(BREAK_GLASS_APPROVER_ROLES.intersection(set(frappe.get_roles(user_id))))


def can_view_break_glass_audit(user: str | None = None) -> bool:
    """Return True if user can access break-glass audit data.

    Site-level override: `at_break_glass_audit_roles` in site_config may be
    either a list or comma-separated string of role names.
    """
    user_id = str(user or frappe.session.user or "").strip()
    if not user_id or user_id == "Guest":
        return False
    if user_id == "Administrator":
        return True

    configured_roles = frappe.get_site_config().get("at_break_glass_audit_roles")
    allowed_roles = set(BREAK_GLASS_AUDIT_ROLES)
    if isinstance(configured_roles, str) and configured_roles.strip():
        allowed_roles.update(
            role.strip() for role in configured_roles.split(",") if role.strip()
        )
    elif isinstance(configured_roles, (list, tuple, set)):
        allowed_roles.update(
            str(role).strip() for role in configured_roles if str(role).strip()
        )

    return bool(allowed_roles.intersection(set(frappe.get_roles(user_id))))


def is_break_glass_active(
    user: str | None = None, reference_doctype: str = "AT Claim"
) -> bool:
    """Return True if *user* has an active, non-expired emergency-access grant
    for *reference_doctype*.

    Safe to call from permission hooks — reads only from the database, no
    side-effects.
    """
    user_id = str(user or frappe.session.user or "").strip()
    if not user_id or user_id == "Guest":
        return False

    if not frappe.db.exists("DocType", "AT Emergency Access"):
        return False

    rows = frappe.get_all(
        "AT Emergency Access",
        filters={
            "beneficiary": user_id,
            "scope_doctype": reference_doctype,
            "status": "Active",
            "valid_until": [">", now_datetime()],
        },
        fields=["name"],
        limit=1,
    )
    return bool(rows)


def expire_stale() -> dict[str, int]:
    """Set ``status = "Expired"`` on any AT Emergency Access whose
    ``valid_until`` has passed.

    Designed to be called from the daily scheduler.  Returns a summary dict
    ``{"expired": N}`` for logging.
    """
    if not frappe.db.exists("DocType", "AT Emergency Access"):
        return {"expired": 0}

    # Batch UPDATE instead of per-record save+commit loop (N+1 fix)
    result = frappe.db.sql(
        """
        UPDATE `tabAT Emergency Access`
        SET status = 'Expired', modified = NOW()
        WHERE status = 'Active' AND valid_until < %s
    """,
        (now_datetime(),),
    )
    expired_count = frappe.db.sql("SELECT ROW_COUNT()", as_list=True)[0][0]

    if expired_count:
        frappe.db.commit()

    return {"expired": int(expired_count or 0)}


# Sprint E: Break-glass request workflow (approval-based grants)
# ================================================================


class BreakGlassAccessDenied(frappe.ValidationError):
    """Raised when break-glass request cannot be processed"""

    pass


def create_break_glass_request(
    access_type: str,
    justification: str,
    reference_doctype: str | None = None,
    reference_name: str | None = None,
    user: str | None = None,
) -> dict:
    """Create a new break-glass request for approval.

    Args:
        access_type: Type of access (customer_data|customer_financials|system_admin|reporting_override)
        justification: Business reason (min 20 chars)
        reference_doctype: Optional resource DocType
        reference_name: Optional resource name
        user: Requesting user (defaults to current_user)

    Returns:
        {ok: bool, request_id: str, status: str, message: str}

    Raises:
        BreakGlassAccessDenied: If request validation fails
    """
    user = user or frappe.session.user

    # Validate justification length
    if not justification or len(justification.strip()) < 20:
        frappe.throw(
            frappe._("Justification must be at least 20 characters"),
            title=frappe._("Justification Too Short"),
            exc=BreakGlassAccessDenied,
        )

    # Check for duplicate pending requests
    existing = frappe.db.count(
        "AT Break Glass Request",
        filters={"user": user, "access_type": access_type, "status": "Pending"},
    )
    if existing > 0:
        frappe.throw(
            frappe._("You already have a pending request for {0} access").format(
                access_type
            ),
            title=frappe._("Duplicate Pending Request"),
            exc=BreakGlassAccessDenied,
        )

    # Create request document
    doc = frappe.new_doc("AT Break Glass Request")
    doc.user = user
    doc.access_type = access_type
    doc.reference_doctype = reference_doctype
    doc.reference_name = reference_name
    doc.justification = justification
    doc.status = "Pending"
    doc.created_at_ts = now_datetime()
    # ignore_permissions: Request creation is for the current user; approval workflow enforces SM permission separately.
    doc.insert(ignore_permissions=True)

    # Log creation event
    frappe.logger().info(
        f"Break-glass request created: {doc.name} | "
        f"user={user} | access_type={access_type} | "
        f"reference={reference_doctype}:{reference_name}"
    )

    return {
        "ok": True,
        "request_id": doc.name,
        "status": "Pending",
        "message": frappe._(
            "Break-glass request submitted for approval. You will be notified when reviewed."
        ),
    }


def approve_break_glass_request(
    request_id: str,
    duration_hours: int = 24,
    approver_comments: str | None = None,
    approver: str | None = None,
) -> dict:
    """Approve a break-glass request (System Manager only).

    Args:
        request_id: AT Break Glass Request document ID
        duration_hours: Grant duration (24h default, max 72h)
        approver_comments: Optional comments from approver
        approver: Approving user (defaults to current_user)

    Returns:
        {ok: bool, request_id: str, expires_at: str, message: str}

    Raises:
        BreakGlassAccessDenied: If approval validation fails
    """
    approver = approver or frappe.session.user

    # Validate permissions
    if not can_manage_break_glass(approver):
        frappe.throw(
            frappe._("Only System Managers can approve break-glass requests"),
            title=frappe._("Permission Denied"),
            exc=BreakGlassAccessDenied,
        )

    # Validate duration
    if duration_hours < 1 or duration_hours > 72:
        frappe.throw(
            frappe._("Duration must be between 1 and 72 hours"),
            title=frappe._("Invalid Duration"),
            exc=BreakGlassAccessDenied,
        )

    # Load + validate request
    doc = frappe.get_doc("AT Break Glass Request", request_id)
    if doc.status != "Pending":
        frappe.throw(
            frappe._("Request status is {0}, cannot approve").format(doc.status),
            title=frappe._("Invalid Status"),
            exc=BreakGlassAccessDenied,
        )

    # Calculate expiration
    now_dt = now_datetime()
    expires_at = add_to_date(now_dt, hours=duration_hours)

    # Update + submit
    doc.status = "Approved"
    if not doc.approved_by:
        doc.approved_by = approver
    doc.approved_at_ts = now_dt
    doc.expires_at_ts = expires_at
    doc.duration_hours = duration_hours
    if approver_comments:
        doc.approver_comments = approver_comments
    doc.submit()

    # Log approval + audit event
    frappe.logger().info(
        f"Break-glass request approved: {request_id} | "
        f"approved_by={approver} | expires_at={expires_at} | "
        f"user={doc.user} | access_type={doc.access_type}"
    )

    _log_break_glass_audit(
        request_id=request_id,
        user=doc.user,
        access_type=doc.access_type,
        action="approved",
        approved_by=approver,
        expires_at=str(expires_at),
        reference_doctype=doc.reference_doctype,
        reference_name=doc.reference_name,
    )

    return {
        "ok": True,
        "request_id": request_id,
        "expires_at": str(expires_at),
        "message": frappe._(
            "Break-glass request approved. Access valid until {0}"
        ).format(expires_at),
    }


def reject_break_glass_request(
    request_id: str, approver_comments: str | None = None, approver: str | None = None
) -> dict:
    """Reject a break-glass request (System Manager only).

    Args:
        request_id: AT Break Glass Request document ID
        approver_comments: Reason for rejection
        approver: Rejecting user (defaults to current_user)

    Returns:
        {ok: bool, request_id: str, message: str}
    """
    approver = approver or frappe.session.user

    # Validate permissions
    if not can_manage_break_glass(approver):
        frappe.throw(
            frappe._("Only System Managers can reject break-glass requests"),
            title=frappe._("Permission Denied"),
            exc=BreakGlassAccessDenied,
        )

    # Load + update
    doc = frappe.get_doc("AT Break Glass Request", request_id)
    if doc.status != "Pending":
        frappe.throw(
            frappe._("Request status is {0}, cannot reject").format(doc.status),
            title=frappe._("Invalid Status"),
            exc=BreakGlassAccessDenied,
        )

    doc.status = "Rejected"
    if not doc.approved_by:
        doc.approved_by = approver
    doc.approved_at_ts = now_datetime()
    if approver_comments:
        doc.approver_comments = approver_comments
    doc.submit()

    # Log rejection
    frappe.logger().info(
        f"Break-glass request rejected: {request_id} | "
        f"rejected_by={approver} | user={doc.user} | access_type={doc.access_type}"
    )

    _log_break_glass_audit(
        request_id=request_id,
        user=doc.user,
        access_type=doc.access_type,
        action="rejected",
        approved_by=approver,
        reference_doctype=doc.reference_doctype,
        reference_name=doc.reference_name,
    )

    return {
        "ok": True,
        "request_id": request_id,
        "message": frappe._("Break-glass request rejected"),
    }


def validate_break_glass_access(
    user: str,
    access_type: str,
    reference_doctype: str | None = None,
    reference_name: str | None = None,
) -> tuple[bool, dict | None]:
    """Validate if user has active break-glass grant for access type.

    Args:
        user: User to check
        access_type: Type of access being requested
        reference_doctype: Optional resource type
        reference_name: Optional resource name

    Returns:
        (is_valid, grant_info)
        is_valid: bool - True if user has valid/non-expired grant
        grant_info: {request_id, grant_type, expires_at, remaining_minutes} or None
    """
    try:
        # Find approved request for user + access type
        request_doc = frappe.db.get_value(
            "AT Break Glass Request",
            filters={"user": user, "access_type": access_type, "status": "Approved"},
            fieldname=["name", "expires_at_ts", "reference_doctype", "reference_name"],
            as_dict=True,
        )

        if not request_doc:
            return False, None

        # Check expiration
        from frappe.utils import get_datetime

        expires_at = get_datetime(request_doc.expires_at_ts)
        now_dt = now_datetime()

        if now_dt > expires_at:
            # Mark as expired
            frappe.db.set_value(
                "AT Break Glass Request", request_doc.name, "status", "Expired"
            )
            return False, None

        # Calculate remaining time
        remaining = expires_at - now_dt
        remaining_minutes = int(remaining.total_seconds() / 60)

        # Log access check
        frappe.logger().info(
            f"Break-glass access validated: {request_doc.name} | "
            f"user={user} | access_type={access_type} | "
            f"remaining_minutes={remaining_minutes}"
        )

        return True, {
            "request_id": request_doc.name,
            "grant_type": access_type,
            "expires_at": str(expires_at),
            "remaining_minutes": remaining_minutes,
            "reference": f"{request_doc.reference_doctype}:{request_doc.reference_name}",
        }

    except Exception as e:
        frappe.logger().error(f"Error validating break-glass access: {str(e)}")
        return False, None


def expire_break_glass_grants():
    """Periodic job to mark expired grants as 'Expired' (run hourly via scheduler)."""
    try:
        now_dt = now_datetime()

        # Batch UPDATE instead of per-record set_value loop (N+1 fix)
        frappe.db.sql(
            """
            UPDATE `tabAT Break Glass Request`
            SET status = 'Expired', modified = NOW()
            WHERE status = 'Approved' AND expires_at_ts < %s
        """,
            (now_dt,),
        )
        count = frappe.db.sql("SELECT ROW_COUNT()", as_list=True)[0][0]

        if count:
            frappe.logger().info(
                f"Break-glass grant expiration job: {count} grants marked expired"
            )

        return {"expired": int(count or 0)}

    except Exception as e:
        frappe.logger().error(f"Break-glass expiration job failed: {str(e)}")
        return {"expired": 0, "error": str(e)}


def detect_break_glass_anomalies(window_hours: int = 48, threshold: int = 3) -> dict:
    """Detect users with repeated break-glass requests in a short time window.

    Returns summary:
    {
        "window_hours": 48,
        "threshold": 3,
        "anomaly_count": 1,
        "anomalies": [...]
    }
    """
    if threshold < 1:
        threshold = 1
    if window_hours < 1:
        window_hours = 1

    if not frappe.db.exists("DocType", "AT Break Glass Request"):
        return {
            "window_hours": window_hours,
            "threshold": threshold,
            "anomaly_count": 0,
            "anomalies": [],
        }

    since_dt = add_to_date(now_datetime(), hours=-window_hours)
    rows = frappe.db.sql(
        """
        SELECT
            `user`,
            COUNT(name) AS request_count,
            MIN(created_at_ts) AS first_request_at,
            MAX(created_at_ts) AS last_request_at
        FROM `tabAT Break Glass Request`
        WHERE created_at_ts >= %(since)s
        GROUP BY `user`
        HAVING COUNT(name) >= %(threshold)s
        ORDER BY request_count DESC, last_request_at DESC
        """,
        values={"since": since_dt, "threshold": threshold},
        as_dict=True,
    )

    anomalies = [
        {
            "user": row.user,
            "request_count": int(row.request_count or 0),
            "first_request_at": str(row.first_request_at)
            if row.first_request_at
            else None,
            "last_request_at": str(row.last_request_at)
            if row.last_request_at
            else None,
            "window_hours": window_hours,
        }
        for row in rows
    ]

    for anomaly in anomalies:
        frappe.log_error(
            title=f"[Break-Glass Audit] ANOMALY | {anomaly['user']}",
            message=(
                f"User: {anomaly['user']}\n"
                f"Request Count: {anomaly['request_count']}\n"
                f"Window (hours): {window_hours}\n"
                f"First Request: {anomaly['first_request_at']}\n"
                f"Last Request: {anomaly['last_request_at']}"
            ),
            reference_doctype="AT Break Glass Request",
        )

    return {
        "window_hours": window_hours,
        "threshold": threshold,
        "anomaly_count": len(anomalies),
        "anomalies": anomalies,
    }


def run_break_glass_audit_monitor() -> dict:
    """Scheduler entrypoint for periodic anomaly detection."""
    try:
        site_config = frappe.get_site_config()
        window_hours = int(
            site_config.get("at_break_glass_anomaly_window_hours", 48) or 48
        )
        threshold = int(site_config.get("at_break_glass_anomaly_threshold", 3) or 3)
        summary = detect_break_glass_anomalies(
            window_hours=window_hours, threshold=threshold
        )
        if summary.get("anomaly_count", 0) > 0:
            frappe.logger().warning(
                "Break-glass audit monitor detected %s anomalies in %s hours",
                summary.get("anomaly_count"),
                summary.get("window_hours"),
            )
        return summary
    except Exception as e:
        frappe.logger().error(f"Break-glass audit monitor failed: {str(e)}")
        return {"anomaly_count": 0, "error": str(e)}


def _log_break_glass_audit(
    request_id: str,
    user: str,
    access_type: str,
    action: str,  # 'approved', 'rejected', 'accessed', 'expired'
    approved_by: str | None = None,
    expires_at: str | None = None,
    reference_doctype: str | None = None,
    reference_name: str | None = None,
):
    """Log break-glass audit event to Frappe Error Log (internal audit trail)."""
    try:
        title = f"[Break-Glass Audit] {action.upper()} | {request_id}"
        message = (
            f"Request: {request_id}\n"
            f"User: {user}\n"
            f"Action: {action}\n"
            f"Access Type: {access_type}\n"
        )

        if approved_by:
            message += f"Approved By: {approved_by}\n"
        if expires_at:
            message += f"Expires At: {expires_at}\n"
        if reference_doctype and reference_name:
            message += f"Reference: {reference_doctype}:{reference_name}\n"

        frappe.log_error(
            title=title,
            message=message,
            reference_doctype="AT Break Glass Request",
            reference_name=request_id,
        )
    except Exception as e:
        frappe.logger().error(f"Failed to log break-glass audit event: {str(e)}")
