# Acentem Takipte - Yol Haritasï¿½ (v1)

**Referans:** 26 Mayï¿½s 2026 tarihinde yapï¿½lan kalite ve gï¿½venlik incelemesi ï¿½ï¿½ktï¿½larï¿½na gï¿½re hazï¿½rlanmï¿½ï¿½tï¿½r.

## Amaï¿½
Repoyu endï¿½stri standartlarï¿½nda gï¿½venli, ï¿½lï¿½eklenebilir ve sï¿½rdï¿½rï¿½lebilir hale getirmek; ï¿½nce gï¿½venlik ve bï¿½tï¿½nlï¿½k risklerini kapatmak, ardï¿½ndan mimari/performans/deneyim iyileï¿½tirmeleri yapmak.

## Uygulama Durumu (Gï¿½ncel)

### Son Durak / Kaldï¿½ï¿½ï¿½m Yer
- **Aktif dalga:** **Dalga 1 ï¿½ Gï¿½venlik, Yetkilendirme ve Eriï¿½im Kontratlarï¿½**
- **Mevcut odak:** **Faz 4 Customer 360 ve Productized Policy Foundation; backend Customer 360 payload service + API endpoint iskeleti tamamlandi; CustomerDetail.vue tek payload entegrasyonu, odeme/hasar/yenileme bloklari, segment/skor, capraz satis ve related customer ilk turu alindi; `AT Customer Relation` ve `AT Insured Asset` ile ilk baglanti veri modeli acildi; relation/asset akislarinin test kapsami eklendi; segment/skor backend kurali aktif police, premium, hasar, geciken odeme ve iptal gecmisi ile genisletildi; yeni skor alanlari UI kartlarinda gorunur hale getirildi; sonraki adim relation/asset delete akisini acmak**.

### Tamamlanan Modï¿½l (Bu Tur)
- `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_kpis.py`
  - `period_comparison` tabanlï¿½ karï¿½ï¿½laï¿½tï¿½rma penceresi ï¿½ï¿½zï¿½mï¿½
  - KPI kartlarï¿½ iï¿½in `comparison.cards` ve `comparison.delta` ï¿½retimi
- `acentem_takipte/acentem_takipte/api/dashboard.py`
  - `get_dashboard_kpis` iï¿½inde `period_comparison`, `compare_from_date`, `compare_to_date` geï¿½iï¿½i
  - boï¿½ payload kontratï¿½na `comparison` alanï¿½
- `acentem_takipte/acentem_takipte/tests/test_dashboard_contract_smoke.py`
  - `comparison` alanï¿½ kontrat testi
- `acentem_takipte/acentem_takipte/tests/test_dashboard_wave4_builders.py`
  - builder seviyesinde previous-period delta testi
- `frontend/src/pages/Dashboard.vue`
  - KPI kartlarï¿½na `period_comparison` ï¿½aï¿½rï¿½sï¿½ ve comparison hint fallback baï¿½landï¿½
- `acentem_takipte/acentem_takipte/services/report_registry.py`
  - `agent_performance` raporu iï¿½in scorecard kolonlarï¿½ geniï¿½letildi
- `acentem_takipte/acentem_takipte/services/reporting.py`
  - ï¿½alï¿½ï¿½an bazlï¿½ karne iï¿½in dï¿½nï¿½ï¿½ï¿½m/yenileme baï¿½arï¿½ metrikleri eklendi
- `frontend/src/pages/Reports.vue`
  - yeni karne kolon etiketleri ve yï¿½zde formatlamasï¿½
- `acentem_takipte/acentem_takipte/tests/test_reporting_service.py`
  - agent performance SQL sï¿½zleï¿½mesi geniï¿½letildi
- `acentem_takipte/acentem_takipte/tests/test_report_registry.py`
  - report registry kolon kontratï¿½ testi
- `acentem_takipte/acentem_takipte/services/reporting.py`
  - mï¿½ï¿½teri segmentasyonu iï¿½in claim geï¿½miï¿½i ve sadakat segmenti kï¿½rï¿½lï¿½mlarï¿½
- `frontend/src/pages/Reports.vue`
  - segmentasyon raporu iï¿½in temsilci filtresi ve yeni kolon etiketleri
  - agent performance ve customer segmentation iï¿½in rapor-ï¿½zel summary kartlarï¿½
- `acentem_takipte/acentem_takipte/api/reports.py`
  - `get_scheduled_report_configs`
  - `save_scheduled_report_config`
  - `remove_scheduled_report_config`
  - `_build_report_payload_safe` hata sarma
- `frontend/src/pages/Reports.vue`
  - System Manager / Administrator iï¿½in ï¿½Zamanlanmï¿½ï¿½ Raporlarï¿½ alanï¿½
  - `scheduledReports`, `scheduledLoading`, `scheduledRunLoading` stateï¿½leri
  - listelendirme, manuel tetikleme, hata gï¿½sterimi
- `frontend/src/components/reports/ScheduledReportsManager.vue`
  - create/update/delete form akï¿½ï¿½ï¿½
  - client-side validation ve silme onayï¿½
- `frontend/src/components/reports/ScheduledReportsManager.test.js`
  - validation, save emit ve delete confirmation testleri
- `acentem_takipte/acentem_takipte/tests/test_reports_scheduled_configs.py`
  - endpoint summary, CRUD ï¿½aï¿½rï¿½larï¿½ ve normalizasyon testleri
- `acentem_takipte/acentem_takipte/services/scheduled_reports.py`
  - outbox queue sonucu iï¿½in `queued/failed/outboxes` ï¿½zeti
- `acentem_takipte/acentem_takipte/tasks.py`
  - queued scheduled report outbox kayï¿½tlarï¿½nï¿½ aynï¿½ job iï¿½inde dispatch etme
- `acentem_takipte/acentem_takipte/tests/test_scheduled_reports.py`
  - outbox queue baï¿½arï¿½/baï¿½arï¿½sï¿½zlï¿½k ï¿½zet testleri
- `acentem_takipte/acentem_takipte/tests/test_tasks_scheduled_reports.py`
  - scheduled job iï¿½i outbox dispatch ï¿½zeti testi
- `acentem_takipte/acentem_takipte/tests/test_reports_api.py`
  - getter auth/permission zinciri `build_report_payload` sï¿½zleï¿½mesine taï¿½ï¿½ndï¿½
  - `agent_performance` ve `customer_segmentation` export contract testleri eklendi
  - `_build_report_payload_safe` limit normalizasyonu test altï¿½na alï¿½ndï¿½
- `acentem_takipte/acentem_takipte/api/dashboard.py`
  - `_get_scoped_policy_names(...)` request-scope cache helper'i eklendi
  - renewal card, renewal preview ve renewal bucket akï¿½ï¿½larï¿½ndaki tekrar eden `AT Policy` name sorgularï¿½ tek cache altï¿½nda toplandï¿½
  - `_get_request_cache_bucket(...)` ile cards, trend, renewal bucket ve reconciliation summary hesaplarï¿½ request-cache altï¿½na alï¿½ndï¿½

### En Son Bï¿½rakï¿½lan Nokta (Sonraki Hamle)
- Dalga 7 kullanï¿½cï¿½ kararï¿½yla tamamlandï¿½ olarak kapatï¿½ldï¿½
- Dalga 1 iï¿½inde Gorev 1.1 rol/oturum dokï¿½mantasyonu ve regression checklist tamamlandï¿½
- `reports.py`, `quick_create.py`, `admin_jobs.py`, `communication.py`, `accounting.py`, `seed.py`, `smoke.py` auth kontrat matrisi ï¿½ï¿½karï¿½ldï¿½ ve helper diline hizalandï¿½
- Ortak karar:
  - read -> `assert_read_access`
  - mutation -> `assert_mutation_access`
  - doc-level -> `assert_doc_permission`
  - demo/smoke -> feature-flag + create/delete ayrï¿½mï¿½
- Faz 1.3 ilk uygulama dilimi tamamlandï¿½:
  - `utils/logging.py` iï¿½ine `build_redacted_log_message(...)` ve `log_redacted_error(...)` eklendi
  - hassas anahtar sï¿½zlï¿½ï¿½ï¿½ recipient/policy/tax varyasyonlarï¿½yla geniï¿½letildi
  - `api/reports.py`, `communication.py`, `services/scheduled_reports.py`, `accounting.py` hata loglarï¿½ redacted helper'a taï¿½ï¿½ndï¿½
  - `tests/test_logging_redaction.py` ve `tests/test_reports_api.py` kontratï¿½ geniï¿½letildi
- Faz 1.3 ikinci uygulama dilimi tamamlandï¿½:
  - `notifications.py`, `doctype/at_claim/at_claim.py`, `doctype/at_policy/at_policy.py`, `doctype/at_renewal_task/at_renewal_task.py` notification/controller hata zinciri redacted helper'a taï¿½ï¿½ndï¿½
  - `providers/whatsapp_meta.py` provider dispatch hata logu structured redaction formatï¿½na ï¿½ekildi
  - operasyonel PII taï¿½ï¿½yabilecek ham `frappe.log_error(...)` yï¿½zeyleri temizlendi
- Faz 1.3 ï¿½ï¿½ï¿½ncï¿½ uygulama dilimi tamamlandï¿½:
  - `api/dashboard.py` access log fetch error redacted helper'a taï¿½ï¿½ndï¿½
  - `doctype/at_customer/at_customer.py` customer access log error redacted helper'a taï¿½ï¿½ndï¿½
  - `utils/assets.py` teknik altyapï¿½ istisnasï¿½ olarak ayrï¿½ldï¿½
- Faz 1.3 plan seviyesinde kapatï¿½ldï¿½
- Faz 2.1 ilk uygulama dilimi tamamlandï¿½:
  - `dashboard.py` iï¿½inde request-scope policy cache eklendi
  - renewal kartlarï¿½, renewal preview ve renewal bucket hesaplarï¿½nda tekrar eden policy lookup azaltï¿½ldï¿½
- Faz 2.1 ikinci uygulama dilimi tamamlandï¿½:
  - cards, commission trend, renewal bucket ve reconciliation summary hesaplarï¿½ request-cache ile tekrar kullanï¿½lï¿½r hale getirildi
- Faz 2.1 sorgu envanteri ï¿½ï¿½karï¿½ldï¿½:
  - sï¿½cak tablolar: `AT Policy`, `AT Payment`, `AT Renewal Task`, `AT Claim`, `AT Lead`, `AT Reconciliation Item`
  - composite index adaylarï¿½ belirlendi
  - kalan maliyet odaï¿½ï¿½ raw SQL aggregate ve preview sorgularï¿½ olarak netleï¿½ti
- Faz 2.1 ï¿½ï¿½ï¿½ncï¿½ uygulama dilimi tamamlandï¿½:
  - `acentem_takipte/patches.txt`
  - `acentem_takipte/acentem_takipte/patches/v2026_03_09_add_dashboard_hot_path_indexes.py`
  - ilk hot-path composite index seti migration patch'i olarak eklendi
- Faz 2.1 dï¿½rdï¿½ncï¿½ uygulama dilimi tamamlandï¿½:
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_kpis.py`
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/tab_payload.py`
  - tekrar eden `where/value` ï¿½retimleri yerel cache ile sadeleï¿½tirildi
- Faz 2.1 beï¿½inci uygulama dilimi tamamlandï¿½:
  - `acentem_takipte/patches.txt`
  - `acentem_takipte/acentem_takipte/patches/v2026_03_09_add_dashboard_secondary_indexes.py`
  - insurance company, policy/status ve reconciliation desenleri icin ikinci index patch'i eklendi
- Faz 2.1 plan seviyesinde kapatï¿½ldï¿½:
  - request-cache
  - where/value cache
  - iki asamali dashboard index patch seti
- Faz 2.2 ilk envanter cikarildi:
  - `tasks.py` icinde enqueue edilen ve senkron kalan agir bloklar ayrildi
  - `hooks.py` icinde scheduler/doc-event tetikleyici frekanslari ve fan-out riski notlandi
- Faz 2.2 ilk refaktor tamamlandï¿½:
  - `acentem_takipte/acentem_takipte/tasks.py`
  - scheduled report outbox dispatch ayni job icinden cikarilip ayri queue fan-out modeline tasindi
  - `outbox_enqueued` ve `outbox_queue_failed` ozeti eklendi
- Faz 2.2 ikinci refaktor tamamlandï¿½:
  - `acentem_takipte/acentem_takipte/accounting.py`
  - `sync_doc_event` inline muhasebe senkronundan queue + debounce modeline tasindi
  - ayni belge icin kisa sureli tekrar update'ler tek job'a indirildi
- Faz 2.2 plan seviyesinde kapatï¿½ldï¿½:
  - scheduled reports fan-out
  - accounting doc-event debounce
  - queue/idempotency riskleri ilk turda sertlestirildi
- Faz 2.3 ilk envanter baslatildi:
  - `frontend/src/pages/Reports.vue`
  - `frontend/src/pages/Dashboard.vue`
- Faz 2.3 ilk uygulama dilimi tamamlandï¿½:
  - `frontend/src/pages/Dashboard.vue`
  - tab/range/branch degisimleri `300ms` debounced reload kapisina toplandi
  - manuel refresh ve create-lead sonrasi yenileme anlik birakildi
- Faz 2.3 ikinci uygulama dilimi tamamlandï¿½:
  - `frontend/src/pages/Reports.vue`
  - branch ve report key degisimi `300ms` debounce ile toplandi
  - manuel apply/refresh/export akislarina dokunulmadi
- Faz 2.3 plan seviyesinde kapatï¿½ldï¿½
- Faz 3.1 ilk uygulama dilimi tamamlandï¿½:
  - `acentem_takipte/acentem_takipte/services/quick_create.py`
  - `create_quick_customer`, `create_quick_lead`, `create_quick_policy` persistence bolumu service katmanina tasindi
  - `api/quick_create.py` bu akislar icin delegation modeline cekildi
- Faz 3.1 ikinci uygulama dilimi tamamlandï¿½:
  - `claim`, `payment`, `renewal_task` quick create akislarinin persistence bolumu de `services/quick_create.py` altina tasindi
  - ilk alti operasyonel quick create endpoint'i service delegation modeline gecmis oldu
- Faz 3.1 ï¿½ï¿½ï¿½ncï¿½ uygulama dilimi tamamlandï¿½:
  - `services/quick_create.py` icinde ortak `_insert_doc(...)` helper'i eklendi
  - `update_quick_aux_record` persistence bolumu de service katmanina devredildi
- Faz 3.1 ara karari yazildi:
  - request parsing, field normalization ve link validation API katmaninda kalacak
  - persistence ve sonuc sozlesmesi service katmaninda kalacak
  - sonraki extraction adaylari: `api/reports.py`, `api/admin_jobs.py`, `api/accounting.py`
- Faz 3.1 dorduncu uygulama dilimi tamamlandï¿½:
  - `acentem_takipte/acentem_takipte/services/reports_runtime.py`
  - `api/reports.py` icindeki payload build/export/config orchestration service katmanina tasindi
- Faz 3.1 besinci uygulama dilimi tamamlandï¿½:
  - `acentem_takipte/acentem_takipte/services/admin_jobs.py`
  - `api/admin_jobs.py` icindeki action routing / dispatch mapping service katmanina tasindi
- Faz 3.1 altinci uygulama dilimi tamamlandï¿½:
  - `acentem_takipte/acentem_takipte/services/accounting_runtime.py`
  - `api/accounting.py` icindeki reconciliation workbench read orchestration service katmanina tasindi
- Faz 3.1 plan seviyesinde kapatï¿½ldï¿½:
  - quick_create
  - reports runtime
  - admin_jobs dispatch
  - accounting runtime
  extraction dilimleri tamamlandi
- Faz 3.2 ilk envanter baslatildi:
  - report getter/export endpoint ciftleri
  - admin/accounting mutation access wrapper kaliplari
  - quick_create normalization yardimcilari
- Faz 3.2 ilk uygulama dilimi tamamlandï¿½:
  - `api/reports.py`
  - report getter/export endpoint ciftleri ortak helper altinda toplandi
- Faz 3.2 ikinci uygulama dilimi tamamlandï¿½:
  - `acentem_takipte/acentem_takipte/api/mutation_access.py`
  - `api/admin_jobs.py` ve `api/accounting.py` icindeki write-mutation wrapper deseni ortak helper altinda toplandi
- Faz 3.2 karar notu yazildi:
  - `quick_create.py` normalization yardimcilari request-contract ve doctype-ozel validation bagimliligi nedeniyle API katmaninda birakildi
- Faz 3.2 plan seviyesinde kapatï¿½ldï¿½
- Faz 3.3 ilk uygulama dilimi tamamlandï¿½:
  - `acentem_takipte/acentem_takipte/utils/financials.py`
  - `AT Offer` ve `AT Policy` finans tutarlilik dogrulamasi ortak helper altina tasindi
- Faz 3.3 ikinci uygulama dilimi tamamlandï¿½:
  - `acentem_takipte/acentem_takipte/utils/commissions.py`
  - `commission_amount` kanonik alan olarak sabitlendi
  - Python tarafindaki legacy `commission` fallback'leri helper arkasina alindi
  - `accounting.py` ve `doctype/at_offer/at_offer.py` bu helper'a hizalandi
- Faz 3.3 ucuncu uygulama dilimi tamamlandï¿½:
  - `utils/commissions.py` altina `commission_sql_expr(...)` eklendi
  - `api/dashboard.py`, `api/dashboard_v2/queries_kpis.py`, `services/reporting.py` icindeki sicak SQL fallback ifadeleri ortak helper'a tasindi
- Faz 3.3 dorduncu uygulama dilimi tamamlandï¿½:
  - `api/seed.py` ve `api/smoke.py` demo payload'lari `commission_amount` alanina cekildi
  - `doctype/at_policy_endorsement/at_policy_endorsement.py` legacy `commission` payload'ini kabul etmeye devam ederken policy uzerinde aynalama helper'i ile normalize edildi
- Faz 3.3 besinci uygulama dilimi tamamlandï¿½:
  - `utils/statuses.py` altinda lead/policy/claim/renewal/accounting icin `VALID` sabitleri genisletildi
  - `api/quick_create.py` icindeki literal status setleri merkezi enum sabitlerine baglandi
- Faz 3.3 altinci uygulama dilimi tamamlandï¿½:
  - `utils/notes.py` altina `normalize_note_text(...)` eklendi
  - `api/quick_create.py` icindeki tekrar eden notes trim/none deseni ortak helper'a tasindi
  - `accounting.py` icindeki reconciliation notes uzunluk kisiti ayni helper ile normalize edildi
