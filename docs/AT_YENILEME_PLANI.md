# AT Yenileme Planı

> Domain-Slice mimarisine geçiş için adım adım uygulama planı.
> Son güncelleme: 2026-07-20 (revize: Frappe uyumluluk + backward compat eklendi)

---

## Kritik Kural: Backward Compatibility (GERİYE UYUMLULUK)

Bu planın en önemli kuralı: **her dosya taşındıktan sonra eski konumunda ince bir re-export (shim) bırakılır.**

Frappe çalışma zamanında API metodlarını, scheduler job'larını, doc_event handler'larını **dotted Python import path** ile çözer. Örneğin `hooks.py` şu path'i kullanır:

```python
"acentem_takipte.acentem_takipte.services.policy_360.invalidate_policy_from_doc_event"
```

Ve frontend şu path ile API çağırır:

```javascript
"/api/method/acentem_takipte.acentem_takipte.api.customers.search_customer_by_identity"
```

Dosya taşındığında path değişirse **her şey kırılır**. Bu yüzden standard iş akışı şudur:

```
1. Dosyayı yeni konuma TAŞI (içerik aynı, sadece import'lar güncellenir)
2. Eski konuma İNCE RE-EXPORT bırak:
   from acentem_takipte.acentem_takipte.domains.X.api.endpoints import *
3. Build + test → her şey çalışıyor olmalı
4. Consumer'lar yeni path'e güncellenir (ilerleyen fazlarda)
5. SADECE tüm consumer'lar güncellenince eski shim silinir (Faz 12)
```

**Örnek — api/customers.py taşıması:**

```python
# ESKİ: acentem_takipte/acentem_takipte/api/customers.py
# (orijinal fonksiyonlar buradaydı, şimdi taşındı)

# YENİ (shim):
"""Backward-compat shim — use domains.customers.api.endpoints instead."""
from acentem_takipte.acentem_takipte.domains.customers.api.endpoints import *  # noqa: F401,F403
```

Bu sayede `hooks.py`, frontend API çağrıları, scheduler job'ları ve tüm cross-module import'lar çalışmaya devam eder.

### Hangi dosyaların shim'e ihtiyacı var?

| Taşınan dosya | Kullananlar |
|---|---|
| `api/*.py` (tümü) | Frontend fetch, hooks.py, testler |
| `services/*.py` (tümü) | hooks.py doc_events, tasks.py, diğer servisler |
| `services/` altındaki kök modüller (`renewal/`, `communication/` vb.) | hooks.py, tasks.py |
| `acentem_takipte/.../accounting.py` | hooks.py doc_event `_acct` |
| `acentem_takipte/.../realtime.py` | hooks.py doc_event `_rt` |
| `acentem_takipte/.../communication.py` | tasks.py, hooks.py |

---

## Faz 0: Hazırlık

- [ ] `mkdir -p acentem_takipte/acentem_takipte/platform/{permissions,persistence,events,import_export,quick_create}`
- [ ] `mkdir -p acentem_takipte/acentem_takipte/domains`
- [ ] `mkdir -p frontend/src/platform/{shell,router,state,ui,composables,api,i18n}`
- [ ] `mkdir -p frontend/src/domains`
- [ ] Git branch: `refactor/phase-0-prep`

---

## Faz 1: Platform Backend — İzinler + Scope

### Dosya taşımaları (taşı + shim bırak)

- [ ] `services/access_policy.py` → `platform/permissions/access_policy.py` + eski konuma shim
- [ ] `services/access_policy_runtime.py` → `platform/permissions/access_policy_runtime.py` + shim
- [ ] `services/branches.py` → `platform/permissions/branches.py` + shim
- [ ] `services/privacy_masking.py` → `platform/permissions/privacy_masking.py` + shim
- [ ] `services/query_isolation.py` → `platform/permissions/query_isolation.py` + shim
- [ ] `services/sales_entities.py` → `platform/permissions/sales_entities.py` + shim
- [ ] `services/report_isolation.py` → birleştir: `platform/permissions/query_isolation.py` (fonksiyon taşınır)
- [ ] `services/cache_precomputation.py` → `platform/persistence/cache_precomputation.py` + shim

### Import güncellemeleri (bunlar DOĞRUDAN yeni path kullanır, shim beklemez)

