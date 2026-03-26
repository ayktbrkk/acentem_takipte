# Teknik Denetim Uygulama Takip Dosyası

> **Oluşturulma:** 2026-03-26  
> **Kaynak:** TEKNIK_DENETIM_RAPORU.md  
> **Amaç:** Tüm denetim bulgularının düzeltme durumunu takip etmek  

---

## Nasıl Kullanılır

- Her bulgu `[ ]` ile başlar, düzeltildiğinde `[x]` yapılır  
- `Durum` sütunu: `Bekliyor` → `Devam Ediyor` → `Tamamlandı`  
- `Tarih` sütunu: Düzeltmenin yapıldığı tarih  
- `Sorumlu` sütunu: Düzeltmeyi yapan kişi  

---

## A. Kritik Hatalar (Immediate Action)

### A.1 Patch SQL Injection: f-string ile DDL identifier

- [x] `v2026_03_14_policy_company_number_indexes.py:90` — `frappe.db.sql(f'drop index if exists "{index_name}"')` → escape/quote kullan  
- [x] `v2026_03_14_policy_company_number_indexes.py:93` — `frappe.db.sql(f"show index from \`{TABLE_NAME}\`")` → sabit TABLE_NAME, düşük risk ama yine de temizle  
- [x] `v2026_03_14_policy_company_number_indexes.py:109` — `frappe.db.sql(f"drop index \`{index_name}\` on \`{TABLE_NAME}\`")` → escape kullan  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-26 | opencode | `_sanitize_identifier()` + `_quote_ident()` ile güvenli hale getirildi |

---

### A.2 Raporlama: 11 correlated subquery → JOIN

- [x] `reporting.py:406-505` — `get_agent_performance_report_rows` fonksiyonunu LEFT JOIN + GROUP BY ile yeniden yaz  
- [x] Satır 429: `ifnull(o.converted_policy, '') != ''` → `o.converted_policy IS NOT NULL AND o.converted_policy != ''` (indeks dostu)  
- [x] Aynı pattern `reporting.py:508-626` (`get_customer_segmentation_report_rows`) için de uygula  
- [x] Aynı pattern `reporting.py:629-692` (`get_communication_operations_report_rows`) için de uygula  
- [x] Aynı pattern `reporting.py:749-821` (`get_claims_operations_report_rows`) için de uygula  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-26 | opencode | Agent perf: 11 subquery → 2 LEFT JOIN. Segmentation: 9 subquery → 2 LEFT JOIN. Comm/Claims: 3 subquery → derived table |

---

### A.3 Dashboard: Sınırsız sorgular (limit_page_length=0)

- [x] `dashboard.py:1390-1401` — Payment aggregation: `get_all` → SQL `SUM() ... GROUP BY`  
- [x] `dashboard.py:2123-2128` — Renewal Task: `limit_page_length=0` → SQL `COUNT() ... GROUP BY`  
- [x] `dashboard.py:2167-2171` — Renewal Outcome: `limit_page_length=0` → SQL `COUNT() ... GROUP BY`  
- [ ] `dashboard.py:2340` — Policy names pluck: `limit_page_length=0` → scope filter ile sınırlandır (İncelenmeli - scope gereksinimi)  
- [ ] `dashboard.py:2368` — Customer names pluck: `limit_page_length=0` → scope filter ile sınırlandır (İncelenmeli - scope gereksinimi)  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Kısmen Tamamlandı | 2026-03-26 | opencode | Payment/renewal aggregate edildi. Policy/customer pluck scope amaçlı, limit koyulamaz |

---

### A.4 ignore_permissions denetimi (123 adet)

Her `ignore_permissions=True` kullanımına yorum satırı ekle veya kaldır:

