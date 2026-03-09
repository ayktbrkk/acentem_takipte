# GitHub Backlog - Acentem Takipte

## Genel Ozet

| Durum | Issue Sayisi | Tahmini Efor |
|---|---:|---:|
| Tamamlandi | 48 | 78.0 saat |
| Devam Ediyor | 0 | 0 saat |
| Acik | 0 | 0 saat |
| Toplam | **48** | **78.0 saat** |

> Bu backlog mevcut turda aktif takip edilen plan islerini gosterir.

## Issue: 15.1.1 Scheduled report summary endpoint

**Etiketler:** dalga-7, oncelik-yuksek, backend
**Bagli Dalga:** 7
**Durum:** Tamamlandi

**Aciklama:** Admin tarafinda okunabilir zamanlanmis rapor ozeti endpoint'i gelistirildi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/api/reports.py`
- `acentem_takipte/acentem_takipte/services/scheduled_reports.py`

**Tahmini Efor:** 1.5 saat

---

## Issue: 15.1.2 Scheduled reports admin UI

**Etiketler:** dalga-7, oncelik-yuksek, frontend
**Bagli Dalga:** 7
**Durum:** Tamamlandi

**Aciklama:** `Reports.vue` icinde admin icin zamanlanmis raporlar bolumu acildi.

**Dosyalar:**
- `frontend/src/pages/Reports.vue`
- `frontend/src/components/reports/ScheduledReportsManager.vue`

**Tahmini Efor:** 3 saat

---

## Issue: 15.1.3 Scheduled report CRUD API testleri

**Etiketler:** dalga-7, oncelik-orta, backend
**Bagli Dalga:** 7
**Durum:** Tamamlandi

**Aciklama:** Zamanlanmis rapor API davranisini dogrulayan test kapsami eklendi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/tests/test_reports_scheduled_configs.py`

**Tahmini Efor:** 2 saat

---

## Issue: 15.1.4 Scheduled report save/remove API

**Etiketler:** dalga-7, oncelik-orta, backend
**Bagli Dalga:** 7
**Durum:** Tamamlandi

**Aciklama:** Admin panelden kayit degisiklik ve silme akislarini destekleyen endpointler eklendi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/api/reports.py`

**Tahmini Efor:** 2 saat

---

## Issue: 15.1.5 Scheduled report create/update form ve validation UX

**Etiketler:** dalga-7, oncelik-yuksek, frontend
**Bagli Dalga:** 7
**Durum:** Tamamlandi

**Aciklama:** Admin ekranindan create/update/delete akislarini yurutmek icin form yonetimi tamamlandi.

**Dosyalar:**
- `frontend/src/pages/Reports.vue`
- `frontend/src/components/reports/ScheduledReportsManager.vue`
- `frontend/src/components/reports/ScheduledReportsManager.test.js`

**Tahmini Efor:** 4 saat

---

## Issue: 15.1.6 Scheduled report delivery channel to AT Notification Outbox

**Etiketler:** dalga-7, oncelik-yuksek, fullstack
**Bagli Dalga:** 7
**Durum:** Tamamlandi

**Aciklama:** Zamanlanmis rapor teslimi `AT Notification Outbox` akisina baglandi ve ayni job icinde dispatch edilmeye baslandi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/services/scheduled_reports.py`
- `acentem_takipte/acentem_takipte/tasks.py`
- `acentem_takipte/acentem_takipte/tests/test_scheduled_reports.py`
- `acentem_takipte/acentem_takipte/tests/test_tasks_scheduled_reports.py`

**Tahmini Efor:** 6 saat

---

## Issue: 15.5.1 Reporting API regression hardening

**Etiketler:** dalga-7, oncelik-orta, backend
**Bagli Dalga:** 7
**Durum:** Tamamlandi

**Aciklama:** Raporlama genislemesi sonrasinda API testleri mevcut implementasyona hizalandi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/tests/test_reports_api.py`

**Tahmini Efor:** 3 saat

---

## Issue: 16.1 Smoke checklist ve manuel dogrulama plani

**Etiketler:** dalga-7, oncelik-orta, fullstack
**Bagli Dalga:** 7
**Durum:** Tamamlandi

**Aciklama:** Faz 16 kapanisi icin smoke checklist ve manuel dogrulama akisi yazili hale getirildi.

