from types import SimpleNamespace
from unittest.mock import MagicMock

import acentem_takipte.acentem_takipte.notifications
from acentem_takipte.acentem_takipte.services.notifications import build_notification_draft_payloads


def test_get_customer_payload_includes_office_branch(monkeypatch):
    customer_doc = SimpleNamespace(
        name="CUST-001",
        full_name="Ada Lovelace",
        tax_id="12345678901",
        phone="+905551112233",
        office_branch="Istanbul",
        get=lambda fieldname: {"email": "ada@example.com", "office_branch": "Istanbul"}.get(fieldname),
    )
    monkeypatch.setattr(notifications.frappe.db, "exists", lambda doctype, name: doctype == "AT Customer" and name == "CUST-001")
    monkeypatch.setattr(notifications.frappe, "get_doc", lambda doctype, name: customer_doc)

    payload = notifications._get_customer_payload("CUST-001")

    assert payload["office_branch"] == "Istanbul"


def test_build_notification_draft_payloads_prefers_customer_office_branch():
    template = SimpleNamespace(
        name="TPL-001",
        channel="WHATSAPP",
        language="tr",
        subject="",
        body_template="Hello {{ customer.full_name }}",
        whatsapp_body_template="Hello {{ customer.full_name }}",
        provider_template_name="renewal_whatsapp",
    )

    payloads = build_notification_draft_payloads(
        templates=[template],
        event_key="renewal_due",
        reference_doctype="AT Policy",
        reference_name="POL-001",
        customer="CUST-001",
        customer_payload={
            "name": "CUST-001",
            "full_name": "Ada Lovelace",
            "phone": "+905551112233",
            "office_branch": "Istanbul",
        },
        context={"office_branch": "Ankara"},
        resolve_channels=lambda channel: [channel],
        resolve_recipient=lambda **kwargs: kwargs["customer_payload"].get("phone"),
        resolve_body_template_for_channel=lambda template_doc, channel: template_doc.whatsapp_body_template,
    )

    assert payloads[0]["office_branch"] == "Istanbul"


def test_build_notification_draft_payloads_falls_back_to_context_office_branch():
    template = SimpleNamespace(
        name="TPL-002",
        channel="SMS",
        language="tr",
        subject="",
        body_template="Test",
        sms_body_template="Test",
        provider_template_name=None,
    )

    payloads = build_notification_draft_payloads(
        templates=[template],
        event_key="payment_due",
        reference_doctype="AT Payment",
        reference_name="PAY-001",
        customer="CUST-002",
        customer_payload={"name": "CUST-002", "phone": "+905551112244"},
        context={"office_branch": "Izmir"},
        resolve_channels=lambda channel: [channel],
        resolve_recipient=lambda **kwargs: kwargs["customer_payload"].get("phone"),
        resolve_body_template_for_channel=lambda template_doc, channel: template_doc.sms_body_template,
    )

    assert payloads[0]["office_branch"] == "Izmir"



