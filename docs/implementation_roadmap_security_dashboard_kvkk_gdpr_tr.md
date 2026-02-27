# Acentem Takipte Uygulama Yol Haritasi (Guvenlik + Dashboard Refactor + KVKK/GDPR)

Tarih: 2026-02-26

Bu dosya, `acentem_takipte` uygulamasi icin kodlama odakli uygulama yol haritasidir. Checklist formatinda tutulur; tamamlanan maddeler `[x]` olarak isaretlenir.

## Durum Gostergesi

- `[ ]` Baslanmadi
- `[x]` Tamamlandi
- `[-]` Bilerek ertelendi / kapsam disi

## Bu Oturumda Tamamlananlar

- [x] Backend/Frontend/DocType/Test statik analiz yapildi
- [x] Kritik guvenlik riskleri (whitelisted endpoint + permission bypass) envanteri cikarildi
- [x] `dashboard.py` refactor ihtiyaclari ve hotspot noktalar belirlendi
- [x] KVKK/GDPR icin teknik uyum gap analizi hazirlandi (hukuki gorus degildir)
- [x] Uygulamaya ozel patch plan taslagi olusturuldu

## Calisma Kurallari (Kodlama Duzeni)

- [ ] Her buyuk adim ayri PR olarak uygulanacak
- [ ] Her PR icin negatif permission testleri yazilacak (yalnizca pozitif akis degil)
- [ ] Public API URL/contract degisiklikleri gerekiyorsa once wrapper/backward-compatible gecis yapilacak
- [ ] Mutasyon endpoint'lerinde POST-only ve permission guard birlikte uygulanacak
- [ ] `ignore_permissions=True` kullanimi sadece internal servis katmaninda kalacak
- [ ] Her faz sonunda checklist guncellenecek (bu dosyada)

## Faz 0 - Hazirlik ve Guvenli Gecis (Hafta 1)

- [x] Endpoint envanteri cikart ve siniflandir (`read`, `write`, `job-trigger`, `dev-only`, `conversion`)
- [x] Rol matrisi ile endpoint yetkilerini eslestir (`Agent`, `Manager`, `Accountant`, `System Manager`)
- [x] Feature flag anahtarlarini belirle (`strict_security_mode`, `disable_demo_endpoints`, `strict_dashboard_scope`)
- [x] Security regression test matrisi taslagi hazirla
- [x] `dashboard.py` response contract smoke testleri tanimla

## Faz 1 - P0 Guvenlik Sertlestirme (Hafta 2-3)

### PR-1: Ortak Security Helper Katmani

- [x] Yeni dosya ekle: `acentem_takipte/acentem_takipte/api/security.py`
- [x] `assert_authenticated()` yardimcisi ekle
- [x] `assert_roles(*roles)` yardimcisi ekle
- [x] `assert_doctype_permission(doctype, ptype)` yardimcisi ekle
- [x] `assert_doc_permission(doctype, name, ptype)` yardimcisi ekle
- [x] `assert_non_production_or_feature_flag(flag_name)` yardimcisi ekle
- [x] `assert_post_request()` yardimcisi ekle
- [x] `audit_admin_action(...)` yardimcisi ekle (basit loglama ile basla)
- [x] Ilk kullanimlari `api/accounting.py` ve `api/communication.py` icine entegre et

### PR-2: Demo/Smoke Endpoint Lockdown (P0)

Hedef dosyalar:

- `acentem_takipte/acentem_takipte/api/seed.py`
- `acentem_takipte/acentem_takipte/api/smoke.py`

Checklist:

- [x] `seed_demo_data()` admin-only yap (`System Manager`)
- [x] `seed_demo_data()` icin production kill-switch ekle (`site_config`)
- [x] `run_backend_smoke_test()` admin-only yap
- [x] `run_backend_smoke_test()` icin production kill-switch ekle
- [x] `inspect_at_doctype_modules()` admin-only yap
- [x] Mutasyon endpoint'lerini POST-only calisacak sekilde sinirla
- [x] Cagiran kullanici + parametre ozeti audit log'a yaz
- [x] Unauthorized testleri ekle (403 / permission error)

### PR-3: Job Trigger Endpoint Yuzeyini Daralt (P0)

Hedef dosyalar:

- `acentem_takipte/acentem_takipte/tasks.py`
- `acentem_takipte/acentem_takipte/hooks.py`

Checklist:

