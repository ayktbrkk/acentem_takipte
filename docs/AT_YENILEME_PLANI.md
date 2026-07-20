# AT Yenileme Planı

> Domain-Slice mimarisine geçiş için adım adım uygulama planı.
> Her faz kendi branch'inde yapılır, import-only değişiklik, iş mantığına dokunulmaz.
> Son güncelleme: 2026-07-20

---

## Faz 0: Hazırlık

- [ ] `mkdir -p acentem_takipte/acentem_takipte/platform/{permissions,persistence,events,import_export,quick_create}`
- [ ] `mkdir -p acentem_takipte/acentem_takipte/domains`
- [ ] `mkdir -p frontend/src/platform/{shell,router,state,ui,composables,api,i18n}`
- [ ] `mkdir -p frontend/src/domains`
- [ ] Branch: `refactor/phase-0-prep`

---

## Faz 1: Platform Backend — İzinler + Scope

- [ ] `services/access_policy.py` → `platform/permissions/access_policy.py`
- [ ] `services/access_policy_runtime.py` → `platform/permissions/access_policy_runtime.py`
- [ ] `services/branches.py` → `platform/permissions/branches.py`
- [ ] `services/privacy_masking.py` → `platform/permissions/privacy_masking.py`
- [ ] `services/query_isolation.py` → `platform/permissions/query_isolation.py`
- [ ] `services/sales_entities.py` → `platform/permissions/sales_entities.py`
- [ ] `services/report_isolation.py` → birleştir: `platform/permissions/query_isolation.py`
- [ ] `services/cache_precomputation.py` → `platform/persistence/cache_precomputation.py`
- [ ] `doctype/branch_permissions.py`: import yollarını güncelle
- [ ] `hooks.py`: `access_policy_runtime` import'unu güncelle
- [ ] `api/reports.py`: `query_isolation` import'unu güncelle
- [ ] `api/dashboard_*.py` (7 dosya): scope/isolation import'larını güncelle
- [ ] `_allows_break_glass` dead code'unu `branch_permissions.py`'den temizle
- [ ] Backend testlerini çalıştır
- [ ] Branch: `refactor/phase-1-platform-permissions`

---

## Faz 2: Platform Frontend — UI Altyapısı

### UI Components (app-shell + ui birleşimi)

- [ ] `components/ui/` tüm dosyalar → `platform/ui/`
- [ ] `components/app-shell/` tüm dosyalar → `platform/ui/`
- [ ] `components/Sidebar.vue` → `platform/shell/Sidebar.vue`
- [ ] `components/Topbar.vue` → `platform/shell/Topbar.vue`

### Platform Composables

- [ ] `composables/useSidebarNavigation.js` → `platform/composables/useSidebarNavigation.js`
- [ ] `composables/useFilterBarState.js` → `platform/composables/useFilterBarState.js`
- [ ] `composables/useCustomFilterPresets.js` → `platform/composables/useCustomFilterPresets.js`
- [ ] `composables/useAtFormatting.js` → `platform/composables/useAtFormatting.js`
- [ ] `composables/useAtDocumentLifecycle.js` → `platform/composables/useAtDocumentLifecycle.js`
- [ ] `composables/useGlobalCustomerSearch.js` → `platform/composables/useGlobalCustomerSearch.js`
- [ ] `composables/useOfficeBranchSelect.js` → `platform/composables/useOfficeBranchSelect.js`

### Quick Create → Platform

- [ ] `composables/useQuickCreateDialogShell.js` → `platform/composables/quickCreate/`
- [ ] `composables/useQuickCreateLauncher.js` → `platform/composables/quickCreate/`
- [ ] `composables/useQuickCreateFormRenderer.js` → `platform/composables/quickCreate/`
- [ ] `composables/useQuickCreateManagedDialog.js` → `platform/composables/quickCreate/`
- [ ] `composables/usePolicyQuickCreateRuntime.js` → `platform/composables/quickCreate/`
- [ ] `composables/useQuickCustomerPicker.js` → `platform/composables/quickCreate/`
- [ ] `components/QuickCreateCustomer.vue` → `platform/ui/QuickCreateCustomer.vue`
- [ ] `components/QuickCreateClaim.vue` → `platform/ui/QuickCreateClaim.vue`
- [ ] `components/QuickCreateOffer.vue` → `platform/ui/QuickCreateOffer.vue`
- [ ] `config/quickCreate/` → `platform/config/quickCreate/`

### State + Router

