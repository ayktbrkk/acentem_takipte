# AT Yenileme Planı — Kesin Sürüm

> Domain-Slice mimarisine geçiş için adım adım uygulama planı.
> Dörtlü denetim: kıdemli yazılım mühendisi + sigorta domain uzmanı + full-stack developer + EN/TR tercüman.
> Son güncelleme: 2026-07-20.
> Doğrulandı: 23 hooks.py, 17 tasks.py import, 13 enqueue, 15 main.js, 8 App.vue, 14 utils, 38 doctype JSON, 26 i18n dosyası (~3.200 key).

---

## Denetimde Bulunan ve Giderilen Eksiklikler

| # | Eksiklik | Çözüm |
|---|---|---|
| 1 | `utils/` paketi (14 dosya) planda yoktu | Faz 1'e `platform/utils/` taşıması eklendi |
| 2 | `__init__.py` oluşturma adımı yoktu | Faz 0'a eklendi, her yeni dizine `__init__.py` |
| 3 | break-glass JSON'lar diskte duruyor | Faz 0'da JSON + DocType DB kaydı silme eklendi |
| 4 | `www/at.py` import zinciri | Shim kapsamında çalışır, not eklendi |
| 5 | `setup_utils.py`'deki `invalidate_user_scope_on_logout` | Faz 11'de platform/setup_utils.py'ye taşınır |
| 6 | `tasks.py` enqueue string'lerinde kısa/tam form tutarsızlığı | Faz 12'de hepsi tam forma normalize edilir |
| 7 | `desktop.py` referansları kontrol edilmedi | Doğrulandı: sadece DocType string'leri, import yok |
| 8 | `frontend/src/utils/` tam enumerasyonu eksikti | Tam liste eklendi |
| 9 | DocType JSON'ların konumu net değildi | `doctype/` dizini yerinde kalır (Frappe gereksinimi) |
| 10 | `_dash` handler'ı `domains/reports/api/cache.py` — dashboard-wide ama reports altında | Not eklendi, cross-cutting olduğu için kabul edilebilir |
| 11 | `branches.py`'deki `invalidate_scope_cache_*` fonksiyonları | Faz 1'de `platform/permissions/branches.py` ile taşınır |
| 12 | Faz sırası: `policy_360` diğer tüm 360'lar tarafından import ediliyor | Policies Faz 9'da, tüm consumer'lar shim ile çalışır |
| 13 | `common_translations.js` EN dupe `colStatus` key | Faz 0'da silindi |
| 14 | `policy_translations.js` key mismatch (`carrierPolicyNo` vs `carrier_policy_no`) | Faz 0'da `carrierPolicyNo` ile standardize edildi |
| 15 | `policy_translations.js` EN `company` key TR'de eksik | Faz 0'da TR bloğa `company` eklendi |
| 16 | i18n `ALL_TRANSLATIONS` map path güncellemesi yoktu | Faz 2'ye KRİTİK adım eklendi |
| 17 | `sidebar_translations.js` import path'i broken kalacaktı | Faz 2'de `useSidebarNavigation.js` import'u güncellenir |

---

## Kritik Kural #1: Backward Compatibility (GERİYE UYUMLULUK)

```python
# Her taşınan dosya için eski konuma shim:
"""Backward-compat shim — use domains.X... instead."""
from acentem_takipte.acentem_takipte.domains.X.services.Y import *  # noqa: F401,F403
```

## Kritik Kural #2: tasks.py enqueue string'leri

13 adet `frappe.enqueue("string_path", ...)` runtime'da çözülür, import'da değil. Her domain fazında güncellenmeli.

## Kritik Kural #3: __init__.py

Her yeni Python dizini `__init__.py` içermeli. Yoksa Python paket olarak tanımaz, import'lar kırılır.

---

## Faz 0: Hazırlık

### Dizin yapısı + __init__.py

