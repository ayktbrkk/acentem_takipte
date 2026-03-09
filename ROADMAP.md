# Acentem Takipte - Yol Haritas� (v1)

**Referans:** 26 May�s 2026 tarihinde yap�lan kalite ve g�venlik incelemesi ��kt�lar�na g�re haz�rlanm��t�r.

## Ama�
Repoyu end�stri standartlar�nda g�venli, �l�eklenebilir ve s�rd�r�lebilir hale getirmek; �nce g�venlik ve b�t�nl�k risklerini kapatmak, ard�ndan mimari/performans/deneyim iyile�tirmeleri yapmak.

## Uygulama Durumu (G�ncel)

### Son Durak / Kald���m Yer
- **Aktif dalga:** **Dalga 1 � G�venlik, Yetkilendirme ve Eri�im Kontratlar�**
- **Mevcut odak:** **Faz 4 Customer 360 ve Productized Policy Foundation; backend Customer 360 payload service + API endpoint iskeleti tamamlandi; CustomerDetail.vue tek payload entegrasyonu, odeme/hasar/yenileme bloklari, segment/skor, capraz satis ve related customer ilk turu alindi; `AT Customer Relation` ve `AT Insured Asset` ile ilk baglanti veri modeli acildi; relation/asset akislarinin test kapsami eklendi; segment/skor backend kurali aktif police, premium, hasar, geciken odeme ve iptal gecmisi ile genisletildi; yeni skor alanlari UI kartlarinda gorunur hale getirildi; sonraki adim relation/asset delete akisini acmak**.

### Tamamlanan Mod�l (Bu Tur)
- `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_kpis.py`
  - `period_comparison` tabanl� kar��la�t�rma penceresi ��z�m�
  - KPI kartlar� i�in `comparison.cards` ve `comparison.delta` �retimi
- `acentem_takipte/acentem_takipte/api/dashboard.py`
  - `get_dashboard_kpis` i�inde `period_comparison`, `compare_from_date`, `compare_to_date` ge�i�i
  - bo� payload kontrat�na `comparison` alan�
- `acentem_takipte/acentem_takipte/tests/test_dashboard_contract_smoke.py`
  - `comparison` alan� kontrat testi
- `acentem_takipte/acentem_takipte/tests/test_dashboard_wave4_builders.py`
  - builder seviyesinde previous-period delta testi
- `frontend/src/pages/Dashboard.vue`
  - KPI kartlar�na `period_comparison` �a�r�s� ve comparison hint fallback ba�land�
- `acentem_takipte/acentem_takipte/services/report_registry.py`
  - `agent_performance` raporu i�in scorecard kolonlar� geni�letildi
- `acentem_takipte/acentem_takipte/services/reporting.py`
  - �al��an bazl� karne i�in d�n���m/yenileme ba�ar� metrikleri eklendi
- `frontend/src/pages/Reports.vue`
  - yeni karne kolon etiketleri ve y�zde formatlamas�
- `acentem_takipte/acentem_takipte/tests/test_reporting_service.py`
  - agent performance SQL s�zle�mesi geni�letildi
- `acentem_takipte/acentem_takipte/tests/test_report_registry.py`
  - report registry kolon kontrat� testi
- `acentem_takipte/acentem_takipte/services/reporting.py`
  - m��teri segmentasyonu i�in claim ge�mi�i ve sadakat segmenti k�r�l�mlar�
- `frontend/src/pages/Reports.vue`
  - segmentasyon raporu i�in temsilci filtresi ve yeni kolon etiketleri
  - agent performance ve customer segmentation i�in rapor-�zel summary kartlar�
- `acentem_takipte/acentem_takipte/api/reports.py`
  - `get_scheduled_report_configs`
  - `save_scheduled_report_config`
  - `remove_scheduled_report_config`
  - `_build_report_payload_safe` hata sarma
- `frontend/src/pages/Reports.vue`
  - System Manager / Administrator i�in �Zamanlanm�� Raporlar� alan�
  - `scheduledReports`, `scheduledLoading`, `scheduledRunLoading` state�leri
  - listelendirme, manuel tetikleme, hata g�sterimi
- `frontend/src/components/reports/ScheduledReportsManager.vue`
  - create/update/delete form ak���
  - client-side validation ve silme onay�
- `frontend/src/components/reports/ScheduledReportsManager.test.js`
  - validation, save emit ve delete confirmation testleri
- `acentem_takipte/acentem_takipte/tests/test_reports_scheduled_configs.py`
  - endpoint summary, CRUD �a�r�lar� ve normalizasyon testleri
- `acentem_takipte/acentem_takipte/services/scheduled_reports.py`
  - outbox queue sonucu i�in `queued/failed/outboxes` �zeti
- `acentem_takipte/acentem_takipte/tasks.py`
  - queued scheduled report outbox kay�tlar�n� ayn� job i�inde dispatch etme
- `acentem_takipte/acentem_takipte/tests/test_scheduled_reports.py`
  - outbox queue ba�ar�/ba�ar�s�zl�k �zet testleri
- `acentem_takipte/acentem_takipte/tests/test_tasks_scheduled_reports.py`
  - scheduled job i�i outbox dispatch �zeti testi
- `acentem_takipte/acentem_takipte/tests/test_reports_api.py`
  - getter auth/permission zinciri `build_report_payload` s�zle�mesine ta��nd�
  - `agent_performance` ve `customer_segmentation` export contract testleri eklendi
  - `_build_report_payload_safe` limit normalizasyonu test alt�na al�nd�
- `acentem_takipte/acentem_takipte/api/dashboard.py`
  - `_get_scoped_policy_names(...)` request-scope cache helper'i eklendi
  - renewal card, renewal preview ve renewal bucket ak��lar�ndaki tekrar eden `AT Policy` name sorgular� tek cache alt�nda topland�
  - `_get_request_cache_bucket(...)` ile cards, trend, renewal bucket ve reconciliation summary hesaplar� request-cache alt�na al�nd�

### En Son B�rak�lan Nokta (Sonraki Hamle)
- Dalga 7 kullan�c� karar�yla tamamland� olarak kapat�ld�
- Dalga 1 i�inde Gorev 1.1 rol/oturum dok�mantasyonu ve regression checklist tamamland�
- `reports.py`, `quick_create.py`, `admin_jobs.py`, `communication.py`, `accounting.py`, `seed.py`, `smoke.py` auth kontrat matrisi ��kar�ld� ve helper diline hizaland�
- Ortak karar:
  - read -> `assert_read_access`
  - mutation -> `assert_mutation_access`
  - doc-level -> `assert_doc_permission`
  - demo/smoke -> feature-flag + create/delete ayr�m�
- Faz 1.3 ilk uygulama dilimi tamamland�:
  - `utils/logging.py` i�ine `build_redacted_log_message(...)` ve `log_redacted_error(...)` eklendi
  - hassas anahtar s�zl��� recipient/policy/tax varyasyonlar�yla geni�letildi
  - `api/reports.py`, `communication.py`, `services/scheduled_reports.py`, `accounting.py` hata loglar� redacted helper'a ta��nd�
  - `tests/test_logging_redaction.py` ve `tests/test_reports_api.py` kontrat� geni�letildi
- Faz 1.3 ikinci uygulama dilimi tamamland�:
  - `notifications.py`, `doctype/at_claim/at_claim.py`, `doctype/at_policy/at_policy.py`, `doctype/at_renewal_task/at_renewal_task.py` notification/controller hata zinciri redacted helper'a ta��nd�
  - `providers/whatsapp_meta.py` provider dispatch hata logu structured redaction format�na �ekildi
  - operasyonel PII ta��yabilecek ham `frappe.log_error(...)` y�zeyleri temizlendi
- Faz 1.3 ���nc� uygulama dilimi tamamland�:
  - `api/dashboard.py` access log fetch error redacted helper'a ta��nd�
  - `doctype/at_customer/at_customer.py` customer access log error redacted helper'a ta��nd�
  - `utils/assets.py` teknik altyap� istisnas� olarak ayr�ld�
- Faz 1.3 plan seviyesinde kapat�ld�
- Faz 2.1 ilk uygulama dilimi tamamland�:
  - `dashboard.py` i�inde request-scope policy cache eklendi
  - renewal kartlar�, renewal preview ve renewal bucket hesaplar�nda tekrar eden policy lookup azalt�ld�
- Faz 2.1 ikinci uygulama dilimi tamamland�:
  - cards, commission trend, renewal bucket ve reconciliation summary hesaplar� request-cache ile tekrar kullan�l�r hale getirildi
- Faz 2.1 sorgu envanteri ��kar�ld�:
  - s�cak tablolar: `AT Policy`, `AT Payment`, `AT Renewal Task`, `AT Claim`, `AT Lead`, `AT Reconciliation Item`
  - composite index adaylar� belirlendi
  - kalan maliyet oda�� raw SQL aggregate ve preview sorgular� olarak netle�ti
- Faz 2.1 ���nc� uygulama dilimi tamamland�:
  - `acentem_takipte/patches.txt`
  - `acentem_takipte/acentem_takipte/patches/v2026_03_09_add_dashboard_hot_path_indexes.py`
  - ilk hot-path composite index seti migration patch'i olarak eklendi
- Faz 2.1 d�rd�nc� uygulama dilimi tamamland�:
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_kpis.py`
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/tab_payload.py`
  - tekrar eden `where/value` �retimleri yerel cache ile sadele�tirildi
- Faz 2.1 be�inci uygulama dilimi tamamland�:
  - `acentem_takipte/patches.txt`
  - `acentem_takipte/acentem_takipte/patches/v2026_03_09_add_dashboard_secondary_indexes.py`
  - insurance company, policy/status ve reconciliation desenleri icin ikinci index patch'i eklendi
- Faz 2.1 plan seviyesinde kapat�ld�:
  - request-cache
  - where/value cache
  - iki asamali dashboard index patch seti
- Faz 2.2 ilk envanter cikarildi:
  - `tasks.py` icinde enqueue edilen ve senkron kalan agir bloklar ayrildi
  - `hooks.py` icinde scheduler/doc-event tetikleyici frekanslari ve fan-out riski notlandi
- Faz 2.2 ilk refaktor tamamland�:
  - `acentem_takipte/acentem_takipte/tasks.py`
  - scheduled report outbox dispatch ayni job icinden cikarilip ayri queue fan-out modeline tasindi
  - `outbox_enqueued` ve `outbox_queue_failed` ozeti eklendi
- Faz 2.2 ikinci refaktor tamamland�:
  - `acentem_takipte/acentem_takipte/accounting.py`
  - `sync_doc_event` inline muhasebe senkronundan queue + debounce modeline tasindi
  - ayni belge icin kisa sureli tekrar update'ler tek job'a indirildi
- Faz 2.2 plan seviyesinde kapat�ld�:
  - scheduled reports fan-out
  - accounting doc-event debounce
  - queue/idempotency riskleri ilk turda sertlestirildi
- Faz 2.3 ilk envanter baslatildi:
  - `frontend/src/pages/Reports.vue`
  - `frontend/src/pages/Dashboard.vue`
- Faz 2.3 ilk uygulama dilimi tamamland�:
  - `frontend/src/pages/Dashboard.vue`
  - tab/range/branch degisimleri `300ms` debounced reload kapisina toplandi
  - manuel refresh ve create-lead sonrasi yenileme anlik birakildi
