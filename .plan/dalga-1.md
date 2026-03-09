# Dalga 1 - Guvenlik, Yetkilendirme, Performans ve Mimari Cekirdek

## Ozet
Rol yonlendirme, API auth kontrati, log redaction, dashboard performansi ve servis katmani ayrisimi bu dalgada toplandi. Mevcut aktif is Pinia facade migration'inin ilk ekranlari olan `Dashboard.vue` ve `Reports.vue` sonrasinda `RenewalsBoard.vue`.

## Bagimliliklar
- `ROADMAP.md` uzerindeki Faz 1-3 kararlarinin onaylanmis olmasi
- `/at` ve Desk birlikte yasama kararinin sabitlenmis olmasi

## Durum
- **Durum:** Devam Ediyor
- **Mevcut odak:** `Faz 3.2.1 Frontend Pinia store mimarisini yeniden tasarla`
- **Sonraki hamle:** `frontend/src/components/app-shell/OfficeBranchSelect.vue` facade migration ve sonraki migration adaylarini siralamak

## Tamamlananlar

### Gorev 1.1 - Rol ve oturum yonlendirme temelini stabilize et
- [x] `hooks.py` role-based home routing sozlesmesi sabitlendi
- [x] `api/session.py` icinde `roles`, `preferred_home`, `interface_mode` kontrati aciklandi
- [x] `frontend/src/router/index.js` guard davranisi regression checklist'e baglandi

**Tahmini sure:** 14 saat
**Bitti kriteri:** Tum roller icin `/at`, `/app` ve Desk davranisi net
**Test:** Rol bazli login smoke checklist'i

### Gorev 1.2 - API yetkilendirme sozlesmesini tekillestir
- [x] `utils/permissions.py` altinda `assert_mutation_access(...)` ve `assert_read_access(...)` kontrati netlesti
- [x] `api/quick_create.py`, `api/communication.py`, `api/accounting.py`, `api/seed.py`, `api/smoke.py` ortak auth diline cekildi
- [x] `allow_guest` ve hata formati notlari plan seviyesinde kapatildi

**Tahmini sure:** 12 saat
**Bitti kriteri:** Read, mutation, doc-level ve demo/smoke auth desenleri tek dille ifade edilir
**Test:** Permission helper ve endpoint kontrat testleri

### Gorev 1.3 - Loglama redaksiyonunu zorunlu hale getir
- [x] `utils/logging.py` icinde merkezi redacted error helper standardi eklendi
- [x] `reports.py`, `communication.py`, `scheduled_reports.py`, `accounting.py`, `notifications.py`, ilgili controller ve provider zinciri helper'a tasindi
- [x] PII riski tasiyan hata log zinciri kapatildi

**Tahmini sure:** 8 saat
**Bitti kriteri:** Hassas alanlar maskeli structured log ile yazilir
**Test:** `test_logging_redaction.py` ve ilgili API kontrat testleri

### Gorev 2.1 - Dashboard ve yogun sorgu sagligini optimize et
- [x] `api/dashboard.py` icinde request-scope cache katmani eklendi
- [x] `api/dashboard_v2/queries_kpis.py` ve `api/dashboard_v2/tab_payload.py` tekrarli where/value insalari azaltildi
- [x] Iki asamali dashboard hot-path index patch'i olusturuldu

**Tahmini sure:** 16 saat
**Bitti kriteri:** Dashboard tarafinda dusuk riskli ilk performans turu tamamlanir
**Test:** Dashboard smoke ve sorgu kontrat testleri

### Gorev 2.2 - Arkaplan islerini kuyruk stratejisine oturt
- [x] Scheduled report outbox dispatch fan-out modeline tasindi
- [x] `accounting.sync_doc_event` debounce + queue modeline cekildi
- [x] Queue/idempotency riskleri ilk turda sertlestirildi

**Tahmini sure:** 8 saat
**Bitti kriteri:** Uzun suren ve tekrara acik iki kritik akis queue-safe hale gelir
**Test:** Task kontrat testleri

