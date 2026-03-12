from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

from acentem_takipte.acentem_takipte.services import accounting_statement_import


def test_build_statement_import_preview_matches_policy_and_payment_rows():
    csv_text = "\n".join(
        [
            "external_ref,policy_no,payment_no,customer,amount_try",
            "EXT-001,P-100,PAY-100,Aykut,1500",
            "EXT-002,P-404,,Ayse,2750",
        ]
    )

    def fake_get_all(doctype, filters=None, fields=None, limit_page_length=None):
        if doctype == "AT Policy":
            return [
                {
                    "name": "POL-001",
                    "policy_no": "P-100",
                    "customer": "CUST-001",
                    "insurance_company": "Anadolu",
                    "office_branch": "IST",
                    "status": "Active",
                }
            ]
        if doctype == "AT Payment":
            return [
                {
                    "name": "PAYDOC-001",
                    "payment_no": "PAY-100",
                    "customer": "CUST-001",
                    "policy": "POL-001",
                    "office_branch": "IST",
                    "status": "Scheduled",
                    "amount_try": 1500,
                }
            ]
        raise AssertionError(f"Unexpected doctype: {doctype}")

    with patch.object(accounting_statement_import.frappe, "get_all", side_effect=fake_get_all):
        result = accounting_statement_import.build_statement_import_preview(
            csv_text=csv_text,
            office_branch="IST",
            insurance_company="Anadolu",
        )

    assert result["summary"] == {
        "total_rows": 2,
        "matched_rows": 1,
        "unmatched_rows": 1,
        "total_amount_try": 4250.0,
    }
    assert result["rows"][0]["match_status"] == "Matched"
    assert result["rows"][0]["matched_policy"]["name"] == "POL-001"
    assert result["rows"][0]["matched_payment"]["name"] == "PAYDOC-001"
    assert result["rows"][1]["match_status"] == "Unmatched"


def test_build_statement_import_preview_normalizes_alias_columns_and_amounts():
    csv_text = "\n".join(
        [
            "externalRef;policy;payment;customer_name;total",
            'EXT-900;P-900;PAY-900;Açenta Müşteri;"1.250,75"',
        ]
    )

    with patch.object(accounting_statement_import.frappe, "get_all", return_value=[]):
        result = accounting_statement_import.build_statement_import_preview(
            csv_text=csv_text,
            delimiter=";",
        )

    assert result["summary"]["total_rows"] == 1
    row = result["rows"][0]
    assert row["external_ref"] == "EXT-900"
    assert row["policy_no"] == "P-900"
    assert row["payment_no"] == "PAY-900"
    assert row["customer"] == "Açenta Müşteri"
    assert row["amount_try"] == 1250.75
    assert row["match_status"] == "Unmatched"


def test_import_statement_preview_rows_imports_only_matched_rows():
    entry = SimpleNamespace(
        name="ACC-001",
        source_doctype="AT Payment",
        source_name="PAYDOC-001",
        entry_type=None,
        policy=None,
        customer=None,
        office_branch=None,
        insurance_company=None,
        currency=None,
        local_amount=None,
        local_amount_try=None,
        external_amount=None,
        external_amount_try=None,
        external_ref=None,
        payload_json=None,
        integration_hash=None,
        status=None,
        error_message=None,
        save=lambda ignore_permissions=True: None,
        insert=lambda ignore_permissions=True: None,
    )

    preview_payload = {
        "rows": [
            {
                "external_ref": "EXT-001",
                "policy_no": "P-100",
                "payment_no": "PAY-100",
                "customer": "Aykut",
                "amount_try": 1500,
                "matched_policy": {"name": "POL-001"},
                "matched_payment": {"name": "PAYDOC-001"},
            },
            {
                "external_ref": "EXT-002",
                "policy_no": "P-404",
                "payment_no": "",
                "customer": "Ayse",
                "amount_try": 2750,
                "matched_policy": None,
                "matched_payment": None,
            },
        ],
        "summary": {
            "total_rows": 2,
            "matched_rows": 1,
            "unmatched_rows": 1,
            "total_amount_try": 4250.0,
        },
    }

    with patch.object(accounting_statement_import, "build_statement_import_preview", return_value=preview_payload):
        with patch("acentem_takipte.acentem_takipte.accounting.build_accounting_payload", return_value={
            "entry_type": "Payment",
            "policy": "POL-001",
            "customer": "CUST-001",
            "office_branch": "IST",
            "insurance_company": "Anadolu",
            "currency": "TRY",
            "local_amount": 1500,
            "local_amount_try": 1500,
        }):
            with patch("acentem_takipte.acentem_takipte.accounting._get_or_create_entry", return_value=entry):
                with patch("acentem_takipte.acentem_takipte.accounting._evaluate_mismatch", return_value=("Amount", {"reason": "amount_mismatch"})):
                    with patch("acentem_takipte.acentem_takipte.accounting._close_open_items") as close_items:
                        with patch("acentem_takipte.acentem_takipte.accounting._upsert_open_item") as upsert_item:
                            with patch("acentem_takipte.acentem_takipte.accounting._set_entry_reconciliation_flag") as reconcile_flag:
                                result = accounting_statement_import.import_statement_preview_rows(csv_text="x")

    assert result == {
        "imported": 1,
        "skipped": 1,
        "open_items": 1,
        "preview_summary": preview_payload["summary"],
    }
    assert entry.entry_type == "Payment"
    assert entry.external_ref == "EXT-001"
    assert entry.external_amount_try == 1500
    close_items.assert_called_önce_with("ACC-001", keep_mismatch_type="Amount")
    upsert_item.assert_called_önce()
    reconcile_flag.assert_called_önce_with("ACC-001", True)
