from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

import acentem_takipte.acentem_takipte.doctype.at_policy.at_policy as policy_module
from acentem_takipte.acentem_takipte.doctype.at_policy.at_policy import ATPolicy


def test_on_update_enqueues_fx_refresh_after_commit():
    doc = SimpleNamespace(
        doctype="AT Policy",
        name="POL-USD-0001",
        currency="USD",
        fx_rate=0,
        is_new=lambda: True,
    )

    with patch.object(policy_module.frappe, "enqueue") as enqueue_mock, patch.object(
        policy_module.frappe, "flags", SimpleNamespace(in_test=True)
    ):
        ATPolicy.on_update(doc)

    enqueue_mock.assert_called_once_with(
        "acentem_takipte.acentem_takipte.doctype.at_policy.at_policy.update_policy_fx_rate_async",
        policy_name="POL-USD-0001",
        now=True,
        enqueue_after_commit=True,
    )


def test_after_insert_uses_policy_delivery_template_key():
    doc = SimpleNamespace(
        doctype="AT Policy",
        name="POL-0001",
        policy_no="POL-0001",
        customer="CUS-0001",
        issue_date="2026-03-06",
        start_date="2026-03-06",
        end_date="2027-03-06",
        currency="TRY",
        net_premium=1000,
        tax_amount=50,
        commission_amount=100,
        gross_premium=1150,
        commission=100,
        insurance_company="ACME Sigorta",
        branch="Kasko",
        db_set=lambda *args, **kwargs: None,
    )

    with patch(
        "acentem_takipte.acentem_takipte.doctype.at_policy.at_policy.create_policy_snapshot"
    ) as create_snapshot:
        create_snapshot.return_value = type("Snapshot", (), {"snapshot_version": 1})()
        with patch(
            "acentem_takipte.acentem_takipte.doctype.at_policy.at_policy.create_notification_drafts"
        ) as create_drafts:
            with patch(
                "acentem_takipte.acentem_takipte.doctype.at_policy.at_policy.attach_policy_pdf_to_customer_folder"
            ):
                ATPolicy.after_insert(doc)

    kwargs = create_drafts.call_args.kwargs
    assert kwargs["event_key"] == "policy_created"
    assert kwargs["template_key"] == "policy_delivery"
    assert kwargs["reference_name"] == "POL-0001"


