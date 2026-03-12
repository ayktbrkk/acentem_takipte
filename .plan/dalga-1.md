# Dalga 1 - Guvenlik, Yetkilendirme, Performans ve Mimari Cekirdek

## Ozet
Rol yonlendirme, API auth kontrati, log redaction, dashboard performansi ve servis katmani ayrisimi bu dalgada toplandi. Mevcut aktif is Pinia facade migration'inin ilk ekranlari olan `Dashboard.vue` ve `Reports.vue` sonrasinda `RenewalsBoard.vue`.

## Bagimliliklar
- `ROADMAP.md` uzerindeki Faz 1-3 kararlarinin onaylanmis olmasi
- `/at` ve Desk birlikte yasama kararinin sabitlenmis olmasi

## Durum
- **Durum:** Devam Ediyor
- **Mevcut odak:** `kapanis`
- **Son tamamlanan faz:** `Faz 372`
- **Sonraki hamle:** `yeni issue secimi veya yeni uygulama dalgasi`

## 2026-03-11 Faz 18 Kapanis Notu
- [x] Dashboard read endpoint method guard backend policy tablosuna baglandi.
- [x] Frontend resource fetch zinciri dashboard read endpointlerinde `GET` ile hizalandi.
- [x] Customer/Lead workbench OR-count fallback'i aggregate count sorgusuna indirildi.
- [x] Benchmark script threshold, workspace-output guard ve violation exit-code davranisi ile sertlestirildi.
- [x] Faz 18 plan/roadmap/backlog/README senkronu tamamlandi.

## 2026-03-11 Faz 19 Baslangic Notu
- [x] `scripts/benchmark_dashboard_api.py` icine `--scenarios` filtreleme destegi eklendi.
- [x] `tests/test_dashboard_benchmark_script.py` icinde scenario secim kontrati eklendi.
- [x] `scripts/benchmark_presets/` altina varsayilan dashboard/workbench filtre presetleri eklendi.
- [x] `scripts/benchmark_dashboard_api.md` icinde iki dilli kullanim notu yazildi.
- [x] `scripts/benchmark_dashboard_api.py` icine `--preset default` otomatik preset yukleme destegi eklendi.
- [x] `scripts/benchmark_dashboard_api.py` icine `--artifact-name` ve standart output klasoru destegi eklendi.
- [x] Benchmark preset ve kullanim artefact'lari tamamlandi.

## 2026-03-11 Faz 19 Kapanis Notu
- [x] Benchmark script scenario, preset ve artefact output akisi ile operasyonel hale geldi.
- [x] Iki dilli kullanim notu ve varsayilan preset seti repoya baglandi.
- [x] Faz 19 sprint/roadmap/backlog/README senkronu tamamlandi.

## 2026-03-11 Faz 20 Baslangic Notu
- [x] `scripts/benchmark_dashboard_api.py` icine `--list-presets` destegi eklendi.
- [x] JSON benchmark raporuna `preset` ve `scenarios` meta alanlari eklendi.
- [x] Preset discoverability ve parse istisnasi testleri eklendi.
- [x] Faz 20 kapanis notu ve sonraki uygulama fazi acildi.

## 2026-03-11 Faz 20 Kapanis Notu
- [x] Preset discoverability ve metadata standardi tamamlandi.
- [x] Faz 20 sprint/roadmap/backlog/README senkronu tamamlandi.

## 2026-03-11 Faz 21 Baslangic Notu
- [x] `scripts/benchmark_dashboard_api.py` `--artifact-name` ile Markdown ozet de uretir hale geldi.
- [x] Markdown artefact path ve icerik kontrati test altina alindi.
- [x] Faz 21 kapanis notu ve sonraki uygulama fazi acildi.

## 2026-03-11 Faz 21 Kapanis Notu
- [x] Benchmark Markdown artefact ozeti tamamlandi.
- [x] Faz 21 sprint/roadmap/backlog/README senkronu tamamlandi.

## 2026-03-11 Faz 22 Baslangic Notu
- [x] `--preset default` varsayilan threshold degerlerini de yukler hale geldi.
- [x] JSON ve Markdown benchmark raporuna threshold metadata'si eklendi.
- [x] Preset threshold kontrati test altina alindi.
- [x] Faz 22 kapanis notu ve sonraki uygulama fazi acildi.

## 2026-03-11 Faz 22 Kapanis Notu
- [x] Preset threshold baseline standardi tamamlandi.
- [x] Faz 22 sprint/roadmap/backlog/README senkronu tamamlandi.

## 2026-03-11 Faz 23 Baslangic Notu
- [x] `scripts/benchmark_dashboard_api.py` icinde `quick/default/full` preset katalogu tanimlandi.
- [x] Preset katalogu ve quick threshold davranisi test altina alindi.
- [x] Faz 23 kapanis notu ve sonraki uygulama fazi acildi.

## 2026-03-11 Faz 23 Kapanis Notu
- [x] Benchmark preset katalog genislemesi tamamlandi.
- [x] Faz 23 sprint/roadmap/backlog/README senkronu tamamlandi.

## 2026-03-11 Faz 24 Baslangic Notu
- [x] `get_preset_summary(...)` helper'i eklendi.
- [x] `--list-presets` cikisi threshold ve aciklama ozeti verecek sekilde guncellendi.
- [x] Preset summary kontrati test altina alindi.
- [x] Faz 24 kapanis notu ve sonraki uygulama fazi acildi.

## 2026-03-11 Faz 24 Kapanis Notu
- [x] Preset discoverability summary zenginlestirmesi tamamlandi.
- [x] Faz 24 sprint/roadmap/backlog/README senkronu tamamlandi.

## 2026-03-11 Faz 25 Baslangic Notu
- [x] `get_all_preset_summaries(...)` helper'i eklendi.
- [x] `--list-presets-json` cikisi eklendi.
- [x] JSON preset katalog kontrati test altina alindi.
- [x] Faz 25 kapanis notu ve sonraki uygulama fazi acildi.

## 2026-03-11 Faz 25 Kapanis Notu
- [x] Benchmark preset discoverability JSON katalog cikisi tamamlandi.
- [x] Kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.
- [x] Sonraki aktif faz olarak gercek uygulama gelistirme akisi acildi.

## 2026-03-11 Faz 26 Baslangic Notu
- [x] `frontend/src/pages/PolicyDetail.vue` icinde ownership assignment satirlarina delete aksiyonu eklendi.
- [x] Delete onayi TR/EN etiketleri ile eklendi.
- [x] `frontend/src/pages/PolicyDetail.test.js` icinde assignment delete + payload refresh sozlesmesi eklendi.
- [ ] Faz 26 icinde Policy 360 operasyon lifecycle tutarliligi derinlestirilecek.

## 2026-03-11 Faz 26 Guncelleme
- [x] `frontend/src/pages/PolicyDetail.vue` icinde ownership assignment satirlarina hizli status aksiyonlari eklendi.
- [x] `In Progress`, `Blocked`, `Done` gecisleri `update_quick_aux_record` zinciri ile baglandi.
- [x] `frontend/src/pages/PolicyDetail.test.js` icinde assignment status aksiyonlari ve payload refresh sozlesmesi eklendi.

## 2026-03-11 Faz 26 Ikinci Guncelleme
- [x] `frontend/src/pages/CustomerDetail.vue` icinde ownership assignment satirlarina hizli status aksiyonlari eklendi.
- [x] `In Progress`, `Blocked`, `Done` gecisleri Customer 360 tarafinda mevcut aux update zinciri ile baglandi.
- [x] `frontend/src/pages/CustomerDetail.test.js` icinde assignment status aksiyonlari ve payload refresh sozlesmesi eklendi.

