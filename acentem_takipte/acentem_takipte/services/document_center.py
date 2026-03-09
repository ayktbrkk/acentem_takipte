from __future__ import annotations

from urllib.parse import urlparse


PDF_EXTENSIONS = {"pdf"}
IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"}
SPREADSHEET_EXTENSIONS = {"xls", "xlsx", "csv"}


def build_document_profile(files: list[dict] | None) -> dict:
    rows = [dict(row or {}) for row in (files or [])]
    total = len(rows)
    pdf_count = 0
    image_count = 0
    spreadsheet_count = 0

    for row in rows:
        extension = _file_extension(row)
        if extension in PDF_EXTENSIONS:
            pdf_count += 1
        elif extension in IMAGE_EXTENSIONS:
            image_count += 1
        elif extension in SPREADSHEET_EXTENSIONS:
            spreadsheet_count += 1

    other_count = max(total - pdf_count - image_count - spreadsheet_count, 0)
    last_uploaded_on = rows[0].get("creation") if rows else None

    return {
        "total_files": total,
        "pdf_count": pdf_count,
        "image_count": image_count,
        "spreadsheet_count": spreadsheet_count,
        "other_count": other_count,
        "last_uploaded_on": last_uploaded_on,
    }


def _file_extension(row: dict) -> str:
    file_name = str(row.get("file_name") or "").strip()
    if "." in file_name:
        return file_name.rsplit(".", 1)[-1].lower()

    file_url = str(row.get("file_url") or "").strip()
    path = urlparse(file_url).path
    if "." in path:
        return path.rsplit(".", 1)[-1].lower()

    return ""