- Faz 2.3 ikinci uygulama dilimi tamamland�:
  - `frontend/src/pages/Reports.vue`
  - branch ve report key degisimi `300ms` debounce ile toplandi
  - manuel apply/refresh/export akislarina dokunulmadi
- Faz 2.3 plan seviyesinde kapat�ld�
- Faz 3.1 ilk uygulama dilimi tamamland�:
  - `acentem_takipte/acentem_takipte/services/quick_create.py`
  - `create_quick_customer`, `create_quick_lead`, `create_quick_policy` persistence bolumu service katmanina tasindi
  - `api/quick_create.py` bu akislar icin delegation modeline cekildi
- Faz 3.1 ikinci uygulama dilimi tamamland�:
  - `claim`, `payment`, `renewal_task` quick create akislarinin persistence bolumu de `services/quick_create.py` altina tasindi
  - ilk alti operasyonel quick create endpoint'i service delegation modeline gecmis oldu
- Faz 3.1 ���nc� uygulama dilimi tamamland�:
  - `services/quick_create.py` icinde ortak `_insert_doc(...)` helper'i eklendi
  - `update_quick_aux_record` persistence bolumu de service katmanina devredildi
- Faz 3.1 ara karari yazildi:
  - request parsing, field normalization ve link validation API katmaninda kalacak
  - persistence ve sonuc sozlesmesi service katmaninda kalacak
  - sonraki extraction adaylari: `api/reports.py`, `api/admin_jobs.py`, `api/accounting.py`
- Faz 3.1 dorduncu uygulama dilimi tamamland�:
  - `acentem_takipte/acentem_takipte/services/reports_runtime.py`
  - `api/reports.py` icindeki payload build/export/config orchestration service katmanina tasindi
- Faz 3.1 besinci uygulama dilimi tamamland�:
  - `acentem_takipte/acentem_takipte/services/admin_jobs.py`
  - `api/admin_jobs.py` icindeki action routing / dispatch mapping service katmanina tasindi
- Faz 3.1 altinci uygulama dilimi tamamland�:
  - `acentem_takipte/acentem_takipte/services/accounting_runtime.py`
  - `api/accounting.py` icindeki reconciliation workbench read orchestration service katmanina tasindi
- Faz 3.1 plan seviyesinde kapat�ld�:
  - quick_create
  - reports runtime
  - admin_jobs dispatch
  - accounting runtime
  extraction dilimleri tamamlandi
- Faz 3.2 ilk envanter baslatildi:
  - report getter/export endpoint ciftleri
  - admin/accounting mutation access wrapper kaliplari
  - quick_create normalization yardimcilari
- Faz 3.2 ilk uygulama dilimi tamamland�:
  - `api/reports.py`
  - report getter/export endpoint ciftleri ortak helper altinda toplandi
- Faz 3.2 ikinci uygulama dilimi tamamland�:
  - `acentem_takipte/acentem_takipte/api/mutation_access.py`
  - `api/admin_jobs.py` ve `api/accounting.py` icindeki write-mutation wrapper deseni ortak helper altinda toplandi
- Faz 3.2 karar notu yazildi:
  - `quick_create.py` normalization yardimcilari request-contract ve doctype-ozel validation bagimliligi nedeniyle API katmaninda birakildi
- Faz 3.2 plan seviyesinde kapat�ld�
- Faz 3.3 ilk uygulama dilimi tamamland�:
  - `acentem_takipte/acentem_takipte/utils/financials.py`
  - `AT Offer` ve `AT Policy` finans tutarlilik dogrulamasi ortak helper altina tasindi
- Faz 3.3 ikinci uygulama dilimi tamamland�:
  - `acentem_takipte/acentem_takipte/utils/commissions.py`
  - `commission_amount` kanonik alan olarak sabitlendi
  - Python tarafindaki legacy `commission` fallback'leri helper arkasina alindi
  - `accounting.py` ve `doctype/at_offer/at_offer.py` bu helper'a hizalandi
- Faz 3.3 ucuncu uygulama dilimi tamamland�:
  - `utils/commissions.py` altina `commission_sql_expr(...)` eklendi
  - `api/dashboard.py`, `api/dashboard_v2/queries_kpis.py`, `services/reporting.py` icindeki sicak SQL fallback ifadeleri ortak helper'a tasindi
- Faz 3.3 dorduncu uygulama dilimi tamamland�:
  - `api/seed.py` ve `api/smoke.py` demo payload'lari `commission_amount` alanina cekildi
  - `doctype/at_policy_endorsement/at_policy_endorsement.py` legacy `commission` payload'ini kabul etmeye devam ederken policy uzerinde aynalama helper'i ile normalize edildi
- Faz 3.3 besinci uygulama dilimi tamamland�:
  - `utils/statuses.py` altinda lead/policy/claim/renewal/accounting icin `VALID` sabitleri genisletildi
  - `api/quick_create.py` icindeki literal status setleri merkezi enum sabitlerine baglandi
- Faz 3.3 altinci uygulama dilimi tamamland�:
  - `utils/notes.py` altina `normalize_note_text(...)` eklendi
  - `api/quick_create.py` icindeki tekrar eden notes trim/none deseni ortak helper'a tasindi
  - `accounting.py` icindeki reconciliation notes uzunluk kisiti ayni helper ile normalize edildi
- Faz 3.3 plan seviyesinde kapat�ld�:
  - finans, commission, status ve notes alanlarindaki tekrar eden domain kurallari ortak helper/sabit altina toplandi
  - bilincli istisna: DocType JSON seviyesindeki legacy `commission` alan� backward compatibility icin korunuyor
- Faz 3.4 ilk uygulama dilimi tamamland�:
  - `renewal/service.py`, `renewal/pipeline.py`, `renewal/telemetry.py` eklendi
  - `tasks.py` icindeki renewal task create job orchestration'i pipeline katmanina tasindi
  - `doctype/at_renewal_task/at_renewal_task.py` icindeki unique key ve notification side-effect'i renewal service/pipeline altina cekildi
- Faz 3.4 ikinci uygulama dilimi tamamland�:
  - stale renewal task remediation servisi ve job'u eklendi
  - `AT Renewal Task` status transition guard'i merkezilestirildi
  - `admin_jobs.py` ve `hooks.py` stale remediation job'unu gorebilir/tetikleyebilir hale geldi
- Faz 3.4 ucuncu uygulama dilimi tamamland�:
  - yeni `AT Renewal Outcome` DocType eklendi
  - `AT Renewal Task` uzerine `outcome_record` baglantisi eklendi
  - terminal renewal task statulerinde outcome sync iskeleti eklendi
- Dil/locale uyumluluk notu:
  - DocType JSON field label ve description alanlarinda mevcut uygulama deseni korunacak
  - `Kullan�c� Notu` / `Sistem Notu` gibi mevcut T�rk�e alan adlari yeni DocType'larda ayni sekilde devam edecek
  - backend exception ve teknik mesajlar mod�l�n mevcut dili neyse onunla tutarl� kalacak; bozuk encoding (`�`, `�`) kabul edilmeyecek
- S�radaki i�: lost reason / competitor alanlarini UI ve job akislariyla beslemek, ardindan retention metri�ini dashboard'a ba�lamak
### Faz 16 Smoke Checklist (Aktif Haz�rl�k)
- `Reports.vue`
  - policy list, payment status, renewal performance, claim loss ratio ekran y�klenmesi
  - `agent_performance` ve `customer_segmentation` summary kartlar�n�n veriyle a��lmas�
  - scheduled reports admin alan�n�n yaln�zca `System Manager` / `Administrator` i�in g�r�nmesi
- `api/reports.py`
  - t�m report getter endpoint'lerinde `report_key`, `columns`, `rows`, `filters` s�zle�mesi korunmal�
  - export endpoint'lerinde `filename`, `filecontent`, `type`, `content_type` download s�zle�mesi korunmal�
- `services/scheduled_reports.py` + `tasks.py`
  - scheduled run sonras� outbox �zet alanlar� (`queued`, `failed`, `outbox_sent`, `outbox_failed`) beklenen payload ile d�nmeli
- `api/dashboard_v2/queries_kpis.py` + `frontend/src/pages/Dashboard.vue`
  - KPI comparison kartlar� previous-period verisini bozmadan g�stermeli

### Faz 16 Manuel Do�rulama Notlar�
- Normal operasyon kullan�c�s� ile `/at` alt�nda rapor ekran� a��l�r:
  - rapor filtresi �al���r
  - tablo y�klenir
  - export aksiyonu g�r�n�r
  - scheduled report admin paneli g�r�nmez
- Admin kullan�c� ile `/at` alt�nda rapor ekran� a��l�r:
  - scheduled report listesi g�r�n�r
  - create/update/delete ak��� form seviyesinde do�rulan�r
  - manual run aksiyonu hata vermeden summary yeniler
- Dashboard ekran�nda tarih aral��� de�i�ti�inde:
  - comparison hint metni do�ru moda g�re de�i�ir
  - KPI kartlar� bo� veya k�r�k state'e d��mez

### Faz 16 Smoke Bulgular� (09 Mart 2026)
- `http://localhost:8080/at`
  - anonim kullan�c� i�in `301 -> /login?redirect-to=/at`
  - sonu�: route korumas� aktif, authenticated smoke gerekir
- `get_session_context`
  - anonim �a�r�da `403 FORBIDDEN`
  - sonu�: session endpoint guest eri�imine kapal�
- `get_policy_list_report`
  - anonim �a�r�da `403 FORBIDDEN`
  - sonu�: report endpoint auth korumas� aktif
- **Blokaj:** ger�ek UI smoke ak��� i�in giri� yap�lm�� operasyon ve admin oturumu gerekiyor
- **Sonraki ad�m:** authenticated session ile checklist maddelerini uygulamak

### Faz 16 Test Ko�um S�ras�
1. Backend s�zle�me testleri
   - `acentem_takipte/acentem_takipte/tests/test_reports_api.py`
   - `acentem_takipte/acentem_takipte/tests/test_reporting_service.py`
   - `acentem_takipte/acentem_takipte/tests/test_report_registry.py`
2. Scheduled report ak���
   - `acentem_takipte/acentem_takipte/tests/test_reports_scheduled_configs.py`
   - `acentem_takipte/acentem_takipte/tests/test_scheduled_reports.py`
   - `acentem_takipte/acentem_takipte/tests/test_tasks_scheduled_reports.py`
3. Dashboard kar��la�t�rma regresyonu
   - `acentem_takipte/acentem_takipte/tests/test_dashboard_contract_smoke.py`
   - `acentem_takipte/acentem_takipte/tests/test_dashboard_wave4_builders.py`
4. Frontend bile�en do�rulamas�
   - `frontend/src/components/reports/ScheduledReportsManager.test.js`
5. Son ad�m manuel smoke
   - `Reports.vue`
   - `Dashboard.vue`

### Faz 16 Kapan�� Kriteri
- Rapor endpoint s�zle�meleri backend testleriyle korunmu� olmal�
- Scheduled reports admin g�r�n�rl��� ve outbox �zeti regression kapsam�na al�nm�� olmal�
- Dashboard comparison ve rapor summary kartlar� manuel smoke listesinde do�rulanm�� olmal�
- Dalga 7 takip dosyalar�nda aktif i� yerine kapan�� ad�m� g�r�nmeli

## Yol Haritas� (�ncelik S�ras�na G�re)

### Faz 1 � G�venlik ve Yetkilendirme �stikrar�

#### 1.1 API yetkilendirme s�zle�mesini tekille�tir
- **Durum:** Plan
- **�ncelik:** Y�ksek
- **Efor:** 12 saat
- **Kapsam:**
  - `acentem_takipte/api/security.py`
  - `acentem_takipte/api/session.py`
  - `acentem_takipte/api/communication.py`
  - `acentem_takipte/api/quick_create.py`
- **Ama�:** T�m whitelisted endpoint'lerde
  - Kimlik do�rulama (`Guest` reddi)
  - Rol/izin kontrol� (`doctype` + `permtype`)
  - Metot k�s�tlamas� (write-only i�in POST)
  - Tutarl� hata/silindir/yan�t format�
  uygulamak.
- **Kabul Kriterleri:**
  - `allow_guest=True` olmayan endpoint say�s� do�rulan�r.
  - Her mutasyon endpointinde en az bir action-level izin kontrol� olur.
  - �Sadece oturum a��k� kontrol� ile �do�ru izne sahip� kontrol� net ayr�l�r.

#### 1.2 `ignore_permissions=True` kullan�m�n� g�venli hale getir
- **Durum:** Plan
- **�ncelik:** Y�ksek
- **Efor:** 10 saat
- **Kapsam:**
  - `acentem_takipte/api/quick_create.py`
  - `acentem_takipte/api/seed.py`
  - `acentem_takipte/api/smoke.py`
  - `acentem_takipte/doctype/*`
- **Ama�:** `ignore_permissions=True` yaln�zca kontroll�, teknik zorunlulukl� ve denetimli noktalarda kalmal�.
- **Kabul Kriterleri:**
  - Her `ignore_permissions=True` sat�r� i�in i� gerek�esi ve g�venlik kontrol� belgelenecek.
  - Gereksiz kullan�m kald�r�l�r veya sistem izni ile de�i�tirilir.
  - Denetim notlar� ve kod yorumlar�yla izlenebilirlik sa�lan�r.

#### 1.3 Loglama redaksiyonunu zorunlu hale getir
- **Durum:** Tamamland�
- **�ncelik:** Y�ksek
- **Efor:** 8 saat
- **Kapsam:**
  - `acentem_takipte/api/security.py`
  - backend servis loglama katman�
- **Ama�:** TC kimlik no, poli�e no gibi hassas alanlar�n loglara yaz�lmamas�.
- **Kabul Kriterleri:**
  - `tc_kimlik_no`, `policy_no`, `iban`, `telefon`, `email` alanlar� maskelenir.
  - Uygulanan redaksiyon i�in test ve �rnek log kontrol� eklenir.

---

### Faz 2 � Performans ve Sorgu Sa�l���

#### 2.1 Dashboard ve yo�un sorgular�n profilini ��kar ve optimize et
- **Durum:** Tamamland�
- **�ncelik:** Y�ksek
- **Efor:** 16 saat
- **Kapsam:**
  - `acentem_takipte/api/dashboard.py`
  - `acentem_takipte/api/dashboard_v2/queries_kpis.py`
  - `acentem_takipte/api/dashboard_v2/tab_payload.py`
- **Ama�:** `frappe.db.sql` kullan�lan kritik noktalarda
  - Filtre indeksleri
  - Sorgu tekrar�n� azaltma
  - �nbellek stratejisi
  ile performans kazan�m� sa�lamak.
- **Kabul Kriterleri:**
  - En az 5 kritik dashboard endpointi i�in sorgu say�s� d���r�l�r.
  - B�y�k rapor sorgular� i�in limit/offset ve index uyumu eklenir.
  - �lgili alanlar i�in index listesi dok�mante edilir.

#### 2.2 Arkaplan i�lerini kuyruk stratejisine oturt
- **Durum:** Tamamland�
- **�ncelik:** Orta
- **Efor:** 8 saat
- **Kapsam:**
  - `acentem_takipte/tasks.py`
  - `hooks.py` scheduler
- **Ama�:** Uzun s�ren i�lemler i�in senkron i�leme yerine enqueue standard�n� art�rmak.
- **Kabul Kriterleri:**
  - 2 sn�den uzun s�ren i�lemlerden en az biri queue�ya al�n�r.
  - Job ba��na idempotent davran�� ve hata logu eklenir.

#### 2.3 Frontend veri �a�r�lar�n� debounced hale getir
- **Durum:** Tamamland�
- **�ncelik:** Orta
- **Efor:** 6 saat
- **Kapsam:**
  - `frontend/src` i�inde list filtreleme ak��lar�
- **Ama�:** Arama, filtre ve otomatik yenileme call�lar�n� throttle/debounce etmek.
- **Kabul Kriterleri:**
  - UI'da arama inputuna her yaz�mda request patlamas� olmaz.
  - 300ms debounce ile en az bir �rnekte �l��lebilir istek azal���.

---

### Faz 3 � Mimari ve Kod Kalitesi

#### 3.1 Servis katman� ve izin katman�n� ay�r
- **Durum:** Plan
- **�ncelik:** Orta
- **Efor:** 14 saat
- **Kapsam:**
  - `acentem_takipte/api/quick_create.py`
  - `acentem_takipte/doctype/*`
  - Yeni: `acentem_takipte/services/*`
- **Ama�:** API handler��n� �HTTP + do�rulama� ile s�n�rlay�p i� mant���n� servislere ta��mak.
- **Kabul Kriterleri:**
  - En az 3 endpoint i� mant��� service katman�na ta��n�r.
  - Service fonksiyonlar� test edilebilir ve ba��ms�z hale gelir.

#### 3.2 DRY ve g�venli yard�mc� katman
- **Durum:** Plan
- **�ncelik:** Orta
- **Efor:** 10 saat
- **Kapsam:**
  - `acentem_takipte/api/*` (auth/helper tekrarlar�)
  - Yeni: `acentem_takipte/utils/permissions.py`
- **Ama�:** Yetki, validasyon ve audit yard�mc�lar�n� tekille�tirerek tekrarlar� azaltmak.
- **Kabul Kriterleri:**
  - En az 5 endpoint�in ortak g�venlik ak��� standart fonksiyona al�n�r.
  - Tekille�tirme sonras� kod okunabilirli�i artar, duplicate kontrol� azal�r.

#### 3.2.1 Frontend Pinia store mimarisini yeniden tasarla
- **Durum:** Plan
- **�ncelik:** Y�ksek
- **Efor:** 12 saat
- **Kapsam:**
  - `frontend/src/stores`
  - `frontend/src/composables`
  - `frontend/src/api`
  - `frontend/src/views` / `frontend/src/components`
- **Ama�:** Component odakl� da��n�k state y�netimini domain bazl�, test edilebilir ve merkezi Pinia mimarisine ta��mak.
- **Kabul Kriterleri:**
  - Store katmanlar� `domain` ayr�m�nda yeniden grupland�r�l�r:
    - `auth`, `dashboard`, `policy`, `claim`, `communication`, `accounting`
  - API yan etkileri yaln�zca store action�lar�ndan y�r�t�l�r; component i�inde do�rudan `fetch`/raw axios kullan�m�n� minimize eder.
  - Liste/sayfa state�leri i�in tek bir `loading/error/loaded` pattern�i standardize edilir.
  - `getters` ile t�retilmi� hesaplamalar (k�m�latif say�lar, filtrelenmi� listeler) store i�inde toplan�r.
  - `Pinia plugin` ile route veya toast gibi d�� etkilerden izole test edilebilir bir mimari olu�turulur.
  - Mevcut kritik 3 frontend ak��� i�in (en az bir dashboard, one form, bir modal/queue flow) store ak�� diyagram� ve migration plan� tamamlan�r.

#### 3.3 DocType �ema normalizasyonu (veri modeli)
- **Durum:** Devam Ediyor
- **Uygulama Durumu:** 1. ve 2. alt maddeler i�in uygulama tamamland�
- **�ncelik:** Y�ksek
- **Efor:** 14 saat
- **Kapsam:**
  - `acentem_takipte/doctype/at_offer/at_offer.json` (sat�r 1-122)
  - `acentem_takipte/doctype/at_policy/at_policy.json` (sat�r 1-194)
  - `acentem_takipte/doctype/at_claim/at_claim.json` (sat�r 1-108)
  - `acentem_takipte/doctype/at_payment/at_payment.json` (sat�r 1-134)
  - `acentem_takipte/doctype/at_renewal_task/at_renewal_task.json` (sat�r 1-84)
  - `acentem_takipte/doctype/at_policy_endorsement/at_policy_endorsement.json` (sat�r 1-124)
  - `acentem_takipte/doctype/at_policy_snapshot/at_policy_snapshot.json` (sat�r 1-100)
  - `acentem_takipte/doctype/at_customer/at_customer.json` (sat�r 1-129)
  - `acentem_takipte/doctype/at_lead/at_lead.json` (sat�r 1-128)
  - `acentem_takipte/doctype/at_accounting_entry/at_accounting_entry.json` (sat�r 1-152)
  - `acentem_takipte/doctype/at_reconciliation_item/at_reconciliation_item.json` (sat�r 1-110)
  - `acentem_takipte/doctype/at_access_log/at_access_log.json` (sat�r 1-78)
  - `acentem_takipte/api/security.py` ve ilgili servisler
- **Ama�:** Ortak alanlar� standardize etmek ve teknik bor� alanlar�n� azaltmak.
- **Bulgular:**
  - `status` alan� 9+ DocType�ta tekrar ediyor; de�erler heterojen oldu�u i�in ad�m 1 ile merkezi enum�a ta��nd�.
  - `notes` alan�nda kullan�c�/sistem ayr�m� eksikti; ad�m 2 ile kullan�c� notlar� etiketlendi, sistem notu �rne�i `AT Policy Snapshot` i�inde ayr��t�r�ld�.
  - Finans alanlar� (`net_premium`, `tax_amount`, `commission_amount`, `gross_premium`) tekrarlan�yor; hesaplama mant��� ayr�ca controller�da �o�unlukla ayn�.
  - `AT Policy` i�inde `commission` alan� legacy olarak saklan�yor (`at_policy.json` sat�r 147-153) ve kullan�mda fallback ile birlikte i�liyor (`at_policy.py` sat�r 55, 92, 202).
  - `AT Claim` ve `AT Payment` i�inde `customer` alan� belge kayna��ndan t�retilebilirken ayr�ca saklanm�� durumda (`at_claim.json` sat�r 29-40, `at_payment.json` sat�r 45-48).
- **Kabul Kriterleri:**
  - Ad�m 1: `status` kar��la�t�rmalar� kontrol merkezine ta��narak string tekrarlar� azalt�ld� (`acentem_takipte/utils/statuses.py`).
  - Ad�m 2: `notes` alanlar� i�in anlamland�rma standartlar� eklendi; sistem notu �rne�i `AT Policy Snapshot` i�inde `Sistem Notu` olarak ayr��t�r�ld�.
  - Finans hesaplama ve validasyon mant���na tek bir yard�mc� eklenir ve `AT Offer`/`AT Policy`/`AT Policy Endorsement` ayn� do�rulama kural�n� kullan�r.
  - `commission` alan� i�in migration plan� ��kar�l�r; yeni kay�tlar i�in tek kayna�a ge�i� do�rulan�r.
  - `customer` t�retilebilir alanlar� i�in normalizasyon/performans de�erlendirmesi tamamlan�r.

