#!/usr/bin/env python3
"""Repair mojibake in acentem_takipte/translations/tr.csv and rewrite UTF-8."""

from __future__ import annotations

import csv
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
TR_CSV = REPO_ROOT / "acentem_takipte" / "translations" / "tr.csv"


def _looks_like_mojibake(text: str) -> bool:
    return any(marker in text for marker in ("Ã", "Ä", "Å", "â€", "ÄŸ", "Ä±", "ÅŸ", "Ã¶", "Ã¼", "Ã§"))


def repair_mojibake(text: str) -> str:
    value = str(text or "")
    if not value:
        return value
    current = value
    for _ in range(3):
        if not _looks_like_mojibake(current):
            break
        repaired = current
        for encoding in ("cp1252", "latin-1", "iso-8859-1"):
            try:
                candidate = current.encode(encoding).decode("utf-8")
            except (UnicodeDecodeError, UnicodeEncodeError):
                continue
            if candidate and not _looks_like_mojibake(candidate):
                repaired = candidate
                break
        if repaired == current:
            break
        current = repaired
    return current


def main() -> int:
    if not TR_CSV.exists():
        print(f"Missing file: {TR_CSV}")
        return 1

    rows: list[list[str]] = []
    repaired_count = 0

    with TR_CSV.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        for row in reader:
            if len(row) < 2:
                rows.append(row)
                continue
            translation = str(row[1] or "")
            fixed = repair_mojibake(translation)
            if fixed != translation:
                repaired_count += 1
            row[1] = fixed
            rows.append(row)

    with TR_CSV.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerows(rows)

    remaining = sum(
        1
        for row in rows
        if len(row) >= 2 and _looks_like_mojibake(str(row[1] or ""))
    )
    print(f"repaired={repaired_count} remaining_mojibake={remaining} total_rows={len(rows)}")
    return 1 if remaining else 0


if __name__ == "__main__":
    sys.exit(main())
