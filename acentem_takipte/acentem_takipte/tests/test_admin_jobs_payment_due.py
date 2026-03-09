from __future__ import annotations

from unittest.mock import patch

from frappe.tests import IntegrationTestCase

from acentem_takipte.acentem_takipte.api import admin_jobs


class TestAdminJobPaymentDueAccess(IntegrationTestCase):
    def test_payment_due_job_uses_shared_mutation_access_helper(self):
        with patch.object(admin_jobs, "assert_authenticated", return_value="manager@example.com"):
            with patch.object(admin_jobs, "assert_mutation_access") as mutation_access:
                with patch.object(admin_jobs, "_assert_admin_job_rate_limit"):
                    admin_jobs._assert_admin_job_access("api.admin_jobs.run_payment_due_job", {"limit": 5})

        mutation_access.assert_called_once_with(
            action="api.admin_jobs.run_payment_due_job",
            roles=admin_jobs.ADMIN_JOB_ROLES,
            doctype_permissions=("AT Payment", "AT Notification Draft"),
            details={"limit": 5},
            role_message="You do not have permission to trigger admin jobs.",
            post_message="Only POST requests are allowed for admin job triggers.",
        )