**Dosyalar:**
- `ROADMAP.md`
- `.plan/README.md`
- `.plan/dalga-7.md`
- `.plan/sprint-plan.md`

**Tahmini Efor:** 1.5 saat

---

## Issue: 16.2 Test kosum sirasi ve Dalga 7 kapanis notu

**Etiketler:** dalga-7, oncelik-orta, fullstack
**Bagli Dalga:** 7
**Durum:** Tamamlandi

**Aciklama:** Faz 16 kapanisinda backend, frontend ve manuel smoke adimlarinin sirasi yazili hale getirildi.

**Dosyalar:**
- `ROADMAP.md`
- `.plan/README.md`
- `.plan/dalga-7.md`

**Tahmini Efor:** 1 saat

---

## Issue: 16.3 Anonim smoke ve auth blokaj tespiti

**Etiketler:** dalga-7, oncelik-orta, fullstack
**Bagli Dalga:** 7
**Durum:** Tamamlandi

**Aciklama:** Anonim kullanicida `/at` route yonlendirmesi ve kritik report/session endpoint'lerinin guest korumasi dogrulandi.

**Dosyalar:**
- `ROADMAP.md`
- `.plan/README.md`
- `.plan/dalga-7.md`

**Tahmini Efor:** 0.5 saat

---

## Issue: 1.1.2 Rol ve oturum regression checklist kapanisi

**Etiketler:** dalga-1, oncelik-orta, fullstack
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** `hooks.py`, `api/session.py` ve `frontend/src/router/index.js` uzerinden rol yonlendirme davranisi yazili regression checklist'e baglandi.

**Dosyalar:**
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 1 saat

---

## Issue: 1.2.0 API yetkilendirme inventory baslangici

**Etiketler:** dalga-1, oncelik-yuksek, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Dalga 7 tamamlandi olarak kapatildi ve aktif calisma odagi yeniden Dalga 1 altindaki `Gorev 1.2`ye tasindi.

**Dosyalar:**
- `.plan/README.md`
- `.plan/dalga-1.md`
- `.plan/sprint-plan.md`

**Tahmini Efor:** 2 saat

---

## Issue: 1.3.1 Merkezi redacted error helper ve ilk servis gecisi

**Etiketler:** dalga-1, oncelik-yuksek, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Log redaction icin merkezi helper eklendi; ilk backend hata yollarinda maskeli structured log formatina gecildi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/utils/logging.py`
- `acentem_takipte/acentem_takipte/api/reports.py`
- `acentem_takipte/acentem_takipte/communication.py`
- `acentem_takipte/acentem_takipte/services/scheduled_reports.py`
- `acentem_takipte/acentem_takipte/accounting.py`
- `acentem_takipte/acentem_takipte/tests/test_logging_redaction.py`
- `acentem_takipte/acentem_takipte/tests/test_reports_api.py`

**Tahmini Efor:** 2 saat

---

## Issue: 1.3.2 Notification ve provider hata loglarini maskele

**Etiketler:** dalga-1, oncelik-yuksek, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Notification/controller/provider zincirindeki ham hata loglari merkezi redacted helper'a tasindi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/notifications.py`
- `acentem_takipte/acentem_takipte/doctype/at_claim/at_claim.py`
- `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py`
- `acentem_takipte/acentem_takipte/doctype/at_renewal_task/at_renewal_task.py`
- `acentem_takipte/acentem_takipte/providers/whatsapp_meta.py`

**Tahmini Efor:** 1.5 saat

---

## Issue: 1.3.3 Dashboard ve customer access log redaction kapanisi

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Kalan uygulama ici access log hata basliklari merkezi redacted helper'a tasindi; teknik altyapi istisnalari ayrildi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/api/dashboard.py`
- `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 1 saat

---

## Issue: 2.1.1 Dashboard request-scope policy cache

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Dashboard renewal akislarinda ayni request icinde tekrar eden `AT Policy` kapsam sorgulari request-scope cache helper'i ile toplandi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/api/dashboard.py`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 1.5 saat

---