## 2026-03-11 Faz 26 Ucuncu Guncelleme
- [x] `frontend/src/pages/CommunicationCenter.vue` icinde assignment context aksiyonlari `Start/Block/Close` olarak genisletildi.
- [x] Assignment context mutasyonlari mevcut `update_quick_aux_record` zinciri ile baglandi.
- [x] `frontend/src/pages/CommunicationCenter.test.js` icinde assignment context start/block/close sozlesmeleri eklendi.

## 2026-03-11 Faz 26 Kapanis Notu
- [x] Ownership assignment lifecycle aksiyonlari `PolicyDetail`, `CustomerDetail`, `CommunicationCenter` ve ilgili takip yuzeylerinde hizalandi.
- [x] Faz 26 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.
- [x] Sonraki aktif faz olarak aux/detail operator deneyimi icin yeni uygulama fazi acildi.

## 2026-03-11 Faz 27 Baslangic Notu
- [x] `frontend/src/pages/AuxRecordDetail.vue` icinde ownership assignment detail header lifecycle aksiyonlari eklendi.
- [x] `In Progress`, `Blocked`, `Done` gecisleri detail seviyesinde mevcut aux mutation zinciri ile baglandi.
- [x] `frontend/src/pages/AuxRecordDetail.test.js` icinde detail lifecycle aksiyon kontrati eklendi.
- [ ] Faz 27 icinde aux/detail operator deneyimi derinlestirilecek.

## 2026-03-11 Faz 27 Guncelleme
- [x] `frontend/src/pages/AuxWorkbench.vue` icinde ownership assignment satir lifecycle aksiyonlari eklendi.
- [x] `In Progress`, `Blocked`, `Done` gecisleri liste seviyesinde mevcut aux mutation zinciri ile baglandi.
- [x] `frontend/src/pages/AuxWorkbench.test.js` icinde ownership assignment liste aksiyon kontrati eklendi.

## 2026-03-11 Faz 27 Ikinci Guncelleme
- [x] `frontend/src/pages/AuxRecordDetail.vue` icinde task/reminder header lifecycle aksiyonlari eklendi.
- [x] Task icin `In Progress`, `Blocked`, `Done`, `Cancelled`; reminder icin `Done`, `Cancelled` gecisleri detail seviyesinde mevcut aux mutation zinciri ile baglandi.
- [x] `frontend/src/pages/AuxRecordDetail.test.js` icinde task/reminder detail lifecycle aksiyon kontratlari eklendi.

## 2026-03-11 Faz 27 Ucuncu Guncelleme
- [x] `frontend/src/pages/AuxRecordDetail.vue` icinde notification-outbox retry aksiyonu detail header'a tasindi.
- [x] Retry aksiyonu mevcut `retry_outbox_item` zinciri ile detail seviyesinde baglandi.
- [x] `frontend/src/pages/AuxRecordDetail.test.js` icinde notification-outbox detail retry kontrati eklendi.

## 2026-03-11 Faz 27 Dorduncu Guncelleme
- [x] `frontend/src/pages/AuxRecordDetail.vue` icinde notification-outbox requeue aksiyonu detail header'a acildi.
- [x] Requeue aksiyonu mevcut `requeue_outbox_item` zinciri ile detail seviyesinde baglandi.
- [x] `frontend/src/pages/AuxRecordDetail.test.js` icinde notification-outbox detail requeue kontrati eklendi.

## 2026-03-11 Faz 27 Besinci Guncelleme
- [x] `frontend/src/pages/AuxRecordDetail.vue` icinde notification-draft send-now aksiyonu detail header'a tasindi.
- [x] Send-now aksiyonu mevcut `send_draft_now` zinciri ile detail seviyesinde baglandi.
- [x] `frontend/src/pages/AuxRecordDetail.test.js` icinde notification-draft detail send-now kontrati eklendi.

## 2026-03-11 Faz 27 Kapanis Notu
- [x] Aux/list-detail operator action parity notification draft/outbox, task, reminder ve ownership assignment yuzeylerinde tamamlandi.
- [x] Faz 27 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.
- [x] Sonraki aktif faz olarak operator yuzeyleri arasi baglamsal gecis fazi acildi.

## 2026-03-11 Faz 28 Baslangic Notu
- [x] `frontend/src/pages/AuxRecordDetail.vue` icinde notification draft/outbox kayitlarindan CommunicationCenter baglamina gecis aksiyonu eklendi.
- [x] CommunicationCenter gecisi `reference_doctype`, `reference_name`, `reference_label` query parametreleri ile baglandi.
- [x] `frontend/src/pages/AuxRecordDetail.test.js` icinde baglamsal gecis kontrati eklendi.
- [ ] Faz 28 icinde operator yuzeyleri arasi baglamsal gecisler derinlestirilecek.

## 2026-03-11 Faz 28 Guncelleme
- [x] `frontend/src/pages/AuxWorkbench.vue` icinde notification draft satirlarina CommunicationCenter baglam gecisi eklendi.
- [x] Liste seviyesinde gecis `reference_doctype`, `reference_name`, `reference_label` query parametreleri ile baglandi.
- [x] `frontend/src/pages/AuxWorkbench.test.js` icinde liste baglam gecis kontrati eklendi.

## 2026-03-11 Faz 28 Ikinci Guncelleme
- [x] `frontend/src/pages/AuxWorkbench.test.js` icinde notification outbox satirlarindan CommunicationCenter baglam gecisi kontrati eklendi.
- [x] Liste seviyesindeki ortak baglam gecis helper'inin `AT Notification Outbox` icin de calistigi sabitlendi.

## 2026-03-11 Faz 28 Ucuncu Guncelleme
- [x] `frontend/src/pages/AuxRecordDetail.vue` ve `frontend/src/pages/AuxWorkbench.vue` icindeki baglam gecis helper'lari reminder/task/ownership assignment yuzeylerini de kapsayacak sekilde genisletildi.
- [x] Reminder liste/detail kayitlarindan CommunicationCenter baglam gecisi kontratlari eklendi.
- [x] Faz 28 hedefi dogrultusunda operator kaydindan ilgili iletisim operasyon ekranina tek adim gecis kapsami genisletildi.

## 2026-03-11 Faz 28 Dorduncu Guncelleme
- [x] `frontend/src/pages/AuxRecordDetail.test.js` icinde task ve ownership assignment detail baglam gecisi kontratlari eklendi.
- [x] `frontend/src/pages/AuxWorkbench.test.js` icinde task ve ownership assignment liste baglam gecisi kontratlari eklendi.
- [x] Faz 28 kapsamindaki operator -> CommunicationCenter baglam gecisi parity'si task/reminder/ownership assignment icin test seviyesinde tamamlandi.

## 2026-03-11 Faz 28 Kapanis Notu
- [x] Operator yuzeyleri arasi baglamsal gecis parity'si reminder/task/ownership assignment/draft/outbox icin tamamlandi.
- [x] Faz 28 kapanis kayitlari plan/roadmap/backlog/README ile senkronlanacak.

## 2026-03-11 Faz 29 Baslangic Notu
- [x] CommunicationCenter icinde `return_to` baglamli geri donus aksiyonu eklendi.
- [x] `frontend/src/pages/CommunicationCenter.test.js` icinde geri donus aksiyonu kontrati eklendi.
- [x] Faz 29 icinde operator gecislerinde kaynak ekrana tek adim geri donus deneyimi derinlestirilecek.