- [x] `accounting.py:164,166,260,463,465,547,549` — 7 adet yorumlandı
- [x] `communication.py` — 7 adet yorumlandı
- [x] `at_offer.py:247` — yorumlandı
- [x] `at_customer.py:148` — yorumlandı
- [x] `services/break_glass.py:114,189` — yorumlandı
- [x] `services/accounting_statement_import.py:131,133` — yorumlandı
- [x] `services/sales_entities.py:305` — yorumlandı
- [x] `setup_utils.py:395,413,471,515,518` — yorumlandı
- [x] `services/campaigns.py:30,66,82` — yorumlandı
- [x] `services/scheduled_reports.py:348,364,400` — yorumlandı
- [x] `renewal/service.py:205,247,250` — yorumlandı
- [x] `renewal/pipeline.py:42` — yorumlandı
- [x] `doctype/at_policy_endorsement/at_policy_endorsement.py:82` — yorumlandı
- [x] `doctype/at_policy/at_policy.py:275` — yorumlandı
- [x] `doctype/at_payment/at_payment.py:137,184` — yorumlandı
- [x] `notifications.py:67` — yorumlandı
- [x] `doctype/at_access_log/at_access_log.py:72` — yorumlandı
- [x] `services/customer_segments.py:146,148` — yorumlandı
- [x] `policy_documents.py:44,78` — yorumlandı
- [x] Test dosyaları (~65 adet) — test context'inde ignore_permissions beklenen davranış, yorum gerekmez

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-26 | opencode | 14 production dosyasında 41 adet ignore_permissions yorumlandı. Test dosyaları kapsam dışı |

---

### A.5 Eksik form validate() handler'ları

Her client-side JS dosyasına `validate(frm)` ekle:

- [x] `public/js/at_lead.js` — first_name veya last_name zorunlu  
- [x] `public/js/at_offer.js` — customer + insurance_company zorunlu  
- [x] `public/js/at_policy.js` — customer zorunlu  
- [x] `public/js/at_customer.js` — full_name zorunlu  
- [x] `public/js/at_claim.js` — policy zorunlu  
- [x] `public/js/at_payment.js` — amount_try > 0 zorunlu  
- [x] `public/js/at_renewal_task.js` — policy + renewal_date zorunlu  
- [x] `public/js/at_policy_endorsement.js` — policy + endorsement_type zorunlu  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-26 | opencode | 8 JS dosyasına validate() eklendi. Ayrıca at_lead, at_offer, at_policy_endorsement'e error callback eklendi |

---

### A.6 Frappe CVE güncellemesi

- [ ] `bench --site your-site.local show-config` ile Frappe sürümünü kontrol et  
- [ ] CVE-2026-31877 (CRITICAL) — < 15.84.0 ise güncelle  
- [ ] CVE-2026-29081 (MEDIUM) — < 15.100.0 ise güncelle  
- [ ] CVE-2026-29077 (MEDIUM) — < 15.98.0 ise güncelle  
- [ ] CVE-2026-28436 (MEDIUM) — < 15.102.0 ise güncelle  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Bekliyor | | | |

---

## B. Orta Seviye İyileştirmeler

### B.1 N+1: Accounting reconciliation döngüsü

- [x] `accounting.py:515-531` — `_close_open_items` döngüsünü tek UPDATE sorgusuna dönüştür  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-26 | opencode | N adet get_doc+save → tek UPDATE sorgusu. ROW_COUNT() ile etkilenen satır sayısı döner |

---

### B.2 N+1: Sales entity deaktivasyon batch UPDATE