- [ ] `mkdir -p acentem_takipte/acentem_takipte/platform/{permissions,persistence,events,import_export,quick_create,utils}`
- [ ] `mkdir -p acentem_takipte/acentem_takipte/domains`
- [ ] `mkdir -p frontend/src/platform/{shell,router,state,ui,composables,api,i18n,config}`
- [ ] `mkdir -p frontend/src/domains`
- [ ] Tüm yeni dizinlere boş `__init__.py` oluştur (Python package tanıması için):
  - `platform/__init__.py`, `platform/permissions/__init__.py`, `platform/persistence/__init__.py`
  - `platform/events/__init__.py`, `platform/import_export/__init__.py`
  - `platform/quick_create/__init__.py`, `platform/utils/__init__.py`
  - `domains/__init__.py`

### seed.py kısa path düzeltmesi (bug fix, migration'dan bağımsız)

- [ ] `api/seed.py:498`: `"acentem_takipte.api.dashboard.get_dashboard_kpis"` → `"acentem_takipte.acentem_takipte.api.dashboard.get_dashboard_kpis"` (tam dotted path)

### i18n çeviri düzeltmeleri (tercüman denetimi)

- [ ] `config/common_translations.js`: EN bloğunda dupe `colStatus: "Status"` satırını sil (satır ~251)
- [ ] `config/policy_translations.js`: `carrierPolicyNo` vs `carrier_policy_no` → `carrierPolicyNo` ile standardize et (her iki dilde)
- [ ] `config/policy_translations.js`: TR bloğa `company: "Sigorta Şirketi"` ekle (EN'de var, TR'de yok)
- [ ] Tüm 26 çeviri dosyasında TR/EN key sayısı eşitliğini doğrula

### Break-glass tam temizlik (bench migrate yeniden oluşturdu)

- [ ] `Remove-Item -Force acentem_takipte/.../api/break_glass.py`
- [ ] `Remove-Item -Force acentem_takipte/.../api/v2/break_glass.py`
- [ ] `Remove-Item -Recurse -Force acentem_takipte/.../doctype/at_break_glass_request/`
- [ ] `Remove-Item -Recurse -Force acentem_takipte/.../doctype/at_emergency_access/`
- [ ] `Remove-Item -Force acentem_takipte/.../services/break_glass.py`
- [ ] `Remove-Item -Force acentem_takipte/.../tests/test_break_glass.py`
- [ ] `Remove-Item -Force acentem_takipte/.../patches/v2026_03_25_add_break_glass_timestamp_fields.py`
- [ ] `Remove-Item -Force frontend/src/config/break_glass_translations.js`
- [ ] `Remove-Item -Force frontend/src/composables/useBreakGlassRequest.js`
- [ ] `Remove-Item -Force frontend/src/composables/useBreakGlassRequest.test.js`
- [ ] `Remove-Item -Force frontend/src/composables/useBreakGlassApprovals.js`
- [ ] Tüm `__pycache__/break_glass*` dosyalarını temizle
- [ ] **KRİTİK:** DB'den DocType kayıtlarını sil (yoksa bench migrate tekrar oluşturur):
  ```sql
  DELETE FROM `tabDocType` WHERE `name` IN ('AT Break Glass Request', 'AT Emergency Access');
  ```
- [ ] Branch: `refactor/phase-0-prep`

---

## Faz 1: Platform Backend — İzinler + Scope + Utils

### Permissions (taşı + shim bırak)

- [ ] `services/access_policy.py` → `platform/permissions/access_policy.py` + shim
- [ ] `services/access_policy_runtime.py` → `platform/permissions/access_policy_runtime.py` + shim
- [ ] `services/branches.py` → `platform/permissions/branches.py` + shim
- [ ] `services/privacy_masking.py` → `platform/permissions/privacy_masking.py` + shim
- [ ] `services/query_isolation.py` → `platform/permissions/query_isolation.py` + shim
- [ ] `services/sales_entities.py` → `platform/permissions/sales_entities.py` + shim
- [ ] `services/report_isolation.py` → birleştir: `platform/permissions/query_isolation.py`
- [ ] `services/cache_precomputation.py` → `platform/persistence/cache_precomputation.py` + shim

### Utils (taşı + shim bırak) — PLANDA EKSİKTİ, ŞİMDİ EKLENDİ