## 2026-03-11 Faz 29 Guncelleme
- [x] `frontend/src/pages/AuxRecordDetail.vue` icinde CommunicationCenter gecisine `return_to` parametresi eklendi.
- [x] `frontend/src/pages/AuxWorkbench.vue` icinde liste gecislerine `return_to` parametresi eklendi.
- [x] `frontend/src/pages/AuxRecordDetail.test.js` ve `frontend/src/pages/AuxWorkbench.test.js` return_to kontratlari guncellendi.

## 2026-03-11 Faz 29 Ikinci Guncelleme
- [x] `frontend/src/pages/CustomerDetail.vue` icinde CommunicationCenter gecisine `return_to` parametresi eklendi.
- [x] `frontend/src/pages/LeadDetail.vue` ve `frontend/src/pages/OfferDetail.vue` icinde CommunicationCenter gecislerine `return_to` parametresi eklendi.
- [x] `frontend/src/pages/CustomerDetail.test.js` CommunicationCenter gecis kontrati guncellendi.

## 2026-03-11 Faz 29 Ucuncu Guncelleme
- [x] CommunicationCenter toolbar aksiyonlarina `return_to` geri donus butonu eklendi.

## 2026-03-11 Faz 29 Dorduncu Guncelleme
- [x] `frontend/src/pages/CommunicationCenter.test.js` icinde return_to butonu context disinda da gorunur olacak sekilde test eklendi.

## 2026-03-11 Faz 29 Besinci Guncelleme
- [x] `frontend/src/pages/CommunicationCenter.vue` return_to olmadiginda router back fallback'i ile geri donus yapacak sekilde guncellendi.
- [x] `frontend/src/pages/CommunicationCenter.test.js` fallback davranisi testle sabitlendi.

## 2026-03-11 Faz 29 Altinci Guncelleme
- [x] `frontend/src/pages/CommunicationCenter.vue` icinde return_to icin guvenli path kontrolu eklendi.
- [x] `frontend/src/pages/CommunicationCenter.test.js` unsafe return_to icin router back fallback testi eklendi.

## 2026-03-11 Faz 29 Yedinci Guncelleme
- [x] `frontend/src/pages/CommunicationCenter.vue` return_to cozumlemesi `resolveSameOriginPath` ile same-origin URL'leri de kapsayacak sekilde guncellendi.

## 2026-03-11 Faz 29 Sekizinci Guncelleme
- [x] `frontend/src/pages/ClaimsBoard.vue` icinde CommunicationCenter notification gecisine `return_to` parametresi eklendi.
- [x] `frontend/src/pages/ClaimsBoard.test.js` return_to gecisini sayfa testi ile sabitledi.

## 2026-03-11 Faz 29 Dokuzuncu Guncelleme
- [x] `frontend/src/pages/Dashboard.vue` follow-up CommunicationCenter gecisine `return_to` parametresi eklendi.

## 2026-03-11 Faz 29 Kapanis Notu
- [x] Operator yuzeylerinde CommunicationCenter `return_to` geri donus parity’si tamamlandi.
- [x] Faz 29 kapanis kayitlari plan/roadmap/backlog/README ile senkronlanacak.

## 2026-03-11 Faz 30 Baslangic Notu
- [x] Reports view-state (kolon gorunurlugu) route senkronu ve geri yazimi testleri eklendi.

## 2026-03-12 Faz 30 Ikinci Guncelleme
- [x] Reports scheduled reports run/save/remove akislari test kapsami eklendi.
- [x] Reports export PDF aksiyonu testle sabitlendi.

## 2026-03-12 Faz 30 Ucuncu Guncelleme
- [x] Reports export XLSX aksiyonu testle sabitlendi.
- [x] Reports export failure fallback davranisi testle sabitlendi.

## 2026-03-12 Faz 30 Kapanis Notu
- [x] Reports view-state, scheduled reports aksiyonlari ve export PDF/XLSX fallback testleri tamamlandi.
- [x] Faz 30 kapanis kayitlari plan/roadmap/backlog/README ile senkronlanacak.

## 2026-03-12 Faz 31 Baslangic Notu
- [x] Reports scheduled run/save/remove hata fallback test kapsami eklendi.

## 2026-03-12 Faz 31 Ikinci Guncelleme
- [x] Reports scheduled load failure ve report load error test kapsami eklendi.

## 2026-03-12 Faz 31 Kapanis Notu
- [x] Reports scheduled/run/save/remove ve load/export error fallback testleri tamamlandi.
- [x] Faz 31 kapanis kayitlari plan/roadmap/backlog/README ile senkronlanacak.

## 2026-03-12 Faz 32 Baslangic Notu
- [x] Payment status raporunda branch bazli policy scope filtresi eklendi ve test kapsami guncellendi.

## 2026-03-12 Faz 32 Ikinci Guncelleme
- [x] Communication operations raporunda branch filtresi eklendi ve test kapsami guncellendi.

## 2026-03-12 Faz 32 Ucuncu Guncelleme
- [x] Reconciliation operations raporunda branch filtresi eklendi ve test kapsami guncellendi.

## 2026-03-12 Faz 32 Kapanis Notu
- [x] Payment/communication/reconciliation raporlarinda branch filtresi parity tamamlandi.
- [x] Faz 32 kapanis kayitlari plan/roadmap/backlog/README ile senkronlanacak.

## 2026-03-12 Faz 33 Baslangic Notu
- [x] Reports runtime export format normalize testi eklendi.
- [x] Scheduled report summary error fallback testi eklendi.

## 2026-03-12 Faz 33 Kapanis Notu
- [x] Reports runtime fallback test kapsami tamamlandi.
- [x] Faz 33 kapanis kayitlari plan/roadmap/backlog/README ile senkronlanacak.

## 2026-03-12 Faz 34 Baslangic Notu
- [x] Export format `xls` alias destegi eklendi ve test kapsami guncellendi.

## 2026-03-12 Faz 34 Kapanis Notu
- [x] Export format alias destegi ve test kapsami tamamlandi.
- [x] Faz 34 kapanis kayitlari plan/roadmap/backlog/README ile senkronlanacak.

## 2026-03-12 Faz 35 Baslangic Notu
- [x] Reports export popup blocked hata davranisi ve test kapsami eklendi.

## 2026-03-12 Faz 36 Baslangic Notu
- [x] Reports runtime download response icin None-safe handling ve test kapsami eklendi.

## 2026-03-12 Faz 37 Baslangic Notu
- [x] Reports runtime build_safe_report_payload hata log test kapsami eklendi.

## 2026-03-12 Faz 35 Kapanis Notu
- [x] Export popup blocked fallback test kapsami tamamlandi.
- [x] Faz 35 kapanis kayitlari plan/roadmap/backlog/README ile senkronlanacak.

## 2026-03-12 Faz 36 Kapanis Notu
- [x] Reports runtime download response None-safe kapsami tamamlandi.
- [x] Faz 36 kapanis kayitlari plan/roadmap/backlog/README ile senkronlanacak.

## 2026-03-12 Faz 37 Kapanis Notu
- [x] Reports runtime build_safe_report_payload fallback test kapsami tamamlandi.
- [x] Faz 37 kapanis kayitlari plan/roadmap/backlog/README ile senkronlanacak.

## 2026-03-12 Faz 38 Baslangic Notu
- [x] Export format normalize icin `xlsm/excel` alias destegi ve test kapsami eklendi.

## 2026-03-12 Faz 39 Baslangic Notu
- [x] Reports runtime download response filters None-safe handling ve test kapsami eklendi.

## 2026-03-12 Faz 40 Baslangic Notu
- [x] Reports export URL icinde office_branch filtresi testle dogrulandi.

## 2026-03-12 Faz 38 Kapanis Notu
- [x] Export format alias genisletme tamamlandi.
- [x] Faz 38 kapanis kayitlari plan/roadmap/backlog/README ile senkronlanacak.

