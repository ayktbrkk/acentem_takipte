#!/usr/bin/env python3
from __future__ import annotations

import csv
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
LIST_EXPORTS = REPO / "acentem_takipte/acentem_takipte/services/list_exports.py"
TR_CSV = REPO / "acentem_takipte/translations/tr.csv"

TRANSLATIONS = {
    "Lead": "Fırsat",
    "Active Gross Premium": "Aktif Brüt Prim",
    "Active Policies": "Aktif Poliçeler",
    "Amount": "Tutar",
    "Appeal Status": "İtiraz Durumu",
    "Approved Amount": "Onaylanan Tutar",
    "Assigned Expert": "Atanan Eksper",
    "Assigned To": "Atanan Kişi",
    "Branch": "Branş",
    "Can Convert": "Dönüştürülebilir",
    "Carrier Policy Number": "Sigorta Şirketi Poliçe No",
    "Claim No": "Hasar No",
    "Claims Board": "Hasar Panosu",
    "Conversion": "Dönüşüm",
    "Converted Offer": "Dönüştürülen Teklif",
    "Converted Policy": "Dönüştürülen Poliçe",
    "Customer List": "Müşteri Listesi",
    "Direction": "Yön",
    "Due Date": "Vade Tarihi",
    "End Date": "Bitiş Tarihi",
    "Estimated Gross Premium": "Tahmini Brüt Prim",
    "Follow-up State": "Takip Durumu",
    "GWP TRY": "GWP TRY",
    "Gross Premium": "Brüt Prim",
    "Incident Date": "Olay Tarihi",
    "Lead List": "Fırsat Listesi",
    "Lost Reason": "Kayıp Nedeni",
    "Missing Fields": "Eksik Alanlar",
    "Net Premium": "Net Prim",
    "Next Follow Up": "Sonraki Takip",
    "Offer Date": "Teklif Tarihi",
    "Offer List": "Teklif Listesi",
    "Paid Amount": "Ödenen Tutar",
    "Payment Date": "Ödeme Tarihi",
    "Payment No": "Ödeme No",
    "Payments Board": "Tahsilat Panosu",
    "Policy End Date": "Poliçe Bitiş Tarihi",
    "Policy List": "Poliçe Listesi",
    "Rejection Reason": "Red Nedeni",
    "Renewal Task": "Yenileme Görevi",
    "Renewals Board": "Yenileme Panosu",
    "Sales Entity": "Satış Birimi",
    "Valid Until": "Geçerlilik Tarihi",
}


def main() -> int:
    text = LIST_EXPORTS.read_text(encoding="utf-8")
    labels = sorted(set(re.findall(r'_t\("([^"]+)"\)', text)))

    catalog: dict[str, str] = {}
    with TR_CSV.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.reader(handle):
            if len(row) >= 2 and row[0]:
                catalog[row[0]] = row[1]

    missing = [label for label in labels if label not in catalog]
    print(f"missing_from_catalog={len(missing)}")
    for label in missing:
        print(label)

    to_add = {label: TRANSLATIONS[label] for label in missing if label in TRANSLATIONS}
    unknown = [label for label in missing if label not in TRANSLATIONS]
    if unknown:
        print(f"unknown={unknown}")

    if not to_add:
        return 0

    rows: list[list[str]] = []
    with TR_CSV.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.reader(handle))

    for source, translation in sorted(to_add.items()):
        if source not in catalog:
            rows.append([source, translation, ""])

    with TR_CSV.open("w", encoding="utf-8", newline="") as handle:
        csv.writer(handle, lineterminator="\n").writerows(rows)

    print(f"added={len(to_add)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