- [ ] `utils/__init__.py` → `platform/utils/__init__.py` + shim
- [ ] `utils/assets.py` → `platform/utils/assets.py` + shim
- [ ] `utils/cache_keys.py` → `platform/utils/cache_keys.py` + shim
- [ ] `utils/commissions.py` → `platform/utils/commissions.py` + shim
- [ ] `utils/financials.py` → `platform/utils/financials.py` + shim
- [ ] `utils/i18n.py` → `platform/utils/i18n.py` + shim
- [ ] `utils/logging.py` → `platform/utils/logging.py` + shim
- [ ] `utils/metrics.py` → `platform/utils/metrics.py` + shim
- [ ] `utils/network_security.py` → `platform/utils/network_security.py` + shim
- [ ] `utils/normalization.py` → `platform/utils/normalization.py` + shim
- [ ] `utils/notes.py` → `platform/utils/notes.py` + shim
- [ ] `utils/permissions.py` → `platform/utils/permissions.py` + shim
- [ ] `utils/sentry.py` → `platform/utils/sentry.py` + shim
- [ ] `utils/statuses.py` → `platform/utils/statuses.py` + shim

### Import güncelle (direkt yeni path)

- [ ] `doctype/branch_permissions.py`: `access_policy`, `branches`, `sales_entities`, `query_isolation` import'ları
- [ ] `hooks.py` satır 2: `access_policy_runtime` import'u
- [ ] `api/reports.py`: `report_isolation` → `query_isolation` import'u
- [ ] `api/dashboard_*.py`: scope/isolation import'ları
- [ ] `tasks.py:22-23`: `utils.metrics` ve `utils.statuses` import'ları
- [ ] `www/at.py:11`: `utils.assets` import'u (shim ile de çalışır, güncelleme isteğe bağlı)

### Dead code temizliği

- [ ] `branch_permissions.py`: `_allows_break_glass` + tüm `is_break_glass_active` referanslarını kaldır

### Doğrula

- [ ] `git diff --stat` → sadece import/path değişikliği
- [ ] Backend testleri
- [ ] Branch: `refactor/phase-1-platform-backend`

---

## Faz 2: Platform Frontend — UI Altyapısı

### UI Components

- [ ] `components/ui/` (11 dosya) → `platform/ui/base/`
- [ ] `components/app-shell/` (30 dosya) → `platform/ui/shell/`
- [ ] `components/Topbar.vue` → `platform/shell/Topbar.vue`
- [ ] `components/Sidebar.vue` → `platform/shell/Sidebar.vue`
- [ ] `components/DashboardStatCard.vue` → `platform/ui/DashboardStatCard.vue`

### Quick Create → Platform

- [ ] `composables/useQuickCreateDialogShell.js` → `platform/composables/quickCreate/useDialogShell.js`
- [ ] `composables/useQuickCreateLauncher.js` → `platform/composables/quickCreate/useLauncher.js`
- [ ] `composables/useQuickCreateFormRenderer.js` → `platform/composables/quickCreate/useFormRenderer.js`
- [ ] `composables/useQuickCreateManagedDialog.js` → `platform/composables/quickCreate/useManagedDialog.js`
- [ ] `composables/usePolicyQuickCreateRuntime.js` → `platform/composables/quickCreate/usePolicyRuntime.js`
- [ ] `composables/useQuickCustomerPicker.js` → `platform/composables/quickCreate/useCustomerPicker.js`
- [ ] `components/QuickCreateCustomer.vue` → `platform/ui/quickCreate/QuickCreateCustomer.vue`
- [ ] `components/QuickCreateClaim.vue` → `platform/ui/quickCreate/QuickCreateClaim.vue`
- [ ] `components/QuickCreateOffer.vue` → `platform/ui/quickCreate/QuickCreateOffer.vue`
- [ ] `config/quickCreate/` (8 dosya) → `platform/config/quickCreate/`

### Platform Composables

- [ ] `composables/useSidebarNavigation.js` → `platform/composables/useSidebarNavigation.js`
- [ ] `composables/useFilterBarState.js` → `platform/composables/useFilterBarState.js`
- [ ] `composables/useCustomFilterPresets.js` → `platform/composables/useCustomFilterPresets.js`
- [ ] `composables/useAtFormatting.js` → `platform/composables/useAtFormatting.js`
- [ ] `composables/useAtDocumentLifecycle.js` → `platform/composables/useAtDocumentLifecycle.js`
- [ ] `composables/useGlobalCustomerSearch.js` → `platform/composables/useGlobalCustomerSearch.js`
- [ ] `composables/useOfficeBranchSelect.js` → `platform/composables/useOfficeBranchSelect.js`
- [ ] `composables/useAccessRequestForm.js` → `platform/composables/useAccessRequestForm.js`

