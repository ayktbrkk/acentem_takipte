from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from acentem_takipte.acentem_takipte.api import quick_create as quick_create_api
from acentem_takipte.acentem_takipte.services import quick_create_auxiliary
from acentem_takipte.acentem_takipte.services import quick_create_customer_flow
from acentem_takipte.acentem_takipte.services import quick_create_helpers
from acentem_takipte.acentem_takipte.services import quick_create_special
from acentem_takipte.acentem_takipte.services import quick_create_policy_task


@pytest.fixture(autouse=True)
def _mock_frappe_runtime(monkeypatch):
    monkeypatch.setattr(quick_create_api, "_", lambda value: value, raising=False)
    monkeypatch.setattr(quick_create_special, "_", lambda value: value, raising=False)
    monkeypatch.setattr(quick_create_policy_task, "_", lambda value: value, raising=False)
    monkeypatch.setattr(quick_create_auxiliary, "_", lambda value: value, raising=False)
    monkeypatch.setattr(quick_create_auxiliary, "nowdate", lambda: "2026-01-01", raising=False)
    fake_db = MagicMock(exists=MagicMock(return_value=True))
    monkeypatch.setattr(
        quick_create_api.frappe,
        "local",
        MagicMock(request=object(), flags=MagicMock(in_test=True)),
        raising=False,
    )
    monkeypatch.setattr(quick_create_api.frappe, "db", fake_db, raising=False)
    monkeypatch.setattr(
        quick_create_policy_task.frappe,
        "local",
        MagicMock(request=object(), flags=MagicMock(in_test=True)),
        raising=False,
    )
    monkeypatch.setattr(quick_create_policy_task.frappe, "db", fake_db, raising=False)
    monkeypatch.setattr(quick_create_customer_flow, "_", lambda value: value, raising=False)
    monkeypatch.setattr(quick_create_customer_flow, "nowdate", lambda: "2026-01-01", raising=False)
    monkeypatch.setattr(
        quick_create_customer_flow.frappe,
        "local",
        MagicMock(request=object(), flags=MagicMock(in_test=True)),
        raising=False,
    )
    monkeypatch.setattr(quick_create_customer_flow.frappe, "db", fake_db, raising=False)
    monkeypatch.setattr(
        quick_create_auxiliary.frappe,
        "local",
        MagicMock(request=object(), flags=MagicMock(in_test=True)),
        raising=False,
    )
    monkeypatch.setattr(quick_create_auxiliary.frappe, "db", fake_db, raising=False)


def test_assert_delete_permission_uses_shared_mutation_helper():
    with patch.object(quick_create_helpers, "assert_mutation_access") as mutation_access:
        quick_create_helpers._assert_delete_permission("AT Customer Relation", "Delete denied")

    mutation_access.assert_called_once_with(
        action="api.quick_create.delete_at_customer_relation",
        roles=("System Manager", "Manager", "Agent", "Accountant"),
        doctype_permissions=("AT Customer Relation",),
        permtype="delete",
        details={"doctype": "AT Customer Relation", "permtype": "delete"},
        role_message="Delete denied",
        post_message="Only POST requests are allowed for quick create/update operations.",
    )


def test_create_quick_customer_relation_uses_service_payload():
    with patch.object(quick_create_auxiliary, "_assert_create_permission"):
        with patch.object(quick_create_auxiliary, "_normalize_link", side_effect=lambda doctype, value, required=False: value):
            with patch.object(quick_create_auxiliary, "_normalize_option", side_effect=lambda value, allowed, default=None: value or default):
                with patch.object(quick_create_auxiliary, "normalize_note_text", return_value="Family relation"):
                    with patch.object(
                        quick_create_auxiliary,
                        "create_customer_relation_service",
                        return_value={"customer_relation": "REL-0001"},
                    ) as service_mock:
                        result = quick_create_auxiliary.create_quick_customer_relation(
                            customer="CUST-001",
                            related_customer="CUST-002",
                            relation_type="Spouse",
                            is_household=1,
                            notes="Family relation",
                        )

    service_mock.assert_called_once_with(
        {
            "doctype": "AT Customer Relation",
            "customer": "CUST-001",
            "related_customer": "CUST-002",
            "relation_type": "Spouse",
            "is_household": 1,
            "notes": "Family relation",
        }
    )
    assert result == {"customer_relation": "REL-0001"}


