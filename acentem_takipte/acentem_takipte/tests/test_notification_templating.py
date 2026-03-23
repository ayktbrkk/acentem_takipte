from __future__ import annotations

import types

import pytest

from acentem_takipte.notifications_templateing import (
    parse_template_components,
    resolve_body_template,
    resolve_subject_template,
)


def test_resolve_body_template_prefers_channel_specific_template():
    template_doc = types.SimpleNamespace(
        body_template="Genel",
        sms_body_template="SMS Metni",
        email_body_template="Email Metni",
        whatsapp_body_template="WhatsApp Metni",
    )

    assert resolve_body_template(template_doc, "WHATSAPP") == "WhatsApp Metni"
    assert resolve_body_template(template_doc, "SMS") == "SMS Metni"


def test_resolve_body_template_falls_back_to_default_body():
    template_doc = types.SimpleNamespace(
        body_template="Genel",
        sms_body_template="",
        email_body_template=None,
        whatsapp_body_template=None,
    )

    assert resolve_body_template(template_doc, "EMAIL") == "Genel"


def test_resolve_subject_template_only_returns_email_subject():
    template_doc = types.SimpleNamespace(subject="Bildirim")

    assert resolve_subject_template(template_doc, "EMAIL") == "Bildirim"
    assert resolve_subject_template(template_doc, "WHATSAPP") is None


def test_parse_template_components_returns_list():
    raw_value = '[{"type":"body","parameters":[{"type":"text","text":"Aykut"}]}]'

    parsed = parse_template_components(raw_value)

    assert parsed[0]["type"] == "body"


def test_parse_template_components_rejects_non_list_json():
    with pytest.raises(ValueError):
        parse_template_components('{"type":"body"}')
