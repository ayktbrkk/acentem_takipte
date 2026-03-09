# Acentem Takipte - VS Code Uygulama Plani

- **Toplam efor:** 476 saat
- **Tahmini sure:** 22 hafta
- **Calisma modeli:** Tek gelistirici, gunde 4-6 saat
- **Kaynak:** ROADMAP.md v2 + Mart 2026 karar kayitlari
- **Guncel baslangic noktasi:** Dalga 7 tamamlandi; odak yeniden Dalga 1 ve Faz 3.2.1 Pinia facade migration akisina alindi
- **Son tamamlanan is:** `App.vue` ve `OfferBoard.vue` kalan facade borclari kapatildi; `Faz 3.2.1` plan seviyesinde kapanis notuna cekildi.

## Faz 3.2.1 Kapanis Ozeti

- Facade migration tamamlanan ana yuzeyler:
  - `App.vue`
  - `Topbar.vue`
  - `Sidebar.vue`
  - ana liste/detail ekranlari
- Domain store baglanan ana operasyon ekranlari:
  - `Dashboard.vue`
  - `RenewalsBoard.vue`
  - `CustomerList.vue`
  - `PolicyList.vue`
  - `ClaimsBoard.vue`
  - `PaymentsBoard.vue`
  - `CommunicationCenter.vue`
  - `ReconciliationWorkbench.vue`
- Bilincli olarak cekirdekte birakilan state kullanimlari:
  - `frontend/src/state/session.js`
  - `frontend/src/state/ui.js`
  - `frontend/src/router/index.js`
  - `frontend/src/stores/auth.js`
  - `frontend/src/stores/ui.js`
  - `frontend/src/stores/branch.js`
- Sonraki hedef:
  - store-page entegrasyon testleri
  - facade/store cekirdek kontrat testlerinin genisletilmesi
- Ilk entegrasyon testi eklendi:
  - `frontend/src/App.test.js`
  - `Topbar -> uiStore.toggleSidebar`
  - `Sidebar(close) -> uiStore.closeSidebar`
- Facade cekirdek kontrat testleri eklendi:
  - `frontend/tests/unit/stores/auth.spec.js`
  - `frontend/tests/unit/stores/ui.spec.js`
  - `frontend/tests/unit/stores/branch.spec.js`
- Ilk sayfa-store entegrasyon testi eklendi:
  - `frontend/src/pages/Dashboard.test.js`
  - range secimi -> `dashboardStore.state.range`
  - tab secimi -> router query + `dashboardStore.state.activeTab`
- Ikinci sayfa-store entegrasyon testi eklendi:
  - `frontend/src/pages/RenewalsBoard.test.js`
  - resource rows -> `renewalStore.state.items`
  - status dagilimi -> `renewalStore.state.summary`
- Ucuncu sayfa-store entegrasyon testi eklendi:
  - `frontend/src/pages/CustomerList.test.js`
  - list payload -> `customerStore.state.items`
  - pagination payload -> `customerStore.state.pagination`
- Dorduncu sayfa-store entegrasyon testi eklendi:
  - `frontend/src/pages/PolicyList.test.js`
  - list payload -> `policyStore.state.items`
  - count payload -> `policyStore.state.pagination.total`
- Besinci sayfa-store entegrasyon testi eklendi:
  - `frontend/src/pages/ClaimsBoard.test.js`
  - refresh/reload -> `claimStore.state.items`
  - query input -> `claimStore.state.filters.query`
- Altinci sayfa-store entegrasyon testi eklendi:
  - `frontend/src/pages/PaymentsBoard.test.js`
  - refresh/reload -> `paymentStore.state.items`
  - query input + totals -> `payment` store turetimi
- Yedinci sayfa-store entegrasyon testi eklendi:
  - `frontend/src/pages/CommunicationCenter.test.js`
  - route context + snapshot -> `communication` store
  - breakdown -> status card turetimi
- Sekizinci sayfa-store entegrasyon testi eklendi:
  - `frontend/src/pages/ReconciliationWorkbench.test.js`
  - workbench payload -> `accounting` store
  - source query -> filtered rows
- Faz 3.2.1 test kapanis karari:
  - facade/store cekirdek kontratlari ve ana domain ekranlari ilk entegrasyon turunda kapsandi
  - ikinci test derinlestirme turu Faz `4+` ekran genislemeleriyle birlikte alinacak
- Siradaki hedef:
  - Faz 4 Customer 360 payload/service envanteri
  - `CustomerDetail.vue` veri modelini 360 gorunume dogru genisletmek