### Gorev 2.3 - Frontend veri cagrilarini debounced hale getir
- [x] `frontend/src/pages/Dashboard.vue` icinde tab/range/branch reload akisi debounce altina alindi
- [x] `frontend/src/pages/Reports.vue` icinde branch/report key otomatik yukleme akislari debounce altina alindi

**Tahmini sure:** 6 saat
**Bitti kriteri:** Otomatik fetch patlamasi olusturan filtre akislarinda debounce aktif olur
**Test:** Manuel SPA smoke

### Gorev 3.1 - Servis katmani ve izin katmanini ayir
- [x] `services/quick_create.py` ile quick create persistence katmani ayrildi
- [x] `services/reports_runtime.py`, `services/admin_jobs.py`, `services/accounting_runtime.py` eklendi
- [x] API katmani auth/request parsing; service katmani persistence/orchestration olacak sekilde sinir cizildi

**Tahmini sure:** 14 saat
**Bitti kriteri:** Kritik endpointler service delegation modeline gecmis olur
**Test:** Mevcut endpoint kontrat testleri

### Gorev 3.2 - DRY ve guvenli yardimci katman
- [x] `api/reports.py` getter/export helper'lari tekillestirildi
- [x] `api/mutation_access.py` altinda ortak write access wrapper eklendi
- [x] `quick_create.py` normalization helper'lari bilincli olarak API katmaninda birakildi

**Tahmini sure:** 10 saat
**Bitti kriteri:** Tekrarlayan auth/export wrapper desenleri ortak helper'a alinmis olur
**Test:** Mevcut helper ve endpoint kontrat testleri

### Gorev 3.3 - DocType sema normalizasyonu
- [x] Finans normalize helper'i eklendi
- [x] `commission_amount` kanonik alan karari Python ve SQL tarafina yayildi
- [x] Status literal setleri merkezi status sabitlerine baglandi
- [x] Notes normalization helper'i eklendi

**Tahmini sure:** 14 saat
**Bitti kriteri:** Veri modeli tekrarlarinin ilk buyuk grubu azaltilir
**Test:** Controller ve report kontrat testleri

### Gorev 3.4 - Police yenileme akisinin yeniden yazimi
- [x] `renewal/service.py`, `renewal/pipeline.py`, `renewal/telemetry.py` iskeleti eklendi
- [x] Stale remediation ve status transition guard'lari eklendi
- [x] `AT Renewal Outcome` DocType'i eklendi
- [x] Lost reason, competitor ve retention veri zinciri task -> outcome -> reporting -> dashboard boyunca baglandi

**Tahmini sure:** 18 saat
**Bitti kriteri:** Renewal outcome ve retention akisi backend + UI tarafinda gorunur olur
**Test:** Renewal task / reporting / dashboard kontrat test backlog'u

## Aktif Is

