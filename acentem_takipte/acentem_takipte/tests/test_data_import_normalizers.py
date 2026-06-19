from __future__ import annotations

from unittest.mock import patch

from acentem_takipte.acentem_takipte.services.data_import import normalizers


def _policy_fields(**overrides):
    base = {
        "customer": "11111111110",
        "sales_entity": "SE-001",
        "insurance_company": "IC-001",
        "branch": "BR-001",
        "policy_no": "POL-IMPORT-001",
        "issue_date": "2026-06-01",
        "start_date": "2026-06-01",
        "gross_premium": "1230",
    }
    base.update(overrides)
    return base


@patch(
    "acentem_takipte.acentem_takipte.services.data_import.normalizers.resolve_link_ref",
    side_effect=lambda doctype, value, required=False: (value, None),
)
@patch(
    "acentem_takipte.acentem_takipte.services.data_import.normalizers.resolve_customer_ref",
    return_value=("CUST-001", None),
)
def test_normalize_policy_row_derives_end_date_from_start_date(_mock_customer, _mock_link):
    payload, error = normalizers.normalize_policy_row(_policy_fields(), office_branch="IST")

    assert error is None
    assert payload["end_date"] == "2027-06-01"


@patch(
    "acentem_takipte.acentem_takipte.services.data_import.normalizers.resolve_link_ref",
    side_effect=lambda doctype, value, required=False: (value, None),
)
@patch(
    "acentem_takipte.acentem_takipte.services.data_import.normalizers.resolve_customer_ref",
    return_value=("CUST-001", None),
)
def test_normalize_policy_row_keeps_explicit_end_date(_mock_customer, _mock_link):
    payload, error = normalizers.normalize_policy_row(
        _policy_fields(end_date="2026-12-31"),
        office_branch="IST",
    )

    assert error is None
    assert payload["end_date"] == "2026-12-31"
