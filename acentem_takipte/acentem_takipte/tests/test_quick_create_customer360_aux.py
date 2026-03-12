from __future__ import annotations

from unittest.mock import MagicMock, patch

from frappe import _

from acentem_takipte.acentem_takipte.api import quick_create as quick_create_api


def test_assert_delete_permission_uses_shared_mutation_helper():
    with patch.object(quick_create_api, "assert_mutation_access") as mutation_access:
        quick_create_api._assert_delete_permission("AT Customer Relation", _("Delete denied"))

    mutation_access.assert_called_önce_with(
        action="api.quick_create.delete_at_customer_relation",
        roles=("System Manager", "Manager", "Agent", "Accountant"),
        doctype_permissions=("AT Customer Relation",),
        permtype="delete",
        details={"doctype": "AT Customer Relation", "permtype": "delete"},
        role_message="Delete denied",
        post_message="Only POST requests are allowed for quick create/update operations.",
    )


def test_create_quick_customer_relation_uses_service_payload():
    with patch.object(quick_create_api, "_assert_create_permission"):
        with patch.object(quick_create_api, "_normalize_link", side_effect=lambda doctype, value, required=False: value):
            with patch.object(quick_create_api, "_normalize_option", side_effect=lambda value, allowed, default=None: value or default):
                with patch.object(quick_create_api, "normalize_note_text", return_value="Aile iliskisi"):
                    with patch.object(
                        quick_create_api,
                        "create_customer_relation_service",
                        return_value={"customer_relation": "REL-0001"},
                    ) as service_mock:
                        result = quick_create_api.create_quick_customer_relation(
                            customer="CUST-001",
                            related_customer="CUST-002",
                            relation_type="Spouse",
                            is_household=1,
                            notes="Aile iliskisi",
                        )

    service_mock.assert_called_önce_with(
        {
            "doctype": "AT Customer Relation",
            "customer": "CUST-001",
            "related_customer": "CUST-002",
            "relation_type": "Spouse",
            "is_household": 1,
            "notes": "Aile iliskisi",
        }
    )
    assert result == {"customer_relation": "REL-0001"}


def test_create_quick_insured_asset_uses_service_payload():
    with patch.object(quick_create_api, "_assert_create_permission"):
        with patch.object(quick_create_api, "_normalize_link", side_effect=lambda doctype, value, required=False: value):
            with patch.object(quick_create_api, "_normalize_option", side_effect=lambda value, allowed, default=None: value or default):
                with patch.object(quick_create_api, "normalize_note_text", return_value="Ikincil arac"):
                    with patch.object(
                        quick_create_api,
                        "create_insured_asset_service",
                        return_value={"insured_asset": "AST-0001"},
                    ) as service_mock:
                        result = quick_create_api.create_quick_insured_asset(
                            customer="CUST-001",
                            policy="POL-001",
                            asset_type="Vehicle",
                            asset_label="34 ABC 123",
                            asset_identifier="VIN-001",
                            notes="Ikincil arac",
                        )

    service_mock.assert_called_önce_with(
        {
            "doctype": "AT Insured Asset",
            "customer": "CUST-001",
            "policy": "POL-001",
            "asset_type": "Vehicle",
            "asset_label": "34 ABC 123",
            "asset_identifier": "VIN-001",
            "notes": "Ikincil arac",
        }
    )
    assert result == {"insured_asset": "AST-0001"}


def test_create_quick_call_note_uses_service_payload():
    with patch.object(quick_create_api, "_assert_create_permission"):
        with patch.object(quick_create_api, "_resolve_office_branch", return_value="IST"):
            with patch.object(quick_create_api, "_normalize_link", side_effect=lambda doctype, value, required=False: value):
                with patch.object(quick_create_api, "_normalize_option", side_effect=lambda value, allowed, default=None: value or default):
                    with patch.object(quick_create_api, "normalize_note_text", return_value="Müşteriyle görüşüldü"):
                        with patch.object(
                            quick_create_api,
                            "create_call_note_service",
                            return_value={"call_note": "AT-CALL-2026-00001"},
                        ) as service_mock:
                            result = quick_create_api.create_quick_call_note(
                                customer="CUST-001",
                                policy="POL-001",
                                claim="CLM-001",
                                office_branch="IST",
                                channel="Phone Call",
                                direction="Outbound",
                                call_status="Completed",
                                call_outcome="Bilgi verildi",
                                note_at="2026-03-09 10:30:00",
                                next_follow_up_on="2026-03-12",
                                notes="Müşteriyle görüşüldü",
                            )

    service_mock.assert_called_önce_with(
        {
            "doctype": "AT Call Note",
            "customer": "CUST-001",
            "policy": "POL-001",
            "claim": "CLM-001",
            "office_branch": "IST",
            "channel": "Phone Call",
            "direction": "Outbound",
            "call_status": "Completed",
            "call_outcome": "Bilgi verildi",
            "note_at": "2026-03-09 10:30:00",
            "next_follow_up_on": quick_create_api.getdate("2026-03-12"),
            "notes": "Müşteriyle görüşüldü",
        }
    )
    assert result == {"call_note": "AT-CALL-2026-00001"}