- [ ] `doctype/branch_permissions.py`: `access_policy`, `branches`, `sales_entities` import'larını yeni path'e güncelle
- [ ] `hooks.py`: `access_policy_runtime` import'unu güncelle
- [ ] `api/reports.py`: `query_isolation` import'unu güncelle
- [ ] `api/dashboard_*.py` (7 dosya): scope/isolation import'larını güncelle

### Dead code temizliği

- [ ] `branch_permissions.py`'deki `_allows_break_glass` fonksiyonunu kaldır (zaten her zaman False dönüyor, break-glass silindi)

### Doğrulama

- [ ] `git diff --stat` → sadece import/path değişikliği olmalı
- [ ] Backend testlerini çalıştır
- [ ] Branch: `refactor/phase-1-platform-permissions`

---

## Faz 2: Platform Frontend — UI Altyapısı

### UI Components → platform/ui/

- [ ] `components/ui/` tümü → `platform/ui/` (eski konuma shim: index.js re-export)
- [ ] `components/app-shell/` tümü → `platform/ui/` (app-shell ile birleşir)
- [ ] `components/Topbar.vue` → `platform/shell/Topbar.vue`
- [ ] `components/Sidebar.vue` → `platform/shell/Sidebar.vue`

### Composables → platform/composables/

- [ ] `composables/useSidebarNavigation.js` → `platform/composables/useSidebarNavigation.js`
- [ ] `composables/useFilterBarState.js` → `platform/composables/useFilterBarState.js`
- [ ] `composables/useCustomFilterPresets.js` → `platform/composables/useCustomFilterPresets.js`
- [ ] `composables/useAtFormatting.js` → `platform/composables/useAtFormatting.js`
- [ ] `composables/useAtDocumentLifecycle.js` → `platform/composables/useAtDocumentLifecycle.js`
- [ ] `composables/useGlobalCustomerSearch.js` → `platform/composables/useGlobalCustomerSearch.js`
- [ ] `composables/useOfficeBranchSelect.js` → `platform/composables/useOfficeBranchSelect.js`

### Quick Create → platform/

- [ ] `composables/useQuickCreateDialogShell.js` → `platform/composables/quickCreate/useDialogShell.js`
- [ ] `composables/useQuickCreateLauncher.js` → `platform/composables/quickCreate/useLauncher.js`
- [ ] `composables/useQuickCreateFormRenderer.js` → `platform/composables/quickCreate/useFormRenderer.js`
- [ ] `composables/useQuickCreateManagedDialog.js` → `platform/composables/quickCreate/useManagedDialog.js`
- [ ] `composables/usePolicyQuickCreateRuntime.js` → `platform/composables/quickCreate/usePolicyRuntime.js`
- [ ] `composables/useQuickCustomerPicker.js` → `platform/composables/quickCreate/useCustomerPicker.js`
- [ ] `components/QuickCreateCustomer.vue` → `platform/ui/quickCreate/QuickCreateCustomer.vue`
- [ ] `components/QuickCreateClaim.vue` → `platform/ui/quickCreate/QuickCreateClaim.vue`
- [ ] `components/QuickCreateOffer.vue` → `platform/ui/quickCreate/QuickCreateOffer.vue`
- [ ] `config/quickCreate/` → `platform/config/quickCreate/`

### State + Router + i18n

- [ ] `stores/auth.js` → `platform/state/authStore.js`
- [ ] `stores/branch.js` → `platform/state/branchStore.js`
- [ ] `stores/ui.js` → `platform/state/uiStore.js`
- [ ] `state/session.js` → `platform/state/session.js`
- [ ] `router/index.js` → `platform/router/index.js`
- [ ] `utils/i18n.js` → `platform/i18n/index.js`
- [ ] `config/common_translations.js` → `platform/i18n/common.js`
- [ ] `config/sidebar_translations.js` → `platform/i18n/sidebar.js`
- [ ] `config/router_translations.js` → `platform/i18n/router.js`
- [ ] `config/document_translations.js` → `platform/i18n/document.js`
- [ ] `config/access_request_translations.js` → `platform/i18n/access_request.js`

### Kritik: main.js güncellemesi