### Gorev 3.2.1 - Frontend Pinia store mimarisini yeniden tasarla
- [x] `frontend/src/stores/auth.js` facade store olusturuldu
- [x] `frontend/src/stores/ui.js` facade store olusturuldu
- [x] `frontend/src/pages/Dashboard.vue` locale/auth facade migration ilk dilimi alindi
- [x] `frontend/src/pages/Reports.vue` locale/role facade migration ilk dilimi alindi
- [x] `frontend/src/pages/RenewalsBoard.vue` locale/auth facade migration ilk dilimi alindi
- [x] `frontend/src/pages/CustomerList.vue` locale/user facade migration ilk dilimi alindi
- [x] `frontend/src/pages/PolicyList.vue` locale/auth facade migration ilk dilimi alindi
- [x] `frontend/src/pages/ClaimsBoard.vue` locale/auth facade migration ilk dilimi alindi
- [x] `frontend/src/pages/PaymentsBoard.vue` locale/auth facade migration ilk dilimi alindi
- [x] `frontend/src/pages/CommunicationCenter.vue` locale/capability facade migration ilk dilimi alindi
- [x] `frontend/src/components/Topbar.vue` locale/user facade migration ilk dilimi alindi
- [x] `frontend/src/components/Sidebar.vue` locale/ui facade migration ilk dilimi alindi
- [x] `frontend/src/pages/AuxWorkbench.vue` locale/capability facade migration ilk dilimi alindi
- [x] `frontend/src/pages/AuxRecordDetail.vue` locale/capability facade migration ilk dilimi alindi
- [x] `frontend/src/stores/dashboard.js` domain store iskeleti olusturuldu
- [x] `frontend/src/stores/renewal.js` domain store iskeleti olusturuldu
- [x] `frontend/src/pages/Dashboard.vue` icinde range/tab/payload state'i `dashboard` store'a baglandi
- [x] `frontend/src/pages/RenewalsBoard.vue` icinde filter/list/summary state'i `renewal` store'a baglandi
- [x] `frontend/src/components/app-shell/OfficeBranchSelect.vue` locale facade migration alindi
- [x] `frontend/src/components/StatusBadge.vue` ortak locale facade migration alindi
- [x] `frontend/src/pages/ReconciliationWorkbench.vue` locale facade migration ilk dilimi alindi
- [x] `frontend/src/pages/LeadList.vue` locale facade migration ilk dilimi alindi
- [x] `frontend/src/pages/CustomerDetail.vue` locale facade migration ilk dilimi alindi
- [x] `frontend/src/pages/LeadDetail.vue` locale facade migration ilk dilimi alindi
- [x] `frontend/src/pages/PolicyDetail.vue` locale facade migration ilk dilimi alindi
- [x] `frontend/src/pages/OfferDetail.vue` locale facade migration ilk dilimi alindi
- [x] `frontend/tests/unit/stores/dashboard.spec.js` ile dashboard store kontrat testi eklendi
- [x] `frontend/tests/unit/stores/renewal.spec.js` ile renewal store kontrat testi eklendi
- [x] `frontend/src/stores/renewal.js` icinde summary hesap zinciri store'a tasindi
- [x] `frontend/src/stores/dashboard.js` icinde previous-cards ve renewal ozet turetimleri store'a tasindi
- [x] `frontend/src/stores/customer.js` domain store iskeleti ve ilk unit test kontrati eklendi
- [x] `frontend/src/pages/CustomerList.vue` liste/filter/pagination state'i `customer` store'a baglandi
- [x] `frontend/src/stores/policy.js` domain store iskeleti ve ilk unit test kontrati eklendi
- [x] `frontend/src/pages/PolicyList.vue` liste/filter/pagination state'i `policy` store'a baglandi
- [x] `frontend/src/stores/claim.js` domain store iskeleti ve ilk unit test kontrati eklendi
- [x] `frontend/src/pages/ClaimsBoard.vue` liste/filter state'i `claim` store'a baglandi
- [x] `frontend/src/stores/payment.js` domain store iskeleti ve ilk unit test kontrati eklendi
- [x] `frontend/src/pages/PaymentsBoard.vue` liste/filter/summary state'i `payment` store'a baglandi
- [x] `frontend/src/stores/communication.js` domain store iskeleti ve ilk unit test kontrati eklendi
- [x] `frontend/src/pages/CommunicationCenter.vue` snapshot/filter/status-card state'i `communication` store'a baglandi
- [x] `frontend/src/stores/accounting.js` domain store iskeleti ve ilk unit test kontrati eklendi
- [x] `frontend/src/pages/ReconciliationWorkbench.vue` workbench/filter/metrics state'i `accounting` store'a baglandi
- [x] `frontend/src/App.vue` shell mobile sidebar state'i `ui` store'a baglandi
- [x] `frontend/src/pages/OfferBoard.vue` kalan locale/session bagimliligi `auth` facade store'a tasindi

