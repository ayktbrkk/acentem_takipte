"""
Migration patch: AT Document.document_sub_type — Türkçe depolanan değerleri İngilizce stored values'a çevir.

Eski değerler (Türkçe)  →  Yeni değerler (İngilizce)
─────────────────────────────────────────────────────
Ruhsat                  →  Vehicle Registration
Kimlik                  →  ID Document
Poliçe Kopyası          →  Policy Copy
Hasar Fotoğrafı         →  Damage Photo
Diğer                   →  Other
"""
from __future__ import annotations

import frappe


VALUE_MAP = {
    "Ruhsat": "Vehicle Registration",
    "Kimlik": "ID Document",
    "Poliçe Kopyası": "Policy Copy",
    "Hasar Fotoğrafı": "Damage Photo",
    "Diğer": "Other",
}


def execute():
    if not frappe.db.exists("DocType", "AT Document"):
        return

    for old_value, new_value in VALUE_MAP.items():
        frappe.db.sql(
            """
            UPDATE `tabAT Document`
            SET    document_sub_type = %s
            WHERE  document_sub_type = %s
            """,
            (new_value, old_value),
        )

    frappe.db.commit()