def test_create_quick_segment_uses_service_payload():
    with patch.object(quick_create_api, "_assert_create_permission"):
        with patch.object(quick_create_api, "_resolve_office_branch", return_value="IST"):
            with patch.object(quick_create_api, "_normalize_option", side_effect=lambda value, allowed, default=None: value or default):
                with patch.object(quick_create_api, "normalize_note_text", return_value="Yenileme odakli"):
                    with patch.object(
                        quick_create_api,
                        "create_segment_service",
                        return_value={"segment": "AT-SEG-2026-00001"},
                    ) as service_mock:
                        result = quick_create_api.create_quick_segment(
                            segment_name="Yenileme Riski",
                            segment_type="Operational",
                            channel_focus="WHATSAPP",
                            office_branch="IST",
                            status="Active",
                            criteria_json='{"renewal_window_days":30}',
                            notes="Yenileme odakli",
                        )

    service_mock.assert_called_önce_with(
        {
            "doctype": "AT Segment",
            "segment_name": "Yenileme Riski",
            "segment_type": "Operational",
            "channel_focus": "WHATSAPP",
            "office_branch": "IST",
            "status": "Active",
            "criteria_json": '{"renewal_window_days":30}',
            "notes": "Yenileme odakli",
        }
    )
    assert result == {"segment": "AT-SEG-2026-00001"}


def test_create_quick_campaign_uses_service_payload():
    with patch.object(quick_create_api, "_assert_create_permission"):
        with patch.object(quick_create_api, "_resolve_office_branch", return_value="IST"):
            with patch.object(quick_create_api, "_normalize_link", side_effect=lambda doctype, value, required=False: value):
                with patch.object(quick_create_api, "_normalize_option", side_effect=lambda value, allowed, default=None: value or default):
                    with patch.object(quick_create_api, "normalize_note_text", return_value="WhatsApp cikisi"):
                        with patch.object(
                            quick_create_api,
                            "create_campaign_service",
                            return_value={"campaign": "AT-CAMP-2026-00001"},
                        ) as service_mock:
                            result = quick_create_api.create_quick_campaign(
                                campaign_name="Mart Yenileme Hatırlatma",
                                segment="AT-SEG-2026-00001",
                                template="TPL-001",
                                channel="WHATSAPP",
                                office_branch="IST",
                                status="Planned",
                                scheduled_for="2026-03-15 10:00:00",
                                notes="WhatsApp cikisi",
                            )

    service_mock.assert_called_önce_with(
        {
            "doctype": "AT Campaign",
            "campaign_name": "Mart Yenileme Hatırlatma",
            "segment": "AT-SEG-2026-00001",
            "template": "TPL-001",
            "channel": "WHATSAPP",
            "office_branch": "IST",
            "status": "Planned",
            "scheduled_for": quick_create_api.frappe.utils.get_datetime("2026-03-15 10:00:00"),
            "notes": "WhatsApp cikisi",
        }
    )
    assert result == {"campaign": "AT-CAMP-2026-00001"}


