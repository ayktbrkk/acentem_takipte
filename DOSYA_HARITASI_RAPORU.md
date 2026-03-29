# Dosya Haritası ve Arşiv Raporu

Bu rapor, repodaki canlı uygulama yapısını ve bu çalışmada arşive taşınan gereksiz dosyaları özetler.

## 1. Kısa Özet

Bu repo, Frappe tabanlı bir sigorta operasyon platformudur.

- **Frontend:** Vue 3 + Vite + Vue Router + Pinia + frappe-ui
- **Backend:** Frappe/ERPNext Python uygulaması
- **Canlı SPA yolu:** `/at`
- **Giriş noktası:** `acentem_takipte/www/at.py`
- **Route tanımı:** `frontend/src/router/index.js`
- **Paylaşılan ana yapı:** page shell + composable + presentational component mimarisi

Bu repo üzerinde yapılan son temizlikte, canlı uygulamada kullanılmayan bazı eski görsel bileşenler ve bir kullanılmayan composable arşive taşındı.

---

## 2. Canlı Uygulamanın Mimari Akışı

```text
Kullanıcı -> /at route -> Frappe www/at.py -> Vite manifest asset includes
        -> frontend/src/main.js -> Vue Router
        -> Page shell
        -> Composable'lar
        -> UI component'ler
        -> API / backend service
        -> Frappe domain logic
        -> Response
        -> Page state / summary / table data
        -> Render
```

### Ana köprü dosyaları

- `acentem_takipte/www/at.py`
  - site için SPA asset'lerini latest Vite manifest'ten inject eder.
  - `ensure_site_asset_symlink()` ve `get_asset_includes()` kullanır.
- `acentem_takipte/hooks.py`
  - `website_route_rules` ile `/at` ve alt yollarını SPA'ya yönlendirir.
  - `after_migrate`, `on_session_creation`, `on_logout` hook'ları burada.
- `frontend/src/router/index.js`
  - tüm app route'larını tanımlar.
  - sayfaların çoğu lazy-loaded component olarak yüklenir.
- `frontend/src/App.vue`
  - shell layout + sidebar + topbar + route view sarmalı.

---

## 3. Frontend Dosya Haritası

### 3.1 `frontend/src/pages/`

Canlı uygulamanın route-level ekranları burada bulunur. Bu klasör, doğrudan sayfa shell'lerini içerir.

#### Ana iş alanları

- **Dashboard / genel görünüm**
  - `Dashboard.vue`
  - `Dashboard.test.js`
- **Satış ve portföy**
  - `LeadList.vue`, `LeadDetail.vue`
  - `OfferBoard.vue`, `OfferDetail.vue`
  - `PolicyList.vue`, `PolicyDetail.vue`
  - `CustomerList.vue`, `CustomerDetail.vue`
  - `CustomerSearchPage.vue`
- **Sigorta operasyonları**
  - `ClaimsBoard.vue`, `ClaimDetail.vue`
  - `PaymentsBoard.vue`, `PaymentDetail.vue`
  - `RenewalsBoard.vue`, `RenewalTaskDetail.vue`
  - `ReconciliationWorkbench.vue`, `ReconciliationDetail.vue`
  - `ReconciliationItemsList.vue`, `ReconciliationItemDetail.vue`
  - `ImportData.vue`, `ExportData.vue`
- **İletişim ve takip**
  - `CommunicationHub.vue`
  - `CommunicationCenter.vue` page shell'i `CommunicationHub.vue` tarafından kullanılır
  - `NotificationDraftsList.vue`, `NotificationDraftDetail.vue`
  - `SentNotificationsList.vue`, `SentNotificationDetail.vue`
  - `TasksList.vue`, `TaskDetail.vue`
- **Yönetim ve master data**
  - `CompaniesList.vue`, `CompanyDetail.vue`
  - `BranchesList.vue`, `BranchDetail.vue`
  - `SalesEntitiesList.vue`, `SalesEntityDetail.vue`
  - `NotificationTemplatesList.vue`, `NotificationTemplateEditor.vue`
  - `AccountingEntriesList.vue`, `AccountingEntryDetail.vue`
