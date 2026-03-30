from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

from acentem_takipte.acentem_takipte.api import communication as communication_api
from acentem_takipte.acentem_takipte.services import segments as segments_module
from acentem_takipte.acentem_takipte.services.segments import build_segment_membership_preview


def test_build_segment_membership_preview_filters_customers_from_criteria(monkeypatch):
    segment = SimpleNamespace(
        name="AT-SEG-2026-00001",
        segment_name="Renewal Risk",
        segment_type="Operational",
        channel_focus="WHATSAPP",
        status="Active",
        office_branch="IST",
        criteria_json='{"min_active_policy_count":1,"has_overdue_installment":true,"renewal_window_days":30}',
    )

    monkeypatch.setattr(
        segments_module.frappe,
        "db",
        SimpleNamespace(
            sql=lambda *args, **kwargs: [
                segments_module.frappe._dict(customer="CUST-001", total=2),
                segments_module.frappe._dict(customer="CUST-002", total=1),
            ]
        ),
        raising=False,
    )
    monkeypatch.setattr(segments_module, "nowdate", lambda: "2026-03-01")

    with patch("acentem_takipte.acentem_takipte.services.segments.frappe.get_doc", return_value=segment):
        with patch(
            "acentem_takipte.acentem_takipte.services.segments.frappe.get_all",
            side_effect=[
                [
                    {
                        "name": "CUST-001",
                        "full_name": "Aykut K.",
                        "office_branch": "IST",
                        "consent_status": "Granted",
                        "assigned_agent": "agent@example.com",
                    },
                    {
                        "name": "CUST-002",
                        "full_name": "Merve A.",
                        "office_branch": "IST",
                        "consent_status": "Granted",
                        "assigned_agent": "agent@example.com",
                    },
                ],
                [{"customer": "CUST-001"}],
                [{"customer": "CUST-001"}],
            ],
        ):
            payload = build_segment_membership_preview("AT-SEG-2026-00001", limit=20)

    assert payload["segment"]["name"] == "AT-SEG-2026-00001"
    assert payload["summary"]["matched_count"] == 1
    assert payload["customers"] == [
        {
            "name": "CUST-001",
            "full_name": "Aykut K.",
            "office_branch": "IST",
            "consent_status": "Granted",
            "assigned_agent": "agent@example.com",
            "active_policy_count": 2,
            "has_overdue_installment": True,
            "in_renewal_window": True,
        }
    ]


def test_preview_segment_members_uses_permission_chain_and_service():
    with patch.object(communication_api, "assert_authenticated") as auth_mock:
        with patch.object(communication_api, "assert_doctype_permission") as doctype_mock:
            with patch.object(communication_api, "assert_doc_permission") as doc_perm_mock:
                with patch.object(
                    communication_api,
                    "build_segment_membership_preview",
                    return_value={"summary": {"matched_count": 3}, "customers": []},
                ) as preview_mock:
                    payload = communication_api.preview_segment_members("AT-SEG-2026-00001", limit=25)

    auth_mock.assert_called_once_with()
    doctype_mock.assert_any_call("AT Segment", "read", "You do not have permission to view segments.")
    doctype_mock.assert_any_call("AT Customer", "read", "You do not have permission to view customers.")
    doc_perm_mock.assert_called_once_with("AT Segment", "AT-SEG-2026-00001", "read")
    preview_mock.assert_called_once_with("AT-SEG-2026-00001", limit=25)
    assert payload == {"summary": {"matched_count": 3}, "customers": []}