#### 3.3.1 DocType gereksiz alan �n inceleme (analiz)
- **Durum:** Plan
- **�ncelik:** Orta
- **Efor:** 2 saat
- **Kapsam:**
  - `at_policy.json` (`commission`, `customer`)
  - `at_claim.json` (`customer`)
  - `at_payment.json` (`customer`)
- **Ama�:** Bu alanlar�n kal�c�l�k gereklili�ini ve veri b�t�nl��� etkisini belgelemek.
- **Kabul Kriterleri:**
  - Belirlenen her alanda:
    - �retim raporu (kullan�m s�kl���)
    - T�retim maliyetine etkisi
    - Migration veya geriye d�n�k uyumluluk riski
  - envanteri ��kar�l�r.

#### 3.4 Poli�e yenileme ak���n� ba�tan yaz (yeniden mimari)
- **Durum:** Plan
- **�ncelik:** Y�ksek
- **Efor:** 18 saat
- **Kapsam:**
  - `acentem_takipte/tasks.py`
  - `acentem_takipte/doctype/at_renewal_task/at_renewal_task.py`
  - `public/js/at_renewal_task.js`
  - `acentem_takipte/api/quick_create.py`
  - `acentem_takipte/api/admin_jobs.py`
  - `acentem_takipte/api/dashboard.py`
  - `public/frontend/assets` i�inde yenileme ekranlar�n� besleyen bile�en/state u�lar�
- **Ama�:** Mevcut �deadline tabanl� g�revlendirme + manuel m�dahale� modelini; durum makinesi + servis katman� + idempotent kuyruk tetikleyicisi ile tekrar kullan�labilir hale getirmek.
- **�nerilen Mimari:**
  - **Teknik katman ayr�m�:**
    - `renewal/service.py`: politika se�imi, pencere (due/renewal hesaplama), aday �retimi, i� kurallar� (eski-g�ncel e�zamanl�l�k/tekrar �retebilirlik).
    - `renewal/pipeline.py`: ad�m bazl� ak�� (detect -> create_task -> notify -> track -> close/error).
    - `renewal/telemetry.py`: metrik + event loglar� (ne zaman, hangi policy, hangi filtre seti ile tetiklendi).
  - **Durum makinesi:**
    - `OPEN -> IN_PROGRESS -> DONE / CANCELLED`
    - Durum ge�i�leri merkezile�tirilir (tek ge�i� fonksiyonu + guard).
  - **Ayn� i�i birden fazla kaynakta tekrar etme:**
    - `unique_key` ile idempotent �retim,
    - policy bazl� dedupe (`open task` kontrol� + `locked` pencere).
  - **Task lifecycle y�netimi:**
    - Eskisi kalan/yenilenen g�revler i�in otomatik kapan�� kural�,
    - Eski tarihli tamamlanmam�� g�revlerde "stale task remediation" job�u.
  - **API g�venli�i:**
    - `api/admin_jobs.py` �zerinden sadece job-level eri�im,
    - action-level izin + doc permission birlikte.
  - **UI ak���:**
    - Form, liste ve detay ak���n� tek store event ak���na ba�layan store actionlar�,
    - stat� d�n���mleri tek kaynakta okunur.
- **Kabul Kriterleri:**
  - Yenileme ak���nda g�rev �retimi, bildirim ve tamamlanma ad�mlar� tek servis fonksiyonunda izlenebilir.
  - Ayn� `policy + due_date` i�in �ift g�rev �retimi olmuyor.
  - `Done`/`Completed` stat� uyumsuzlu�u kald�r�l�yor; frontend/backend tek bir renewal durum modeli kullan�yor.
  - Yenileme batch job�u i�in idempotent ve retry-safe test senaryosu ekleniyor (unit/integration).
  - Ba�ar�/ba�ar�s�z/atlanan g�rev i�in metrikler dashboard�a yans�t�l�yor.

---

### Faz 4 � Test G��lendirmesi

#### 4.1 Backend kritik i� ak��� integration testleri
- **Durum:** Plan
- **�ncelik:** Orta
- **Efor:** 18 saat
- **Kapsam:**
  - `acentem_takipte/tests/test_api_*.py`
  - `acentem_takipte/doctype/*/test_*.py`
- **Ama�:** Poli�e olu�turma, teklif->poli�e d�n���m�, yenileme, claim bildirim ak��lar�n� u�tan uca do�rulamak.
- **Kabul Kriterleri:**
  - Kritik 3 ak�� i�in en az 2 senaryo (yetki + ba�ar�l� ak��) eklenir.
  - CI�de bu testler fail etmeden ge�mek zorunlu olur.

#### 4.2 Frontend test kapsam�n� a�
- **Durum:** Plan
- **�ncelik:** Orta
- **Efor:** 12 saat
- **Kapsam:**
  - `frontend/tests`
  - `frontend/src/components`
- **Ama�:** Sayfa/component baz�nda unit test, form validasyon ve API state testi eklemek.
- **Kabul Kriterleri:**
  - En az 10 yeni Vue unit/ component testi.
  - E2E senaryolar�nda en az iki kritik kullan�c� yolunda regresyon korumas�.

#### 4.3 Test verisi ve CI kap�s�n� netle�tir
- **Durum:** Plan
- **�ncelik:** D���k
- **Efor:** 6 saat
- **Kapsam:**
  - `.github/workflows/backend-ci.yml`
  - `.github/workflows/frontend-ci.yml`
  - `.github/workflows/desk-free-smoke.yml`
- **Ama�:** Test ko�ullar� deterministik olsun, fail-fast ve quality gate eklenmesi.

---

### Faz 5 � CI/CD ve Operasyonel G�venlik

#### 5.1 Ba��ml�l�k y�netimini s�k�la�t�r
- **Durum:** Plan
- **�ncelik:** Orta
- **Efor:** 4 saat
- **Kapsam:**
  - `requirements.txt`
  - `pyproject.toml`
  - `setup.py`
- **Ama�:** Versiyon pinning ve geri d�n���ml� kurulum g�venli�ini artt�rmak.
- **Kabul Kriterleri:**
  - Ba��ml�l�klar pinlenir veya benzer izlenebilir strateji belirlenir.
  - `pip check`/g�venlik tarama ad�m� eklenir.

#### 5.2 CI g�venlik kontrollerini ekle
- **Durum:** Plan
- **�ncelik:** Orta
- **Efor:** 6 saat
- **Kapsam:**
  - `.github/workflows/backend-ci.yml`
  - `.github/workflows/frontend-ci.yml`
- **Ama�:** Secret leakage, dependency audit ve temel SAST ad�mlar� eklemek.
- **Kabul Kriterleri:**
  - CI'da en az bir g�venlik taraftar� tarama ad�m� zorunlu.
  - Hatal� secret pattern�leri i�in otomatik fail.

---

### Faz 6 � UX ve Eri�ilebilirlik

#### 6.1 Eri�ilebilirlik standard�n� y�kselt
- **Durum:** Plan
- **�ncelik:** Orta
- **Efor:** 10 saat
- **Kapsam:**
  - `frontend/src/components`
  - `frontend/src/views`
- **Ama�:** `aria-*`, klavye navigation, `aria-busy`, odak y�netimi standartlar�n� getirmek.
- **Kabul Kriterleri:**
  - Form ve tablo aksiyonlar�nda en az 1:1 klavye eri�ilebilirli�i.
  - Kritik kontrol bile�enlerinde ekran okuyucu dostu etiketleme.

#### 6.2 Bo� durum / y�kleme durumu pattern'ini standardize et
- **Durum:** Plan
- **�ncelik:** Orta
- **Efor:** 6 saat
- **Kapsam:**
  - `frontend/src/components/EmptyState.vue`
  - Sayfa bazl� listeler
- **Ama�:** Bo� liste, bekleme ve hata durumlar�nda tutarl� kullan�c� geri bildirimi.
- **Kabul Kriterleri:**
  - 8 kritik sayfan�n t�m�nde empty/loading/error state var.
  - Mobil breakpoint testleri eklenir.

---

### Faz 7 � G�zlemlenebilirlik, Uyum ve Entegrasyon Stratejisi

#### 7.1 Observability altyap�s� (structured logging, metrics)
- **Durum:** Plan
- **�ncelik:** Y�ksek
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
- **Ama�:** T�m kritik API/job/event ak��lar�nda yap�land�r�lm�� log, standart metrik ve hata/a�ama kodu standard�n� olu�turmak.
- **Kabul Kriterleri:**
  - Her API �a�r�s�na request-id / doctype / user / action alanlar�n� ta��yan yap�land�r�lm�� log format� eklenir.
  - Admin/job endpoint�leri i�in `queue`, `job_id`, `duration_ms`, `retry_count`, `result` metrikleri standart hale getirilir.
  - Notification/accounting job�lar� i�in sent/success/fail/error oranlar� toplan�r.
  - `AT Access Log` ve `AT Notification Outbox` alanlar� �zerinden izlenebilirlik ana ak��lar� do�rulan�r.

#### 7.2 KVKK / veri ya�am d�ng�s� uyumu
- **Durum:** Plan
- **�ncelik:** Y�ksek
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
- **Ama�:** TC kimlik no, telefon, e-posta, poli�e ve i�lem kimlikleri i�in ama� s�n�rlamas�, maskelenme, saklama s�resi ve silme hakk�n� tek ak��ta ele alan bir KVKK modelini uygulamak.
- **Kabul Kriterleri:**
  - Duyarl� alanlar i�in response taraf�nda maskeli g�r�n�m zorunlu olan endpointler tan�mlan�r.
  - `tax_id`, `policy_no`, m��teri referanslar� i�in `retention_class` ve silinme s�reci dok�mante edilir.
  - KVKK audit ��kt�s�: silme/anonimle�tirme i�lemleri i�in admin onay kay�tlar� eklenir.
  - PII i�eren log ve payload �rnekleri log redaction fonksiyonuna al�n�r.

#### 7.3 API versiyonlama stratejisi
- **Durum:** Plan
- **�ncelik:** Y�ksek
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
- **Ama�:** Mevcut dashboard v2 yakla��m�n� geni�letip v1/v2 API kontrat�n� netle�tirmek; geriye uyumluluk k�rmadan client ve server taraf�n� ayr��t�rmak.
- **Kabul Kriterleri:**
  - `v1`-`v2` ayr�m�yla rota/isimlendirme standartlar� belgelenir.
  - Deprecated endpointler i�in ta��nma ve deprecation uyar� politikas� ��kar�l�r.
  - Versiyon ge�i�ini zorlayan ve koruyan en az 2 entegrasyon test senaryosu eklenir.
  - Hata format�, sayfalama ve filtre kontratlar� her iki versiyonda da net kontrat dok�man� ve test ile do�rulan�r.

#### 7.4 D�� sistem entegrasyon s�zle�meleri
- **Durum:** Plan
- **�ncelik:** Y�ksek
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
- **Ama�:** Her harici sistem �a�r�s� i�in timeout, retry, hata/ba�ar�s�zl�k e�ikleri, kimlik do�rulama, payload �emas� ve idempotency varsay�mlar�yla bir s�zle�me katman� kurmak.
- **Kabul Kriterleri:**
  - TCMB, WhatsApp provider ve hesaplama/senkronizasyon ak��lar� i�in ayr� adapter contract dosyalar� olu�turulur.
  - Site config anahtarlar� (`at_whatsapp_api_url`, `at_whatsapp_api_token`, vb.) i�in kullan�m ve fail-fast/fail-safe davran��lar� yaz�l�r.
  - `AT Accounting Entry` i�in `external_ref`, `integration_hash`, `payload_json` alanlar� kullan�m rehberi ve do�rulama testi eklenir.
  - Integration testleri timeout, rate-limit, bozuk payload ve response-parsing senaryolar�n� kapsar.

