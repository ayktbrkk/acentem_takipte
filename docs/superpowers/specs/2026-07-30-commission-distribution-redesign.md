# Komisyon Dagilim Sistemi — Yeniden Tasarim

**Tarih:** 2026-07-30
**Durum:** Onay bekliyor
**Kapsam:** Sigorta acentesi komisyon dagilim modeli, Sales Entity hierarchy, Office Branch baglantisi

---

## 1. Is Modeli

### 1.1 Gercek Dünya Senaryosu

**Kip Sigorta Acenteliği** orneginde:
- Sigorta sirketi komisyonu **head office'a** odar
- Head office, bu komisyonu **sales entity'lerle** paylasir
- Her entity belirlenen oranda payini alir
- Head office'in kendi payi = Toplam - Paylaşılan
- **Iki ayli takip gerekli**: Toplam Komisyon ve Paylaşılan Komisyon

### 1.2 Hiyerarsi Yapisi

```
Kip Sigorta Acenteliği (head office, is_head_office=1)
  ├── Istanbul Şubesi
  │     ├── Ekip Alpha
  │     │     ├── Temsilci Ali
  │     │     └── Temsilci Veli
  │     └── Ekip Beta
  │           └── Temsilci Mehmet
  ├── Ankara Şubesi
  │     ├── Ekip Gamma
  │     │     └── Temsilci Ayse
  │     └── Dış Temsilci (external)
  └── ...
```

### 1.3 Komisyon Akisi

```
Sigorta Sirketi → ₺1000 → Kip Sigorta Acentesi (head office)
                              ├── Head Office: ₺400 (%40)
                              ├── Istanbul Subesi: ₺300 (%30)
                              ├── Ekip Alpha: ₺150 (%15)
                              └── Temsilci Ali: ₺150 (%15)
                              Toplam: ₺1000 ✓
```

---

## 2. Veri Modeli

### 2.1 AT Office Branch (mevcut, kucuk degisiklikler)

| Field | Tip | Aciklama |
|-------|-----|----------|
| `office_branch_name` | Data | Sube adi |
| `office_branch_code` | Data | Sube kodu |
| `is_head_office` | Check | Head office mu? (globalde 1 tane) |
| `parent_office_branch` | Link (self) | Ust sube |
| `city` | Data | Sehir |
| `is_active` | Check | Aktif mi? |

**Degisiklik yok** — mevcut yapi yeterli.

### 2.2 AT Sales Entity (yeniden yapilandirma)

