from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase as IntegrationTestCase
from frappe.utils import add_days, now_datetime, nowdate

from acentem_takipte.acentem_takipte.doctype.at_access_log.at_access_log import (
    log_decision_event,
    purge_access_logs,
)


class TestAccessLogImmutability(IntegrationTestCase):
    def tearDown(self) -> None:
        frappe.flags.pop("at_access_log_privileged", None)
        frappe.db.rollback()

    def _create_log(self, *, viewed_on=None, reference_name="CUST-001") -> str:
        log = frappe.get_doc(
            {
                "doctype": "AT Access Log",
                "reference_doctype": "AT Customer",
                "reference_name": reference_name,
                "viewed_by": frappe.session.user or "Administrator",
                "action": "View",
                "action_summary": "viewed",
                "viewed_on": viewed_on or now_datetime(),
            }
        )
        # ignore_links: audit-log insertion must not depend on the referenced
        # record existing (tests use synthetic reference names).
        log.insert(ignore_permissions=True, ignore_links=True)
        return log.name

    def test_update_rejected(self):
        log_name = self._create_log()
        log = frappe.get_doc("AT Access Log", log_name)
        log.action_summary = "tampered"
        with self.assertRaises(frappe.PermissionError):
            log.save(ignore_permissions=True)

    def test_delete_rejected(self):
        log_name = self._create_log()
        log = frappe.get_doc("AT Access Log", log_name)
        with self.assertRaises(frappe.PermissionError):
            log.delete()

    def test_rename_rejected(self):
        log_name = self._create_log()
        log = frappe.get_doc("AT Access Log", log_name)
        with self.assertRaises(frappe.PermissionError):
            log.rename("AT-LOG-99999")

    def test_privileged_cleanup_deletes_and_audits(self):
        old = self._create_log(viewed_on="2026-01-01 00:00:00", reference_name="OLD-001")
        recent = self._create_log(reference_name="RECENT-001")
        cutoff = add_days(nowdate(), -30)

        result = purge_access_logs(before=cutoff)

        self.assertEqual(result["deleted"], 1)
        self.assertFalse(frappe.db.exists("AT Access Log", old))
        self.assertTrue(frappe.db.exists("AT Access Log", recent))
        # The cleanup itself is audited.
        self.assertTrue(
            frappe.db.exists(
                "AT Access Log",
                {"decision_context": "access_log_retention_purge"},
            )
        )

    def test_cleanup_requires_cutoff(self):
        with self.assertRaises(Exception):
            purge_access_logs(before="")

    def test_access_log_schema_has_no_sensitive_columns(self):
        fields = {f.fieldname for f in frappe.get_meta("AT Access Log").fields}
        for sensitive in ("tax_id", "phone", "token", "password", "webhook", "secret", "tckn"):
            self.assertNotIn(sensitive, fields)

    def test_decision_event_stores_only_audit_fields(self):
        log_decision_event(
            "AT Policy",
            "POL-001",
            action="Edit",
            action_summary="Policy updated",
            decision_context="quick_aux_edit",
        )
        row = frappe.get_all(
            "AT Access Log",
            filters={"reference_doctype": "AT Policy", "reference_name": "POL-001", "action": "Edit"},
            fields=["reference_doctype", "reference_name", "action", "action_summary", "decision_context"],
            limit=1,
        )
        self.assertTrue(row)
        self.assertEqual(row[0]["action_summary"], "Policy updated")
        self.assertEqual(row[0]["decision_context"], "quick_aux_edit")