---

## Eksik Mod�l ve �zellik Analizi (v2)

### ALAN 1 � M��teri Y�netimi (360� M��teri G�r�n�m�)

**Mevcut Durum:** `AT Customer` kimlik, ileti�im, atanan acente, KVKK onay� ve klas�r yolunu tutuyor; fakat ili�kisel m��teri 360 modeli olu�turmuyor.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.json`: `links` bo�, household/yak�nlar/ara�lar/ek varl�klar i�in ili�ki alan� yok.
- `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.json`: m��teri segmenti, skor, portf�y de�eri, risk i�tah�, �apraz sat�� potansiyeli alanlar� yok.
- `frontend/src/pages/CustomerDetail.vue`: aktif poli�e, a��k teklif, lead/comment/Communication g�steriyor; �deme, hasar, yenileme, overdue prim ve m��teri skoru yok.
- `frontend/src/pages/CustomerDetail.vue`: ileti�im ge�mi�i Frappe `Communication` ve yorumlardan toplan�yor; SMS/WhatsApp/outbox/call note birle�ik g�r�nm�yor.
- `acentem_takipte/acentem_takipte/api/dashboard.py`: m��teri workbench endpointleri var, fakat tek �a�r�da tam 360 payload d�nen customer detail API yok.

**�nerilen Eklentiler:**
- Yeni `AT Customer Relation` DocType: e�, �ocuk, referans, ticari ba�lant�.
- Yeni `AT Customer Asset` DocType: ara�, konut, i�yeri, sa�l�k grubu, tekne, tar�m ekipman�.
- Yeni `AT Customer Segment Snapshot` DocType: m��teri skoru, tahmini gelir, �apraz sat�� f�rsat�, churn riski.
- Yeni endpoint: `acentem_takipte/acentem_takipte/api/customer_360.py -> get_customer_360(name, window_days=90)`.
- Yeni UI: m��teri detay�nda `Portfolio`, `Collections`, `Claims`, `Communications`, `Renewals`, `Assets & Family`, `Insights` sekmeleri.

**Yol Haritas�na Entegrasyon:** Yeni `Faz 8 � Customer 360 ve CRM Graph` olarak eklenmeli.

**�ncelik:** Kritik

**Tahmini Efor:** 32 saat

---

### ALAN 2 � Poli�e Y�netimi (Tam Ya�am D�ng�s�)

**Mevcut Durum:** `AT Policy` genel m��teri/�irket/bran�/tarih/prim yap�s�na sahip. Poli�e PDF ili�tirme ve snapshot mevcut, ancak �r�n bazl� poli�e modellemesi yok.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.json`: ara� plaka/motor/�asi, konut adres/metrekare, sa�l�k sigortal�lar�, BES s�zle�me bilgileri gibi �r�n tipine �zg� alanlar yok.
- `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.json`: status yaln�zca `IPT`, `KYT`, `Active`; tekliften yenilemeye uzanan ger�ek ya�am d�ng�s� eksik.
- `acentem_takipte/acentem_takipte/doctype/at_policy_endorsement/at_policy_endorsement.py`: `ALLOWED_ENDORSEMENT_FIELDS` sadece �ekirdek finans/tarih alanlar�n� kaps�yor; risk nesnesi de�i�imi desteklenmiyor.
- `frontend/src/pages/PolicyDetail.vue`: endorsement, snapshot, payment, file ve notification listeleri var; �r�n/risk/teminat detay kartlar� yok.
- `acentem_takipte/acentem_takipte/doctype/at_offer/at_offer.py`: tekliften poli�eye d�n���m var, fakat �r�n tipine g�re prefill ve do�rulama yok.

**�nerilen Eklentiler:**
- Yeni �st model: `AT Policy Product Profile`.
- Child tablolar: `AT Vehicle Risk`, `AT Property Risk`, `AT Health Insured Person`, `AT Coverage Line`, `AT Policy Insured Object`.
- Poli�e durum makinesi: `Teklif Bekliyor -> Aktiflestirme Bekliyor -> Aktif -> Yenileme Havuzu -> Iptal / Tamamlandi`.
- Zeyilname i�in typed endorsement payload ve alan bazl� diff/snapshot ekran�.
- Sigorta �irketi ve �r�n kombinasyonu bazl� �ablon/preset yap�s�.

**Yol Haritas�na Entegrasyon:** Yeni `Faz 9 � Productized Policy Lifecycle`, mevcut `3.3` ve `3.4` ile ba�lant�l�.

**�ncelik:** Kritik

**Tahmini Efor:** 44 saat

---

### ALAN 3 � Yenileme Takibi (Gelir Koruma Motoru)

**Mevcut Durum:** Yenileme g�revi otomatik �retiliyor, ama pencere sadece 30 g�n. Stat� modeli operasyonel takip yerine g�rev tamamland� mant���nda.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/tasks.py`: `RENEWAL_LOOKAHEAD_DAYS = 30`; 90/60/15/7/1 g�n kademeleri yok.
- `acentem_takipte/acentem_takipte/doctype/at_renewal_task/at_renewal_task.json`: `status` yaln�zca `Open`, `In Progress`, `Done`, `Cancelled`.
- `acentem_takipte/acentem_takipte/doctype/at_renewal_task/at_renewal_task.py`: notification draft �retiyor ama yenileme teklif �retmiyor.
- `acentem_takipte/acentem_takipte/api/dashboard.py`: renewal bucket ve pending count var; retention rate, lost renewal reason, competitor loss analiti�i yok.
- `frontend/src/pages/RenewalsBoard.vue`: filtrelenebilir liste var; m�zakere, kaybedildi, rakibe gitti, sebep se�imi ve teklif ili�kisi yok.

**�nerilen Eklentiler:**
- Yeni `AT Renewal Opportunity` DocType: sat�� a�amalar�, teklif ili�kisi, renewal owner.
- Yeni `AT Renewal Outcome Reason` DocType: fiyat, hizmet, rakip, m��teri vazge�ti, kapsam uyumsuzlu�u.
- �nceki poli�eden otomatik renewal offer prefill servisi.
- KPI: `retention_rate`, `renewal_pipeline_value`, `lost_renewal_count`, `competitor_loss_rate`.

**Yol Haritas�na Entegrasyon:** Mevcut `3.4` geni�letilmeli ve yeni `Faz 10 � Revenue Retention Engine` a��lmal�.

**�ncelik:** Kritik

**Tahmini Efor:** 36 saat

---

### ALAN 4 � Tahsilat ve Mali Takip

**Mevcut Durum:** Tekil �deme kayd�, muhasebe entry ve reconciliation yap�s� mevcut. Temel collection/payout ve mutabakat izlenebiliyor.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/doctype/at_payment/at_payment.json`: taksit plan�, taksit no, plan toplam�, kalan bakiye alanlar� yok.
- `acentem_takipte/acentem_takipte/doctype/at_payment/at_payment.py`: `due_date` do�rulan�yor ama taksit bazl� vade zinciri, gecikme faizi, hat�rlatma seviyesi yok.
- `acentem_takipte/acentem_takipte/doctype/at_accounting_entry/at_accounting_entry.json`: KDV, BSMV, gider vergisi, komisyon tahakkuk/�deme ayr�m� yok.
- `acentem_takipte/acentem_takipte/api/accounting.py`: workbench ve run/resolve operasyonlar� var; Excel/CSV ekstre import endpoint'i yok.
- `frontend/src/pages/PaymentsBoard.vue` ve `frontend/src/pages/ReconciliationWorkbench.vue`: operasyon ekran� var, fakat kasa raporu, �irket ekstre y�kleme ve muhasebe d��a aktarma yok.

**�nerilen Eklentiler:**
- Yeni `AT Installment Plan`, `AT Installment Item`, `AT Commission Accrual`, `AT Cash Ledger`, `AT Statement Import Batch`.
- Ekstre import parser katman�: CSV/Excel -> staging -> e�le�tirme -> reconciliation �nerileri.
- Vergi k�r�l�m alanlar� ve muhasebe export adapter'�.
- Gecikmi� prim uyar� servisi ve m��teri/agent g�rev �retimi.

**Yol Haritas�na Entegrasyon:** Yeni `Faz 11 � Collections and Finance Ops`.

**�ncelik:** Kritik

**Tahmini Efor:** 40 saat

---

### ALAN 5 � Hasar Y�netimi

**Mevcut Durum:** `AT Claim` temel claim kayd� ve �deme ba�lant�s� sa�l�yor. Liste ekran�nda claim durum ve �deme/approval tutarlar� g�r�lebiliyor.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/doctype/at_claim/at_claim.json`: eksper, dosya sorumlusu, red sebebi, itiraz durumu, belge/foto�raf alanlar� yok.
- `acentem_takipte/acentem_takipte/doctype/at_claim/at_claim.py`: claim �deme toplam�n� hesapl�yor; dosya ya�am d�ng�s�, SLA ve atama kural� yok.
- `frontend/src/pages/ClaimsBoard.vue`: liste var, ama claim detail/case management ekran� yok.
- `acentem_takipte/acentem_takipte/communication.py`: claim status de�i�imlerinde m��teri bildirimi i�in �zel ak�� g�r�nm�yor.
- Repo genelinde claim attachment/photo upload/inspection/workflow yap�s� bulunmuyor.

**�nerilen Eklentiler:**
- Yeni `AT Claim File`, `AT Claim Document`, `AT Expert Assignment`, `AT Claim Appeal`.
- Claim detail sayfas�: olay bilgisi, eksper s�reci, �deme s�reci, itiraz sekmesi, belge y�kleme.
- Claim status transition + m��teri notification rule set.
- Loss ratio veri mart�: m��teri/�r�n/�irket baz�nda claim-to-premium analiti�i.

**Yol Haritas�na Entegrasyon:** Yeni `Faz 12 � Claims Case Management`.

**�ncelik:** Kritik

**Tahmini Efor:** 30 saat

---

### ALAN 6 � �leti�im Merkezi

**Mevcut Durum:** Template, draft, outbox ve dispatcher kuyru�u mevcut. WhatsApp API adapter tasla�� ve scheduler dispatch var.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/doctype/at_notification_template/at_notification_template.json`: kanal modeli `SMS`, `Email`, `Both`; WhatsApp first-class channel de�il.
- `acentem_takipte/acentem_takipte/doctype/at_notification_outbox/at_notification_outbox.json`: outbox kanallar� `SMS`, `Email`; telefon aramas�/notu yok.
- `acentem_takipte/acentem_takipte/communication.py`: SMS ak��� yorum seviyesinde WhatsApp adapter �zerinden �al���yor; ger�ek SMS provider ayr�m� yok.
- `frontend/src/pages/CommunicationCenter.vue`: outbox/draft y�netimi var; m��teri bazl� t�m ileti�im ge�mi�i, kampanya ve segment ekran� yok.
- `acentem_takipte/hooks.py`: queue schedule var; zamanlanm�� kampanya veya m��teri segment broadcast job'u yok.

**�nerilen Eklentiler:**
- Yeni `AT Communication Log`, `AT Campaign`, `AT Segment`, `AT Scheduled Message`, `AT Call Note`.
- Channel modeli: `WhatsApp`, `SMS`, `Email`, `Phone Call`.
- Segment bazl� kampanya hedefleme: �r. "30 g�n i�inde kasko bitenler".
- Planl� g�nderim ve approval workflow.

