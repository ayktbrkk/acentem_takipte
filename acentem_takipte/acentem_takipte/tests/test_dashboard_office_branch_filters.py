from __future__ import annotations

from unittest import TestCase

import acentem_takipte.acentem_takipte.domains.reports.api.dashboard as dashboard_api
from acentem_takipte.acentem_takipte.domains.reports.api.dashboard_scopes import (
    _build_payment_collection_where,
    _build_payment_where,
    _build_policy_where,
)


class TestDashboardWhereQualification(TestCase):
    """Regression: JOIN'd dashboard preview queries raised
    "Column 'office_branch' in WHERE is ambiguous" because the scope
    builders emitted unqualified columns while the preview SQL aliases the
    main table (p / o) and joins `tabAT Customer`.
    """

    def test_policy_where_qualifies_with_alias(self):
        clause, values = _build_policy_where(
            from_date="2026-01-01",
            to_date="2026-02-01",
            branch="BR",
            office_branch="OB",
            allowed_customers=["C-1"],
            table_alias="p",
        )
        self.assertIn("p.issue_date", clause)
        self.assertIn("p.branch", clause)
        self.assertIn("p.office_branch", clause)
        self.assertIn("p.customer", clause)
        self.assertNotIn(" office_branch = %(office_branch)s", clause)
        self.assertEqual(values["office_branch"], "OB")

    def test_payment_where_qualifies_with_alias(self):
        clause, values = _build_payment_where(
            from_date="2026-01-01",
            to_date="2026-02-01",
            branch=None,
            office_branch="OB",
            allowed_customers=["C-1"],
            table_alias="p",
        )
        self.assertIn("p.payment_date", clause)
        self.assertIn("p.office_branch", clause)
        self.assertIn("p.customer", clause)
        self.assertNotIn(" office_branch = %(office_branch)s", clause)

    def test_payment_collection_where_qualifies_with_alias(self):
        clause, values = _build_payment_collection_where(
            anchor_date="2026-02-01",
            due_state="overdue",
            branch=None,
            office_branch="OB",
            allowed_customers=None,
            table_alias="p",
        )
        self.assertIn("p.status", clause)
        self.assertIn("p.due_date", clause)
        self.assertIn("p.office_branch", clause)
        self.assertNotIn(" office_branch = %(office_branch)s", clause)

    def test_offer_where_qualifies_with_alias(self):
        clause, values = dashboard_api._build_offer_where(
            from_date="2026-01-01",
            to_date="2026-02-01",
            branch="BR",
            office_branch="OB",
            allowed_customers=["C-1"],
            table_alias="o",
        )
        self.assertIn("o.offer_date", clause)
        self.assertIn("o.branch", clause)
        self.assertIn("o.customer", clause)
        self.assertNotIn(" branch = %(branch)s", clause)

    def test_unqualified_scope_still_emitted_for_single_table(self):
        clause, _ = _build_payment_where(
            from_date=None,
            to_date=None,
            branch=None,
            office_branch="OB",
            allowed_customers=None,
            table_alias=None,
        )
        self.assertIn("office_branch = %(office_branch)s", clause)
        self.assertNotIn("p.", clause)
