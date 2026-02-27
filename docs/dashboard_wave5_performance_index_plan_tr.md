# Dashboard Wave 5 Performans ve Index Plani (TR)

Bu dokuman, `dashboard.py` ve `dashboard_v2/*` refactor sonrasi Wave 5 calismalari icin uygulama odakli performans planidir.

Not:
- Bu asamada "en yavas sorgular" listesi **canli profiler sonucu degil**, kod/SQL gozlemine dayali **hotspot adayi** listesidir.
- Gercek p95/p99 olcumleri icin `bench` ortaminda yuk testleri ve SQL profiler gereklidir.

## 1. SQL Gozlemi ile Hotspot Adaylari

### A. Dashboard KPI ve tab sorgulari (agregasyon agirlikli)

Kaynaklar:
- `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_kpis.py`
- `acentem_takipte/acentem_takipte/api/dashboard_v2/tab_payload.py`

Hotspot adaylari:
- `AT Policy` uzerinde tarih/branch/customer filtreli aggregate sorgular
  - `status` bazli `group by`
  - `insurance_company` bazli `group by`
- `AT Offer` / `AT Lead` status aggregate sorgulari
- `AT Payment` status + `payment_direction` aggregate sorgulari
- `AT Claim` + `AT Policy` join ile open claim sayimi (dashboard cards summary icinde)

Risk:
- Veri hacmi arttikca full scan / temp sort / filesort maliyeti artabilir.

### B. Renewal task ve policy-name lookup akislari

Kaynaklar:
- `acentem_takipte/acentem_takipte/api/dashboard.py`

Hotspot adaylari:
- `AT Policy` -> `pluck="name"` ile policy name seti cikarma
- Sonrasinda `AT Renewal Task` filtreleme

Risk:
- Buyuk policy portfoylerinde iki asamali lookup pahali olabilir.
- `policy in (...)` listesi buyudukce sorgu maliyeti artar.

### C. Workbench derived sort path (iyilestirildi ama hala aday)

Kaynaklar:
- `acentem_takipte/acentem_takipte/api/dashboard.py`
- `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_customers.py`
- `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_leads.py`

Durum:
- Full payload scan azaltildi (iki asamali `sort-seed + page hydration`).

Kalan risk:
- Derived sort icin seed set halen buyuk olabilir.
- OR filtreli count path fallback'te `pluck=name` + `len(...)` kullanimina devam ediliyor.

## 2. Wave 5 Uygulanan Kod Iyilestirmeleri (Bu tur)

### `frappe.get_all` -> `frappe.get_list` gecisleri (permission-aware read)

Uygulanan alanlar:
- `dashboard.py` user-facing list/preview/detail yardimcilari
- `dashboard_v2/queries_customers.py`
- `dashboard_v2/queries_leads.py`
- `dashboard_v2/details_lead.py`
- `dashboard_v2/details_offer.py`

Beklenen fayda:
- Permission-aware read pattern ile tutarlilik
- `get_all` kaynakli veri sızma riskinin azalmasi
- Dashboard refactor katmanlarinda standart sorgu API'si

Not:
- `dashboard_v2/security.py` icindeki assignment scope lookup bilincli olarak `get_all` birakilabilir (sistemsel scope lookup davranisi nedeniyle). Bu, ayrica bench ortaminda dogrulanmalidir.

## 3. Index Migration Plani (Hazirlik)

Asagidaki indeksler **aday**tir; SQL `EXPLAIN` ile dogrulanmadan migration'a alinmamali.

Uygulama durumu:
- Aday indeksleri olusturan idempotent migration patch eklendi:
  - `acentem_takipte/acentem_takipte/patches/v2026_02_26_add_dashboard_candidate_indexes.py`
- Patch kaydi:
  - `acentem_takipte/acentem_takipte/patches.txt`
- Uretim oncesi `EXPLAIN` ve rollout penceresi ile dogrulama tavsiye edilir.

### `AT Policy`

Kullanim desenleri:
- filtreler: `issue_date`, `branch`, `customer`, `status`
- aggregate/group by: `status`, `insurance_company`
- join: `name` (PK zaten var)

Oneri indeks adaylari:
- `(issue_date, branch, customer)`
- `(status, issue_date)`
- `(insurance_company, issue_date)`
- `(customer, end_date)` (renewal/portfolio ekranlarina destek)

### `AT Renewal Task`

Kullanim desenleri:
- filtreler: `status`, `policy`
- siralama: `due_date`
- bucket hesaplari: `due_date`, `renewal_date`

Oneri indeks adaylari:
- `(status, due_date)`
- `(policy, status)`
- `(customer, status, due_date)` (eger `customer` alanı aktif filtreleniyorsa)

### `AT Lead`