### State + Router

- [ ] `stores/auth.js` → `platform/state/authStore.js`
- [ ] `stores/branch.js` → `platform/state/branchStore.js`
- [ ] `stores/ui.js` → `platform/state/uiStore.js`
- [ ] `state/session.js` → `platform/state/session.js`
- [ ] `state/ui.js` → `platform/state/uiState.js`
- [ ] `router/index.js` → `platform/router/index.js`
- [ ] `utils/routeMeta.js` → `platform/router/routeMeta.js`
- [ ] `utils/officeBranchTree.js` → `platform/state/officeBranchTree.js`

### i18n

- [ ] `utils/i18n.js` → `platform/i18n/index.js`
- [ ] `config/common_translations.js` → `platform/i18n/common.js`
- [ ] `config/sidebar_translations.js` → `platform/i18n/sidebar.js`
- [ ] `config/router_translations.js` → `platform/i18n/router.js`
- [ ] `config/document_translations.js` → `platform/i18n/document.js`
- [ ] `config/access_request_translations.js` → `platform/i18n/access_request.js`

### KRİTİK: main.js + App.vue

- [ ] `App.vue` → `platform/shell/App.vue` (taşı)
- [ ] `main.js`: tüm import'ları yeni konumlara güncelle:
  - `./App.vue` → `./platform/shell/App.vue`
  - `./router` → `./platform/router`
  - `./state/session` → `./platform/state/session`
  - `./stores/branch` → `./platform/state/branchStore`
  - `./stores/auth` → `./platform/state/authStore`
  - `./utils/routeMeta` → `./platform/router/routeMeta`
  - `./pinia` → (yerinde kalır)

### KRİTİK: Toplu import güncellemeleri

- [ ] `@/utils/i18n` → `@/platform/i18n` (tüm projede find-replace)
- [ ] `@/stores/auth` → `@/platform/state/authStore`
- [ ] `@/stores/branch` → `@/platform/state/branchStore`
- [ ] `@/stores/ui` → `@/platform/state/uiStore`
- [ ] `@/state/session` → `@/platform/state/session`
- [ ] `@/composables/useSidebarNavigation` → `@/platform/composables/useSidebarNavigation`
- [ ] `@/composables/useFilterBarState` → `@/platform/composables/useFilterBarState`
- [ ] `@/composables/useAtFormatting` → `@/platform/composables/useAtFormatting`
- [ ] `@/components/ui/` → `@/platform/ui/base/`
- [ ] `@/components/app-shell/` → `@/platform/ui/shell/`

### KRİTİK: i18n ALL_TRANSLATIONS map güncellemesi (tercüman denetimi)

`platform/i18n/index.js` içindeki `ALL_TRANSLATIONS` haritası **22 modülü** tek tek import eder. Taşınan her translation dosyası için import yolu güncellenmeli:

- [ ] Domain translation'ları: `@/config/X_translations` → `@/domains/X/i18n/translations` (claims, payments, offers, renewals, leads, customers, policies, communications, reports)
- [ ] Platform translation'ları: `@/config/common_translations` → `@/platform/i18n/common` vb.
- [ ] Admin translation'ları: `@/config/dashboard_translations` → `@/domains/admin/i18n/dashboard` vb.
- [ ] **NOT:** Domain translation'ların import'ları ancak o domain'in fazı tamamlandıktan SONRA güncellenir (Faz 3-11 arası)

### KRİTİK: Sidebar translations import yolu

- [ ] `platform/composables/useSidebarNavigation.js`: `../config/sidebar_translations` → `@/platform/i18n/sidebar`

### Doğrula

- [ ] `npm run build` + `npm run lint` + `npm run typecheck` + `npm run test:unit`
- [ ] Branch: `refactor/phase-2-platform-frontend`

---

## Faz 3–9: Domain'ler (claims → policies)

Her domain fazı aynı pattern ile ilerler. Claims ile başlanır, Policies ile biter.

