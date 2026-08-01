# Komisyon Dagilim Mantigi Duzeltme — Gelistirme Plani

**Tarih:** 2026-07-30
**Durum:** Taslak
**Kapsam:** Waterfall komisyon dagilim algoritmasi, Sales Entity hierarchy, Office Branch iliskisi

---

## 1. Mevcut Durum ve Sorun

### 1.1 Waterfall Algoritmasi (Mevcut)

```
Policy sales_entity (leaf) → parent → parent → ... → root (is_root=1)
Her seviyede: entity kalan tutarin share_pct%'sini alir, geri kalani ustune gecer.
```

**Ornek:** Komisyon = ₺1000, Temsilci(20%) → Ekip(30%) → Merkez(50%)
- Temsilci: 1000 × 20% = ₺200, kalan = ₺800
- Ekip: 800 × 30% = ₺240, kalan = ₺560
- Merkez: 560 × 50% = ₺280, kalan = ₺280
- **Toplam: ₺720 dagitildi, ₺280 dagitilmadi**

### 1.2 Sorun

Root entity (genel müdürlük) `commission_share_pct=50` ile sadece kalanin %50'sini aliyor. Geriye kalan %50 "dagitilmamis" kaliyor. Bu is modeline uygun degil.

### 1.3 Kullanici Beklentisi

> "genel müdürlük olan merkez satış birimi kalan tüm komisyonu almalı"
> "alt acenteler komisyon payını kendi aldıklarına göre paylaşmalı"

Yani:
- **Alt acenteler** (Temsilci, Ekip): kendi share_pct'lerine gore kalan tutardan pay alir
- **Root entity** (genel müdürlük/merkez): **kalan tum komisyonu** alir (share_pct'sine bakilmaksizin)

---

## 2. Yeni Mantik

### 2.1 Algoritma Degisikligi

```python
# Mevcut (hatali):
if amount_raw >= remaining - 0.01:
    entry_amount = remaining  # Son entity kalan tum tutari alir

# Yeni (dogru):
# Root entity her zaman kalan tum tutari alir
if is_root:
    entry_amount = remaining
    remaining = 0.0
else:
    entry_amount = remaining * share_pct / 100
    remaining -= entry_amount
```

### 2.2 Ornek Hesaplama (Yeni Mantik)

**Ornek 1:** Komisyon = ₺1000, Temsilci(20%) → Ekip(30%) → Merkez(root)
- Temsilci: 1000 × 20% = ₺200, kalan = ₺800
- Ekip: 800 × 30% = ₺240, kalan = ₺560
- Merkez (root): **₺560** (kalanin tamami), kalan = ₺0
- **Toplam: ₺1000 — tamami dagitildi**

**Ornek 2:** Komisyon = ₺200, Ankara Acentesi(root, 50%)
- Ankara Acentesi (root): **₺200** (kalanin tamami), kalan = ₺0
- **Toplam: ₺200 — tamami dagitildi**

**Ornek 3:** Komisyon = ₺1000, Temsilci(60%) → Merkez(root, 50%)
- Temsilci: 1000 × 60% = ₺600, kalan = ₺400
- Merkez (root): **₺400** (kalanin tamami), kalan = ₺0
- **Toplam: ₺1000 — tamami dagitildi**

### 2.3 Onemli Notlar

- Root entity'nin `commission_share_pct` degeri artik sadece referans amacli. Gercek dagilimda root her zaman kalanin tamamini alir.
- Eger root entity'nin `commission_share_pct=0` ise bile, kalan tutari alir (cunku root entity diger entity'lerin kalanini toplar).
- `is_root=1` olmayan entity'ler kendi share_pct'lerine gore pay alir.

---

## 3. Degisiklik Alanlari

### 3.1 Backend (Kritik)

| Dosya | Degisiklik |
|-------|-----------|
| `at_policy.py` → `_build_commission_distribution()` | Root entity kontrolü ekle: `is_root` field'ini oku, root ise kalanin tamamini ata |
| `recalc_commission_dist.py` | Yeni mantikla tum politikalari yeniden hesapla |
| `balance.py` | Gerekli degisiklik yok (zaten dogru calisiyor) |
| `statement_import.py` | Gerekli degisiklik yok |

### 3.2 Frontend (Orta)

| Dosya | Degisiklik |
|-------|-----------|
| `PolicyDetail.vue` | Uyari badge'i kaldir (artik her zaman toplam esit olacak) |
| `translations.js` | `commission_mismatch` kaldir veya nadir durumlar icin koru |

### 3.3 Test (Kritik)

| Dosya | Degisiklik |
|-------|-----------|
| `test_commission_balances.py` | Yeni mantikla test senaryolari guncelle |
| `test_commission_statement_import.py` | Gerekli degisiklik yok |

