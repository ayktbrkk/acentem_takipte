"""
Break-glass request API endpoints.

Endpoints:
- POST /api/method/acentem_takipte.api.break_glass.create_request
  Body: {access_type, justification, reference_doctype?, reference_name?}
  → {ok, request_id, status, message}

- POST /api/method/acentem_takipte.api.break_glass.validate_access
  Body: {access_type, reference_doctype?, reference_name?}
  → {is_valid, remaining_minutes?, message}

- GET /api/method/acentem_takipte.api.break_glass.list_pending (SM only)
  → [{name, user, access_type, reference, created_at, justification}, ...]
"""

import frappe
from frappe import _
from frappe.utils import cint

from acentem_takipte.acentem_takipte.services.break_glass import (
    can_manage_break_glass,
    can_view_break_glass_audit,
)


@frappe.whitelist(methods=["POST"])
def create_request(
    access_type: str,
    justification: str,
    reference_doctype: str = "",
    reference_name: str = ""
) -> dict:
    """
    Create a new break-glass request for approval.
    
    Required params:
    - access_type: customer_data | customer_financials | system_admin | reporting_override
    - justification: Business reason (min 20 chars)
    
    Optional params:
    - reference_doctype: Target resource type
    - reference_name: Target resource ID
    
    Returns:
        {ok: True, request_id: str, status: "Pending", message: str}
    """
    try:
        from acentem_takipte.acentem_takipte.services.break_glass import create_break_glass_request
        
        return create_break_glass_request(
            access_type=access_type,
            justification=justification,
            reference_doctype=reference_doctype or None,
            reference_name=reference_name or None,
            user=frappe.session.user
        )
    
    except frappe.ValidationError as e:
        return {
            "ok": False,
            "error": str(e),
            "title": _("Request Failed")
        }
    except Exception as e:
        frappe.logger().error(f"Error creating break-glass request: {str(e)}")
        return {
            "ok": False,
            "error": _("Failed to create request. Please contact support."),
            "title": _("Server Error")
        }


@frappe.whitelist()
def validate_access(
    access_type: str,
    reference_doctype: str = "",
    reference_name: str = ""
) -> dict:
    """
    Check if current user has active break-glass grant for access type.
    
    Params:
    - access_type: Type of access to check
    - reference_doctype: Optional resource type (for context)
    - reference_name: Optional resource ID (for context)
    
    Returns:
        {is_valid: bool, remaining_minutes: int?, message: str}
    """
    try:
        from acentem_takipte.acentem_takipte.services.break_glass import validate_break_glass_access
        
        user = frappe.session.user
        is_valid, grant_info = validate_break_glass_access(
            user=user,
            access_type=access_type,
            reference_doctype=reference_doctype or None,
            reference_name=reference_name or None
        )
        
        if is_valid and grant_info:
            return {
                "is_valid": True,
                "remaining_minutes": grant_info["remaining_minutes"],
                "expires_at": grant_info["expires_at"],
                "message": _("You have active break-glass access until {0}").format(
                    grant_info["expires_at"]
                )
            }
        else:
            return {
                "is_valid": False,
                "remaining_minutes": 0,
                "message": _("No active break-glass grant for {0}").format(access_type)
            }
    
    except Exception as e:
        frappe.logger().error(f"Error validating break-glass access: {str(e)}")
        return {
            "is_valid": False,
            "error": str(e),
            "message": _("Error validating access")
        }


@frappe.whitelist()
def list_pending() -> list:
    """
    List all pending break-glass requests (System Manager only).
    
    Returns:
        [{name, user, access_type, reference, created_at, justification}, ...]
    """
    # Check permissions
    if not can_manage_break_glass(frappe.session.user):
        frappe.throw(
            _("Only System Managers can view pending requests"),
            title=_("Permission Denied")
        )
    
    try:
        from acentem_takipte.acentem_takipte.doctype.at_break_glass_request.at_break_glass_request import (
            get_pending_requests_for_approval
        )
        
        requests = get_pending_requests_for_approval()
        
        # Format response
        return [
            {
                "name": req["name"],
                "user": req["user"],
                "access_type": req["access_type"],
                "reference": f"{req.get('reference_doctype', 'N/A')}:{req.get('reference_name', 'N/A')}",
                "created_at": str(req["created_at_ts"]),
                "justification": req["justification"][:100] + "..." if len(req.get("justification", "")) > 100 else req["justification"]
            }
            for req in requests
        ]
    
    except Exception as e:
        frappe.logger().error(f"Error listing pending requests: {str(e)}")
        return []


