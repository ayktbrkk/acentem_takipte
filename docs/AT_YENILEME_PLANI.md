# AT Yenileme Planı — Son Sürüm

> Domain-Slice mimarisine geçiş için adım adım uygulama planı.
> Son güncelleme: 2026-07-20 — kıdemli mühendis denetimi tamamlandı.
> hooks.py (23 dotted path), tasks.py (17 import + 13 enqueue string), main.js (15 import), App.vue (8 import) doğrulandı.

---

## Kritik Kural #1: Backward Compatibility (GERİYE UYUMLULUK)

Frappe çalışma zamanında API metodlarını, scheduler job'larını, doc_event handler'larını **dotted Python import path** ile çözer. Dosya taşındığında path değişirse her şey kırılır.

**Standard iş akışı:**

```
1. Dosyayı yeni konuma TAŞI (import'lar güncellenir)
2. Eski konuma İNCE RE-EXPORT SHIM bırak:
   """Backward-compat shim."""
   from acentem_takipte.acentem_takipte.domains.X.api.endpoints import *
3. hooks.py ve tasks.py'deki dotted path'leri DOĞRUDAN yeni konuma güncelle (shim'e güvenme)
4. Build + test
5. TÜM consumer'lar güncellenince shim silinir (Faz 13)
```

## Kritik Kural #2: tasks.py enqueue string'leri

`tasks.py` içinde `frappe.enqueue()` 13 yerde **string literal** path kullanır. Bunlar import anında değil, **runtime'da cron tetiklendiğinde** çözülür. Yanlış path = sessiz hata, job'lar çalışmaz.

```python
# tasks.py satır 58 — NOT: kısa form (acentem_takipte.tasks._...)
frappe.enqueue("acentem_takipte.tasks._create_renewal_tasks_logic", ...)

# tasks.py satır 501 — NOT: tam form (acentem_takipte.acentem_takipte.tasks._...) 
frappe.enqueue("acentem_takipte.acentem_takipte.tasks._process_data_import_job_logic", ...)

# tasks.py satır 447 — NOT: çapraz modül (acentem_takipte.accounting.run_reconciliation)
frappe.enqueue("acentem_takipte.accounting.run_reconciliation", ...)
```

**Her domain fazında tasks.py enqueue string'leri de güncellenmeli.**

---

## Faz 0: Hazırlık + Stale Dosya Temizliği

- [ ] `mkdir -p acentem_takipte/acentem_takipte/platform/{permissions,persistence,events,import_export,quick_create}`
- [ ] `mkdir -p acentem_takipte/acentem_takipte/domains`
- [ ] `mkdir -p frontend/src/platform/{shell,router,state,ui,composables,api,i18n}`
- [ ] `mkdir -p frontend/src/domains`

### Stale dosya temizliği (bench migrate yeniden oluşturdu)

- [ ] `Remove-Item -Force acentem_takipte/.../api/break_glass.py`
- [ ] `Remove-Item -Force acentem_takipte/.../api/v2/break_glass.py`
- [ ] `Remove-Item -Recurse -Force acentem_takipte/.../doctype/at_break_glass_request/`
- [ ] `Remove-Item -Recurse -Force acentem_takipte/.../doctype/at_emergency_access/`
- [ ] `Remove-Item -Force acentem_takipte/.../services/break_glass.py`
- [ ] `Remove-Item -Force acentem_takipte/.../tests/test_break_glass.py`
- [ ] `Remove-Item -Force acentem_takipte/.../patches/v2026_03_25_add_break_glass_timestamp_fields.py`
- [ ] `Remove-Item -Force frontend/src/config/break_glass_translations.js`
- [ ] Tüm `__pycache__/break_glass*` dosyalarını temizle
- [ ] Branch: `refactor/phase-0-prep`

---

## Faz 1: Platform Backend — İzinler + Scope

### Taşı (shim bırak)