### Faz 3: Claims (pilot)

**Backend:** `services/claim_360.py` → `domains/claims/services/claim_360.py` + shim; `hooks.py:_cl360` güncelle
**Frontend:** 2 page, 6 comp, 5 comp, 1 store, 1 i18n → `domains/claims/`
- [ ] `npm run build` + Playwright `/at/claims`
- [ ] Branch: `refactor/phase-3-claims`

### Faz 4: Payments

**Backend:** `services/payment_360.py`, `services/payments.py` → `domains/payments/services/` + shim; `hooks.py:_pay360`, `tasks.py` import güncelle
**Frontend:** 2 page, 8 comp, 5 comp, 1 store, 1 i18n → `domains/payments/`
- [ ] Branch: `refactor/phase-4-payments`

### Faz 5: Offers

**Backend:** `api/offers.py` → `domains/offers/api/endpoints.py` + shim; `services/offer_360.py` + shim; `hooks.py:_o360` güncelle
**Frontend:** 2 page, 6 comp, 4 comp, 1 i18n → `domains/offers/`
- [ ] Branch: `refactor/phase-5-offers`

### Faz 6: Renewals

**Backend:** `services/renewals.py`, `renewal/` (4 dosya) → `domains/renewals/services/` + shim
**KRİTİK:** `tasks.py` enqueue string + import güncellemesi:
  - `tasks.py:13-14` — `renewal.pipeline` import'ları
  - `tasks.py:15-16` — `renewal.service`, `renewal.reminders` import'ları
  - `tasks.py:58` — enqueue `"acentem_takipte.tasks._create_renewal_tasks_logic"` (değişmez, tasks.py kendi içinde)
**Frontend:** 2 page, 2 comp, 1 store, 1 i18n → `domains/renewals/`
- [ ] Branch: `refactor/phase-6-renewals`

### Faz 7: Leads

**Backend:** `api/dashboard_lead_logic.py` → `domains/leads/api/dashboard.py` + shim; `services/lead_360.py` + shim; `hooks.py:_l360` güncelle
**Frontend:** 2 page, 9 comp, 2 comp, 1 i18n → `domains/leads/`
- [ ] Branch: `refactor/phase-7-leads`

### Faz 8: Customers (cross-domain bağımlılığı yüksek)

**Backend:** `api/customers.py`, `services/customer_360.py`, `services/customer_segments.py`, `services/quick_create_customer_flow.py`, `services/quick_customer.py` → `domains/customers/` + shim
- `hooks.py:_c360` güncelle
- `tasks.py:services.customer_segments` import güncelle
- [ ] 6 cross-domain import güncelle (policy_360, payment_360, claim_360, offer_360, lead_360, renewals → customer referansları)
- [ ] API shim testi: `/api/method/...api.customers.search_customer_by_identity` 200 OK?
**Frontend:** 3 page, 4 comp, 1 comp, 2 i18n → `domains/customers/`
- [ ] Branch: `refactor/phase-8-customers`

### Faz 9: Policies (en büyük domain)

**Backend:** `services/policy_360.py`, `services/quick_create_policy_task.py` → `domains/policies/services/` + shim; `hooks.py:_p360` güncelle
**Frontend:** 2 page, 12 comp, 2 comp, 1 store, 1 i18n, 6 test → `domains/policies/`
- [ ] `npm run test:unit` + `npm run e2e:smoke`
- [ ] Branch: `refactor/phase-9-policies`

---

## Faz 10: Communications

### Backend

- [ ] `api/communication.py` → `domains/communications/api/endpoints.py` + shim
- [ ] `services/campaigns.py`, `services/follow_up_sla.py`, `services/notifications.py`, `services/segments.py` → `domains/communications/services/` + shim
- [ ] `communication.py` (kök) → `domains/communications/services/queue_processor.py` + shim
- [ ] `notifications.py` (kök) → `domains/communications/services/notification_core.py` + shim
- [ ] `hooks.py`: scheduler job path'leri

### KRİTİK: tasks.py güncellemesi

