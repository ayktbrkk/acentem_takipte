from __future__ import annotations

import csv
import io

from acentem_takipte.acentem_takipte.services.data_import.parsers.base import ParsedSheet


def parse_csv_text(*, text: str, delimiter: str = ",", limit: int = 200) -> ParsedSheet:
    safe_text = str(text or "").lstrip("\ufeff").strip()
    if not safe_text:
        return ParsedSheet()

    delimiter_char = (delimiter or ",")[0]
    reader = csv.DictReader(io.StringIO(safe_text), delimiter=delimiter_char)
    headers = [str(key or "").strip() for key in (reader.fieldnames or []) if str(key or "").strip()]
    rows: list[dict[str, str]] = []
    safe_limit = max(int(limit), 1)

    for index, row in enumerate(reader):
        if index >= safe_limit:
            break
        rows.append(
            {
                str(key or "").strip(): str(value or "").strip()
                for key, value in (row or {}).items()
                if str(key or "").strip()
            }
        )

    return ParsedSheet(headers=headers, rows=rows)
