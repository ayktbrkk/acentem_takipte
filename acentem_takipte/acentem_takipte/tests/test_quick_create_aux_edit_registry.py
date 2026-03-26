from __future__ import annotations

from unittest.mock import MagicMock, patch

from acentem_takipte.acentem_takipte.api import quick_create as quick_create_api


def _prefixed_option(value, allowed, default=None):
    return f"OPT::{value or default}"


def _prefixed_link(doctype, value, required=False):
    return f"LINK::{doctype}::{value}"


def _prefixed_date(value):
    return f"DATE::{value}"


def test_apply_aux_edit_payload_updates_notification_template_channel_both():
    doc = MagicMock()
    doc.doctype = "AT Notification Template"
    doc.source_doctype = None

    quick_create_api._apply_aux_edit_payload(
        doc,
        {
            "channel": "Both",
            "content_mode": "template",
            "provider_template_name": "claim_status_paid",
            "provider_template_category": "UTILITY",
            "whatsapp_body_template": "Odeme tamamlandi",
        },
    )

    assert doc.channel == "Both"
    assert doc.content_mode == "template"
    assert doc.provider_template_name == "claim_status_paid"
    assert doc.provider_template_category == "UTILITY"
    assert doc.whatsapp_body_template == "Odeme tamamlandi"


def test_apply_aux_edit_payload_updates_call_note_channel_video_call():
    doc = MagicMock()
    doc.doctype = "AT Call Note"
    doc.source_doctype = None

    quick_create_api._apply_aux_edit_payload(
        doc,
        {
            "channel": "Video Call",
        },
    )

    assert doc.channel == "Video Call"


def test_apply_aux_edit_payload_maps_call_note_option_fields():
    doc = MagicMock()
    doc.doctype = "AT Call Note"
    doc.source_doctype = None

    with patch.object(quick_create_api, "_normalize_option", side_effect=_prefixed_option):
        quick_create_api._apply_aux_edit_payload(
            doc,
            {
                "direction": "Inbound",
                "call_status": "Completed",
            },
        )

    assert doc.direction == "OPT::Inbound"
    assert doc.call_status == "OPT::Completed"


def test_apply_aux_edit_payload_maps_claim_field_types():
    doc = MagicMock()
    doc.doctype = "AT Claim"
    doc.source_doctype = None

    with patch.object(quick_create_api, "_normalize_link", side_effect=_prefixed_link):
        with patch.object(quick_create_api, "_normalize_option", side_effect=_prefixed_option):
            with patch.object(quick_create_api, "_normalize_date", side_effect=_prefixed_date):
                quick_create_api._apply_aux_edit_payload(
                    doc,
                    {
                        "assigned_expert": "agent@example.com",
                        "claim_status": "Approved",
                        "appeal_status": "Appeal Pending",
                        "next_follow_up_on": "2026-03-12",
                        "approved_amount": 1250.5,
                        "rejection_reason": " Eksik evrak ",
                    },
                )

    assert doc.assigned_expert == "LINK::User::agent@example.com"
    assert doc.claim_status == "OPT::Approved"
    assert doc.appeal_status == "OPT::Appeal Pending"
    assert doc.next_follow_up_on == "DATE::2026-03-12"
    assert doc.approved_amount == 1250.5
    assert doc.rejection_reason == "Eksik evrak"


def test_apply_aux_edit_payload_maps_customer_relation_check_field():
    doc = MagicMock()
    doc.doctype = "AT Customer Relation"
    doc.source_doctype = None

    quick_create_api._apply_aux_edit_payload(doc, {"is_household": "1"})

    assert doc.is_household == 1


def test_apply_aux_edit_payload_maps_activity_field_types():
    doc = MagicMock()
    doc.doctype = "AT Activity"
    doc.source_doctype = None

    with patch.object(quick_create_api, "_normalize_link", side_effect=_prefixed_link):
        with patch.object(quick_create_api, "_normalize_option", side_effect=_prefixed_option):
            with patch.object(quick_create_api, "_normalize_datetime", side_effect=lambda value: f"DT::{value}"):
                quick_create_api._apply_aux_edit_payload(
                    doc,
                    {
                        "activity_type": "Review",
                        "assigned_to": "agent@example.com",
                        "status": "Shared",
                    },
                )

    assert doc.activity_type == "OPT::Review"
    assert doc.assigned_to == "LINK::User::agent@example.com"
    assert doc.status == "OPT::Shared"
