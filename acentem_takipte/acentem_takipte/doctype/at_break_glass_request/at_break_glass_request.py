"""
AT Break Glass Request doctype with validation and approval workflow.

Fields:
- user: Who requested access
- access_type: customer_data | customer_financials | system_admin | reporting_override
- reference_doctype/reference_name: Optional target resource
- justification: Business reason (min 20 chars)
- status: Pending | Approved | Rejected | Expired (read-only after creation)
- approved_by: System manager who approved
- approver_comments: Approval/rejection reasoning
- duration_hours: Access validity (24h default, 1-72h range)
- created_at_ts, approved_at_ts, expires_at_ts: Audit timestamps

Workflow:
    Request created → Pending → [Approved (expires_at set) | Rejected]
    Approved grants automatically expire via scheduled job
"""

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime, add_to_date

from acentem_takipte.acentem_takipte.services.break_glass import can_manage_break_glass


class ATBreakGlassRequest(Document):
    def validate(self):
        """Validate request fields before save."""
        # Justify length check
        if not self.justification or len(self.justification.strip()) < 20:
            frappe.throw(
                _("Justification must be at least 20 characters"),
                title=_("Justification Too Short")
            )
        
        # Access type validation
        valid_types = ["customer_data", "customer_financials", "system_admin", "reporting_override"]
        if self.access_type not in valid_types:
            frappe.throw(
                _("Invalid access type. Must be one of: {0}").format(", ".join(valid_types)),
                title=_("Invalid Access Type")
            )
        
        # Prevent duplicate pending requests
        if not self.name:  # New document
            existing = frappe.db.count(
                "AT Break Glass Request",
                filters={
                    "user": self.user,
                    "access_type": self.access_type,
                    "status": "Pending"
                }
            )
            if existing > 0:
                frappe.throw(
                    _("You already have a pending request for {0} access").format(
                        self.access_type
                    ),
                    title=_("Duplicate Pending Request")
                )
        
        # Set initial timestamp if new
        if not self.created_at_ts:
            self.created_at_ts = now_datetime()
        
        # Default status to Pending if not set
        if not self.status:
            self.status = "Pending"
        
        # Duration validation if setting approval
        if self.duration_hours:
            if self.duration_hours < 1 or self.duration_hours > 72:
                frappe.throw(
                    _("Duration must be between 1 and 72 hours"),
                    title=_("Invalid Duration")
                )
    
    def before_submit(self):
        """Set timestamps before marking as submitted."""
        if not self.approved_at_ts and self.status == "Approved":
            self.approved_at_ts = now_datetime()
        
        if not self.expires_at_ts and self.status == "Approved" and self.duration_hours:
            self.expires_at_ts = add_to_date(
                self.approved_at_ts or now_datetime(),
                hours=self.duration_hours
            )
        
        # Enforce only System Manager can approve
        if self.status == "Approved" and not can_manage_break_glass(frappe.session.user):
            frappe.throw(
                _("Only System Managers can approve break-glass requests"),
                title=_("Permission Denied")
            )
    
    def on_submit(self):
        """Log audit event after document submission."""
        action = "approved" if self.status == "Approved" else "rejected"
        
        title = f"[Break-Glass Audit] {action.upper()} | {self.name}"
        message = (
            f"Request: {self.name}\n"
            f"User: {self.user}\n"
            f"Action: {action}\n"
            f"Access Type: {self.access_type}\n"
            f"Status: {self.status}\n"
        )
        
        if self.approved_by:
            message += f"Approved By: {self.approved_by}\n"
        if self.expires_at_ts:
            message += f"Expires At: {self.expires_at_ts}\n"
        if self.reference_doctype and self.reference_name:
            message += f"Reference: {self.reference_doctype}:{self.reference_name}\n"
        
        frappe.log_error(
            title=title,
            message=message,
            reference_doctype="AT Break Glass Request",
            reference_name=self.name
        )
        
        frappe.logger().info(
            f"Break-glass request {action}: {self.name} | "
            f"user={self.user} | access_type={self.access_type}"
        )


def get_permission_query_conditions(user=None):
    user = str(user or frappe.session.user or "").strip()
    if not user or user == "Guest":
        return "1=0"
    if can_manage_break_glass(user):
        return ""

    escaped_user = frappe.db.escape(user)
    return f"`tabAT Break Glass Request`.`user` = {escaped_user}"


def has_permission(doc, user=None, permission_type="read"):
    user = str(user or frappe.session.user or "").strip()
    if not user or user == "Guest":
        return False
    if can_manage_break_glass(user):
        return True

    return str(getattr(doc, "user", "") or "").strip() == user


def get_pending_requests_for_approval():
    """List all pending break-glass requests (for approver dashboard)."""
    return frappe.get_all(
        "AT Break Glass Request",
        filters={"status": "Pending"},
        fields=[
            "name", "user", "access_type", "reference_doctype", 
            "reference_name", "created_at_ts", "justification"
        ],
        order_by="created_at_ts asc"
    )


def get_user_active_grants(user: str) -> list:
    """Get all active (non-expired) break-glass grants for a user."""
    from frappe.utils import now_datetime
    now_dt = now_datetime()
    
    return frappe.get_all(
        "AT Break Glass Request",
        filters={
            "user": user,
            "status": "Approved",
            "expires_at_ts": [">", now_dt]
        },
        fields=[
            "name", "access_type", "reference_doctype", 
            "reference_name", "expires_at_ts", "approved_by"
        ],
        order_by="expires_at_ts asc"
    )