- [ ] `tasks.py:5-6` — `communication.*` import'ları → yeni path
- [ ] `tasks.py:12` — `notifications.create_notification_drafts` import'u → yeni path
- [ ] `tasks.py:17` — `services.campaigns.execute_due_campaigns` import'u → yeni path
- [ ] `tasks.py:412` — ENQUEUE STRING: `"acentem_takipte.communication.dispatch_notification_outbox"` → `"acentem_takipte.acentem_takipte.domains.communications.services.queue_processor.dispatch_notification_outbox"`

### Frontend

- [ ] 8 page, 9 comp, 5 comp, 1 store, 1 i18n → `domains/communications/`
- [ ] Branch: `refactor/phase-10-communications`

---

## Faz 11: Reports + Accounting + Admin + Kalan Platform

### Reports

- [ ] `api/dashboard*.py` (9 dosya) → `domains/reports/api/` + shim
  - Not: `dashboard_cache.py`'deki `invalidate_dashboard_cache` (`_dash`) dashboard-wide cross-cutting ama reports altında acceptable
- [ ] `api/reports.py` → `domains/reports/api/endpoints.py` + shim
- [ ] `services/reporting.py`, `services/report_registry.py`, `services/reports_runtime.py`, `services/report_exports.py`, `services/report_snapshots.py`, `services/scheduled_reports.py`, `services/async_reports.py` → `domains/reports/services/` + shim
- [ ] `hooks.py`: `_dash`, scheduler job path'leri
- [ ] `tasks.py`: `services.report_snapshots`, `services.scheduled_reports` import'ları
- [ ] Frontend: 5 page + 10 comp + 12 comp → `domains/reports/`

### Accounting

- [ ] `api/accounting.py`, `api/dashboard_reconciliation.py` → `domains/accounting/api/` + shim
- [ ] `services/accounting_runtime.py`, `services/accounting_statement_import.py` → `domains/accounting/services/` + shim
- [ ] `accounting.py` (kök) → `domains/accounting/services/sync.py` + shim
- [ ] `hooks.py`: `_acct` path'ini `domains.accounting.services.sync.sync_doc_event` olarak güncelle
- [ ] **KRİTİK: tasks.py enqueue string güncellemesi**
  - `tasks.py:431` — `"acentem_takipte.accounting.sync_accounting_entries"` → yeni path
  - `tasks.py:447` — `"acentem_takipte.accounting.run_reconciliation"` → yeni path
- [ ] Frontend: 8 page + 16 comp + 17 comp → `domains/accounting/`
- [ ] `config/auxWorkbench/` (7 dosya) → `platform/config/auxWorkbench/`
- [ ] `config/aux_*_translations.js` (4) → `platform/i18n/aux_*.js`

### Admin

- [ ] `api/admin_jobs.py`, `api/admin_settings.py` → `domains/admin/api/` + shim
- [ ] `services/admin_general_settings.py`, `services/admin_jobs.py`, `services/ops_alert_settings.py`, `services/ops_alerts.py`, `services/work_management.py` → `domains/admin/services/` + shim
- [ ] `hooks.py`: ops_alerts scheduler path'i
- [ ] Dashboard: 1 page + 15 comp + 10 comp → `domains/admin/dashboard/`
- [ ] Admin pages (4) → `domains/admin/pages/`
- [ ] Import/Export (2 page, 2 comp, 11 comp) → `platform/import_export/` (cross-cutting!)
- [ ] `config/dashboard_translations.js` → `domains/admin/i18n/`
- [ ] `config/admin_*_translations.js` (2) → `domains/admin/i18n/`

### Kalan cross-cutting API'ler → `platform/api/` + shim

- [ ] `api/session.py`, `api/security.py`, `api/filter_presets.py`, `api/mutation_access.py`
- [ ] `api/quick_create.py`, `api/quick_payloads.py`, `api/record_preview.py`
- [ ] `api/seed.py`, `api/smoke.py`, `api/versioning.py`, `api/documents.py`
- [ ] `api/data_import.py` → `platform/import_export/api.py`
- [ ] `api/list_exports.py` → `platform/import_export/list_exports_api.py`

### Kalan cross-cutting servisler → `platform/` + shim