## Issue: 2.1.2 Dashboard aggregate request-cache optimizasyonu

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Ayni request icinde tekrar hesaplanan dashboard aggregate bloklari ortak request-cache yardimcisi ile toplandi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/api/dashboard.py`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 1.5 saat

---

## Issue: 2.1.3 Dashboard SQL sicak nokta ve index inventory

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Dashboard KPI ve tab payload sorgulari icin raw SQL sicak noktalar, composite index adaylari ve tekrarli pattern envanteri cikarildi.

**Dosyalar:**
- `.plan/dalga-1.md`
- `.plan/README.md`
- `ROADMAP.md`

**Tahmini Efor:** 1 saat

---

## Issue: 2.1.4 Dashboard hot-path index patch

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Dashboard sorgu envanterinden cikan ilk composite index seti icin idempotent migration patch'i eklendi.

**Dosyalar:**
- `acentem_takipte/patches.txt`
- `acentem_takipte/acentem_takipte/patches/v2026_03_09_add_dashboard_hot_path_indexes.py`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 1.5 saat

---

## Issue: 2.1.5 Dashboard v2 where/value cache sadeleştirmesi

**Etiketler:** dalga-1, oncelik-dusuk, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** KPI ve tab payload olusumunda tekrar eden `where/value` uretimleri yerel cache yardimcilariyla toplandi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_kpis.py`
- `acentem_takipte/acentem_takipte/api/dashboard_v2/tab_payload.py`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 1 saat

---

## Issue: 2.1.6 Dashboard secondary index patch

**Etiketler:** dalga-1, oncelik-dusuk, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Ilk hot-path patch disinda kalan insurance-company, policy-status ve reconciliation preview desenleri icin ikinci index patch'i eklendi.

**Dosyalar:**
- `acentem_takipte/patches.txt`
- `acentem_takipte/acentem_takipte/patches/v2026_03_09_add_dashboard_secondary_indexes.py`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 1.5 saat

---

## Issue: 2.2.1 Queue stratejisi ilk envanteri

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** `tasks.py` ve `hooks.py` uzerinden mevcut enqueue edilen isler, senkron kalan agir bloklar ve doc-event fan-out riskleri cikarildi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/tasks.py`
- `acentem_takipte/hooks.py`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 1 saat

---

## Issue: 2.2.2 Scheduled report outbox fan-out refaktoru

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Scheduled reports job icindeki senkron outbox dispatch dongusu kaldirildi; her outbox kaydi ayri queue job'i olarak enqueue edilmeye baslandi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/tasks.py`
- `acentem_takipte/acentem_takipte/tests/test_tasks_scheduled_reports.py`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 1.5 saat

---

## Issue: 2.2.3 Accounting doc-event debounce ve queue refaktoru

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** `sync_doc_event` inline muhasebe senkronundan cikarildi; ayni belge icin tekrarlı update patlamasi cache tabanli debounce ile tek queue job'ina indirildi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/accounting.py`
- `acentem_takipte/acentem_takipte/tests/test_accounting_sync_doc_event.py`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 1.5 saat

---

## Issue: 2.2.4 Queue stratejisi kapanisi ve Faz 2.3 gecisi

**Etiketler:** dalga-1, oncelik-dusuk, fullstack
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Faz 2.2 kapanis notlari yazildi, kabul kriterleri isaretlendi ve aktif odak Faz 2.3 frontend debounce isine tasindi.

**Dosyalar:**
- `.plan/dalga-1.md`
- `.plan/README.md`
- `.plan/sprint-plan.md`
- `ROADMAP.md`

**Tahmini Efor:** 1 saat

---

## Issue: 2.3.1 Dashboard request debounce

**Etiketler:** dalga-1, oncelik-orta, frontend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Dashboard ekraninda tab, tarih araligi ve branch degisimlerinin tetikledigi tekrarli resource reload cagrilari 300ms debounced tek kapida toplandi.

**Dosyalar:**
- `frontend/src/pages/Dashboard.vue`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 1.5 saat

---

## Issue: 2.3.2 Reports request debounce ve Faz 2.3 kapanisi

**Etiketler:** dalga-1, oncelik-orta, frontend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Reports ekraninda branch ve report key kaynakli otomatik rapor yuklemeleri debounce altina alindi; Faz 2.3 plan seviyesinde kapatildi.

**Dosyalar:**
- `frontend/src/pages/Reports.vue`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 1.5 saat