- [ ] `stores/auth.js` → `platform/state/authStore.js`
- [ ] `stores/branch.js` → `platform/state/branchStore.js`
- [ ] `stores/ui.js` → `platform/state/uiStore.js`
- [ ] `state/session.js` → `platform/state/session.js`
- [ ] `router/index.js` → `platform/router/index.js`
- [ ] `utils/i18n.js` → `platform/i18n/index.js`

### Config → i18n (parçala, henüz domain'lere dağıtma)

- [ ] `config/common_translations.js` → `platform/i18n/common.js`
- [ ] `config/sidebar_translations.js` → `platform/i18n/sidebar.js`
- [ ] `config/router_translations.js` → `platform/i18n/router.js`
- [ ] `config/document_translations.js` → `platform/i18n/document.js`
- [ ] `npm run build` + `npm run lint` + `npm run typecheck`
- [ ] Branch: `refactor/phase-2-platform-frontend`

---

## Faz 3: Domain Pilotu — Claims (en küçük domain)

### Backend

- [ ] `services/claim_360.py` → `domains/claims/services/claim_360.py`
- [ ] `doctype/at_claim/` event handler → `domains/claims/events.py`

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

- [ ] Yeni: `domains/claims/routes.js` oluştur
- [ ] `platform/router/index.js`: claims route'larını import et
- [ ] Eski route tanımlarını router/index.js'den kaldır

### Doğrulama

- [ ] `npm run build` + `npm run typecheck`
- [ ] Playwright: `/at/claims` ve `/at/claims/:name` çalışıyor mu?
- [ ] Branch: `refactor/phase-3-claims`

---

## Faz 4: Payments

### Backend

- [ ] `services/payment_360.py` → `domains/payments/services/payment_360.py`
- [ ] `services/payments.py` → `domains/payments/services/payments.py`
- [ ] `doctype/at_payment/` + `at_payment_installment/` event handler'ları → `domains/payments/events.py`

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

- [ ] `api/offers.py` → `domains/offers/api/endpoints.py`
- [ ] `services/offer_360.py` → `domains/offers/services/offer_360.py`
- [ ] `doctype/at_offer/` event handler'ı → `domains/offers/events.py`

### Frontend

- [ ] `pages/OfferBoard.vue` → `domains/offers/pages/OfferBoard.vue`
- [ ] `pages/OfferDetail.vue` → `domains/offers/pages/OfferDetail.vue`
- [ ] `composables/offerListTableModel.js` → `domains/offers/composables/tableModel.js`
- [ ] `composables/useOfferDetailRuntime.js` → `domains/offers/composables/useDetail.js`
- [ ] `composables/offerBoard/` (4 dosya) → `domains/offers/composables/`
- [ ] `components/offer-board/` (3 dosya) → `domains/offers/components/board/`
- [ ] `components/OfferForm.vue` → `domains/offers/components/OfferForm.vue`
- [ ] `config/offer_translations.js` → `domains/offers/i18n/translations.js`
- [ ] `domains/offers/routes.js` oluştur, router'a ekle
- [ ] `npm run build` + doğrulama
- [ ] Branch: `refactor/phase-5-offers`

---

## Faz 6: Renewals

### Backend

- [ ] `services/renewals.py` → `domains/renewals/services/renewals.py`
- [ ] `doctype/at_renewal_task/` + `at_renewal_outcome/` event handler'ları → `domains/renewals/events.py`

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

- [ ] `api/dashboard_lead_logic.py` → `domains/leads/api/dashboard_lead.py`
- [ ] `services/lead_360.py` → `domains/leads/services/lead_360.py`
- [ ] `doctype/at_lead/` event handler'ı → `domains/leads/events.py`

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
- [ ] `components/lead-list/LeadListQuickLeadDialog.vue` → `domains/leads/components/`
- [ ] `components/LeadForm.vue` → `domains/leads/components/LeadForm.vue`
- [ ] `config/lead_translations.js` → `domains/leads/i18n/translations.js`
- [ ] `domains/leads/routes.js` oluştur, router'a ekle
- [ ] `npm run build` + doğrulama
- [ ] Branch: `refactor/phase-7-leads`

---

## Faz 8: Customers

### Backend