- [ ] `frontend/src/main.js`: tüm import path'lerini yeni `platform/` konumlarına güncelle
  - `./router` → `./platform/router`
  - `./state/session` → `./platform/state/session`
  - `./stores/branch` → `./platform/state/branchStore`
  - `./stores/auth` → `./platform/state/authStore`
  - `./utils/routeMeta` → `./platform/router/routeMeta` (eğer varsa)

### Kritik: i18n referans güncellemesi

- [ ] TÜM composable ve component'lerde `@/utils/i18n` → `@/platform/i18n` import güncellemesi
  (Bu çok sayıda dosya — IDE ile toplu find-replace önerilir)

### Doğrulama

- [ ] `npm run build` + `npm run lint` + `npm run typecheck`
- [ ] `npm run test:unit`
- [ ] Branch: `refactor/phase-2-platform-frontend`

---

## Faz 3: Domain Pilotu — Claims (en küçük)

### Backend

- [ ] `services/claim_360.py` → `domains/claims/services/claim_360.py` + eski konuma shim
- [ ] `doctype/at_claim/at_claim.py` event handler logic → `domains/claims/events.py`
- [ ] `hooks.py`'deki `_cl360` path'ini yeni konuma güncelle

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

- [ ] `domains/claims/routes.js` oluştur (route tanımları)
- [ ] `platform/router/index.js`: claims route'larını import et
- [ ] Eski route tanımlarını router/index.js'den KALDIR

### Doğrulama

- [ ] `npm run build` + `npm run typecheck`
- [ ] Playwright: `/at/claims` ve `/at/claims/:name`
- [ ] Branch: `refactor/phase-3-claims`

---

## Faz 4: Payments

### Backend

- [ ] `services/payment_360.py` → `domains/payments/services/payment_360.py` + shim
- [ ] `services/payments.py` → `domains/payments/services/payments.py` + shim
- [ ] `hooks.py`'deki `_pay360` path'ini güncelle

### Frontend

- [ ] `pages/PaymentsBoard.vue` → `domains/payments/pages/PaymentsBoard.vue`
- [ ] `pages/PaymentDetail.vue` → `domains/payments/pages/PaymentDetail.vue`
- [ ] `composables/paymentsListTableModel.js` → `domains/payments/composables/tableModel.js`
- [ ] `composables/usePaymentsBoardRuntime.js` → `domains/payments/composables/useBoard.js`
- [ ] `composables/usePaymentsBoardActions.js` → `domains/payments/composables/useBoardActions.js`
- [ ] `composables/usePaymentsBoardSummary.js` → `domains/payments/composables/useBoardSummary.js`
- [ ] `composables/usePaymentsBoardQuickPayment.js` → `domains/payments/composables/useQuickPayment.js`
- [ ] `composables/usePaymentDetailRuntime.js` → `domains/payments/composables/useDetail.js`
- [ ] `composables/paymentsBoard/helpers.js` → `domains/payments/composables/helpers.js`
- [ ] `components/payments-board/` (5 dosya) → `domains/payments/components/board/`
- [ ] `stores/payment.js` → `domains/payments/stores/paymentStore.js`
- [ ] `config/payment_translations.js` → `domains/payments/i18n/translations.js`
- [ ] `domains/payments/routes.js` oluştur, router'a ekle
- [ ] `npm run build` + doğrulama
- [ ] Branch: `refactor/phase-4-payments`

---

## Faz 5: Offers

### Backend

- [ ] `api/offers.py` → `domains/offers/api/endpoints.py` + eski konuma shim
- [ ] `services/offer_360.py` → `domains/offers/services/offer_360.py` + shim
- [ ] `hooks.py`'deki `_o360` path'ini güncelle

### Frontend

- [ ] `pages/OfferBoard.vue` → `domains/offers/pages/OfferBoard.vue`
- [ ] `pages/OfferDetail.vue` → `domains/offers/pages/OfferDetail.vue`
- [ ] `composables/offerListTableModel.js` → `domains/offers/composables/tableModel.js`
- [ ] `composables/useOfferDetailRuntime.js` → `domains/offers/composables/useDetail.js`
- [ ] `composables/offerBoard/` → `domains/offers/composables/` (state.js, quickOffer.js, filters.js, conversion.js)
- [ ] `components/offer-board/` → `domains/offers/components/board/`
- [ ] `components/OfferForm.vue` → `domains/offers/components/OfferForm.vue`
- [ ] `config/offer_translations.js` → `domains/offers/i18n/translations.js`
- [ ] `domains/offers/routes.js` oluştur, router'a ekle
- [ ] `npm run build` + doğrulama
- [ ] Branch: `refactor/phase-5-offers`