@frappe.whitelist()
def list_audit_events(limit: str = "50", user: str = "") -> list:
    """List break-glass audit events for authorized reviewers.

    audit(whitelist-usage): No active `frontend/src` caller was found during the
    May 2026 audit. Keep the endpoint because compliance reviewers may still hit
    it via manual/admin tooling outside the SPA.

    Only users with break-glass audit access can read this endpoint.
    """
    if not can_view_break_glass_audit(frappe.session.user):
        frappe.throw(
            _("Only System Managers or Compliance users can view break-glass audit logs"),
            title=_("Permission Denied"),
        )

    limit_rows = max(1, min(cint(limit or 50), 200))
    filters = {}
    user_filter = (user or "").strip()
    if user_filter:
        filters["user"] = user_filter

    rows = frappe.get_all(
        "AT Break Glass Request",
        filters=filters,
        fields=[
            "name",
            "user",
            "access_type",
            "status",
            "approved_by",
            "created_at_ts",
            "approved_at_ts",
            "expires_at_ts",
            "reference_doctype",
            "reference_name",
        ],
        order_by="created_at_ts desc",
        limit_page_length=limit_rows,
    )

    return [
        {
            "name": row.get("name"),
            "user": row.get("user"),
            "access_type": row.get("access_type"),
            "status": row.get("status"),
            "approved_by": row.get("approved_by"),
            "created_at": str(row.get("created_at_ts") or ""),
            "approved_at": str(row.get("approved_at_ts") or ""),
            "expires_at": str(row.get("expires_at_ts") or ""),
            "reference": f"{row.get('reference_doctype') or 'N/A'}:{row.get('reference_name') or 'N/A'}",
        }
        for row in rows
    ]


@frappe.whitelist(methods=["POST"])
def approve_request(
    request_id: str,
    duration_hours: str = "24",
    approver_comments: str = ""
) -> dict:
    """
    Approve a break-glass request (System Manager only).
    
    Params:
    - request_id: AT Break Glass Request ID
    - duration_hours: Grant validity (1-72h, default 24h)
    - approver_comments: Optional comment
    
    Returns:
        {ok: True, request_id: str, expires_at: str, message: str}
    """
    # Check permissions
    if not can_manage_break_glass(frappe.session.user):
        frappe.throw(
            _("Only System Managers can approve requests"),
            title=_("Permission Denied")
        )
    
    try:
        from acentem_takipte.acentem_takipte.services.break_glass import approve_break_glass_request
        
        return approve_break_glass_request(
            request_id=request_id,
            duration_hours=cint(duration_hours),
            approver_comments=approver_comments or None,
            approver=frappe.session.user
        )
    
    except frappe.ValidationError as e:
        return {
            "ok": False,
            "error": str(e),
            "title": _("Approval Failed")
        }
    except Exception as e:
        frappe.logger().error(f"Error approving request: {str(e)}")
        return {
            "ok": False,
            "error": _("Failed to approve request"),
            "title": _("Server Error")
        }


@frappe.whitelist(methods=["POST"])
def reject_request(
    request_id: str,
    approver_comments: str = ""
) -> dict:
    """
    Reject a break-glass request (System Manager only).
    
    Params:
    - request_id: AT Break Glass Request ID
    - approver_comments: Reason for rejection
    
    Returns:
        {ok: True, request_id: str, message: str}
    """
    # Check permissions
    if not can_manage_break_glass(frappe.session.user):
        frappe.throw(
            _("Only System Managers can reject requests"),
            title=_("Permission Denied")
        )
    
    try:
        from acentem_takipte.acentem_takipte.services.break_glass import reject_break_glass_request
        
        return reject_break_glass_request(
            request_id=request_id,
            approver_comments=approver_comments or None,
            approver=frappe.session.user
        )
    
    except frappe.ValidationError as e:
        return {
            "ok": False,
            "error": str(e),
            "title": _("Rejection Failed")
        }
    except Exception as e:
        frappe.logger().error(f"Error rejecting request: {str(e)}")
        return {
            "ok": False,
            "error": _("Failed to reject request"),
            "title": _("Server Error")
        }
