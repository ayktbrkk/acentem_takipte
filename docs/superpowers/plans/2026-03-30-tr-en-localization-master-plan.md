# Acentem Takipte TR/EN Yerelleştirme Uygulama Planı

> **Ajans tabanlı çalışanlar için:** ZORUNLU: Bu planı uygulamak için mevcutsa superpowers:subagent-driven-development, yoksa superpowers:executing-plans kullanın. Adımlar takip için checkbox (`- [ ]`) biçiminde yazılmıştır.

**Amaç:** `acentem_takipte` uygulamasını, kod mimarisini değiştirmeden gelecekte yeni dilleri de destekleyebilecek CSV tabanlı bir çeviri akışıyla İngilizce kaynak dili ve Türkçe ikinci dili olan iki dilli bir Frappe uygulamasına dönüştürmek.

**Mimari:** Kullanıcıya görünen tüm metinlerde kaynak dil İngilizce olacaktır. Python tarafında `frappe._()`, JavaScript/Vue tarafında `__()`, Jinja tarafında `{{ _("...") }}` kullanılacaktır. Çeviri verisi `acentem_takipte/translations/*.csv` altında tutulacak; `en.csv` kaynak şablon, `tr.csv` ise ikinci dil dosyası olacaktır. Dil çözümleme sırası: kullanıcı tercihi -> tarayıcı dili -> İngilizce fallback.

**Teknoloji Yığını:** Frappe Framework, Python, Vue 3, JavaScript, CSV tabanlı çeviri sözlükleri, bench, Vitest, Playwright.

---

## Mevcut Durum

- Çeviri altyapısı zaten kuruldu:
  - `acentem_takipte/translations/en.csv`
  - `acentem_takipte/translations/tr.csv`
  - `acentem_takipte/hooks.py` içinde `translated_languages = ["en", "tr"]`
  - `frontend/src/state/session.js` ve `acentem_takipte/www/at.py` içinde locale fallback
- Hızlı oluşturma sözlüğü İngilizce kaynak etiketlere çevrildi:
  - `frontend/src/config/quickCreate/registry.js`
- Backend seed şablonları ve varsayılan dil akışı İngilizce kaynağa çekildi:
  - `acentem_takipte/acentem_takipte/notification_seed_data.py`
  - `acentem_takipte/acentem_takipte/api/smoke.py`
  - `acentem_takipte/acentem_takipte/api/session.py`
  - `acentem_takipte/acentem_takipte/notification_dispatch.py`
  - `acentem_takipte/acentem_takipte/providers/whatsapp_meta.py`
  - `acentem_takipte/acentem_takipte/services/notifications.py`
  - `acentem_takipte/acentem_takipte/services/campaigns.py`
  - `acentem_takipte/acentem_takipte/services/quick_create_special.py`
  - `acentem_takipte/acentem_takipte/services/scheduled_reports.py`
  - `acentem_takipte/acentem_takipte/api/aux_edit_registry.py`
  - `acentem_takipte/acentem_takipte/setup_utils.py`
- Customer access ve report runtime helper mesajları CSV kaynak envanterine eklendi:
  - `acentem_takipte/acentem_takipte/api/customers.py`
  - `acentem_takipte/acentem_takipte/services/reports_runtime.py`
- Privacy masking limit mesajı ve emergency access validation mesajları İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/services/privacy_masking.py`
  - `acentem_takipte/acentem_takipte/doctype/at_emergency_access/at_emergency_access.py`
- Renewal service içindeki otomatik kapatma notu English-first standartta tutuldu:
  - `acentem_takipte/acentem_takipte/renewal/service.py`
- `at_customer.py` ve `at_policy.py` regex taramasında hardcoded Türkçe string vermedi; dosyalar zaten İngilizce source + `_()` standardına uyuyor.
- `AT Activity` metadata dosyası İngilizce source'a çevrildi:
  - `acentem_takipte/acentem_takipte/doctype/at_activity/at_activity.json`
- `AT Customer` ve `AT Policy` metadata dosyalarındaki kalan Türkçe label/description alanları İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.json`
  - `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.json`
- `AT Customer Segment Snapshot` metadata dosyasındaki kalan Türkçe / ASCII-Türkçe alanlar İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_customer_segment_snapshot/at_customer_segment_snapshot.json`
- `AT Policy Snapshot` metadata dosyasındaki kalan Türkçe alanlar İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_policy_snapshot/at_policy_snapshot.json`
- `AT Payment Installment` metadata dosyasındaki kalan Türkçe alanlar İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_payment_installment/at_payment_installment.json`
- `AT Call Note` metadata dosyasındaki kalan Türkçe alanlar İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_call_note/at_call_note.json`
- `AT Campaign` metadata dosyasındaki kalan Türkçe ve ASCII-Türkçe alanlar İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_campaign/at_campaign.json`
- `AT Policy Endorsement` metadata dosyasındaki kalan Türkçe alanlar İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_policy_endorsement/at_policy_endorsement.json`
- `AT Renewal Outcome` metadata dosyasındaki kalan Türkçe alanlar İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_renewal_outcome/at_renewal_outcome.json`
- `AT Segment` metadata dosyasındaki kalan Türkçe alanlar İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_segment/at_segment.json`
- `AT Customer Relation` metadata dosyasındaki kalan Türkçe alanlar İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_customer_relation/at_customer_relation.json`
- `AT Insured Asset` metadata dosyasındaki kalan Türkçe alanlar İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_insured_asset/at_insured_asset.json`
- `AT Notification Draft` metadata dosyasındaki kalan Türkçe description alanları İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_notification_draft/at_notification_draft.json`
- `AT Accounting Entry` metadata dosyasındaki kalan Türkçe description alanları İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_accounting_entry/at_accounting_entry.json`
- `AT Claim` metadata dosyasındaki kalan Türkçe alanlar İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_claim/at_claim.json`
- `AT Reconciliation Item` metadata dosyasındaki kalan Türkçe alanlar İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_reconciliation_item/at_reconciliation_item.json`
- `AT Lead` metadata dosyasındaki kalan Türkçe alanlar İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_lead/at_lead.json`
- `AT Renewal Task` metadata dosyasındaki kalan Türkçe alanlar İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_renewal_task/at_renewal_task.json`
- `AT Offer` metadata dosyasındaki kalan Türkçe alanlar İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_offer/at_offer.json`
- `AT Payment` metadata dosyasındaki kalan Türkçe alanlar İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_payment/at_payment.json`
- `AT Ownership Assignment` metadata dosyasındaki kalan Türkçe alanlar İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_ownership_assignment/at_ownership_assignment.json`
- `AT Task` metadata dosyasındaki kalan Türkçe alanlar İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_task/at_task.json`
- `AT Reminder` metadata dosyasındaki kalan Türkçe alanlar İngilizce source’a taşındı:
  - `acentem_takipte/acentem_takipte/doctype/at_reminder/at_reminder.json`
