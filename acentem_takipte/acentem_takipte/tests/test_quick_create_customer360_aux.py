from __future__ import annotations

from unittest.mock import MagicMock, patch

from frappe import _

from acentem_takipte.acentem_takipte.api import quick_create as quick_create_api


def test_assert_delete_permission_uses_shared_mutation_helper():
    with patch.object(quick_create_api, "assert_mutation_access") as mutation_access:
        quick_create_api._assert_delete_permission("AT Customer Relation", _("Delete denied"))

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

    service_mock.assert_called_once_with(
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

    service_mock.assert_called_once_with(
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

    delete_permission_mock.assert_called_once_with(
        "AT Customer Relation",
        "You do not have permission to delete this record.",
    )
    fake_doc.check_permission.assert_called_once_with("delete")
    service_mock.assert_called_once_with(fake_doc)
    assert result == {"record": "REL-001", "doctype": "AT Customer Relation", "deleted": True}