## Dalga Ozet Tablosu

| Dalga | Baslik | Efor | Plan Hafta | Issue |
|---|---|---:|---|---:|
| 1 | Guvenlik, Uyum ve Sozlesme Temeli | 88 | 4 | 11 |
| 2 | Veri Modeli ve Servis Katmani Temeli | 40 | 6 | 0 |
| 3 | Frontend State, UX ve Mobil Foundation | 34 | 8 | 0 |
| 4 | Customer 360 ve Productized Policy Foundation | 46 | 10 | 0 |
| 5 | Gelir Koruma ve Mali Operasyon Motoru | 92 | 14 | 0 |
| 6 | Claims, Iletisim ve Takim Operasyonlari | 92 | 18 | 0 |
| 7 | Yonetici Analitigi, Test ve Release Hardening | 84 | 21 | 10 |

## Guncel Durum

- **Aktif Dalga:** 1
- **Son tamamlanan is:** `LeadList.vue` locale facade migration ilk dilimi.
- **Bir sonraki hedef:** `CustomerDetail.vue` veya `LeadDetail.vue` migration adayini secmek ve facade turunu surdurmek.
- **Dil notu:** Yeni DocType/alan eklerken mevcut label deseni korunacak; `Kullan�c� Notu` ve `Sistem Notu` gibi T�rk�e alan isimlerinde bozuk encoding kabul edilmeyecek.

## Guncel Durum

- **Aktif Dalga:** 1
- **Son tamamlanan is:** Faz 2.2 arkaplan islerini kuyruk stratejisine oturtma plan seviyesinde kapatildi.
- **Bir sonraki hedef:** Faz 2.3 altinda frontend request patlamasi uretebilen filtre akislarini debounce etmek.

## Ilk Faz 1.2 Bulgusu

- `reports.py`: auth ve doctype permission zinciri tutarli
- `admin_jobs.py`: mutation access merkezi helper altinda toplanmis
- `quick_create.py`: en oncelikli standardizasyon adayi; eski ve yeni izin kaliplari birlikte yasiyor

## Faz 1.2 Son Durum

- `assert_mutation_access` helper'i `permtype` destekleyecek sekilde genisletildi.
- `quick_create.py` icindeki duplicate auth/post kontrolu kaldirildi.
- Create endpointleri artik gercekten `create` izni semantigiyle shared helper uzerinden korunuyor.
- `communication.py` read endpoint'i icin eksik doctype read kontrolu kapatildi.
- `accounting.py` ve `communication.py` mutation helper cagrilari acik `permtype="write"` ile hizalandi.
- `seed.py` ve `smoke.py` admin/demo write akisleri de ortak helper diline tasindi.
- read endpointler icin ortak `assert_read_access` helper'i eklendi ve tekrar eden desen uc ana endpointte toplandi.

## Faz 1.2 Kapanis Durumu

- API yetkilendirme sozlesmesi plan seviyesinde kapatildi.
- Ortak kararlar:
  - read -> `assert_read_access`
  - mutation -> `assert_mutation_access`
  - doc-level -> `assert_doc_permission`
  - demo/smoke -> `assert_non_production_or_feature_flag` + modula ozgu delete kontrolu
- Sonraki mantikli is: Faz 1.3 loglama redaksiyonu veya Dalga 1 icindeki kalan guvenlik notlari

## Faz 1.3 Ilk Durum

- `build_redacted_log_message(...)` ve `log_redacted_error(...)` helper'lari eklendi.
- Hassas anahtar listesi recipient/policy/tax varyasyonlarini kapsayacak sekilde genisletildi.
- Ilk redacted error gecisleri:
  - `api/reports.py`
  - `communication.py`
  - `services/scheduled_reports.py`
  - `accounting.py`
- Test kontrati:
  - `tests/test_logging_redaction.py`
  - `tests/test_reports_api.py`

## Faz 1.3 Ikinci Durum

- Notification ve controller error zinciri helper'a tasindi:
  - `notifications.py`
  - `doctype/at_claim/at_claim.py`
  - `doctype/at_policy/at_policy.py`
  - `doctype/at_renewal_task/at_renewal_task.py`
- Provider adapter hata logu da ayni structured redaction formatina cekildi:
  - `providers/whatsapp_meta.py`
- Kalan ham `frappe.log_error(...)` cagrilari teknik/altyapi sinifina ayrildi; operasyonel PII zinciri bu turda temizlendi.

## Faz 1.3 Kapanis Durumu