def test_create_quick_policy_uses_offer_conversion_service():
    with patch.object(quick_create_policy_task, "_assert_create_permission"):
        with patch.object(quick_create_policy_task, "_normalize_link", side_effect=lambda doctype, value, required=False: value):
            with patch.object(
                quick_create_policy_task,
                "convert_offer_to_policy",
                return_value={"policy": "POL-0001", "message": "Offer converted to Policy successfully."},
            ) as convert_mock:
                result = quick_create_api.create_quick_policy(
                    customer="CUST-001",
                    customer_full_name="Test Customer",
                    customer_type="Individual",
                    customer_tax_id="12345678901",
                    customer_phone="05551234567",
                    customer_email="customer@example.com",
                    sales_entity="SE-001",
                    insurance_company="IC-001",
                    branch="BR-001",
                    source_offer="OFF-001",
                    start_date="2026-03-01",
                    end_date="2026-03-31",
                    policy_no="POL-0001",
                )

    convert_mock.assert_called_once_with(
        offer_name="OFF-001",
        start_date="2026-03-01",
        end_date="2026-03-31",
        commission_amount=None,
        tax_amount=None,
        net_premium=None,
        policy_no="POL-0001",
    )
    assert result == {"policy": "POL-0001", "message": "Offer converted to Policy successfully."}


def test_create_quick_insured_asset_uses_service_payload():
    with patch.object(quick_create_auxiliary, "_assert_create_permission"):
        with patch.object(quick_create_auxiliary, "_normalize_link", side_effect=lambda doctype, value, required=False: value):
            with patch.object(quick_create_auxiliary, "_normalize_option", side_effect=lambda value, allowed, default=None: value or default):
                with patch.object(quick_create_auxiliary, "normalize_note_text", return_value="Secondary vehicle"):
                    with patch.object(
                        quick_create_auxiliary,
                        "create_insured_asset_service",
                        return_value={"insured_asset": "AST-0001"},
                    ) as service_mock:
                        result = quick_create_auxiliary.create_quick_insured_asset(
                            customer="CUST-001",
                            policy="POL-001",
                            asset_type="Vehicle",
                            asset_label="34 ABC 123",
                            asset_identifier="VIN-001",
                            notes="Secondary vehicle",
                        )

    service_mock.assert_called_once_with(
        {
            "doctype": "AT Insured Asset",
            "customer": "CUST-001",
            "policy": "POL-001",
            "asset_type": "Vehicle",
            "asset_label": "34 ABC 123",
            "asset_identifier": "VIN-001",
            "notes": "Secondary vehicle",
        }
    )
    assert result == {"insured_asset": "AST-0001"}


def test_create_quick_call_note_uses_service_payload():
    with patch.object(quick_create_auxiliary, "_assert_create_permission"):
        with patch.object(quick_create_auxiliary, "_resolve_office_branch", return_value="IST"):
            with patch.object(quick_create_auxiliary, "_normalize_link", side_effect=lambda doctype, value, required=False: value):
                with patch.object(quick_create_auxiliary, "_normalize_datetime", side_effect=lambda value: value):
                    with patch.object(quick_create_auxiliary, "_normalize_option", side_effect=lambda value, allowed, default=None: value or default):
                        with patch.object(quick_create_auxiliary, "normalize_note_text", return_value="Customer was contacted"):
                            with patch.object(
                                quick_create_auxiliary,
                                "create_call_note_service",
                                return_value={"call_note": "AT-CALL-2026-00001"},
                            ) as service_mock:
                                result = quick_create_auxiliary.create_quick_call_note(
                                    customer="CUST-001",
                                    policy="POL-001",
                                    claim="CLM-001",
                                    office_branch="IST",
                                    channel="Phone Call",
                                    direction="Outbound",
                                    call_status="Completed",
                                    call_outcome="Information shared",
                                    note_at="2026-03-09 10:30:00",
                                    next_follow_up_on="2026-03-12",
                                    notes="Customer was contacted",
                                )

    service_mock.assert_called_once_with(
        {
            "doctype": "AT Call Note",
            "customer": "CUST-001",
            "policy": "POL-001",
            "claim": "CLM-001",
            "office_branch": "IST",
            "channel": "Phone Call",
            "direction": "Outbound",
            "call_status": "Completed",
            "call_outcome": "Information shared",
            "note_at": "2026-03-09 10:30:00",
            "next_follow_up_on": quick_create_api.frappe.utils.getdate("2026-03-12"),
            "notes": "Customer was contacted",
        }
    )
    assert result == {"call_note": "AT-CALL-2026-00001"}