| Field | Tip | Aciklama |
|-------|-----|----------|
| `entity_type` | Select | Agency / Sub-Account / Representative |
| `full_name` | Data | Gorunen ad |
| `office_branch` | Link | Bagli oldugu sube |
| `parent_entity` | Link (self) | Ust entity (ayni sube icinde) |
| `is_root` | Check | Bu subenin root'u mu? (sube icinde 1 tane) |
| `commission_share_pct` | Float | Head office komisyonundan alinan pay (%) |
| `is_active` | Check | Aktif mi? |
| `is_pool` | Check | Pool entity mi? (devre disi birakilan entity'ler icin fallback) |

**Onemli degisiklik:**
- `commission_share_pct` artik **head office komisyonundan** alinan orani temsil eder
- Her entity kendi `commission_share_pct`'sini alir
- Root entity (sube root'u) **kalan tum komisyonu** alir
- Toplam pay her zaman %100 olur

### 2.3 AT Policy (mevcut, kucuk degisiklikler)

| Field | Tip | Aciklama |
|-------|-----|----------|
| `commission_distribution` | Long Text (JSON) | Dagilim detaylari |
| `commission_amount` | Currency | Toplam komisyon tutari |
| `sales_entity` | Link | Satis yapan entity (leaf) |

**commission_distribution JSON yapisi:**
```json
{
  "total_commission": 1000,
  "shared_commission": 600,
  "head_office_commission": 400,
  "entries": [
    {
      "entity": "AT-ENT-2026-00005",
      "entity_name": "Temsilci Ali",
      "level": 0,
      "share_pct": 15,
      "amount": 150,
      "office_branch": "Istanbul Subesi",
      "status": "Accrued"
    },
    {
      "entity": "AT-ENT-2026-00003",
      "entity_name": "Ekip Alpha",
      "level": 1,
      "share_pct": 15,
      "amount": 150,
      "office_branch": "Istanbul Subesi",
      "status": "Accrued"
    },
    {
      "entity": "AT-ENT-2026-00001",
      "entity_name": "Istanbul Subesi Muduru",
      "level": 2,
      "share_pct": 30,
      "amount": 300,
      "office_branch": "Istanbul Subesi",
      "status": "Accrued"
    },
    {
      "entity": "AT-ENT-2026-00000",
      "entity_name": "Kip Sigorta Acentesi",
      "level": 3,
      "share_pct": 40,
      "amount": 400,
      "office_branch": "Kip Sigorta",
      "status": "Accrued",
      "is_root": true
    }
  ]
}
```

---

## 3. Komisyon Hesaplama Algoritmasi

### 3.1 Yeni Algoritma (Head Office Merkezli)

```python
def compute_commission_distribution(sales_entity, commission_amount):
    """
    Head Office merkezli komisyon dagilimi.
    Her entity orijinal tutar uzerinden kendi payini alir.
    Root entity her zaman kalanini alir.
    """
    entries = []
    remaining = commission_amount
    
    # Hiyerarsiyi yukari dogru tara (leaf → root)
    current = sales_entity
    while current and current not in visited:
        entity_data = get_entity_data(current)
        share_pct = entity_data.commission_share_pct or 0
        is_root = entity_data.is_root
        
        if is_root:
            # Root entity kalan tum komisyonu alir
            amount = remaining
            remaining = 0
        else:
            # Orijinal tutar uzerinden pay hesapla
            amount = commission_amount * share_pct / 100
            remaining -= amount
        
        entries.append({
            "entity": current,
            "share_pct": share_pct,
            "amount": amount,
            "is_root": is_root,
        })
        
        if remaining <= 0.01:
            break
        current = entity_data.parent_entity
    
    return {
        "total_commission": commission_amount,
        "shared_commission": commission_amount - remaining,
        "head_office_commission": remaining,
        "entries": entries,
    }
```

### 3.2 Ornek Hesaplama

**₺1000 komisyon, Temsilci Ali tarafindan kesildi:**

```
Temsilci Ali:    ₺1000 × %15 = ₺150
Ekip Alpha:      ₺1000 × %15 = ₺150
Istanbul Root:   ₺1000 × %30 = ₺300
Kip Sigorta:     ₺1000 × %40 = ₺400 (root, kalan)
Toplam: ₺1000 ✓
```

**Takip:**
- Toplam Komisyon: ₺1000
- Paylaşılan Komisyon: ₺600
- Head Office Komisyonu: ₺400

---

## 4. Baglanti Kurallari

### 4.1 Office Branch ↔ Sales Entity

1. Her Sales Entity bir **Office Branch'a bagli** (`office_branch` field)
2. Parent-child iliskisi **ayni Office Branch** icinde olmali
3. Her Office Branch'in **bir root sales entity'si** olmali (`is_root=1`)
4. Head Office (is_head_office=1) **tum subelerin ustunde**
5. Farkli subeler arasinda komisyon akisi olmamali

### 4.2 Hiyerarsi Kurallari

1. Root entity'nin `parent_entity'i null olmali
2. Ayni sube icindeki tum entity'ler ayni `office_branch'a bagli olmali
3. `is_root=1` olan entity o sube icinde tek olmali
4. Maksimum 20 seviye (guvenlik limiti)
5. Döngü kontrolü (visited set)

### 4.3 Komisyon Kurallari

1. `commission_share_pct` 0 ile 100 arasinda olmali
2. Root entity'nin `commission_share_pct` degeri referans amacli (kalan tum komisyonu alir)
3. Tum paylarin toplami her zaman %100 olmali
4. `total_commission = shared_commission + head_office_commission`

---

## 5. Degisiklik Alanlari

### 5.1 Backend (Kritik)

| Dosya | Degisiklik |
|-------|-----------|
| `at_policy.py` → `_build_commission_distribution()` | Head office merkezli algoritma |
| `at_sales_entity.json` | Field aciklamalarini guncelle |
| `balance.py` | Yeni JSON yapısina gore guncelle |
| `recalc_commission_dist.py` | Yeni algoritmayla tum politikalari hesapla |

### 5.2 Frontend (Orta)

| Dosya | Degisiklik |
|-------|-----------|
| `CommissionBalances.vue` | Toplam/Paylasilan/HeadOffice metric'leri |
| `PolicyDetail.vue` | Yeni JSON yapısina gore tablo |
| `translations.js` | Yeni translation key'leri |

### 5.3 Test (Kritik)

| Dosya | Degisiklik |
|-------|-----------|
| `test_commission_balances.py` | Yeni algoritmayla test senaryolari |
| `test_commission_statement_import.py` | Gerekli degisiklik yok |

---

## 6. Migration

### 6.1 Adimlar

1. `_build_commission_distribution()` fonksiyonunu guncelle
2. Commission distribution JSON yapısini guncelle (toplam, paylasilan, head office)
3. Mevcut tum politikalari yeni algoritmayla yeniden hesapla
4. Frontend'i guncelle
5. Testleri guncelle

### 6.2 Geriye Donusluluk

- Eski JSON yapisi ile yeni JSON yapisi arasinda köprü
- Eski formati okuyan kodlar yeni formati da desteklemeli
- Migration scripti eski veriyi yeni formata cevirir

---

## 7. Onay Kriterleri

- [ ] Tum politikalarda `total_commission = shared_commission + head_office_commission`
- [ ] Her entity kendi share_pct'sine gore orijinal tutar uzerinden payini aliyor
- [ ] Root entity her zaman kalan tum komisyonu aliyor
- [ ] Head Office toplam komisyonu dogru takip ediliyor
- [ ] Sales Entity ve Office Branch baglantisi dogru
- [ ] Tum testler geciyor
- [ ] Browser QA temiz

---

## 8. Ilgili Dosyalar

- `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py` (satir 421-492)
- `acentem_takipte/acentem_takipte/doctype/at_sales_entity/at_sales_entity.json`
- `acentem_takipte/acentem_takipte/doctype/at_office_branch/at_office_branch.json`
- `acentem_takipte/acentem_takipte/domains/commissions/services/balance.py`
- `frontend/src/domains/policies/pages/PolicyDetail.vue`
- `frontend/src/domains/commissions/pages/CommissionBalances.vue`
- `frontend/src/config/policy_translations.js`
- `frontend/src/domains/commissions/i18n/translations.js`
- `acentem_takipte/acentem_takipte/tests/test_commission_balances.py`