---

## Issue: 3.1.1 Quick create service extraction - customer/lead/policy

**Etiketler:** dalga-1, oncelik-yuksek, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** `api/quick_create.py` icindeki ilk uc create akisinin persistence bolumu yeni `services/quick_create.py` dosyasina tasindi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/services/quick_create.py`
- `acentem_takipte/acentem_takipte/api/quick_create.py`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 2 saat

---

## Issue: 3.1.2 Quick create service extraction - claim/payment/renewal

**Etiketler:** dalga-1, oncelik-yuksek, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** `claim`, `payment` ve `renewal_task` quick create akislarinin persistence bolumu de `services/quick_create.py` altina tasindi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/services/quick_create.py`
- `acentem_takipte/acentem_takipte/api/quick_create.py`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 2 saat

---

## Issue: 3.1.3 Quick create persistence helper consolidation

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Quick create service katmaninda ortak create/update persistence helper'lari toplandi; `update_quick_aux_record` save/commit sorumlulugu da API katmanindan alindi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/services/quick_create.py`
- `acentem_takipte/acentem_takipte/api/quick_create.py`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 1.5 saat

---

## Issue: 3.1.4 Service boundary karari ve sonraki extraction backlog'u

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Faz 3.1 icin API-service siniri sabitlendi; normalization API katmaninda, persistence service katmaninda birakildi. Sonraki extraction adaylari backlog'a yazildi.

**Dosyalar:**
- `.plan/dalga-1.md`
- `.plan/README.md`
- `.plan/sprint-plan.md`
- `ROADMAP.md`

**Tahmini Efor:** 1 saat

---

## Issue: 3.1.5 Reports runtime service extraction

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** `api/reports.py` icindeki payload build, export response ve scheduled report config orchestration mantigi yeni runtime service katmanina tasindi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/services/reports_runtime.py`
- `acentem_takipte/acentem_takipte/api/reports.py`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 1.5 saat

---

## Issue: 3.1.6 Admin jobs dispatch extraction

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** `api/admin_jobs.py` icindeki job dispatch mapping yeni service dosyasina tasindi; API katmaninda guard ve rate-limit sorumlulugu birakildi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/services/admin_jobs.py`
- `acentem_takipte/acentem_takipte/api/admin_jobs.py`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 1.5 saat

---

## Issue: 3.1.7 Accounting runtime extraction

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** `api/accounting.py` icindeki reconciliation workbench read orchestration yeni runtime service katmanina tasindi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/services/accounting_runtime.py`
- `acentem_takipte/acentem_takipte/api/accounting.py`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 1.5 saat

---

## Issue: 3.1.8 Service layer closing note ve Faz 3.2 gecisi

**Etiketler:** dalga-1, oncelik-dusuk, fullstack
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Faz 3.1 tamamlanan service extraction seti ozetlendi ve aktif odak Faz 3.2 yardimci/helper tekillestirmesine tasindi.

**Dosyalar:**
- `.plan/dalga-1.md`
- `.plan/README.md`
- `.plan/sprint-plan.md`
- `ROADMAP.md`

**Tahmini Efor:** 1 saat

---

## Issue: 3.2.1 Reports endpoint helper consolidation

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** `api/reports.py` icindeki report getter/export endpoint ciftleri ortak helper'lar altinda toplandi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/api/reports.py`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 1 saat

---