**Tahmini sure:** 12 saat
**Bitti kriteri:** Ana shell + ilk on ekran facade store ile calisir, shell bilesenleri facade store'a tasinir ve dashboard/renewal store girisleri olusur
**Test:** Manuel SPA smoke + store unit test backlog'u

### Faz 3.2.1 Kapanis Notu
- [x] Ana shell ve operasyon ekranlarinda dogrudan `sessionState` / `uiState` kullanimlari temizlendi
- [x] Domain store'a tasinan ana ekranlar:
  - `Dashboard.vue`
  - `RenewalsBoard.vue`
  - `CustomerList.vue`
  - `PolicyList.vue`
  - `ClaimsBoard.vue`
  - `PaymentsBoard.vue`
  - `CommunicationCenter.vue`
  - `ReconciliationWorkbench.vue`
- [x] Facade migration ile temizlenen kalan yuzeyler:
  - `App.vue`
  - `Topbar.vue`
  - `Sidebar.vue`
  - `OfferBoard.vue`
  - liste/detail yardimci ekranlar
- [x] Bilincli istisnalar:
  - `frontend/src/state/session.js`
  - `frontend/src/state/ui.js`
  - `frontend/src/router/index.js`
  - `frontend/src/stores/auth.js`
  - `frontend/src/stores/ui.js`
  - `frontend/src/stores/branch.js`
  - ilgili test dosyalari
  Bu dosyalar facade/store cekirdegi oldugu icin eski state katmanini uyumluluk amacli kullanmaya devam eder.

## Sonraki Teknik Adimlar
1. `frontend/src/pages/Reports.vue` icinde ayri domain store zorunlu olmadigi karariyla facade modelini korumak
2. `TaskBoard.vue` ekraninin repoda olmadigi notuyla facade turunun ana liste/detail ekranlarda tamamlandigi notunu dusmek
3. `dashboard` ve `renewal` store'lari icin ilk store unit test backlog'unu yazmak:
    - [x] `selectedRange` store sync
    - [x] `activeDashboardTab` store sync
    - [x] `dashboard` payload fallback zinciri
    - [x] `renewal` summary tasima kontrati
    - [x] `renewal` summary hesap zinciri store testi
4. `customer` domain store girisini olusturup `CustomerList.vue` state baglama dilimine gecmek:
    - [x] `frontend/src/stores/customer.js` standart state/getter/action kontrati
    - [x] `frontend/tests/unit/stores/customer.spec.js` ilk store kontrat testleri
    - [x] `frontend/src/pages/CustomerList.vue` liste/filter/pagination state'ini store'a baglamak
5. Sonraki domain store adayi:
    - [x] `frontend/src/stores/policy.js` icin ikinci domain-store genislemesini almak
    - [x] `frontend/src/stores/claim.js` icin bir sonraki domain-store genislemesini almak
    - [x] `frontend/src/stores/payment.js` icin sonraki domain-store genislemesini almak
    - [x] `frontend/src/stores/communication.js` icin sonraki domain-store genislemesini almak
    - [x] `frontend/src/stores/accounting.js` icin sonraki domain-store genislemesini almak
    - [x] facade migration ile kalan ufak yuzeyleri envanterleyip `Faz 3.2.1` kapanis notuna gecmek
6. Sonraki teknik odak:
    - [ ] store-page entegrasyon testlerini derinlestirmek (`Dashboard.vue`, `RenewalsBoard.vue`)
    - [x] `frontend/src/App.test.js` ile shell `ui` store kablolamasinin ilk entegrasyon testi
    - [x] `frontend/tests/unit/stores/auth.spec.js` ile auth facade kontrat testlerini eklemek
    - [x] `frontend/tests/unit/stores/ui.spec.js` ile ui facade kontrat testlerini eklemek
    - [x] `frontend/tests/unit/stores/branch.spec.js` ile branch facade kontrat testlerini eklemek

