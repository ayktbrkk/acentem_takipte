from __future__ import annotations

from unittest.mock import patch

from acentem_takipte.api.quick_create import create_quick_activity


def test_create_quick_activity_normalizes_payload_and_uses_service():
    with patch("acentem_takipte.api.quick_create._assert_create_permission") as permission_mock:
        with patch("acentem_takipte.api.quick_create.create_activity_service", return_value={"activity": "ACT-0001"}) as service_mock:
            with patch("acentem_takipte.api.quick_create.frappe.db.exists", return_value=True):
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