- Asıl çalışma, en yüksek trafik alan iki DocType modülü üzerinden backend yerelleştirme ile başlayacak:
  - `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py`
  - `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py`
- Lead stale etiketleri translation katalogundan çözülür hale getirildi:
  - `frontend/src/composables/useLeadDetailRuntime.js`
- Policy / Claims quick-assignment eyebrow fallback'leri source-English hale getirildi:
  - `frontend/src/composables/usePolicyDetailQuickDialogs.js`
  - `frontend/src/composables/useClaimsBoardRuntime.js`
- Lead list'teki "All" filtresi katalogdan çözülür hale getirildi:
  - `frontend/src/composables/useLeadListTableData.js`
- OfferBoard validation mesajları source-English helper'a bağlandı:
  - `frontend/src/composables/offerBoard/quickOffer.js`
- Translation catalog ve CSV'lere eksik source'lar eklendi:
  - `frontend/src/generated/translations.js`
  - `acentem_takipte/translations/en.csv`
  - `acentem_takipte/translations/tr.csv`
- **Durum analizi (2026-03-31):** Tüm 20+ frontend sayfasında zaten `copy = { tr: {...}, en: {...} }` yapısı mevcut. English string'ler `en:` altında kaynak olarak duruyor. Mevcut `t(key)` fonksiyonu locale'ye göre çeviri yapıyor. `translateText` i18n utility'si de CSV kataloğuna bağlı.
- **Commit:** `2fb32ab` — `refactor: normalize remaining locale fallbacks`

---

## Devam Eden Çalışma & Güncellemeler (2026-04-03)

### ✅ SON OTURUM KAPANIŞ (2026-04-03) — Critical Violations RESOLVED

**Tarih:** 2026-04-03 | **Durum:** Blocking violations resolved

**Phase 1 Summary:**
- ✅ 16 bare `frappe.throw()` → wrapped (commit 3f5072c)
- ✅ 234 missing en.csv sources → added (commit efa478a) 
- ✅ 0 placeholder consistency critical issues
- ✅ Guardrail infrastructure deployed (commit 951a28b)
- ✅ Backend tests: Ran 176 tests, OK (skipped=24)

**Status:** Zero-tolerance localization for blocking violations ✅

### 🔄 PHASE 2 BAŞLANGIÇ (2026-04-03) — Tüm Sayfalarda TR/EN Uyum Dalgası

**Yeni Hedef (kullanıcı talebi):** Sadece 3 ekran değil, tüm uygulama sayfalarında Türkçe/İngilizce uyumsuzluklarını kapatmak.

