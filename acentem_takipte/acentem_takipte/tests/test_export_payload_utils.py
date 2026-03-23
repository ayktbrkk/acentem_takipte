from acentem_takipte.acentem_takipte.services import export_payload_utils


def test_coerce_columns_deduplicates_and_trims():
    assert export_payload_utils.coerce_columns(" name, amount, name ") == ["name", "amount"]


def test_coerce_filters_accepts_json_string():
    assert export_payload_utils.coerce_filters('{"status":"Open"}') == {"status": "Open"}


def test_coerce_string_list_deduplicates():
    assert export_payload_utils.coerce_string_list(" a@example.com, b@example.com, a@example.com ") == [
        "a@example.com",
        "b@example.com",
    ]


def test_normalize_title_and_export_key_use_fallbacks():
    assert export_payload_utils.normalize_title("   ", "Report X") == "Report X"
    assert export_payload_utils.normalize_export_key("   ", "report") == "report"


def test_coerce_locale_and_export_format_use_fallbacks():
    assert export_payload_utils.coerce_locale(" tr-TR ") == "tr-TR"
    assert export_payload_utils.coerce_locale("   ") == "tr"
    assert export_payload_utils.coerce_export_format(" application/pdf ") == "pdf"
    assert export_payload_utils.coerce_export_format("xlsb") == "xlsx"


def test_infer_content_type_uses_filename_extension():
    assert export_payload_utils.infer_content_type("file.pdf", "") == "application/pdf"
    assert (
        export_payload_utils.infer_content_type("file.xlsx", "")
        == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


def test_coerce_download_payload_normalizes_content_and_defaults():
    payload = export_payload_utils.coerce_download_payload(
        {
            "filename": " report.pdf ",
            "filecontent": "abc",
            "type": "",
            "content_type": "",
        }
    )

    assert payload["filename"] == "report.pdf"
    assert payload["type"] == "download"
    assert payload["content_type"] == "application/pdf"
    assert payload["filecontent"] == b"abc"