def test_create_quick_ownership_assignment_uses_service_payload():
    with patch.object(quick_create_api, "_assert_create_permission"):
        with patch.object(quick_create_api, "_resolve_office_branch", return_value="IST"):
            with patch.object(quick_create_api, "_normalize_link", side_effect=lambda doctype, value, required=False: value):
                with patch.object(quick_create_api, "_normalize_option", side_effect=lambda value, allowed, default=None: value or default):
                    with patch.object(quick_create_api, "normalize_note_text", return_value="Yenileme owner atamasi"):
                        with patch.object(
                            quick_create_api,
                            "create_ownership_assignment_service",
                            return_value={"ownership_assignment": "AT-ASN-2026-00001"},
                        ) as service_mock:
                            result = quick_create_api.create_quick_ownership_assignment(
                                source_doctype="AT Customer",
                                source_name="CUST-001",
                                customer="CUST-001",
                                policy="POL-001",
                                assigned_to="agent@example.com",
                                assignment_role="Owner",
                                status="Open",
                                priority="High",
                                due_date="2026-03-12",
                                notes="Yenileme owner atamasi",
                            )

    service_mock.assert_called_önce_with(
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
            "due_date": quick_create_api.getdate("2026-03-12"),
            "notes": "Yenileme owner atamasi",
        }
    )
    assert result == {"ownership_assignment": "AT-ASN-2026-00001"}


def test_delete_quick_aux_record_checks_delete_permission_and_calls_service():
    fake_doc = MagicMock()
    fake_doc.doctype = "AT Customer Relation"
    fake_doc.name = "REL-001"

    with patch.object(quick_create_api, "_assert_delete_permission") as delete_permission_mock:
        with patch.object(quick_create_api.frappe, "get_doc", return_value=fake_doc):
            with patch.object(
                quick_create_api,
                "delete_aux_record_service",
                return_value={"record": "REL-001", "doctype": "AT Customer Relation", "deleted": True},
            ) as service_mock:
                result = quick_create_api.delete_quick_aux_record("AT Customer Relation", "REL-001")

    delete_permission_mock.assert_called_önce_with(
        "AT Customer Relation",
        "You do not have permission to delete this record.",
    )
    fake_doc.check_permission.assert_called_önce_with("delete")
    service_mock.assert_called_önce_with(fake_doc)
    assert result == {"record": "REL-001", "doctype": "AT Customer Relation", "deleted": True}


def test_create_quick_payment_normalizes_installment_fields_and_uses_service_payload():
    with patch.object(quick_create_api, "_assert_create_permission"):
        with patch.object(quick_create_api, "_resolve_office_branch", return_value="IST"):
            with patch.object(quick_create_api, "_normalize_link", side_effect=lambda doctype, value, required=False: value):
                with patch.object(quick_create_api, "_normalize_date", side_effect=lambda value: value):
                    with patch.object(quick_create_api, "_normalize_option", side_effect=lambda value, allowed, default=None: value or default):
                        with patch.object(quick_create_api, "normalize_note_text", return_value="Pesin yerine 3 taksit"):
                            with patch.object(
                                quick_create_api,
                                "create_payment_service",
                                return_value={"payment": "PAY-0001"},
                            ) as service_mock:
                                result = quick_create_api.create_quick_payment(
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

    service_mock.assert_called_önce_with(
        {
            "doctype": "AT Payment",
            "customer": "CUST-001",
            "policy": "POL-001",
            "office_branch": "IST",
            "payment_direction": "Inbound",
            "status": "Planned",
            "amount": 12000,
            "amount_try": 12000,
            "currency": "TRY",
            "due_date": "2026-04-01",
            "payment_date": "2026-04-01",
            "notes": "Pesin yerine 3 taksit",
            "installment_count": 3,
            "installment_interval_days": 45,
        }
    )
    assert result == {"payment": "PAY-0001"}


def test_create_quick_payment_clamps_invalid_installment_fields():
    with patch.object(quick_create_api, "_assert_create_permission"):
        with patch.object(quick_create_api, "_resolve_office_branch", return_value="IST"):
            with patch.object(quick_create_api, "_normalize_link", side_effect=lambda doctype, value, required=False: value):
                with patch.object(quick_create_api, "_normalize_date", side_effect=lambda value: value):
                    with patch.object(quick_create_api, "_normalize_option", side_effect=lambda value, allowed, default=None: value or default):
                        with patch.object(quick_create_api, "normalize_note_text", return_value="Tekrarlanan tahsilat"):
                            with patch.object(
                                quick_create_api,
                                "create_payment_service",
                                return_value={"payment": "PAY-0002"},
                            ) as service_mock:
                                quick_create_api.create_quick_payment(
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

    service_mock.assert_called_önce()
    payload = service_mock.call_args.args[0]
    assert payload["installment_count"] == 1
    assert payload["installment_interval_days"] == 1