def test_create_quick_segment_uses_service_payload():
    with patch.object(quick_create_auxiliary, "_assert_create_permission"):
        with patch.object(quick_create_auxiliary, "_resolve_office_branch", return_value="IST"):
            with patch.object(quick_create_auxiliary, "_normalize_option", side_effect=lambda value, allowed, default=None: value or default):
                with patch.object(quick_create_auxiliary, "normalize_note_text", return_value="Renewal focused"):
                    with patch.object(
                        quick_create_auxiliary,
                        "create_segment_service",
                        return_value={"segment": "AT-SEG-2026-00001"},
                    ) as service_mock:
                        result = quick_create_auxiliary.create_quick_segment(
                            segment_name="Renewal Risk",
                            segment_type="Operational",
                            channel_focus="WHATSAPP",
                            office_branch="IST",
                            status="Active",
                            criteria_json='{"renewal_window_days":30}',
                            notes="Renewal focused",
                        )

    service_mock.assert_called_once_with(
        {
            "doctype": "AT Segment",
            "segment_name": "Renewal Risk",
            "segment_type": "Operational",
            "channel_focus": "WHATSAPP",
            "office_branch": "IST",
            "status": "Active",
            "criteria_json": '{"renewal_window_days":30}',
            "notes": "Renewal focused",
        }
    )
    assert result == {"segment": "AT-SEG-2026-00001"}


def test_create_quick_campaign_uses_service_payload():
    with patch.object(quick_create_auxiliary, "_assert_create_permission"):
        with patch.object(quick_create_auxiliary, "_resolve_office_branch", return_value="IST"):
            with patch.object(quick_create_auxiliary, "_normalize_link", side_effect=lambda doctype, value, required=False: value):
                with patch.object(quick_create_auxiliary, "_normalize_option", side_effect=lambda value, allowed, default=None: value or default):
                    with patch.object(quick_create_auxiliary, "normalize_note_text", return_value="WhatsApp dispatch"):
                        with patch.object(
                            quick_create_auxiliary,
                            "create_campaign_service",
                            return_value={"campaign": "AT-CAMP-2026-00001"},
                        ) as service_mock:
                            result = quick_create_auxiliary.create_quick_campaign(
                                campaign_name="March Renewal Reminder",
                                segment="AT-SEG-2026-00001",
                                template="TPL-001",
                                channel="WHATSAPP",
                                office_branch="IST",
                                status="Planned",
                                scheduled_for="2026-03-15 10:00:00",
                                notes="WhatsApp dispatch",
                            )

    service_mock.assert_called_once_with(
        {
            "doctype": "AT Campaign",
            "campaign_name": "March Renewal Reminder",
            "segment": "AT-SEG-2026-00001",
            "template": "TPL-001",
            "channel": "WHATSAPP",
            "office_branch": "IST",
            "status": "Planned",
            "scheduled_for": quick_create_api.frappe.utils.get_datetime("2026-03-15 10:00:00"),
            "notes": "WhatsApp dispatch",
        }
    )
    assert result == {"campaign": "AT-CAMP-2026-00001"}


def test_create_quick_ownership_assignment_uses_service_payload():
    with patch.object(quick_create_auxiliary, "_assert_create_permission"):
        with patch.object(quick_create_auxiliary, "_resolve_office_branch", return_value="IST"):
            with patch.object(quick_create_auxiliary, "_normalize_link", side_effect=lambda doctype, value, required=False: value):
                with patch.object(quick_create_auxiliary, "_normalize_option", side_effect=lambda value, allowed, default=None: value or default):
                    with patch.object(quick_create_auxiliary, "normalize_note_text", return_value="Renewal owner assignment"):
                        with patch.object(
                            quick_create_auxiliary,
                            "create_ownership_assignment_service",
                            return_value={"ownership_assignment": "AT-ASN-2026-00001"},
                        ) as service_mock:
                            result = quick_create_auxiliary.create_quick_ownership_assignment(
                                source_doctype="AT Customer",
                                source_name="CUST-001",
                                customer="CUST-001",
                                policy="POL-001",
                                assigned_to="agent@example.com",
                                assignment_role="Owner",
                                status="Open",
                                priority="High",
                                due_date="2026-03-12",
                                notes="Renewal owner assignment",
                            )

    service_mock.assert_called_once_with(
        {
            "doctype": "AT Ownership Assignment",
            "source_doctype": "AT Customer",
            "source_name": "CUST-001",
            "customer": "CUST-001",
            "policy": "POL-001",
            "office_branch": "IST",
            "assigned_to": "agent@example.com",
            "assignment_role": "Owner",
            "status": "Open",
            "priority": "High",
            "due_date": quick_create_api.frappe.utils.getdate("2026-03-12"),
            "notes": "Renewal owner assignment",
        }
    )
    assert result == {"ownership_assignment": "AT-ASN-2026-00001"}