## Issue: 3.2.2 Mutation access helper consolidation

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** `admin_jobs.py` ve `api/accounting.py` icindeki tekrarlayan write-mutation access wrapper kalibi ortak helper altinda toplandi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/api/mutation_access.py`
- `acentem_takipte/acentem_takipte/api/admin_jobs.py`
- `acentem_takipte/acentem_takipte/api/accounting.py`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 1 saat

---

## Issue: 3.2.3 Quick create normalization karari ve Faz 3.2 kapanisi

**Etiketler:** dalga-1, oncelik-dusuk, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** `quick_create.py` normalization yardimcilari degerlendirildi; request-contract bagimliligi nedeniyle API katmaninda bilincli istisna olarak birakildi. Faz 3.2 plan seviyesinde kapatildi.

**Dosyalar:**
- `.plan/dalga-1.md`
- `.plan/README.md`
- `.plan/sprint-plan.md`
- `ROADMAP.md`

**Tahmini Efor:** 1 saat

---

## Issue: 3.3.1 Financial validation helper normalization

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** `AT Offer` ve `AT Policy` icindeki tekrar eden finans tutarlilik dogrulamasi ortak helper altina tasindi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/utils/financials.py`
- `acentem_takipte/acentem_takipte/doctype/at_offer/at_offer.py`
- `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 1.5 saat

---

## Issue: 3.3.2 Commission legacy compatibility layer

**Etiketler:** dalga-1, oncelik-yuksek, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** `commission_amount` kanonik alan olarak sabitlendi. Python tarafindaki eski `commission` fallback kullanimi ortak helper arkasina alindi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/utils/commissions.py`
- `acentem_takipte/acentem_takipte/accounting.py`
- `acentem_takipte/acentem_takipte/doctype/at_offer/at_offer.py`
- `.plan/dalga-1.md`
- `ROADMAP.md`

**Tahmini Efor:** 2 saat

---

## Issue: 3.3.3 Commission SQL fallback consolidation

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Sicak dashboard ve reporting sorgularindaki `ifnull(commission_amount, commission)` deseni ortak helper altina toplandi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/utils/commissions.py`
- `acentem_takipte/acentem_takipte/api/dashboard.py`
- `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_kpis.py`
- `acentem_takipte/acentem_takipte/services/reporting.py`

**Tahmini Efor:** 1.5 saat

---

## Issue: 3.3.4 Seed/smoke and endorsement commission mirror decision

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Demo ve smoke payload'lari `commission_amount` alanina cekildi. Endorsement apply akisi eski `commission` payload'ini kabul etmeye devam ederken policy uzerinde legacy mirror alanini ayni helper ile normalize ediyor.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/api/seed.py`
- `acentem_takipte/acentem_takipte/api/smoke.py`
- `acentem_takipte/acentem_takipte/doctype/at_policy_endorsement/at_policy_endorsement.py`

**Tahmini Efor:** 1 saat

---

## Issue: 3.3.5 Quick create status literal consolidation

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** `api/quick_create.py` icindeki literal status setleri `utils/statuses.py` icindeki merkezi sabitlere baglandi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/utils/statuses.py`
- `acentem_takipte/acentem_takipte/api/quick_create.py`

**Tahmini Efor:** 1.5 saat

---

## Issue: 3.3.6 Notes normalization helper

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Tekrar eden notes trim/empty ve kismi uzunluk siniri kurali ortak helper altina toplandi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/utils/notes.py`
- `acentem_takipte/acentem_takipte/api/quick_create.py`
- `acentem_takipte/acentem_takipte/accounting.py`

**Tahmini Efor:** 1 saat

---

## Issue: 3.3.7 DocType schema normalization closure note

**Etiketler:** dalga-1, oncelik-orta, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Faz 3.3 kapsamindaki finans, commission, status ve notes normalizasyon adimlari kapatildi; kalan legacy alan istisnalari not edildi.

**Dosyalar:**
- `ROADMAP.md`
- `.plan/dalga-1.md`
- `.plan/README.md`
- `.plan/sprint-plan.md`

**Tahmini Efor:** 0.5 saat

---

## Issue: 3.4.1 Renewal service/pipeline/telemetry skeleton

**Etiketler:** dalga-1, oncelik-yuksek, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Renewal task creation ve notification side-effect'i `renewal/` altinda service/pipeline/telemetry katmanlarina ayrildi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/renewal/service.py`
- `acentem_takipte/acentem_takipte/renewal/pipeline.py`
- `acentem_takipte/acentem_takipte/renewal/telemetry.py`
- `acentem_takipte/acentem_takipte/tasks.py`
- `acentem_takipte/acentem_takipte/doctype/at_renewal_task/at_renewal_task.py`

**Tahmini Efor:** 2 saat

---

## Issue: 3.4.2 Stale renewal remediation and status guards