## 2026-03-12 Faz 39 Kapanis Notu
- [x] Download response filters None-safe kapsami tamamlandi.
- [x] Faz 39 kapanis kayitlari plan/roadmap/backlog/README ile senkronlanacak.

## 2026-03-12 Faz 40 Kapanis Notu
- [x] Export URL filter kapsami tamamlandi.
- [x] Faz 40 kapanis kayitlari plan/roadmap/backlog/README ile senkronlanacak.
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

## Faz 6 Aktif Durum
- **Durum:** Devam Ediyor
- **Mevcut odak:** Claim lifecycle ve Communication Center veri modeli derinlestirme
- **Sonraki hamle:** `AT Segment` ve `AT Campaign` veri modelini quick create ve aux workbench yuzeyine tasimak

### Faz 6 Ilk Uygulama Durumu
- [x] `AT Claim` operasyon alanlari eklendi:
  - `assigned_expert`
  - `rejection_reason`
  - `appeal_status`
  - `next_follow_up_on`
- [x] `ClaimsBoard.vue` icinde lifecycle kolonlari, hizli status aksiyonlari ve claim notification gorunurlugu eklendi
- [x] `AT Call Note` veri modeli, quick create endpoint'i ve `CommunicationCenter.vue` hizli giris akisi eklendi
- [x] `AT Call Note` icin backend/UI ilk test turu eklendi
- [x] `AT Segment` veri modeli, quick create endpoint'i ve aux workbench config'i eklendi
- [x] `AT Campaign` veri modeli, quick create endpoint'i ve aux workbench config'i eklendi
- [x] Segment/campaign icin backend quick create kontrat testleri eklendi
- [x] `CommunicationCenter.vue` icinde segment ve kampanya launcher/dialog akisi eklendi
- [x] `CommunicationCenter.test.js` icinde segment/campaign dialog gorunurlugu test altina alindi
- [x] `services/segments.py` ile kriter bazli segment membership preview servisi eklendi
- [x] `api/communication.py` icinde `preview_segment_members` endpoint'i eklendi
- [x] `tests/test_segments.py` ile service ve endpoint permission kontrati eklendi
- [x] `CommunicationCenter.vue` icinde segment uye onizleme dialog'u eklendi
- [x] `CommunicationCenter.test.js` icinde segment preview yukleme sozlesmesi eklendi
- [x] `services/campaigns.py` ile kampanyadan notification draft ureten execution servisi eklendi
- [x] `api/communication.py` icinde `execute_campaign` endpoint'i eklendi
- [x] `tests/test_campaigns.py` ile campaign execution service ve endpoint kontrati eklendi
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

- [x] Faz 5 test guncelleme (2026-03-09): `frontend/src/pages/PaymentsBoard.test.js` taksit gorunurlugu kontrati ile genisletildi; installment summary satirlari DOM seviyesinde sabitlendi.

- [x] Faz 5 guncelleme (2026-03-09): payment quick create sozlesmesi taksit alanlariyla genisletildi -> `frontend/src/config/quickCreateRegistry.js`, `api/quick_create.py`, `services/quick_create.py`

- [x] Faz 5 guncelleme (2026-03-09): `Policy 360` payload ve `PolicyDetail.vue` taksit preview ile genisletildi; poliÃ§e detayinda taksit plani gorunur hale geldi.

- [x] Faz 5 test guncelleme (2026-03-09): rontend/src/pages/PolicyDetail.test.js taksit preview kontrati ile genisletildi; installment preview alanlari sayfa seviyesinde test altina alindi.

- [x] Faz 5 guncelleme (2026-03-09): Customer 360 payload installment ozetleri ile genisletildi; CustomerDetail odeme kartlarinda geciken taksit sinyali gorunur hale geldi.

- [x] Faz 5 test guncelleme (2026-03-09): odeme quick create installment sozlesmesi backend testleri ile sabitlendi -> acentem_takipte/acentem_takipte/tests/test_quick_create_customer360_aux.py

- [x] Faz 5 guncelleme (2026-03-09): mutabakat ekrani komisyon tahakkuk metrikleri ve preview listesi ile genisletildi -> services/accounting_runtime.py, frontend/src/pages/ReconciliationWorkbench.vue, frontend/src/pages/ReconciliationWorkbench.test.js

- [x] Faz 5 guncelleme (2026-03-09): mutabakat workbench icin preview-first ekstre ice aktarma akisi eklendi -> services/accounting_statement_import.py, api/accounting.py, frontend/src/pages/ReconciliationWorkbench.vue

- [x] Faz 5 test guncelleme (2026-03-09): preview-first ekstre ice aktarma parse ve eslesme kontrati backend testleri ile sabitlendi -> acentem_takipte/acentem_takipte/tests/test_accounting_statement_import.py

- [x] Faz 5 test guncelleme (2026-03-09): ReconciliationWorkbench ekstre ice aktarma preview dialog kontrati sayfa testine eklendi -> frontend/src/pages/ReconciliationWorkbench.test.js

## Guncel Durum (2026-03-09)
- Durum: Aktif
- Aktif Faz: Faz 5 - Tahsilat ve mali takip derinlestirme
- Tamamlanan son adim: ReconciliationWorkbench ekstre ice aktarma preview dialog kontrati sayfa testine eklendi.
- Sonraki hedef: preview satirlarini AT Accounting Entry / reconciliation adayina donusturen persistence katmani.

- [x] Faz 5 guncelleme (2026-03-09): ekstre preview satirlarini eslesen policy/payment kayitlari uzerinden AT Accounting Entry ve reconciliation adayina baglayan persistence katmani eklendi -> services/accounting_statement_import.py, api/accounting.py, frontend/src/pages/ReconciliationWorkbench.vue

- [x] Faz 5 test guncelleme (2026-03-09): statement import persistence backend ve UI kontrat testleri eklendi -> acentem_takipte/acentem_takipte/tests/test_accounting_statement_import.py, frontend/src/pages/ReconciliationWorkbench.test.js

- [x] Faz 5 guncelleme (2026-03-09): ReconciliationWorkbench gorunen acik kayitlar icin toplu coz / yoksay aksiyonlari ile genisletildi -> api/accounting.py, frontend/src/pages/ReconciliationWorkbench.vue

- [x] Faz 5 test guncelleme (2026-03-09): ReconciliationWorkbench toplu coz aksiyonu sayfa testine eklendi -> frontend/src/pages/ReconciliationWorkbench.test.js

- [x] Faz 5 test guncelleme (2026-03-09): bulk_resolve_items backend kontrati sabitlendi -> acentem_takipte/acentem_takipte/tests/test_accounting_reconciliation.py

- [x] Faz 5 plan seviyesinde kapatildi. Mali takip zinciri: installment modeli, overdue tahsilat, komisyon tahakkuk, statement preview/import ve bulk reconciliation aksiyonlari ile ilk operasyonel surume ulasti.
- [ ] Sonraki aktif odak: Faz 6 - Hasar ve iletisim merkezi derinlestirme.

### Faz 6 Baslangic Durumu
- [x] AT Claim semasina ssigned_expert, ejection_reason, ppeal_status, 
ext_follow_up_on alanlari eklendi
- [x] doctype/at_claim/at_claim.py uzerinde rejection/appeal/follow-up guard'lari baglandi
- [x] 	ests/test_claim_operational_fields.py ile ilk backend kontrat testi eklendi
- [ ] Sonraki adim: ClaimsBoard.vue uzerinde hasar operasyon gorunurlugunu genisletmek

- [x] rontend/src/pages/ClaimsBoard.vue uzerinde hasar operasyon kolonu eklendi; eksper, red sebebi, itiraz ve takip tarihi gorunur hale geldi
- [ ] Sonraki adim: claim status aksiyonlari ve musteri bildirim gorunurlugunu acmak

