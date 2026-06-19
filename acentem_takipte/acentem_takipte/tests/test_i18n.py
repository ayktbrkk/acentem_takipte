from acentem_takipte.acentem_takipte.utils.i18n import (
    load_translation_catalog,
    repair_mojibake,
    translate_text,
)


def test_repair_mojibake_restores_turkish_characters():
    assert repair_mojibake("MÃ¼ÅŸteri") == "Müşteri"
    assert repair_mojibake("PoliÃ§e") == "Poliçe"
    assert repair_mojibake("HakkÄ±nda") == "Hakkında"


def test_repair_mojibake_leaves_valid_text_unchanged():
    assert repair_mojibake("Müşteri") == "Müşteri"
    assert repair_mojibake("Customer") == "Customer"


def test_translate_text_uses_repaired_turkish_catalog():
    load_translation_catalog.cache_clear()
    assert translate_text("Customer", "tr") == "Müşteri"
    assert translate_text("Policy", "tr") == "Poliçe"