- `api/dashboard.py` ve `doctype/at_customer/at_customer.py` de redacted helper standardina alindi.
- Faz 1.3 kapsaminda uygulama ici PII riski tasiyan hata log zinciri kapatildi.
- Bilincli istisna:
  - `utils/assets.py` yalnizca symlink/asset altyapi hatasi tasiyor; hassas payload tasimadigi icin teknik baslik olarak birakildi.
- Sonraki mantikli is: Faz 2.1 dashboard ve yogun sorgu sagligi.

## Faz 2.1 Ilk Durum

- `dashboard.py` icinde ayni request kapsaminda tekrar eden policy-name sorgulari bulundu.
- Ilk azaltim adimi olarak `_get_scoped_policy_names(...)` request-scope cache helper'i eklendi.
- Bu helper su akislarda tekrar eden `AT Policy` sorgularini topladi:
  - renewal kart ozetleri
  - renewal preview listesi
  - renewal bucket/status hesabi
- Ikinci azaltim adimi:
  - `_get_request_cache_bucket(...)` ortak cache yardimcisi eklendi
  - cards, commission trend, renewal bucket ve reconciliation summary hesaplari request icinde cache'lendi
- SQL sicak nokta notu:
  - agirlik merkezi `AT Policy`, `AT Payment`, `AT Renewal Task`, `AT Claim`, `AT Lead`, `AT Reconciliation Item`
  - composite index adaylari cikarildi; bir sonraki tur migration/DDL seviyesine tasinacak
- Ilk migration/DDL adimi:
  - `acentem_takipte/acentem_takipte/patches/v2026_03_09_add_dashboard_hot_path_indexes.py`
  - `AT Policy`, `AT Payment`, `AT Claim`, `AT Renewal Task`, `AT Lead`, `AT Accounting Entry` icin idempotent index patch'i eklendi
- Ikinci gecis sadele�tirme adimi:
  - `queries_kpis.py` ve `tab_payload.py` icinde tekrar eden where/value uretimleri yerel cache altina alindi
- Ikinci migration/DDL adimi:
  - `acentem_takipte/acentem_takipte/patches/v2026_03_09_add_dashboard_secondary_indexes.py`
  - `insurance_company`, `policy/status`, `claim_status`, `reconciliation status` desenleri icin ikinci index seti eklendi
- Faz 2.1 kapanis karari:
  - request tekrarlar ve ilk iki index dalgasi alindi
  - sonraki performans kazanci artik queue/idempotency ve olcum odakli olacak

## Faz 2.2 Ilk Durum

- `tasks.py` icinde temel agir akislar zaten enqueue ediliyor.
- Acik riskler:
  - `hooks.py -> doc_events` altinda accounting sync her insert/update'te tetikleniyor
- Ilk refactor adayi:
  - scheduled report delivery dispatch'ini ayri queue fan-out modeline tasimak
- Ilk refactor tamamlandi:
  - scheduled report outbox dispatch artik ayri queue job'larina fan-out ediliyor
  - summary kontratina `outbox_enqueued` ve `outbox_queue_failed` eklendi
- Ikinci refactor tamamlandi:
  - `accounting.sync_doc_event` artik inline sync yerine debounce edilen queue job'i olusturuyor
  - ayni belge icin update patlamasi kisa TTL ile tek queue job'ina indiriliyor
- Faz 2.2 kapanis karari:
  - scheduled reports fan-out ve accounting doc-event debounce kod seviyesinde alindi
  - sonraki performans odagi frontend request patlamasi

## Faz 2.3 Ilk Durum

- Hedef: frontend filtre/search kaynakli request patlamasini azaltmak.
- Ilk inventory yuzeyleri:
  - `frontend/src/pages/Reports.vue`
  - `frontend/src/pages/Dashboard.vue`
- Ilk tercih:
  - kullanici etkilesimiyle tekrarli cagrisi en net olan rapor/list filtre akislarini almak
- Ilk uygulama:
  - `frontend/src/pages/Dashboard.vue` icinde range/tab/branch degisimleri `300ms` debounced reload kapisina toplandi
  - manuel refresh ve create-lead sonrasi yenileme anlik birakildi
- Ikinci uygulama:
  - `frontend/src/pages/Reports.vue` icinde branch ve report key degisimi `300ms` debounce ile toplandi
  - manuel apply/refresh/export akislarina dokunulmadi
- Faz 2.3 kapanis karari:
  - dashboard ve reports ekranlarinda otomatik fetch tetikleri debounce altina alindi
  - sonraki mantikli adim Faz 3.1 servis katmani ayrisimi

## Faz 3.1 Ilk Durum