---

## Faz 6: Renewals

### Backend

- [ ] `services/renewals.py` → `domains/renewals/services/renewals.py` + shim
- [ ] `acentem_takipte/acentem_takipte/renewal/` dizini → `domains/renewals/services/renewal_core/` (pipeline, reminders, service)
- [ ] `hooks.py`'deki renewal task path'lerini ve `tasks.py`'deki import'ları güncelle

### Frontend

- [ ] `pages/RenewalsBoard.vue` → `domains/renewals/pages/RenewalsBoard.vue`
- [ ] `pages/RenewalTaskDetail.vue` → `domains/renewals/pages/RenewalTaskDetail.vue`
- [ ] `composables/renewalsListTableModel.js` → `domains/renewals/composables/tableModel.js`
- [ ] `composables/useRenewalsBoardRuntime.js` → `domains/renewals/composables/useBoard.js`
- [ ] `stores/renewal.js` → `domains/renewals/stores/renewalStore.js`
- [ ] `config/renewal_translations.js` → `domains/renewals/i18n/translations.js`
- [ ] `domains/renewals/routes.js` oluştur, router'a ekle
- [ ] `npm run build` + doğrulama
- [ ] Branch: `refactor/phase-6-renewals`

---

## Faz 7: Leads

### Backend

- [ ] `api/dashboard_lead_logic.py` → `domains/leads/api/dashboard.py` + shim
- [ ] `services/lead_360.py` → `domains/leads/services/lead_360.py` + shim
- [ ] `hooks.py`'deki `_l360` path'ini güncelle

### Frontend

- [ ] `pages/LeadList.vue` → `domains/leads/pages/LeadList.vue`
- [ ] `pages/LeadDetail.vue` → `domains/leads/pages/LeadDetail.vue`
- [ ] `composables/useLeadListNavigation.js` → `domains/leads/composables/useListNavigation.js`
- [ ] `composables/useLeadListFilters.js` → `domains/leads/composables/useListFilters.js`
- [ ] `composables/useLeadListActions.js` → `domains/leads/composables/useListActions.js`
- [ ] `composables/useLeadListTableData.js` → `domains/leads/composables/useListTableData.js`
- [ ] `composables/useLeadListQuickLead.js` → `domains/leads/composables/useQuickLead.js`
- [ ] `composables/useLeadDetailRuntime.js` → `domains/leads/composables/useDetail.js`
- [ ] `composables/useLeadBoardRuntime.js` → `domains/leads/composables/useBoard.js`
- [ ] `components/lead-list/LeadListQuickLeadDialog.vue` → `domains/leads/components/QuickLeadDialog.vue`
- [ ] `components/LeadForm.vue` → `domains/leads/components/LeadForm.vue`
- [ ] `config/lead_translations.js` → `domains/leads/i18n/translations.js`
- [ ] `domains/leads/routes.js` oluştur, router'a ekle
- [ ] `npm run build` + doğrulama
- [ ] Branch: `refactor/phase-7-leads`

---

## Faz 8: Customers

### Backend

- [ ] `api/customers.py` → `domains/customers/api/endpoints.py` + shim (ÖNEMLİ: frontend API yolu korunur!)
- [ ] `services/customer_360.py` → `domains/customers/services/customer_360.py` + shim
- [ ] `services/customer_segments.py` → `domains/customers/services/customer_segments.py` + shim
- [ ] `services/quick_create_customer_flow.py` → `domains/customers/services/quick_create.py` + shim
- [ ] `services/quick_customer.py` → `domains/customers/services/quick_customer.py` + shim
- [ ] `hooks.py`'deki `_c360` path'ini güncelle

### Frontend