### 3.4 Migration (Kritik)

| Islem | Aciklama |
|-------|----------|
| `recalc_commission_dist.py` | Tum aktif politikalari yeni algoritmayla yeniden hesapla |
| Manuel dogrulama | Ornek politikalarda sonuclari kontrol et |

---

## 4. Uygulama Adimlari

### Adim 1: `_build_commission_distribution()` guncelle

```python
def _build_commission_distribution(sales_entity, commission_amount, fx_rate):
    # ... mevcut kod ...
    while current_entity and current_entity not in visited:
        entity_data = frappe.db.get_value(
            "AT Sales Entity", current_entity,
            ["commission_share_pct", "full_name", "parent_entity", "is_root"],
            as_dict=True,
        ) or {}
        share_pct = flt(entity_data.get("commission_share_pct") or 100)
        is_root = entity_data.get("is_root")
        
        if is_root:
            # Root entity her zaman kalan tum tutari alir
            entry_amount = remaining
            remaining = 0.0
        elif share_pct <= 0:
            entry_amount = 0.0
        else:
            amount_raw = round(remaining * share_pct / 100, 2)
            if amount_raw >= remaining - 0.01:
                entry_amount = remaining
                remaining = 0.0
            else:
                entry_amount = amount_raw
                remaining = round(remaining - entry_amount, 2)
        
        # ... devam ...
```

### Adim 2: Migration scripti calistir

```bash
bench --site at.localhost execute acentem_takipte.acentem_takipte.scripts.recalc_commission_dist.execute
```

### Adim 3: Uyari badge'i kaldir/guncelle

PolicyDetail.vue'daki `commission_mismatch` uyari badge'i artik sadece cok nadir durumlarda gorunecek (ornegin round hatasi). Kaldirilabilir veya korunabilir.

### Adim 4: Testleri guncelle

Mevcut testlerdeki beklentileri yeni mantiga gore guncelle.

### Adim 5: Browser QA

- `/at/commissions` sayfasinda toplam tutarlarin dogrulugunu kontrol et
- Policy detail'da komisyon dagilimi tablosunu kontrol et
- Farkli senaryolar test et (tek entity, hiyerarsi, root entity)

---

## 5. Risk Degerlendirmesi

| Risk | Etki | Olasilik | Onlem |
|------|------|----------|-------|
| Mevcut politikalarin dagilimi degisir | Yuksek | Kesin | Migration scripti + manuel dogrulama |
| Root entity olmayan hiyerarsilerde behavior degisir | Orta | Dusuk | `is_root` kontrolü sadece root icin |
| Frontend uyari badge'i calismaz | Dusuk | Orta | Badge'i kaldir veya nadir durum icin koru |
| Testler basarisiz olur | Orta | Kesin | Testleri guncelle |

---

## 6. Dogrulama Kriterleri

- [ ] Tum aktif politikalarda `sum(distribution.amount) == commission_amount`
- [ ] Root entity her zaman kalanin tamamini aliyor
- [ ] Alt acenteler kendi share_pct'lerine gore pay aliyor
- [ ] `/at/commissions` sayfasinda toplam tutarlar dogru
- [ ] Policy detail'da uyari badge'i sadece hata durumunda gorunuyor
- [ ] Tum testler geciyor
- [ ] Browser QA temiz

---

## 7. Alternatif Yaklasimlar

### 7.1 root_share_pct ayri alan olarak ekleme

Yeni bir field: `root_share_pct` (default 100). Root entity icin ayri pay orani tanimla.

**Artisi:** Esneklik
**Eksisi:** Kompleksite, ek migration gerekli

### 7.2 entity_type'a gore otomatik belirleme

`entity_type == "Agency"` ise ve `is_root == 1` ise, otomatik olarak kalanin tamamini al.

**Artisi:** Ek field gerekmez
**Eksisi:** "Agency" olup root olmayan entity'ler etkilenir

### 7.3 Recommandation: Basit root fix

Mevcut `is_root` field'ini kullan. Root entity her zaman kalanin tamamini alir. En basit ve en az riskli cozum.

---

## 8. Ilgili Dosyalar

- `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py` (satir 421-492)
- `acentem_takipte/acentem_takipte/doctype/at_sales_entity/at_sales_entity.json`
- `acentem_takipte/acentem_takipte/doctype/at_office_branch/at_office_branch.json`
- `frontend/src/domains/policies/pages/PolicyDetail.vue` (satir 83-104)
- `frontend/src/config/policy_translations.js`
- `frontend/src/domains/commissions/pages/CommissionBalances.vue`
- `acentem_takipte/acentem_takipte/tests/test_commission_balances.py`