**Etiketler:** dalga-1, oncelik-yuksek, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Renewal task status transition kurallari merkezilestirildi. Stale auto-created renewal task'ler icin ayrik remediation job'u ve scheduler/admin entegrasyonu eklendi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/renewal/service.py`
- `acentem_takipte/acentem_takipte/renewal/pipeline.py`
- `acentem_takipte/acentem_takipte/renewal/telemetry.py`
- `acentem_takipte/acentem_takipte/doctype/at_renewal_task/at_renewal_task.py`
- `acentem_takipte/acentem_takipte/tasks.py`
- `acentem_takipte/acentem_takipte/api/admin_jobs.py`
- `acentem_takipte/acentem_takipte/services/admin_jobs.py`
- `acentem_takipte/hooks.py`

**Tahmini Efor:** 2 saat

---

## Issue: 3.4.3 Renewal outcome data model skeleton

**Etiketler:** dalga-1, oncelik-yuksek, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Yeni `AT Renewal Outcome` DocType eklendi. Terminal renewal task statulerinde outcome kaydi olusturan/guncelleyen backend iskeleti baglandi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/doctype/at_renewal_outcome/at_renewal_outcome.json`
- `acentem_takipte/acentem_takipte/doctype/at_renewal_outcome/at_renewal_outcome.py`
- `acentem_takipte/acentem_takipte/renewal/service.py`
- `acentem_takipte/acentem_takipte/doctype/at_renewal_task/at_renewal_task.py`
- `acentem_takipte/acentem_takipte/doctype/at_renewal_task/at_renewal_task.json`

**Tahmini Efor:** 2 saat

## Issue: 3.4.4 Renewal lost-reason and retention backend contract

**Etiketler:** dalga-1, oncelik-yuksek, backend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Renewal task veri modeline kayip sebebi ve rakip bilgisi eklendi. Outcome sync, reporting ve dashboard payload'i bu veriyle retention metri?i uretecek sekilde genisletildi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/doctype/at_renewal_task/at_renewal_task.json`
- `acentem_takipte/acentem_takipte/doctype/at_renewal_task/at_renewal_task.py`
- `acentem_takipte/acentem_takipte/api/quick_create.py`
- `acentem_takipte/acentem_takipte/services/quick_create.py`
- `acentem_takipte/acentem_takipte/renewal/service.py`
- `acentem_takipte/acentem_takipte/services/reporting.py`
- `acentem_takipte/acentem_takipte/services/report_registry.py`
- `acentem_takipte/acentem_takipte/api/dashboard.py`

**Tahmini Efor:** 2 saat

---

## Issue: 3.4.5 Renewal UI lost-reason visibility

**Etiketler:** dalga-1, oncelik-orta, frontend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Renewal quick create formu ve renewals listesi kayip sebebi ile rakip bilgisini gosterecek sekilde genisletildi.

**Dosyalar:**
- `frontend/src/config/quickCreateRegistry.js`
- `frontend/src/pages/RenewalsBoard.vue`

**Tahmini Efor:** 1 saat

---

## Issue: 3.4.6 Renewal retention dashboard visibility

**Etiketler:** dalga-1, oncelik-orta, fullstack
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Renewal retention backend payload'i tab series contract'ine eklendi ve dashboard renewal hizli kartlarinda gorunur hale getirildi.

**Dosyalar:**
- `acentem_takipte/acentem_takipte/api/dashboard_v2/tab_payload.py`
- `frontend/src/pages/Dashboard.vue`

**Tahmini Efor:** 1 saat

---

## Issue: 3.4.7 Renewal engine closure note

**Etiketler:** dalga-1, oncelik-dusuk, fullstack
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Faz 3.4 kapsamindaki renewal service, outcome, lost reason ve retention gorunurlugu adimlari kapatildi; aktif odak bir sonraki mimari faza tasindi.

**Dosyalar:**
- ROADMAP.md`n- .plan/dalga-1.md`n- .plan/README.md`n- .plan/sprint-plan.md`n
**Tahmini Efor:** 0.5 saat

---


## Issue: 3.2.1.1 Pinia auth/ui facade stores

**Etiketler:** dalga-1, oncelik-yuksek, frontend
**Bagli Dalga:** 1
**Durum:** Tamamlandi

**Aciklama:** Mevcut reaktif session ve ui modullerini kirici migration yapmadan Pinia store giris noktalarina tasiyan facade store'lar eklendi.

**Dosyalar:**
- rontend/src/stores/auth.js`n- rontend/src/stores/ui.js`n
**Tahmini Efor:** 1 saat

---