- [ ] `pages/CustomerList.vue` → `domains/customers/pages/CustomerList.vue`
- [ ] `pages/CustomerDetail.vue` → `domains/customers/pages/CustomerDetail.vue`
- [ ] `pages/CustomerSearchPage.vue` → `domains/customers/pages/CustomerSearchPage.vue`
- [ ] `composables/customerListTableModel.js` → `domains/customers/composables/tableModel.js`
- [ ] `composables/useCustomerSearchPage.js` → `domains/customers/composables/useSearch.js`
- [ ] `composables/useCustomerDetailRuntime.js` → `domains/customers/composables/useDetail.js`
- [ ] `composables/useCustomerBoardRuntime.js` → `domains/customers/composables/useBoard.js`
- [ ] `components/CustomerForm.vue` → `domains/customers/components/CustomerForm.vue`
- [ ] `config/customer_translations.js` → `domains/customers/i18n/translations.js`
- [ ] `config/customer_search_translations.js` → `domains/customers/i18n/search.js`
- [ ] `domains/customers/routes.js` oluştur, router'a ekle

### Kritik: cross-domain import güncellemesi

`customer_360` ve `quick_customer` diğer birçok domain tarafından import edilir. Bu fazda shim sayesinde eski import'lar çalışmaya devam eder, ama yeni domain kodlarında yeni path kullanılmalı:

- [ ] `domains/policies/services/policy_360.py` → customer import'unu yeni path'e güncelle
- [ ] `domains/payments/services/payment_360.py` → aynı
- [ ] `domains/claims/services/claim_360.py` → aynı
- [ ] `domains/offers/services/offer_360.py` → aynı
- [ ] `domains/renewals/services/renewals.py` → aynı

### Doğrulama

- [ ] `npm run build` + `npm run test:unit`
- [ ] Frontend API testi: `/api/method/acentem_takipte.acentem_takipte.api.customers.search_customer_by_identity` hala 200 OK dönüyor mu? (shim testi)
- [ ] Branch: `refactor/phase-8-customers`

---

## Faz 9: Policies (en büyük domain)

### Backend

- [ ] `services/policy_360.py` → `domains/policies/services/policy_360.py` + shim
- [ ] `services/quick_create_policy_task.py` → `domains/policies/services/quick_create.py` + shim
- [ ] `hooks.py`'deki `_p360` path'ini güncelle
- [ ] `tasks.py`'deki policy import'larını güncelle

### Frontend

- [ ] `pages/PolicyList.vue` → `domains/policies/pages/PolicyList.vue`
- [ ] `pages/PolicyDetail.vue` → `domains/policies/pages/PolicyDetail.vue`
- [ ] `composables/policyListTableModel.js` → `domains/policies/composables/tableModel.js`
- [ ] `composables/usePolicyListRuntime.js` → `domains/policies/composables/useList.js`
- [ ] `composables/usePolicyListTableData.js` → `domains/policies/composables/useListTableData.js`
- [ ] `composables/usePolicyListFilters.js` → `domains/policies/composables/useListFilters.js`
- [ ] `composables/usePolicyListActions.js` → `domains/policies/composables/useListActions.js`
- [ ] `composables/usePolicyListQuickPolicy.js` → `domains/policies/composables/useQuickPolicy.js`
- [ ] `composables/usePolicyListPresetSync.js` → `domains/policies/composables/useListPresetSync.js`
- [ ] `composables/usePolicyDetailRuntime.js` → `domains/policies/composables/useDetail.js`
- [ ] `composables/usePolicyFormRuntime.js` → `domains/policies/composables/useForm.js`
- [ ] `components/policy-list/PolicyListQuickPolicyDialog.vue` → `domains/policies/components/`
- [ ] `components/PolicyForm.vue` → `domains/policies/components/PolicyForm.vue`
- [ ] `stores/policy.js` → `domains/policies/stores/policyStore.js`
- [ ] `config/policy_translations.js` → `domains/policies/i18n/translations.js`
- [ ] Tüm policy test dosyaları (6 adet) → `domains/policies/composables/` (testler de domain altında yaşar)
- [ ] `domains/policies/routes.js` oluştur, router'a ekle
- [ ] `npm run build` + `npm run test:unit` + `npm run e2e:smoke`
- [ ] Branch: `refactor/phase-9-policies`

---

## Faz 10: Communications

### Backend