**Yol Haritas�na Entegrasyon:** Yeni `Faz 13 � Omnichannel Communication Hub`.

**�ncelik:** Kritik

**Tahmini Efor:** 34 saat

---

### ALAN 7 � G�rev ve Aktivite Y�netimi

**Mevcut Durum:** Uygulamada genel g�rev sistemi yok; g�rev kavram� fiilen `AT Renewal Task` ile s�n�rl�.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/doctype/at_renewal_task/at_renewal_task.json`: yaln�zca renewal odakl� task modeli var.
- `acentem_takipte/acentem_takipte/tasks.py`: admin job ve queue i�leri var; kullan�c� g�rev, reminder, follow-up ve daily task listesi yok.
- `frontend/src/pages/Dashboard.vue`: renewal alerts ve offer queues var; ki�isel "bug�n yap�lacaklar" g�r�n�m� yok.
- `frontend/src/router/index.js`: ziyaret plan�, aktivite, tak�m performans� gibi mod�ller i�in rota yok.

**�nerilen Eklentiler:**
- Yeni `AT Task`, `AT Activity`, `AT Reminder`, `AT Visit Plan`.
- Domain event'lerden g�rev �reten rule engine: overdue �deme, claim follow-up, teklif follow-up, renewal call.
- Ekip performans panosu: poli�e kesim, teklif d�n���m, tahsilat takibi, g�rev tamamlama.

**Yol Haritas�na Entegrasyon:** Yeni `Faz 14 � Work Management and Team Ops`.

**�ncelik:** Kritik

**Tahmini Efor:** 28 saat

---

### ALAN 8 � Raporlama ve Analitik

**Mevcut Durum:** Dashboard v1/v2 ile GWP, komisyon, poli�e say�s�, renewal bucket, payment ve claim �zetleri al�nabiliyor. Tarih aral��� ve branch filtreleri �al���yor.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_kpis.py`: policy ve lead status �zetleri var; m��teri ba��na gelir, retention, churn, loss ratio yok.
- `acentem_takipte/acentem_takipte/api/dashboard_v2/tab_payload.py`: offer/payment/renewal �zetleri var; �al��an bazl� �retim ve �r�n bazl� da��l�m yok.
- `frontend/src/pages/Dashboard.vue`: �irket bazl� top companies var; �r�n/�al��an/segment/LTV k�r�l�m� yok.
- Repo genelinde Excel/PDF export endpoint ve UI aksiyonu g�r�nm�yor.

**�nerilen Eklentiler:**
- Analitik mart katman�: `customer_value`, `renewal_retention`, `loss_ratio`, `agent_productivity`.
- Export ve BI katman�: PDF/Excel export, zamanlanm�� rapor, d�nem kar��la�t�rma ve �al��an performans karnesi.
- Y�netici ekran�: g�nl�k operasyon, haftal�k kay�p analizi, ayl�k �irket/�r�n/�al��an �retimi, y�ll�k b�y�me trendi.

**Yol Haritas�na Entegrasyon:** Yeni `Faz 15 � Executive Analytics and Reporting`.

**�ncelik:** �nemli

**Tahmini Efor:** 44 saat

---

### Faz 15 G�ncellenmi� Versiyon

#### 15.1 PDF/Excel Export Altyap�s�
- **Durum:** Tamamland�
- **Durum G�ncelleme:** scheduled report config�lar�n�n admin g�r�n�rl���, manuel tetikleme, UI y�netim formu ve outbox teslim stratejisi tamamland�.
- **�ncelik:** Y�ksek
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
- **Teknik Karar (PDF ve Excel i�in se�ilen yakla��m):**
  - PDF: `Frappe native print/html + Jinja + frappe.utils.pdf.get_pdf`
    - Gerek�e: repo i�inde `policy_documents.py` zaten `get_pdf` kullan�yor; Desk uyumu ve kurumsal PDF standard� i�in mevcut stack ile en uyumlu yakla��m bu.
    - Uygulama notu: DocType bazl� belgelerde Print Format; BI raporlar�nda server-side Jinja HTML �ablonu + `get_pdf`.
  - Excel: `openpyxl` server-side
    - Gerek�e: 1000+ sat�r, �ok sheet, zamanlanm�� �retim ve kurumsal format kontrol� i�in backend �retim en g�venli yol.
  - Tetikleme modeli: `Her ikisi de`
    - anl�k indirme: kullan�c� filtreleyip indirir
    - zamanlanm�� �retim: haftal�k/ayl�k job + bildirim
- **�retilecek Rapor Tipleri:**
  - `Poli�e Listesi Raporu`
    - Kaynak: `AT Policy` + `AT Customer` + `AT Insurance Company` + opsiyonel `AT Sales Entity`
    - Filtreler: tarih aral���, sigorta �irketi, sigorta bran��, fiziksel �ube, durum, �al��an
    - PDF d�zeni: logo, rapor ba�l���, filtre �zeti, tablo, toplam prim/komisyon �zet sat�r�
    - Excel yap�s�: `Summary`, `Policies`
  - `Komisyon Tahakkuk Raporu`
    - Kaynak: `AT Policy`, `AT Payment`, `AT Accounting Entry`, `AT Reconciliation Item`
    - Filtreler: d�nem, �irket, �al��an, fiziksel �ube, tahakkuk durumu
    - PDF d�zeni: d�nem �zeti, �irket bazl� k�r�l�m tablosu, tahakkuk/tahsilat fark �zeti
    - Excel yap�s�: `Summary`, `By Company`, `Lines`
  - `Yenileme Performans Raporu`
    - Kaynak: `AT Renewal Task`, `AT Renewal Opportunity`, `AT Renewal Outcome`, `AT Offer`, `AT Policy`
    - Filtreler: d�nem, �al��an, �irket, bran�, fiziksel �ube
    - PDF d�zeni: retention KPI kartlar�, stage da��l�m� tablosu, kay�p nedenleri �zeti
    - Excel yap�s�: `Summary`, `Pipeline`, `Lost Reasons`, `Agent Breakdown`
  - `Hasar/Prim Oran� Raporu`
    - Kaynak: `AT Claim`, `AT Payment`, `AT Policy`, `AT Customer`
    - Filtreler: d�nem, �irket, �r�n/bran�, m��teri segmenti, fiziksel �ube
    - PDF d�zeni: loss ratio �zeti, �irket/�r�n bazl� tablo, riskli m��teri listesi
    - Excel yap�s�: `Summary`, `By Product`, `By Company`, `Risk Customers`
  - `Acente �retim Karnesi`
    - Kaynak: `AT Policy`, `AT Offer`, `AT Renewal Task`, `AT Renewal Outcome`, `AT Payment`, `AT Task`
    - Filtreler: �al��an, d�nem, fiziksel �ube
    - PDF d�zeni: �al��an ba�l���, KPI kartlar�, hedef-ger�ekle�en tablosu, a��k g�rev �zeti
    - Excel yap�s�: `Summary`, `Agents`, `Open Tasks`, `Conversions`
  - `Tahsilat Durumu Raporu`
    - Kaynak: `AT Payment`, `AT Installment Plan`, `AT Accounting Entry`, `AT Reconciliation Item`
    - Filtreler: d�nem, �deme durumu, vadesi ge�enler, �irket, fiziksel �ube
    - PDF d�zeni: kasa �zeti, gecikmi� tahsilat listesi, taksit �zeti
    - Excel yap�s�: `Summary`, `Overdue`, `Installments`, `Cash`
- **Kabul Kriterleri:**
  - En az 6 rapor tipi i�in ortak export servis katman� olu�ur.
  - PDF ��kt�lar�nda kurumsal ba�l�k, filtre �zeti, �zet sat�r� ve sayfa numaras� standard� uygulan�r.
  - Excel ��kt�lar�nda �oklu sheet, ba�l�k stili, say�/tarih format� ve filtre sat�r� bulunur.
  - Uzun s�ren export i�leri queue �zerinden y�r�r; k���k veri setlerinde anl�k indirme desteklenir.
  - Dashboard v2 ve liste ekranlar� ayn� filtre s�zle�mesi ile export al�r.
- **Desk Uyumlulu�u:**
  - Evet. `System Manager` ve `Administrator` Desk �zerinden de rapor alabilmeli.
  - Desk taraf�nda export action ve rapor parametre formu bulunur; normal kullan�c� ayn� raporlar� `/at` i�inden kullan�r.

#### 15.2 Kar��la�t�rmal� D�nem Analizi
- **Durum:** Plan
- **�ncelik:** Y�ksek
- **Efor:** 8 saat
- **Kapsam:**
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_kpis.py`
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/tab_payload.py`
  - `acentem_takipte/acentem_takipte/api/dashboard.py`
  - `frontend/src/pages/Dashboard.vue`
- **Kabul Kriterleri:**
  - KPI payload'�na `period_comparison` parametresi eklenir: `none`, `previous_period`, `previous_month`, `previous_year`.
  - Her KPI i�in `current`, `previous`, `delta_value`, `delta_percent`, `direction` alanlar� d�ner.
  - �u senaryolar desteklenir:
    - bu ay vs ge�en ay
    - bu y�l vs ge�en y�l
    - se�ili d�nem vs ayn� uzunlukta �nceki d�nem
  - Dashboard kartlar� `^ / �` y�n g�stergesi ve y�zde de�i�im g�sterir.
  - Ayn� comparison helper export raporlar�nda tekrar kullan�labilir �ekilde ayr��t�r�l�r.

#### 15.3 Acente Performans Karnesi
- **Durum:** Plan
- **�ncelik:** Orta
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
  - �al��an bazl� �u metrikler �retilir:
    - kesilen poli�e say�s�
    - toplam prim
    - teklif d�n���m oran�
    - yenileme ba�ar� oran�
    - komisyon geliri
    - a��k g�rev say�s�
  - Hem ekran g�r�n�m� hem PDF export desteklenir.
  - Fiziksel �ube ve �al��an filtresi ayn� s�zle�me ile �al���r.
  - KPI tan�mlar� Faz 14 g�rev modeli tamamland�ktan sonra g�rev bazl� metriklerle geni�leyebilir.
- **Ba��ml�l�k:** `Faz 14 � Work Management and Team Ops`

#### 15.4 M��teri Segmentasyon Raporu
- **Durum:** Tamamland�
- **�ncelik:** Orta
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
  - Temel segmentasyon, `AT Customer Segment Snapshot` olmadan �u kurallarla �al���r:
    - poli�e say�s�: `1`, `2-5`, `5+`
    - toplam prim segmenti
    - yenileme sadakat skoru
    - hasar ge�mi�i var/yok
  - M��teri listesi ekran�nda segment filtreleme + export birlikte �al���r.
  - `AT Customer Segment Snapshot` geldi�inde ayn� endpoint s�zle�mesi korunarak geli�mi� segmente ge�ilebilir.
  - Desk'te admin kullan�c� segment raporunu m��teri listesi/export y�zeyi �zerinden alabilir.
- **Ba��ml�l�k:** `Faz 8 � Customer 360 ve CRM Graph` (opsiyonel; temel versiyon ba��ms�z �al���r)

---

### ALAN 10 � Mobil Kullan�m

**Mevcut Durum:** Vue SPA route bazl� lazy-load kullan�yor. Sayfalarda temel responsive s�n�flar var; fakat deneyim masa�st� workbench mant��� a��rl�kl�.