- [x] pi/quick_create.py icinde AT Claim quick aux edit whitelist'i acildi
- [x] rontend/src/pages/ClaimsBoard.vue uzerinde hizli claim status aksiyonlari ve notification template ipucu eklendi
- [x] rontend/src/pages/ClaimsBoard.test.js ile claim status mutation payload zinciri test altina alindi
- [ ] Sonraki adim: rejected sebep toplama ve claim notification outbox gorunurlugunu acmak

- [x] rontend/src/pages/ClaimsBoard.vue icinde claim'e bagli notification draft/outbox ozetleri gorunur hale geldi
- [x] Rejected claim aksiyonu red sebebi toplayarak hizli update zincirine baglandi
- [x] rontend/src/pages/ClaimsBoard.test.js rejected payload zinciri ile guncellendi
- [ ] Sonraki adim: claim-specific outbox aksiyonlari veya iletisim merkezi kampanya/call-note veri modeli

- [x] AT Call Note veri modeli eklendi
- [x] pi/quick_create.py ve services/quick_create.py uzerinde quick call note create akisi acildi
- [x] rontend/src/config/auxWorkbenchConfigs.js ile call-notes aux route'u eklendi
- [x] rontend/src/pages/CommunicationCenter.vue icinden hizli arama notu girisi acildi
- [ ] Sonraki adim: call note test kapsami ve kampanya/segment veri modeli

- [x] 	ests/test_quick_create_customer360_aux.py uzerinde quick call note service payload kontrati eklendi
- [x] rontend/src/pages/CommunicationCenter.test.js uzerinde call note dialog config ve prefill kontrati eklendi
- [ ] Sonraki adim: kampanya/segment veri modeli

- 2026-03-09: CommunicationCenter campaign execution UI secicileri ve test hedefleri sabitlendi.

- 2026-03-09: Campaign execution sonucu AT Campaign kaydinda last_run_on/matched/skipped/sent alanlariyla gorunur hale getirildi.

- 2026-03-09: Planned/Running kampanyalar icin scheduler tabanli due campaign job eklendi.

- 2026-03-09: AT Campaign detail ekranina bagli notification draft/outbox related kartlari eklendi.

## Faz 6 Kapanis Notu
- Durum: Tamamlandi
- Kapsam: Claim lifecycle, call note, segment, campaign, segment preview, campaign execution, scheduler, campaign delivery trace.
- Sonraki aktif faz: Faz 7.


- 2026-03-09: Faz 7 baslangic olarak Reports omurgasina communication operations yonetsel raporu eklendi.

- 2026-03-09: Communication operations raporu icin backend registry/service/api ve frontend Reports sayfa kontrat testleri eklendi.

- 2026-03-09: Reconciliation operations yonetsel raporu eklendi ve backend/frontend kontrat testleri ile sabitlendi.

- Tamamlandi: Faz 7 ikinci yonetsel rapor turu sonrasi claims_operations raporu eklendi; backend row builder, registry, API, Reports UI ve backend/frontend kontrat testleri yazildi.

- Tamamlandi: Faz 7 icinde operasyon raporlarina donem karsilastirmasi eklendi; Reports ekrani secili tarih araligini onceki esit periyot ile ikinci istek uzerinden kiyasliyor.

- Tamamlandi: ScheduledReportsManager yeni operasyon raporlariyla hizalandi; communication_operations, reconciliation_operations ve claims_operations icin branch/status/date filtre operatorlugu acildi ve component testi eklendi.

## Faz 7 Kapanis
- Durum: Tamamlandi
- Kapsam: communication_operations, reconciliation_operations ve claims_operations yonetsel raporlari; previous-period comparison kartlari; scheduled report operatorlugu genisletmesi.
- Sonuc: Rapor zinciri artik operasyon, kiyas ve zamanlanmis teslim katmanlariyla birlikte calisir durumda.
- Sonraki aktif odak: Faz 8.

- Tamamlandi: Faz 8 ilk kesiti olarak AT Customer Segment Snapshot veri modeli eklendi; customer_360 artik canli insight payload'ini snapshot kaydina yaziyor ve snapshot-first omurga olusuyor.
# Guncel Not
- [x] Faz 8.1: Customer segment snapshot veri omurgasi
- [x] Faz 8.2: Customer 360 icinden snapshot upsert
- [x] Faz 8.3: Batch refresh job ve daily scheduler
- [x] Faz 8.4: CustomerDetail icinde snapshot metadata gorunurlugu
- [x] Faz 8.5: Snapshot batch refresh icin admin tetikleme ve liste gorunurlugu
- [x] Faz 8.6: Snapshot admin UI tetikleme butonu
- [x] Faz 8.7: Snapshot liste/detail okunabilirligini artir
- [x] Faz 8.8: Snapshot liste taranabilirligini artir
- [x] Faz 8.9: Snapshot operasyon ozet kartlarini ac
- [x] Faz 8.10: Segment snapshot trend gorunurlugu
- [x] Faz 8.11: Segment snapshot export gorunurlugu
- [x] Faz 8.12: Faz 8 kapanis ve sonraki veri katmani

## Faz 8 Kapanis
- Durum: Tamamlandi
- Kapsam: snapshot veri omurgasi, batch refresh, scheduler, admin tetikleme, Customer 360 metadata, aux liste/detail okunabilirligi, trend ve CSV export gorunurlugu.
- Sonraki aktif faz: Faz 9

## Faz 9 Baslangic Durumu
- [x] `AT Ownership Assignment` veri modeli eklendi
- [x] quick create ve aux edit/delete zinciri ownership assignment icin acildi
- [x] `Customer 360` ve `Policy 360` payload'larina assignment gorunurlugu eklendi
- [x] `CustomerDetail.vue` icinde inline assignment create/edit/delete akisina gecildi
- [x] `ClaimsBoard.vue` icinden claim kaynakli assignment create prefilleri acildi
- [x] `CustomerDetail.test.js` ownership assignment create/edit prefill ve render kontrati ile genisletildi
- [ ] Sonraki adim: assignment liste/operasyon gorunurlugunu claim/policy tarafinda derinlestirmek

- [x] Faz 9.2: ClaimsBoard assignment gorunurlugu eklendi
  - `frontend/src/pages/ClaimsBoard.vue` claim satirlarinda assignment count/open/assignee ozeti gorunur
  - `frontend/src/pages/ClaimsBoard.test.js` assignment hint kontrati ile genisletildi
- [ ] Sonraki adim: PolicyDetail ve ownership aux yuzeyinde assignment operasyonlarini derinlestirmek
- [x] Faz 9.3: PolicyDetail inline assignment create/edit akisi eklendi
  - `frontend/src/pages/PolicyDetail.vue` policy kaynakli assignment dialoglari acildi
  - `frontend/src/pages/PolicyDetail.test.js` create/edit prefill kontrati ile genisletildi
- [ ] Sonraki adim: ownership assignment aux/detail operasyonlarini genisletmek ve Faz 9 kapanisina gitmek
- [x] Faz 9.4: Ownership assignment aux/detail okunabilirligi eklendi
  - `frontend/src/pages/AuxRecordDetail.vue` ownership assignment icin ozel detail bloklari acildi
  - `frontend/src/pages/AuxRecordDetail.test.js` ownership assignment detail kontrati eklendi

## Faz 9 Kapanis
- Durum: Tamamlandi
- Kapsam: `AT Ownership Assignment` veri modeli, quick create/aux edit-delete, Customer 360/Policy 360/Claims gorunurlugu, inline create-edit akislar, aux/detail okunabilirligi ve ilk sayfa testleri.
- Sonraki aktif faz: Faz 10