- `api/quick_create.py` icinde create endpointleri hem permission hem payload normalization hem persistence isini birlikte yurutuyordu.
- Ilk ayristirma adimi:
  - `services/quick_create.py` olusturuldu
  - `customer`, `lead`, `policy` create akislarinin persistence bolumu service katmanina tasindi
- Ikinci ayristirma adimi:
  - `claim`, `payment`, `renewal_task` create akislarinin persistence bolumu de ayni service dosyasina tasindi
  - `api/quick_create.py` ilk alti operasyonel create akisinda delegation modeline cekildi
- Ucuncu ayristirma adimi:
  - service dosyasinda ortak `_insert_doc(...)` helper'i eklendi
  - `update_quick_aux_record` persistence kismi de service katmanina devredildi
- Ara karar:
  - request parsing, field normalization ve link validation API katmaninda kalacak
  - persistence ve sonuc sozlesmesi service katmaninda kalacak
  - sonraki extraction adaylari: `api/reports.py`, `api/admin_jobs.py`, `api/accounting.py`
- Dorduncu ayristirma adimi:
  - `services/reports_runtime.py` olusturuldu
  - `api/reports.py` icinde payload build/export/config orchestration service katmanina tasindi
- Besinci ayristirma adimi:
  - `services/admin_jobs.py` olusturuldu
  - `api/admin_jobs.py` icinde action routing / dispatch mapping service katmanina tasindi
- Altinci ayristirma adimi:
  - `services/accounting_runtime.py` olusturuldu
  - `api/accounting.py` icindeki reconciliation workbench read orchestration service katmanina tasindi
- Faz 3.1 kapanis karari:
  - quick_create, reports, admin_jobs ve accounting icin service extraction alindi
  - sonraki mimari adim yardimci/helper tekillestirmesi

## Faz 3.2 Ilk Durum

- Hedef: API modulleri arasinda tekrar eden helper/desenleri azaltmak.
- Ilk adaylar:
  - report getter/export endpoint ciftleri
  - admin/accounting mutation access wrapper kaliplari
  - quick_create normalization yardimcilari
- Ilk helper tekillestirme:
  - `api/reports.py` icinde getter/export endpoint ciftleri `_get_report_payload(...)` ve `_export_report_payload(...)` altinda toplandi
- Ikinci helper tekillestirme:
  - `api/mutation_access.py` altinda `assert_role_based_write_access(...)` eklendi
  - `api/admin_jobs.py` ve `api/accounting.py` ayni wrapper deseni icin ortak helper'a cekildi
- Karar notu:
  - `quick_create.py` normalization yardimcilari API katmaninda birakildi
  - bu yardimcilar request parsing, Frappe hata dili ve doctype-ozel validation ile fazla bagli
  - Faz 3.2 sonunda yardimci tekillestirme kazanci alindi; sinir bulan�kla�t�r�lmad�

## Faz 3.3 Ilk Durum

- Hedef: veri modeli seviyesinde tekrar eden alan/dogrulama kurallarini azaltmak.
- Ilk tekrarli kural:
  - `AT Offer` ve `AT Policy` finans tutarlilik dogrulamasi
- Ilk uygulama:
  - `utils/financials.py` altinda `normalize_financial_amounts(...)` helper'i eklendi
  - offer/policy controller'lari ayni helper'a baglandi

## Guncel Yurutme Notu

- Dalga 7 kullanici istegiyle tamamlandi olarak kapatildi.
- Kaldigimiz aktif is artik Dalga 1 altinda `Gorev 1.2`.
- Dalga 1 icinde `Gorev 1.1` checklist ve rol davranis matrisi tamamlandi.

## Kapanis Durumu

| Dalga | Kapanis |
|---|---|
| 1 | Devam Ediyor |
| 2 | Baslamadi |
| 3 | Baslamadi |
| 4 | Baslamadi |
| 5 | Baslamadi |
| 6 | Baslamadi |
| 7 | Tamamlandi |

## Bagimlilik Haritasi

1. Karar 1 tamamlanmadan role/interface testleri guvenli kapanmis sayilmaz.
2. Karar 2 tamamlanmadan branch filtreli dashboard ve raporlar nihai kabul almaz.
3. Dalga 1 icin aktif kritik hareket Faz 3.3 altinda SQL seviyesindeki `commission` legacy fallback ifadelerini sadele�tirmektir.

## Ilk Commit Talimati

- `chore(plan): sync roadmap progress`
- Icerik: `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md`, `ROADMAP.md`
- Not: Sadece durum takibi degisikliklerini ayri commit tut.