- [ ] `services/document_center.py` → `platform/services/document_center.py`
- [ ] `services/data_import/` (10 dosya) → `platform/import_export/data_import/`
- [ ] `services/list_exports.py` → `platform/import_export/list_exports.py`
- [ ] `services/export_payload_utils.py` → `platform/import_export/payload_utils.py`
- [ ] `services/quick_create_core.py`, `quick_create_common.py`, `quick_create_helpers.py`, `quick_create_workflow.py`, `quick_create_special.py`, `quick_create_search.py`, `quick_create_reference.py`, `quick_create_auxiliary.py`, `quick_create/__init__.py` → `platform/quick_create/`

### Kalan kök modüller → uygun konum + shim

- [ ] `startup.py` → `platform/startup.py` + shim; `hooks.py:21` boot_session path'i
- [ ] `realtime.py` → `platform/events/realtime.py` + shim; `hooks.py:37` `_rt` path'i
- [ ] `setup_utils.py` → `platform/setup_utils.py` + shim (içinde `invalidate_user_scope_on_logout`)
- [ ] `notification_seed_service.py`, `notification_seed_data.py`, `notification_dispatch.py`, `notifications_templateing.py`, `notifications_catalog.py` → `domains/communications/services/`
- [ ] `policy_documents.py` → `domains/policies/services/documents.py`
- [ ] `dev_seed.py` → yerinde kalır (dev-only)
- [ ] `desktop.py` → yerinde kalır (Frappe desk config, sadece DocType string referansları)

### Frontend kalanlar

- [ ] `composables/useDashboard*` (15) → `domains/admin/dashboard/composables/`
- [ ] `composables/useAuxWorkbench*` (3) → `domains/accounting/composables/`
- [ ] `composables/useAuxRecordDetail*` (5) → `domains/accounting/composables/`
- [ ] `composables/useReconciliationWorkbench*` (5) → `domains/accounting/composables/`
- [ ] `composables/useImportDataRuntime.js` → `platform/composables/`
- [ ] `composables/useExportDataRuntime.js` → `platform/composables/`
- [ ] `composables/useScheduledReportsManager.js` → `domains/reports/composables/`
- [ ] `composables/useReports*` (7) → `domains/reports/composables/`
- [ ] `stores/accounting.js` → `domains/accounting/stores/`
- [ ] `stores/dashboard.js` → `domains/admin/dashboard/stores/`

### Doğrula

- [ ] `npm run build` + `npm run lint` + `npm run typecheck` + `npm run test:unit` + `npm run e2e:smoke`
- [ ] Branch: `refactor/phase-11-platform-domains`

---

## Faz 12: hooks.py + tasks.py Son Kontrol