### Faz 3.2.1 Test Sertlestirme Notu
- [x] Shell entegrasyon testi:
  - `frontend/src/App.test.js`
- [x] Facade/store cekirdek kontrat testleri:
  - `frontend/tests/unit/stores/auth.spec.js`
  - `frontend/tests/unit/stores/ui.spec.js`
  - `frontend/tests/unit/stores/branch.spec.js`
- [x] `frontend/src/pages/Dashboard.test.js` ile range/tab -> store/router senkron testi
- [x] `frontend/src/pages/RenewalsBoard.test.js` ile resource rows -> renewal store/summary senkron testi
- [x] `frontend/src/pages/CustomerList.test.js` ile list payload -> customer store/pagination senkron testi
- [x] `frontend/src/pages/PolicyList.test.js` ile list payload -> policy store/pagination senkron testi
- [x] `frontend/src/pages/ClaimsBoard.test.js` ile reload -> claim store/filter senkron testi
- [x] `frontend/src/pages/PaymentsBoard.test.js` ile reload -> payment store/filter/toplam senkron testi
- [x] `frontend/src/pages/CommunicationCenter.test.js` ile route+snapshot -> communication store/status-card senkron testi
- [x] `frontend/src/pages/ReconciliationWorkbench.test.js` ile workbench payload -> accounting store/filter senkron testi

### Faz 3.2.1 Test Kapanis Notu
- [x] Facade/store cekirdek kontratlari test altina alindi
- [x] Shell entegrasyon testi eklendi
- [x] Ana domain ekranlari icin ilk store-page entegrasyon testi turu tamamlandi:
  - `Dashboard`
  - `RenewalsBoard`
  - `CustomerList`
  - `PolicyList`
  - `ClaimsBoard`
  - `PaymentsBoard`
  - `CommunicationCenter`
  - `ReconciliationWorkbench`
- [x] Kapanis karari:
  - Faz `3.2.1` icin ilk migration + ilk test sertlestirme turu yeterli kapsama ulasti
  - sonraki test derinlestirmesi Faz `4+` ekran genislemeleriyle birlikte alinacak

## Sonraki Aktif Odak
- `Faz 4 - Customer 360 ve Productized Policy Foundation`
- ilk mantikli kesit:
  - `AT Customer` 360 payload/service envanteri
  - `CustomerDetail.vue` veri yuzeyini 360 gorunume dogru genisletmek

### Faz 4 Ilk Uygulama Durumu
- [x] Backend `Customer 360` aggregation service iskeleti eklendi
- [x] `acentem_takipte/acentem_takipte/api/dashboard.py` icinde `get_customer_360_payload` endpoint'i eklendi
- [x] Ilk payload kapsami:
  - musteri cekirdek bilgisi
  - police/teklif/odeme/hasar/yenileme listeleri
  - iletisim kanal ozeti ve timeline
  - segment/skor icgorusel ozet
- [x] `CustomerDetail.vue` ilk turda tek payload modeline baglandi
- [x] customer 360 ekranina odeme/hasar/yenileme bloklari ve iletisim kanal ozeti eklendi
- [x] musteri segment/skor karti ve capraz satis alanlari ilk turda eklendi
- [x] `AT Customer Relation` ve `AT Insured Asset` ile ilk baglanti veri modeli acildi
- [x] `CustomerDetail.vue` icinde related customer gorunumu ve asset model uyumu eklendi
- [x] bu yeni DocType'lar icin quick create / liste / detay operasyon yuzeyleri acildi
- [x] customer 360 icinden inline create akisi acildi
- [x] relation/asset kayitlari icin inline edit ve satir ici aksiyonlari acildi
- [x] `frontend/src/pages/CustomerDetail.test.js` ile customer 360 relation/asset create-edit akislarinin ilk entegrasyon testi eklendi
- [x] Ayni test dosyasinda customer 360 operasyon dugmelerinin dogru route'lara gittigi dogrulandi
- [x] Customer 360 relation/asset akislarinda save-success sonrasi payload refresh senaryosu test altina alindi`r`n- [x] Customer 360 relation/asset create-edit dialog prefill sozlesmesi test altina alindi`r`n- [x] `frontend/src/components/app-shell/QuickCreateManagedDialog.test.js` ile create/edit dialog submit success/error sozlesmesi test altina alindi`r`n- [x] Customer 360 segment/skor hesap zinciri aktif police, premium, hasar, geciken odeme ve iptal gecmisi ile daha gercek backend kurallarina baglandi`r`n- [x] Customer 360 yeni skor alanlari (`value_band`, `strengths`, `risks`) UI kartlarinda gorunur hale getirildi`r`n- [ ] Sonraki adim: relation/asset akislarina silme akisi eklemek