**Kapsam:**
- `frontend/src/pages/**/*.vue`
- `frontend/src/components/**/*.vue`
- ortak i18n akışı (`FilterBar`, çeviri sözlüğü, status label map'leri)

**Bu dalgada tamamlananlar:**
- ✅ `RenewalsBoard` key sızıntısı kapatıldı (`columnOpen`, `columnInProgress`, `columnCancelled`, `priority*`, `metricDue` key'leri eklendi).
- ✅ `CustomerSearchPage` tamamen i18n hale getirildi (breadcrumb, title, help card, request history, status map).
- ✅ `GlobalCustomerSearch` bileşeni hardcoded EN metinlerden arındırıldı (placeholder, butonlar, empty-state, not-found, masked-notice, alan etiketleri).
- ✅ `ReconciliationDetail` locale bug fix: `copy.tr[...]` sabiti kaldırıldı, aktif locale'e bağlandı.
- ✅ `FilterBar` locale kaynağı global auth locale ile hizalandı; arama placeholder'ı prop ile override edilebilir hale getirildi.
- ✅ `generated/translations.js` sözlüğüne reports + global customer search + genel UI anahtarları eklendi (`Search...`, reports metinleri vb).

**Aktif Backlog (Phase 2):**
- [x] `Reports.vue` için kalan EN-only metinlerin görsel doğrulaması ve eksik TR karşılıkları → translations.js duplike temizliği + Wave 3 ile kapatıldı.
- [x] `PolicyList`, `Claims`, `Lead`, `Offer` filtre bileşenlerinde placeholder ve enum label son kontrolü → Tüm StatusBadge.vue domain etiketleri TR sözlüğünde mevcut, ClaimsBoard kolon başlıkları Wave 3'te düzeltildi.
- [x] TR modunda tüm sayfalarda smoke walkthrough (UI labels, status badges, CTA metinleri). → Wave 4 + Canlı Smoke ile kapatıldı (2026-04-03).
- [x] EN modunda regresyon kontrolü (TR text bleed olmamalı). → Wave 4 + Canlı Smoke ile kapatıldı (2026-04-03).

**Phase 2 Wave 2 özeti (commit `3a76151`, 2026-04-03):**
- ✅ P0: `PaymentDetail.vue` — `computed(() => "tr")` hardcode → authStore.locale okuma
- ✅ P0: `App.vue` — "Yenile"/"Kapat" hardcode → locale-aware banner metinleri
- ✅ P1: `AccessRequestForm.vue` — sıfırdan `copy{tr,en}` + `t()` (tümü EN hardcode'du)
- ✅ P1: `ClaimsBoardTableSection.vue` — `"Hasar bulunamadı."` → `t('empty')`
- ✅ P1: `RenewalTaskDetail.vue` — 'tr' fallback düzeltme + 4 hardcoded empty state + tüm computed field label'ları + priorityLabel fonksiyonu
- ✅ P2: 6 dosya `|| "tr"` fallback → `|| "en"` (pages + composables)
- ✅ P3: 14 dosya `locale: { default: "tr" }` → `"en"` (prop defaults, policy-form, QuickCreate vb.)

**Phase 2 Wave 3 özeti (commit `ec893b6`, 2026-04-03):**
- ✅ `ClaimsBoard.vue`: `claimsTableColumns` statik TR array → `computed()` + `t()` (8 yeni copy key)
- ✅ `translations.js`: duplike ilk blok kaldırıldı (60+ çakışan daha kötü çeviri); ikinci blok otoriter kaynak

**Phase 2 Wave 4 özeti (commit `864c2d8`, 2026-04-03):**
- ✅ `ReportsScheduledSection.vue`: `default: "tr"` → `"en"` (prop default)
- ✅ `quickCreateCopy.js`: `getQuickCreateEyebrow/getQuickCreateLabels` locale default `"tr"` → `"en"`
- ✅ `relatedQuickCreate.js`: `getRelatedQuickCreateActionLabel` locale default `"tr"` → `"en"`
- ✅ `registry.js`: 3x notification/template `language: "tr"` → `"en"`, `getLocalizedText` default + fallback sırası düzeltildi
- ✅ `useAuxWorkbenchRuntime.js`: notification_draft `form.language = "tr"` → activeLocale'den türetildi
- ✅ `QuickCreateManagedDialog.vue`: 3x inline locale ternary → `translateText('Close', locale)`

**Canlı Smoke (commit `3f39d0b`, 2026-04-03):**
- ✅ TR/EN locale switching: `set_session_locale(tr)` → `locale: tr`, `set_session_locale(en)` → `locale: en` ✅
- ✅ Frappe sistem mesajları locale'e göre değişiyor (TR'de Türkçe, EN'de İngilizce) ✅
- ✅ Kendi `_()` wrapped validation throw'larımız da locale'e göre değişiyor:
  - TR: `"Kimlik numarası 10 veya 11 haneli olmalıdır."` ✅
  - EN: `"Identity number must be 10 or 11 digits."` ✅
- ✅ 3 eksik CSV çevirisi eklendi: `customers.py` validation mesajları (`en.csv` + `tr.csv`)
- **Build:** `npm run build` ✅ | **Tests:** 258/258 ✅ | **Git:** main güncel

### Final Checkpoint (2026-03-31 Gece Geç)

- ✅ Faz 6 backend test stabilizasyonu tamamlandı.
- ✅ `bench --site at.localhost run-tests --app acentem_takipte --skip-before-tests` tam koşu **green**:
  - `Ran 176 tests in 19.124s`
  - `OK (skipped=24)`
- ✅ Kapanan ana kümeler:
  - Test fixture zorunlu alan uyumları (`AT Sales Entity.office_branch`, `AT Office Branch` fallback fixture akışı).
  - Refactor sonrası patch hedef/path uyumları (api/service/doctypes).
  - Break-glass workflow test izolasyonu ve submit akışı stabilizasyonu.
  - Dashboard/notification smoke testlerinde cache ve provider bağımlılığı izolasyonu.
- ℹ️ Test sırasında görülen CSS parser mesajları warning seviyesinde kaldı; backend test sonucunu etkilemedi.

### Güncel Checkpoint (2026-03-31 Gece)

- ✅ Lokalizasyon kapanışı tamamlandı (backend throw wrapping + CSV + frontend regression + build + TR/EN canlı smoke).
- ✅ `developer_mode=0` + `build-message-files` + `clear-cache` ile live API JSON davranışı stabilize edildi.
- ✅ **Backend test altyapısı uyumluluk/hijyen fazı kapatıldı.**
  - `bench --site at.localhost run-tests --app acentem_takipte --skip-before-tests` sonucu: `Ran 176 tests`, `OK (skipped=24)`.
  - Faz 6 kapsamındaki discovery, fixture izolasyonu ve kontrat testleri tamamlandı.

### Canlı Yayın Checkpoint (2026-03-31 Gece)

- ✅ GitHub `main` güncel ve yayında.
- ✅ Frontend yayın build'i alındı (`npm run build`).
- ✅ Backend yayın adımları çalıştırıldı (`bench migrate`, `build-message-files`, `clear-cache`, `bench build --app acentem_takipte`).
- ✅ Canlı erişim doğrulandı (`http://at.localhost:8000/at/` -> HTTP 200).
- ✅ Post-deploy doğrulama:
  - Backend: `Ran 176 tests`, `OK (skipped=24)`.
  - Frontend: `Test Files 81 passed`, `Tests 258 passed`.

### Yeni İlerleme Aşaması (Faz 6)

1. ✅ **Aşama 6.1 - Test Discovery Stabilizasyonu**
  - Eski test API importları ve syntax/dosya-bağımlılığı kaynaklı discovery crash'leri temizlendi.
2. ✅ **Aşama 6.2 - Fixture İzolasyon Sertleştirme**
  - Global monkeypatch/module cache kaynaklı sızıntılar ve fixture çakışmaları izole edildi.
3. ✅ **Aşama 6.3 - Kontrat Test Dengeleme**
  - Break-glass, dashboard, notification ve ilgili kontrat/smoke test beklentileri güncel davranışla hizalandı.
4. ✅ **Aşama 6.4 - Tam Backend Green + Release Notu**
  - Tam backend test koşusu green alındı ve plan dokümanı final checkpoint ile güncellendi.

### ✅ KRİTİK BULGU KAPANIŞI: Backend API Message Lokalizasyonu

**Tarih:** 2026-03-31 | **Tarayan:** Automated codebase audit

**Durum:** Bu bulgu kapatıldı.

**Kapanış Özeti:**
- `api/`, `services/` ve 8 doctype validation dosyasında toplam 73 throw i18n wrapper ile sarıldı.
- `en.csv` / `tr.csv` tarafına 44 kaynak mesaj senkronize edildi.
- Kapanış commitleri: `83d2a38` (backend wrapper), `f2dffd0` (CSV sync).

### Doğrulama Sonuçları

Sonraki dalga hedefleri kontrol edildi:

1. **`CustomerList.vue`** - `copy = { tr: {...}, en: {...} }` ✅
2. **`Dashboard.vue`** - `copy = { tr: {...}, en: {...} }` ✅
3. **`LeadList.vue`** - `copy = { tr: {...}, en: {...} }` ✅
4. **`usePolicyFormRuntime.js`** - `copy = { tr: {...}, en: {...} }` ✅

Tüm dosyalarda English string'ler `en:` altında kaynak olarak duruyor.

### Genel Durum

Frontend yerelleştirme durumu:
- 20+ Vue sayfasında `copy = { tr: {...}, en: {...} }` yapısı mevcut ✅
- English string'ler `en:` altında kaynak olarak duruyor ✅
- `translateText` i18n utility'si CSV kataloğuna bağlı ✅
- Turkish karakterli string'ler sadece `tr:` alanlarında (bu doğru) ✅

**Backend API/Service/DocType Durumu:**
- `at_customer.py`: ✅ Compliant (7 throws `frappe._()` ile sarılı)
- `at_policy.py`: ✅ Compliant (4 throws `frappe._()` ile sarılı)
- `api/dashboard.py`: ✅ **TAMAMLANDI** (24 throw sarıldı → commit `83d2a38`)
- `api/filter_presets.py`: ✅ **TAMAMLANDI** (3 throw sarıldı → commit `83d2a38`)
- `api/list_exports.py`: ✅ **TAMAMLANDI** (1 throw sarıldı → commit `83d2a38`)
- `api/session.py`: ✅ **TAMAMLANDI** (2 throw sarıldı → commit `83d2a38`)
- `services/branches.py`: ✅ **TAMAMLANDI** (1 throw sarıldı → commit `83d2a38`)
- `services/scheduled_reports.py`: ✅ **TAMAMLANDI** (4 throw sarıldı → commit `83d2a38`)
- `doctype validation (8 files)`: ✅ **TAMAMLANDI** (38 throw sarıldı → commit `83d2a38`)
- **Toplam: 73 throw sarıldı, 44 kaynak string CSV'ye eklendi**

### Güncellemeler (2026-03-31)

- ✅ `useSidebarNavigation.js` - `copy` yapısını `{ tr: {...}, en: {...} }` formatına dönüştürüldü
- ✅ `useAuxWorkbenchViewModel.js` - `copy` yapısını `{ tr: {...}, en: {...} }` formatına dönüştürüldü (87 tuş)
- ✅ Build doğrulaması geçti

### Kalan Görevler

- ✅ Faz 1-6 ve yayın doğrulama adımları tamamlandı.
- ℹ️ Açık teknik blokaj bulunmuyor; yalnızca dokümantasyon sadeleştirme/temizlik işleri kalır.

### Kalan Çalışmalar
### ✅ Tamamlanan Çalışmalar (2026-03-31)

1. ✅ **Backend API Message Wrapping** - 73 throw sarıldı (commit `83d2a38`)
  - `api/dashboard.py` - 24 throw
  - `api/filter_presets.py`, `api/list_exports.py`, `api/session.py` - 6 throw
  - `services/branches.py`, `services/scheduled_reports.py` - 5 throw
  - 8 doctype validation files - 38 throw

2. ✅ **CSV Enumeration + Sync** - 44 kaynak string (commit `f2dffd0`)
  - 44 unique source string `en.csv`'ye eklendi
  - 44 Turkish çeviri `tr.csv`'ye eklendi (glossary tutarlı)

3. ✅ **Frontend Test Fixes** - 14 pre-existing test onarıldı (commit `f1db740`)
  - Sidebar "Genel Görünüm" label düzeltildi
  - quickCreateRegistry 441 locale key sorunları çözüldü
  - CommunicationCenter + RenewalTaskDetail test fixture'ları düzeltildi
  - **258/258 Vitest testi geçiyor**

4. ✅ **Build Doğrulama** - `npm run build` başarılı (26.81s)

5. ✅ **Mesaj sözlüğü yenileme** - `bench --site at.localhost build-message-files` + `clear-cache` tamamlandı
6. ✅ **Canlı TR/EN Smoke** - API doğrulaması tamamlandı (locale switch + aynı validation hatasında TR/EN mesaj farkı doğrulandı)

### WSL Frappe Sunucusu (Canlı Test için Hazır)

- URL: `http://at.localhost:8000/at/`
- Login: `Administrator` / `admin`
- Status: ✅ Accessible (2026-03-31 verified)
- Usage: Phase 12 canlı TR/EN smoke test için ready

---

## Test Sonuçları (2026-03-31)

### ✅ Frontend Hotspot Audit
- **Durum:** Başarılı - Compliance doğrulandı
- **Coverage:** 20+ Vue sayfası + 69 Vitest dosyası + 14 E2E spec
- **Bulgu:** Tüm sayfalar `copy = { tr: {...}, en: {...} }` formatında. English source kataloğa bağlı.
- **Result:** Frontend lokalizasyon altyapısı ✅ ready
- **Result:** Frontend lokalizasyon altyapısı ✅ ready

### ✅ Backend i18n Closure (2026-03-31)
- **Durum:** Tamamlandı
- **Coverage:** 14 Python dosyası — `api/`, `services/`, `doctype/` (8 dosya)
- **Bulgu:** 73 `frappe.throw("...")` → `frappe.throw(_("..."))` sarıldı
- **CSV:** 44 kaynak string `en.csv` + `tr.csv` eklendi
- **Commit:** `83d2a38` (backend) + `f2dffd0` (CSV)

### ✅ Frontend Test Closure (2026-03-31)
- **Durum:** Tamamlandı
- **Coverage:** 81 test dosyası, 258 test
- **Bulgu:** 14 pre-existing failure onarıldı (Sidebar, quickCreate i18n, CommunicationCenter, RenewalTaskDetail)
- **Result:** 258/258 ✅ — `Test Files 81 passed (81)`
- **Build:** `npm run build` ✅ 26.81s
- **Commit:** `f1db740`
### ✅ Frappe Sunucusu Erişimi
- **Status:** Başarılı - Sunucu accessible
- **URL:** http://at.localhost:8000/at/
- **Test:** Login sayfası returned (Frappe responsive)
- **Credentials:** Administrator / admin
- **Implication:** Canlı TR/EN smoke test Phase 12'de mümkün ✅

### ✅ Backend API Message Audit (KAPATILDI)
- **Durum:** Kapatıldı
- **Bulgu (Tarihi):** 31 api/service + 38 doctype çıplak `frappe.throw()` string
- **Uygulanan Çözüm:** 73 throw i18n wrapper ile sarıldı; CSV kaynakları senkronize edildi
- **Doğrulama:** Backend test koşusu green (`Ran 176 tests`, `OK`, skipped=24)

### ✅ bench build --app acentem_takipte
- **Durum:** Başarılı
- **Not:** Yayın döngüsünde `bench migrate` ve frontend `npm run build` ile birlikte doğrulandı.

---

## Repo Gap Audit (2026-03-30)

Tam repo taraması sonrası, henüz ele alınması gereken başlıca yerelleştirme yüzeyleri şunlar:

### Backend hot spot kümeleri

- `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py`
- `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py`
- `acentem_takipte/acentem_takipte/**/*.py` içindeki kalan ortak helper ve report/notification string’leri
- `acentem_takipte/acentem_takipte/api/customers.py`
- `acentem_takipte/acentem_takipte/services/reports_runtime.py`

### Tamamlanan backend normalizasyon dalgaları

- `acentem_takipte/acentem_takipte/services/report_exports.py`
- `acentem_takipte/acentem_takipte/services/list_exports.py`
- `acentem_takipte/acentem_takipte/setup_utils.py`
- `acentem_takipte/acentem_takipte/api/seed.py`
- `acentem_takipte/acentem_takipte/services/policy_360.py`
- `acentem_takipte/acentem_takipte/utils/i18n.py`

Bu dosyalarda source-only İngilizce düzeni ve CSV tabanlı locale çözümleme uygulanmış durumda.

### Frontend hot spot kümeleri

Görünür copy’nin büyük kısmı hâlâ bu dosya ailelerinde toplanıyor:

- `frontend/src/pages/Dashboard.vue`
- `frontend/src/pages/PolicyList.vue`
- `frontend/src/pages/RenewalsBoard.vue`
- `frontend/src/pages/PolicyDetail.vue`
- `frontend/src/pages/OfferBoard.vue`
- `frontend/src/pages/CustomerDetail.vue`
- `frontend/src/pages/CommunicationCenter.vue`
- `frontend/src/pages/ClaimsBoard.vue`
- `frontend/src/pages/LeadList.vue`
- `frontend/src/pages/PaymentsBoard.vue`
- `frontend/src/pages/ImportData.vue`
- `frontend/src/pages/ExportData.vue`
- `frontend/src/pages/ReconciliationWorkbench.vue`
- `frontend/src/pages/RenewalTaskDetail.vue`
- `frontend/src/pages/OfferDetail.vue`
- `frontend/src/composables/usePolicyFormRuntime.js`
- `frontend/src/composables/useRenewalsBoardRuntime.js`
- `frontend/src/composables/useSidebarNavigation.js`

### Metadata hot spot

- `acentem_takipte/acentem_takipte/doctype/at_activity/at_activity.json`

### Yeni öncelik notu

Bu tarama sonrası yeni ilk dalga şu olmalı:
1. Önce `at_customer.py` ve `at_policy.py`
2. Son olarak frontend copy kümesi

---

## Genel Kurallar

1. **Kaynak string’ler her zaman İngilizce olacak**
   - Kodda kullanıcıya görünen tüm metinler önce İngilizce yazılmalıdır.
   - Türkçe çeviriler `tr.csv` içinde tutulur.

2. **Doğru Frappe sarmalayıcısını kullan**
   - Python: `from frappe import _`
   - JS/Vue: `__()`
   - Jinja/HTML: `{{ _("...") }}`

3. **Dinamik string’leri parçalama**
   - Yanlış: `_("Policy") + " " + policy_no + " " + _("created")`
   - Doğru: `_("Policy {0} has been created").format(policy_no)`

4. **Belirsiz kaynak string’lerde context kullan**
   - Örnek:
     - `_("Type", context="Policy Type")`
     - `_("Type", context="Document Type")`

5. **Sözlük tutarlılığını koru**
   - `Policy` -> `Poliçe`
   - `Endorsement` -> `Zeyil`
   - `Installment` -> `Taksit`
   - `Renewal` -> `Yenileme`
   - `Gross Premium` -> `Brüt Prim`
   - `Net Premium` -> `Net Prim`
   - `Effective Date` -> `Yürürlük Tarihi`
   - `Expiry Date` -> `Bitiş Tarihi`
   - `Policyholder` -> bağlama duyarlı çeviri:
     - müşteri odaklı poliçe bağlamında `Sigortalı`
     - resmi / sözleşmesel bağlamda gerektiğinde `Ettiren`

6. **DocType JSON’ları güvenli şekilde ele al**
   - Kontrollü Frappe export / fixtures / editor akışlarını tercih et.
   - Şema veya seçenekleri bozabilecek dikkatsiz manuel düzenlemelerden kaçın.

7. **Küçük parçalar halinde commit yap**
   - Tercihen her dosya ailesi ayrı commit olsun.
   - `customer` ve `policy`, büyük ve denetlenmesi zor tek bir değişiklik içinde birleştirilmemeli.

8. **Hardcoded Türkçe string keşfi zorunlu ilk adımdır**
   - Dönüşüm mantığına geçmeden önce regex taramasıyla kaynak envanteri çıkarılmalıdır.

9. **Frappe translation tooling dikkat ister**
   - `bench build-message-files` gibi komutlar çalışma ağacındaki CSV çeviri dosyalarını yeniden yazabilir.
   - Bu komutlar yalnızca diff kontrolü yapılarak ve gerekirse yedek alındıktan sonra kullanılmalıdır.

---

## Arama / Keşif Kalıbı

Muhtemel hardcoded Türkçe string’leri bulmak için şu regex’i kullan:

```regex
[^"']*[ğĞüÜşŞİıöÖçÇ][^"']*
```

Önerilen arama hedefleri:
- `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py`
- `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py`
- `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.json`
- `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.json`
- bu dosyaların import ettiği yardımcı modüller

Önerilen CLI karşılığı:

```powershell
rg -n --pcre2 '[^"']*[ğĞüÜşŞİıöÖçÇ][^"']*' acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py
rg -n --pcre2 '[^"']*[ğĞüÜşŞİıöÖçÇ][^"']*' acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py
```

---

## Faz Haritası

| Faz | Görev | İlgili Dosya/Yol | Durum | Öncelik |
|---|---|---|---|---|
| Altyapı | Translation klasörü + CSV şablonu + hooks + locale fallback | `acentem_takipte/translations/*.csv`, `acentem_takipte/hooks.py` | ✅ Tamamlandı | Yüksek |
| Backend | `at_customer.py` + `at_policy.py` yerelleştirme geçişi | `doctype/at_customer/`, `doctype/at_policy/` | ✅ Tamamlandı | Yüksek |
| Backend | Rapor ve liste dışa aktarma + seed şablonları | `services/report_exports.py`, `services/list_exports.py`, `notification_seed_data.py` vs. | ✅ Tamamlandı | Yüksek |
| Frontend | Sidebar + AuxWorkbench `copy` yapısı geçişi | `useSidebarNavigation.js`, `useAuxWorkbenchViewModel.js` | ✅ Tamamlandı `90af0aa` | Yüksek |
| Backend API | `api/dashboard.py` 24 throw sarıldı | `api/dashboard.py` | ✅ Tamamlandı `83d2a38` | Yüksek |
| Backend API/Servis | 5 dosya, 11 throw sarıldı | `api/filter_presets.py`, `api/list_exports.py`, `api/session.py`, `services/branches.py`, `services/scheduled_reports.py` | ✅ Tamamlandı `83d2a38` | Yüksek |
| Backend DocType | 8 validation dosyası, 38 throw sarıldı | `doctype/at_activity/`, `at_task/`, `at_ownership_assignment/` vs. | ✅ Tamamlandı `83d2a38` | Yüksek |
| CSV Sync | 44 kaynak string `en.csv` + `tr.csv`'ye eklendi | `translations/en.csv`, `translations/tr.csv` | ✅ Tamamlandı `f2dffd0` | Yüksek |
| Frontend Test | 14 pre-existing Vitest hatası düzeltildi — 258/258 ✅ | `Sidebar.vue`, `quickCreate/registry.js`, `CommunicationCenter.test.js` vs. | ✅ Tamamlandı `f1db740` | Yüksek |
| Build | `npm run build` başarılı | `frontend/` | ✅ Tamamlandı | Yüksek |
| Mesaj sözlüğü yenileme | Frappe mesaj sözlüğü yenileme | WSL: `bench --site at.localhost build-message-files` + `bench --site at.localhost clear-cache` | ✅ Tamamlandı | Orta |
| Canlı Smoke | TR/EN dil toggle + hata mesajı doğrulama | API smoke: `set_session_locale` + `get_customer_360_payload` | ✅ Tamamlandı | Orta |
| Backend Test Harness | Test altyapısı uyumluluk ve fixture izolasyon düzeltmeleri | `acentem_takipte/acentem_takipte/tests/**/*.py` | ✅ Faz 6 tamamlandı | Orta |

---

## Faz 2: Backend Yerelleştirme Başlangıcı

> Not (2026-03-31): Aşağıdaki checkbox listesi tarihsel uygulama şablonudur. Bu fazdaki görevler tamamlanmış ve sonuçları üstteki checkpoint bölümlerinde kapanmıştır.

Bu faz özellikle küçük ve kontrollü tutulacak. İlk çalışma `at_customer.py`, ardından `at_policy.py` üzerinde olacak. Mümkün oldukça her dosya ayrı commit ile ilerleyecek.

### Görev 2.1: `at_customer.py` envanteri

**Dosyalar:**
- Değiştir: `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py`
- Test: varsa `acentem_takipte/acentem_takipte/doctype/at_customer/` altındaki hedeflenmiş backend testleri

- [ ] **Adım 1: Türkçe string regex taramasını çalıştır**

Çalıştır:
```powershell
rg -n --pcre2 '[^"']*[ğĞüÜşŞİıöÖçÇ][^"']*' acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py
```
Beklenen: olası hardcoded Türkçe string’lerin ve satır numaralarının listesi.

- [ ] **Adım 2: Her string’i kategorize et**

Her eşleşmeyi şu kategorilerden birine ayır:
- Hata mesajı
- Başarı mesajı
- Validasyon mesajı
- Etiket / buton / UI metni
- Kullanıcıya gösterilmemesi gereken teknik mesaj

Beklenen: dosyayı değiştirmeden önce kategorize edilmiş bir envanter notu.

- [ ] **Adım 3: İngilizce source string’i tanımla**

Kullanıcıya görünen her string için ana İngilizce source karşılığını yaz ve context gerekip gerekmediğine karar ver.

Beklenen:
- İngilizce source açıkça tanımlanmış olacak
- belirsiz string’lerde `context` kullanılacak
- dinamik string’ler placeholder’lı olacak

- [ ] **Adım 4: CSV girişlerini güncelle**

Kaynak envanterini şuraya senkronize et:
- `acentem_takipte/translations/en.csv`
- `acentem_takipte/translations/tr.csv`

Beklenen:
- her string için tek source satırı
- bozuk virgül / boş sütun yok
- sözlük terimleri tutarlı

- [ ] **Adım 5: Python string’lerini dönüştür**

Kullanıcıya görünen string’leri `_()` ile sar ve dinamik mesajları `.format()` ile yeniden yaz.

Beklenen:
- dosyada `from frappe import _` mevcut olacak
- kullanıcıya gösterilen metinlerde parçalanmış string birleştirmesi olmayacak

- [ ] **Adım 6: Mesaj sözlüğünü yenile**

Çalıştır:
```powershell
bench --site at.localhost get-msg-dict acentem_takipte
```
Beklenen: message dictionary yenilemesi hatasız tamamlanır.

- [ ] **Adım 7: Hedefli testleri çalıştır**

Çalıştır:
```powershell
bench --site at.localhost run-tests --app acentem_takipte
```
Beklenen:
- hedefli testler geçer
- yeni çeviri kaynaklı regresyon oluşmaz

- [x] **Adım 8: Commit** ✅

Commit mesajı:
```bash
git commit -m "refactor: localize customer backend messages"
```

**Tamamlanma Kriteri:** ✅ Tamamlandı (commit 83d2a38)
- ✅ `at_customer.py` içindeki tüm kullanıcıya dönük string'ler sarılmış
- ✅ dinamik string'ler placeholder kullanıyor
- ✅ context kullanılıyor
- ✅ `en.csv` / `tr.csv` güncellendi
- ✅ testler geçiyor

---

### Görev 2.2: `at_policy.py` envanteri

**Dosyalar:**
- Değiştir: `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py`
- Test: `acentem_takipte/acentem_takipte/doctype/at_policy/test_at_policy.py`

- [ ] **Adım 1: Türkçe string regex taramasını çalıştır**

Çalıştır:
```powershell
rg -n --pcre2 '[^"']*[ğĞüÜşŞİıöÖçÇ][^"']*' acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py
```
Beklenen: aday string’lerin eksiksiz envanteri.

- [ ] **Adım 2: Her string’i kategorize et**

Kategoriler:
- Hata
- Başarı
- Validasyon
- UI / etiket
- Teknik

Beklenen: neyin dönüştürüleceği ve neyin teknik olarak kalacağı netleşmiş olacak.

- [ ] **Adım 3: İngilizce source string’i tanımla**

Beklenen:
- source string’ler kısa ve net İngilizce cümleler olacak
- `Type`, `Status`, `Save`, `Reset` gibi belirsiz terimlerde context eklenecek
- sektörel terimler sözlüğe uygun olacak

- [ ] **Adım 4: CSV girişlerini güncelle**

Şuralarla senkronize et:
- `acentem_takipte/translations/en.csv`
- `acentem_takipte/translations/tr.csv`

Beklenen:
- sözlük uyumu
- aynı source için çakışan çeviriler yok

- [ ] **Adım 5: Python string’lerini dönüştür**

Beklenen:
- `from frappe import _` import edilmiş olacak
- tüm kullanıcıya dönük string’ler `_()` ile sarılacak
- dinamik mesajlarda `.format()` kullanılacak

- [ ] **Adım 6: Mesaj sözlüğünü yenile**

Çalıştır:
```powershell
bench --site at.localhost get-msg-dict acentem_takipte
```

Beklenen: dictionary yenilemesi başarıyla tamamlanır.

- [ ] **Adım 7: Hedefli testleri çalıştır**

Çalıştır:
```powershell
bench --site at.localhost run-tests --app acentem_takipte
```

Beklenen:
- `test_at_policy.py` yeşil kalır
- çeviri değişiklikleri poliçe davranışını bozmaz

- [ ] **Adım 8: Commit**

Commit mesajı kılavuzu:
```bash
git commit -m "refactor: localize policy backend messages"
```

**Tamamlanma Kriteri:**
- `at_policy.py` içindeki tüm kullanıcıya dönük string’ler İngilizce source ve `_()` ile sarılmış olacak
- dinamik string’ler placeholder tabanlı olacak
- context gerekli yerlerde kullanılacak
- `en.csv` / `tr.csv` güncellenmiş olacak
- testler ve message dict yenilemesi geçecek

---

### Görev 2.3: Ortak backend yardımcıları

**Dosyalar:**
- Değiştir: `at_customer.py` ve `at_policy.py` tarafından import edilen yardımcı modüller
- Değiştir: `acentem_takipte/acentem_takipte/services/*.py`
- Değiştir: `acentem_takipte/acentem_takipte/api/*.py`

- [ ] **Adım 1: Ortak modüllerde kullanıcıya dönük metinleri tara**
- [ ] **Adım 2: `_()` ile dönüştür**
- [ ] **Adım 3: Gereken yerlere context ekle**
- [ ] **Adım 4: CSV’yi senkronize et**
- [ ] **Adım 5: bench msg dict yenilemesini çalıştır**
- [ ] **Adım 6: Testleri çalıştır**
- [ ] **Adım 7: Commit et**

**Tamamlanma Kriteri:**
- backend mesajları ortak servislerde tutarlı kalır
- ortak modüllerde hardcoded Türkçe kullanıcı metni kalmaz

---

## Sonraki Fazlar (Backend başlangıcı stabil olana kadar başlamayın)

### Faz 3: Frontend Yerelleştirme

Hedefler:
- `frontend/src/pages/*`
- `frontend/src/components/*`
- `frontend/src/composables/*`

Kurallar:
- kullanıcı arayüzü metinlerinde `__()` kullan
- sayfa başlıklarını, butonları, boş durumları, tooltip’leri ve hataları dönüştür
- İngilizce source’u anahtar olarak koru

Başarı kriterleri:
- dil değişimi görünür metni gerçekten değiştirir
- görünür UI copy içinde hardcoded Türkçe string kalmaz
- dinamik UI copy placeholder ve context kullanır

### Faz 4: Metadata / DocType Yerelleştirme

Hedefler:
- `acentem_takipte/acentem_takipte/doctype/**/*.json`

Kurallar:
- şemayı bozma
- kontrollü export/fixtures/editor akışını tercih et
- label/description/options metinlerini İngilizce source temelli tut

Başarı kriterleri:
- DocType label/description/options çevrilebilir olur
- fixtures veya export adımları şemayı bozmaz

### Faz 5: Doğrulama, Smoke ve Release

Komutlar:
- `bench --site at.localhost get-msg-dict acentem_takipte`
- `bench --site at.localhost migrate`
- `bench build --app acentem_takipte`
- `cd frontend && npm run build`
- `cd frontend && npm run test:unit`
- `at.localhost:8000` üzerinde Playwright smoke

Başarı kriterleri:
- TR/EN modu uçtan uca çalışır
- backend mesajları, frontend copy ve metadata sözlüğe uygun olur
- gelecekte yeni dil, mimariyi değiştirmeden yalnızca yeni CSV dosyası ekleyerek desteklenebilir

### Faz 5 Tamamlanma Kaydı (2026-04-03)

- ✅ `bench build --app acentem_takipte` — `DONE Total Build Time: 544.258ms` + `Compiling translations for acentem_takipte` ✅
- ✅ Final TR hardcode taraması (`frontend/src/**/*.vue`, `*.js`) — 1 ihlal bulundu ve düzeltildi:
  - `AuxRecordDetailQuickEditDialog.vue` prop default `{ save: "Kaydet", cancel: "İptal" }` → `{ save: "Save", cancel: "Cancel" }` (commit `8580b79`)
  - Kalan eşleşmeler: `copy.tr` blokları (doğru), `generated/translations.js` (doğru), `registry.js` L() iki dilli yardımcı (doğru), test dosyaları (kabul edilebilir)
- ✅ Playwright E2E `locale-smoke.spec.js` — **1 passed (19.6s)** `http://at.localhost:8000`
  - TR topbar toggle → QuickCreate "İptal" doğrulandı ✅
  - EN topbar toggle → QuickCreate "Cancel" doğrulandı ✅
  - Account menu "Logout" label doğrulandı ✅
- ✅ `git push origin main` — `14f26e4..8580b79 main → main` ✅

---

## Takip Kuralları

Her görev ancak şu şartlar sağlandığında tamamlanmış sayılır:
- regex envanteri güncellenmiş olacak
- source string’ler İngilizce olacak
- çeviri CSV’leri senkronize edilmiş olacak
- testler geçecek
- bench message dict yenilemesi yapılmış olacak
- küçük ve gözden geçirilebilir bir commit oluşturulmuş olacak

Bir dosya yerelleştirme sırasında çok büyük veya gürültülü hale gelirse:
- sorumluluklarına göre böl
- bölmeyi küçük tut
- devam etmeden önce ayrılmış halini ayrı commit ile kaydet

Bir terim belirsizse:
- duplicate source string üretmek yerine context’i tercih et
- sözlük kararlarını tüm uygulama genelinde tutarlı koru