## Faz 10 Baslangic Durumu
- [x] Detay ekranlari icin mobil shell iyilestirmesi yapildi.
  - rontend/src/components/app-shell/DetailActionRow.vue mobilde dikey ve tam genislik aksiyon akisina gecirildi
  - rontend/src/components/app-shell/DetailTabsBar.vue mobil yatay sekme scroller + snap davranisi ile guclendirildi
- [ ] Sonraki adim: CustomerDetail ve PolicyDetail icinde mobilde veri yogunlugunu azaltan section siralama ve preview kisitlari

- [x] rontend/src/pages/CustomerDetail.vue ve rontend/src/pages/PolicyDetail.vue icin mobil hizli aksiyon seridi eklendi
- [ ] Sonraki adim: mobilde preview/list bloklarinda bilgi yogunlugunu azaltan responsive kisitlar

- [x] rontend/src/pages/CustomerDetail.vue ve rontend/src/pages/PolicyDetail.vue icinde mobilde preview yogunlugu azaltildi; fazla kartlar yalnizca masaustunde gosteriliyor
- [ ] Sonraki adim: liste ekranlarinda mobil filter/summary ergonomisini guclendirmek

- [x] rontend/src/pages/CustomerList.vue ve rontend/src/pages/PolicyList.vue icin mobil liste ozet kartlari eklendi
- [ ] Sonraki adim: Faz 10 icin ilk sayfa test/kapanis turu

- [x] rontend/src/pages/CustomerList.test.js ve rontend/src/pages/PolicyList.test.js mobil liste ozeti gorunurlugu ile genisletildi
- [ ] Sonraki adim: Faz 10 kapanis notu


## Faz 10 Kapanis
- [x] Detail shell mobil davranisi iyilestirildi
- [x] CustomerDetail ve PolicyDetail mobil hizli aksiyon seritleri eklendi
- [x] CustomerDetail ve PolicyDetail mobil preview yogunlugu azaltildi
- [x] CustomerList ve PolicyList mobil liste ozet kartlari eklendi
- [x] Mobil liste ozeti sayfa testleri ile sabitlendi
- [x] Faz 10 tamamlandi
- [ ] Sonraki aktif faz: Faz 11


- Faz 11.1 tamamlandi: Dashboard takip SLA paneli eklendi.
- Faz 11.2 basladi: SLA paneline drill-down aksiyonlari eklendi.
- Faz 11.2 test turu tamamlandi: Dashboard SLA panel route davranisi sabitlendi.

- Faz 11.3 tamamlandi: Dashboard SLA drill-down query paramlari ClaimsBoard, RenewalsBoard ve CommunicationCenter tarafinda filtre senkronuna baglandi.

- Faz 11.4 tamamlandi: ClaimsBoard ve RenewalsBoard icin hizli takip kapatma aksiyonlari eklendi ve sayfa testleriyle sabitlendi.

- Faz 11.5 tamamlandi: CommunicationCenter context kartina assignment kapatma ve call note takip temizleme aksiyonlari eklendi; UI kontrati testlerle sabitlendi.

- Faz 11 tamamlandi: Dashboard takip SLA paneli, drill-down, hedef ekran query senkronu ve hizli kapanis aksiyonlari ile operasyonel SLA omurgasi tamamlandi.

- Faz 12.1 tamamlandi: AT Access Log mutation audit icin genisletildi; quick create service katmaninda create/edit/delete izleri yaziliyor ve aux yuzeyinde gorunur hale getirildi.

- Faz 12.2 tamamlandi: Admin job dispatch ve campaign execution akislari Run audit iziyle AT Access Log uzerinden kaydediliyor.

- Faz 12.3 tamamlandi: Access & Audit Logs aux ekranina aksiyon bazli audit ozet kartlari (total/create/edit/delete/run) ve reference_doctype/reference_name uzerinden hedef kayda dogrudan panel drill-down davranisi eklendi.

- Faz 12.4 tamamlandi: AT Access Log detail ekranina Audit Baglami ve Karar ve Eylem kartlari eklendi; action_summary ve decision_context alanlari okunur bloklar halinde gosteriliyor ve AuxRecordDetail sayfa testi ile sabitlendi.

- Faz 12.5 tamamlandi: Access & Audit Logs ekrani icin Create/Edit/Delete/Run odakli hazir presetler, action select filtresi ve viewed_on desc varsayilan siralama eklendi.

- Faz 12 tamamlandi: mutation ve run audit yazimi, Access & Audit Logs aux list/detail okunurlugu, hedef kayda drill-down ve hazir action presetleri ile operasyonel audit omurgasi tamamlandi.
- Sonraki aktif odak: Faz 13.

- Faz 13.1 tamamlandi: Policy 360 payload'ina document_profile eklendi; PolicyDetail dokuman sekmesinde toplam/PDF/gorsel/tablo/diger ve son yukleme ozet kartlari acildi; sayfa testi eklendi.

- [x] Faz 13.2: ClaimsBoard claim bazli dokuman gorunurlugu ve test hizalamasi tamamlandi.

- [x] Faz 13.3: Claim belgeleri icin Files aux drill-down ve route-query filtre senkronu tamamlandi.

- [x] Faz 13.4 tamamlandi: Customer 360 belge profili ve Files drill-down acildi; CustomerDetail icinde dokuman ozeti kartlari, files-list gecisi ve sayfa testi eklendi.

- [x] Faz 13.5 tamamlandi: Policy 360 dokuman sekmesine files-list drill-down eklendi; PolicyDetail testine filtreli files route sozlesmesi eklendi.

- [x] Faz 13.6 tamamlandi: Files aux yuzeyi dosya tipi ve bagli doctype ozet kartlari, select filtreleri ve hazir belge presetleri ile operasyonel hale getirildi.

- [x] Faz 13.7 tamamlandi: Files aux ekraninda panel aksiyonu artik attached target kayda gider; belge merkezi policy/customer/claim taraflariyla simetrik drill-down davranisina kavustu.
- [x] Faz 13 tamamlandi: Policy 360 ve Customer 360 document profile, claim document summary, files drill-down, files aux operatorlugu ve belge merkezi preset/ozet kartlari tamamlandi.
- [ ] Sonraki aktif odak: Faz 14.

### Faz 14 Ilk Uygulama Durumu
- [x] `AT Task` DocType veri modeli eklendi
- [x] `create_quick_task` + `services/work_management.py` ile ilk genel gorev omurgasi acildi
- [x] `tasks` aux workbench yuzeyi ve `task/task_edit` quick create config'i eklendi
- [x] `Dashboard.vue` gunluk sekmeye `Benim Gorevlerim / My Tasks` paneli eklendi
- [x] `test_work_management.py` ve `Dashboard.test.js` ile ilk backend/frontend kontrat testi eklendi

- [x] Dashboard ve task aux listesi icin Takibe Al / Bloke Et / Tamamla / Iptal Et hizli aksiyonlari eklendi
- [x] AT Activity DocType veri modeli eklendi
- [x] create_quick_activity + quick create service/persistence omurgasi eklendi
- [x] activities aux workbench yuzeyi ve activity/activity_edit quick create config'i eklendi
- [x] sourcePanel icinde AT Activity route cozumu eklendi
- [x] test_activity_quick_create.py ile ilk backend kontrat testi eklendi
- [ ] Sonraki aktif odak: Faz 14 AT Activity gorunurlugunu dashboard/detail yuzeylerine tasimak

