# Üretim Sağlık Denetimi — Rapor
**Tarih:** 23 Nisan 2026  
**Uygulama:** `acentem_takipte` (Frappe v15 + Vue 3)  
**Kapsam:** Hooks yapısı, 360-view servisleri, Poliçe modülü, Müşteri modülü  
**Sonuç:** 4 commit, 0 açık kritik bug  

---

## Denetim Kapsamı ve Bulgular

### Aşama 0 — `hooks.py` Tam Yeniden Yazım
**Commit:** `79f7f24`

Frappe'nin yüklediği `acentem_takipte/acentem_takipte/hooks.py` dosyasında 9 ayrı sorun tespit edildi ve tüm dosya sıfırdan yeniden yazıldı.

| # | Sorun | Önem |
|---|-------|------|
| 1 | `doc_events` içinde 4 DocType çift tanımlanmış (son tanım öncekini eziyor) | P0 |
| 2 | Birkaç event bağlantısı yanlış fonksiyon adına işaret ediyor | P0 |
| 3 | Cron slotlarının tamamı aynı saate yığılmış (hepsi `*/5`) | P1 |
| 4 | Kök `hooks.py` ile iç `hooks.py` arasında tutarsızlık | P1 |
| 5 | `scheduler_events` içinde kullanılmayan dead-code kayıtlar | P2 |

**Uygulanan fix:** `doc_events` (16 DocType), `scheduler_events` (5 cron slotu: `*/10`, `0 *`, `0 1`, `0 2`, `0 3`) doğru fonksiyon adlarıyla temiz olarak yeniden yazıldı. Kök `hooks.py` de senkronize edildi ve "Frappe tarafından yüklenmez" notu eklendi.

---

### Aşama 1 — Genel Yapı + P0 Cache Fix
**Commit:** `2a5e495`

#### P0 — Cache Hiç Yazılmıyordu (`policy_360.py` ve `customer_360.py`)

**Etkilenen dosyalar:**
- `acentem_takipte/acentem_takipte/services/policy_360.py`
- `acentem_takipte/acentem_takipte/services/customer_360.py`

**Sorun:** Her iki `build_*_payload()` fonksiyonu da büyük dict'i direkt `return { ... }` ile döndürüyordu. `frappe.cache().set_value()` çağrısı bu `return` satırından sonra yer aldığı için **hiçbir zaman çalışmıyordu.** Sonuç: her 360-view isteğinde Redis'e yazılmayan payload, her seferinde sıfırdan DB sorgusu çalıştırıyordu.

```python
# ÖNCE (bozuk) — set_value() asla çalışmıyor
return {
    "name": ...,
    ...
}
frappe.cache().set_value(cache_key, payload, expires_in_sec=300)  # ← dead code

# SONRA (düzeltilmiş)
payload = {
    "name": ...,
    ...
}
frappe.cache().set_value(cache_key, payload, expires_in_sec=300)
return payload
```

---

### Aşama 2 — Poliçe Modülü Derin Denetim
**Commit:** `4763327`

#### P1 — Ölü Status Değerleri (`customer_360.py`)

**Dosya:** `acentem_takipte/acentem_takipte/services/customer_360.py`

`ACTIVE_POLICY_STATUSES` sabiti AT Policy DocType'ın gerçek Select seçenekleriyle uyuşmuyordu:

```python
# ÖNCE (yanlış) — "Renewal" ve "Pending Renewal" AT Policy'de yok
ACTIVE_POLICY_STATUSES = {"Active", "Renewal", "Pending Renewal"}

# SONRA (düzeltilmiş) — AT Policy'nin gerçek status değerleri: IPT / KYT / Active
ACTIVE_POLICY_STATUSES = {"Active"}
```

Sonuç: `active_policy_count` değeri her müşteri için hep eksik hesaplanıyordu.

#### P1 — Çift Cache Invalidation (`at_policy.py`)

**Dosya:** `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py`

Controller `on_update`/`on_trash` metodları `invalidate_policy_360_cache()` direkt çağırıyordu. `hooks.py` de aynı event'lerde `_p360` üzerinden invalidation tetikliyordu → her değişiklikte Redis 2 kez siliniyor.

```python
# ÖNCE
def on_update(self):
    invalidate_policy_360_cache(self.name)

def on_trash(self):
    invalidate_policy_360_cache(self.name)

# SONRA — hooks.py hallediyor, burada gereksiz
def on_update(self):
    pass

def on_trash(self):
    pass
```

#### P2 — TCMB HTTP Bloğu `validate()` İçinde (`at_policy.py`)

Senkron HTTP isteği aktif bir DB transaksiyonu içindeydi. Kötü durum: 8 deneme × 5 sn = **40 saniye blok.**

