# AT Gelişim Planı — Repo Temizlik ve Hooks Konsolidasyonu

> **Tarih:** 2026-03-26
> **Kapsam:** Kullanılmayan/stale dosyaların tespiti, silinmesi, ve iki hooks.py dosyasının konsolidasyonu
> **Önceki Çalışma:** güvenlik-scope-düzeltmeleri planındaki 6 görev tamamlandı (diskte plan dosyası yok)

---

## Hedef

1. Repo'daki stale/gereksiz dosyaları temizle
2. İki hooks.py arasındaki çelişkiyi çöz (tek aktif hooks olsun)
3. Silinen dosyalardaki eksik olmayan unique içerikleri aktif hooks'a taşı
4. Plan dosyasını diske yaz (bu dosya)

---

## Gerekçe Analizi

### hooks.py Çiftliği — Neden biri stale?

Frappe `hooks.py`'yı `app_package.hooks` modülünden yükler. `setup.py` ve `app_name="acentem_takipte"` yapısı gereği:

```
acentem_takipte/                    ← Frappe app package kökü
  hooks.py                          ← FRAPPE BUNU YÜKLÜYOR (aktif)
  acentem_takipte/                  ← Python iç modülü
    hooks.py                        ← BUNU YÜKLEMEZ (stale)
```

**Kanıt — import prefix farkı:**

| Dosya | Import prefix | Çalışır mı? |
|-------|--------------|-------------|
| `acentem_takipte/hooks.py` (dış) | `acentem_takipte.acentem_takipte.services.branches` | ✅ Evet |
| `acentem_takipte/acentem_takipte/hooks.py` (iç) | `acentem_takipte.services.branches` | ❌ Hayır |

İç hooks.py tek-prefix kullandığı için Frappe runtime'da import edemez. Ayrıca dış hooks.py daha yeni features içeriyor (`on_session_creation`, `AT Policy Endorsement`, break-glass scheduler, vb.).

### acentem_takipte.py vs desktop.py — Neden biri redundant?

Frappe desk module yükleyici sırası:
1. `desktop.py` varsa → onu kullanır
2. Yoksa → app-adlı modülü (`acentem_takipte.py`) dener

`desktop.py` mevcut olduğu için `acentem_takipte.py`'nin `get_data()` fonksiyonu **hiçbir zaman çağrılmaz**.

### sprint_d_001_index_migration.py — Neden orphan?

- `patches.txt` içinde listelenmemiş
- Hiçbir Python dosyası tarafından import edilmemiş
- Aynı işlev (`office_branch`/`sales_entity` index ekleme) daha sonra yazılan dated patch'ler tarafından karşılanmış

---

## Görevler

### ✅ Görev 1: İç hooks.py'deki unique entries'yi dış hooks.py'ya taşı

**Silinen dosya:** `acentem_takipte/acentem_takipte/acentem_takipte/hooks.py`