## Faz 3.4 Guncel Durum

- `AT Renewal Task` artik kayip sebebi ve rakip bilgisi tasiyabiliyor.
- `AT Renewal Outcome` sync kurali `Cancelled` task + kayip sebebi kombinasyonunda `Lost` outcome uretiyor.
- Renewal performance reporting ve dashboard backend payload'i retention verisini tasiyor.
- Siradaki hedef: bu veriyi `/at` yuzeyinde operasyonel olarak duzenlenebilir ve gorunur hale getirmek.

- Renewal operasyon UI'nin ilk dilimi alindi: quick create formu ve renewals listesi kayip sebebi / rakip verisini goruyor.

- Dashboard renewal sekmesinde retention orani artik backend outcome verisinden beslenen kart olarak gorunuyor.

## Faz 3.4 Kapanis Durumu

- Renewal mimarisi cekirdek backlog'u bu turda kapatildi.
- Aktif sonraki hedef frontend state katmanini Pinia domain modeli etrafinda yeniden tasarlamak.


## Faz 3.2.1 Guncel Durum

- Pinia migration kirici degil, facade store modeliyle baslatildi.
- uth ve ui store'lari olusturuldu.
- Siradaki hedef ilk ekran olarak Dashboard.vue uzerinden store migration dilimini almak.

- **Son tamamlanan is:** `CustomerDetail.vue` locale facade migration ilk dilimi.

## Faz 4 Guncel Durum

- Backend `Customer 360` service ve `get_customer_360_payload` endpoint'i eklendi.
- Ilk kapsama musteri cekirdek bilgisi, portfolio, odeme/hasar/yenileme, iletisim ozeti ve segment/skor dahildir.
- `CustomerDetail.vue` ilk turda daginik resource yapisindan tek payload modeline tasindi.
- Odeme/hasar/yenileme ozetleri ve iletisim kanal ozeti ekranda gorunur bloklara cevrildi.
- Segment/skor ve capraz satis alanlari ilk turda ekranda kartlastirildi.
- `AT Customer Relation` ve `AT Insured Asset` ile ilk baglanti veri modeli acildi.
- `CustomerDetail.vue` icinde related customer gorunumu ve asset model uyumu eklendi.
- Bu yeni DocType'lar icin quick create / liste / detay operasyon yuzeyleri acildi.
- Customer 360 icinden relation/asset icin inline create akisi acildi.
- Customer 360 icinde relation/asset icin inline edit ve satir ici aksiyonlar acildi.
- Siradaki hedef Faz 4 icin bu yeni akislara frontend test kapsami eklemek.








- 2026-03-09: Faz 4 Customer 360 relation/asset delete akisi tamamlandi; inline create/edit/delete ve sayfa test kapsami mevcut.

- 2026-03-09: Faz 4 icin relation/asset backend quick create-delete sozlesmesi test altina alindi.

- 2026-03-09: Productized Policy Foundation ilk dilimi tamamlandi; PolicyDetail daginik get/get_list zinciri tek Policy 360 payload uzerine alindi.

- 2026-03-09: Policy 360 product_profile alani PolicyDetail icinde gorunur hale getirildi.

- 2026-03-09: Policy 360 icin urun-tipine gore eksik alan ve readiness gorunurlugu eklendi.

- 2026-03-09: Policy 360 icin ilk sayfa testi eklendi; product profile/readiness gorunurlugu ve temel route akislari sabitlendi.

## Guncel Durum (2026-03-09)
- Faz 4 plan seviyesinde tamamlandi.
- Customer 360 ve Policy 360 omurgalari olustu.
- Sonraki aktif odak Faz 5: Tahsilat ve mali takip derinlestirme.


- 2026-03-09: Faz 5 ilk dilimi tamamlandi; mutabakat ekranina geciken tahsilat sayisi, tutari ve preview listesi eklendi.

- 2026-03-09: Faz 5 overdue collection metric ve preview sayfa testi eklendi; workbench payload sozlesmesi sabitlendi.

- 2026-03-09: Faz 5 icin AT Payment Installment veri modeli acildi; payment kaydi default taksit plani uretir hale geldi ve overdue preview once installment verisinden besleniyor.

- 2026-03-09: Faz 5 icin payment installment sync ve overdue collection fallback mantigi backend test altina alindi.

- 2026-03-09: Faz 5 icin `PaymentsBoard.vue` uzerinde taksit gorunurlugu acildi; payment satirlarinda installment summary ve sonraki vade bilgisi gorunur hale geldi.