- **Raporlama**
  - `Reports.vue`
  - `AgentPerformanceReport.vue`
  - `ClaimRatioReport.vue`
  - `CustomerSegmentationReport.vue`
  - `PremiumReport.vue`
- **Kontrol / güvenlik**
  - `BreakGlassRequest.vue`
  - `BreakGlassApprovals.vue`
  - `AuxWorkbench.vue`
  - `AuxRecordDetail.vue`

### 3.2 `frontend/src/components/`

Bu klasör render sınırlarını taşır. Son refactor çizgisinde her büyük ekran kendi alt component grubuna ayrıldı.

#### Genel shell bileşenleri

- `Sidebar.vue` ve `components/sidebar/*`
- `Topbar.vue`
- `app-shell/*`
  - `ActionButton.vue`
  - `ActionToolbarGroup.vue`
  - `EmptyState.vue`
  - `FilterBar.vue`
  - `FilterPresetMenu.vue`
  - `QuickCreateDialogShell.vue`
  - `QuickCreateManagedDialog.vue`
  - `QuickCreateLauncher.vue`
  - `QuickCustomerPicker.vue`
  - `QuickCreateFormRenderer.vue`
  - `WorkbenchPageLayout.vue`
  - `WorkbenchFilterToolbar.vue`
  - `SectionPanel.vue`
  - `ListTable.vue`
  - `MiniFactList.vue`
  - `MetaListCard.vue`
  - `StatusBadge.vue`
  - `DetailTabsBar.vue`

#### Sayfa-özel component grupları

- `dashboard/*`
- `offer-board/*`
- `policy-list/*`
- `lead-list/*`
- `claims-board/*`
- `aux-workbench/*`
- `reports/*`
- `policy-form/*`
- `sidebar/*`

### 3.3 `frontend/src/composables/`

Davranış ve state buraya taşındı. Büyük dosyalar bu klasöre bölünerek sayfalar inceltildi.

#### Önemli gruplar

- **Dashboard**
  - formatters, orchestration, facts, preview data, summary, tab helpers, item actions, lead dialog
- **PolicyList**
  - filters, preset sync, runtime, table data, actions, quick policy
- **OfferBoard**
  - list state, runtime, resources, bootstrap, locale, navigation, conversion, drag/drop, quick offer
- **Reports**
  - filters, runtime, table data, row actions, view state
- **CommunicationCenter**
  - resources, runtime, operations
- **AuxWorkbench**
  - runtime, view model, presets
- **AuxRecordDetail**
  - runtime, summary, quick dialogs, actions
- **LeadList**
  - filters, runtime, table data, actions, navigation, quick lead
- **ReconciliationWorkbench**
  - runtime, filters, import, summary, actions
- **PaymentsBoard**
  - runtime, quick payment, actions, summary
- **PolicyDetail / OfferDetail / LeadDetail / PaymentDetail**
  - detay runtime ve shell helperları

### 3.4 `frontend/src/config/`

- `auxWorkbenchConfigs.js`
  - aux workbench route/config registry
- `quickCreateRegistry.js`
  - quick create form source registry
- `reportsConfig.js`
  - report katalogu ve view config

### 3.5 `frontend/src/utils/`

Saf helper ve dönüşüm katmanı.

Örnekler:

- `dashboardHelpers.js`
- `detailFormatters.js`
- `filterPresetState.js`
- `listExport.js`
- `quickCreateCopy.js`
- `quickRouteIntent.js`
- `relatedQuickCreate.js`
- `safeNavigation.js`
- `sourcePanel.js`
- `officeBranchTree.js`
- `customerIdentity.js`

### 3.6 `frontend/src/stores/` ve `frontend/src/state/`

- `stores/`
  - `auth.js`, `ui.js`, `dashboard.js`, `policy.js`, `claim.js`, `payment.js`, `renewal.js`, `branch.js`, `customer.js`, `communication.js`, `accounting.js`
- `state/`
  - `session.js`, `ui.js`