def test_delete_quick_aux_record_checks_delete_permission_and_calls_service():
    fake_doc = MagicMock()
    fake_doc.doctype = "AT Customer Relation"
    fake_doc.name = "REL-001"

    with patch.object(quick_create_special, "_assert_delete_permission") as delete_permission_mock:
        with patch.object(quick_create_special.frappe, "get_doc", return_value=fake_doc):
            with patch.object(
                quick_create_special,
                "delete_aux_record_service",
                return_value={"record": "REL-001", "doctype": "AT Customer Relation", "deleted": True},
            ) as service_mock:
                result = quick_create_api.delete_quick_aux_record("AT Customer Relation", "REL-001")

    delete_permission_mock.assert_called_once_with(
        "AT Customer Relation",
        "You do not have permission to delete this record.",
    )
    fake_doc.check_permission.assert_called_once_with("delete")
    service_mock.assert_called_once_with(fake_doc)
    assert result == {"record": "REL-001", "doctype": "AT Customer Relation", "deleted": True}


def test_create_quick_payment_normalizes_installment_fields_and_uses_service_payload():
    with patch.object(quick_create_customer_flow, "_assert_create_permission"):
        with patch.object(quick_create_customer_flow, "_resolve_office_branch", return_value="IST"):
            with patch.object(quick_create_customer_flow, "_normalize_link", side_effect=lambda doctype, value, required=False: value):
                with patch.object(quick_create_customer_flow, "_normalize_date", side_effect=lambda value: value):
                    with patch.object(quick_create_customer_flow, "_normalize_option", side_effect=lambda value, allowed, default=None: value or default):
                        with patch.object(quick_create_customer_flow, "normalize_note_text", return_value="Pesin yerine 3 taksit"):
                            with patch.object(
                                quick_create_customer_flow,
                                "create_payment_service",
                                return_value={"payment": "PAY-0001"},
                            ) as service_mock:
                                result = quick_create_customer_flow.create_quick_payment(
                                    customer="CUST-001",
                                    policy="POL-001",
                                    payment_direction="Inbound",
                                    status="Planned",
                                    amount=12000,
                                    due_date="2026-04-01",
                                    payment_date="2026-04-01",
                                    installment_count="3",
                                    installment_interval_days="45",
                                    notes="Pesin yerine 3 taksit",
                                    office_branch="IST",
                                )

    service_mock.assert_called_once_with(
        {
            "doctype": "AT Payment",
            "customer": "CUST-001",
            "policy": "POL-001",
            "claim": None,
            "office_branch": "IST",
            "sales_entity": None,
            "payment_direction": "Inbound",
            "payment_purpose": "Premium Collection",
            "status": "Planned",
            "payment_date": "2026-04-01",
            "due_date": "2026-04-01",
            "installment_count": 3,
            "installment_interval_days": 45,
            "currency": "TRY",
            "amount": 12000.0,
            "amount_try": 12000.0,
            "reference_no": None,
            "notes": "Pesin yerine 3 taksit",
        }
    )
    assert result == {"payment": "PAY-0001"}


def test_create_quick_payment_clamps_invalid_installment_fields():
    with patch.object(quick_create_customer_flow, "_assert_create_permission"):
        with patch.object(quick_create_customer_flow, "_resolve_office_branch", return_value="IST"):
            with patch.object(quick_create_customer_flow, "_normalize_link", side_effect=lambda doctype, value, required=False: value):
                with patch.object(quick_create_customer_flow, "_normalize_date", side_effect=lambda value: value):
                    with patch.object(quick_create_customer_flow, "_normalize_option", side_effect=lambda value, allowed, default=None: value or default):
                        with patch.object(quick_create_customer_flow, "normalize_note_text", return_value="Tekrarlanan tahsilat"):
                            with patch.object(
                                quick_create_customer_flow,
                                "create_payment_service",
                                return_value={"payment": "PAY-0002"},
                            ) as service_mock:
                                quick_create_customer_flow.create_quick_payment(
                                    customer="CUST-001",
                                    policy="POL-001",
                                    payment_direction="Inbound",
                                    status="Planned",
                                    amount=5000,
                                    due_date="2026-04-01",
                                    installment_count="0",
                                    installment_interval_days="-5",
                                    notes="Tekrarlanan tahsilat",
                                    office_branch="IST",
                                )

    service_mock.assert_called_once()
    payload = service_mock.call_args.args[0]
    assert payload["installment_count"] == 1
    assert payload["installment_interval_days"] == 1