**Kritik Eksikler:**
- `frontend/src/router/index.js`: mobil sahaya �zel field mode veya mini-detail route modeli yok.
- `frontend/src/pages/CustomerDetail.vue`, `PolicyDetail.vue`, `ClaimsBoard.vue`, `PaymentsBoard.vue`: veri yo�un kart ve tablo yap�s� mobil kullan�m i�in optimize edilmemi�.
- `frontend/src/state/session.js`: global session state var; Pinia veya offline-friendly domain store yap�s� yok.
- `frontend/src/pages/ClaimsBoard.vue`: foto�raf ekleme, kamera y�kleme, sahadan hasar kayd� ak��� yok.
- `frontend/src/pages/OfferBoard.vue` ve `PolicyDetail.vue`: h�zl� teklif sihirbaz� ve m��teri ziyaretinde kullan�lacak tek-ekran aksiyon seti yok.

**�nerilen Eklentiler:**
- Yeni mobil-first `Field Mode` navigasyonu.
- H�zl� aksiyon kartlar�: `Musteri Ara`, `Hizli Teklif`, `Hasar Bildir`, `Tahsilat Notu`, `Fotograf Yukle`.
- Kamera/file capture destekli claim ve belge ak��lar�.
- Pinia tabanl� offline toleransl� domain cache.

**Yol Haritas�na Entegrasyon:** Yeni `Faz 16 � Mobile Field Operations`.

**�ncelik:** �nemli

**Tahmini Efor:** 24 saat

---

## Yol Haritas� (v2 � Birle�tirilmi� ve Ba��ml�l�k S�ral�)

Bu b�l�m, yukar�daki alan analizinden ��kan `Faz 8-16` �nerilerini mevcut `Faz 1-7` ile �ak��mayacak �ekilde birle�tirir. Ama� ayr� backlog k�meleri �retmek de�il; uygulamaya ba�lanabilecek tek bir, ba��ml�l�k s�ral� icra dizisi olu�turmakt�r.

### Dalga 1 � G�venlik, Uyum ve S�zle�me Temeli
- **Birle�en Fazlar:** `Faz 1`, `Faz 5.2`, `Faz 7.1`, `Faz 7.2`, `Faz 7.3`, `Faz 7.4`
- **�ncelik:** Y�ksek
- **Toplam Efor:** 88 saat
- **Odak:**
  - Auth, permission, `ignore_permissions=True`, log redaction ve admin job eri�im standard�n� kapatmak
  - Structured logging, metrics, KVKK ya�am d�ng�s� ve harici entegrasyon s�zle�melerini sabitlemek
  - API versioning ve CI g�venlik kap�s�n� uygulamak
- **Bu Dalga Tamamlanmadan Ba�lanmamas� Gerekenler:**
  - Omnichannel communication geni�lemesi
  - Muhasebe/entegrasyon rollout'u
  - Customer 360 i�in geni� PII g�r�n�rl�k y�zeyi

### Dalga 2 � Veri Modeli ve Servis Katman� Temeli
- **Birle�en Fazlar:** `Faz 3.1`, `Faz 3.2`, `Faz 3.3`, `Faz 3.3.1`
- **�ncelik:** Y�ksek
- **Toplam Efor:** 40 saat
- **Odak:**
  - Ortak servis katman�, permission helper ve domain yard�mc�lar�n� oturtmak
  - DocType normalizasyonu, legacy alan temizli�i ve ortak finans/status do�rulamas�n� tekille�tirmek
  - Sonraki dalgalarda eklenecek m��teri ili�ki, risk nesnesi, taksit, claim case, communication log ve task modelleri i�in �ema standard� belirlemek
- **Bu Dalga Tamamlanmadan Ba�lanmamas� Gerekenler:**
  - Productized policy lifecycle rollout
  - Collections/installment modeli
  - Claims case management ve unified activity modeli

### Dalga 3 � Frontend State, UX ve Mobil Foundation
- **Birle�en Fazlar:** `Faz 2.3`, `Faz 3.2.1`, `Faz 6.1`, `Faz 6.2`
- **�ncelik:** Y�ksek
- **Toplam Efor:** 34 saat
- **Odak:**
  - Pinia tabanl� domain store mimarisine ge�mek
  - Loading/error/empty state standard�n� oturtmak
  - Eri�ilebilirlik ve responsive davran��� temel seviyede g�venceye almak
  - Mobil saha moduna altyap� haz�rlamak
- **Bu Dalga Tamamlanmadan Ba�lanmamas� Gerekenler:**
  - Customer 360 ekran�n�n geni�letilmesi
  - Mobile field operations rollout
  - B�y�k �ok-sekmeli operasyon ekranlar�

### Dalga 4 � Customer 360 ve Productized Policy Foundation
- **Birle�en Fazlar:** `Faz 8`, `Faz 9` i�indeki veri modeli ve �ekirdek servis maddeleri
- **�ncelik:** Y�ksek
- **Toplam Efor:** 46 saat
- **Odak:**
  - `AT Customer` �evresine household, asset, segment ve skor katmanlar�n� eklemek
  - `AT Policy` i�in �r�n bazl� risk nesnesi modelini kurmak
  - Ger�ek endorsement diff ve product-specific validation altyap�s�n� ��karmak
- **Ba��ml�l�k:** `Dalga 1`, `Dalga 2`, `Dalga 3`

### Dalga 5 � Gelir Koruma ve Mali Operasyon Motoru
- **Birle�en Fazlar:** `Faz 2.2`, `Faz 3.4`, `Faz 10`, `Faz 11`
- **�ncelik:** Y�ksek
- **Toplam Efor:** 92 saat
- **Odak:**
  - Renewal engine'i 90/60/30/15/7/1 kademeli hale getirmek
  - Auto renewal offer, lost reason ve retention KPI'lar�n� eklemek
  - Installment plan, overdue premium, commission accrual ve statement import ak���n� kurmak
  - Accounting/reconciliation workbench'i finans operasyon merkezine d�n��t�rmek
- **Ba��ml�l�k:** `Dalga 1`, `Dalga 2`

### Dalga 6 � Claims, �leti�im ve Tak�m Operasyonlar�
- **Birle�en Fazlar:** `Faz 12`, `Faz 13`, `Faz 14`
- **�ncelik:** Y�ksek
- **Toplam Efor:** 92 saat
- **Odak:**
  - Claim case management, eksper, belge/foto�raf ve itiraz s�recini eklemek
  - WhatsApp, SMS, e-posta ve telefon notunu tek communication timeline alt�nda birle�tirmek
  - Segment/kampanya/zamanlanm�� g�nderim ve genel task/activity/reminder modelini kurmak
  - �al��an bazl� g�rev ve performans takibini dashboard ile ba�lamak
- **Ba��ml�l�k:** `Dalga 1`, `Dalga 2`, `Dalga 3`

### Dalga 7 � Y�netici Analiti�i, Test ve Release Hardening
- **Birle�en Fazlar:** `Faz 4`, `Faz 5.1`, `Faz 15`, `Faz 16`
- **�ncelik:** Orta
- **Toplam Efor:** 84 saat
- **Odak:**
  - Executive KPI setini m��teri de�eri, retention, loss ratio ve agent �retkenli�i ile geni�letmek
  - PDF/Excel export, scheduled reports, d�nem kar��la�t�rma ve performans/segment raporlamas�n� eklemek
  - Backend/frontend/E2E kritik ak�� testlerini tamamlamak
  - Mobil saha kullan�m�n� production seviyesine ta��mak
- **Ba��ml�l�k:** `Dalga 4`, `Dalga 5`, `Dalga 6`

### Birle�tirilmi� v2 Uygulama S�ras�
1. `Dalga 1 � G�venlik, Uyum ve S�zle�me Temeli`
2. `Dalga 2 � Veri Modeli ve Servis Katman� Temeli`
3. `Dalga 3 � Frontend State, UX ve Mobil Foundation`
4. `Dalga 4 � Customer 360 ve Productized Policy Foundation`
5. `Dalga 5 � Gelir Koruma ve Mali Operasyon Motoru`
6. `Dalga 6 � Claims, �leti�im ve Tak�m Operasyonlar�`
7. `Dalga 7 � Y�netici Analiti�i, Test ve Release Hardening`

### Birle�tirilmi� v2 Toplam Efor �zeti
- `Dalga 1`: 88 saat
- `Dalga 2`: 40 saat
- `Dalga 3`: 34 saat
- `Dalga 4`: 46 saat
- `Dalga 5`: 92 saat
- `Dalga 6`: 92 saat
- `Dalga 7`: 84 saat
- **Toplam:** 476 saat

## Karar Kay�tlar� (Mart 2026 Revizyonu)

Bu b�l�m, mevcut v2 yol haritas�n�n uygulanma kararlar�n� netle�tirir. �nceki �Desk kald�r�lacak� varsay�m� iptal edilmi�tir. Yeni hedef model:

- Birincil operasyon y�zeyi: `/at` Vue SPA
- Frappe Desk: yaln�zca `System Manager` ve `Administrator`
- Normal kullan�c�lar: Desk g�rmeden do�rudan `/at`
- T�m domain ak��lar� hem Desk hem SPA ile uyumlu backend s�zle�meleri �zerinden �al���r

### Karar 1 � Frappe Desk Eri�imini Rol Bazl� Kilitle
- **Se�ilen Yakla��m:** Desk kald�r�lmaz; yaln�zca `System Manager` / `Administrator` kullan�c�lar� Desk'e eri�ir. Di�er t�m roller i�in varsay�lan giri� y�zeyi `/at` olur ve `/app/*` eri�imi y�nlendirme/guard ile kesilir.
- **Roadmap Etkisi:** `Dalga 1` ve `Dalga 3`
- **Desk Uyumlulu�u:**
  - DocType form/list ayarlar� korunur.
  - `public/js` client script'ler korunur; ��nk� admin/superuser i�in Desk operasyon ve bak�m y�zeyi olarak kalacakt�r.
  - API endpoint'leri Desk'ten ba��ms�z kal�r; Desk ve SPA ayn� backend i� kurallar�n� kullan�r.
- **Uygulama Notlar�:**
  - `hooks.py` i�inde `home_page` / `role_home_page` kural� SPA �ncelikli olacak �ekilde g�ncellenir.
  - `api/session.py` ve giri� sonras� boot ak���nda normal kullan�c� i�in `/at` zorlamas� uygulan�r.
  - `www/app.py` veya benzeri route guard katman�nda `System Manager` d��� kullan�c� i�in `/app` eri�imi `/at`'a �evrilir.
  - Admin/superuser i�in Desk'te kalacak y�zeyler:
    - DocType ve Custom Field y�netimi
    - User / Role / User Permission y�netimi
    - Error Log, Background Jobs, Scheduler izleme
    - Patch/Migration ge�mi�i ve sistem te�hisi
  - SPA'ya ta��nacak operasyon y�zeyleri:
    - m��teri, teklif, poli�e, yenileme, hasar, tahsilat, dashboard
- **�lgili Dosyalar:**
  - `acentem_takipte/hooks.py`
  - `acentem_takipte/api/session.py`
  - `acentem_takipte/public/js/*.js`
  - `frontend/src/router/index.js`
  - `frontend/src/state/session.js`
- **Tahmini Efor:** 14 saat

