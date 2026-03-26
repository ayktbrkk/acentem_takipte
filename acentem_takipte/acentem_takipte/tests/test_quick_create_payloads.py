from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from acentem_takipte.acentem_takipte.api import quick_create as quick_create_api
from acentem_takipte.acentem_takipte.api.quick_payloads import (
    QuickAccountingEntryPayload,
    QuickNotificationTemplatePayload,
    QuickPaymentPayload,
    QuickPolicyPayload,
    QuickTaskPayload,
)


@pytest.fixture(autouse=True)
def _mock_frappe_runtime(monkeypatch):
    monkeypatch.setattr(quick_create_api, "_", lambda value: value, raising=False)
    monkeypatch.setattr(quick_create_api, "nowdate", lambda: "2026-01-01", raising=False)
    monkeypatch.setattr(
        quick_create_api.frappe,
        "local",
        SimpleNamespace(request=object(), flags=SimpleNamespace(in_test=True)),
        raising=False,
    )
    fake_db = MagicMock()
    fake_db.exists.return_value = True
    monkeypatch.setattr(quick_create_api.frappe, "db", fake_db, raising=False)
    return fake_db


def test_create_quick_policy_accepts_payload_dataclass():
    payload = QuickPolicyPayload(
        customer="CUST-001",
        customer_full_name="Test Customer",
        customer_type="Individual",
        customer_tax_id="12345678901",
        customer_phone="05551234567",
        customer_email="customer@example.com",
        sales_entity="SE-001",
        insurance_company="IC-001",
        branch="BR-001",
        office_branch="IST",
        policy_no="POL-0001",
        status="Active",
        issue_date="2026-03-01",
        start_date="2026-03-01",
        end_date="2026-03-31",
        currency="try",
        net_premium=1000,
        tax_amount=180,
        commission_amount=50,
        gross_premium=1230,
        notes="Policy note",
    )

    with patch.object(quick_create_api, "_assert_create_permission"):
        with patch.object(quick_create_api, "_resolve_office_branch", return_value="IST"):
            with patch.object(
                quick_create_api,
                "_normalize_link",
                side_effect=lambda doctype, value, required=False: value,
            ):
                with patch.object(
                    quick_create_api,
                    "_normalize_date",
                    side_effect=lambda value: value,
                ):
                    with patch.object(
                        quick_create_api,
                        "resolve_or_create_quick_customer",
                        return_value=("CUST-001", False),
                    ):
                        with patch.object(
                            quick_create_api,
                            "create_policy_service",
                            return_value={"policy": "POL-0001"},
                        ) as service_mock:
                            result = quick_create_api.create_quick_policy(payload)

    service_mock.assert_called_once_with(
        {
            "doctype": "AT Policy",
            "customer": "CUST-001",
            "office_branch": "IST",
            "sales_entity": "SE-001",
            "insurance_company": "IC-001",
            "branch": "BR-001",
            "policy_no": "POL-0001",
            "status": "Active",
            "issue_date": "2026-03-01",
            "start_date": "2026-03-01",
            "end_date": "2026-03-31",
            "currency": "TRY",
            "net_premium": 1000,
            "tax_amount": 180,
            "commission_amount": 50,
            "gross_premium": 1230,
            "source_offer": None,
            "notes": "Policy note",
        }
    )
    assert result == {"policy": "POL-0001"}


def test_create_quick_payment_accepts_payload_dataclass_and_aliases():
    payload = QuickPaymentPayload(
        customer="CUST-001",
        policy="POL-001",
        claim="CLM-001",
        sales_entity="SE-001",
        office_branch="IST",
        payment_direction="Inbound",
        payment_purpose="Premium Collection",
        status="Draft",
        paid_date="2026-04-01",
        due_date="2026-04-15",
        installment_count="3",
        installment_interval_days="45",
        currency="try",
        amount_try=12000,
        external_ref="PAY-REF-1",
        notes="Pesin yerine 3 taksit",
    )

    with patch.object(quick_create_api, "_assert_create_permission"):
        with patch.object(quick_create_api, "_resolve_office_branch", return_value="IST"):
            with patch.object(
                quick_create_api,
                "_normalize_link",
                side_effect=lambda doctype, value, required=False: value,
            ):
                with patch.object(
                    quick_create_api,
                    "_normalize_date",
                    side_effect=lambda value: value,
                ):
                    with patch.object(
                        quick_create_api,
                        "normalize_note_text",
                        side_effect=lambda value: (value or "").strip(),
                    ):
                        with patch.object(
                            quick_create_api,
                            "create_payment_service",
                            return_value={"payment": "PAY-0001"},
                        ) as service_mock:
                            result = quick_create_api.create_quick_payment(payload)

    service_mock.assert_called_once_with(
        {
            "doctype": "AT Payment",
            "customer": "CUST-001",
            "policy": "POL-001",
            "claim": "CLM-001",
            "office_branch": "IST",
            "sales_entity": "SE-001",
            "payment_direction": "Inbound",
            "payment_purpose": "Premium Collection",
            "status": "Draft",
            "payment_date": "2026-04-01",
            "due_date": "2026-04-15",
            "installment_count": 3,
            "installment_interval_days": 45,
            "currency": "TRY",
            "amount": 12000,
            "amount_try": 12000,
            "reference_no": "PAY-REF-1",
            "notes": "Pesin yerine 3 taksit",
        }
    )
    assert result == {"payment": "PAY-0001"}