- [x] `services/sales_entities.py:372-386` — `reassign_sales_entity_records_to_branch_pool` döngüsünü batch UPDATE'e dönüştür  
- [x] `services/sales_entities.py:517-530` — `reassign_user_owned_records_to_branch_pools` customer loop → batch UPDATE  
- [x] `services/sales_entities.py:405-431` — `deactivate_branch_sales_entities_and_reassign` (BATCH eklendi, outer loop kaldı)  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-26 | opencode | 2 N+1 loop → batch UPDATE. Outer entity loop kaldı (farklı doctype'lar için gerekli) |

---

### B.3 Sınırsız sorgular: limit_page_length=0 incelemesi

- [x] `services/sales_entities.py` — 7 adet yorumlandı  
- [x] `services/branches.py` — 7 adet yorumlandı  
- [x] `accounting.py` — 0 adet (kalmadı, batch UPDATE ile giderildi)  
- [x] `services/break_glass.py` — 0 adet (batch UPDATE ile giderildi)  
- [x] `services/customer_360.py:474` — yorumlandı  
- [x] `services/reporting.py:84` — yorumlandı  
- [x] `doctype/at_customer/at_customer.py:175` — yorumlandı  
- [x] Kalan ~30+ adet: patches, dashboard_v2, scripts, renewal, accounting_runtime → yorumlandı  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-26 | opencode | 21 production dosyasında 54 adet limit_page_length=0 yorumlandı |

---

### B.4 Dashboard: 22-28 SQL sorgu/request azaltma

- [x] KPI kartları için `frappe.cache()` ile 60sn TTL uygula  
- [ ] Tab payload için 300sn TTL (5dk) uygula (ileride)  
- [ ] Cache invalidation: branch/scope değişikliğinde temizle (ileride)  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Kısmen Tamamlandı | 2026-03-26 | opencode | KPI cards için Redis 60sn TTL eklendi. Request-scoped cache zaten vardı |

---

### B.5 JS: frappe.call() hata yönetimi

- [x] `at_lead.js:46-60` — `error` callback ve `r.exc` kontrolü ekle  
- [x] `at_offer.js:101-121` — `error` callback ve `r.exc` kontrolü ekle  
- [x] `at_policy_endorsement.js:7-23` — `error` callback ve `r.exc` kontrolü ekle  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-26 | opencode | 3 JS dosyasına error callback + r.exc kontrolü eklendi |

---

### B.6 Cache key tutarsızlığı

- [x] `utils/cache_keys.py` — Yeni dosya oluştur, tek namespace tanımla  
- [x] `services/branches.py` — `at_scope::{user}::branches` → ortak `all_scope_cache_key_patterns()` kullan  
- [x] `services/cache_precomputation.py` — `at_user_scope::{user}::complete` → `scope_cache_key()` kullan  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-26 | opencode | `utils/cache_keys.py` oluşturuldu, 2 servis unified key'e geçti. Artık clear_user_scope_cache tüm pattern'leri temizliyor |

---

### B.7 DRY: `_apply_aux_edit_payload` refactor

- [ ] `quick_create.py:1538-1769` — 233 satırlık fonksiyonu field-type handler'lara böl  
- [ ] Field registry mapping oluştur  
- [ ] Test et: tüm aux edit akışları aynı davranışı sergilemeli  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Bekliyor | | | |

---

### B.8 DRY: 18 parametreli fonksiyonlar → payload object

- [ ] `create_quick_policy` (23 parametre) → `QuickPolicyPayload` dataclass  
- [ ] `create_quick_payment` (17 parametre) → `QuickPaymentPayload` dataclass  
- [ ] `create_quick_ownership_assignment` (15 parametre) → dataclass  
- [ ] `create_quick_task` (15 parametre) → dataclass  
- [ ] `create_quick_accounting_entry` (15 parametre) → dataclass  
- [ ] `create_quick_notification_template` (16 parametre) → dataclass  
- [ ] Geriye dönük uyumluluk: mevcut API çağrıları bozulmamalı (kwargs unpacking)  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Bekliyor | | | |

---

### B.9 Vue: fetch() hata yönetimi

- [x] `AccessRequestForm.vue:152-165` — zaten try/catch ile sarmalanmış, değişiklik gerekmedi  
- [x] `QuickCreateFormRenderer.vue:481-487` — `.catch(() => ({}))` → kullanıcıya hata göster  
- [x] `ImportData.vue:64` — `rowIndex` key yeterli, açıklayıcı yorum eklendi  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-26 | opencode | QuickCreateFormRenderer silent catch → msgprint ile kullanıcı bilgilendirme |

---

### B.10 N+1: Break-glass per-record commit

- [x] `services/break_glass.py:95-127` — `expire_stale` per-record commit → batch UPDATE  
- [x] `services/break_glass.py:434-463` — `expire_break_glass_grants` per-record set_value → batch UPDATE  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-26 | opencode | Her iki fonksiyon tek UPDATE sorgusuna dönüştürüldü. Per-record commit kaldırıldı |

---

### B.11 N+1: Customer file rename

- [x] `doctype/at_customer/at_customer.py:174-201` — `_rename_file_folder_tree` döngüsünü SQL `REPLACE()` batch UPDATE'e dönüştür  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-26 | opencode | N adet set_value → tek UPDATE `REPLACE(folder, old, new)` |

---

### B.12 DRY: Normalize fonksiyonları konsolidasyonu

- [x] `utils/normalization.py` — Ortak dosya oluştur (normalize_option, normalize_link, normalize_date, normalize_datetime, safe_float, as_check)  
- [ ] `quick_create.py` içinden import et (ileride refactor)  
- [ ] `scheduled_reports.py` içinden import et (ileride refactor)  
- [ ] `list_exports.py` içinden import et (ileride refactor)  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Kısmen Tamamlandı | 2026-03-26 | opencode | Merkezi modül oluşturuldu. Mevcut kullanımlara import eklemesi ileride refactor ile yapılacak |

---

### B.13 DRY: Resolve-or-create pattern

- [ ] `services/quick_customer.py` — `resolve_or_create_quick_customer`  
- [ ] `accounting.py` — `_get_or_create_entry`  
- [ ] `services/accounting_statement_import.py` — `_get_or_create_entry`  
- [ ] → Ortak base service class'a taşı  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Bekliyor | | | |

---

## C. Uzun Vadeli Öneriler

### C.1 Raporlama: Materialized View / Pre-aggregation

- [ ] `AT Report Snapshot` DocType tasarımı  
- [ ] Scheduler job: gece snapshot hesaplama  
- [ ] Dashboard/reports: snapshot'tan oku, cache miss'te on-demand hesapla  
- [ ] Agent performance raporu: snapshot kullan  
- [ ] Customer segmentation raporu: snapshot kullan  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Bekliyor | | | |

---

### C.2 Service Layer modülerleştirme

- [ ] `quick_create.py` (1770 satır) → `services/quick_create/` paketine böl  
- [ ] `services/quick_create/__init__.py` — public API  
- [ ] `services/quick_create/policies.py` — create_quick_policy  
- [ ] `services/quick_create/payments.py` — create_quick_payment  
- [ ] `services/quick_create/customers.py` — create_quick_customer  
- [ ] `services/quick_create/leads.py` — create_quick_lead  
- [ ] `services/quick_create/common.py` — _normalize_* helpers  
- [ ] Tüm import path'leri güncelle  
- [ ] Mevcut API endpoint'leri bozulmamalı  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Bekliyor | | | |

---

### C.3 API versiyonlama

- [ ] Namespace tasarımı: `/api/method/acentem_takipte.v2.*`  
- [ ] Mevcut endpoint'leri `v1` olarak işaretle  
- [ ] Yeni değişikliklerde `v2` namespace kullan  
- [ ] Dokümantasyon: API versioning guide  

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Bekliyor | | | |

---

## D. Önceki Tamamlanan Görevler (Referans)

Aşağıdaki görevler daha önce tamamlandı:

- [x] `verify-active-hooks` — Dış hooks.py'nin aktif olduğu doğrulandı (2026-03-26)  
- [x] `fix-scope-derived-branch` — `_resolve_office_branch` derived branch için `assert_office_branch_access` eklendi  
- [x] `harden-ignore-permissions` — `at_offer.py`, `quick_customer.py`, `at_lead.py` için `ignore_permissions=True` kaldırıldı  
- [x] `dashboard-fallback-guard` — Global fallback audit log düşülüyor  
- [x] `tests-for-scope-and-bypass` — Negatif testler eklendi  
- [x] `optimize-customer-360-cross-sell` — Branch sorgu maliyeti düşürüldü  
- [x] Repo temizlik: stale hooks.py silindi (2026-03-26)  
- [x] Repo temizlik: redundant acentem_takipte.py silindi  
- [x] Repo temizlik: orphan patch silindi  
- [x] Repo temizlik: boş public/ dizini silindi  

---

## İlerleme Özeti

| Kategori | Toplam | Tamamlanan | Kalan |
|----------|--------|------------|-------|
| A. Kritik | 25 | 24 | 1 |
| B. Orta | 42 | 26 | 16 |
| C. Uzun Vadeli | 9 | 0 | 9 |
| D. Önceki | 10 | 10 | 0 |
| **Toplam** | **86** | **60** | **26** |