- [ ] `api/communication.py` → `domains/communications/api/endpoints.py` + shim
- [ ] `services/campaigns.py` → `domains/communications/services/campaigns.py` + shim
- [ ] `services/follow_up_sla.py` → `domains/communications/services/follow_up_sla.py` + shim
- [ ] `services/notifications.py` → `domains/communications/services/notifications.py` + shim
- [ ] `services/segments.py` → `domains/communications/services/segments.py` + shim
- [ ] `acentem_takipte/acentem_takipte/communication.py` → `domains/communications/services/queue_processor.py` + eski konuma shim
- [ ] `acentem_takipte/acentem_takipte/notifications.py` → `domains/communications/services/notification_core.py` + shim
- [ ] `hooks.py`'deki communication/notification path'lerini güncelle
- [ ] `tasks.py`'deki communication/notification import'larını güncelle

### Frontend

- [ ] 8 page Vue dosyası → `domains/communications/pages/`
- [ ] `composables/communicationCenter/` (9 dosya) → `domains/communications/composables/`
- [ ] `components/communication-center/` (5 dosya) → `domains/communications/components/`
- [ ] `stores/communication.js` → `domains/communications/stores/communicationStore.js`
- [ ] `config/communication_translations.js` → `domains/communications/i18n/translations.js`
- [ ] `domains/communications/routes.js` oluştur, router'a ekle
- [ ] `npm run build` + doğrulama
- [ ] Branch: `refactor/phase-10-communications`

---

## Faz 11: Reports + Accounting + Admin

### Reports

- [ ] `api/dashboard*.py` (8 dosya) → `domains/reports/api/` + shim'ler
- [ ] `api/reports.py` → `domains/reports/api/endpoints.py` + shim
- [ ] `services/reporting.py` → `domains/reports/services/reporting.py` + shim
- [ ] `services/report_registry.py` → `domains/reports/services/registry.py` + shim
- [ ] `services/reports_runtime.py` → `domains/reports/services/runtime.py` + shim
- [ ] `services/report_exports.py` → `domains/reports/services/exports.py` + shim
- [ ] `services/report_snapshots.py` → `domains/reports/services/snapshots.py` + shim
- [ ] `services/scheduled_reports.py` → `domains/reports/services/scheduled.py` + shim
- [ ] `services/async_reports.py` → `domains/reports/services/async_reports.py` + shim
- [ ] `hooks.py`'deki dashboard, report scheduler path'lerini güncelle
- [ ] Frontend: 5 page + 10 composable + 12 component → `domains/reports/`
- [ ] `domains/reports/routes.js` oluştur, router'a ekle

### Accounting

- [ ] `api/accounting.py` → `domains/accounting/api/endpoints.py` + shim
- [ ] `api/dashboard_reconciliation.py` → `domains/accounting/api/dashboard.py` + shim
- [ ] `services/accounting_runtime.py` → `domains/accounting/services/runtime.py` + shim
- [ ] `services/accounting_statement_import.py` → `domains/accounting/services/statement_import.py` + shim
- [ ] `acentem_takipte/acentem_takipte/accounting.py` → `domains/accounting/services/sync.py` + shim
- [ ] `hooks.py`'deki `_acct` path'ini güncelle
- [ ] Frontend: 8 page + 16 composable + 17 component → `domains/accounting/`
- [ ] `config/auxWorkbench/` → `domains/accounting/config/` veya `platform/config/auxWorkbench/`
- [ ] `domains/accounting/routes.js` oluştur

### Admin

- [ ] `api/admin_jobs.py` → `domains/admin/api/jobs.py` + shim
- [ ] `api/admin_settings.py` → `domains/admin/api/settings.py` + shim
- [ ] `services/admin_general_settings.py` → `domains/admin/services/general_settings.py` + shim
- [ ] `services/admin_jobs.py` → `domains/admin/services/jobs.py` + shim
- [ ] `services/ops_alert_settings.py` → `domains/admin/services/alert_settings.py` + shim
- [ ] `services/ops_alerts.py` → `domains/admin/services/alerts.py` + shim
- [ ] `services/work_management.py` → `domains/admin/services/work_management.py` + shim
- [ ] `hooks.py`'deki admin/ops scheduler path'lerini güncelle
- [ ] Dashboard pages + composables + components → `domains/admin/dashboard/`
- [ ] Admin settings pages → `domains/admin/pages/`
- [ ] Import/Export pages → `domains/admin/pages/`
- [ ] `domains/admin/routes.js` oluştur

### Doğrulama

- [ ] `npm run build` + `npm run lint` + `npm run typecheck` + `npm run test:unit`
- [ ] `npm run e2e:smoke`
- [ ] Branch: `refactor/phase-11-reports-accounting-admin`

