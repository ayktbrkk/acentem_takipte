from __future__ import annotations

from unittest.mock import patch

from frappe.tests.utils import FrappeTestCase as IntegrationTestCase

from acentem_takipte.acentem_takipte.api import admin_jobs as admin_jobs_api
from acentem_takipte.acentem_takipte.api import communication as communication_api


class TestAdminCommunicationAccess(IntegrationTestCase):
    def test_dispatch_cycle_checks_only_outbox_write_permission(self):
        with patch.object(communication_api, "assert_mutation_access") as mutation_access:
            communication_api._assert_dispatch_mutation_access(
                "api.communication.run_dispatch_cycle",
                details={"limit": 10},
                permission_targets=communication_api.COMMUNICATION_MUTATION_DOCTYPES["run_dispatch_cycle"],
            )

        mutation_access.assert_called_once_with(
            action="api.communication.run_dispatch_cycle",
            roles=communication_api.COMMUNICATION_ADMIN_ROLES,
            doctype_permissions=("AT Notification Outbox",),
            details={"limit": 10},
            role_message="You do not have permission to run communication actions.",
            post_message="Only POST requests are allowed for communication mutations.",
        )

    def test_send_draft_now_checks_only_draft_write_permission(self):
        with patch.object(communication_api, "assert_mutation_access") as mutation_access:
            communication_api._assert_dispatch_mutation_access(
                "api.communication.send_draft_now",
                details={"draft": "DRAFT-1"},
                permission_targets=communication_api.COMMUNICATION_MUTATION_DOCTYPES["send_draft_now"],
            )

        mutation_access.assert_called_once_with(
            action="api.communication.send_draft_now",
            roles=communication_api.COMMUNICATION_ADMIN_ROLES,
            doctype_permissions=("AT Notification Draft",),
            details={"draft": "DRAFT-1"},
            role_message="You do not have permission to run communication actions.",
            post_message="Only POST requests are allowed for communication mutations.",
        )

    def test_admin_job_access_checks_action_specific_doctype_permissions(self):
        with patch.object(admin_jobs_api, "assert_authenticated", return_value="manager@example.com"):
            with patch.object(admin_jobs_api, "assert_role_based_write_access") as mutation_access:
                with patch.object(admin_jobs_api, "_assert_admin_job_rate_limit") as rate_mock:
                    admin_jobs_api._assert_admin_job_access("api.admin_jobs.run_accounting_sync_job", {"limit": 25})

        mutation_access.assert_called_once_with(
            action="api.admin_jobs.run_accounting_sync_job",
            roles=admin_jobs_api.ADMIN_JOB_ROLES,
            permission_targets=("AT Accounting Entry",),
            details={"limit": 25},
            role_message="You do not have permission to trigger admin jobs.",
            post_message="Only POST requests are allowed for admin job triggers.",
        )
        rate_mock.assert_called_once_with("manager@example.com", "api.admin_jobs.run_accounting_sync_job")

    def test_unknown_admin_job_action_skips_doctype_permission_gate(self):
        with patch.object(admin_jobs_api, "assert_authenticated", return_value="manager@example.com"):
            with patch.object(admin_jobs_api, "assert_role_based_write_access") as mutation_access:
                with patch.object(admin_jobs_api, "_assert_admin_job_rate_limit"):
                    admin_jobs_api._assert_admin_job_access("api.admin_jobs.custom_job", {})

        mutation_access.assert_called_once_with(
            action="api.admin_jobs.custom_job",
            roles=admin_jobs_api.ADMIN_JOB_ROLES,
            permission_targets=(),
            details={},
            role_message="You do not have permission to trigger admin jobs.",
            post_message="Only POST requests are allowed for admin job triggers.",
        )