def test_create_quick_task_accepts_payload_dataclass():
    payload = QuickTaskPayload(
        task_title="Call customer",
        task_type="Call",
        source_doctype="AT Customer",
        source_name="CUST-001",
        customer="CUST-001",
        policy="POL-001",
        claim="CLM-001",
        office_branch="IST",
        assigned_to="agent@example.com",
        status="Open",
        priority="High",
        due_date="2026-03-10",
        reminder_at="2026-03-09 10:30:00",
        notes="Need callback",
    )

    with patch.object(quick_create_api, "_assert_create_permission"):
        with patch.object(quick_create_api, "_resolve_office_branch", return_value="IST"):
            with patch.object(
                quick_create_api,
                "_normalize_link",
                side_effect=lambda doctype, value, required=False: value,
            ):
                with patch.object(
                    quick_create_api,
                    "_normalize_date",
                    side_effect=lambda value: value,
                ):
                    with patch.object(
                        quick_create_api,
                        "_normalize_datetime",
                        side_effect=lambda value: value,
                    ):
                        with patch.object(
                            quick_create_api,
                            "normalize_note_text",
                            side_effect=lambda value: (value or "").strip(),
                        ):
                            with patch.object(
                                quick_create_api,
                                "create_task_service",
                                return_value={"task": "TASK-0001"},
                            ) as service_mock:
                                result = quick_create_api.create_quick_task(payload)

    service_mock.assert_called_once_with(
        {
            "doctype": "AT Task",
            "task_title": "Call customer",
            "task_type": "Call",
            "source_doctype": "AT Customer",
            "source_name": "CUST-001",
            "customer": "CUST-001",
            "policy": "POL-001",
            "claim": "CLM-001",
            "office_branch": "IST",
            "assigned_to": "agent@example.com",
            "status": "Open",
            "priority": "High",
            "due_date": "2026-03-10",
            "reminder_at": "2026-03-09 10:30:00",
            "notes": "Need callback",
        }
    )
    assert result == {"task": "TASK-0001"}


def test_create_quick_accounting_entry_accepts_payload_dataclass():
    payload = QuickAccountingEntryPayload(
        source_doctype="AT Policy",
        source_name="POL-001",
        entry_type="Policy",
        status="Draft",
        office_branch="IST",
        sales_entity="SE-001",
        insurance_company="IC-001",
        policy="POL-001",
        customer="CUST-001",
        local_amount=1000,
        local_amount_try=1000,
        external_amount=250,
        external_amount_try=250,
        currency="try",
        external_ref="ACC-001",
        notes="Accounting note",
    )

    fake_doc = MagicMock()
    fake_doc.name = "ACC-0001"

    with patch.object(quick_create_api, "_assert_create_permission"):
        with patch.object(quick_create_api, "_assert_doc_exists"):
            with patch.object(quick_create_api, "_resolve_office_branch", return_value="IST"):
                with patch.object(
                    quick_create_api,
                    "_normalize_link",
                    side_effect=lambda doctype, value, required=False: value,
                ):
                    with patch.object(
                        quick_create_api,
                        "_normalize_option",
                        side_effect=lambda value, allowed, default=None: value or default,
                    ):
                        with patch.object(
                            quick_create_api,
                            "normalize_note_text",
                            side_effect=lambda value: (value or "").strip(),
                        ):
                            with patch.object(
                                quick_create_api.frappe,
                                "get_doc",
                                return_value=fake_doc,
                            ) as get_doc_mock:
                                result = quick_create_api.create_quick_accounting_entry(payload)

    payload_doc = get_doc_mock.call_args.args[0]
    assert payload_doc["insurance_company"] == "IC-001"
    assert payload_doc["source_doctype"] == "AT Policy"
    assert payload_doc["source_name"] == "POL-001"
    assert payload_doc["local_amount_try"] == 1000
    assert payload_doc["external_ref"] == "ACC-001"
    assert result == {"accounting_entry": "ACC-0001"}
    quick_create_api.frappe.db.commit.assert_called_once()


def test_create_quick_notification_template_accepts_payload_dataclass():
    payload = QuickNotificationTemplatePayload(
        template_key="renewal_reminder_30",
        event_key="renewal_due",
        channel="Both",
        content_mode="template",
        language="tr",
        provider_template_name="renewal_reminder_30",
        provider_template_category="UTILITY",
        variables_schema_json='[{"name":"musteri_adi"}]',
        subject="Hatirlatma",
        body_template="Genel",
        sms_body_template="SMS Govde",
        email_body_template="Email Govde",
        whatsapp_body_template="WhatsApp Govde",
        is_active=False,
    )

    fake_doc = MagicMock()
    fake_doc.name = "TPL-0001"

    with patch.object(quick_create_api, "_assert_create_permission"):
        with patch.object(quick_create_api.frappe, "get_doc", return_value=fake_doc) as get_doc_mock:
            result = quick_create_api.create_quick_notification_template(payload)

    payload_doc = get_doc_mock.call_args.args[0]
    assert payload_doc["channel"] == "Both"
    assert payload_doc["content_mode"] == "template"
    assert payload_doc["provider_template_name"] == "renewal_reminder_30"
    assert payload_doc["whatsapp_body_template"] == "WhatsApp Govde"
    assert payload_doc["is_active"] == 0
    assert result == {"template": "TPL-0001"}
    quick_create_api.frappe.db.commit.assert_called_once()