- [ ] `api/customers.py` → `domains/customers/api/endpoints.py`
- [ ] `services/customer_360.py` → `domains/customers/services/customer_360.py`
- [ ] `services/customer_segments.py` → `domains/customers/services/customer_segments.py`
- [ ] `services/quick_create_customer_flow.py` → `domains/customers/services/quick_create.py`
- [ ] `services/quick_customer.py` → `domains/customers/services/quick_customer.py`
- [ ] `doctype/at_customer/` event handler'ı → `domains/customers/events.py`
- [ ] `doctype/at_customer_relation/` + `at_customer_segment_snapshot/` + `at_ownership_assignment/` → `domains/customers/events.py`

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
- [ ] **Kritik:** `customer_360` ve `quick_customer` import'larını diğer tüm domain'lerde güncelle (policies, payments, claims, offers, renewals, leads)
- [ ] `npm run build` + tüm testleri çalıştır
- [ ] Branch: `refactor/phase-8-customers`

---

## Faz 9: Policies (en büyük domain)

### Backend

- [ ] `services/policy_360.py` → `domains/policies/services/policy_360.py`
- [ ] `services/quick_create_policy_task.py` → `domains/policies/services/quick_create.py`
- [ ] `doctype/at_policy/` event handler'ı → `domains/policies/events.py`
- [ ] `doctype/at_policy_endorsement/` + `at_policy_snapshot/` + `at_insurance_company/` + `at_insured_asset/` → `domains/policies/events.py`

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
- [ ] `domains/policies/routes.js` oluştur, router'a ekle
- [ ] Tüm test dosyaları (6 adet .test.js) → `domains/policies/composables/`
- [ ] `npm run build` + `npm run test:unit` + `npm run e2e:smoke`
- [ ] Branch: `refactor/phase-9-policies`

---

## Faz 10: Communications

### Backend

- [ ] `api/communication.py` → `domains/communications/api/endpoints.py`
- [ ] `services/campaigns.py` → `domains/communications/services/campaigns.py`
- [ ] `services/follow_up_sla.py` → `domains/communications/services/follow_up_sla.py`
- [ ] `services/notifications.py` → `domains/communications/services/notifications.py`
- [ ] `services/segments.py` → `domains/communications/services/segments.py`
- [ ] İlgili doctype event handler'ları → `domains/communications/events.py`

### Frontend

- [ ] `pages/CommunicationCenter.vue` → `domains/communications/pages/`
- [ ] `pages/CommunicationHub.vue` → `domains/communications/pages/`
- [ ] `pages/SentNotificationsList.vue` + `SentNotificationDetail.vue` → `domains/communications/pages/`
- [ ] `pages/NotificationTemplatesList.vue` + `NotificationTemplateEditor.vue` → `domains/communications/pages/`
- [ ] `pages/NotificationDraftsList.vue` + `NotificationDraftDetail.vue` → `domains/communications/pages/`
- [ ] `composables/communicationCenter/` (9 dosya) → `domains/communications/composables/`
- [ ] `components/communication-center/` (5 dosya) → `domains/communications/components/`
- [ ] `stores/communication.js` → `domains/communications/stores/communicationStore.js`
- [ ] `config/communication_translations.js` → `domains/communications/i18n/translations.js`
- [ ] `domains/communications/routes.js` oluştur, router'a ekle
- [ ] `npm run build` + doğrulama
- [ ] Branch: `refactor/phase-10-communications`

---

## Faz 11: Reports + Accounting + Admin

### Reports (3 alt domain)