## Guncelleme - 2026-03-09 Faz 14.3
- [x] AT Activity customer 360 payload ve CustomerDetail gorunurlugu eklendi.
- [x] CustomerDetail sayfa testi activity bolumu ile genisletildi.
- Sonraki odak: activity gorunurlugunu policy ve dashboard operasyon yuzeylerine tasimak.


## Guncelleme - 2026-03-09 Faz 14.4
- [x] AT Activity policy 360 payload ve PolicyDetail gorunurlugu eklendi.
- [x] PolicyDetail sayfa testi activity bolumu ile genisletildi.
- Sonraki odak: AT Activity gorunurlugunu dashboard veya my work yuzeyine tasimak.


## Guncelleme - 2026-03-09 Faz 14.5
- [x] Dashboard icine Benim Aktivitelerim paneli eklendi.
- [x] Policy 360 ve Customer 360 sonrasi activity gorunurlugu dashboard ile tamamlandi.
- Sonraki odak: Faz 14 kapanis notu veya AT Reminder veri katmani.


## Kapanis - 2026-03-09 Faz 14
- [x] Faz 14 tamamlandi.
- Kapsam: AT Task, task lifecycle aksiyonlari, AT Activity, Customer 360 / Policy 360 activity gorunurlugu, Dashboard my tasks + my activities.
- Sonraki aktif odak: Faz 15 veya AT Reminder veri katmani.


- 2026-03-10: Faz 15 reminder gorunurlugu ve route-aware prefill testleri tamamlandi.

- 2026-03-10: CustomerDetail ve PolicyDetail reminder hizli aksiyonlari ile Faz 15 reminder operasyon kapsami genisletildi.

- 2026-03-10: CommunicationCenter reminder context aksiyonlari ve testleri tamamlandi.

- 2026-03-10: Faz 15 reminder aux operatorlugu presetler ve ozet kartlari ile tamamlandi.

- 2026-03-10: Faz 15 kapandi. Faz 16'ya gecis tamamlandi; kapanis/verify turu baslatildi.


- 2026-03-10: Faz 15 icin AuxWorkbench reminder sayfa testi eklendi; reminder aux presetleri, ozet kartlari ve Done mutation kontrati test ile sabitlendi.

## 2026-03-12 Faz 41 Baslangic Notu
- [x] Reports runtime export format normalize akisina MIME alias ve `xlsb` destegi eklenecek backlog olarak secildi.
- [x] Locale-aware tabular title fallback ve reporting filter normalize hardening ayni faz altina alindi.
- [x] Payment report branch-policy lookup icin request-scope cache hedefi netlestirildi.