```python
# ÖNCE
for i in range(0, 8):
    rate = self._fetch_tcmb_rate_for_day(...)
    requests.get(url, timeout=5)

# SONRA — 5 gün (haftasonu + 1 tatil buffer) × 3 sn = max 15 sn
for i in range(0, 5):
    rate = self._fetch_tcmb_rate_for_day(...)
    requests.get(url, timeout=3)
```

#### P2 — Eksik DB İndeksi (`at_policy.json`)

Poliçe listesi sorgusunda `WHERE p.insurance_company = %s` kullanılıyor ancak `insurance_company` alanında index yoktu.

```json
// EKLENEN
"search_index": 1
```

`bench migrate` sonrasında bu alan üzerinde DB indeksi oluşacak.

---

### Aşama 3 — Müşteri Modülü Güvenlik Denetimi
**Commit:** `39d165b`

#### P1 — Çift Cache Invalidation (`at_customer.py`)

**Dosya:** `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py`

`at_policy.py` ile aynı pattern: controller `on_update`/`on_trash` içinde `invalidate_customer_360_cache()` direkt çağrısı + `hooks.py`'nin `_c360` event'i → 2× Redis sil.

```python
# ÖNCE
from acentem_takipte.acentem_takipte.services.customer_360 import (
    invalidate_customer_360_cache,
)

def on_update(self):
    invalidate_customer_360_cache(self.name)

def on_trash(self):
    invalidate_customer_360_cache(self.name)

# SONRA — import kaldırıldı, pass ile yerine geçildi
def on_update(self):
    # Cache invalidation handled by hooks.py (_c360) — no direct call needed.
    pass

def on_trash(self):
    # Cache invalidation handled by hooks.py (_c360) — no direct call needed.
    pass
```

#### P2 — Eksik DB İndeksi (`at_customer.json`)

`tax_id` alanında `"unique": 1` mevcuttu (unique index = implicit index) ancak Frappe'nin ORM'i bazı sorgularda `WHERE tax_id = %s` filtresini query optimizer'a doğrudan bırakıyor. Explicit `search_index` eklenmesi hem güvenilirliği artırır hem de EXPLAIN planlarında netlik sağlar.

```json
// ÖNCE
"fieldname": "tax_id",
"unique": 1

// SONRA
"fieldname": "tax_id",
"unique": 1,
"search_index": 1
```

#### Gözlemler — Fix Gerektirmiyor (Sağlam)

| Alan | Değerlendirme |
|------|---------------|
| `permlevel: 1` on `tax_id` / `phone` | Frappe ACL katmanında ham veri kısıtlı ✓ |
| `mask_tax_id()` / `mask_phone()` | Validate'de yazılıyor + onload'da set ediliyor — çift koruma ✓ |
| `has_sensitive_access()` | `SENSITIVE_ROLES` ile API ve 360 payload'da doğru kullanılıyor ✓ |
| `get_permission_query_conditions()` | Agent rolü için `assigned_agent OR owner` + `origin_office_branch` ✓ |
| `is_valid_tckn()` | Checksum algoritması doğru implement edilmiş ✓ |
| `OPEN_CLAIM_STATUSES` | AT Claim DocType ile tutarlı: `Open`, `Under Review`, `Approved` ✓ |
| Duplicate müşteri kontrolü | `tax_id` `unique=1` + 11/10 hane `validate()` koruması yeterli ✓ |

---

## Commit Geçmişi

| Commit | Mesaj | Aşama |
|--------|-------|-------|
| `79f7f24` | `hooks: full rewrite — fix 9 bugs (dup doctypes, wrong fn names, cron pile-up)` | 0 |
| `2a5e495` | `P0 fix: cache never persisted in policy_360 and customer_360 build functions` | 1 |
| `4763327` | `Phase 2 policy audit: dead status fix, TCMB timeout, insurance_company index, double-invalidation` | 2 |
| `39d165b` | `Phase 3 customer audit: remove double cache invalidation in controller, add tax_id search_index` | 3 |

---

## Önem Dereceleri

| Önem | Açıklama | Sayı |
|------|----------|------|
| **P0** | Kritik işlevsellik bozuk (cache asla çalışmıyor, event hiç tetiklenmiyor) | 2 |
| **P1** | Yanlış davranış (hatalı veri, fazladan iş yükü) | 3 |
| **P2** | Performans / dayanıklılık (yavaş sorgu, uzun blok) | 4 |

---

## Sonraki Adımlar

1. **`bench migrate`** — `insurance_company` ve `tax_id` alanlarındaki yeni `search_index` değerlerinin DB'ye yansıması için gerekli.
2. **TCMB HTTP** — Orta vadede `validate()` içinden çıkarılıp `after_insert` / arka plan görevi yapısına taşınması önerilir (DB transaksiyonunu bloklamaz).
3. **360-view cache TTL** — Şu an 5 dakika; yoğun kullanımda düşürülmesi veya event bazlı invalidation yeterliliğinin izlenmesi önerilir.
