from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from acentem_takipte.acentem_takipte.api.quick_create import create_quick_activity
from acentem_takipte.acentem_takipte.services import quick_create_workflow


@pytest.fixture(autouse=True)
def _mock_frappe_runtime(monkeypatch):
    monkeypatch.setattr(quick_create_workflow, "_", lambda value: value, raising=False)
    monkeypatch.setattr(
        quick_create_workflow.frappe,
        "local",
        MagicMock(request=object(), flags=MagicMock(in_test=True)),
        raising=False,
    )
    monkeypatch.setattr(quick_create_workflow.frappe, "db", MagicMock(), raising=False)


def test_create_quick_activity_normalizes_payload_and_uses_service():
    with patch.object(quick_create_workflow, "_assert_create_permission") as permission_mock:
        with patch.object(quick_create_workflow, "_resolve_office_branch", return_value="IST"):
            with patch.object(quick_create_workflow, "create_activity_service", return_value={"activity": "ACT-0001"}) as service_mock:
                with patch.object(quick_create_workflow.frappe.db, "exists", return_value=True):
                    result = create_quick_activity(
                        activity_title=" Claim reviewed ",
                        activity_type="Review",
                        source_doctype="AT Claim",
                        source_name="CLM-001",
                        customer="CUST-001",
                        policy="POL-001",
                        claim="CLM-001",
                        assigned_to="agent@example.com",
                        status="Logged",
                        notes=" Follow-up completed ",
                    )

    permission_mock.assert_called_once()
    service_mock.assert_called_once()
    payload = service_mock.call_args.args[0]
    assert payload["activity_title"] == "Claim reviewed"
    assert payload["activity_type"] == "Review"
    assert payload["source_doctype"] == "AT Claim"
    assert payload["source_name"] == "CLM-001"
    assert payload["customer"] == "CUST-001"
    assert payload["policy"] == "POL-001"
    assert payload["claim"] == "CLM-001"
    assert payload["assigned_to"] == "agent@example.com"
    assert payload["status"] == "Logged"
    assert payload["notes"] == "Follow-up completed"
    assert result == {"activity": "ACT-0001"}