### Karar 2 � �ok �ubeli Yap� ��in Veri Modeli
- **Se�ilen Yakla��m:** Fiziksel lokasyon/�ube i�in mevcut sigorta bran�� modelinden ayr� bir �zel DocType kullan�l�r. Mevcut `AT Branch` sigorta bran��/�r�n bran�� anlam�nda kal�r; fiziksel �ube i�in yeni bir model eklenir.
- **Roadmap Etkisi:** `Dalga 1`, `Dalga 2`, `Dalga 4`, `Dalga 5`, `Dalga 6`
- **Desk Uyumlulu�u:**
  - Desk form/list g�r�n�m�nde fiziksel �ube alan� standart Link field olarak �al���r.
  - `User Permission` ile Desk filtrelemesi desteklenir; dashboard ve raw SQL taraf�nda ek custom filter enforcement uygulan�r.
- **Se�ilen Permission Stratejisi:**
  - Birincil model: `AT Office Branch` + kullan�c�ya �oklu �ube atamas�
  - Desk uyumu i�in: `User Permission`
  - API ve dashboard sorgular� i�in: merkezi `office_branch` filter helper + permission hook
  - `System Manager`: t�m �ubeler
  - Normal kullan�c�: yaln�zca atanm�� �ubeler
- **�ncelikli DocType S�ras�:**
  1. `AT Customer`
  2. `AT Lead`
  3. `AT Offer`
  4. `AT Policy`
  5. `AT Renewal Task`
  6. `AT Payment`
  7. `AT Claim`
  8. `AT Accounting Entry`
  9. `AT Reconciliation Item`
- **Migration Notlar�:**
  - Yeni alan ad�: `office_branch`
  - Backfill s�ras�:
    - m��teri manuel/seed veya kullan�c� varsay�lan�na g�re
    - poli�e teklif/m��teri �zerinden
    - �deme/hasar/yenileme muhasebe kay�tlar� poli�e veya m��teri �zerinden
  - Dashboard v2 taraf�nda `queries_kpis.py` ve `tab_payload.py` i�inde `office_branch` param� zorunlu helper ile i�lenir.
- **�lgili Dosyalar:**
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
  - branch migration patch dosyas�
- **Tahmini Efor:** 24 saat

### Karar 3 � WhatsApp Business API Entegrasyonu
- **Se�ilen Yakla��m:** �ncelikli provider olarak `Meta Cloud API` kullan�l�r. Notification outbox yap�s� korunur; �zerine provider adapter katman� eklenir. Ba�ar�s�z WhatsApp g�nderimi varsay�lan olarak otomatik SMS fallback yapmaz; fallback template bazl�, a��k i� kural� ile se�ilir.
- **Roadmap Etkisi:** `Dalga 1`, `Dalga 5`, `Dalga 6`
- **Neden:** T�rkiye pazar� i�in do�rudan Meta entegrasyonu uzun vadede daha az ba��ml�l�k, daha a��k HSM y�netimi ve daha d���k arac� maliyeti sa�lar. SMS sa�lay�c�s� ile fallback ak��� daha sonra ayr� bir s�zle�me olarak eklenmelidir; ilk a�amada kanal kar���kl��� yaratmamak gerekir.
- **Desk Uyumlulu�u:**
  - `AT Notification Template`, `AT Notification Draft`, `AT Notification Outbox` Desk'te y�netilebilir kal�r.
  - System Manager WhatsApp template, provider ayar� ve kuyruk durumunu Desk'ten g�rebilir.
- **Uygulama Notlar�:**
  - Scheduler ak��� korunur: `hooks.py` � queue/disptach job
  - Kanal modeli `SMS/Email/Both` yakla��m�ndan `WHATSAPP/SMS/EMAIL` bazl� geni�letilir.
  - Yeni adapter ak���: `outbox -> dispatcher -> provider router -> whatsapp adapter`
  - Teknik kurallar:
    - timeout: `8s`
    - retry: `max 3`
    - rate-limit: Redis saya�l� provider limiter
    - dead-letter: mevcut ba�ar�s�z kuyruk mant��� korunur
  - �ncelikli trigger noktalar�:
    1. yenileme hat�rlatmas�: `tasks.py`, `at_renewal_task.py`
    2. �deme vade uyar�s�: yeni scheduler + `AT Payment`
    3. hasar durum g�ncellemesi: `AT Claim.on_update`
    4. poli�e teslim bildirimi: `AT Policy.after_insert` / belge haz�r olay�
- **Template �ema Geni�lemesi:**
  - `provider_template_name`
  - `provider_template_language`
  - `provider_template_category`
  - `content_mode`
  - `variables_schema_json`
  - kanal bazl� body/header alanlar�
- **�lgili Dosyalar:**
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

### Karar 4 � Renewal Engine Yeniden Yaz�m�
- **Se�ilen Yakla��m:** `AT Renewal Task` yaln�zca g�rev/hat�rlatma kayd� olarak kal�r. As�l yenileme sat�� ya�am d�ng�s� yeni servis katman� ve ek outcome/opportunity modelleri ile y�netilir.
- **Roadmap Etkisi:** `Dalga 5`
- **Desk Uyumlulu�u:**
  - Desk'te `AT Renewal Task`, `AT Renewal Opportunity`, `AT Renewal Outcome` formlar� y�netilebilir olur.
  - Manual trigger ve exception ��z�m� admin/manager kullan�c� i�in hem Desk hem SPA �zerinden m�mk�n olur.
- **Yeni Mimari:**
  - `renewal/service.py`: aday �retimi, i� kurallar�, prefill offer �retimi
  - `renewal/pipeline.py`: `detect -> ensure_opportunity -> ensure_task -> notify -> create_offer -> close_or_lost`
  - `renewal/telemetry.py`: stage saya�lar�, dedupe kay�tlar�, retention metrikleri
- **Kademe Sistemi:**
  - `90/60/30/15/7/1`
  - Template yakla��m�: tek dinamik template yerine stage bazl� template family
  - Dedupe anahtar�: `policy + stage_code + channel + business_date`
- **Prefill Yenileme Teklifi:**
  - otomatik alanlar:
    - m��teri
    - sigorta �irketi
    - sigorta bran��
    - para birimi
    - �nceki prim/komisyon referanslar�
  - kullan�c� onay� gerektiren alanlar:
    - fiyat de�i�imi
    - tarih kaymas�
    - risk nesnesi de�i�ikli�i
    - ek teminat / limit farklar�
- **Yeni Outcome �emas�:**
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
- **�lgili Dosyalar:**
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

### Karar 5 � Pinia Store Mimarisi (Domain Bazl�)
- **Se�ilen Yakla��m:** SPA taraf� Pinia setup store mimarisine ge�irilir. Backend s�zle�mesi Desk uyumlu kal�r; frontend yaln�zca bu s�zle�menin organize edilmi� istemci katman� olur.
- **Roadmap Etkisi:** `Dalga 3`, `Dalga 4`, `Dalga 5`, `Dalga 6`
- **Desk Uyumlulu�u:**
  - Desk'e �zel ak��lar etkilenmez.
  - Store'lar yaln�zca `/at` y�zeyi i�in istemci orkestrasyonu sa�lar; i� kurallar� backend'de kal�r.
- **Store Yap�s�:**
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
- **Standart Store S�zle�mesi:**
  - `state`: `items`, `selected`, `loading`, `error`
  - `actions`: `fetch`, `create`, `update`, `remove`
  - `getters`: `filtered`, `grouped`, `computed_kpis`
- **Branch Filter Stratejisi:**
  - aktif fiziksel �ube global store'da tutulur
  - System Manager i�in `Tum Subeler` se�ene�i g�r�n�r
  - filtre router query param ile URL'de persist edilir
  - sigorta bran�� filtresi ile fiziksel �ube filtresi ayr� tutulur
- **Migration Kapsam�:**
  - do�rudan resource/fetch kullanan sayfalar s�ras�yla store action'lar�na ta��n�r:
    - m��teri ekranlar�
    - teklif/poli�e ekranlar�
    - yenileme ekranlar�
    - hasar/tahsilat/ileti�im workbench'leri
    - dashboard
- **�lgili Dosyalar:**
  - `frontend/src/state/session.js`
  - `frontend/src/state/ui.js`
  - `frontend/src/router/index.js`
  - `frontend/src/pages/*.vue`
- **Yeni Dosyalar / DocType'lar:**
  - `frontend/src/stores/*.js`
  - `frontend/src/api/client.js`
- **Tahmini Efor:** 26 saat

### Rol-Aray�z Matrisi
| Rol | Birincil Aray�z | Desk Eri�imi | Not |
|---|---|---|---|
| `Administrator` | `/at` + Desk | Var | Sistem y�netimi, patch, log, scheduler |
| `System Manager` | `/at` + Desk | Var | Sistem ve operasyon hibrit kullan�m |
| `AT Manager` | `/at` | Yok | Operasyon ve dashboard |
| `AT Agent` | `/at` | Yok | M��teri, teklif, yenileme, hasar |
| `AT Accountant` | `/at` | Yok | Tahsilat, mutabakat, finans i� ak��� |
| Di�er operasyon rolleri | `/at` | Yok | Yetki kapsam� API + SPA ile belirlenir |

### Kararlar�n Dalgalara Da��l�m�
1. `Karar 1` � `Dalga 1`, `Dalga 3`
2. `Karar 2` � `Dalga 1`, `Dalga 2`, `Dalga 4`, `Dalga 5`, `Dalga 6`
3. `Karar 3` � `Dalga 1`, `Dalga 5`, `Dalga 6`
4. `Karar 4` � `Dalga 5`
5. `Karar 5` � `Dalga 3`, `Dalga 4`, `Dalga 5`, `Dalga 6`

### Revize Uygulama Ba��ml�l�k S�ras�
1. `Karar 1` ve `Karar 2` temel eri�im ve veri izolasyonu i�in �nce uygulan�r.
2. `Karar 5`, `/at` taraf�n� yeni branch ve permission s�zle�mesine ba�lamak i�in ikinci katmand�r.
3. `Karar 3`, notification altyap�s�n� ve WhatsApp provider s�zle�mesini sabitler.
4. `Karar 4`, branch-aware renewal verisi ve communication adapter haz�r olduktan sonra uygulan�r.

### Karar Bazl� Toplam Efor
- `Karar 1`: 14 saat
- `Karar 2`: 24 saat
- `Karar 3`: 28 saat
- `Karar 4`: 34 saat
- `Karar 5`: 26 saat
- **Toplam:** 126 saat

### Planlama Notu
- Bu `126 saat`, mevcut `458 saat` v2 toplam�na ek ba��ms�z bir paket de�ildir.
- Kararlar, mevcut dalgalar�n uygulanma bi�imini ve teknik y�n�n� netle�tiren mimari karar kay�tlar�d�r.
- Sprint planlama yap�l�rken karar eforu ilgili dalga eforunun i�inde de�erlendirilmelidir.

## Genel Kabul Kurallar�

- Her g�rev i�in:
  - �nce teknik not (ama�, kapsam, varsay�m), ard�ndan kod de�i�ikli�i.
  - �lgili dosya ve fonksiyona referans.
  - Risk/geri ad�m senaryosu.
- Her commit �ncesi:
  - G�venlik etkisi kontrol�
  - Test etkisi raporu
  - �zin/kullan�c� etkisi de�erlendirmesi

## Referans Notu
Bu yol haritas� tamamlanmadan do�rudan kod �retimine ge�ilmeyecektir. �nce her faz, kabul kriteri ve test ile onay al�nd�ktan sonra uygulanacakt�r.









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