- [ ] `api/dashboard*.py` (8 dosya) → `domains/reports/api/dashboard/`
- [ ] `api/reports.py` → `domains/reports/api/endpoints.py`
- [ ] `services/reporting.py, report_registry.py, reports_runtime.py, report_exports.py` → `domains/reports/services/reports/`
- [ ] `services/report_snapshots.py, scheduled_reports.py, async_reports.py` → `domains/reports/services/snapshots/`
- [ ] `services/report_isolation.py` → (Faz 1'de zaten birleştirildi)
- [ ] Frontend pages (5) + composables (10) + components (12) → `domains/reports/`
- [ ] `domains/reports/routes.js` oluştur, router'a ekle

### Accounting

- [ ] `api/accounting.py` → `domains/accounting/api/endpoints.py`
- [ ] `api/dashboard_reconciliation.py` → `domains/accounting/api/dashboard.py`
- [ ] `services/accounting_runtime.py` → `domains/accounting/services/`
- [ ] `services/accounting_statement_import.py` → `domains/accounting/services/`
- [ ] Frontend pages (8) + composables (16) + components (17) → `domains/accounting/`
- [ ] `config/auxWorkbench/` (8 dosya) → `domains/accounting/` veya `platform/config/auxWorkbench/`
- [ ] `config/aux_*_translations.js` + `config/reconciliation_translations.js` → `domains/accounting/i18n/`
- [ ] `domains/accounting/routes.js` oluştur

### Admin

- [ ] `api/admin_jobs.py` → `domains/admin/api/jobs.py`
- [ ] `api/admin_settings.py` → `domains/admin/api/settings.py`
- [ ] `services/admin_general_settings.py` → `domains/admin/services/`
- [ ] `services/admin_jobs.py` → `domains/admin/services/`
- [ ] `services/ops_alert_settings.py` → `domains/admin/services/`
- [ ] `services/ops_alerts.py` → `domains/admin/services/`
- [ ] `services/sales_entities.py` → (zaten platform/permissions'da)
- [ ] `services/work_management.py` → `domains/admin/services/`
- [ ] Dashboard pages + composables + components → `domains/admin/dashboard/`
- [ ] Admin pages (general settings, alert channels) → `domains/admin/pages/`
- [ ] Import/Export pages + composables + components → `domains/admin/pages/`
- [ ] `config/admin_*_translations.js` + `config/dashboard_translations.js` → `domains/admin/i18n/`
- [ ] `config/import_translations.js` + `config/export_translations.js` → `domains/admin/i18n/`
- [ ] `domains/admin/routes.js` oluştur, router'a ekle
- [ ] `npm run build` + `npm run e2e:smoke`
- [ ] Branch: `refactor/phase-11-reports-accounting-admin`

---

## Faz 12: Temizlik

- [ ] Eski `api/` klasöründen kalan tüm dosyaları sil (sadece `__init__.py` kalır)
- [ ] Eski `services/` klasöründen kalan tüm dosyaları sil
- [ ] Eski `frontend/src/pages/` klasörünü sil
- [ ] Eski `frontend/src/composables/` klasörünü sil
- [ ] Eski `frontend/src/components/` domain alt klasörlerini sil (sadece `platform/` kalır)
- [ ] Eski `frontend/src/stores/` domain store'larını sil
- [ ] Eski `frontend/src/config/` domain translation'larını sil (sadece cross-cutting kalır)
- [ ] `hooks.py`'de import yollarını son kez kontrol et
- [ ] `patches.txt`'de patch referanslarını kontrol et
- [ ] Task ve scheduler reference'larını kontrol et
- [ ] `npm run build` + `npm run lint` + `npm run typecheck` + `npm run test:unit`
- [ ] `npm run e2e:smoke`
- [ ] Branch: `refactor/phase-12-cleanup`

---

## Kontrol Listesi Özeti

| Faz | Ad | Görev sayısı | Risk |
|---|---|---|---|
| 0 | Hazırlık | 4 | Yok |
| 1 | Platform Backend: İzinler | 14 | Düşük |
| 2 | Platform Frontend: UI | 25 | Orta |
| 3 | Claims pilot | 19 | Düşük |
| 4 | Payments | 16 | Düşük |
| 5 | Offers | 14 | Düşük |
| 6 | Renewals | 11 | Düşük |
| 7 | Leads | 17 | Düşük |
| 8 | Customers | 18 | Orta |
| 9 | Policies | 21 | Orta |
| 10 | Communications | 16 | Düşük |
| 11 | Reports + Accounting + Admin | 30 | Yüksek |
| 12 | Temizlik | 13 | Düşük |
| **Toplam** | | **~218** | |

---

## Her Fazda Ortak Doğrulama

1. `git checkout -b refactor/phase-N-...`
2. Dosyaları taşı, import'ları güncelle
3. `npm run build` (frontend)
4. `npm run lint && npm run typecheck`
5. (varsa) `npm run test:unit`
6. Playwright smoke test: `npm run e2e:smoke`
7. `git diff --stat` → sadece import/path değişikliği olmalı
8. Commit ve PR oluştur
9. Onay sonrası `main`'e merge

---

## Notlar

- Her faz kendi branch'inde ilerler, ana branch etkilenmez
- İş mantığına **kesinlikle dokunulmaz** — sadece dosya yolu ve import değişikliği
- `SecurityContext` objesi Faz 1'de altyapısı hazırlanır, Faz 8-9'da aktif kullanıma geçer
- Break-glass sistemi zaten silindiği için ilgili dead code bu planda yok
- Customer-search API fix'i (`ae5ec89c`) bu migration'dan bağımsız, zaten ana branch'de
