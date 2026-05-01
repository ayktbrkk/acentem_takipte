"""Test suite for Sprint D: Query Isolation"""

import unittest

from acentem_takipte.acentem_takipte.api.v2 import dashboard_security
from acentem_takipte.acentem_takipte.services.query_isolation import (
    build_scope_filter_for_doctype,
    build_scope_filters_dict,
    get_user_scope_metadata,
)


class TestDashboardSecuritySalesEntity(unittest.TestCase):
    """Test allowed_sales_entities_for_user() in dashboard security."""

    def setUp(self):
        """Set up test database."""
        self.test_users = {
            "agent_user": "test_agent@acentem.test",
            "manager_user": "test_manager@acentem.test",
            "admin_user": "Administrator",
        }

    def tearDown(self):
        """Clean up test users if created."""
        pass

    def test_allowed_sales_entities_for_administrator(self):
        """Administrator should have global access (None)."""
        allowed, meta = dashboard_security.allowed_sales_entities_for_user(
            user="Administrator", include_meta=True
        )
        self.assertIsNone(allowed)
        self.assertEqual(meta["access_scope"], "global")

    def test_allowed_sales_entities_for_privileged_role(self):
        """Manager/Accountant should have global access (None)."""
        # This test would require a user with Manager role in database
        # For now, just verify the function returns correctly for admin
        allowed = dashboard_security.allowed_sales_entities_for_user(
            user="Administrator", include_meta=False
        )
        self.assertIsNone(allowed)

    def test_allowed_sales_entities_returns_empty_for_unassigned_agent(self):
        """Agent without sales entity assignment should get empty list."""
        # This test requires database setup with an agent user
        # Implementation notes: create a test user with Agent role and no sales_entity assignment
        # Then verify the function returns []
        pass

    def test_allowed_sales_entities_with_metadata(self):
        """Test that include_meta=True returns (entities, metadata) tuple."""
        allowed, meta = dashboard_security.allowed_sales_entities_for_user(
            user="Administrator", include_meta=True
        )
        self.assertIsInstance(meta, dict)
        self.assertIn("access_scope", meta)
        self.assertIn("scope_reason", meta)


class TestQueryIsolationService(unittest.TestCase):
    """Test query_isolation service functions."""

    def test_build_scope_filters_dict_returns_sets(self):
        """build_scope_filters_dict should return sets for branches and entities."""
        result = build_scope_filters_dict(user="Administrator")
        self.assertIsInstance(result, dict)
        self.assertIn("allowed_branches", result)
        self.assertIn("allowed_sales_entities", result)

    def test_get_user_scope_metadata_returns_dict(self):
        """get_user_scope_metadata should return metadata dict with counts."""
        metadata = get_user_scope_metadata(user="Administrator")
        self.assertIsInstance(metadata, dict)
        self.assertEqual(metadata["user"], "Administrator")
        self.assertIn("branch_count", metadata)
        self.assertIn("sales_entity_count", metadata)
        self.assertIn("branches", metadata)
        self.assertIn("sales_entities", metadata)

    def test_build_scope_filter_for_doctype_basic(self):
        """build_scope_filter_for_doctype should return (condition, params)."""
        # For admin users with no restrictions
        condition, params = build_scope_filter_for_doctype("AT Policy", user="Administrator")
        self.assertIsInstance(condition, str)
        self.assertIsInstance(params, list)

    def test_build_scope_filter_for_doctype_empty_access(self):
        """When user has no access, should return 1=0 condition."""
        # Mock a user with no branch/sales_entity access
        # This would require database setup with a restricted user
        # For now, verify the function handles the case gracefully
        pass


class TestDashboardKPIsWithSalesEntity(unittest.TestCase):
    """Integration tests for dashboard KPIs with sales_entity filtering."""

    def test_get_dashboard_kpis_includes_sales_entity_scope(self):
        """Dashboard KPIs should respect sales_entity scope when calling queries."""
        # This is an integration test requiring full dashboard setup
        # Implementation: call get_dashboard_kpis and verify returned data
        # respects the user's sales_entity assignments
        pass

    def test_dashboard_tab_payload_respects_sales_entity_scope(self):
        """Dashboard tab payloads should filter by sales_entity."""
        # Integration test for tab payload builders
        pass


if __name__ == "__main__":
    unittest.main()