- [x] Faz 4 guncelleme (2026-03-09): Customer 360 relation/asset delete akisi eklendi -> api/quick_create.py, services/quick_create.py, frontend/src/pages/CustomerDetail.vue, frontend/src/pages/CustomerDetail.test.js

- [x] Faz 4 guncelleme (2026-03-09): Customer 360 relation/asset backend quick create-delete testleri eklendi -> acentem_takipte/acentem_takipte/tests/test_quick_create_customer360_aux.py

- [x] Faz 4 guncelleme (2026-03-09): Policy 360 backend payload ve PolicyDetail tek payload reload akisi eklendi -> services/policy_360.py, api/dashboard.py, frontend/src/pages/PolicyDetail.vue

- [x] Faz 4 guncelleme (2026-03-09): PolicyDetail urun profili karti eklendi -> frontend/src/pages/PolicyDetail.vue

- [x] Faz 4 guncelleme (2026-03-09): Policy urun readiness katmani eklendi -> services/policy_360.py, frontend/src/pages/PolicyDetail.vue

- [x] Faz 4 guncelleme (2026-03-09): PolicyDetail product profile/readiness sayfa testi eklendi -> frontend/src/pages/PolicyDetail.test.js

## Faz 4 Kapanis Notu (2026-03-09)
- [x] Customer 360 payload servisi tamamlandi.
- [x] CustomerDetail tek payload modeline gecti.
- [x] AT Customer Relation ve AT Insured Asset veri modeli acildi.
- [x] relation/asset inline create-edit-delete akislari tamamlandi.
- [x] Customer 360 sayfa ve dialog testleri eklendi.
- [x] Policy 360 payload servisi tamamlandi.
- [x] PolicyDetail tek payload reload modeline gecti.
- [x] product profile ve readiness gorunurlugu eklendi.
- [x] PolicyDetail sayfa testi eklendi.
- [x] Faz 4 tamamlandi.
- [ ] Sonraki aktif odak: Faz 5 - tahsilat ve mali takip derinlestirme.


- [x] Faz 5 baslangic (2026-03-09): Reconciliation workbench payload tahsilat metrikleri ve overdue preview ile genisletildi -> services/accounting_runtime.py, frontend/src/pages/ReconciliationWorkbench.vue

- [x] Faz 5 guncelleme (2026-03-09): Reconciliation overdue collection metric ve preview sayfa testi eklendi -> frontend/src/pages/ReconciliationWorkbench.test.js

- [x] Faz 5 guncelleme (2026-03-09): AT Payment Installment veri modeli ve payment schedule sync eklendi -> doctype/at_payment_installment/*, doctype/at_payment/at_payment.py, doctype/at_payment/at_payment.json, services/accounting_runtime.py

- [x] Faz 5 guncelleme (2026-03-09): Payment installment sync ve overdue fallback backend testleri eklendi -> acentem_takipte/acentem_takipte/tests/test_accounting_installments.py

- [x] Faz 5 guncelleme (2026-03-09): `PaymentsBoard.vue` taksit gorunurlugu eklendi; odeme detay satirlarinda toplam taksit, odenen taksit, geciken taksit ve sonraki vade gosteriliyor.