- Faz 3.3 plan seviyesinde kapatï¿½ldï¿½:
  - finans, commission, status ve notes alanlarindaki tekrar eden domain kurallari ortak helper/sabit altina toplandi
  - bilincli istisna: DocType JSON seviyesindeki legacy `commission` alanï¿½ backward compatibility icin korunuyor
- Faz 3.4 ilk uygulama dilimi tamamlandï¿½:
  - `renewal/service.py`, `renewal/pipeline.py`, `renewal/telemetry.py` eklendi
  - `tasks.py` icindeki renewal task create job orchestration'i pipeline katmanina tasindi
  - `doctype/at_renewal_task/at_renewal_task.py` icindeki unique key ve notification side-effect'i renewal service/pipeline altina cekildi
- Faz 3.4 ikinci uygulama dilimi tamamlandï¿½:
  - stale renewal task remediation servisi ve job'u eklendi
  - `AT Renewal Task` status transition guard'i merkezilestirildi
  - `admin_jobs.py` ve `hooks.py` stale remediation job'unu gorebilir/tetikleyebilir hale geldi
- Faz 3.4 ucuncu uygulama dilimi tamamlandï¿½:
  - yeni `AT Renewal Outcome` DocType eklendi
  - `AT Renewal Task` uzerine `outcome_record` baglantisi eklendi
  - terminal renewal task statulerinde outcome sync iskeleti eklendi
- Dil/locale uyumluluk notu:
  - DocType JSON field label ve description alanlarinda mevcut uygulama deseni korunacak
  - `Kullanï¿½cï¿½ Notu` / `Sistem Notu` gibi mevcut Tï¿½rkï¿½e alan adlari yeni DocType'larda ayni sekilde devam edecek
  - backend exception ve teknik mesajlar modï¿½lï¿½n mevcut dili neyse onunla tutarlï¿½ kalacak; bozuk encoding (`ï¿½`, `ï¿½`) kabul edilmeyecek
- Sï¿½radaki iï¿½: lost reason / competitor alanlarini UI ve job akislariyla beslemek, ardindan retention metriï¿½ini dashboard'a baï¿½lamak
### Faz 16 Smoke Checklist (Aktif Hazï¿½rlï¿½k)
- `Reports.vue`
  - policy list, payment status, renewal performance, claim loss ratio ekran yï¿½klenmesi
  - `agent_performance` ve `customer_segmentation` summary kartlarï¿½nï¿½n veriyle aï¿½ï¿½lmasï¿½
  - scheduled reports admin alanï¿½nï¿½n yalnï¿½zca `System Manager` / `Administrator` iï¿½in gï¿½rï¿½nmesi
- `api/reports.py`
  - tï¿½m report getter endpoint'lerinde `report_key`, `columns`, `rows`, `filters` sï¿½zleï¿½mesi korunmalï¿½
  - export endpoint'lerinde `filename`, `filecontent`, `type`, `content_type` download sï¿½zleï¿½mesi korunmalï¿½
- `services/scheduled_reports.py` + `tasks.py`
  - scheduled run sonrasï¿½ outbox ï¿½zet alanlarï¿½ (`queued`, `failed`, `outbox_sent`, `outbox_failed`) beklenen payload ile dï¿½nmeli
- `api/dashboard_v2/queries_kpis.py` + `frontend/src/pages/Dashboard.vue`
  - KPI comparison kartlarï¿½ previous-period verisini bozmadan gï¿½stermeli

### Faz 16 Manuel Doï¿½rulama Notlarï¿½
- Normal operasyon kullanï¿½cï¿½sï¿½ ile `/at` altï¿½nda rapor ekranï¿½ aï¿½ï¿½lï¿½r:
  - rapor filtresi ï¿½alï¿½ï¿½ï¿½r
  - tablo yï¿½klenir
  - export aksiyonu gï¿½rï¿½nï¿½r
  - scheduled report admin paneli gï¿½rï¿½nmez
- Admin kullanï¿½cï¿½ ile `/at` altï¿½nda rapor ekranï¿½ aï¿½ï¿½lï¿½r:
  - scheduled report listesi gï¿½rï¿½nï¿½r
  - create/update/delete akï¿½ï¿½ï¿½ form seviyesinde doï¿½rulanï¿½r
  - manual run aksiyonu hata vermeden summary yeniler
- Dashboard ekranï¿½nda tarih aralï¿½ï¿½ï¿½ deï¿½iï¿½tiï¿½inde:
  - comparison hint metni doï¿½ru moda gï¿½re deï¿½iï¿½ir
  - KPI kartlarï¿½ boï¿½ veya kï¿½rï¿½k state'e dï¿½ï¿½mez

### Faz 16 Smoke Bulgularï¿½ (09 Mart 2026)
- `http://localhost:8080/at`
  - anonim kullanï¿½cï¿½ iï¿½in `301 -> /login?redirect-to=/at`
  - sonuï¿½: route korumasï¿½ aktif, authenticated smoke gerekir
- `get_session_context`
  - anonim ï¿½aï¿½rï¿½da `403 FORBIDDEN`
  - sonuï¿½: session endpoint guest eriï¿½imine kapalï¿½
- `get_policy_list_report`
  - anonim ï¿½aï¿½rï¿½da `403 FORBIDDEN`
  - sonuï¿½: report endpoint auth korumasï¿½ aktif
- **Blokaj:** gerï¿½ek UI smoke akï¿½ï¿½ï¿½ iï¿½in giriï¿½ yapï¿½lmï¿½ï¿½ operasyon ve admin oturumu gerekiyor
- **Sonraki adï¿½m:** authenticated session ile checklist maddelerini uygulamak

### Faz 16 Test Koï¿½um Sï¿½rasï¿½
1. Backend sï¿½zleï¿½me testleri
   - `acentem_takipte/acentem_takipte/tests/test_reports_api.py`
   - `acentem_takipte/acentem_takipte/tests/test_reporting_service.py`
   - `acentem_takipte/acentem_takipte/tests/test_report_registry.py`
2. Scheduled report akï¿½ï¿½ï¿½
   - `acentem_takipte/acentem_takipte/tests/test_reports_scheduled_configs.py`
   - `acentem_takipte/acentem_takipte/tests/test_scheduled_reports.py`
   - `acentem_takipte/acentem_takipte/tests/test_tasks_scheduled_reports.py`
3. Dashboard karï¿½ï¿½laï¿½tï¿½rma regresyonu
   - `acentem_takipte/acentem_takipte/tests/test_dashboard_contract_smoke.py`
   - `acentem_takipte/acentem_takipte/tests/test_dashboard_wave4_builders.py`
4. Frontend bileï¿½en doï¿½rulamasï¿½
   - `frontend/src/components/reports/ScheduledReportsManager.test.js`
5. Son adï¿½m manuel smoke
   - `Reports.vue`
   - `Dashboard.vue`

### Faz 16 Kapanï¿½ï¿½ Kriteri
- Rapor endpoint sï¿½zleï¿½meleri backend testleriyle korunmuï¿½ olmalï¿½
- Scheduled reports admin gï¿½rï¿½nï¿½rlï¿½ï¿½ï¿½ ve outbox ï¿½zeti regression kapsamï¿½na alï¿½nmï¿½ï¿½ olmalï¿½
- Dashboard comparison ve rapor summary kartlarï¿½ manuel smoke listesinde doï¿½rulanmï¿½ï¿½ olmalï¿½
- Dalga 7 takip dosyalarï¿½nda aktif iï¿½ yerine kapanï¿½ï¿½ adï¿½mï¿½ gï¿½rï¿½nmeli

## Yol Haritasï¿½ (ï¿½ncelik Sï¿½rasï¿½na Gï¿½re)

### Faz 1 ï¿½ Gï¿½venlik ve Yetkilendirme ï¿½stikrarï¿½

#### 1.1 API yetkilendirme sï¿½zleï¿½mesini tekilleï¿½tir
- **Durum:** Plan
- **ï¿½ncelik:** Yï¿½ksek
- **Efor:** 12 saat
- **Kapsam:**
  - `acentem_takipte/api/security.py`
  - `acentem_takipte/api/session.py`
  - `acentem_takipte/api/communication.py`
  - `acentem_takipte/api/quick_create.py`
- **Amaï¿½:** Tï¿½m whitelisted endpoint'lerde
  - Kimlik doï¿½rulama (`Guest` reddi)
  - Rol/izin kontrolï¿½ (`doctype` + `permtype`)
  - Metot kï¿½sï¿½tlamasï¿½ (write-only iï¿½in POST)
  - Tutarlï¿½ hata/silindir/yanï¿½t formatï¿½
  uygulamak.
- **Kabul Kriterleri:**
  - `allow_guest=True` olmayan endpoint sayï¿½sï¿½ doï¿½rulanï¿½r.
  - Her mutasyon endpointinde en az bir action-level izin kontrolï¿½ olur.
  - ï¿½Sadece oturum aï¿½ï¿½kï¿½ kontrolï¿½ ile ï¿½doï¿½ru izne sahipï¿½ kontrolï¿½ net ayrï¿½lï¿½r.

#### 1.2 `ignore_permissions=True` kullanï¿½mï¿½nï¿½ gï¿½venli hale getir
- **Durum:** Plan
- **ï¿½ncelik:** Yï¿½ksek
- **Efor:** 10 saat
- **Kapsam:**
  - `acentem_takipte/api/quick_create.py`
  - `acentem_takipte/api/seed.py`
  - `acentem_takipte/api/smoke.py`
  - `acentem_takipte/doctype/*`
- **Amaï¿½:** `ignore_permissions=True` yalnï¿½zca kontrollï¿½, teknik zorunluluklï¿½ ve denetimli noktalarda kalmalï¿½.
- **Kabul Kriterleri:**
  - Her `ignore_permissions=True` satï¿½rï¿½ iï¿½in iï¿½ gerekï¿½esi ve gï¿½venlik kontrolï¿½ belgelenecek.
  - Gereksiz kullanï¿½m kaldï¿½rï¿½lï¿½r veya sistem izni ile deï¿½iï¿½tirilir.
  - Denetim notlarï¿½ ve kod yorumlarï¿½yla izlenebilirlik saï¿½lanï¿½r.

#### 1.3 Loglama redaksiyonunu zorunlu hale getir
- **Durum:** Tamamlandï¿½
- **ï¿½ncelik:** Yï¿½ksek
- **Efor:** 8 saat
- **Kapsam:**
  - `acentem_takipte/api/security.py`
  - backend servis loglama katmanï¿½
- **Amaï¿½:** TC kimlik no, poliï¿½e no gibi hassas alanlarï¿½n loglara yazï¿½lmamasï¿½.
- **Kabul Kriterleri:**
  - `tc_kimlik_no`, `policy_no`, `iban`, `telefon`, `email` alanlarï¿½ maskelenir.
  - Uygulanan redaksiyon iï¿½in test ve ï¿½rnek log kontrolï¿½ eklenir.

---

### Faz 2 ï¿½ Performans ve Sorgu Saï¿½lï¿½ï¿½ï¿½

#### 2.1 Dashboard ve yoï¿½un sorgularï¿½n profilini ï¿½ï¿½kar ve optimize et
- **Durum:** Tamamlandï¿½
- **ï¿½ncelik:** Yï¿½ksek
- **Efor:** 16 saat
- **Kapsam:**
  - `acentem_takipte/api/dashboard.py`
  - `acentem_takipte/api/dashboard_v2/queries_kpis.py`
  - `acentem_takipte/api/dashboard_v2/tab_payload.py`
- **Amaï¿½:** `frappe.db.sql` kullanï¿½lan kritik noktalarda
  - Filtre indeksleri
  - Sorgu tekrarï¿½nï¿½ azaltma
  - ï¿½nbellek stratejisi
  ile performans kazanï¿½mï¿½ saï¿½lamak.
- **Kabul Kriterleri:**
  - En az 5 kritik dashboard endpointi iï¿½in sorgu sayï¿½sï¿½ dï¿½ï¿½ï¿½rï¿½lï¿½r.
  - Bï¿½yï¿½k rapor sorgularï¿½ iï¿½in limit/offset ve index uyumu eklenir.
  - ï¿½lgili alanlar iï¿½in index listesi dokï¿½mante edilir.

#### 2.2 Arkaplan iï¿½lerini kuyruk stratejisine oturt
- **Durum:** Tamamlandï¿½
- **ï¿½ncelik:** Orta
- **Efor:** 8 saat
- **Kapsam:**
  - `acentem_takipte/tasks.py`
  - `hooks.py` scheduler
- **Amaï¿½:** Uzun sï¿½ren iï¿½lemler iï¿½in senkron iï¿½leme yerine enqueue standardï¿½nï¿½ artï¿½rmak.
- **Kabul Kriterleri:**
  - 2 snï¿½den uzun sï¿½ren iï¿½lemlerden en az biri queueï¿½ya alï¿½nï¿½r.
  - Job baï¿½ï¿½na idempotent davranï¿½ï¿½ ve hata logu eklenir.

#### 2.3 Frontend veri ï¿½aï¿½rï¿½larï¿½nï¿½ debounced hale getir
- **Durum:** Tamamlandï¿½
- **ï¿½ncelik:** Orta
- **Efor:** 6 saat
- **Kapsam:**
  - `frontend/src` iï¿½inde list filtreleme akï¿½ï¿½larï¿½
- **Amaï¿½:** Arama, filtre ve otomatik yenileme callï¿½larï¿½nï¿½ throttle/debounce etmek.
- **Kabul Kriterleri:**
  - UI'da arama inputuna her yazï¿½mda request patlamasï¿½ olmaz.
  - 300ms debounce ile en az bir ï¿½rnekte ï¿½lï¿½ï¿½lebilir istek azalï¿½ï¿½ï¿½.

---

### Faz 3 ï¿½ Mimari ve Kod Kalitesi

#### 3.1 Servis katmanï¿½ ve izin katmanï¿½nï¿½ ayï¿½r
- **Durum:** Plan
- **ï¿½ncelik:** Orta
- **Efor:** 14 saat
- **Kapsam:**
  - `acentem_takipte/api/quick_create.py`
  - `acentem_takipte/doctype/*`
  - Yeni: `acentem_takipte/services/*`
- **Amaï¿½:** API handlerï¿½ï¿½nï¿½ ï¿½HTTP + doï¿½rulamaï¿½ ile sï¿½nï¿½rlayï¿½p iï¿½ mantï¿½ï¿½ï¿½nï¿½ servislere taï¿½ï¿½mak.
- **Kabul Kriterleri:**
  - En az 3 endpoint iï¿½ mantï¿½ï¿½ï¿½ service katmanï¿½na taï¿½ï¿½nï¿½r.
  - Service fonksiyonlarï¿½ test edilebilir ve baï¿½ï¿½msï¿½z hale gelir.

#### 3.2 DRY ve gï¿½venli yardï¿½mcï¿½ katman
- **Durum:** Plan
- **ï¿½ncelik:** Orta
- **Efor:** 10 saat
- **Kapsam:**
  - `acentem_takipte/api/*` (auth/helper tekrarlarï¿½)
  - Yeni: `acentem_takipte/utils/permissions.py`
- **Amaï¿½:** Yetki, validasyon ve audit yardï¿½mcï¿½larï¿½nï¿½ tekilleï¿½tirerek tekrarlarï¿½ azaltmak.
- **Kabul Kriterleri:**
  - En az 5 endpointï¿½in ortak gï¿½venlik akï¿½ï¿½ï¿½ standart fonksiyona alï¿½nï¿½r.
  - Tekilleï¿½tirme sonrasï¿½ kod okunabilirliï¿½i artar, duplicate kontrolï¿½ azalï¿½r.

#### 3.2.1 Frontend Pinia store mimarisini yeniden tasarla
- **Durum:** Plan
- **ï¿½ncelik:** Yï¿½ksek
- **Efor:** 12 saat
- **Kapsam:**
  - `frontend/src/stores`
  - `frontend/src/composables`
  - `frontend/src/api`
  - `frontend/src/views` / `frontend/src/components`
- **Amaï¿½:** Component odaklï¿½ daï¿½ï¿½nï¿½k state yï¿½netimini domain bazlï¿½, test edilebilir ve merkezi Pinia mimarisine taï¿½ï¿½mak.
- **Kabul Kriterleri:**
  - Store katmanlarï¿½ `domain` ayrï¿½mï¿½nda yeniden gruplandï¿½rï¿½lï¿½r:
    - `auth`, `dashboard`, `policy`, `claim`, `communication`, `accounting`
  - API yan etkileri yalnï¿½zca store actionï¿½larï¿½ndan yï¿½rï¿½tï¿½lï¿½r; component iï¿½inde doï¿½rudan `fetch`/raw axios kullanï¿½mï¿½nï¿½ minimize eder.
  - Liste/sayfa stateï¿½leri iï¿½in tek bir `loading/error/loaded` patternï¿½i standardize edilir.
  - `getters` ile tï¿½retilmiï¿½ hesaplamalar (kï¿½mï¿½latif sayï¿½lar, filtrelenmiï¿½ listeler) store iï¿½inde toplanï¿½r.
  - `Pinia plugin` ile route veya toast gibi dï¿½ï¿½ etkilerden izole test edilebilir bir mimari oluï¿½turulur.
  - Mevcut kritik 3 frontend akï¿½ï¿½ï¿½ iï¿½in (en az bir dashboard, one form, bir modal/queue flow) store akï¿½ï¿½ diyagramï¿½ ve migration planï¿½ tamamlanï¿½r.

#### 3.3 DocType ï¿½ema normalizasyonu (veri modeli)
- **Durum:** Devam Ediyor
- **Uygulama Durumu:** 1. ve 2. alt maddeler iï¿½in uygulama tamamlandï¿½
- **ï¿½ncelik:** Yï¿½ksek
- **Efor:** 14 saat
- **Kapsam:**
  - `acentem_takipte/doctype/at_offer/at_offer.json` (satï¿½r 1-122)
  - `acentem_takipte/doctype/at_policy/at_policy.json` (satï¿½r 1-194)
  - `acentem_takipte/doctype/at_claim/at_claim.json` (satï¿½r 1-108)
  - `acentem_takipte/doctype/at_payment/at_payment.json` (satï¿½r 1-134)
  - `acentem_takipte/doctype/at_renewal_task/at_renewal_task.json` (satï¿½r 1-84)
  - `acentem_takipte/doctype/at_policy_endorsement/at_policy_endorsement.json` (satï¿½r 1-124)
  - `acentem_takipte/doctype/at_policy_snapshot/at_policy_snapshot.json` (satï¿½r 1-100)
  - `acentem_takipte/doctype/at_customer/at_customer.json` (satï¿½r 1-129)
  - `acentem_takipte/doctype/at_lead/at_lead.json` (satï¿½r 1-128)
  - `acentem_takipte/doctype/at_accounting_entry/at_accounting_entry.json` (satï¿½r 1-152)
  - `acentem_takipte/doctype/at_reconciliation_item/at_reconciliation_item.json` (satï¿½r 1-110)
  - `acentem_takipte/doctype/at_access_log/at_access_log.json` (satï¿½r 1-78)
  - `acentem_takipte/api/security.py` ve ilgili servisler
