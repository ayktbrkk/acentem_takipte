from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from acentem_takipte.api import communication as communication_api
from acentem_takipte.services import campaigns as campaigns_service


def test_execute_campaign_creates_drafts_for_matched_customers():
    campaign_doc = MagicMock()
    campaign_doc.name = "AT-CAMP-2026-00001"
    campaign_doc.template = "TPL-001"
    campaign_doc.segment = "AT-SEG-2026-00001"
    campaign_doc.channel = "WHATSAPP"
    campaign_doc.office_branch = "IST"
    campaign_doc.status = "Draft"
    campaign_doc.sent_count = 0

    template_doc = SimpleNamespace(
        name="TPL-001",
        event_key="renewal_campaign",
        language="tr",
        subject="Hatirlatma",
        provider_template_name="renewal_template",
        get=lambda key: "Merhaba",
    )

    inserted_draft = SimpleNamespace(name="DRF-001")
    inserted_doc = MagicMock()
    inserted_doc.insert.return_value = inserted_draft

    with patch.object(campaigns_service.frappe, "get_doc", side_effect=[campaign_doc, template_doc, inserted_doc]):
        with patch.object(
            campaigns_service,
            "build_segment_membership_preview",
            return_value={
                "summary": {"matched_count": 1},
                "customers": [{"name": "CUST-001"}],
            },
        ):
            with patch.object(
                campaigns_service.frappe.db,
                "get_value",
                return_value={"name": "CUST-001", "phone": "05550001122", "email": "a@example.com", "office_branch": "IST"},
            ):
                with patch.object(campaigns_service.communication_logic, "enqueue_notification_draft") as enqueue_mock:
                    with patch.object(campaigns_service, "log_decision_event") as audit_mock:
                        result = campaigns_service.execute_campaign("AT-CAMP-2026-00001", limit=50)

    enqueue_mock.assert_called_once_with("DRF-001")
    audit_mock.assert_called_once_with(
        "AT Campaign",
        "AT-CAMP-2026-00001",
        action="Run",
        action_summary="Campaign executed via segment AT-SEG-2026-00001",
        decision_context="created=1;skipped=0;matched=1",
    )
    inserted_doc.insert.assert_called_once_with(ignore_permissions=True)
    assert campaign_doc.sent_count == 1
    assert campaign_doc.status == "Completed"
    assert result["created"] == 1
    assert result["matched_customers"] == 1


def test_execute_campaign_api_uses_permission_chain_and_service():
    with patch.object(communication_api, "_assert_dispatch_mutation_access") as access_mock:
        with patch.object(communication_api, "assert_doc_permission") as doc_perm_mock:
            with patch.object(
                communication_api,
                "execute_campaign_service",
                return_value={"campaign": "AT-CAMP-2026-00001", "created": 3},
            ) as service_mock:
                payload = communication_api.execute_campaign("AT-CAMP-2026-00001", limit=25)

    access_mock.assert_called_once()
    doc_perm_mock.assert_called_once_with("AT Campaign", "AT-CAMP-2026-00001", "write")
    service_mock.assert_called_once_with("AT-CAMP-2026-00001", limit=25)
    assert payload == {"campaign": "AT-CAMP-2026-00001", "created": 3}


def test_execute_due_campaigns_runs_due_planned_campaigns():
    with patch.object(
        campaigns_service.frappe,
        "get_all",
        return_value=[
            {"name": "AT-CAMP-2026-00001"},
            {"name": "AT-CAMP-2026-00002"},
        ],
    ):
        with patch.object(
            campaigns_service,
            "execute_campaign",
            side_effect=[
                {"campaign": "AT-CAMP-2026-00001", "created": 2, "skipped": 1, "matched_customers": 3},
                {"campaign": "AT-CAMP-2026-00002", "created": 0, "skipped": 2, "matched_customers": 2},
            ],
        ) as execute_mock:
            payload = campaigns_service.execute_due_campaigns(limit=10, member_limit=50)

    assert execute_mock.call_count == 2
    execute_mock.assert_any_call("AT-CAMP-2026-00001", limit=50)
    execute_mock.assert_any_call("AT-CAMP-2026-00002", limit=50)
    assert payload["processed"] == 2
    assert payload["created"] == 2
    assert payload["skipped"] == 3
    assert len(payload["campaigns"]) == 2