- [x] `tasks.py` icindeki `run_*_job` fonksiyonlarindan whitelist gereksinimini yeniden degerlendir
- [x] Scheduler tarafinin (`hooks.py`) etkilenmedigini dogrula
- [x] Manual tetik gerekiyorsa `api/admin_jobs.py` wrapper tasarla
- [x] Manual tetik endpoint'lerini admin/manager/accountant role check ile sinirla
- [x] Job trigger cagrilarini audit log ile izle
- [x] Rate limit ekle (varsa uygun Frappe mekanizmasi ile)

### PR-4: Muhasebe API Permission Sertlestirme (P0)

Hedef dosyalar:

- `acentem_takipte/acentem_takipte/api/accounting.py`
- `acentem_takipte/acentem_takipte/accounting.py`
- `frontend/src/pages/ReconciliationWorkbench.vue`

Checklist:

- [x] `get_reconciliation_workbench()` girisinde read permission guard uygula
- [x] `run_sync()` icin write/admin guard uygula
- [x] `run_reconciliation_job()` icin write/admin guard uygula
- [x] `resolve_item()` icin write/admin guard uygula
- [x] `resolve_item()` icin item/doc scope kontrolu ekle
- [x] `resolve_reconciliation_item()` fonksiyonunu internal servis olarak sinirla (wrapper disinda dogrudan API gibi kullanimi azalt)
- [x] `save(ignore_permissions=True)` kullanimlarini yorum + guard ile emniyete al
- [x] Frontend tarafinda 403 durumunu kullaniciya anlamli goster
- [x] Restricted role negatif testleri ekle

### PR-5: Iletisim API Permission Sertlestirme (P0)

Hedef dosyalar:

- `acentem_takipte/acentem_takipte/api/communication.py`
- `frontend/src/pages/CommunicationCenter.vue`
- `frontend/src/main.js`

Checklist:

- [x] `get_queue_snapshot()` girisinde `AT Notification Draft`/`AT Notification Outbox` read guard uygula
- [x] `customer` filtresi kullanilirken musteri scope kontrolu ekle
- [x] `get_queue_snapshot()` icin user-facing sorgularda permission-safe query yaklasimini standartlastir
- [x] Mutasyon endpoint'lerinde POST-only zorunlulugu denetle
- [x] `main.js` read-only method listesi ile mutasyon metodlarini net ayir
- [x] 403/permission mesajlarinin UI'da gorunurlugunu iyilestir
- [x] Unauthorized snapshot/mutation testleri ekle

### PR-6: Donusum Endpoint'leri (Lead -> Offer, Offer -> Policy) Sertlestirme (P0)

Hedef dosyalar:

- `acentem_takipte/acentem_takipte/acentem_takipte/doctype/at_lead/at_lead.py`
- `acentem_takipte/acentem_takipte/acentem_takipte/doctype/at_offer/at_offer.py`
- Ilgili backend test dosyalari (`test_at_offer.py`, gerekiyorsa yeni security testleri)

Checklist:

- [x] `convert_to_offer()` icin `lead.check_permission("read")` ekle
- [x] `convert_to_offer()` icin `AT Offer` create permission kontrolu ekle
- [x] `convert_to_offer()` icin customer/agent scope kontrolu ekle
- [x] `convert_to_offer()` mutasyonunu POST-only yap
- [x] `convert_to_policy()` icin `AT Offer` write (veya ozel aksiyon) izni kontrolu ekle
- [x] `convert_to_policy()` icin `AT Policy` create permission kontrolu ekle
- [x] `convert_to_policy()` icin scope kontrolu ekle (offer.customer)
- [x] `ignore_permissions=True` kullanimi internal-service pattern ile sinirla
- [x] Yetkisiz donusum negatif testleri ekle

### PR-7: Notification Template Render Endpoint Sertlestirme (P1 - hizli)

Hedef dosya:

- `acentem_takipte/acentem_takipte/acentem_takipte/doctype/at_notification_template/at_notification_template.py`

Checklist:

- [x] `render_notification_template()` icin `read` permission kontrolu ekle
- [x] Inaktif template render davranisini netlestir (opsiyonel kisit)
- [x] Payload/context boyut limiti ekle
- [x] Rate limit veya basic abuse guard ekle
- [x] Unauthorized render testi ekle

## Faz 2 - Veri Butunlugu ve Hizli Duzeltmeler (Hafta 4-5)

### PR-8: Renewal Status Standardizasyonu (P1)

Hedef dosyalar:

- `acentem_takipte/acentem_takipte/acentem_takipte/doctype/at_renewal_task/at_renewal_task.json`
- `acentem_takipte/acentem_takipte/api/dashboard.py`
- `frontend/src/config/auxWorkbenchConfigs.js`
- `frontend/src/pages/Dashboard.vue` (compatibility sayimi)
- `frontend/src/pages/RenewalsBoard.vue` (etiket uyumu, opsiyonel)
- `acentem_takipte/acentem_takipte/patches.txt` (ve yeni patch dosyasi)

Checklist:

- [x] Canonical status set belirle (`Done` onerilir)
- [x] Backend `dashboard.py` status sayiminda canonical degeri kullan
- [x] Frontend filter/preset config'lerini canonical deger ile hizala
- [x] Data migration patch yaz (`Completed -> Done`)
- [x] Unit/integration testlerle status filtrelerini dogrula

### PR-9: Claim Paid Amount / Currency Duzeltmesi (P1)

Hedef dosyalar:

- `acentem_takipte/acentem_takipte/acentem_takipte/doctype/at_claim/at_claim.py`
- `acentem_takipte/acentem_takipte/acentem_takipte/doctype/at_claim/at_claim.json`
- `acentem_takipte/acentem_takipte/acentem_takipte/doctype/at_payment/at_payment.py` (claim payout currency consistency)
- `acentem_takipte/acentem_takipte/patches.txt` (opsiyonel backfill patch)
- Ilgili testler (`test_at_claim.py` varsa, yoksa eklenecek)

Checklist:

- [x] `paid_amount` alaninin para birimi semantigini netlestir (claim currency mi, TRY mi)
- [x] Gerekirse `paid_amount_try` gibi ayri alan ekle
- [x] `_get_paid_amount()` hesaplamasini currency-aware hale getir
- [x] Validation kuralini normalize edilmis tutar uzerinden uygula
- [x] TRY ve non-TRY senaryolari icin test ekle

### PR-10: Dashboard Scope Fallback SikiLestirme (P1)

Hedef dosya:

- `acentem_takipte/acentem_takipte/api/dashboard.py`
- `frontend/src/pages/Dashboard.vue`
- `acentem_takipte/acentem_takipte/acentem_takipte/tests/test_dashboard_scope.py`

Checklist:

- [x] `_allowed_customers_for_user()` icindeki "global fallback" davranisini feature flag arkasina al
- [x] Agent assignment yoksa default davranisi `empty` veya `permission denied` olacak sekilde netlestir
- [x] Business role olmayan kullanicilar icin global KPI fallback'i kaldir/flag'le
- [x] Frontend tarafinda bos veri / yetkisiz durumlari ayrik goster
- [x] Regression test ekle (agent scope)

## Faz 3 - Dashboard Refactor (Hafta 6-9)

Amaç: API URL'lerini bozmadan `dashboard.py` ic mantigini modullere tasimak.

### Hedef Mimari (Strangler Pattern)

- [x] Public wrapper dosyasi korunacak: `acentem_takipte/acentem_takipte/api/dashboard.py`
- [x] Yeni paket olustur: `acentem_takipte/acentem_takipte/api/dashboard_v2/`
- [x] `dashboard_v2/security.py` (auth + scope)
- [x] `dashboard_v2/filters.py` (parse/normalize)
- [x] `dashboard_v2/constants.py` (status/enum/sort whitelist)
- [x] `dashboard_v2/queries_kpis.py`
- [x] `dashboard_v2/tab_payload.py`
- [x] `dashboard_v2/queries_customers.py`
- [x] `dashboard_v2/queries_leads.py`
- [x] `dashboard_v2/details_lead.py`
- [x] `dashboard_v2/details_offer.py`
- [x] `dashboard_v2/serializers.py`

### Wave 1 - Security/Scope Extraction (P1)

- [x] Endpoint entry-level permission policy tablosu olustur
- [x] `_allowed_customers_for_user()` ve benzeri scope fonksiyonlarini `dashboard_v2/security.py` altina tasi
- [x] `dashboard.py` wrapper'lar yeni katmani kullanmaya baslasin
- [x] Response contract smoke testleri gecsin

### Wave 2 - Customer Workbench Refactor (P1)

Hedef hotspotlar:

- `get_customer_workbench_rows()` (`dashboard.py`)
- Derived sort full-scan path'leri

Checklist:

- [x] Filter parse + validation katmanini ayir
- [x] Query builder ve serializer'i ayir
- [x] `count` icin full `pluck="name"` yerine optimize count kullan
- [x] Derived sort icin full-scan davranisini azalt (iki asamali sort-seed + page hydration ile satir payload'i azaltildi)
- [x] Sensitive field masking'i serializer katmanina tasi
- [x] Customer workbench testleri gecsin

### Wave 3 - Lead Workbench Refactor (P1)

- [x] `get_lead_workbench_rows()` parse/query/derive/serialize ayrimini yap
- [x] Python-side filtre/sort nedeniyle tam liste cekilen akislari azalt (iki asamali sort-seed + page hydration)
- [x] Conversion/stale derived alanlarini reusable helper'lara tasi (`dashboard_v2/serializers.py`)
- [x] Performance smoke test (buyuk veri seti) ekle

### Wave 4 - KPI / Tab Payload / Detail Payload Refactor (P2)

- [x] `get_dashboard_kpis()` query bloklarini `queries_kpis.py`'ye tasi
- [x] `get_dashboard_tab_payload()` metric/series/previews logic ayrimini yap
- [x] `get_lead_detail_payload()` ve `get_offer_detail_payload()` detail modullerine tasi
- [x] API response contract snapshot testleri ekle

### Wave 5 - Performance ve Index Plani (P2)

- [x] Query profiler/SQL gozlemi ile en yavas sorgulari listele
- [x] Index migration planini hazirla (`AT Policy`, `AT Renewal Task`, `AT Lead`, `AT Reconciliation Item`, `AT Notification Outbox`)
- [x] `frappe.get_all` -> `frappe.get_list` gecis firsatlarini uygula
- [x] Buyuk veri setinde p95 response suresi olcumu al ve dokumante et

## Faz 4 - KVKK/GDPR Uyum Programi (Teknik + Surec) (Hafta 8-12, Paralel)

Not: Bu bolum hukuki danismanlik degildir. Teknik ve operasyonel uyum hazirligi icindir.

### KVKK/GDPR Gap Kapatma - P0/P1 Temel Kontroller

- [x] Veri siniflandirma envanteri hazirla (`AT Customer`, `AT Policy`, `AT Claim`, `AT Payment`, `AT Notification*`)
- [x] Isleme amaci / hukuki sebep (KVKK/GDPR) envanter tablosu olustur
- [x] Dis saglayici envanteri olustur (SMS/Email/WhatsApp/API/Hosting/Backup)
- [x] Yurt disi aktarim riski olan entegrasyonlari isaretle
- [x] Admin aksiyon audit log standardi belirle (job run, export, resolve, delete)

### KVKK/GDPR - Uygulama Icinde Teknik Isler

- [x] `Consent Event` DocType tasarla (zaman, kanal, metin versiyonu, kanit)
- [x] `Data Subject Request` (DSR) workflow tasarla (basvuru, SLA, durum, sonuc)
- [x] Musteri veri export araci (JSON/CSV/PDF paket) tasarla
- [x] Musteri anonymize/silme araci tasarla (retention politikasina bagli)
- [ ] Audit event logger'i kritik endpoint'lere entegre et
- [x] Access log retention politikasini tanimla

### KVKK/GDPR - Surec ve Dokumantasyon

- [ ] Retention/Imha matrisi hazirla (doctype bazli sureler)
- [ ] Veri ihlali (breach) runbook hazirla (tespit, degerlendirme, bildirim, kanit)
- [ ] DPA / tedarikci sozlesme kontrol listesi hazirla
- [ ] Aydinlatma metni ve riza metni versiyonlama surecini tanimla
- [ ] VERBIS/KVKK kurumsal yukumlulukleri icin hukuk ekibiyle teyit checklist'i olustur

## Test ve Dogrulama Checkpoint'leri

### Security Regression (Backend)

- [x] Unauthorized kullanici `seed_demo_data` cagiramaz
- [x] Unauthorized kullanici `run_backend_smoke_test` cagiramaz
- [x] Unauthorized kullanici `resolve_item` cagiramaz
- [x] Unauthorized kullanici `convert_to_offer` cagiramaz
- [x] Unauthorized kullanici `convert_to_policy` cagiramaz
- [x] Unauthorized kullanici `get_queue_snapshot` goremez
- [x] Scoped agent sadece kendi customer/portfolio verisini gorur

### Frontend E2E / UX

- [ ] 403 durumlarinda UI anlamli hata mesaji gosterir
- [ ] Capability olmayan aksiyon butonlari gizlenir/disable edilir
- [ ] Dashboard ve workbench ekranlari refactor sonrasi contract degismeden calisir
- [x] Operasyon ekranlarinda (Hasar/Odeme/Yenileme/Mutabakat/Iletisim) gelismis filtre toolbar duzeni standartlastirildi
- [x] Operasyon ekranlarinda (Hasar/Odeme/Yenileme/Mutabakat/Iletisim) custom filtre preset kaydet/sil parity'si eklendi

## Tamamlama Gunlugu

- [x] 2026-02-26 - Yol haritasi dosyasi olusturuldu ve ilk checklist dolduruldu
- [x] 2026-02-26 - PR-1 (security helper katmani + accounting/communication ilk entegrasyon) tamamlandi
- [x] 2026-02-26 - PR-3 cekirdek degisiklikleri tamamlandi (`tasks.py` whitelist daraltma + `api/admin_jobs.py` kontrollu wrapper)
- [x] 2026-02-26 - PR-4 backend sertlestirme tamamlandi (accounting API role/doc checks + internal service sinirlama)
- [x] 2026-02-26 - PR-4 frontend 403 hata mesaji iyilestirmesi tamamlandi (`ReconciliationWorkbench.vue`)
- [x] 2026-02-26 - PR-4 restricted-role negatif testleri eklendi (`test_accounting_reconciliation.py`)
- [x] 2026-02-26 - PR-5 tamamlandi (communication API scope/query hardening + CommunicationCenter 403 UX + negatif test)
- [x] 2026-02-26 - PR-6 tamamlandi (Lead/Offer donusum endpoint security hardening + negatif testler)
- [x] 2026-02-26 - PR-7 tamamlandi (template render endpoint hardening + auth negatif test)
- [x] 2026-02-26 - PR-2 tamamlandi (demo/smoke endpoint lockdown + unauthorized security testleri)
- [x] 2026-02-26 - PR-3 tamamlandi (job trigger endpoint yuzeyi daraltma + admin_jobs wrapper rate-limit)
- [x] 2026-02-26 - PR-4 tamamlandi
- [x] 2026-02-26 - PR-5 tamamlandi
- [x] 2026-02-26 - PR-6 tamamlandi
- [x] 2026-02-26 - PR-7 tamamlandi
- [x] 2026-02-26 - PR-8 tamamlandi (renewal status canonicalization + migration patch + dashboard/frontend uyum testleri)
- [x] 2026-02-26 - PR-9 tamamlandi (claim paid_amount currency semantics + `paid_amount_try` + payment currency consistency + tests + backfill patch)
- [x] 2026-02-26 - PR-10 tamamlandi (dashboard scope fallback strict mode + feature flag + frontend access notice + agent scope regression tests)
- [x] 2026-02-26 - Dashboard Refactor Wave 1 cekirdek extraction tamamlandi (`dashboard_v2/security.py` + backward-compatible wrapper)
- [x] 2026-02-26 - Dashboard Refactor Wave 1 permission policy tablosu eklendi (`dashboard_v2/security.py`)
- [-] 2026-02-26 - Dashboard response contract smoke testleri eklendi; local shell ortaminda `frappe` modulu olmadigi icin calistirilamadi (sonradan bench ortaminda basariyla calistirildi)
- [x] 2026-02-26 - Dashboard Refactor Wave 2 ilk extraction tamamlandi (`filters/queries_customers/serializers/constants` + `get_customer_workbench_rows` delegasyonu + count optimizasyonu)
- [x] 2026-02-26 - Wave 2 helper unit testleri gecti (`test_dashboard_customer_workbench_helpers.py`)
- [x] 2026-02-26 - Wave 2 derived-sort path iki asamali fetch'e cekildi (sort seed + page hydration, daha dusuk payload)
- [x] 2026-02-26 - Dashboard Refactor Wave 3 ilk extraction tamamlandi (`queries_leads.py` + lead filter/serializer helpers + `get_lead_workbench_rows` delegasyonu)
- [x] 2026-02-26 - Wave 3 helper unit testleri gecti (`test_dashboard_customer_workbench_helpers.py`, lead helper kapsamiyla)
- [x] 2026-02-26 - Dashboard Refactor Wave 4 extraction tamamlandi (`queries_kpis.py`, `tab_payload.py`, `details_lead.py`, `details_offer.py` + `dashboard.py` wrapper delegasyonlari)
- [x] 2026-02-26 - Wave 4 Python sentaks dogrulamasi gecti (`dashboard.py` + yeni `dashboard_v2` modulleri)
- [x] 2026-02-26 - Wave 4 builder contract/snapshot testleri eklendi ve gecti (`test_dashboard_wave4_builders.py`, `frappe` stub ile local unit test)
- [x] 2026-02-26 - Wave 5 SQL gozlem/hotspot ve index migration plan dokumani eklendi (`docs/dashboard_wave5_performance_index_plan_tr.md`)
- [x] 2026-02-26 - Wave 5 `get_all -> get_list` gecisleri uygulandi (`dashboard.py`, `dashboard_v2/queries_*`, `dashboard_v2/details_*`)
- [x] 2026-02-26 - Wave 5 p95 olcum hazirligi icin benchmark script eklendi (`scripts/benchmark_dashboard_api.py`, bench/runtime ortaminda calistirilacak)
- [x] 2026-02-26 - Wave 5 candidate index migration patch eklendi (`v2026_02_26_add_dashboard_candidate_indexes.py`)
- [x] 2026-02-26 - Wave 5 p95 benchmark olcumu tamamlandi (`localhost:8080`, 30 iterasyon, rapor: `docs/dashboard_benchmark_report_localhost_2026-02-26.json`)
- [x] 2026-02-26 - Wave 1 response contract smoke testleri bench'te gecti (`acentem_takipte.acentem_takipte.tests.test_dashboard_contract_smoke`)
- [x] 2026-02-26 - Wave 2 customer/lead workbench contract smoke testleri eklendi ve bench'te gecti (`test_dashboard_contract_smoke.py`)
- [x] 2026-02-26 - Wave 3 performance smoke maddesi benchmark script + guncel backend benchmark rerun ile kapatildi (`scripts/benchmark_dashboard_api.py`)
- [x] 2026-02-26 - Dashboard Refactor Wave 1-5 tamamlandi (Wave 1-3 acik maddeler bench test + benchmark ile kapatildi)
- [x] 2026-02-26 - Operasyon ekranlarinda `WorkbenchFilterToolbar` tabanli gelismis filtreleme duzeni standartlastirildi (`ClaimsBoard`, `PaymentsBoard`, `RenewalsBoard`, `ReconciliationWorkbench`, `CommunicationCenter`)
- [x] 2026-02-26 - Operasyon ekranlarinda custom filtre preset kaydet/sil parity'si eklendi (local+server preset persistence, `ClaimsBoard`, `PaymentsBoard`, `RenewalsBoard`, `ReconciliationWorkbench`, `CommunicationCenter`)
- [x] 2026-02-26 - `frappe_docker` icin kalici bind-mount override eklendi (`compose.override.yaml`) ve `acentem_takipte` app root'u backend/frontend/worker/scheduler servislerine mount edildi
- [x] 2026-02-26 - Docker local gelistirme icin frontend build + restart + cache clear + HTTP asset check otomasyon scripti eklendi (`scripts/sync_frappe_docker_dev.ps1`)
- [x] 2026-02-26 - `sync_frappe_docker_dev.ps1` icin watch mode eklendi (frontend/backend degisikliklerini izleyip uygun sync/restart akisini calistirir)
- [x] 2026-02-26 - `sync_frappe_docker_dev.ps1` watch mode icin masaustu bildirim + sesli uyari eklendi (`-WatchNotify`, `-WatchBeep`, best-effort toast/system sound)
- [x] 2026-02-26 - PR-2 unauthorized testleri eklendi ve bench'te gecti (`test_seed_smoke_security.py`)
- [x] 2026-02-26 - PR-3 admin job trigger rate-limit eklendi (`api/admin_jobs.py`, cache tabanli best-effort)
- [x] 2026-02-26 - Faz-0 guvenlik hazirlik envanteri/rol matrisi/feature flag/test matrisi dokumani eklendi (`docs/security_faz0_hazirlik_envanteri_tr.md`)
- [x] 2026-02-26 - KVKK/GDPR P1 temel envanterler + dis saglayici/yurt disi aktarim isaretleme + admin audit standardi dokumani eklendi (`docs/kvkk_gdpr_p1_temel_envanterler_tr.md`)
- [x] 2026-02-26 - KVKK/GDPR P1 uygulama ici teknik tasarimlar dokumani eklendi (`Consent Event`, `DSR`, export/anonymize, access log retention) (`docs/kvkk_gdpr_p1_uygulama_tasarimlari_tr.md`)
- [ ] YYYY-MM-DD - KVKK/GDPR teknik backlog P1 tamamlandi
