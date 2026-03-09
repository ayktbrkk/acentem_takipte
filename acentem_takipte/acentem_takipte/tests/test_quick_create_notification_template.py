from __future__ import annotations

from unittest.mock import MagicMock, patch

from acentem_takipte.acentem_takipte.api import quick_create as quick_create_api


def test_create_quick_notification_template_supports_whatsapp_fields():
    fake_doc = MagicMock()
    fake_doc.name = "TPL-0001"

    with patch.object(quick_create_api, "assert_mutation_access"):
        with patch.object(quick_create_api.frappe, "get_doc", return_value=fake_doc) as get_doc_mock:
            with patch.object(quick_create_api.frappe.db, "commit"):
                result = quick_create_api.create_quick_notification_template(
                    template_key="renewal_reminder_30",
                    event_key="renewal_due",
                    channel="WHATSAPP",
                    content_mode="template",
                    language="tr",
                    provider_template_name="renewal_reminder_30",
                    provider_template_category="UTILITY",
                    variables_schema_json='[{"name":"musteri_adi"}]',
                    body_template="Genel",
                    whatsapp_body_template="WhatsApp Govde",
                )

    payload = get_doc_mock.call_args.args[0]
    assert payload["channel"] == "WHATSAPP"
    assert payload["content_mode"] == "template"
    assert payload["provider_template_name"] == "renewal_reminder_30"
    assert payload["provider_template_category"] == "UTILITY"
    assert payload["whatsapp_body_template"] == "WhatsApp Govde"
    assert result == {"template": "TPL-0001"}


def test_apply_aux_edit_payload_updates_whatsapp_template_fields():
    doc = MagicMock()
    doc.doctype = "AT Notification Template"
    doc.source_doctype = None

    quick_create_api._apply_aux_edit_payload(
        doc,
        {
            "channel": "WHATSAPP",
            "content_mode": "template",
            "provider_template_name": "claim_status_paid",
            "provider_template_category": "UTILITY",
            "whatsapp_body_template": "Odeme tamamlandi",
        },
    )

    assert doc.channel == "WHATSAPP"
    assert doc.content_mode == "template"
    assert doc.provider_template_name == "claim_status_paid"
    assert doc.provider_template_category == "UTILITY"
    assert doc.whatsapp_body_template == "Odeme tamamlandi"