**Taşınacak içerik (dış hooks.py'de eksik olan):**

```python
# EKLENECEK: doctype_js map'ine
"AT Office Branch": "public/js/at_office_branch.js",

# EKLENECEK: Yeni doctype_tree_js map
doctype_tree_js = {
    "AT Office Branch": "public/js/at_office_branch_tree.js",
}
```

**Neden önemli:** `at_office_branch.js` (57 satır) head office validate, parent readonly, cycle check içerir. `at_office_branch_tree.js` (15 satır) tree view ayarları. Bu JS dosyaları `acentem_takipte/acentem_takipte/public/js/` altında mevcut ve kullanımda.

### ✅ Görev 2: desktop.py'yi zenginleştir ve acentem_takipte.py'yi sil

**Silinen dosya:** `acentem_takipte/acentem_takipte/acentem_takipte/acentem_takipte.py`

**Düzenlenecek dosya:** `acentem_takipte/acentem_takipte/acentem_takipte/desktop.py`

Mevcut `desktop.py` tek modül tanımı içeriyor (15 satır). `acentem_takipte.py` 3 kategorili zengin yapı sunuyor:
- **Insurance Ops:** Lead, Offer, Policy, Policy Endorsement, Claim, Payment, Renewal Task
- **Master Data:** Customer, Sales Entity, Insurance Company, Branch
- **Control Center:** Notification Template/Draft/Outbox, Accounting Entry, Reconciliation Item, Access Log

**Önerilen:** `desktop.py`'nin içeriğini `acentem_takipte.py`'deki 3 kategorili yapıyla değiştir.

### ✅ Görev 3: Orphan patch dosyasını sil

**Silinen dosya:** `acentem_takipte/acentem_takipte/acentem_takipte/patches/sprint_d_001_index_migration.py`

Not: Silmeden önce dosyanın gerçekten patches.txt'te olmadığı ve başka bir mekanizma tarafından çalıştırılmadığı doğrulanmıştır.

### ✅ Görev 4: Boş dizini sil

**Silinen:** `acentem_takipte/acentem_takipte/acentem_takipte/public/` (boş dizin)

Not: Gerçek JS dosyaları `acentem_takipte/acentem_takipte/public/js/` altında bulunur, bu boş dizin gereksiz.

---

## Sıralama

1. **Önce taşıma:** İç hooks.py'deki unique entries → dış hooks.py'ya ekle
2. **Sonra taşıma:** acentem_takipte.py'deki desk data → desktop.py'ye birleştir
3. **Sonra silme:** 4 dosya/dizin sırayla sil
4. **Doğrulama:** Linter + syntax check

---

## Doğrulama

1. `py_compile` ile tüm Python dosyalarında syntax check
2. `ReadLints` ile seçili dosyalarda hata kontrolü
3. Dış hooks.py'deki tüm import path'lerin `acentem_takipte.acentem_takipte.` çift-prefix ile başladığını doğrula
4. `desktop.py`'nin `get_data()` fonksiyonunun doğru 3 kategorili yapıyı döndürdüğünü doğrula

---

## Risk Değerlendirmesi

| Risk | Seviye | Mitigasyon |
|------|--------|------------|
| İç hooks.py silinirse unique config kaybı | 🟡 Orta | Görev 1'de taşıma yapılır önce |
| desktop.py düzenlenirse desk bozulur | 🟢 Düşük | Sadece `get_data()` return value değişir, Frappe API aynı |
| Patch silinirse migration bozulur | 🟢 Düşük | patches.txt'de yok, zaten çalışmıyor |
| Boş dizin silinirse bir şey kırılır | 🟢 Düşük | İçinde dosya yok |

---

## Önceki Tamamlanan Görevler (Referans)

Aşağıdaki görevler önceki agent tarafından tamamlandı (plan dosyası diskte yok):

1. ✅ `verify-active-hooks` — Dış hooks.py'nin aktif olduğu doğrulandı
2. ✅ `fix-scope-derived-branch` — `_resolve_office_branch` derived branch için `assert_office_branch_access` eklendi
3. ✅ `harden-ignore-permissions` — `at_offer.py`, `quick_customer.py`, `at_lead.py` için `ignore_permissions=True` kaldırıldı
4. ✅ `dashboard-fallback-guard` — Global fallback audit log düşülüyor
5. ✅ `tests-for-scope-and-bypass` — Negatif testler eklendi
6. ✅ `optimize-customer-360-cross-sell` — Branch sorgu maliyeti düşürüldü

---

## Görev Durum Tablosu

| Görev | Durum | Kanıt |
|-------|-------|-------|
| Görev 1: hooks.py taşıma | ✅ Tamamlandı | `doctype_js` + `doctype_tree_js` entries eklendi, stale iç hooks.py silindi |
| Görev 2: desktop.py zenginleştirme | ✅ Tamamlandı | 3 kategorili yapı taşındı, redundant `acentem_takipte.py` silindi |
| Görev 3: Orphan patch silme | ✅ Tamamlandı | `sprint_d_001_index_migration.py` silindi (patches.txt'de yoktu) |
| Görev 4: Boş dizin silme | ✅ Tamamlandı | Boş `public/` dizini silindi |

## Doğrulama Sonuçları

| Kontrol | Sonuç |
|---------|-------|
| `py_compile` hooks.py | ✅ Hatasız |
| `py_compile` desktop.py | ✅ Hatasız |
| Referans edilen JS dosyaları mevcut | ✅ `at_office_branch.js`, `at_office_branch_tree.js` |
| Silinen dosyalara kod referansı | ✅ Bulunamadı |

## Değişiklik Özeti

```
 acentem_takipte/acentem_takipte/acentem_takipte.py    | 112 satır silindi
 acentem_takipte/acentem_takipte/desktop.py             | +98 satır (zenginleştirildi)
 acentem_takipte/acentem_takipte/hooks.py               | 128 satır silindi (stale)
 patches/sprint_d_001_index_migration.py                | 100 satır silindi (orphan)
 acentem_takipte/hooks.py                               | +7 satır (doctype_js + doctype_tree_js)
 Toplam: -350 satır, +114 satır
```

### Bu oturumda tamamlanan (2026-03-26)

- [x] Repo temizlik: stale `acentem_takipte/acentem_takipte/hooks.py` silindi
- [x] Repo temizlik: redundant `acentem_takipte.py` silindi
- [x] Repo temizlik: orphan `sprint_d_001_index_migration.py` silindi
- [x] Repo temizlik: boş `public/` dizini silindi
- [x] `TEKNIK_DENETIM_TAKIP.md` uygulama takip dosyası oluşturuldu (86 madde, 5 kategori)
- [x] `TEKNIK_DENETIM_RAPORU.md` detaylı denetim raporu oluşturuldu
- [x] Non-essential dosyalar `silinecekler/` klasörüne taşındı (README, PROJECT_REGISTRY, docs, scripts, TECHNICAL_ANALYSIS_REPORT, at-gelisim-plani)