- **Amaï¿½:** Ortak alanlarï¿½ standardize etmek ve teknik borï¿½ alanlarï¿½nï¿½ azaltmak.
- **Bulgular:**
  - `status` alanï¿½ 9+ DocTypeï¿½ta tekrar ediyor; deï¿½erler heterojen olduï¿½u iï¿½in adï¿½m 1 ile merkezi enumï¿½a taï¿½ï¿½ndï¿½.
  - `notes` alanï¿½nda kullanï¿½cï¿½/sistem ayrï¿½mï¿½ eksikti; adï¿½m 2 ile kullanï¿½cï¿½ notlarï¿½ etiketlendi, sistem notu ï¿½rneï¿½i `AT Policy Snapshot` iï¿½inde ayrï¿½ï¿½tï¿½rï¿½ldï¿½.
  - Finans alanlarï¿½ (`net_premium`, `tax_amount`, `commission_amount`, `gross_premium`) tekrarlanï¿½yor; hesaplama mantï¿½ï¿½ï¿½ ayrï¿½ca controllerï¿½da ï¿½oï¿½unlukla aynï¿½.
  - `AT Policy` iï¿½inde `commission` alanï¿½ legacy olarak saklanï¿½yor (`at_policy.json` satï¿½r 147-153) ve kullanï¿½mda fallback ile birlikte iï¿½liyor (`at_policy.py` satï¿½r 55, 92, 202).
  - `AT Claim` ve `AT Payment` iï¿½inde `customer` alanï¿½ belge kaynaï¿½ï¿½ndan tï¿½retilebilirken ayrï¿½ca saklanmï¿½ï¿½ durumda (`at_claim.json` satï¿½r 29-40, `at_payment.json` satï¿½r 45-48).
- **Kabul Kriterleri:**
  - Adï¿½m 1: `status` karï¿½ï¿½laï¿½tï¿½rmalarï¿½ kontrol merkezine taï¿½ï¿½narak string tekrarlarï¿½ azaltï¿½ldï¿½ (`acentem_takipte/utils/statuses.py`).
  - Adï¿½m 2: `notes` alanlarï¿½ iï¿½in anlamlandï¿½rma standartlarï¿½ eklendi; sistem notu ï¿½rneï¿½i `AT Policy Snapshot` iï¿½inde `Sistem Notu` olarak ayrï¿½ï¿½tï¿½rï¿½ldï¿½.
  - Finans hesaplama ve validasyon mantï¿½ï¿½ï¿½na tek bir yardï¿½mcï¿½ eklenir ve `AT Offer`/`AT Policy`/`AT Policy Endorsement` aynï¿½ doï¿½rulama kuralï¿½nï¿½ kullanï¿½r.
  - `commission` alanï¿½ iï¿½in migration planï¿½ ï¿½ï¿½karï¿½lï¿½r; yeni kayï¿½tlar iï¿½in tek kaynaï¿½a geï¿½iï¿½ doï¿½rulanï¿½r.
  - `customer` tï¿½retilebilir alanlarï¿½ iï¿½in normalizasyon/performans deï¿½erlendirmesi tamamlanï¿½r.

#### 3.3.1 DocType gereksiz alan ï¿½n inceleme (analiz)
- **Durum:** Plan
- **ï¿½ncelik:** Orta
- **Efor:** 2 saat
- **Kapsam:**
  - `at_policy.json` (`commission`, `customer`)
  - `at_claim.json` (`customer`)
  - `at_payment.json` (`customer`)
- **Amaï¿½:** Bu alanlarï¿½n kalï¿½cï¿½lï¿½k gerekliliï¿½ini ve veri bï¿½tï¿½nlï¿½ï¿½ï¿½ etkisini belgelemek.
- **Kabul Kriterleri:**
  - Belirlenen her alanda:
    - ï¿½retim raporu (kullanï¿½m sï¿½klï¿½ï¿½ï¿½)
    - Tï¿½retim maliyetine etkisi
    - Migration veya geriye dï¿½nï¿½k uyumluluk riski
  - envanteri ï¿½ï¿½karï¿½lï¿½r.

#### 3.4 Poliï¿½e yenileme akï¿½ï¿½ï¿½nï¿½ baï¿½tan yaz (yeniden mimari)
- **Durum:** Plan
- **ï¿½ncelik:** Yï¿½ksek
- **Efor:** 18 saat
- **Kapsam:**
  - `acentem_takipte/tasks.py`
  - `acentem_takipte/doctype/at_renewal_task/at_renewal_task.py`
  - `public/js/at_renewal_task.js`
  - `acentem_takipte/api/quick_create.py`
  - `acentem_takipte/api/admin_jobs.py`
  - `acentem_takipte/api/dashboard.py`
  - `public/frontend/assets` iï¿½inde yenileme ekranlarï¿½nï¿½ besleyen bileï¿½en/state uï¿½larï¿½
- **Amaï¿½:** Mevcut ï¿½deadline tabanlï¿½ gï¿½revlendirme + manuel mï¿½dahaleï¿½ modelini; durum makinesi + servis katmanï¿½ + idempotent kuyruk tetikleyicisi ile tekrar kullanï¿½labilir hale getirmek.
- **ï¿½nerilen Mimari:**
  - **Teknik katman ayrï¿½mï¿½:**
    - `renewal/service.py`: politika seï¿½imi, pencere (due/renewal hesaplama), aday ï¿½retimi, iï¿½ kurallarï¿½ (eski-gï¿½ncel eï¿½zamanlï¿½lï¿½k/tekrar ï¿½retebilirlik).
    - `renewal/pipeline.py`: adï¿½m bazlï¿½ akï¿½ï¿½ (detect -> create_task -> notify -> track -> close/error).
    - `renewal/telemetry.py`: metrik + event loglarï¿½ (ne zaman, hangi policy, hangi filtre seti ile tetiklendi).
  - **Durum makinesi:**
    - `OPEN -> IN_PROGRESS -> DONE / CANCELLED`
    - Durum geï¿½iï¿½leri merkezileï¿½tirilir (tek geï¿½iï¿½ fonksiyonu + guard).
  - **Aynï¿½ iï¿½i birden fazla kaynakta tekrar etme:**
    - `unique_key` ile idempotent ï¿½retim,
    - policy bazlï¿½ dedupe (`open task` kontrolï¿½ + `locked` pencere).
  - **Task lifecycle yï¿½netimi:**
    - Eskisi kalan/yenilenen gï¿½revler iï¿½in otomatik kapanï¿½ï¿½ kuralï¿½,
    - Eski tarihli tamamlanmamï¿½ï¿½ gï¿½revlerde "stale task remediation" jobï¿½u.
  - **API gï¿½venliï¿½i:**
    - `api/admin_jobs.py` ï¿½zerinden sadece job-level eriï¿½im,
    - action-level izin + doc permission birlikte.
  - **UI akï¿½ï¿½ï¿½:**
    - Form, liste ve detay akï¿½ï¿½ï¿½nï¿½ tek store event akï¿½ï¿½ï¿½na baï¿½layan store actionlarï¿½,
    - statï¿½ dï¿½nï¿½ï¿½ï¿½mleri tek kaynakta okunur.
- **Kabul Kriterleri:**
  - Yenileme akï¿½ï¿½ï¿½nda gï¿½rev ï¿½retimi, bildirim ve tamamlanma adï¿½mlarï¿½ tek servis fonksiyonunda izlenebilir.
  - Aynï¿½ `policy + due_date` iï¿½in ï¿½ift gï¿½rev ï¿½retimi olmuyor.
  - `Done`/`Completed` statï¿½ uyumsuzluï¿½u kaldï¿½rï¿½lï¿½yor; frontend/backend tek bir renewal durum modeli kullanï¿½yor.
  - Yenileme batch jobï¿½u iï¿½in idempotent ve retry-safe test senaryosu ekleniyor (unit/integration).
  - Baï¿½arï¿½/baï¿½arï¿½sï¿½z/atlanan gï¿½rev iï¿½in metrikler dashboardï¿½a yansï¿½tï¿½lï¿½yor.

---

### Faz 4 ï¿½ Test Gï¿½ï¿½lendirmesi

#### 4.1 Backend kritik iï¿½ akï¿½ï¿½ï¿½ integration testleri
- **Durum:** Plan
- **ï¿½ncelik:** Orta
- **Efor:** 18 saat
- **Kapsam:**
  - `acentem_takipte/tests/test_api_*.py`
  - `acentem_takipte/doctype/*/test_*.py`
- **Amaï¿½:** Poliï¿½e oluï¿½turma, teklif->poliï¿½e dï¿½nï¿½ï¿½ï¿½mï¿½, yenileme, claim bildirim akï¿½ï¿½larï¿½nï¿½ uï¿½tan uca doï¿½rulamak.
- **Kabul Kriterleri:**
  - Kritik 3 akï¿½ï¿½ iï¿½in en az 2 senaryo (yetki + baï¿½arï¿½lï¿½ akï¿½ï¿½) eklenir.
  - CIï¿½de bu testler fail etmeden geï¿½mek zorunlu olur.

#### 4.2 Frontend test kapsamï¿½nï¿½ aï¿½
- **Durum:** Plan
- **ï¿½ncelik:** Orta
- **Efor:** 12 saat
- **Kapsam:**
  - `frontend/tests`
  - `frontend/src/components`
- **Amaï¿½:** Sayfa/component bazï¿½nda unit test, form validasyon ve API state testi eklemek.
- **Kabul Kriterleri:**
  - En az 10 yeni Vue unit/ component testi.
  - E2E senaryolarï¿½nda en az iki kritik kullanï¿½cï¿½ yolunda regresyon korumasï¿½.

#### 4.3 Test verisi ve CI kapï¿½sï¿½nï¿½ netleï¿½tir
- **Durum:** Plan
- **ï¿½ncelik:** Dï¿½ï¿½ï¿½k
- **Efor:** 6 saat
- **Kapsam:**
  - `.github/workflows/backend-ci.yml`
  - `.github/workflows/frontend-ci.yml`
  - `.github/workflows/desk-free-smoke.yml`
- **Amaï¿½:** Test koï¿½ullarï¿½ deterministik olsun, fail-fast ve quality gate eklenmesi.

---

### Faz 5 ï¿½ CI/CD ve Operasyonel Gï¿½venlik

#### 5.1 Baï¿½ï¿½mlï¿½lï¿½k yï¿½netimini sï¿½kï¿½laï¿½tï¿½r
- **Durum:** Plan
- **ï¿½ncelik:** Orta
- **Efor:** 4 saat
- **Kapsam:**
  - `requirements.txt`
  - `pyproject.toml`
  - `setup.py`
- **Amaï¿½:** Versiyon pinning ve geri dï¿½nï¿½ï¿½ï¿½mlï¿½ kurulum gï¿½venliï¿½ini arttï¿½rmak.
- **Kabul Kriterleri:**
  - Baï¿½ï¿½mlï¿½lï¿½klar pinlenir veya benzer izlenebilir strateji belirlenir.
  - `pip check`/gï¿½venlik tarama adï¿½mï¿½ eklenir.

#### 5.2 CI gï¿½venlik kontrollerini ekle
- **Durum:** Plan
- **ï¿½ncelik:** Orta
- **Efor:** 6 saat
- **Kapsam:**
  - `.github/workflows/backend-ci.yml`
  - `.github/workflows/frontend-ci.yml`
- **Amaï¿½:** Secret leakage, dependency audit ve temel SAST adï¿½mlarï¿½ eklemek.
- **Kabul Kriterleri:**
  - CI'da en az bir gï¿½venlik taraftarï¿½ tarama adï¿½mï¿½ zorunlu.
  - Hatalï¿½ secret patternï¿½leri iï¿½in otomatik fail.

---

### Faz 6 ï¿½ UX ve Eriï¿½ilebilirlik

#### 6.1 Eriï¿½ilebilirlik standardï¿½nï¿½ yï¿½kselt
- **Durum:** Plan
- **ï¿½ncelik:** Orta
- **Efor:** 10 saat
- **Kapsam:**
  - `frontend/src/components`
  - `frontend/src/views`
- **Amaï¿½:** `aria-*`, klavye navigation, `aria-busy`, odak yï¿½netimi standartlarï¿½nï¿½ getirmek.
- **Kabul Kriterleri:**
  - Form ve tablo aksiyonlarï¿½nda en az 1:1 klavye eriï¿½ilebilirliï¿½i.
  - Kritik kontrol bileï¿½enlerinde ekran okuyucu dostu etiketleme.

#### 6.2 Boï¿½ durum / yï¿½kleme durumu pattern'ini standardize et
- **Durum:** Plan
- **ï¿½ncelik:** Orta
- **Efor:** 6 saat
- **Kapsam:**
  - `frontend/src/components/EmptyState.vue`
  - Sayfa bazlï¿½ listeler
- **Amaï¿½:** Boï¿½ liste, bekleme ve hata durumlarï¿½nda tutarlï¿½ kullanï¿½cï¿½ geri bildirimi.
- **Kabul Kriterleri:**
  - 8 kritik sayfanï¿½n tï¿½mï¿½nde empty/loading/error state var.
  - Mobil breakpoint testleri eklenir.

---

### Faz 7 ï¿½ Gï¿½zlemlenebilirlik, Uyum ve Entegrasyon Stratejisi

#### 7.1 Observability altyapï¿½sï¿½ (structured logging, metrics)
- **Durum:** Plan
- **ï¿½ncelik:** Yï¿½ksek
- **Efor:** 12 saat
- **Kapsam:**
  - `acentem_takipte/hooks.py`
  - `acentem_takipte/acentem_takipte/api/security.py`
  - `acentem_takipte/acentem_takipte/api/dashboard.py`
  - `acentem_takipte/acentem_takipte/api/accounting.py`
  - `acentem_takipte/acentem_takipte/api/communication.py`
  - `acentem_takipte/acentem_takipte/api/admin_jobs.py`
  - `acentem_takipte/acentem_takipte/api/quick_create.py`
  - `acentem_takipte/acentem_takipte/communication.py`
  - `acentem_takipte/acentem_takipte/tests/test_api_hardening_contracts.py`
  - `acentem_takipte/acentem_takipte/doctype/at_access_log/at_access_log.json`
  - `acentem_takipte/acentem_takipte/doctype/at_notification_outbox/at_notification_outbox.json`
- **Amaï¿½:** Tï¿½m kritik API/job/event akï¿½ï¿½larï¿½nda yapï¿½landï¿½rï¿½lmï¿½ï¿½ log, standart metrik ve hata/aï¿½ama kodu standardï¿½nï¿½ oluï¿½turmak.
- **Kabul Kriterleri:**
  - Her API ï¿½aï¿½rï¿½sï¿½na request-id / doctype / user / action alanlarï¿½nï¿½ taï¿½ï¿½yan yapï¿½landï¿½rï¿½lmï¿½ï¿½ log formatï¿½ eklenir.
  - Admin/job endpointï¿½leri iï¿½in `queue`, `job_id`, `duration_ms`, `retry_count`, `result` metrikleri standart hale getirilir.
  - Notification/accounting jobï¿½larï¿½ iï¿½in sent/success/fail/error oranlarï¿½ toplanï¿½r.
  - `AT Access Log` ve `AT Notification Outbox` alanlarï¿½ ï¿½zerinden izlenebilirlik ana akï¿½ï¿½larï¿½ doï¿½rulanï¿½r.

#### 7.2 KVKK / veri yaï¿½am dï¿½ngï¿½sï¿½ uyumu
- **Durum:** Plan
- **ï¿½ncelik:** Yï¿½ksek
- **Efor:** 14 saat
- **Kapsam:**
  - `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.json`
  - `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py`
  - `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.json`
  - `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py`
  - `acentem_takipte/acentem_takipte/api/dashboard.py`
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/serializers.py`
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/security.py`
  - `acentem_takipte/acentem_takipte/api/security.py`
  - `acentem_takipte/acentem_takipte/communication.py`
  - `acentem_takipte/acentem_takipte/doctype/at_access_log/at_access_log.json`
  - `acentem_takipte/acentem_takipte/doctype/at_accounting_entry/at_accounting_entry.json`
- **Amaï¿½:** TC kimlik no, telefon, e-posta, poliï¿½e ve iï¿½lem kimlikleri iï¿½in amaï¿½ sï¿½nï¿½rlamasï¿½, maskelenme, saklama sï¿½resi ve silme hakkï¿½nï¿½ tek akï¿½ï¿½ta ele alan bir KVKK modelini uygulamak.
- **Kabul Kriterleri:**
  - Duyarlï¿½ alanlar iï¿½in response tarafï¿½nda maskeli gï¿½rï¿½nï¿½m zorunlu olan endpointler tanï¿½mlanï¿½r.
  - `tax_id`, `policy_no`, mï¿½ï¿½teri referanslarï¿½ iï¿½in `retention_class` ve silinme sï¿½reci dokï¿½mante edilir.
  - KVKK audit ï¿½ï¿½ktï¿½sï¿½: silme/anonimleï¿½tirme iï¿½lemleri iï¿½in admin onay kayï¿½tlarï¿½ eklenir.
  - PII iï¿½eren log ve payload ï¿½rnekleri log redaction fonksiyonuna alï¿½nï¿½r.