Bu katmanlar uygulama genelinde paylaşılan state ve kullanıcı oturumu yönetimini taşır.

---

## 4. Backend Dosya Haritası

### 4.1 `acentem_takipte/acentem_takipte/api/`

Bu klasör Frappe/REST API yüzeyini taşır.

Önemli modüller:

- `dashboard.py`
- `dashboard_v2/`
- `quick_create.py`
- `quick_payloads.py`
- `list_exports.py`
- `reports.py`
- `mutation_access.py`
- `security.py`
- `versioning.py`
- `communication.py`
- `branches.py`
- `customers.py`
- `accounting.py`
- `aux_edit_registry.py`
- `break_glass.py`
- `seed.py`

### 4.2 `acentem_takipte/acentem_takipte/services/`

Uygulamanın iş mantığı burada yoğunlaşır.

Örnekler:

- `customer_360.py`
- `quick_create_core.py`
- `quick_create_auxiliary.py`
- `quick_create_helpers.py`
- `quick_create_search.py`
- `break_glass.py`
- `sales_entities.py`
- `report_isolation.py`
- `cache_precomputation.py`
- `branch_permissions.py`
- `report_snapshots.py`

### 4.3 `acentem_takipte/acentem_takipte/doctype/`

Frappe doctypes ve permission/query hook'ları burada yer alır.

### 4.4 `acentem_takipte/acentem_takipte/www/`

- `at.py`
  - `/at` SPA giriş noktası
  - Vite manifest inject
- `at.html`
  - fallback/diagnostic yüzey

### 4.5 `acentem_takipte/acentem_takipte/utils/`

- `assets.py`
- diğer genel Python yardımcıları

---

## 5. Bu Temizlikte Arşive Taşınan Dosyalar

Bu dosyalar canlı app içinde referans almıyordu.  
Kontrol yöntemi:

- `frontend/src` ve repo genelinde referans araması
- router/import kontrolü
- page shell ve component kullanım doğrulaması

### 5.1 Taşınan frontend component'leri

| Kaynak | Arşiv yolu | Neden taşındı |
|---|---|---|
| `frontend/src/components/app-shell/AmountStatusRow.vue` | `silinecekler/frontend/src/components/app-shell/AmountStatusRow.vue` | Repo genelinde referansı yoktu; canlı app içinde kullanılmayan eski görsel satır bileşeni |
| `frontend/src/components/app-shell/DataTableShell.vue` | `silinecekler/frontend/src/components/app-shell/DataTableShell.vue` | Referans yok; `ListTable` ve sayfa-özel tablo shell'leri varken mükerrer kaldı |
| `frontend/src/components/app-shell/KpiMetricCard.vue` | `silinecekler/frontend/src/components/app-shell/KpiMetricCard.vue` | Referans yok; dashboard/panel metrikleri için yeni kartlar mevcut |
| `frontend/src/components/ui/DetailCard.vue` | `silinecekler/frontend/src/components/ui/DetailCard.vue` | Referans yok; detail ekranlarında kullanılan yeni panel/card yapıları bunu geçti |
| `frontend/src/components/ui/DistributionChart.vue` | `silinecekler/frontend/src/components/ui/DistributionChart.vue` | Referans yok; rapor ve dashboard tarafında Chart.js tabanlı aktif bileşenler kullanılıyor |
| `frontend/src/components/ui/MetricCard.vue` | `silinecekler/frontend/src/components/ui/MetricCard.vue` | Referans yok; yeni `DashboardStatCard` ve domain metric panelleri ile mükerrer |
| `frontend/src/components/ui/RenewalWidget.vue` | `silinecekler/frontend/src/components/ui/RenewalWidget.vue` | Referans yok; yenileme ekranı yeni board/panel mimarisine taşındı |
| `frontend/src/components/ui/TrendChart.vue` | `silinecekler/frontend/src/components/ui/TrendChart.vue` | Referans yok; aktif kullanımda başka chart bileşenleri var |

### 5.2 Taşınan composable

