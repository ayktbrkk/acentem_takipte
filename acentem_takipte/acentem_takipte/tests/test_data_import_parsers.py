from acentem_takipte.acentem_takipte.platform.import_export.data_import.parsers.csv_parser import parse_csv_text


def test_parse_csv_text_reads_headers_and_rows_with_bom():
    text = "\ufefffull_name,tax_id\nAli Veli,12345678901\nAyse Yilmaz,10987654321"
    parsed = parse_csv_text(text=text, delimiter=",", limit=10)

    assert parsed.headers == ["full_name", "tax_id"]
    assert len(parsed.rows) == 2
    assert parsed.rows[0]["full_name"] == "Ali Veli"
    assert parsed.rows[1]["tax_id"] == "10987654321"


def test_parse_csv_text_respects_limit():
    text = "full_name,tax_id\nA,1\nB,2\nC,3"
    parsed = parse_csv_text(text=text, limit=1)
    assert len(parsed.rows) == 1
    assert parsed.rows[0]["full_name"] == "A"