#### 7.3 API versiyonlama stratejisi
- **Durum:** Plan
- **ï¿½ncelik:** Yï¿½ksek
- **Efor:** 10 saat
- **Kapsam:**
  - `acentem_takipte/acentem_takipte/api/dashboard.py`
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/*.py`
  - `acentem_takipte/acentem_takipte/api/quick_create.py`
  - `acentem_takipte/acentem_takipte/api/accounting.py`
  - `acentem_takipte/acentem_takipte/api/communication.py`
  - `acentem_takipte/acentem_takipte/api/admin_jobs.py`
  - `acentem_takipte/hooks.py`
  - `acentem_takipte/acentem_takipte/tests/test_api_hardening_contracts.py`
  - `acentem_takipte/acentem_takipte/tests/test_dashboard_contract_smoke.py`
- **Amaï¿½:** Mevcut dashboard v2 yaklaï¿½ï¿½mï¿½nï¿½ geniï¿½letip v1/v2 API kontratï¿½nï¿½ netleï¿½tirmek; geriye uyumluluk kï¿½rmadan client ve server tarafï¿½nï¿½ ayrï¿½ï¿½tï¿½rmak.
- **Kabul Kriterleri:**
  - `v1`-`v2` ayrï¿½mï¿½yla rota/isimlendirme standartlarï¿½ belgelenir.
  - Deprecated endpointler iï¿½in taï¿½ï¿½nma ve deprecation uyarï¿½ politikasï¿½ ï¿½ï¿½karï¿½lï¿½r.
  - Versiyon geï¿½iï¿½ini zorlayan ve koruyan en az 2 entegrasyon test senaryosu eklenir.
  - Hata formatï¿½, sayfalama ve filtre kontratlarï¿½ her iki versiyonda da net kontrat dokï¿½manï¿½ ve test ile doï¿½rulanï¿½r.

#### 7.4 Dï¿½ï¿½ sistem entegrasyon sï¿½zleï¿½meleri
- **Durum:** Plan
- **ï¿½ncelik:** Yï¿½ksek
- **Efor:** 16 saat
- **Kapsam:**
  - `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py`
  - `acentem_takipte/acentem_takipte/accounting.py`
  - `acentem_takipte/acentem_takipte/communication.py`
  - `acentem_takipte/acentem_takipte/api/accounting.py`
  - `acentem_takipte/acentem_takipte/doctype/at_accounting_entry/at_accounting_entry.py`
  - `acentem_takipte/acentem_takipte/doctype/at_accounting_entry/at_accounting_entry.json`
  - `acentem_takipte/acentem_takipte/doctype/at_notification_outbox/at_notification_outbox.py`
  - `acentem_takipte/acentem_takipte/doctype/at_notification_template/at_notification_template.py`
  - `acentem_takipte/acentem_takipte/tests/test_notification_dispatcher.py`
  - `acentem_takipte/acentem_takipte/tests/test_dashboard_contract_smoke.py`
  - `acentem_takipte/hooks.py`
- **Amaï¿½:** Her harici sistem ï¿½aï¿½rï¿½sï¿½ iï¿½in timeout, retry, hata/baï¿½arï¿½sï¿½zlï¿½k eï¿½ikleri, kimlik doï¿½rulama, payload ï¿½emasï¿½ ve idempotency varsayï¿½mlarï¿½yla bir sï¿½zleï¿½me katmanï¿½ kurmak.
- **Kabul Kriterleri:**
  - TCMB, WhatsApp provider ve hesaplama/senkronizasyon akï¿½ï¿½larï¿½ iï¿½in ayrï¿½ adapter contract dosyalarï¿½ oluï¿½turulur.
  - Site config anahtarlarï¿½ (`at_whatsapp_api_url`, `at_whatsapp_api_token`, vb.) iï¿½in kullanï¿½m ve fail-fast/fail-safe davranï¿½ï¿½larï¿½ yazï¿½lï¿½r.
  - `AT Accounting Entry` iï¿½in `external_ref`, `integration_hash`, `payload_json` alanlarï¿½ kullanï¿½m rehberi ve doï¿½rulama testi eklenir.
  - Integration testleri timeout, rate-limit, bozuk payload ve response-parsing senaryolarï¿½nï¿½ kapsar.

---

## Eksik Modï¿½l ve ï¿½zellik Analizi (v2)

### ALAN 1 ï¿½ Mï¿½ï¿½teri Yï¿½netimi (360ï¿½ Mï¿½ï¿½teri Gï¿½rï¿½nï¿½mï¿½)

**Mevcut Durum:** `AT Customer` kimlik, iletiï¿½im, atanan acente, KVKK onayï¿½ ve klasï¿½r yolunu tutuyor; fakat iliï¿½kisel mï¿½ï¿½teri 360 modeli oluï¿½turmuyor.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.json`: `links` boï¿½, household/yakï¿½nlar/araï¿½lar/ek varlï¿½klar iï¿½in iliï¿½ki alanï¿½ yok.
- `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.json`: mï¿½ï¿½teri segmenti, skor, portfï¿½y deï¿½eri, risk iï¿½tahï¿½, ï¿½apraz satï¿½ï¿½ potansiyeli alanlarï¿½ yok.
- `frontend/src/pages/CustomerDetail.vue`: aktif poliï¿½e, aï¿½ï¿½k teklif, lead/comment/Communication gï¿½steriyor; ï¿½deme, hasar, yenileme, overdue prim ve mï¿½ï¿½teri skoru yok.
- `frontend/src/pages/CustomerDetail.vue`: iletiï¿½im geï¿½miï¿½i Frappe `Communication` ve yorumlardan toplanï¿½yor; SMS/WhatsApp/outbox/call note birleï¿½ik gï¿½rï¿½nmï¿½yor.
- `acentem_takipte/acentem_takipte/api/dashboard.py`: mï¿½ï¿½teri workbench endpointleri var, fakat tek ï¿½aï¿½rï¿½da tam 360 payload dï¿½nen customer detail API yok.

**ï¿½nerilen Eklentiler:**
- Yeni `AT Customer Relation` DocType: eï¿½, ï¿½ocuk, referans, ticari baï¿½lantï¿½.
- Yeni `AT Customer Asset` DocType: araï¿½, konut, iï¿½yeri, saï¿½lï¿½k grubu, tekne, tarï¿½m ekipmanï¿½.
- Yeni `AT Customer Segment Snapshot` DocType: mï¿½ï¿½teri skoru, tahmini gelir, ï¿½apraz satï¿½ï¿½ fï¿½rsatï¿½, churn riski.
- Yeni endpoint: `acentem_takipte/acentem_takipte/api/customer_360.py -> get_customer_360(name, window_days=90)`.
- Yeni UI: mï¿½ï¿½teri detayï¿½nda `Portfolio`, `Collections`, `Claims`, `Communications`, `Renewals`, `Assets & Family`, `Insights` sekmeleri.

**Yol Haritasï¿½na Entegrasyon:** Yeni `Faz 8 ï¿½ Customer 360 ve CRM Graph` olarak eklenmeli.

**ï¿½ncelik:** Kritik

**Tahmini Efor:** 32 saat

---

### ALAN 2 ï¿½ Poliï¿½e Yï¿½netimi (Tam Yaï¿½am Dï¿½ngï¿½sï¿½)

**Mevcut Durum:** `AT Policy` genel mï¿½ï¿½teri/ï¿½irket/branï¿½/tarih/prim yapï¿½sï¿½na sahip. Poliï¿½e PDF iliï¿½tirme ve snapshot mevcut, ancak ï¿½rï¿½n bazlï¿½ poliï¿½e modellemesi yok.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.json`: araï¿½ plaka/motor/ï¿½asi, konut adres/metrekare, saï¿½lï¿½k sigortalï¿½larï¿½, BES sï¿½zleï¿½me bilgileri gibi ï¿½rï¿½n tipine ï¿½zgï¿½ alanlar yok.
- `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.json`: status yalnï¿½zca `IPT`, `KYT`, `Active`; tekliften yenilemeye uzanan gerï¿½ek yaï¿½am dï¿½ngï¿½sï¿½ eksik.
- `acentem_takipte/acentem_takipte/doctype/at_policy_endorsement/at_policy_endorsement.py`: `ALLOWED_ENDORSEMENT_FIELDS` sadece ï¿½ekirdek finans/tarih alanlarï¿½nï¿½ kapsï¿½yor; risk nesnesi deï¿½iï¿½imi desteklenmiyor.
- `frontend/src/pages/PolicyDetail.vue`: endorsement, snapshot, payment, file ve notification listeleri var; ï¿½rï¿½n/risk/teminat detay kartlarï¿½ yok.
- `acentem_takipte/acentem_takipte/doctype/at_offer/at_offer.py`: tekliften poliï¿½eye dï¿½nï¿½ï¿½ï¿½m var, fakat ï¿½rï¿½n tipine gï¿½re prefill ve doï¿½rulama yok.

**ï¿½nerilen Eklentiler:**
- Yeni ï¿½st model: `AT Policy Product Profile`.
- Child tablolar: `AT Vehicle Risk`, `AT Property Risk`, `AT Health Insured Person`, `AT Coverage Line`, `AT Policy Insured Object`.
- Poliï¿½e durum makinesi: `Teklif Bekliyor -> Aktiflestirme Bekliyor -> Aktif -> Yenileme Havuzu -> Iptal / Tamamlandi`.
- Zeyilname iï¿½in typed endorsement payload ve alan bazlï¿½ diff/snapshot ekranï¿½.
- Sigorta ï¿½irketi ve ï¿½rï¿½n kombinasyonu bazlï¿½ ï¿½ablon/preset yapï¿½sï¿½.

**Yol Haritasï¿½na Entegrasyon:** Yeni `Faz 9 ï¿½ Productized Policy Lifecycle`, mevcut `3.3` ve `3.4` ile baï¿½lantï¿½lï¿½.

**ï¿½ncelik:** Kritik

**Tahmini Efor:** 44 saat

---

### ALAN 3 ï¿½ Yenileme Takibi (Gelir Koruma Motoru)

**Mevcut Durum:** Yenileme gï¿½revi otomatik ï¿½retiliyor, ama pencere sadece 30 gï¿½n. Statï¿½ modeli operasyonel takip yerine gï¿½rev tamamlandï¿½ mantï¿½ï¿½ï¿½nda.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/tasks.py`: `RENEWAL_LOOKAHEAD_DAYS = 30`; 90/60/15/7/1 gï¿½n kademeleri yok.
- `acentem_takipte/acentem_takipte/doctype/at_renewal_task/at_renewal_task.json`: `status` yalnï¿½zca `Open`, `In Progress`, `Done`, `Cancelled`.
- `acentem_takipte/acentem_takipte/doctype/at_renewal_task/at_renewal_task.py`: notification draft ï¿½retiyor ama yenileme teklif ï¿½retmiyor.
- `acentem_takipte/acentem_takipte/api/dashboard.py`: renewal bucket ve pending count var; retention rate, lost renewal reason, competitor loss analitiï¿½i yok.
- `frontend/src/pages/RenewalsBoard.vue`: filtrelenebilir liste var; mï¿½zakere, kaybedildi, rakibe gitti, sebep seï¿½imi ve teklif iliï¿½kisi yok.

**ï¿½nerilen Eklentiler:**
- Yeni `AT Renewal Opportunity` DocType: satï¿½ï¿½ aï¿½amalarï¿½, teklif iliï¿½kisi, renewal owner.
- Yeni `AT Renewal Outcome Reason` DocType: fiyat, hizmet, rakip, mï¿½ï¿½teri vazgeï¿½ti, kapsam uyumsuzluï¿½u.
- ï¿½nceki poliï¿½eden otomatik renewal offer prefill servisi.
- KPI: `retention_rate`, `renewal_pipeline_value`, `lost_renewal_count`, `competitor_loss_rate`.

**Yol Haritasï¿½na Entegrasyon:** Mevcut `3.4` geniï¿½letilmeli ve yeni `Faz 10 ï¿½ Revenue Retention Engine` aï¿½ï¿½lmalï¿½.

**ï¿½ncelik:** Kritik

**Tahmini Efor:** 36 saat

---

### ALAN 4 ï¿½ Tahsilat ve Mali Takip

**Mevcut Durum:** Tekil ï¿½deme kaydï¿½, muhasebe entry ve reconciliation yapï¿½sï¿½ mevcut. Temel collection/payout ve mutabakat izlenebiliyor.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/doctype/at_payment/at_payment.json`: taksit planï¿½, taksit no, plan toplamï¿½, kalan bakiye alanlarï¿½ yok.
- `acentem_takipte/acentem_takipte/doctype/at_payment/at_payment.py`: `due_date` doï¿½rulanï¿½yor ama taksit bazlï¿½ vade zinciri, gecikme faizi, hatï¿½rlatma seviyesi yok.
- `acentem_takipte/acentem_takipte/doctype/at_accounting_entry/at_accounting_entry.json`: KDV, BSMV, gider vergisi, komisyon tahakkuk/ï¿½deme ayrï¿½mï¿½ yok.
- `acentem_takipte/acentem_takipte/api/accounting.py`: workbench ve run/resolve operasyonlarï¿½ var; Excel/CSV ekstre import endpoint'i yok.
- `frontend/src/pages/PaymentsBoard.vue` ve `frontend/src/pages/ReconciliationWorkbench.vue`: operasyon ekranï¿½ var, fakat kasa raporu, ï¿½irket ekstre yï¿½kleme ve muhasebe dï¿½ï¿½a aktarma yok.

**ï¿½nerilen Eklentiler:**
- Yeni `AT Installment Plan`, `AT Installment Item`, `AT Commission Accrual`, `AT Cash Ledger`, `AT Statement Import Batch`.
- Ekstre import parser katmanï¿½: CSV/Excel -> staging -> eï¿½leï¿½tirme -> reconciliation ï¿½nerileri.
- Vergi kï¿½rï¿½lï¿½m alanlarï¿½ ve muhasebe export adapter'ï¿½.
- Gecikmiï¿½ prim uyarï¿½ servisi ve mï¿½ï¿½teri/agent gï¿½rev ï¿½retimi.

**Yol Haritasï¿½na Entegrasyon:** Yeni `Faz 11 ï¿½ Collections and Finance Ops`.

**ï¿½ncelik:** Kritik

**Tahmini Efor:** 40 saat

---

### ALAN 5 ï¿½ Hasar Yï¿½netimi

**Mevcut Durum:** `AT Claim` temel claim kaydï¿½ ve ï¿½deme baï¿½lantï¿½sï¿½ saï¿½lï¿½yor. Liste ekranï¿½nda claim durum ve ï¿½deme/approval tutarlarï¿½ gï¿½rï¿½lebiliyor.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/doctype/at_claim/at_claim.json`: eksper, dosya sorumlusu, red sebebi, itiraz durumu, belge/fotoï¿½raf alanlarï¿½ yok.
- `acentem_takipte/acentem_takipte/doctype/at_claim/at_claim.py`: claim ï¿½deme toplamï¿½nï¿½ hesaplï¿½yor; dosya yaï¿½am dï¿½ngï¿½sï¿½, SLA ve atama kuralï¿½ yok.
- `frontend/src/pages/ClaimsBoard.vue`: liste var, ama claim detail/case management ekranï¿½ yok.
- `acentem_takipte/acentem_takipte/communication.py`: claim status deï¿½iï¿½imlerinde mï¿½ï¿½teri bildirimi iï¿½in ï¿½zel akï¿½ï¿½ gï¿½rï¿½nmï¿½yor.
- Repo genelinde claim attachment/photo upload/inspection/workflow yapï¿½sï¿½ bulunmuyor.

**ï¿½nerilen Eklentiler:**
- Yeni `AT Claim File`, `AT Claim Document`, `AT Expert Assignment`, `AT Claim Appeal`.
- Claim detail sayfasï¿½: olay bilgisi, eksper sï¿½reci, ï¿½deme sï¿½reci, itiraz sekmesi, belge yï¿½kleme.
- Claim status transition + mï¿½ï¿½teri notification rule set.
- Loss ratio veri martï¿½: mï¿½ï¿½teri/ï¿½rï¿½n/ï¿½irket bazï¿½nda claim-to-premium analitiï¿½i.

**Yol Haritasï¿½na Entegrasyon:** Yeni `Faz 12 ï¿½ Claims Case Management`.

**ï¿½ncelik:** Kritik

**Tahmini Efor:** 30 saat

---

### ALAN 6 ï¿½ ï¿½letiï¿½im Merkezi

**Mevcut Durum:** Template, draft, outbox ve dispatcher kuyruï¿½u mevcut. WhatsApp API adapter taslaï¿½ï¿½ ve scheduler dispatch var.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/doctype/at_notification_template/at_notification_template.json`: kanal modeli `SMS`, `Email`, `Both`; WhatsApp first-class channel deï¿½il.
- `acentem_takipte/acentem_takipte/doctype/at_notification_outbox/at_notification_outbox.json`: outbox kanallarï¿½ `SMS`, `Email`; telefon aramasï¿½/notu yok.
- `acentem_takipte/acentem_takipte/communication.py`: SMS akï¿½ï¿½ï¿½ yorum seviyesinde WhatsApp adapter ï¿½zerinden ï¿½alï¿½ï¿½ï¿½yor; gerï¿½ek SMS provider ayrï¿½mï¿½ yok.
- `frontend/src/pages/CommunicationCenter.vue`: outbox/draft yï¿½netimi var; mï¿½ï¿½teri bazlï¿½ tï¿½m iletiï¿½im geï¿½miï¿½i, kampanya ve segment ekranï¿½ yok.
- `acentem_takipte/hooks.py`: queue schedule var; zamanlanmï¿½ï¿½ kampanya veya mï¿½ï¿½teri segment broadcast job'u yok.

**ï¿½nerilen Eklentiler:**
- Yeni `AT Communication Log`, `AT Campaign`, `AT Segment`, `AT Scheduled Message`, `AT Call Note`.
- Channel modeli: `WhatsApp`, `SMS`, `Email`, `Phone Call`.
- Segment bazlï¿½ kampanya hedefleme: ï¿½r. "30 gï¿½n iï¿½inde kasko bitenler".
- Planlï¿½ gï¿½nderim ve approval workflow.

**Yol Haritasï¿½na Entegrasyon:** Yeni `Faz 13 ï¿½ Omnichannel Communication Hub`.

**ï¿½ncelik:** Kritik

**Tahmini Efor:** 34 saat

---

### ALAN 7 ï¿½ Gï¿½rev ve Aktivite Yï¿½netimi

**Mevcut Durum:** Uygulamada genel gï¿½rev sistemi yok; gï¿½rev kavramï¿½ fiilen `AT Renewal Task` ile sï¿½nï¿½rlï¿½.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/doctype/at_renewal_task/at_renewal_task.json`: yalnï¿½zca renewal odaklï¿½ task modeli var.
- `acentem_takipte/acentem_takipte/tasks.py`: admin job ve queue iï¿½leri var; kullanï¿½cï¿½ gï¿½rev, reminder, follow-up ve daily task listesi yok.
- `frontend/src/pages/Dashboard.vue`: renewal alerts ve offer queues var; kiï¿½isel "bugï¿½n yapï¿½lacaklar" gï¿½rï¿½nï¿½mï¿½ yok.
- `frontend/src/router/index.js`: ziyaret planï¿½, aktivite, takï¿½m performansï¿½ gibi modï¿½ller iï¿½in rota yok.

**ï¿½nerilen Eklentiler:**
- Yeni `AT Task`, `AT Activity`, `AT Reminder`, `AT Visit Plan`.
- Domain event'lerden gï¿½rev ï¿½reten rule engine: overdue ï¿½deme, claim follow-up, teklif follow-up, renewal call.
- Ekip performans panosu: poliï¿½e kesim, teklif dï¿½nï¿½ï¿½ï¿½m, tahsilat takibi, gï¿½rev tamamlama.

**Yol Haritasï¿½na Entegrasyon:** Yeni `Faz 14 ï¿½ Work Management and Team Ops`.

**ï¿½ncelik:** Kritik

**Tahmini Efor:** 28 saat

---

### ALAN 8 ï¿½ Raporlama ve Analitik

**Mevcut Durum:** Dashboard v1/v2 ile GWP, komisyon, poliï¿½e sayï¿½sï¿½, renewal bucket, payment ve claim ï¿½zetleri alï¿½nabiliyor. Tarih aralï¿½ï¿½ï¿½ ve branch filtreleri ï¿½alï¿½ï¿½ï¿½yor.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_kpis.py`: policy ve lead status ï¿½zetleri var; mï¿½ï¿½teri baï¿½ï¿½na gelir, retention, churn, loss ratio yok.
- `acentem_takipte/acentem_takipte/api/dashboard_v2/tab_payload.py`: offer/payment/renewal ï¿½zetleri var; ï¿½alï¿½ï¿½an bazlï¿½ ï¿½retim ve ï¿½rï¿½n bazlï¿½ daï¿½ï¿½lï¿½m yok.
- `frontend/src/pages/Dashboard.vue`: ï¿½irket bazlï¿½ top companies var; ï¿½rï¿½n/ï¿½alï¿½ï¿½an/segment/LTV kï¿½rï¿½lï¿½mï¿½ yok.
- Repo genelinde Excel/PDF export endpoint ve UI aksiyonu gï¿½rï¿½nmï¿½yor.

**ï¿½nerilen Eklentiler:**
- Analitik mart katmanï¿½: `customer_value`, `renewal_retention`, `loss_ratio`, `agent_productivity`.
- Export ve BI katmanï¿½: PDF/Excel export, zamanlanmï¿½ï¿½ rapor, dï¿½nem karï¿½ï¿½laï¿½tï¿½rma ve ï¿½alï¿½ï¿½an performans karnesi.
- Yï¿½netici ekranï¿½: gï¿½nlï¿½k operasyon, haftalï¿½k kayï¿½p analizi, aylï¿½k ï¿½irket/ï¿½rï¿½n/ï¿½alï¿½ï¿½an ï¿½retimi, yï¿½llï¿½k bï¿½yï¿½me trendi.

**Yol Haritasï¿½na Entegrasyon:** Yeni `Faz 15 ï¿½ Executive Analytics and Reporting`.

**ï¿½ncelik:** ï¿½nemli

**Tahmini Efor:** 44 saat

---

### Faz 15 Gï¿½ncellenmiï¿½ Versiyon

#### 15.1 PDF/Excel Export Altyapï¿½sï¿½
- **Durum:** Tamamlandï¿½
- **Durum Gï¿½ncelleme:** scheduled report configï¿½larï¿½nï¿½n admin gï¿½rï¿½nï¿½rlï¿½ï¿½ï¿½, manuel tetikleme, UI yï¿½netim formu ve outbox teslim stratejisi tamamlandï¿½.
- **ï¿½ncelik:** Yï¿½ksek
- **Efor:** 18 saat
- **Kapsam:**
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_kpis.py`
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/tab_payload.py`
  - `acentem_takipte/acentem_takipte/api/dashboard.py`
  - `acentem_takipte/acentem_takipte/policy_documents.py`
  - `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py`
  - `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.json`
  - `acentem_takipte/acentem_takipte/doctype/at_payment/at_payment.json`
  - `acentem_takipte/acentem_takipte/doctype/at_accounting_entry/at_accounting_entry.json`
  - `acentem_takipte/acentem_takipte/doctype/at_claim/at_claim.json`
  - `frontend/src/pages/Dashboard.vue`
  - `frontend/src/pages/PolicyList.vue`
  - `frontend/src/pages/PaymentsBoard.vue`
  - `frontend/src/pages/ClaimsBoard.vue`
- **Teknik Karar (PDF ve Excel iï¿½in seï¿½ilen yaklaï¿½ï¿½m):**
  - PDF: `Frappe native print/html + Jinja + frappe.utils.pdf.get_pdf`
    - Gerekï¿½e: repo iï¿½inde `policy_documents.py` zaten `get_pdf` kullanï¿½yor; Desk uyumu ve kurumsal PDF standardï¿½ iï¿½in mevcut stack ile en uyumlu yaklaï¿½ï¿½m bu.
    - Uygulama notu: DocType bazlï¿½ belgelerde Print Format; BI raporlarï¿½nda server-side Jinja HTML ï¿½ablonu + `get_pdf`.
  - Excel: `openpyxl` server-side
    - Gerekï¿½e: 1000+ satï¿½r, ï¿½ok sheet, zamanlanmï¿½ï¿½ ï¿½retim ve kurumsal format kontrolï¿½ iï¿½in backend ï¿½retim en gï¿½venli yol.
  - Tetikleme modeli: `Her ikisi de`
    - anlï¿½k indirme: kullanï¿½cï¿½ filtreleyip indirir
    - zamanlanmï¿½ï¿½ ï¿½retim: haftalï¿½k/aylï¿½k job + bildirim
- **ï¿½retilecek Rapor Tipleri:**
  - `Poliï¿½e Listesi Raporu`
    - Kaynak: `AT Policy` + `AT Customer` + `AT Insurance Company` + opsiyonel `AT Sales Entity`
    - Filtreler: tarih aralï¿½ï¿½ï¿½, sigorta ï¿½irketi, sigorta branï¿½ï¿½, fiziksel ï¿½ube, durum, ï¿½alï¿½ï¿½an
    - PDF dï¿½zeni: logo, rapor baï¿½lï¿½ï¿½ï¿½, filtre ï¿½zeti, tablo, toplam prim/komisyon ï¿½zet satï¿½rï¿½
    - Excel yapï¿½sï¿½: `Summary`, `Policies`
  - `Komisyon Tahakkuk Raporu`
    - Kaynak: `AT Policy`, `AT Payment`, `AT Accounting Entry`, `AT Reconciliation Item`
    - Filtreler: dï¿½nem, ï¿½irket, ï¿½alï¿½ï¿½an, fiziksel ï¿½ube, tahakkuk durumu
    - PDF dï¿½zeni: dï¿½nem ï¿½zeti, ï¿½irket bazlï¿½ kï¿½rï¿½lï¿½m tablosu, tahakkuk/tahsilat fark ï¿½zeti
    - Excel yapï¿½sï¿½: `Summary`, `By Company`, `Lines`
  - `Yenileme Performans Raporu`
    - Kaynak: `AT Renewal Task`, `AT Renewal Opportunity`, `AT Renewal Outcome`, `AT Offer`, `AT Policy`
    - Filtreler: dï¿½nem, ï¿½alï¿½ï¿½an, ï¿½irket, branï¿½, fiziksel ï¿½ube
    - PDF dï¿½zeni: retention KPI kartlarï¿½, stage daï¿½ï¿½lï¿½mï¿½ tablosu, kayï¿½p nedenleri ï¿½zeti
    - Excel yapï¿½sï¿½: `Summary`, `Pipeline`, `Lost Reasons`, `Agent Breakdown`
  - `Hasar/Prim Oranï¿½ Raporu`
    - Kaynak: `AT Claim`, `AT Payment`, `AT Policy`, `AT Customer`
    - Filtreler: dï¿½nem, ï¿½irket, ï¿½rï¿½n/branï¿½, mï¿½ï¿½teri segmenti, fiziksel ï¿½ube
    - PDF dï¿½zeni: loss ratio ï¿½zeti, ï¿½irket/ï¿½rï¿½n bazlï¿½ tablo, riskli mï¿½ï¿½teri listesi
    - Excel yapï¿½sï¿½: `Summary`, `By Product`, `By Company`, `Risk Customers`
  - `Acente ï¿½retim Karnesi`
    - Kaynak: `AT Policy`, `AT Offer`, `AT Renewal Task`, `AT Renewal Outcome`, `AT Payment`, `AT Task`
    - Filtreler: ï¿½alï¿½ï¿½an, dï¿½nem, fiziksel ï¿½ube
    - PDF dï¿½zeni: ï¿½alï¿½ï¿½an baï¿½lï¿½ï¿½ï¿½, KPI kartlarï¿½, hedef-gerï¿½ekleï¿½en tablosu, aï¿½ï¿½k gï¿½rev ï¿½zeti
    - Excel yapï¿½sï¿½: `Summary`, `Agents`, `Open Tasks`, `Conversions`
  - `Tahsilat Durumu Raporu`
    - Kaynak: `AT Payment`, `AT Installment Plan`, `AT Accounting Entry`, `AT Reconciliation Item`
    - Filtreler: dï¿½nem, ï¿½deme durumu, vadesi geï¿½enler, ï¿½irket, fiziksel ï¿½ube
    - PDF dï¿½zeni: kasa ï¿½zeti, gecikmiï¿½ tahsilat listesi, taksit ï¿½zeti
    - Excel yapï¿½sï¿½: `Summary`, `Overdue`, `Installments`, `Cash`
- **Kabul Kriterleri:**
  - En az 6 rapor tipi iï¿½in ortak export servis katmanï¿½ oluï¿½ur.
  - PDF ï¿½ï¿½ktï¿½larï¿½nda kurumsal baï¿½lï¿½k, filtre ï¿½zeti, ï¿½zet satï¿½rï¿½ ve sayfa numarasï¿½ standardï¿½ uygulanï¿½r.
  - Excel ï¿½ï¿½ktï¿½larï¿½nda ï¿½oklu sheet, baï¿½lï¿½k stili, sayï¿½/tarih formatï¿½ ve filtre satï¿½rï¿½ bulunur.
  - Uzun sï¿½ren export iï¿½leri queue ï¿½zerinden yï¿½rï¿½r; kï¿½ï¿½ï¿½k veri setlerinde anlï¿½k indirme desteklenir.
  - Dashboard v2 ve liste ekranlarï¿½ aynï¿½ filtre sï¿½zleï¿½mesi ile export alï¿½r.
- **Desk Uyumluluï¿½u:**
  - Evet. `System Manager` ve `Administrator` Desk ï¿½zerinden de rapor alabilmeli.
  - Desk tarafï¿½nda export action ve rapor parametre formu bulunur; normal kullanï¿½cï¿½ aynï¿½ raporlarï¿½ `/at` iï¿½inden kullanï¿½r.

#### 15.2 Karï¿½ï¿½laï¿½tï¿½rmalï¿½ Dï¿½nem Analizi
- **Durum:** Plan
- **ï¿½ncelik:** Yï¿½ksek
- **Efor:** 8 saat
- **Kapsam:**
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_kpis.py`
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/tab_payload.py`
  - `acentem_takipte/acentem_takipte/api/dashboard.py`
  - `frontend/src/pages/Dashboard.vue`
- **Kabul Kriterleri:**
  - KPI payload'ï¿½na `period_comparison` parametresi eklenir: `none`, `previous_period`, `previous_month`, `previous_year`.
  - Her KPI iï¿½in `current`, `previous`, `delta_value`, `delta_percent`, `direction` alanlarï¿½ dï¿½ner.
  - ï¿½u senaryolar desteklenir:
    - bu ay vs geï¿½en ay
    - bu yï¿½l vs geï¿½en yï¿½l
    - seï¿½ili dï¿½nem vs aynï¿½ uzunlukta ï¿½nceki dï¿½nem
  - Dashboard kartlarï¿½ `^ / ï¿½` yï¿½n gï¿½stergesi ve yï¿½zde deï¿½iï¿½im gï¿½sterir.
  - Aynï¿½ comparison helper export raporlarï¿½nda tekrar kullanï¿½labilir ï¿½ekilde ayrï¿½ï¿½tï¿½rï¿½lï¿½r.

#### 15.3 Acente Performans Karnesi
- **Durum:** Plan
- **ï¿½ncelik:** Orta
- **Efor:** 10 saat
- **Kapsam:**
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_kpis.py`
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/tab_payload.py`
  - `frontend/src/pages/Dashboard.vue`
  - `frontend/src/pages/TeamPerformance.vue` (yeni)
  - `acentem_takipte/acentem_takipte/doctype/at_task/*`
  - `acentem_takipte/acentem_takipte/doctype/at_policy/*`
  - `acentem_takipte/acentem_takipte/doctype/at_offer/*`
  - `acentem_takipte/acentem_takipte/doctype/at_payment/*`
- **Kabul Kriterleri:**
  - ï¿½alï¿½ï¿½an bazlï¿½ ï¿½u metrikler ï¿½retilir:
    - kesilen poliï¿½e sayï¿½sï¿½
    - toplam prim
    - teklif dï¿½nï¿½ï¿½ï¿½m oranï¿½
    - yenileme baï¿½arï¿½ oranï¿½
    - komisyon geliri
    - aï¿½ï¿½k gï¿½rev sayï¿½sï¿½
  - Hem ekran gï¿½rï¿½nï¿½mï¿½ hem PDF export desteklenir.
  - Fiziksel ï¿½ube ve ï¿½alï¿½ï¿½an filtresi aynï¿½ sï¿½zleï¿½me ile ï¿½alï¿½ï¿½ï¿½r.
  - KPI tanï¿½mlarï¿½ Faz 14 gï¿½rev modeli tamamlandï¿½ktan sonra gï¿½rev bazlï¿½ metriklerle geniï¿½leyebilir.
- **Baï¿½ï¿½mlï¿½lï¿½k:** `Faz 14 ï¿½ Work Management and Team Ops`

#### 15.4 Mï¿½ï¿½teri Segmentasyon Raporu
- **Durum:** Tamamlandï¿½
- **ï¿½ncelik:** Orta
- **Efor:** 8 saat
- **Kapsam:**
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_kpis.py`
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/tab_payload.py`
  - `acentem_takipte/acentem_takipte/doctype/at_customer/*`
  - `acentem_takipte/acentem_takipte/doctype/at_policy/*`
  - `acentem_takipte/acentem_takipte/doctype/at_claim/*`
  - `frontend/src/pages/CustomerList.vue`
  - `frontend/src/pages/CustomerSegments.vue` (yeni)
- **Kabul Kriterleri:**
  - Temel segmentasyon, `AT Customer Segment Snapshot` olmadan ï¿½u kurallarla ï¿½alï¿½ï¿½ï¿½r:
    - poliï¿½e sayï¿½sï¿½: `1`, `2-5`, `5+`
    - toplam prim segmenti
    - yenileme sadakat skoru
    - hasar geï¿½miï¿½i var/yok
  - Mï¿½ï¿½teri listesi ekranï¿½nda segment filtreleme + export birlikte ï¿½alï¿½ï¿½ï¿½r.
  - `AT Customer Segment Snapshot` geldiï¿½inde aynï¿½ endpoint sï¿½zleï¿½mesi korunarak geliï¿½miï¿½ segmente geï¿½ilebilir.
  - Desk'te admin kullanï¿½cï¿½ segment raporunu mï¿½ï¿½teri listesi/export yï¿½zeyi ï¿½zerinden alabilir.
- **Baï¿½ï¿½mlï¿½lï¿½k:** `Faz 8 ï¿½ Customer 360 ve CRM Graph` (opsiyonel; temel versiyon baï¿½ï¿½msï¿½z ï¿½alï¿½ï¿½ï¿½r)

---

### ALAN 10 ï¿½ Mobil Kullanï¿½m

**Mevcut Durum:** Vue SPA route bazlï¿½ lazy-load kullanï¿½yor. Sayfalarda temel responsive sï¿½nï¿½flar var; fakat deneyim masaï¿½stï¿½ workbench mantï¿½ï¿½ï¿½ aï¿½ï¿½rlï¿½klï¿½.

**Kritik Eksikler:**
- `frontend/src/router/index.js`: mobil sahaya ï¿½zel field mode veya mini-detail route modeli yok.
- `frontend/src/pages/CustomerDetail.vue`, `PolicyDetail.vue`, `ClaimsBoard.vue`, `PaymentsBoard.vue`: veri yoï¿½un kart ve tablo yapï¿½sï¿½ mobil kullanï¿½m iï¿½in optimize edilmemiï¿½.
- `frontend/src/state/session.js`: global session state var; Pinia veya offline-friendly domain store yapï¿½sï¿½ yok.
- `frontend/src/pages/ClaimsBoard.vue`: fotoï¿½raf ekleme, kamera yï¿½kleme, sahadan hasar kaydï¿½ akï¿½ï¿½ï¿½ yok.
- `frontend/src/pages/OfferBoard.vue` ve `PolicyDetail.vue`: hï¿½zlï¿½ teklif sihirbazï¿½ ve mï¿½ï¿½teri ziyaretinde kullanï¿½lacak tek-ekran aksiyon seti yok.

**ï¿½nerilen Eklentiler:**
- Yeni mobil-first `Field Mode` navigasyonu.
- Hï¿½zlï¿½ aksiyon kartlarï¿½: `Musteri Ara`, `Hizli Teklif`, `Hasar Bildir`, `Tahsilat Notu`, `Fotograf Yukle`.
- Kamera/file capture destekli claim ve belge akï¿½ï¿½larï¿½.
- Pinia tabanlï¿½ offline toleranslï¿½ domain cache.

**Yol Haritasï¿½na Entegrasyon:** Yeni `Faz 16 ï¿½ Mobile Field Operations`.

**ï¿½ncelik:** ï¿½nemli

**Tahmini Efor:** 24 saat

---

## Yol Haritasï¿½ (v2 ï¿½ Birleï¿½tirilmiï¿½ ve Baï¿½ï¿½mlï¿½lï¿½k Sï¿½ralï¿½)

Bu bï¿½lï¿½m, yukarï¿½daki alan analizinden ï¿½ï¿½kan `Faz 8-16` ï¿½nerilerini mevcut `Faz 1-7` ile ï¿½akï¿½ï¿½mayacak ï¿½ekilde birleï¿½tirir. Amaï¿½ ayrï¿½ backlog kï¿½meleri ï¿½retmek deï¿½il; uygulamaya baï¿½lanabilecek tek bir, baï¿½ï¿½mlï¿½lï¿½k sï¿½ralï¿½ icra dizisi oluï¿½turmaktï¿½r.

### Dalga 1 ï¿½ Gï¿½venlik, Uyum ve Sï¿½zleï¿½me Temeli
- **Birleï¿½en Fazlar:** `Faz 1`, `Faz 5.2`, `Faz 7.1`, `Faz 7.2`, `Faz 7.3`, `Faz 7.4`
- **ï¿½ncelik:** Yï¿½ksek
- **Toplam Efor:** 88 saat
- **Odak:**
  - Auth, permission, `ignore_permissions=True`, log redaction ve admin job eriï¿½im standardï¿½nï¿½ kapatmak
  - Structured logging, metrics, KVKK yaï¿½am dï¿½ngï¿½sï¿½ ve harici entegrasyon sï¿½zleï¿½melerini sabitlemek
  - API versioning ve CI gï¿½venlik kapï¿½sï¿½nï¿½ uygulamak
- **Bu Dalga Tamamlanmadan Baï¿½lanmamasï¿½ Gerekenler:**
  - Omnichannel communication geniï¿½lemesi
  - Muhasebe/entegrasyon rollout'u
  - Customer 360 iï¿½in geniï¿½ PII gï¿½rï¿½nï¿½rlï¿½k yï¿½zeyi

### Dalga 2 ï¿½ Veri Modeli ve Servis Katmanï¿½ Temeli
- **Birleï¿½en Fazlar:** `Faz 3.1`, `Faz 3.2`, `Faz 3.3`, `Faz 3.3.1`
- **ï¿½ncelik:** Yï¿½ksek
- **Toplam Efor:** 40 saat
- **Odak:**
  - Ortak servis katmanï¿½, permission helper ve domain yardï¿½mcï¿½larï¿½nï¿½ oturtmak
  - DocType normalizasyonu, legacy alan temizliï¿½i ve ortak finans/status doï¿½rulamasï¿½nï¿½ tekilleï¿½tirmek
  - Sonraki dalgalarda eklenecek mï¿½ï¿½teri iliï¿½ki, risk nesnesi, taksit, claim case, communication log ve task modelleri iï¿½in ï¿½ema standardï¿½ belirlemek
- **Bu Dalga Tamamlanmadan Baï¿½lanmamasï¿½ Gerekenler:**
  - Productized policy lifecycle rollout
  - Collections/installment modeli
  - Claims case management ve unified activity modeli

### Dalga 3 ï¿½ Frontend State, UX ve Mobil Foundation
- **Birleï¿½en Fazlar:** `Faz 2.3`, `Faz 3.2.1`, `Faz 6.1`, `Faz 6.2`
- **ï¿½ncelik:** Yï¿½ksek
- **Toplam Efor:** 34 saat
- **Odak:**
  - Pinia tabanlï¿½ domain store mimarisine geï¿½mek
  - Loading/error/empty state standardï¿½nï¿½ oturtmak
  - Eriï¿½ilebilirlik ve responsive davranï¿½ï¿½ï¿½ temel seviyede gï¿½venceye almak
  - Mobil saha moduna altyapï¿½ hazï¿½rlamak
- **Bu Dalga Tamamlanmadan Baï¿½lanmamasï¿½ Gerekenler:**
  - Customer 360 ekranï¿½nï¿½n geniï¿½letilmesi
  - Mobile field operations rollout
  - Bï¿½yï¿½k ï¿½ok-sekmeli operasyon ekranlarï¿½

### Dalga 4 ï¿½ Customer 360 ve Productized Policy Foundation
- **Birleï¿½en Fazlar:** `Faz 8`, `Faz 9` iï¿½indeki veri modeli ve ï¿½ekirdek servis maddeleri
- **ï¿½ncelik:** Yï¿½ksek
- **Toplam Efor:** 46 saat
- **Odak:**
  - `AT Customer` ï¿½evresine household, asset, segment ve skor katmanlarï¿½nï¿½ eklemek
  - `AT Policy` iï¿½in ï¿½rï¿½n bazlï¿½ risk nesnesi modelini kurmak
  - Gerï¿½ek endorsement diff ve product-specific validation altyapï¿½sï¿½nï¿½ ï¿½ï¿½karmak
- **Baï¿½ï¿½mlï¿½lï¿½k:** `Dalga 1`, `Dalga 2`, `Dalga 3`

### Dalga 5 ï¿½ Gelir Koruma ve Mali Operasyon Motoru
- **Birleï¿½en Fazlar:** `Faz 2.2`, `Faz 3.4`, `Faz 10`, `Faz 11`
- **ï¿½ncelik:** Yï¿½ksek
- **Toplam Efor:** 92 saat
- **Odak:**
  - Renewal engine'i 90/60/30/15/7/1 kademeli hale getirmek
  - Auto renewal offer, lost reason ve retention KPI'larï¿½nï¿½ eklemek
  - Installment plan, overdue premium, commission accrual ve statement import akï¿½ï¿½ï¿½nï¿½ kurmak
  - Accounting/reconciliation workbench'i finans operasyon merkezine dï¿½nï¿½ï¿½tï¿½rmek
- **Baï¿½ï¿½mlï¿½lï¿½k:** `Dalga 1`, `Dalga 2`

### Dalga 6 ï¿½ Claims, ï¿½letiï¿½im ve Takï¿½m Operasyonlarï¿½
- **Birleï¿½en Fazlar:** `Faz 12`, `Faz 13`, `Faz 14`
- **ï¿½ncelik:** Yï¿½ksek
- **Toplam Efor:** 92 saat
- **Odak:**
  - Claim case management, eksper, belge/fotoï¿½raf ve itiraz sï¿½recini eklemek
  - WhatsApp, SMS, e-posta ve telefon notunu tek communication timeline altï¿½nda birleï¿½tirmek
  - Segment/kampanya/zamanlanmï¿½ï¿½ gï¿½nderim ve genel task/activity/reminder modelini kurmak
  - ï¿½alï¿½ï¿½an bazlï¿½ gï¿½rev ve performans takibini dashboard ile baï¿½lamak
- **Baï¿½ï¿½mlï¿½lï¿½k:** `Dalga 1`, `Dalga 2`, `Dalga 3`

### Dalga 7 ï¿½ Yï¿½netici Analitiï¿½i, Test ve Release Hardening
- **Birleï¿½en Fazlar:** `Faz 4`, `Faz 5.1`, `Faz 15`, `Faz 16`
- **ï¿½ncelik:** Orta
- **Toplam Efor:** 84 saat
- **Odak:**
  - Executive KPI setini mï¿½ï¿½teri deï¿½eri, retention, loss ratio ve agent ï¿½retkenliï¿½i ile geniï¿½letmek
  - PDF/Excel export, scheduled reports, dï¿½nem karï¿½ï¿½laï¿½tï¿½rma ve performans/segment raporlamasï¿½nï¿½ eklemek
  - Backend/frontend/E2E kritik akï¿½ï¿½ testlerini tamamlamak
  - Mobil saha kullanï¿½mï¿½nï¿½ production seviyesine taï¿½ï¿½mak
- **Baï¿½ï¿½mlï¿½lï¿½k:** `Dalga 4`, `Dalga 5`, `Dalga 6`

### Birleï¿½tirilmiï¿½ v2 Uygulama Sï¿½rasï¿½
1. `Dalga 1 ï¿½ Gï¿½venlik, Uyum ve Sï¿½zleï¿½me Temeli`
2. `Dalga 2 ï¿½ Veri Modeli ve Servis Katmanï¿½ Temeli`
3. `Dalga 3 ï¿½ Frontend State, UX ve Mobil Foundation`
4. `Dalga 4 ï¿½ Customer 360 ve Productized Policy Foundation`
5. `Dalga 5 ï¿½ Gelir Koruma ve Mali Operasyon Motoru`
6. `Dalga 6 ï¿½ Claims, ï¿½letiï¿½im ve Takï¿½m Operasyonlarï¿½`
7. `Dalga 7 ï¿½ Yï¿½netici Analitiï¿½i, Test ve Release Hardening`

### Birleï¿½tirilmiï¿½ v2 Toplam Efor ï¿½zeti
- `Dalga 1`: 88 saat
- `Dalga 2`: 40 saat
- `Dalga 3`: 34 saat
- `Dalga 4`: 46 saat
- `Dalga 5`: 92 saat
- `Dalga 6`: 92 saat
- `Dalga 7`: 84 saat
- **Toplam:** 476 saat

## Karar Kayï¿½tlarï¿½ (Mart 2026 Revizyonu)

Bu bï¿½lï¿½m, mevcut v2 yol haritasï¿½nï¿½n uygulanma kararlarï¿½nï¿½ netleï¿½tirir. ï¿½nceki ï¿½Desk kaldï¿½rï¿½lacakï¿½ varsayï¿½mï¿½ iptal edilmiï¿½tir. Yeni hedef model:

- Birincil operasyon yï¿½zeyi: `/at` Vue SPA
- Frappe Desk: yalnï¿½zca `System Manager` ve `Administrator`
- Normal kullanï¿½cï¿½lar: Desk gï¿½rmeden doï¿½rudan `/at`
- Tï¿½m domain akï¿½ï¿½larï¿½ hem Desk hem SPA ile uyumlu backend sï¿½zleï¿½meleri ï¿½zerinden ï¿½alï¿½ï¿½ï¿½r

### Karar 1 ï¿½ Frappe Desk Eriï¿½imini Rol Bazlï¿½ Kilitle
- **Seï¿½ilen Yaklaï¿½ï¿½m:** Desk kaldï¿½rï¿½lmaz; yalnï¿½zca `System Manager` / `Administrator` kullanï¿½cï¿½larï¿½ Desk'e eriï¿½ir. Diï¿½er tï¿½m roller iï¿½in varsayï¿½lan giriï¿½ yï¿½zeyi `/at` olur ve `/app/*` eriï¿½imi yï¿½nlendirme/guard ile kesilir.
- **Roadmap Etkisi:** `Dalga 1` ve `Dalga 3`
- **Desk Uyumluluï¿½u:**
  - DocType form/list ayarlarï¿½ korunur.
  - `public/js` client script'ler korunur; ï¿½ï¿½nkï¿½ admin/superuser iï¿½in Desk operasyon ve bakï¿½m yï¿½zeyi olarak kalacaktï¿½r.
  - API endpoint'leri Desk'ten baï¿½ï¿½msï¿½z kalï¿½r; Desk ve SPA aynï¿½ backend iï¿½ kurallarï¿½nï¿½ kullanï¿½r.
- **Uygulama Notlarï¿½:**
  - `hooks.py` iï¿½inde `home_page` / `role_home_page` kuralï¿½ SPA ï¿½ncelikli olacak ï¿½ekilde gï¿½ncellenir.
  - `api/session.py` ve giriï¿½ sonrasï¿½ boot akï¿½ï¿½ï¿½nda normal kullanï¿½cï¿½ iï¿½in `/at` zorlamasï¿½ uygulanï¿½r.
  - `www/app.py` veya benzeri route guard katmanï¿½nda `System Manager` dï¿½ï¿½ï¿½ kullanï¿½cï¿½ iï¿½in `/app` eriï¿½imi `/at`'a ï¿½evrilir.
  - Admin/superuser iï¿½in Desk'te kalacak yï¿½zeyler:
    - DocType ve Custom Field yï¿½netimi
    - User / Role / User Permission yï¿½netimi
    - Error Log, Background Jobs, Scheduler izleme
    - Patch/Migration geï¿½miï¿½i ve sistem teï¿½hisi
  - SPA'ya taï¿½ï¿½nacak operasyon yï¿½zeyleri:
    - mï¿½ï¿½teri, teklif, poliï¿½e, yenileme, hasar, tahsilat, dashboard
- **ï¿½lgili Dosyalar:**
  - `acentem_takipte/hooks.py`
  - `acentem_takipte/api/session.py`
  - `acentem_takipte/public/js/*.js`
  - `frontend/src/router/index.js`
  - `frontend/src/state/session.js`
- **Tahmini Efor:** 14 saat

### Karar 2 ï¿½ ï¿½ok ï¿½ubeli Yapï¿½ ï¿½ï¿½in Veri Modeli
- **Seï¿½ilen Yaklaï¿½ï¿½m:** Fiziksel lokasyon/ï¿½ube iï¿½in mevcut sigorta branï¿½ï¿½ modelinden ayrï¿½ bir ï¿½zel DocType kullanï¿½lï¿½r. Mevcut `AT Branch` sigorta branï¿½ï¿½/ï¿½rï¿½n branï¿½ï¿½ anlamï¿½nda kalï¿½r; fiziksel ï¿½ube iï¿½in yeni bir model eklenir.
- **Roadmap Etkisi:** `Dalga 1`, `Dalga 2`, `Dalga 4`, `Dalga 5`, `Dalga 6`
- **Desk Uyumluluï¿½u:**
  - Desk form/list gï¿½rï¿½nï¿½mï¿½nde fiziksel ï¿½ube alanï¿½ standart Link field olarak ï¿½alï¿½ï¿½ï¿½r.
  - `User Permission` ile Desk filtrelemesi desteklenir; dashboard ve raw SQL tarafï¿½nda ek custom filter enforcement uygulanï¿½r.
- **Seï¿½ilen Permission Stratejisi:**
  - Birincil model: `AT Office Branch` + kullanï¿½cï¿½ya ï¿½oklu ï¿½ube atamasï¿½
  - Desk uyumu iï¿½in: `User Permission`
  - API ve dashboard sorgularï¿½ iï¿½in: merkezi `office_branch` filter helper + permission hook
  - `System Manager`: tï¿½m ï¿½ubeler
  - Normal kullanï¿½cï¿½: yalnï¿½zca atanmï¿½ï¿½ ï¿½ubeler
- **ï¿½ncelikli DocType Sï¿½rasï¿½:**
  1. `AT Customer`
  2. `AT Lead`
  3. `AT Offer`
  4. `AT Policy`
  5. `AT Renewal Task`
  6. `AT Payment`
  7. `AT Claim`
  8. `AT Accounting Entry`
  9. `AT Reconciliation Item`
- **Migration Notlarï¿½:**
  - Yeni alan adï¿½: `office_branch`
  - Backfill sï¿½rasï¿½:
    - mï¿½ï¿½teri manuel/seed veya kullanï¿½cï¿½ varsayï¿½lanï¿½na gï¿½re
    - poliï¿½e teklif/mï¿½ï¿½teri ï¿½zerinden
    - ï¿½deme/hasar/yenileme muhasebe kayï¿½tlarï¿½ poliï¿½e veya mï¿½ï¿½teri ï¿½zerinden
  - Dashboard v2 tarafï¿½nda `queries_kpis.py` ve `tab_payload.py` iï¿½inde `office_branch` paramï¿½ zorunlu helper ile iï¿½lenir.
- **ï¿½lgili Dosyalar:**
  - `acentem_takipte/doctype/at_customer/at_customer.json`
  - `acentem_takipte/doctype/at_policy/at_policy.json`
  - `acentem_takipte/doctype/at_renewal_task/at_renewal_task.json`
  - `acentem_takipte/doctype/at_payment/at_payment.json`
  - `acentem_takipte/doctype/at_claim/at_claim.json`
  - `acentem_takipte/doctype/at_accounting_entry/at_accounting_entry.json`
  - `acentem_takipte/api/dashboard.py`
  - `acentem_takipte/api/dashboard_v2/queries_kpis.py`
  - `acentem_takipte/api/dashboard_v2/tab_payload.py`
  - `acentem_takipte/api/session.py`
- **Yeni Dosyalar / DocType'lar:**
  - `AT Office Branch`
  - `AT User Branch Access`
  - branch migration patch dosyasï¿½
- **Tahmini Efor:** 24 saat

### Karar 3 ï¿½ WhatsApp Business API Entegrasyonu
- **Seï¿½ilen Yaklaï¿½ï¿½m:** ï¿½ncelikli provider olarak `Meta Cloud API` kullanï¿½lï¿½r. Notification outbox yapï¿½sï¿½ korunur; ï¿½zerine provider adapter katmanï¿½ eklenir. Baï¿½arï¿½sï¿½z WhatsApp gï¿½nderimi varsayï¿½lan olarak otomatik SMS fallback yapmaz; fallback template bazlï¿½, aï¿½ï¿½k iï¿½ kuralï¿½ ile seï¿½ilir.
- **Roadmap Etkisi:** `Dalga 1`, `Dalga 5`, `Dalga 6`
- **Neden:** Tï¿½rkiye pazarï¿½ iï¿½in doï¿½rudan Meta entegrasyonu uzun vadede daha az baï¿½ï¿½mlï¿½lï¿½k, daha aï¿½ï¿½k HSM yï¿½netimi ve daha dï¿½ï¿½ï¿½k aracï¿½ maliyeti saï¿½lar. SMS saï¿½layï¿½cï¿½sï¿½ ile fallback akï¿½ï¿½ï¿½ daha sonra ayrï¿½ bir sï¿½zleï¿½me olarak eklenmelidir; ilk aï¿½amada kanal karï¿½ï¿½ï¿½klï¿½ï¿½ï¿½ yaratmamak gerekir.
- **Desk Uyumluluï¿½u:**
  - `AT Notification Template`, `AT Notification Draft`, `AT Notification Outbox` Desk'te yï¿½netilebilir kalï¿½r.
  - System Manager WhatsApp template, provider ayarï¿½ ve kuyruk durumunu Desk'ten gï¿½rebilir.
- **Uygulama Notlarï¿½:**
  - Scheduler akï¿½ï¿½ï¿½ korunur: `hooks.py` ï¿½ queue/disptach job
  - Kanal modeli `SMS/Email/Both` yaklaï¿½ï¿½mï¿½ndan `WHATSAPP/SMS/EMAIL` bazlï¿½ geniï¿½letilir.
  - Yeni adapter akï¿½ï¿½ï¿½: `outbox -> dispatcher -> provider router -> whatsapp adapter`
  - Teknik kurallar:
    - timeout: `8s`
    - retry: `max 3`
    - rate-limit: Redis sayaï¿½lï¿½ provider limiter
    - dead-letter: mevcut baï¿½arï¿½sï¿½z kuyruk mantï¿½ï¿½ï¿½ korunur
  - ï¿½ncelikli trigger noktalarï¿½:
    1. yenileme hatï¿½rlatmasï¿½: `tasks.py`, `at_renewal_task.py`
    2. ï¿½deme vade uyarï¿½sï¿½: yeni scheduler + `AT Payment`
    3. hasar durum gï¿½ncellemesi: `AT Claim.on_update`
    4. poliï¿½e teslim bildirimi: `AT Policy.after_insert` / belge hazï¿½r olayï¿½
- **Template ï¿½ema Geniï¿½lemesi:**
  - `provider_template_name`
  - `provider_template_language`
  - `provider_template_category`
  - `content_mode`
  - `variables_schema_json`
  - kanal bazlï¿½ body/header alanlarï¿½
- **ï¿½lgili Dosyalar:**
  - `acentem_takipte/communication.py`
  - `acentem_takipte/notifications.py`
  - `acentem_takipte/hooks.py`
  - `acentem_takipte/tasks.py`
  - `acentem_takipte/doctype/at_notification_template/at_notification_template.json`
  - `acentem_takipte/doctype/at_notification_draft/at_notification_draft.json`
  - `acentem_takipte/doctype/at_notification_outbox/at_notification_outbox.json`
- **Yeni Dosyalar / DocType'lar:**
  - `acentem_takipte/providers/base.py`
  - `acentem_takipte/providers/router.py`
  - `acentem_takipte/providers/whatsapp_meta.py`
- **Tahmini Efor:** 28 saat

### Karar 4 ï¿½ Renewal Engine Yeniden Yazï¿½mï¿½
- **Seï¿½ilen Yaklaï¿½ï¿½m:** `AT Renewal Task` yalnï¿½zca gï¿½rev/hatï¿½rlatma kaydï¿½ olarak kalï¿½r. Asï¿½l yenileme satï¿½ï¿½ yaï¿½am dï¿½ngï¿½sï¿½ yeni servis katmanï¿½ ve ek outcome/opportunity modelleri ile yï¿½netilir.
- **Roadmap Etkisi:** `Dalga 5`
- **Desk Uyumluluï¿½u:**
  - Desk'te `AT Renewal Task`, `AT Renewal Opportunity`, `AT Renewal Outcome` formlarï¿½ yï¿½netilebilir olur.
  - Manual trigger ve exception ï¿½ï¿½zï¿½mï¿½ admin/manager kullanï¿½cï¿½ iï¿½in hem Desk hem SPA ï¿½zerinden mï¿½mkï¿½n olur.
- **Yeni Mimari:**
  - `renewal/service.py`: aday ï¿½retimi, iï¿½ kurallarï¿½, prefill offer ï¿½retimi
  - `renewal/pipeline.py`: `detect -> ensure_opportunity -> ensure_task -> notify -> create_offer -> close_or_lost`
  - `renewal/telemetry.py`: stage sayaï¿½larï¿½, dedupe kayï¿½tlarï¿½, retention metrikleri
- **Kademe Sistemi:**
  - `90/60/30/15/7/1`
  - Template yaklaï¿½ï¿½mï¿½: tek dinamik template yerine stage bazlï¿½ template family
  - Dedupe anahtarï¿½: `policy + stage_code + channel + business_date`
- **Prefill Yenileme Teklifi:**
  - otomatik alanlar:
    - mï¿½ï¿½teri
    - sigorta ï¿½irketi
    - sigorta branï¿½ï¿½
    - para birimi
    - ï¿½nceki prim/komisyon referanslarï¿½
  - kullanï¿½cï¿½ onayï¿½ gerektiren alanlar:
    - fiyat deï¿½iï¿½imi
    - tarih kaymasï¿½
    - risk nesnesi deï¿½iï¿½ikliï¿½i
    - ek teminat / limit farklarï¿½
- **Yeni Outcome ï¿½emasï¿½:**
  - `renewal_opportunity`
  - `policy`
  - `status`
  - `outcome_reason`
  - `competitor_name`
  - `lost_notes`
  - kategori seti:
    - `fiyat`
    - `rakip`
    - `hizmet`
    - `musteri_vazgecti`
    - `ulasilamadi`
- **Dashboard KPI Eklentileri:**
  - `retention_rate`
  - `renewal_lost_count`
  - `renewal_lost_by_reason`
  - `renewal_stage_aging`
- **ï¿½lgili Dosyalar:**
  - `acentem_takipte/tasks.py`
  - `acentem_takipte/doctype/at_renewal_task/at_renewal_task.py`
  - `acentem_takipte/doctype/at_offer/at_offer.py`
  - `acentem_takipte/api/dashboard.py`
  - `acentem_takipte/api/dashboard_v2/tab_payload.py`
- **Yeni Dosyalar / DocType'lar:**
  - `acentem_takipte/renewal/service.py`
  - `acentem_takipte/renewal/pipeline.py`
  - `acentem_takipte/renewal/telemetry.py`
  - `AT Renewal Opportunity`
  - `AT Renewal Outcome`
- **Tahmini Efor:** 34 saat

### Karar 5 ï¿½ Pinia Store Mimarisi (Domain Bazlï¿½)
- **Seï¿½ilen Yaklaï¿½ï¿½m:** SPA tarafï¿½ Pinia setup store mimarisine geï¿½irilir. Backend sï¿½zleï¿½mesi Desk uyumlu kalï¿½r; frontend yalnï¿½zca bu sï¿½zleï¿½menin organize edilmiï¿½ istemci katmanï¿½ olur.
- **Roadmap Etkisi:** `Dalga 3`, `Dalga 4`, `Dalga 5`, `Dalga 6`
- **Desk Uyumluluï¿½u:**
  - Desk'e ï¿½zel akï¿½ï¿½lar etkilenmez.
  - Store'lar yalnï¿½zca `/at` yï¿½zeyi iï¿½in istemci orkestrasyonu saï¿½lar; iï¿½ kurallarï¿½ backend'de kalï¿½r.
- **Store Yapï¿½sï¿½:**
  - `stores/auth.js`
  - `stores/branch.js`
  - `stores/customer.js`
  - `stores/policy.js`
  - `stores/renewal.js`
  - `stores/claim.js`
  - `stores/payment.js`
  - `stores/communication.js`
  - `stores/accounting.js`
  - `stores/dashboard.js`
- **Standart Store Sï¿½zleï¿½mesi:**
  - `state`: `items`, `selected`, `loading`, `error`
  - `actions`: `fetch`, `create`, `update`, `remove`
  - `getters`: `filtered`, `grouped`, `computed_kpis`
- **Branch Filter Stratejisi:**
  - aktif fiziksel ï¿½ube global store'da tutulur
  - System Manager iï¿½in `Tum Subeler` seï¿½eneï¿½i gï¿½rï¿½nï¿½r
  - filtre router query param ile URL'de persist edilir
  - sigorta branï¿½ï¿½ filtresi ile fiziksel ï¿½ube filtresi ayrï¿½ tutulur
- **Migration Kapsamï¿½:**
  - doï¿½rudan resource/fetch kullanan sayfalar sï¿½rasï¿½yla store action'larï¿½na taï¿½ï¿½nï¿½r:
    - mï¿½ï¿½teri ekranlarï¿½
    - teklif/poliï¿½e ekranlarï¿½
    - yenileme ekranlarï¿½
    - hasar/tahsilat/iletiï¿½im workbench'leri
    - dashboard
- **ï¿½lgili Dosyalar:**
  - `frontend/src/state/session.js`
  - `frontend/src/state/ui.js`
  - `frontend/src/router/index.js`
  - `frontend/src/pages/*.vue`
- **Yeni Dosyalar / DocType'lar:**
  - `frontend/src/stores/*.js`
  - `frontend/src/api/client.js`
- **Tahmini Efor:** 26 saat

### Rol-Arayï¿½z Matrisi
| Rol | Birincil Arayï¿½z | Desk Eriï¿½imi | Not |
|---|---|---|---|
| `Administrator` | `/at` + Desk | Var | Sistem yï¿½netimi, patch, log, scheduler |
| `System Manager` | `/at` + Desk | Var | Sistem ve operasyon hibrit kullanï¿½m |
| `AT Manager` | `/at` | Yok | Operasyon ve dashboard |
| `AT Agent` | `/at` | Yok | Mï¿½ï¿½teri, teklif, yenileme, hasar |
| `AT Accountant` | `/at` | Yok | Tahsilat, mutabakat, finans iï¿½ akï¿½ï¿½ï¿½ |
| Diï¿½er operasyon rolleri | `/at` | Yok | Yetki kapsamï¿½ API + SPA ile belirlenir |

### Kararlarï¿½n Dalgalara Daï¿½ï¿½lï¿½mï¿½
1. `Karar 1` ï¿½ `Dalga 1`, `Dalga 3`
2. `Karar 2` ï¿½ `Dalga 1`, `Dalga 2`, `Dalga 4`, `Dalga 5`, `Dalga 6`
3. `Karar 3` ï¿½ `Dalga 1`, `Dalga 5`, `Dalga 6`
4. `Karar 4` ï¿½ `Dalga 5`
5. `Karar 5` ï¿½ `Dalga 3`, `Dalga 4`, `Dalga 5`, `Dalga 6`

### Revize Uygulama Baï¿½ï¿½mlï¿½lï¿½k Sï¿½rasï¿½
1. `Karar 1` ve `Karar 2` temel eriï¿½im ve veri izolasyonu iï¿½in ï¿½nce uygulanï¿½r.
2. `Karar 5`, `/at` tarafï¿½nï¿½ yeni branch ve permission sï¿½zleï¿½mesine baï¿½lamak iï¿½in ikinci katmandï¿½r.
3. `Karar 3`, notification altyapï¿½sï¿½nï¿½ ve WhatsApp provider sï¿½zleï¿½mesini sabitler.
4. `Karar 4`, branch-aware renewal verisi ve communication adapter hazï¿½r olduktan sonra uygulanï¿½r.

### Karar Bazlï¿½ Toplam Efor
- `Karar 1`: 14 saat
- `Karar 2`: 24 saat
- `Karar 3`: 28 saat
- `Karar 4`: 34 saat
- `Karar 5`: 26 saat
- **Toplam:** 126 saat

### Planlama Notu
- Bu `126 saat`, mevcut `458 saat` v2 toplamï¿½na ek baï¿½ï¿½msï¿½z bir paket deï¿½ildir.
- Kararlar, mevcut dalgalarï¿½n uygulanma biï¿½imini ve teknik yï¿½nï¿½nï¿½ netleï¿½tiren mimari karar kayï¿½tlarï¿½dï¿½r.
- Sprint planlama yapï¿½lï¿½rken karar eforu ilgili dalga eforunun iï¿½inde deï¿½erlendirilmelidir.

## Genel Kabul Kurallarï¿½

- Her gï¿½rev iï¿½in:
  - ï¿½nce teknik not (amaï¿½, kapsam, varsayï¿½m), ardï¿½ndan kod deï¿½iï¿½ikliï¿½i.
  - ï¿½lgili dosya ve fonksiyona referans.
  - Risk/geri adï¿½m senaryosu.
- Her commit ï¿½ncesi:
  - Gï¿½venlik etkisi kontrolï¿½
  - Test etkisi raporu
  - ï¿½zin/kullanï¿½cï¿½ etkisi deï¿½erlendirmesi

## Referans Notu
Bu yol haritasï¿½ tamamlanmadan doï¿½rudan kod ï¿½retimine geï¿½ilmeyecektir. ï¿½nce her faz, kabul kriteri ve test ile onay alï¿½ndï¿½ktan sonra uygulanacaktï¿½r.









- Faz 3.4 dorduncu uygulama dilimi tamamlandi:
  - `AT Renewal Task` uzerine `lost_reason_code` ve `competitor_name` alanlari eklendi
  - renewal outcome sync akisi terminal `Cancelled` durumunda kayip sebebi varsa `Lost` sonucuna donusecek sekilde genisletildi
  - renewal performance raporu outcome alanlarini da donecek sekilde genisletildi
  - dashboard renewal bucket payload'ina `retention` metri?i eklendi
- Dil/locale uyum notu genisletildi:
  - yeni alan label'lari mevcut repo deseniyle Turkce tutuldu
  - bozuk encoding gorulen yeni satirlar duzeltildi
- Siradaki is: renewal lost-reason akisini SPA/quick action yuzeyine baglamak ve retention metri?ini UI kartlarina tasimak

- Faz 3.4 besinci uygulama dilimi tamamlandi:
  - `frontend/src/config/quickCreateRegistry.js` renewal quick create formuna kayip sebebi ve rakip alani eklendi
  - `frontend/src/pages/RenewalsBoard.vue` renewal listesinde kayip sonucu ve rakip bilgisi gorunur hale geldi
- Siradaki is: retention metri?ini dashboard renewal ozet kartlarina tasimak

- Faz 3.4 altinci uygulama dilimi tamamlandi:
  - `api/dashboard_v2/tab_payload.py` renewal tab serisine `renewal_retention` eklendi
  - `frontend/src/pages/Dashboard.vue` renewal hizli kart setine retention orani karti eklendi
- Siradaki is: Faz 3.4 kapanis notunu yazmak ve sonraki asama olarak Pinia/store mimarisi backlog'una gecmek

- Faz 3.4 plan seviyesinde kapatildi:
  - renewal service / pipeline / telemetry iskeleti tamamlandi
  - stale remediation ve status guard tamamlandi
  - renewal outcome veri modeli tamamlandi
  - lost reason / competitor backend ve UI akisi tamamlandi
  - retention reporting ve dashboard gorunurlugu tamamlandi
- Faz 3.2.1 plan seviyesinde kapatildi:
  - facade migration ana shell ve liste/detail ekranlarinda tamamlandi
  - domain store baglanan ana ekranlar: dashboard, renewal, customer, policy, claim, payment, communication, accounting
  - bilincli istisna olarak `state/session.js`, `state/ui.js`, `router/index.js` ve facade store cekirdegi uyumluluk katmani olarak korundu
- Aktif sonraki is: frontend store-page entegrasyon testlerini derinlestirmek
- Ilk test sertlestirme turu tamamlandi:
  - `frontend/src/App.test.js`
  - `frontend/tests/unit/stores/auth.spec.js`
  - `frontend/tests/unit/stores/ui.spec.js`
  - `frontend/tests/unit/stores/branch.spec.js`
- Ilk store-page entegrasyon testi tamamlandi:
  - `frontend/src/pages/Dashboard.test.js`
  - range secimi -> `dashboardStore.state.range`
  - tab secimi -> router query + `dashboardStore.state.activeTab`
- Ikinci store-page entegrasyon testi tamamlandi:
  - `frontend/src/pages/RenewalsBoard.test.js`
  - resource rows -> `renewalStore.state.items`
  - status dagilimi -> `renewalStore.state.summary`
- Ucuncu store-page entegrasyon testi tamamlandi:
  - `frontend/src/pages/CustomerList.test.js`
  - list payload -> `customerStore.state.items`
  - pagination payload -> `customerStore.state.pagination`
- Dorduncu store-page entegrasyon testi tamamlandi:
  - `frontend/src/pages/PolicyList.test.js`
  - list payload -> `policyStore.state.items`
  - count payload -> `policyStore.state.pagination.total`
- Besinci store-page entegrasyon testi tamamlandi:
  - `frontend/src/pages/ClaimsBoard.test.js`
  - refresh/reload -> `claimStore.state.items`
  - query input -> `claimStore.state.filters.query`
- Altinci store-page entegrasyon testi tamamlandi:
  - `frontend/src/pages/PaymentsBoard.test.js`
  - refresh/reload -> `paymentStore.state.items`
  - query input + totals -> `payment` store turetimi
- Yedinci store-page entegrasyon testi tamamlandi:
  - `frontend/src/pages/CommunicationCenter.test.js`
  - route context + snapshot -> `communication` store
  - breakdown -> status card turetimi
- Sekizinci store-page entegrasyon testi tamamlandi:
  - `frontend/src/pages/ReconciliationWorkbench.test.js`
  - workbench payload -> `accounting` store
  - source query -> filtered rows
- Faz 3.2.1 test kapanis karari:
  - facade/store cekirdek kontratlari ve ana domain ekranlari ilk test turunda kapsandi
  - sonraki test derinlestirmesi Faz `4+` ekran ve veri modeli buyumeleriyle alinacak
- Siradaki is:
  - Faz 4 Customer 360 ve Productized Policy Foundation
  - `AT Customer` 360 payload/service envanteri


- Faz 3.2.1 ilk uygulama dilimi tamamlandi:
  - rontend/src/stores/auth.js eklendi
  - rontend/src/stores/ui.js eklendi
  - mevcut state/session.js ve state/ui.js kirilmadan Pinia giris noktasi olusturuldu
- Ilk migration adaylari netlesti:
  - Dashboard.vue`n  - Reports.vue`n  - RenewalsBoard.vue`n  - CustomerList.vue`n  - PolicyList.vue`n  - OfferBoard.vue`n  - ClaimsBoard.vue`n  - PaymentsBoard.vue`n  - CommunicationCenter.vue`n  - ReconciliationWorkbench.vue`n  - AuxWorkbench.vue`n- Aktif sonraki is: session/locale/capability okumasini ilk bir ekran uzerinden uth store'a tasimak









- 2026-03-09 Faz 4 ilerleme: AT Customer Relation ve AT Insured Asset icin Customer 360 icinden inline delete akisi eklendi; submit sonrasi payload refresh sayfa testinde sabitlendi.

- 2026-03-09 Faz 4 test ilerleme: Customer 360 relation/asset quick create-delete backend kontrati testleri eklendi.

- 2026-03-09 Faz 4 ilerleme: Policy 360 payload servisi eklendi ve PolicyDetail tek endpoint reload modeline gecirildi.

- 2026-03-09 Faz 4 ilerleme: PolicyDetail icinde product_profile karti eklendi; urun ailesi, sigortalanan konu ve kapsam odagi gorunur.

- 2026-03-09 Faz 4 ilerleme: Policy 360 product_profile katmani readiness, completed/missing alan ve eksik urun alanlari listesi ile genisletildi.

- 2026-03-09 Faz 4 test ilerleme: PolicyDetail product_profile ve readiness gorunurlugu icin ilk sayfa testi eklendi.

## Faz 4 Kapanis Ozeti (2026-03-09)
- Customer 360 payload, iliski/varlik veri modeli, inline create-edit-delete ve test katmani tamamlandi.
- Policy 360 payload, product profile, readiness gorunurlugu ve ilk sayfa testi tamamlandi.
- Faz 4 tamamlandi.
- Yeni aktif odak: Faz 5 - Tahsilat ve mali takip derinlestirme.


- 2026-03-09 Faz 5 ilerleme: Reconciliation workbench payload overdue collection metric ve preview listesi ile genisletildi.

- 2026-03-09 Faz 5 test ilerleme: ReconciliationWorkbench overdue collection metric ve preview alani icin sayfa testi eklendi.

- 2026-03-09 Faz 5 ilerleme: AT Payment Installment DocType eklendi; AT Payment kaydi taksit planini senkronlar hale getirildi ve collection preview installment modelini onceleyerek okur.

- 2026-03-09 Faz 5 test ilerleme: Payment installment schedule sync ve installment-first overdue collection fallback backend testleri eklendi.

- 2026-03-09 Faz 5 ilerleme: `frontend/src/pages/PaymentsBoard.vue` odeme satirlarina taksit gorunurlugu eklendi; toplam/odenen/geciken taksit ve sonraki vade bilgisi listede gorunur hale geldi.

- 2026-03-09 Faz 5 test ilerleme: `frontend/src/pages/PaymentsBoard.test.js` taksit gorunurlugu ile genisletildi; installment summary alanlari sayfa seviyesinde test altina alindi.

- 2026-03-09 Faz 5 ilerleme: odeme quick create akisi taksit alanlariyla genisletildi; `installment_count` ve `installment_interval_days` frontend registry ve backend quick create/service katmanina eklendi.

- 2026-03-09 Faz 5 ilerleme: `Policy 360` payload `payment_installments` ile genisletildi; `frontend/src/pages/PolicyDetail.vue` icinde taksit plani preview karti eklendi.

- 2026-03-09 Faz 5 test ilerleme: rontend/src/pages/PolicyDetail.test.js taksit preview kontrati ile genisletildi.

- 2026-03-09 Faz 5 ilerleme: Customer 360 payload payment_installments ve overdue_installment ozetleri ile genisletildi; frontend/src/pages/CustomerDetail.vue odeme kartlarinda geciken taksit sinyali gosteriliyor.

- 2026-03-09 Faz 5 test ilerleme: odeme quick create installment alanlari backend kontrat testi ile sabitlendi -> acentem_takipte/acentem_takipte/tests/test_quick_create_customer360_aux.py

- 2026-03-09 Faz 5 ilerleme: ReconciliationWorkbench komisyon tahakkuk metrikleri ve preview listesi ile genisletildi; frontend/src/pages/ReconciliationWorkbench.test.js kontrati guncellendi.

- 2026-03-09 Faz 5 ilerleme: preview-first ekstre ice aktarma akisi eklendi; services/accounting_statement_import.py ve frontend/src/pages/ReconciliationWorkbench.vue uzerinden CSV eslesme onizlemesi acildi.

- 2026-03-09 Faz 5 test ilerleme: preview-first ekstre ice aktarma parse ve eslesme kontrati backend testleri ile sabitlendi -> acentem_takipte/acentem_takipte/tests/test_accounting_statement_import.py

- 2026-03-09 Faz 5 test ilerleme: ReconciliationWorkbench ekstre ice aktarma preview dialog kontrati frontend/src/pages/ReconciliationWorkbench.test.js ile sabitlendi.

- 2026-03-09 Faz 5 ilerleme: statement import preview satirlari eslesen policy/payment kayitlari uzerinden accounting entry ve reconciliation adayina donusturulur hale getirildi; ilgili backend ve UI kontrat testleri eklendi.

- 2026-03-09 Faz 5 ilerleme: ReconciliationWorkbench gorunen acik kayitlar icin toplu resolve/ignore aksiyonlari ile genisletildi; frontend/src/pages/ReconciliationWorkbench.test.js guncellendi.

- 2026-03-09 Faz 5 test ilerleme: bulk_resolve_items backend kontrati acentem_takipte/acentem_takipte/tests/test_accounting_reconciliation.py ile sabitlendi.

- 2026-03-09 Faz 5 kapanis: mali takip zinciri installment modeli, overdue tahsilat, komisyon tahakkuk, statement preview/import ve bulk reconciliation aksiyonlari ile ilk operasyonel surume ulasti. Sonraki aktif odak Faz 6.

- 2026-03-09 Faz 6 baslangici: AT Claim icin operasyonel lifecycle alanlari eklendi (ssigned_expert, ejection_reason, ppeal_status, 
ext_follow_up_on). Controller guard'lari reddedilen hasar, itiraz ve takip tarihi kurallarini uyguluyor. Sonraki adim ClaimsBoard ve musteri bildirimi gorunurlugu.

- 2026-03-09 Faz 6 ikinci kesit: ClaimsBoard.vue hasar liste gorunumune operasyon kolonunu ekledi; ekspert, red sebebi, itiraz durumu ve sonraki takip tarihi satir seviyesinde gorunur hale getirildi. Sonraki adim claim status transition yuzeyi ve musteri bildirim gorunurlugu.

- 2026-03-09 Faz 6 ucuncu kesit: ClaimsBoard.vue uzerinde hasar status aksiyonlari acildi. Under Review, Approved, Closed gecisleri update_quick_aux_record ile calisiyor; satir seviyesinde notification template ipucu gorunur. AT Claim quick aux whitelist'i eklendi ve sayfa testi ile mutation payload zinciri sabitlendi. Sonraki adim rejected/appeal akisi ve gercek notification outbox gorunurlugu.

- 2026-03-09 Faz 6 dorduncu kesit: ClaimsBoard.vue claim'e bagli notification draft/outbox gorunurlugu aldi. Claim satirlarinda draft/outbox sayisi ve durum ozeti gosteriliyor; Rejected status aksiyonu prompt ile red sebebi toplayarak update_quick_aux_record uzerinden calisiyor. Communication Center'a claim filtreli gecis eklendi.

- 2026-03-09 Faz 6 besinci kesit: AT Call Note veri modeli eklendi. Quick create service/API, aux workbench route'u ve CommunicationCenter.vue icinden hizli arama notu girisi acildi. Policy/claim/customer secenekleri call note dialog'una baglandi. Sonraki adim call note test kapsami ve kampanya/segment veri modeli.

- 2026-03-09 Faz 6 altinci kesit: AT Call Note icin ilk test zemini eklendi. 	est_quick_create_customer360_aux.py quick call note service payload kontratini, CommunicationCenter.test.js ise call note dialog config ve route-aware prefill zincirini sabitledi. Sonraki adim kampanya/segment veri modeli.

## 2026-03-09 Son Sync
- **Aktif faz:** **Faz 6 - Hasar ve Iletisim Merkezi derinlestirme**
- **Son tamamlanan is:** `AT Segment` ve `AT Campaign` veri modeli, quick create endpointleri ve aux workbench omurgasi eklendi
- **Siradaki hamle:** `CommunicationCenter.vue` icinde segment/kampanya launcher ve ilk ekran entegrasyonu
- **Durum guncellemesi:** Segment ve kampanya launcher/dialog akisi `CommunicationCenter.vue` icinde acildi; sonraki hamle execution veya hesaplanan segment zinciri
- **Durum guncellemesi:** `preview_segment_members` endpoint'i ve kriter bazli segment membership servisi eklendi; sonraki hamle preview sonucunu Communication Center icinde gorunur kilmak
- **Durum guncellemesi:** Segment preview sonucu `CommunicationCenter.vue` icinde gorunur; sonraki hamle `AT Campaign` icin execution zinciri
- **Durum guncellemesi:** `execute_campaign` backend servisi ve endpoint'i eklendi; sonraki hamle execution akisini Communication Center UI'ina baglamak

- 2026-03-09: Faz 6 campaign execution UI ve frontend test secicileri sabitlendi.

- 2026-03-09: Faz 6 campaign execution sonucu AT Campaign uzerinde sent/matched/skipped/last run alanlariyla kalicilastirildi.

- 2026-03-09: Faz 6 campaign execution icin gunluk due campaign scheduler job eklendi.

- 2026-03-09: Faz 6 campaign detail ekraninda bagli notification draft/outbox kayitlari gorunur hale getirildi.

## 2026-03-09 Faz 6 Kapanis
- Faz 6 tamamlandi.
- Yeni aktif odak: Faz 7.


- 2026-03-09: Faz 7 baslangic olarak communication operations raporu eklendi; campaign execution ve delivery metrikleri Reports ekraninda gorunur oldu.

- 2026-03-09: Faz 7 communication operations raporu backend/frontend kontrat testleri ile sabitlendi.

- 2026-03-09: Faz 7 reconciliation operations raporu eklendi; mutabakat operasyonlari Reports ekraninda yonetsel gorunurluk kazandi.

- Faz 7 ilerleme: communication_operations ve reconciliation_operations sonrasinda claims_operations raporu eklendi. Reports yuzeyi artik kampanya, mutabakat ve hasar operasyonlarini yonetsel gorunum olarak okuyabiliyor.

- Faz 7 ilerleme: operasyon raporlari icin donem kiyaslamasi eklendi. Reports ekrani secili tarih araligini bir onceki esit periyot ile kiyaslayarak yonetsel delta kartlari gosteriyor.

- Faz 7 ilerleme: Scheduled report operatorlugu communication, reconciliation ve claims operasyon raporlarini da kapsayacak sekilde genisletildi.

- Faz 7 kapanis: communication, reconciliation ve claims operasyon raporlari; donem kiyas kartlari; scheduled report operatorlugu tamamlandi. Yeni aktif odak Faz 8.

- Faz 8 ilerleme: AT Customer Segment Snapshot veri modeli eklendi. Customer 360 insight zinciri artik snapshot kaydi ureterek calisiyor; sonraki adim toplu refresh ve yonetsel gorunurluk.
# Guncel Durum
- Faz 8 devam ediyor.
- Faz 8 tamamlandi.
- Tamamlanan:
  - AT Customer Segment Snapshot veri omurgasi
  - Customer 360 snapshot upsert entegrasyonu
  - batch refresh job ve daily scheduler
  - snapshot tarihi ve kaynak surumu Customer 360 ekraninda gorunur
  - admin job mapping ve snapshot aux liste/detail gorunurlugu
  - snapshot admin UI tetikleme butonu
  - snapshot detail ekraninda okunur sinyal bloklari ve test kapsami
  - snapshot listesinde sinyal sayilari ve kisa skor ozeti
  - snapshot listesinde operasyon ozet kartlari
  - snapshot trend gorunurlugu
  - snapshot CSV export gorunurlugu
- Siradaki is:
  - Faz 9 ilk veri katmani

## 2026-03-09 Faz 9 Baslangic
- Aktif odak: operasyonel ownership/assignment veri katmani.
- Tamamlandi:
  - `AT Ownership Assignment` veri modeli
  - ownership assignment quick create / aux edit / delete kontrati
  - `Customer 360` ve `Policy 360` payload gorunurlugu
  - `CustomerDetail.vue` inline assignment create/edit/delete
  - `ClaimsBoard.vue` claim kaynakli assignment prefill akisi
  - `CustomerDetail.test.js` ownership assignment render ve prefill kontrati
- Siradaki adim: assignment gorunurlugunu claim ve policy operasyon yuzeylerinde derinlestirmek.
- 2026-03-09 Faz 9 ilerleme: ClaimsBoard claim satirlarinda ownership assignment ozeti gorunur hale getirildi; AT Ownership Assignment kaynakli count/open/assignee bilgisi ve sayfa testi eklendi.
- 2026-03-09 Faz 9 ilerleme: PolicyDetail icinde inline ownership assignment create/edit akisi eklendi; policy kaynakli prefill ve sayfa testi sabitlendi.
- 2026-03-09 Faz 9 ilerleme: AuxRecordDetail icinde ownership assignment icin ozel okunur detail bloklari ve sayfa testi eklendi.

## 2026-03-09 Faz 9 Kapanis
- Faz 9 tamamlandi.
- Kapsam: `AT Ownership Assignment` veri modeli, quick create/aux edit-delete, Customer 360/Policy 360/Claims gorunurlugu, inline create-edit akislar ve aux/detail okunabilirligi.
- Sonraki aktif odak: Faz 10.

- 2026-03-09 Faz 10 baslangici: detail shell mobil kullanilabilirligi iyilestirildi; DetailActionRow mobilde dikey tam-genislik aksiyon davranisina, DetailTabsBar ise yatay snap tab scroller davranisina cekildi.


- 2026-03-09 Faz 10 ilerleme: CustomerDetail ve PolicyDetail icine mobil hizli aksiyon seritleri eklendi; sik kullanilan gecisler mobilde ust bolgede gorunur hale geldi.


- 2026-03-09 Faz 10 ilerleme: CustomerDetail ve PolicyDetail icinde mobilde preview veri yogunlugu azaltildi; fazla kartlar mobilde gizlenip masaustunde tam liste korunuyor.


- 2026-03-09 Faz 10 ilerleme: CustomerList ve PolicyList icine mobil liste ozet kartlari eklendi; gosterilen aralik, aktif filtre sayisi ve sayfa boyutu mobilde ust bolgede gorunur hale geldi.


- 2026-03-09 Faz 10 ilerleme: CustomerList ve PolicyList mobil liste ozeti gorunurlugu sayfa testleri ile sabitlendi.


## 2026-03-09 Faz 10 Kapanis
- Faz 10 tamamlandi.
- Kapsam: mobil detail shell, mobil hizli aksiyonlar, detail preview yogunlugu azaltimi, mobil liste ozet katmani ve ilk sayfa testleri.
- Sonraki aktif odak: Faz 11.


- Faz 11 ilerleme notu: Dashboard'a claim, renewal, assignment ve call note kaynaklarini birlestiren takip SLA paneli eklendi.
- Faz 11 ilerleme notu: SLA paneline claim, renewal ve communication drill-down aksiyonlari eklendi.
- Faz 11 ilerleme notu: Dashboard SLA paneli sayfa testinde route davranisiyla sabitlendi.

- Faz 11 ilerleme notu: Dashboard takip SLA drill-down aksiyonlari artik hedef ekranlarda query tabanli filtre senkronu ile calisiyor.

- Faz 11 ilerleme notu: ClaimsBoard icin takip temizleme ve RenewalsBoard icin hizli durum gecisi aksiyonlari eklendi.

- Faz 11 ilerleme notu: CommunicationCenter context kartina assignment kapatma ve call note takip temizleme aksiyonlari eklendi.

- Faz 11 tamamlandi: Takip SLA backend payload, dashboard paneli, drill-down, query senkronu ve closure aksiyonlari tamamlandi. Yeni aktif odak Faz 12.

- Faz 12 ilerleme notu: AT Access Log mutation audit icin genisletildi; quick create service create/edit/delete operasyonlari action summary ve decision context ile kaydediliyor.

- Faz 12 ilerleme notu: Admin job dispatch ve campaign execution akislari action=Run, action_summary ve decision_context ile audit zincirine baglandi.

- Faz 12 ilerleme notu: Access & Audit Logs ekrani aksiyon bazli audit ozet kartlari ve reference_doctype/reference_name uzerinden hedef kayda panel gecisi ile operasyonel hale getirildi.

- Faz 12 ilerleme notu: AT Access Log detail ekrani action_summary ve decision_context alanlarini Audit Baglami / Karar ve Eylem kartlariyla okunur hale getirecek sekilde guclendirildi.

- Faz 12 ilerleme notu: Access & Audit Logs operatorlugu Create/Edit/Delete/Run presetleri, action select filtresi ve viewed_on tabanli varsayilan audit siralamasi ile hizlandirildi.

- Faz 12 tamamlandi: AT Access Log mutation/run audit omurgasi, Access & Audit Logs operasyon ekranı, detail okunurlugu ve hazir action presetleri tamamlandi. Yeni aktif odak Faz 13.

- Faz 13 ilerleme notu: Policy 360 dokuman katmani acildi; document_profile backend ozeti ve PolicyDetail dokuman sekmesinde toplam/PDF/gorsel/tablo/diger ile son yukleme gorunurlugu eklendi.

- Faz 13.2 tamamlandi: Claim tarafinda dokuman sayisi ve son yukleme sinyali ClaimsBoard ekranina tasindi; test zinciri claim file resource ile hizalandi.

- Faz 13.3 tamamlandi: Claim satirindan dosya paneline filtreli drill-down acildi; Files aux yuzeyi ve route-query filtre senkronu eklendi.

- Faz 13.4 tamamlandi: Customer 360 belge profili documents payload uzerinden ekrana tasindi; CustomerDetail icinde dokuman ozeti kartlari ve files-list drill-down acildi, sayfa testi ile sabitlendi.

- Faz 13.5 tamamlandi: PolicyDetail dokuman sekmesine filtreli files-list drill-down eklendi; Policy 360 belge operasyonu policy, claim ve customer tarafinda simetrik hale yaklasti.

- Faz 13.6 tamamlandi: Files aux yuzeyi dosya tipi ozet kartlari, customer/policy/claim baglanti sayaclari ve hazir belge presetleri ile guclendirildi; belge merkezi operasyonel tarama ekranina donustu.

- Faz 13.7 tamamlandi: Files aux panel aksiyonu attached_to_doctype/attached_to_name bagli hedef kayda gider hale getirildi.
- Faz 13 tamamlandi: Policy 360 ve Customer 360 document profile, claim document summary, files drill-down, files aux operatorlugu ve belge merkezi preset/ozet kartlari tamamlandi. Yeni aktif odak Faz 14.
- Faz 14 basladi: `AT Task` veri modeli, quick create ve aux workbench omurgasi acildi; `Dashboard` gunluk sekmesine `Benim Gorevlerim / My Tasks` paneli ve ilk backend/frontend kontrat testleri eklendi.

- Faz 14 ilerleme notu: Dashboard ve task aux listesinde task lifecycle hizli aksiyonlari (Start/Block/Done/Cancel) acildi ve sayfa testine mutation kontrati eklendi.
- Faz 14 ilerleme notu: Ikinci is modeli olarak AT Activity veri modeli, quick create/service omurgasi, activities aux yuzeyi ve ilk backend kontrat testi eklendi.

## Guncelleme - Faz 14.3
- Customer 360 payload artik activities listesi de donuyor.
- CustomerDetail ekraninda aktiviteler bolumu ve sayfa testi eklendi.


## Guncelleme - Faz 14.4
- Policy 360 payload ve PolicyDetail ekranina aktiviteler eklendi.


## Guncelleme - Faz 14.5
- Dashboard icinde Benim Aktivitelerim paneli ve detay route entegrasyonu eklendi.


## Kapanis - Faz 14
- Faz 14 tamamlandi.
- Kalan not: devam noktasi Faz 15 veya AT Reminder veri katmani.


- 2026-03-10: Faz 15 reminder gorunurlugu CommunicationCenter prefill ve test sozlesmesi ile genisletildi.

- 2026-03-10: Faz 15 reminder hizli aksiyonlari CustomerDetail ve PolicyDetail yuzeylerine eklendi.

- 2026-03-10: Faz 15 CommunicationCenter reminder context aksiyonlari (Done/Cancelled) ve filtre secenegi eklendi.

- 2026-03-10: Faz 15 reminder aux operatorlugu open/high/done/cancelled presetleri ve ozet kartlari ile tamamlandi.

- 2026-03-10: Faz 15 tamamlandi. Faz 16 oncesi kullanici onayi bekleniyor.


- 2026-03-10: Faz 15 reminder operatorlugu AuxWorkbench.test.js ile test sertlestirme turu aldi; reminder ozet kartlari ve Done hizli aksiyonu test altina alindi.