| Kaynak | Arşiv yolu | Neden taşındı |
|---|---|---|
| `frontend/src/composables/useBreakGlassApprovals.js` | `silinecekler/frontend/src/composables/useBreakGlassApprovals.js` | Repo genelinde referansı yoktu; `BreakGlassApprovals.vue` şu anda kendi yerel logic'iyle çalışıyor, bu composable canlı akışta kullanılmıyordu |

### 5.3 Taşınmayan ama incelenen dosyalar

Bu dosyalar tarandı ama arşive alınmadı:

- `frontend/src/pages/CommunicationCenter.vue`
  - doğrudan router'da görünmese de `CommunicationHub.vue` tarafından kullanılıyor
- `frontend/src/composables/useDashboard...` dosyaları
  - aktif dashboard mimarisinin parçası
- `frontend/src/composables/usePolicyList...` dosyaları
  - aktif policy list akışının parçası
- `frontend/src/composables/useOfferBoard...` dosyaları
  - aktif teklif panosu akışının parçası
- `acentem_takipte/acentem_takipte/api/dashboard_v2/*`
  - backend dashboard yolunun aktif alt yapısı

---

## 6. Neden Bu Dosyalar Arşive Taşındı?

Bu kararların ortak gerekçeleri:

1. **Hiç referans almıyorlardı**
   - repo genelinde import kullanımı bulunmadı.
2. **Aktif sayfa akışlarının parçası değillerdi**
   - router, page shell veya mevcut component zincirinde yer almıyorlardı.
3. **Mükerrer işlev taşıyorlardı**
   - bazıları yeni dashboard/panel/list bileşenlerinin eski karşılıklarıydı.
4. **Canlı uygulamayı etkilemiyorlardı**
   - build ve canlı smoke sırasında ihtiyaç duyulmayan yardımcılar oldukları görüldü.

Bu nedenle bunları silmek yerine `silinecekler/` altına taşımak:

- geçmişi korur,
- gerektiğinde geri alma imkanı verir,
- canlı app tree'sini temiz tutar.

---

## 7. Kalan Ana Canlı Yüzeyler

Canlı app için halen aktif ve önemli yüzeyler:

- `frontend/src/pages/Dashboard.vue`
- `frontend/src/pages/OfferBoard.vue`
- `frontend/src/pages/PolicyList.vue`
- `frontend/src/pages/PolicyDetail.vue`
- `frontend/src/pages/OfferDetail.vue`
- `frontend/src/pages/CommunicationCenter.vue` (CommunicationHub üzerinden)
- `frontend/src/pages/Reports.vue`
- `frontend/src/pages/ClaimsBoard.vue`
- `frontend/src/pages/PaymentsBoard.vue`
- `frontend/src/pages/RenewalsBoard.vue`
- `frontend/src/pages/ReconciliationWorkbench.vue`
- `frontend/src/pages/AuxWorkbench.vue`
- `frontend/src/pages/AuxRecordDetail.vue`

Bu yüzeyler artık büyük ölçüde composable/component sınırlarına ayrılmış durumda.

---

## 8. Bu Reponun Bakım Kuralı

İleride bir agent bu repo üzerinde çalışırken şu sıra izlenmeli:

1. `DOSYA_REFACTOR_REHBERI.md` okunmalı.
2. `BUYUK_EKRAN_REFACTOR_TAKIP.md` okunmalı.
3. Yeni iş için page/composable/component sınırı belirlenmeli.
4. Önce referansı olmayan veya eskimiş dosyalar taranmalı.
5. Yeni cleanup gerekiyorsa önce arşivle, sonra canlıyı doğrula.
6. Build / test / gerekiyorsa Playwright smoke çalıştır.
7. Değişiklikleri commit/push et.

---

## 9. Sonuç

Bu temizlikte:

- canlı app için kullanılmayan eski component'ler arşive taşındı,
- kullanılmayan bir composable arşive taşındı,
- repodaki ana mimari harita ve görev sınırları belgelendi.

`silinecekler/` klasörü artık sadece eski dump alanı değil, kontrollü arşiv alanı olarak kullanılmalıdır.

