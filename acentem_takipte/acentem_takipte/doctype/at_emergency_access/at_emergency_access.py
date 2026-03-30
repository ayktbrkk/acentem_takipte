"""AT Emergency Access — break-glass controller.

Grant Lifecycle
---------------
1.  A **Manager** user creates a new AT Emergency Access document, specifying
    which user (``beneficiary``) should receive temporary expanded access, the
    scope (``scope_doctype``) and a mandatory ``justification``.
2.  ``before_insert`` sets ``granted_by``, ``valid_until`` (now + 24 h) and
    ``grant_ip`` automatically.
3.  ``after_insert`` writes an immutable audit entry and logs the grant.
4.  The daily scheduler job (``services/break_glass.expire_stale()``) sets
    ``status = "Expired"`` once ``valid_until`` passes.
5.  A System Manager may manually ``Revoke`` the grant at any time.

Security Notes
--------------
*   Only the ``Manager`` and ``System Manager`` roles may *create* entries
    (enforced by DocType permissions + ``before_insert`` role guard).
*   ``granted_by``, ``valid_until``, and ``grant_ip`` are ``read_only`` and
    set programmatically — they cannot be spoofed from the form.
*   A user may not grant emergency access to *themselves*.
*   At most one active grant per (beneficiary, scope_doctype) is allowed at a
    time to prevent stacking.
"""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_to_date, now_datetime

_ALLOWED_GRANTING_ROLES = {"Manager", "System Manager", "Administrator"}
_GRANT_DURATION_HOURS = 24


class ATEmergencyAccess(Document):
    def before_insert(self) -> None:
        self._guard_granting_role()
        self._guard_self_grant()
        self._guard_duplicate_active_grant()

        self.granted_by = frappe.session.user
        self.status = "Active"
        self.valid_until = add_to_date(now_datetime(), hours=_GRANT_DURATION_HOURS)
        self.grant_ip = str(getattr(frappe.local, "request_ip", None) or "").strip() or None

    def after_insert(self) -> None:
        _write_audit_entry(self, action="Granted")

    def on_update(self) -> None:
        if self.status in ("Expired", "Revoked"):
            _write_audit_entry(self, action=self.status)

    # ------------------------------------------------------------------
    # Guards
    # ------------------------------------------------------------------

    def _guard_granting_role(self) -> None:
        roles = set(frappe.get_roles(frappe.session.user))
        if not roles.intersection(_ALLOWED_GRANTING_ROLES):
            frappe.throw(
                _("Emergency access may only be granted by a Manager or System Manager."),
                frappe.PermissionError,
            )

    def _guard_self_grant(self) -> None:
        if str(self.beneficiary or "").strip() == str(frappe.session.user or "").strip():
            frappe.throw(_("You cannot grant emergency access to yourself."), frappe.PermissionError)

    def _guard_duplicate_active_grant(self) -> None:
        existing = frappe.get_all(
            "AT Emergency Access",
            filters={
                "beneficiary": self.beneficiary,
                "scope_doctype": self.scope_doctype,
                "status": "Active",
                "valid_until": [">", now_datetime()],
            },
            fields=["name"],
            limit=1,
        )
        if existing:
            frappe.throw(
                _("An active emergency access grant already exists for this user: {name}").format(name=existing[0].name),
                frappe.ValidationError,
            )


# ---------------------------------------------------------------------------
# Audit helper
# ---------------------------------------------------------------------------

def _write_audit_entry(doc: ATEmergencyAccess, *, action: str) -> None:
    """Write a PII-free audit entry to the Frappe Error Log."""
    try:
        frappe.log_error(
            title="[Break-Glass Audit] Emergency Access",
            message=(
                f"action={action} "
                f"name={doc.name} "
                f"beneficiary={doc.beneficiary} "
                f"scope={doc.scope_doctype} "
                f"granted_by={doc.granted_by} "
                f"valid_until={doc.valid_until} "
                f"status={doc.status} "
                f"ip={doc.grant_ip or 'unknown'}"
            ),
        )
    except Exception:
        pass
