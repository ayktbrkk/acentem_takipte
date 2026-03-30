from __future__ import annotations

import csv
from functools import lru_cache
from pathlib import Path

import frappe

TRANSLATIONS_DIR = Path(__file__).resolve().parents[2] / "translations"


def _normalize_locale(locale: str | None) -> str:
    value = str(locale or getattr(frappe.local, "lang", "") or "en").strip().lower()
    return value or "en"


@lru_cache(maxsize=None)
def load_translation_catalog(locale: str | None) -> dict[str, str]:
    normalized_locale = _normalize_locale(locale)
    locale_code = normalized_locale.split("-", 1)[0]
    translation_path = TRANSLATIONS_DIR / f"{locale_code}.csv"
    if not translation_path.exists():
        return {}

    catalog: dict[str, str] = {}
    with translation_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        for row in reader:
            if len(row) < 2:
                continue
            source = str(row[0] or "").strip()
            translation = str(row[1] or "").strip()
            if source and source not in catalog:
                catalog[source] = translation or source
    return catalog


def translate_text(source: str, locale: str | None = None) -> str:
    text = str(source or "")
    if not text:
        return ""

    normalized_locale = _normalize_locale(locale)
    if normalized_locale.startswith("en"):
        return text

    catalog = load_translation_catalog(normalized_locale)
    return catalog.get(text, text)