## 2026-03-12 Faz 41 Kapanis Notu
- [x] `reports_runtime.normalize_export_format(...)` MIME aliaslari ve `xlsb` destegi ile genisletildi.
- [x] `build_tabular_download_response(...)` tam locale -> base locale -> `en` fallback sirasi ile sertlestirildi.
- [x] `reporting.normalize_report_filters(...)` nullish string degerlerini dislayacak sekilde sertlestirildi.
- [x] `_policy_names_for_branch(...)` ayni request icinde cache kullanir hale getirildi.
- [x] Faz 41 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 42 Kapanis Notu
- [x] `report_exports.REPORT_TITLES` communication/reconciliation/claims operations raporlarini da kapsar hale getirildi.
- [x] `build_report_title(...)` tam locale -> base locale -> `en` fallback sirasi ile sertlestirildi.
- [x] `scheduled_reports` format normalize akisi summary, config normalize ve dispatch adimlarinda ortak helper ile tek kaynaga baglandi.
- [x] Faz 42 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 43 Kapanis Notu
- [x] `list_exports.build_screen_export_payload(...)` invalid JSON query icin bos payload fallback'i ile sertlestirildi.
- [x] `list_exports._localize(...)` tam locale -> base locale -> `en` fallback sirasi ile hizalandi.
- [x] `build_tabular_payload_export_response(...)` invalid JSON durumunda guvenli varsayilan payload ile calisir hale getirildi.
- [x] Faz 43 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 44 Kapanis Notu
- [x] `api/list_exports._normalize_permission_doctypes(...)` comma-separated string girdileri destekler hale getirildi.
- [x] Invalid permission doctype JSON fallback davranisi patlamadan calisacak sekilde sertlestirildi.
- [x] Permission doctype listesi tekrar eden girdileri tekillestirir hale getirildi.
- [x] Faz 44 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 45 Kapanis Notu
- [x] Issue: List Export Permission Contract Hardening acildi.
- [x] `export_tabular_payload(...)` en az bir permission doctype zorunlulugu ile sertlestirildi.
- [x] Bos izin listesi durumunda export akisi kontrollu hata verir hale getirildi.
- [x] Faz 45 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 46 Kapanis Notu
- [x] Issue: Report Payload Limit Contract Hardening acildi.
- [x] `report_registry.build_report_payload(...)` limit normalize akisi `cint` tabanli hale getirildi.
- [x] Non-numeric ve string limit girdileri icin kontrat test ile sabitlendi.
- [x] Faz 46 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 47-51 Kapanis Notu
- [x] Issue: Tabular Export Column Inference ile kolon listesi verilmediginde row anahtarlarindan kolon cikarimi eklendi.
- [x] Issue: Tabular Export Column Deduplication ile kolon trim ve duplicate temizligi eklendi.
- [x] Issue: Tabular Export Filter Shape Hardening ile dict-disindaki filter degerleri bos filtreye dusuruldu.
- [x] Issue: Screen Export Query Shape Hardening ile invalid `filters` / `or_filters` shape'leri kontrollu sekilde dislandi.
- [x] Issue: Tabular Export Row Collection Hardening ile list/tuple disindaki row payload'lari bos row setine dusuruldu.
- [x] Faz 47-51 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 52-61 Kapanis Notu
- [x] Issue: Tabular Export Title Normalize ile bos title degeri `export_key` fallback'ine baglandi.
- [x] Issue: Tabular Export Column String Input ile comma-separated kolon girdisi desteklendi.
- [x] Issue: Tabular Export JSON Filter Coercion ile JSON string filtreler dict'e donusturuldu.
- [x] Issue: Screen Export JSON Filter Coercion ile screen export `filters` / `or_filters` icin JSON string parse destegi eklendi.
- [x] Issue: Dashboard Row Payload Guard ve Dashboard Row Shape Guard ile fetcher payload/row kontrati sertlestirildi.
- [x] Issue: Boolean Formatter Token Expansion ile `on` / `evet` gibi tokenler desteklendi.
- [x] Issue: Payload Dict Serialize Fallback ile `frappe.as_json(...)` hatasinda string fallback eklendi.
- [x] Faz 52-61 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 62-71 Kapanis Notu
- [x] Issue: Report Download Full Locale ile `build_report_download_response(...)` tam locale davranisina cekildi.
- [x] Issue: Tabular Title Trim ve Localized Title Trim ile bos/whitespace title fallback davranisi sertlestirildi.
- [x] Issue: Download Payload Coercion ile columns/rows/filters shape guard eklendi.
- [x] Issue: Scheduled Config Parse Hardening ile invalid ve non-dict JSON config bos payload'a dusuruldu.
- [x] Issue: Export Key Fallback ve Report Key Trim ile filename/title helper'lari trim/fallback davranisina hizalandi.
- [x] Faz 62-71 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 72-81 Kapanis Notu
- [x] Issue: Report Export Filename Trim ve Report Title Locale Trim issue'lari tamamlandi.
- [x] Issue: PDF/XLSX Render Input Coercion ile title/columns/rows/filters shape guard eklendi.
- [x] Issue: Workbook Payload Hardening ile XLSX satir/sutun yazimi yalnizca gecerli kolon ve row seti uzerinden calisir hale getirildi.
- [x] Faz 72-81 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 82-106 Kapanis Notu
- [x] Issue: Scheduled Report Recipient Normalize, Filter Coercion, Frequency/Channel Normalize ve Schedule Clamp issue serisi tamamlandi.
- [x] Issue: Scheduled Dispatch Recipient/Filter Normalize ile dispatch akisinda string recipients ve JSON filters desteklendi.
- [x] Issue: Report Export/Runtime String Column ve JSON Filter Coercion issue serisi tamamlandi.
- [x] Faz 82-106 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 107-126 Kapanis Notu
- [x] Issue: Scheduled Report Locale Persistence, Last Status Normalize ve Last Summary JSON Coercion issue serisi tamamlandi.
- [x] Issue: Scheduled Config Load/Save Report Key Trim ve Dispatch Locale-aware Title davranisi tamamlandi.
- [x] Issue: Report Export/Runtime Mapping Row Coercion, Safe Title Trim ve Safe Filter Build kontratlari tamamlandi.
- [x] Faz 107-126 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 127-146 Kapanis Notu
- [x] Issue: Scheduled Report Config Sanitize on Load/Save ve Soft Runtime Normalize issue serisi tamamlandi.
- [x] Issue: Scheduled Dispatch Locale-aware XLSX/PDF Render davranisi tamamlandi.
- [x] Issue: Reports Runtime Report Key Trim ve Export Key Fallback sertlestirmesi tamamlandi.
- [x] Faz 127-146 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 147-166 Kapanis Notu
- [x] Issue: Reports API Filter/Index Coercion ve Summary Shape Guard issue serisi tamamlandi.
- [x] Issue: Report Download Response Payload Guard ve Scheduled Report API parity kontratlari tamamlandi.
- [x] Kaldigimiz yer `Faz 167`; sonraki odak export/list ortak normalize helper konsolidasyonu veya yeni API hardening blogu.
- [x] Faz 147-166 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 167-186 Kapanis Notu
- [x] Issue: Reports API Summary Item Normalize ve Total Guard issue serisi tamamlandi.
- [x] Issue: Download payload content-type, filecontent ve filename-extension fallback kontratlari tamamlandi.
- [x] Kaldigimiz yer `Faz 187`; sonraki odak export-list-report ortak normalize helper konsolidasyonu.
- [x] Faz 167-186 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 187-206 Kapanis Notu
- [x] Issue: Export Payload Utils ortak helper katmani olusturuldu.
- [x] Issue: Reports Runtime, Report Exports, Scheduled Reports ve Reports API tekrar eden normalize mantigi tek kaynaga cekildi.
- [x] Kaldigimiz yer `Faz 207`; sonraki odak list export katmanina ortak helper gecisi veya yeni reporting API hardening blogu.
- [x] Faz 187-206 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 207-226 Kapanis Notu
- [x] Issue: List Export ortak normalize helper gecisi tamamlandi.
- [x] Issue: List export API limit ve permission_doctype normalize akisi ortak helper ile hizalandi.
- [x] Sprint plandaki tarihsel acik kutular gercek durumla temizlendi; aktif odak `Faz 227` olarak guncellendi.
- [x] Faz 207-226 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 227-246 Kapanis Notu
- [x] Issue: List export API screen payload guard kontratlari tamamlandi.
- [x] Issue: List export download payload content-type/filecontent fallback kontratlari tamamlandi.
- [x] Kaldigimiz yer `Faz 247`; sonraki odak reporting API hardening veya roadmap/backlog sadeleştirme turu.
- [x] Faz 227-246 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 247-266 Kapanis Notu
- [x] Issue: Reports API getter/export payload shape guard kontratlari tamamlandi.
- [x] Issue: Scheduled report mutation response parity ve numeric clamp kontratlari tamamlandi.
- [x] Kaldigimiz yer `Faz 267`; sonraki odak roadmap-backlog sadeleştirme veya yeni release hardening blogu.
- [x] Faz 247-266 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 267-286 Kapanis Notu
- [x] Issue: Dalga 1 aktif durum blogu sadeleştirildi.
- [x] Issue: Plan dosyalari arasinda aktif faz/sonraki hamle anlatimi tek formata cekildi.
- [x] Kaldigimiz yer `Faz 287`; sonraki odak yeni release hardening blogu veya plan arsivleme turu.
- [x] Faz 267-286 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 287-306 Kapanis Notu
- [x] Issue: Dalga 1 ust blokta arsiv okuma kurali ortaklastirildi.
- [x] Issue: Aktif odak tek satirli ifade ile `Faz 307`e tasindi.
- [x] Kaldigimiz yer `Faz 307`; sonraki odak release hardening blogu tanimi.
- [x] Faz 287-306 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 307-326 Kapanis Notu
- [x] Issue: Release hardening blogu tanimlandi.
- [x] Issue: Checklist, kabul kriteri ve sonraki teknik bloklar netlestirildi.
- [x] Kaldigimiz yer `Faz 327`; sonraki odak release hardening checklist uygulama blogu.
- [x] Faz 307-326 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 327-346 Kapanis Notu
- [x] Issue: Release Hardening Checklist Uygulamasi acildi.
- [x] Reports API ve List Export API download response guard'lari ortak helper katmanina cekildi.
- [x] Reports runtime scheduled summary ve save/remove mutation fallback kontratlari sertlestirildi.
- [x] Export payload utils ve reports runtime test kontratlari genisletildi.
- [x] Kaldigimiz yer `Faz 347`; sonraki odak release smoke checklist taslagi ve final parity turu.
- [x] Faz 327-346 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 347-366 Kapanis Notu
- [x] Issue: Release Smoke Checklist Draft acildi.
- [x] Minimum release smoke checklist ayri plan dosyasina tasindi.
- [x] Auth gate, reports payload, report export, list export, scheduled reports ve lokalizasyon kritik basliklari tek checklist'te toplandi.
- [x] Kaldigimiz yer `Faz 367`; sonraki odak final API-export parity turu.
- [x] Faz 347-366 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 367-371 Kapanis Notu
- [x] Issue: Locale Normalize Helper tamamlandi.
- [x] Issue: Export Format Helper Parity tamamlandi.
- [x] Issue: Scheduled Summary Channel Alias Hardening tamamlandi.
- [x] Issue: Scheduled Mutation Channel Alias Hardening tamamlandi.
- [x] Issue: Scheduled Config Format Parity tamamlandi.
- [x] `coerce_locale(...)` ve `coerce_export_format(...)` ortak helper'lari eklendi.
- [x] `reports_runtime` scheduled summary ve mutation normalize davranisi `delivery_channel`, locale ve format alias kapsami ile sertlestirildi.
- [x] Kaldigimiz yer `Faz 372`; sonraki odak release final parity ve kapanis notu.
- [x] Faz 367-371 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## 2026-03-12 Faz 372 Kapanis Notu
- [x] Issue: Release Final Parity ve Kapanis Notu tamamlandi.
- [x] Aktif release checklist ve parity bloklari birlikte kontrol edildi.
- [x] Arsivdeki acik kutularin tarihsel not oldugu teyit edildi; aktif takipte acik madde birakilmadi.
- [x] Durum kapanisa cekildi; sonraki adim yeni issue secimi veya yeni uygulama dalgasi olarak sabitlendi.
- [x] Faz 372 kapanis kayitlari `ROADMAP.md`, `.plan/README.md`, `.plan/backlog.md`, `.plan/sprint-plan.md` ile senkronlandi.

## Arsiv Notu
- Bu dokumanin alt kisimlari tarihsel dalga notlaridir.
- Guncel yon bilgisi icin sadece ustteki `Durum` blogu kullanilmalidir.