- [ ] `hooks.py`: 23 dotted path yeni konumlara işaret ediyor mu? Hepsi teker teker kontrol et
- [ ] `tasks.py`: 17 import + 13 enqueue string doğru mu?
- [ ] `tasks.py` enqueue string'leri TAM FORM'a normalize et (`acentem_takipte.acentem_takipte...`)
- [ ] `patches.txt`: tüm patch referansları doğru mu?
- [ ] `desktop.py`: DocType referansları doğru mu? (doğrulandı: sadece DocType name string'leri)
- [ ] `www/at.py`: import'lar shim ile çalışıyor, güncelleme isteğe bağlı
- [ ] Branch: `refactor/phase-12-hooks-audit`

---

## Faz 13: Shim Temizliği

Tüm consumer'lar güncellendikten SONRA:

- [ ] `api/` shim'leri sil
- [ ] `services/` shim'leri sil
- [ ] `utils/` shim'leri sil
- [ ] Kök modül shim'lerini sil (`accounting.py`, `communication.py`, `notifications.py`, `realtime.py`, `startup.py`, `setup_utils.py`)
- [ ] `renewal/` dizin shim'ini kaldır
- [ ] Frontend eski `pages/`, `composables/`, `components/`, `stores/`, `config/` domain dosyalarını sil
- [ ] `__pycache__` temizliği
- [ ] `npm run build` + `npm run lint` + `npm run typecheck` + `npm run test:unit` + `npm run e2e:smoke`
- [ ] Branch: `refactor/phase-13-cleanup`

---

## Özet

| Faz | Ad | Risk | Kritik nokta |
|---|---|---|---|
| 0 | Hazırlık + Stale + __init__.py | Yok | DB'den DocType sil, __init__.py oluştur |
| 1 | Platform Backend | Düşük | 22 dosya (8 perm + 14 utils), branch_permissions temizliği |
| 2 | Platform Frontend | Orta | main.js + toplu import find-replace |
| 3 | Claims pilot | Düşük | Pattern kanıtı |
| 4 | Payments | Düşük | tasks.py import |
| 5 | Offers | Düşük | api/offers.py shim (frontend API) |
| 6 | Renewals | Orta | tasks.py enqueue + import (renewal/) |
| 7 | Leads | Düşük | — |
| 8 | Customers | Orta | 6 cross-domain import, API shim testi |
| 9 | Policies | Orta | En büyük domain |
| 10 | Communications | Orta | tasks.py enqueue `dispatch_notification_outbox` |
| 11 | Reports + Accounting + Admin + Platform | Yüksek | 2 tasks.py enqueue string, kök modüller |
| 12 | hooks.py + tasks.py audit | Düşük | 23 path + 17 import + 13 enqueue son kontrol |
| 13 | Shim temizliği | Düşük | Tüm consumer'lar güncellenmiş olmalı |

---

## Doğrulama Matrisi

| Değişiklik | Doğrulama |
|---|---|
| Frontend sayfa/comp | `npm run test:unit` → `npm run build` |
| Frontend router/shell | `router/index.js` + `main.js` + `session.js` → unit test → build |
| Backend API/service | Backend test / bench komutu |
| Hook/scheduler/DocType event | `hooks.py` + `tasks.py` → dotted path + enqueue string doğrula |
| Sadece doküman | Link + dosya adı + komut → workspace doğrula |

## Değişmeyenler

- `doctype/` dizini ve tüm JSON/JSON tanımları — Frappe'nin bulması için yerinde kalır
- `vite.config.js`, `tsconfig.json` — `@` alias'ı `src/` olarak kalır
- `frontend/src/pinia.js` — kök modül, taşınmaz
- `frontend/src/generated/` — build artifact (translations.js dahil)
- `frontend/src/assets/` — CSS asset'leri
- `frontend/src/style.css` — Tailwind giriş noktası
- `desktop.py` — Frappe desk config, sadece DocType string referansları
- `dev_seed.py` — dev-only

## İki Dilli (TR/EN) Kalite Kontrolü

Her faz sonunda ve Faz 13 tamamlandıktan sonra:

- [ ] `npm run test:unit` — çeviri audit testleri (`group8TranslationAudit.test.js`, `auxGroup7TranslationAudit.test.js`)
- [ ] Tüm 26 çeviri dosyasında TR/EN key count eşleşmesi
- [ ] `platform/i18n/index.js` ALL_TRANSLATIONS map'inde eksik import yok
- [ ] Sidebar: TR ve EN'de tüm 44 navigasyon öğesi görünür
- [ ] Spot-check: `/at/dashboard`, `/at/policies`, `/at/customers` — TR/EN geçişinde çeviri kopması yok
- [ ] Hardcoded string taraması: `grep -r '>[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,}<' frontend/src/domains/` → hiçbir şey dönmemeli

---

## Her Fazda Standart İş Akışı

```
1. git checkout -b refactor/phase-N-<name>
2. Dosyayı taşı, import'ları güncelle, eski konuma shim bırak
3. hooks.py + tasks.py'deki ilgili dotted path/enqueue string'i güncelle
4. python -c "import acentem_takipte.acentem_takipte"  (import zinciri testi)
5. npm run build
6. npm run lint && npm run typecheck
7. npm run test:unit (varsa)
8. git diff --stat → sadece import/path değişikliği
9. git add -A && git commit
10. PR → onay → merge main
```

## Rollback Stratejisi

| Durum | Aksiyon |
|---|---|
| Faz branch'inde hata | `git checkout main && git branch -D refactor/phase-N-...` |
| Merge sonrası hata | `git revert <merge-commit-sha>` |
| Shim kırılması | Shim dosyasını düzelt, commit, push |
| Build kırılması | `git diff` ile hangi import'un kırıldığını bul, düzelt |
| tasks.py enqueue sessiz hatası | Faz 12 audit'inde yakalanır; cron log'larından teyit et |
