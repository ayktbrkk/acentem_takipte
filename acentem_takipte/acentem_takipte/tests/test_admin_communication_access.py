from __future__ import annotations

from unittest.mock import call, patch

from frappe.tests import IntegrationTestCase

from acentem_takipte.acentem_takipte.api import admin_jobs as admin_jobs_api
from acentem_takipte.acentem_takipte.api import communication as communication_api


class TestAdminCommunicationAccess(IntegrationTestCase):
    def test_dispatch_cycle_checks_only_outbox_write_permission(self):
        with patch.object(communication_api, "assert_authenticated", return_value="manager@example.com"):
            with patch.object(communication_api, "assert_post_request") as post_mock:
                with patch.object(communication_api, "assert_roles") as roles_mock:
                    with patch.object(communication_api, "assert_doctype_permission") as doctype_mock:
                        with patch.object(communication_api, "audit_admin_action") as audit_mock:
                            communication_api._assert_dispatch_mutation_access(
                                "api.communication.run_dispatch_cycle",
                                details={"limit": 10},
                                permission_targets=communication_api.COMMUNICATION_MUTATION_DOCTYPES["run_dispatch_cycle"],
                            )

        post_mock.assert_called_once()
        roles_mock.assert_called_once()
        doctype_mock.assert_called_once_with(
            "AT Notification Outbox",
            "write",
            "You do not have permission to modify AT Notification Outbox records.",
        )
        audit_mock.assert_called_once_with("api.communication.run_dispatch_cycle", {"limit": 10})

    def test_send_draft_now_checks_only_draft_write_permission(self):
        with patch.object(communication_api, "assert_authenticated", return_value="manager@example.com"):
            with patch.object(communication_api, "assert_post_request"):
                with patch.object(communication_api, "assert_roles"):
                    with patch.object(communication_api, "assert_doctype_permission") as doctype_mock:
                        with patch.object(communication_api, "audit_admin_action"):
                            communication_api._assert_dispatch_mutation_access(
                                "api.communication.send_draft_now",
                                details={"draft": "DRAFT-1"},
                                permission_targets=communication_api.COMMUNICATION_MUTATION_DOCTYPES["send_draft_now"],
                            )

        doctype_mock.assert_called_once_with(
            "AT Notification Draft",
            "write",
            "You do not have permission to modify AT Notification Draft records.",
        )

    def test_admin_job_access_checks_action_specific_doctype_permissions(self):
        with patch.object(admin_jobs_api, "assert_authenticated", return_value="manager@example.com"):
            with patch.object(admin_jobs_api, "assert_post_request") as post_mock:
                with patch.object(admin_jobs_api, "assert_roles") as roles_mock:
                    with patch.object(admin_jobs_api, "assert_doctype_permission") as doctype_mock:
                        with patch.object(admin_jobs_api, "_assert_admin_job_rate_limit") as rate_mock:
                            with patch.object(admin_jobs_api, "audit_admin_action") as audit_mock:
                                admin_jobs_api._assert_admin_job_access(
                                    "api.admin_jobs.run_accounting_sync_job",
                                    {"limit": 25},
                                )

        post_mock.assert_called_once()
        roles_mock.assert_called_once()
        doctype_mock.assert_called_once_with(
            "AT Accounting Entry",
            "write",
            "You do not have permission to trigger admin jobs for AT Accounting Entry.",
        )
        rate_mock.assert_called_once_with("manager@example.com", "api.admin_jobs.run_accounting_sync_job")
        audit_mock.assert_called_once_with("api.admin_jobs.run_accounting_sync_job", {"limit": 25})

    def test_unknown_admin_job_action_skips_doctype_permission_gate(self):
        with patch.object(admin_jobs_api, "assert_authenticated", return_value="manager@example.com"):
            with patch.object(admin_jobs_api, "assert_post_request"):
                with patch.object(admin_jobs_api, "assert_roles"):
                    with patch.object(admin_jobs_api, "assert_doctype_permission") as doctype_mock:
                        with patch.object(admin_jobs_api, "_assert_admin_job_rate_limit"):
                            with patch.object(admin_jobs_api, "audit_admin_action"):
                                admin_jobs_api._assert_admin_job_access("api.admin_jobs.custom_job", {})

        doctype_mock.assert_not_called()