---

## Faz 12: Temizlik — Shim'leri Kaldır

Bu faz ancak **tüm consumer'lar yeni path'lere güncellendikten sonra** yapılır.

### Backend shim temizliği (her domain için)

- [ ] `api/` altındaki tüm shim dosyaları sil (`__init__.py` kalır, diğerleri gider)
- [ ] `services/` altındaki tüm shim dosyaları sil
- [ ] `acentem_takipte/acentem_takipte/` kökündeki taşınmış modüllerin shim'lerini sil
  (`accounting.py`, `communication.py`, `notifications.py`, `realtime.py` → shim kaldır)
- [ ] `renewal/` dizini shim'i kaldır

### Frontend temizliği

- [ ] `pages/` altındaki tüm domain sayfaları sil (domains altında yaşıyor)
- [ ] `composables/` altındaki tüm domain composable'ları sil
- [ ] `components/` altındaki tüm domain alt klasörleri sil (`claims-board/`, `payments-board/` vb.)
- [ ] `stores/` altındaki tüm domain store'ları sil (`policy.js`, `claim.js` vb.)
- [ ] `config/` altındaki tüm domain translation dosyaları sil

### Son kontrol

- [ ] `hooks.py`'deki TÜM dotted path'lerin doğru olduğunu kontrol et
- [ ] `tasks.py`'deki TÜM import'ların doğru olduğunu kontrol et
- [ ] `patches.txt`'deki patch referanslarını kontrol et
- [ ] Frontend'de hiçbir `@/pages/`, `@/composables/`, `@/stores/` eski import kalmadığını grep ile kontrol et
- [ ] `npm run build` + `npm run lint` + `npm run typecheck` + `npm run test:unit`
- [ ] `npm run e2e:smoke`
- [ ] Branch: `refactor/phase-12-cleanup`

---

## Özet Tablo

| Faz | Ad | Görev | Risk | Kritik Bağımlılık |
|---|---|---|---|---|
| 0 | Hazırlık | 4 | Yok | — |
| 1 | Platform Backend: İzinler | 15 | Düşük | — |
| 2 | Platform Frontend: UI | 38 | Orta | Faz 1 |
| 3 | Claims pilot | 20 | Düşük | Faz 2 |
| 4 | Payments | 17 | Düşük | Faz 2 |
| 5 | Offers | 15 | Düşük | Faz 2 |
| 6 | Renewals | 14 | Düşük | Faz 2 |
| 7 | Leads | 18 | Düşük | Faz 2 |
| 8 | Customers | 24 | Orta | Faz 2 |
| 9 | Policies | 27 | Orta | Faz 8 |
| 10 | Communications | 25 | Düşük | Faz 2 |
| 11 | Reports + Accounting + Admin | 35 | Yüksek | Faz 8,9 |
| 12 | Shim temizliği | 18 | Düşük | Tüm fazlar |
| **Toplam** | | **~270** | | |

---

## Her Fazda Ortak Doğrulama

1. `git checkout -b refactor/phase-N-...`
2. Dosyayı yeni konuma taşı, import'ları güncelle
3. Eski konuma **ince re-export shim** bırak
4. `hooks.py` ve `tasks.py`'deki ilgili dotted path'leri güncelle (shim'e güvenme, direkt güncelle)
5. `npm run build`
6. `npm run lint && npm run typecheck`
7. `npm run test:unit` (varsa)
8. `npm run e2e:smoke` (elle test)
9. `git diff --stat` → sadece import/path değişikliği olmalı, iş mantığı aynı
10. Commit ve PR

---

## Notlar

- Her faz kendi branch'inde ilerler, ana branch etkilenmez
- İş mantığına **kesinlikle dokunulmaz** — sadece dosya yolu ve import değişikliği
- Shim dosyaları `# noqa: F401,F403` ile lint suppression içerir
- Break-glass sistemi zaten silindi — `branch_permissions.py`'deki `_allows_break_glass` Faz 1'de temizlenir
- `SecurityContext` objesi Faz 1'de altyapısı hazırlanır, Faz 8-9'da aktif kullanıma geçer
- `docs/README.md`'ye migration ilerledikçe yeni klasör yapısı eklenmeli