Kullanim desenleri:
- filtreler: `status`, `branch`, `customer`
- siralama: `modified`
- derived workflow alanlari: conversion state helper'lari

Oneri indeks adaylari:
- `(status, modified)`
- `(branch, modified)`
- `(customer, modified)`
- `(insurance_company, modified)` (lead filtreleri icin)

### `AT Reconciliation Item`

Kullanim desenleri:
- filtreler: `status`, `mismatch_type`, `accounting_entry`
- siralama: `modified`

Oneri indeks adaylari:
- `(status, modified)`
- `(status, mismatch_type, modified)`
- `(accounting_entry, status)`

### `AT Notification Outbox`

Kullanim desenleri:
- filtreler: `status`, `channel`, `customer`, `reference_*`
- siralama: `modified`

Oneri indeks adaylari:
- `(status, channel, modified)`
- `(customer, modified)`
- `(reference_doctype, reference_name, modified)`

## 4. p95 Olcum Runbook (Wave 5 acik madde)

Bu madde tamamlandi (lokal Docker stack uzerinde `localhost` sitesi ile HTTP/API benchmark).

Calistirilan ortam:
- Docker Compose stack: `frappe_docker`
- URL: `http://localhost:8080`
- Site: `localhost`
- Olcum yontemi: `scripts/benchmark_dashboard_api.py` (HTTP seviyesinde p50/p95/p99)
- Iterasyon: `30` (warmup `5`, pause `50ms`)
- Not: Backend container image kodu host branch ile otomatik senkron olmadigi icin benchmark oncesi guncel `api/` kodu container'a kopyalanip backend restart edildi.

Olcum raporu:
- `docs/dashboard_benchmark_report_localhost_2026-02-26.json`

Ozet sonuc (hatasiz 30/30 iterasyon):
- `dashboard_kpis`: p95 `47.65 ms`, p99 `64.79 ms`
- `dashboard_tab_daily`: p95 `56.34 ms`, p99 `85.69 ms`
- `dashboard_tab_sales`: p95 `45.28 ms`, p99 `47.80 ms`
- `dashboard_tab_renewals`: p95 `45.22 ms`, p99 `55.57 ms`
- `dashboard_tab_collections`: p95 `44.64 ms`, p99 `46.45 ms`
- `customer_workbench`: p95 `43.10 ms`, p99 `43.47 ms`
- `lead_workbench`: p95 `39.88 ms`, p99 `40.50 ms`

Notlar:
- Bu olcumler lokal veri seti ve lokal Docker stack uzerindedir; uretim p95 yerine gecmez.
- `dashboard_tab_daily` ve `dashboard_kpis` tarafinda tekil spike'lar (p99) gorulebiliyor; buyuk veri seti + `EXPLAIN` ile tekrar dogrulanmali.

Tamamlamak icin (farkli ortamlarda tekrar olcum):

1. `bench --site <site> console` veya API smoke script ile veri seti boyutu not edilerek test profili hazirla.
   - Hazir script: `scripts/benchmark_dashboard_api.py`
2. Dashboard endpoint'leri icin tekrarli cagrilar yap:
   - `get_dashboard_kpis`
   - `get_dashboard_tab_payload` (`daily`, `sales`, `renewals`, `collections`)
   - `get_customer_workbench_rows`
   - `get_lead_workbench_rows`
3. Her endpoint icin:
   - response time p50/p95/p99
   - row count / filtre seti
   - SQL `EXPLAIN` ciktilari (kritik sorgular)
4. Sonuclari bu dokumana ekle ve index migrationlarini finalize et.

### Ornek benchmark komutu (HTTP/API uzerinden)

```bash
python scripts/benchmark_dashboard_api.py \
  --base-url http://localhost:8000 \
  --auth-token "<api_key>:<api_secret>" \
  --iterations 30 \
  --warmup 3 \
  --pause-ms 100 \
  --page-length 20 \
  --output-json docs/tmp_dashboard_benchmark_report.json
```

Opsiyonel filtre dosyalari:
- `--filters-file docs/benchmark_dashboard_filters.json`
- `--workbench-filters-file docs/benchmark_workbench_filters.json`

Not:
- Bu script p50/p95/p99 olcumunu HTTP seviyesinde yapar (uygulama + serialization + network loopback dahil).
- Daha hassas SQL analizi icin `EXPLAIN` ve DB slow query log ile birlikte kullanilmalidir.

## 5. Sonraki Teknik Adimlar (Wave 5.1)

- OR filtreli count path icin SQL `count(distinct name)` query builder/safe SQL optimizasyonu
- `policy_names` pluck + `IN (...)` desenini join/exists sorgusuna cekme (renewal tarafi)
- Dashboard KPI/tab sorgulari icin istege bagli profiler hook (feature flag ile)
- Bench ortaminda `EXPLAIN` bazli index patchleri (fazlara bolunmus)