- [ ] `services/access_policy.py` → `platform/permissions/access_policy.py` + shim
- [ ] `services/access_policy_runtime.py` → `platform/permissions/access_policy_runtime.py` + shim
- [ ] `services/branches.py` → `platform/permissions/branches.py` + shim
- [ ] `services/privacy_masking.py` → `platform/permissions/privacy_masking.py` + shim
- [ ] `services/query_isolation.py` → `platform/permissions/query_isolation.py` + shim
- [ ] `services/sales_entities.py` → `platform/permissions/sales_entities.py` + shim
- [ ] `services/report_isolation.py` → birleştir: `platform/permissions/query_isolation.py` (fonksiyon taşınır, eski dosya `from platform.permissions.query_isolation import ...` shim'i olur)
- [ ] `services/cache_precomputation.py` → `platform/persistence/cache_precomputation.py` + shim

### Import güncelle (direkt yeni path)

- [ ] `doctype/branch_permissions.py`: `access_policy`, `branches`, `sales_entities` import'ları
- [ ] `hooks.py` satır 2: `access_policy_runtime` import'u
- [ ] `api/reports.py`: `report_isolation` → `query_isolation` import'u
- [ ] `api/dashboard_*.py` (8 dosya): scope/isolation import'ları

### Dead code temizliği

- [ ] `branch_permissions.py`'deki `_allows_break_glass` fonksiyonunu ve tüm çağrılarını kaldır (zaten her zaman False)
- [ ] `branch_permissions.py`'deki `is_break_glass_active` referanslarını kaldır (silinmiş modül)

### Doğrula

- [ ] `git diff --stat` → sadece import/path değişikliği
- [ ] Backend testleri
- [ ] Branch: `refactor/phase-1-platform-permissions`

---

## Faz 2: Platform Frontend — UI Altyapısı

### UI Components (app-shell + ui birleşimi)

- [ ] `components/ui/` (11 dosya) → `platform/ui/base/`
- [ ] `components/app-shell/` (30 dosya) → `platform/ui/shell/`
- [ ] `components/Topbar.vue` → `platform/shell/Topbar.vue`
- [ ] `components/Sidebar.vue` → `platform/shell/Sidebar.vue`
- [ ] `components/DashboardStatCard.vue` → `platform/ui/shell/DashboardStatCard.vue`

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

### KRİTİK: main.js güncellemesi

- [ ] `./App.vue` → `./platform/shell/App.vue` (App.vue'yu da taşı!)
- [ ] `./router` → `./platform/router`
- [ ] `./pinia` → (yerinde kalır, sadece kök modül)
- [ ] `./state/session` → `./platform/state/session`
- [ ] `./stores/branch` → `./platform/state/branchStore`
- [ ] `./stores/auth` → `./platform/state/authStore`
- [ ] `./utils/routeMeta` → `./platform/router/routeMeta`

### KRİTİK: Toplu i18n import güncellemesi

`@/utils/i18n` → `@/platform/i18n` — tüm composable/component'lerde IDE find-replace ile

### Doğrula

- [ ] `npm run build` + `npm run lint` + `npm run typecheck`
- [ ] `npm run test:unit`
- [ ] Branch: `refactor/phase-2-platform-frontend`

---

## Faz 3: Domain Pilotu — Claims

### Backend

- [ ] `services/claim_360.py` → `domains/claims/services/claim_360.py` + shim
- [ ] `hooks.py`: `_cl360` path'ini `domains.claims.services.claim_360.invalidate_claim_from_doc_event` olarak güncelle

### Frontend

- [ ] `pages/ClaimsBoard.vue` → `domains/claims/pages/ClaimsBoard.vue`
- [ ] `pages/ClaimDetail.vue` → `domains/claims/pages/ClaimDetail.vue`
- [ ] `composables/claimsListTableModel.js` → `domains/claims/composables/tableModel.js`
- [ ] `composables/useClaimsBoardRuntime.js` → `domains/claims/composables/useBoard.js`
- [ ] `composables/useClaimsBoardClaimFacts.js` → `domains/claims/composables/useBoardFacts.js`
- [ ] `composables/useClaimsBoardClaimActions.js` → `domains/claims/composables/useBoardActions.js`
- [ ] `composables/useClaimDetailRuntime.js` → `domains/claims/composables/useDetail.js`
- [ ] `components/claims-board/` (5 dosya) → `domains/claims/components/board/`
- [ ] `components/ClaimForm.vue` → `domains/claims/components/ClaimForm.vue`
- [ ] `stores/claim.js` → `domains/claims/stores/claimStore.js`
- [ ] `config/claim_translations.js` → `domains/claims/i18n/translations.js`

### Router

- [ ] `domains/claims/routes.js` oluştur
- [ ] `platform/router/index.js`: claimRoutes import et, eski lazy import'ları kaldır

### Doğrula

- [ ] `npm run build` + `npm run typecheck`
- [ ] Playwright: `/at/claims`, `/at/claims/:name`
- [ ] Branch: `refactor/phase-3-claims`

---

## Faz 4: Payments

### Backend

- [ ] `services/payment_360.py` → `domains/payments/services/payment_360.py` + shim
- [ ] `services/payments.py` → `domains/payments/services/payments.py` + shim
- [ ] `hooks.py`: `_pay360` path'ini güncelle
- [ ] `tasks.py`: `services.payments` → `domains.payments.services.payments` import'unu güncelle

### Frontend (dosya listesi Faz 4 ile aynı)

- [ ] 2 page, 8 composable, 5 component, 1 store, 1 translation → `domains/payments/`
- [ ] `domains/payments/routes.js` oluştur
- [ ] `npm run build` + doğrulama
- [ ] Branch: `refactor/phase-4-payments`

---

## Faz 5: Offers

### Backend

- [ ] `api/offers.py` → `domains/offers/api/endpoints.py` + shim (frontend API yolu korunur!)
- [ ] `services/offer_360.py` → `domains/offers/services/offer_360.py` + shim
- [ ] `hooks.py`: `_o360` path'ini güncelle

### Frontend

- [ ] 2 page, 6 composable, 4 component, 1 translation → `domains/offers/`
- [ ] `domains/offers/routes.js` oluştur
- [ ] `npm run build` + doğrulama
- [ ] Branch: `refactor/phase-5-offers`

---

## Faz 6: Renewals

### Backend

- [ ] `services/renewals.py` → `domains/renewals/services/renewals.py` + shim
- [ ] `acentem_takipte/.../renewal/` dizini (4 dosya) → `domains/renewals/services/renewal_core/` + eski konuma shim
- [ ] `hooks.py`: renewal task scheduler path'leri
- [ ] **KRİTİK: tasks.py enqueue string güncellemesi**
  - `tasks.py:58` — `create_renewal_tasks` içindeki `"acentem_takipte.tasks._create_renewal_tasks_logic"` (kısa form — DEĞİŞMEZ, tasks.py kendi içinde)
  - `tasks.py:80` — `run_stale_renewal_task_job` içindeki enqueue
  - `tasks.py:135` — `run_policy_renewal_reminder_job` içindeki enqueue
  - `tasks.py:15-16` — `renewal.service` ve `renewal.reminders` import'larını güncelle
  - `tasks.py:13-14` — `renewal.pipeline` import'larını güncelle

### Frontend

- [ ] 2 page, 2 composable, 1 store, 1 translation → `domains/renewals/`
- [ ] `domains/renewals/routes.js` oluştur
- [ ] `npm run build` + doğrulama
- [ ] Branch: `refactor/phase-6-renewals`

---

## Faz 7: Leads

### Backend

- [ ] `api/dashboard_lead_logic.py` → `domains/leads/api/dashboard.py` + shim
- [ ] `services/lead_360.py` → `domains/leads/services/lead_360.py` + shim
- [ ] `hooks.py`: `_l360` path'ini güncelle

### Frontend

- [ ] 2 page, 9 composable, 2 component, 1 translation → `domains/leads/`
- [ ] `domains/leads/routes.js` oluştur
- [ ] `npm run build` + doğrulama
- [ ] Branch: `refactor/phase-7-leads`

---

## Faz 8: Customers (cross-domain bağımlılığı yüksek)

### Backend

- [ ] `api/customers.py` → `domains/customers/api/endpoints.py` + shim
- [ ] `services/customer_360.py` → `domains/customers/services/customer_360.py` + shim
- [ ] `services/customer_segments.py` → `domains/customers/services/customer_segments.py` + shim
- [ ] `services/quick_create_customer_flow.py` → `domains/customers/services/quick_create.py` + shim
- [ ] `services/quick_customer.py` → `domains/customers/services/quick_customer.py` + shim
- [ ] `hooks.py`: `_c360` path'ini güncelle
- [ ] `tasks.py`: `services.customer_segments` → `domains.customers.services.customer_segments` import'unu güncelle
- [ ] `tasks.py:187-190` — `run_customer_segment_snapshot_job` enqueue string'ini kontrol et (tasks.py kendi içinde, değişmez)

### Cross-domain import güncellemesi (shim varken çalışır, ama yeni path tercih edilir)

- [ ] `domains/policies/services/policy_360.py`: customer import'u
- [ ] `domains/payments/services/payment_360.py`: customer import'u
- [ ] `domains/claims/services/claim_360.py`: customer import'u
- [ ] `domains/offers/services/offer_360.py`: customer import'u
- [ ] `domains/leads/services/lead_360.py`: customer import'u
- [ ] `domains/renewals/services/renewals.py`: customer import'u

### Frontend

- [ ] 3 page, 4 composable, 1 component, 2 translation → `domains/customers/`
- [ ] `domains/customers/routes.js` oluştur
- [ ] `npm run build` + `npm run test:unit`
- [ ] API shim testi: `/api/method/acentem_takipte.acentem_takipte.api.customers.search_customer_by_identity` hala 200 OK?
- [ ] Branch: `refactor/phase-8-customers`

---

## Faz 9: Policies (en büyük domain)

### Backend

- [ ] `services/policy_360.py` → `domains/policies/services/policy_360.py` + shim
- [ ] `services/quick_create_policy_task.py` → `domains/policies/services/quick_create.py` + shim
- [ ] `hooks.py`: `_p360` path'ini güncelle

### Frontend

- [ ] 2 page, 12 composable, 2 component, 1 store, 1 translation, 6 test → `domains/policies/`
- [ ] `domains/policies/routes.js` oluştur
- [ ] `npm run build` + `npm run test:unit` + `npm run e2e:smoke`
- [ ] Branch: `refactor/phase-9-policies`

---

## Faz 10: Communications

### Backend

- [ ] `api/communication.py` → `domains/communications/api/endpoints.py` + shim
- [ ] `services/campaigns.py` → `domains/communications/services/campaigns.py` + shim
- [ ] `services/follow_up_sla.py` → `domains/communications/services/follow_up_sla.py` + shim
- [ ] `services/notifications.py` (servis) → `domains/communications/services/notifications.py` + shim
- [ ] `services/segments.py` → `domains/communications/services/segments.py` + shim
- [ ] `acentem_takipte/.../communication.py` (kök modül) → `domains/communications/services/queue_processor.py` + shim
- [ ] `acentem_takipte/.../notifications.py` (kök modül) → `domains/communications/services/notification_core.py` + shim
- [ ] `hooks.py`: scheduler job path'lerini güncelle
- [ ] **KRİTİK: tasks.py güncellemesi**
  - `tasks.py:5-6` — `communication.process_notification_queue` ve `communication.queue_notification_drafts` import'ları
  - `tasks.py:12` — `notifications.create_notification_drafts` import'u
  - `tasks.py:17` — `services.campaigns.execute_due_campaigns` import'u
  - `tasks.py:103-106` — `run_notification_queue_job` enqueue string'i (kendi içinde, değişmez)
  - `tasks.py:169-173` — `run_due_campaigns_job` enqueue string'i (kendi içinde, değişmez)
  - `tasks.py:412` — `_enqueue_outbox_dispatch_jobs` içindeki `"acentem_takipte.communication.dispatch_notification_outbox"` string'i → yeni path'e güncelle!

### Frontend

- [ ] 8 page, 9 composable, 5 component, 1 store, 1 translation → `domains/communications/`
- [ ] `domains/communications/routes.js` oluştur
- [ ] `npm run build` + doğrulama
- [ ] Branch: `refactor/phase-10-communications`

---

## Faz 11: Reports + Accounting + Admin

### Reports

- [ ] `api/dashboard.py` → `domains/reports/api/dashboard.py` + shim
- [ ] `api/dashboard_cache.py` → `domains/reports/api/cache.py` + shim
- [ ] `api/dashboard_detail.py` → `domains/reports/api/detail.py` + shim
- [ ] `api/dashboard_lead_logic.py` → (Faz 7'de leads'e taşındı)
- [ ] `api/dashboard_metrics.py` → `domains/reports/api/metrics.py` + shim
- [ ] `api/dashboard_preview.py` → `domains/reports/api/preview.py` + shim
- [ ] `api/dashboard_reconciliation.py` → `domains/accounting/api/dashboard.py` + shim
- [ ] `api/dashboard_scopes.py` → `domains/reports/api/scopes.py` + shim
- [ ] `api/dashboard_workbench.py` → `domains/reports/api/workbench.py` + shim
- [ ] `api/reports.py` → `domains/reports/api/endpoints.py` + shim
- [ ] `services/reporting.py` → `domains/reports/services/reporting.py` + shim
- [ ] `services/report_registry.py` → `domains/reports/services/registry.py` + shim
- [ ] `services/reports_runtime.py` → `domains/reports/services/runtime.py` + shim
- [ ] `services/report_exports.py` → `domains/reports/services/exports.py` + shim
- [ ] `services/report_snapshots.py` → `domains/reports/services/snapshots.py` + shim
- [ ] `services/scheduled_reports.py` → `domains/reports/services/scheduled.py` + shim
- [ ] `services/async_reports.py` → `domains/reports/services/async_reports.py` + shim
- [ ] `hooks.py`: `_dash` path'ini, scheduler job path'lerini güncelle
- [ ] `tasks.py`: `services.report_snapshots`, `services.scheduled_reports` import'larını güncelle
- [ ] `tasks.py:151-155` — `run_scheduled_reports_job` ve `tasks.py:203-206` — `run_report_snapshot_job` enqueue string'leri (kendi içinde, değişmez)
- [ ] Frontend: 5 page + 10 composable + 12 component → `domains/reports/`

### Accounting

- [ ] `api/accounting.py` → `domains/accounting/api/endpoints.py` + shim
- [ ] `api/dashboard_reconciliation.py` → `domains/accounting/api/dashboard.py` + shim
- [ ] `services/accounting_runtime.py` → `domains/accounting/services/runtime.py` + shim
- [ ] `services/accounting_statement_import.py` → `domains/accounting/services/statement_import.py` + shim
- [ ] `acentem_takipte/.../accounting.py` (kök modül) → `domains/accounting/services/sync.py` + shim
- [ ] `hooks.py`: `_acct` path'ini `domains.accounting.services.sync.sync_doc_event` olarak güncelle
- [ ] **KRİTİK: tasks.py enqueue string güncellemesi**
  - `tasks.py:428-431` — `run_accounting_sync_job` içindeki `"acentem_takipte.accounting.sync_accounting_entries"` → yeni path
  - `tasks.py:444-447` — `run_accounting_reconciliation_job` içindeki `"acentem_takipte.accounting.run_reconciliation"` → yeni path
- [ ] Frontend: 8 page + 16 composable + 17 component → `domains/accounting/`
- [ ] `config/auxWorkbench/` (7 dosya) → `platform/config/auxWorkbench/`
- [ ] `config/aux_*_translations.js` (4 dosya) → `platform/i18n/aux_*.js`

### Admin

- [ ] `api/admin_jobs.py` → `domains/admin/api/jobs.py` + shim
- [ ] `api/admin_settings.py` → `domains/admin/api/settings.py` + shim
- [ ] `services/admin_general_settings.py` → `domains/admin/services/general_settings.py` + shim
- [ ] `services/admin_jobs.py` → `domains/admin/services/jobs.py` + shim
- [ ] `services/ops_alert_settings.py` → `domains/admin/services/alert_settings.py` + shim
- [ ] `services/ops_alerts.py` → `domains/admin/services/alerts.py` + shim
- [ ] `services/work_management.py` → `domains/admin/services/work_management.py` + shim
- [ ] `hooks.py`: ops_alerts scheduler path'ini güncelle
- [ ] Dashboard: pages (1) + composables (15) + components (10) → `domains/admin/dashboard/`
- [ ] Admin pages (4) → `domains/admin/pages/`
- [ ] Import/Export (2 page, 2 composable, 11 component) → `platform/import_export/` (cross-cutting!)
- [ ] `config/dashboard_translations.js` → `domains/admin/i18n/dashboard.js`
- [ ] `config/admin_*_translations.js` (2) → `domains/admin/i18n/`
- [ ] `domains/admin/routes.js` oluştur
- [ ] `domains/accounting/routes.js` oluştur
- [ ] `domains/reports/routes.js` oluştur

### Kalan cross-cutting API'ler → `platform/api/` + shim

- [ ] `api/session.py` → `platform/api/session.py` + shim
- [ ] `api/security.py` → `platform/api/security.py` + shim
- [ ] `api/filter_presets.py` → `platform/api/filter_presets.py` + shim
- [ ] `api/mutation_access.py` → `platform/api/mutation_access.py` + shim
- [ ] `api/quick_create.py` → `platform/api/quick_create.py` + shim
- [ ] `api/quick_payloads.py` → `platform/api/quick_payloads.py` + shim
- [ ] `api/record_preview.py` → `platform/api/record_preview.py` + shim
- [ ] `api/seed.py` → `platform/api/seed.py` + shim
- [ ] `api/smoke.py` → `platform/api/smoke.py` + shim
- [ ] `api/versioning.py` → `platform/api/versioning.py` + shim
- [ ] `api/documents.py` → `platform/api/documents.py` + shim
- [ ] `api/data_import.py` → `platform/import_export/api.py` + shim
- [ ] `api/list_exports.py` → `platform/import_export/list_exports_api.py` + shim

### Kalan cross-cutting servisler → `platform/` + shim

- [ ] `services/document_center.py` → `platform/services/document_center.py` + shim
- [ ] `services/data_import/` (10 dosya) → `platform/import_export/data_import/` + shim
- [ ] `services/list_exports.py` → `platform/import_export/list_exports.py` + shim
- [ ] `services/export_payload_utils.py` → `platform/import_export/payload_utils.py` + shim
- [ ] `services/quick_create_core.py` → `platform/quick_create/core.py` + shim
- [ ] `services/quick_create_common.py` → `platform/quick_create/common.py` + shim
- [ ] `services/quick_create_helpers.py` → `platform/quick_create/helpers.py` + shim
- [ ] `services/quick_create_workflow.py` → `platform/quick_create/workflow.py` + shim
- [ ] `services/quick_create_special.py` → `platform/quick_create/special.py` + shim
- [ ] `services/quick_create_search.py` → `platform/quick_create/search.py` + shim
- [ ] `services/quick_create_reference.py` → `platform/quick_create/reference.py` + shim
- [ ] `services/quick_create_auxiliary.py` → `platform/quick_create/auxiliary.py` + shim
- [ ] `services/quick_create/` (__init__.py) → `platform/quick_create/__init__.py` + shim

### Kalan kök modüller → uygun domain/platform + shim

- [ ] `startup.py` → `platform/startup.py` + shim; `hooks.py:21` boot_session path'ini güncelle
- [ ] `realtime.py` → `platform/events/realtime.py` + shim; `hooks.py:37` `_rt` path'ini güncelle
- [ ] `notification_seed_service.py` → `domains/communications/services/seed_service.py` + shim
- [ ] `notification_seed_data.py` → `domains/communications/services/seed_data.py` + shim
- [ ] `notification_dispatch.py` → `domains/communications/services/dispatch.py` + shim
- [ ] `notifications_templateing.py` → `domains/communications/services/templating.py` + shim
- [ ] `notifications_catalog.py` → `domains/communications/services/catalog.py` + shim
- [ ] `policy_documents.py` → `domains/policies/services/documents.py` + shim
- [ ] `setup_utils.py` → `platform/setup_utils.py` + shim
- [ ] `dev_seed.py` → (yerinde kalır, dev-only)
- [ ] `desktop.py` → (yerinde kalır, Frappe desk config)

### Frontend kalanlar → uygun yerlere

- [ ] `composables/useDashboard*` (15 dosya) → `domains/admin/dashboard/composables/`
- [ ] `composables/useAuxWorkbench*` (3 dosya) → `domains/accounting/composables/`
- [ ] `composables/useAuxRecordDetail*` (5 dosya) → `domains/accounting/composables/`
- [ ] `composables/useReconciliationWorkbench*` (5 dosya) → `domains/accounting/composables/`
- [ ] `composables/useImportDataRuntime.js` → `platform/composables/useImportDataRuntime.js`
- [ ] `composables/useExportDataRuntime.js` → `platform/composables/useExportDataRuntime.js`
- [ ] `composables/useScheduledReportsManager.js` → `domains/reports/composables/`
- [ ] `composables/useReports*` (7 dosya) → `domains/reports/composables/`
- [ ] `stores/accounting.js` → `domains/accounting/stores/accountingStore.js`
- [ ] `stores/dashboard.js` → `domains/admin/dashboard/stores/dashboardStore.js`

### Doğrula

- [ ] `npm run build` + `npm run lint` + `npm run typecheck` + `npm run test:unit`
- [ ] `npm run e2e:smoke`
- [ ] Branch: `refactor/phase-11-reports-accounting-admin`

---

## Faz 12: hooks.py + tasks.py Son Kontrol

Tüm taşımalar bittikten sonra hooks.py ve tasks.py'deki HER dotted path'i ve enqueue string'ini kontrol et:

- [ ] `hooks.py`: 23 dotted path'in tamamı yeni konumlara işaret ediyor mu?
- [ ] `tasks.py`: 17 import + 13 enqueue string'in tamamı doğru mu?
- [ ] `tasks.py` içindeki kısa-form (`acentem_takipte.tasks._...`) vs tam-form (`acentem_takipte.acentem_takipte.tasks._...`) enqueue string'leri tutarlı mı? (Hepsi aynı formatta olmalı — tam form önerilir)
- [ ] `patches.txt` referansları kontrol edildi mi?
- [ ] `desktop.py` Frappe desk sayfa referansları kontrol edildi mi?
- [ ] Branch: `refactor/phase-12-hooks-audit`

---

## Faz 13: Shim Temizliği (sadece tüm consumer'lar güncellenince)

- [ ] `api/` altındaki tüm shim dosyalarını sil
- [ ] `services/` altındaki tüm shim dosyalarını sil
- [ ] Kök modül shim'lerini sil (accounting.py, communication.py, notifications.py, realtime.py, startup.py)
- [ ] `renewal/` dizin shim'ini kaldır
- [ ] Frontend: eski `pages/`, `composables/`, `components/` domain dosyalarını sil
- [ ] Frontend: eski `stores/` domain store'larını sil
- [ ] Frontend: eski `config/` domain translation'larını sil
- [ ] `__pycache__` temizliği
- [ ] `npm run build` + `npm run lint` + `npm run typecheck` + `npm run test:unit`
- [ ] `npm run e2e:smoke`
- [ ] Branch: `refactor/phase-13-cleanup`

---

## Özet

| Faz | Ad | Risk | Kritik nokta |
|---|---|---|---|
| 0 | Hazırlık + Stale temizlik | Yok | bench migrate yeniden oluşturduklarını sil |
| 1 | Platform Backend: İzinler | Düşük | 8 dosya taşı, branch_permissions.py temizliği |
| 2 | Platform Frontend: UI | Orta | main.js + toplu i18n import güncellemesi |
| 3 | Claims pilot | Düşük | Pattern kanıtı |
| 4 | Payments | Düşük | tasks.py import |
| 5 | Offers | Düşük | api/offers.py shim (frontend API yolu) |
| 6 | Renewals | Orta | tasks.py enqueue string + import (4 dosya) |
| 7 | Leads | Düşük | — |
| 8 | Customers | Orta | 6 cross-domain import |
| 9 | Policies | Orta | En büyük domain |
| 10 | Communications | Orta | tasks.py enqueue string + import (6 dosya) |
| 11 | Reports + Accounting + Admin | Yüksek | En karmaşık, 13 enqueue string kontrolü |
| 12 | hooks.py + tasks.py audit | Düşük | 23 path + 17 import + 13 enqueue son kontrol |
| 13 | Shim temizliği | Düşük | Tüm consumer'lar güncellenmiş olmalı |

---

## Doğrulama Matrisi (AGENTS.md uyumlu)

| Değişiklik tipi | Doğrulama |
|---|---|
| Frontend sayfa/component/composable | `npm run test:unit` (ilgili test) → `npm run build` |
| Frontend routing/session/shell | `router/index.js` + `main.js` + `session.js` incele → unit test → `npm run build` |
| Backend API/service | Backend test veya bench komutu |
| Hook/scheduler/route/DocType event | `hooks.py` incele → logic path + enqueue path doğrula |
| Sadece dokümantasyon | Link, dosya adı, komut örneklerini workspace'e karşı doğrula |

## Notlar

- `vite.config.js` ve `tsconfig.json` `@` alias'ı `src/` olarak kalır — değişiklik gerekmez
- `frontend/src/pinia.js` yerinde kalır (kök modül, taşınmaz)
- `frontend/src/generated/` dizini yerinde kalır (build artifact)
- `frontend/src/assets/` dizini yerinde kalır (CSS asset'leri)
- Her dosya taşındıktan sonra `__pycache__` temizlenmeli (stale .pyc kalmasın)
- `bench migrate` DocType JSON'dan Python dosyası yeniden oluşturabilir — Phase 0'daki stale temizlik sonrası bench migrate çalıştırılmamalı
