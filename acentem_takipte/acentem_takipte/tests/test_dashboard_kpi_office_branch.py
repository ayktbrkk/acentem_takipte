from __future__ import annotations

from acentem_takipte.api import dashboard


def test_build_policy_where_keeps_branch_and_office_branch_separate():
    where_clause, values = dashboard._build_policy_where(
        from_date=None,
        to_date=None,
        branch="AUTO",
        office_branch="BR-IST",
        allowed_customers=None,
    )

    assert "branch = %(branch)s" in where_clause
    assert "office_branch = %(office_branch)s" in where_clause
    assert values["branch"] == "AUTO"
    assert values["office_branch"] == "BR-IST"


def test_build_lead_where_applies_office_branch_filter():
    where_clause, values = dashboard._build_lead_where(
        branch="KASKO",
        office_branch="BR-ANK",
        allowed_customers=None,
    )

    assert "branch = %(branch)s" in where_clause
    assert "office_branch = %(office_branch)s" in where_clause
    assert values["branch"] == "KASKO"
    assert values["office_branch"] == "BR-ANK"


def test_build_payment_where_applies_office_branch_filter_directly():
    where_clause, values = dashboard._build_payment_where(
        from_date=None,
        to_date=None,
        branch=None,
        office_branch="BR-IZM",
        allowed_customers=None,
    )

    assert "office_branch = %(office_branch)s" in where_clause
    assert values["office_branch"] == "BR-IZM"


def test_build_offer_where_filters_by_customer_office_branch():
    where_clause, values = dashboard._build_offer_where(
        from_date=None,
        to_date=None,
        branch=None,
        office_branch="BR-IST",
        allowed_customers=None,
    )

    assert "customer in (select name from `tabAT Customer` where office_branch = %(office_branch)s)" in where_clause
    assert values["office_branch"] == "BR-IST"
