# Büyük Ekran Refactor Takip Dosyası

> **Oluşturulma:** 2026-03-28  
> **Amaç:** Kalan büyük ekranların refactor önceliğini ve ilerleme durumunu tek yerde takip etmek  
> **Durumlar:** `Tamamlanmadı` → `Devam Ediyor` → `Tamamlandı`

---

## Nasıl Kullanılır

- Her satır bir büyük ekranı temsil eder.
- `Durum` sütununda ekranın mevcut hali takip edilir.
- `Yapılacak İş` sütunu, bir sonraki somut refactor adımını tanımlar.
- `Kabul Kriteri`, ekranın refactor açısından ne zaman “tamam” sayılacağını söyler.
- `Test Kriteri`, işin doğrulanması için çalıştırılacak minimum komutları listeler.

---

## Öncelik Sırası

| Öncelik | Ekran | Durum | Mevcut Hal | Yapılacak İş | Kabul Kriteri | Test Kriteri |
|---------|-------|-------|------------|--------------|---------------|--------------|
| 1 | `OfferBoard.vue` | `Tamamlandı` | Action bar, metrics, filter, list, pipeline, quick offer ve convert component'leri ayrıldı; liste preset/refresh/export, navigation, locale, resource/state, bootstrap, drag/drop ve liste state boundary'leri composable'lara taşındı; page dosyası shell seviyesine indi | - | Filter, conversion, route intent, dialog ve board render parçaları ayrı composable/component sınırlarında olur; page dosyası shell seviyesine indi | `npm run build` |
| 2 | `CommunicationCenter.vue` | `Devam Ediyor` | State + campaign/segment/outbox akışları parçalanmaya başladı | Kalan state/view helperlarını ve UI bloklarını ayır; orchestration katmanını sadeleştir | Route/filter/snapshot orchestration composable'larda; campaign/segment/outbox alanları component'lerde olur | `npm run test:unit -- --run src/pages/CommunicationCenter.test.js` + `npm run build` |
| 3 | `AuxRecordDetail.vue` | `Tamamlandı` | Runtime / summary / actions / quick-dialog split tamamlandı | Sayfa shell'i dışında iş mantığı bırakılmadı | `npm run test:unit -- --run src/pages/AuxRecordDetail.test.js src/composables/useAuxRecordDetailQuickDialogs.test.js` + `npm run build` |
| 4 | `PolicyList.vue` | `Tamamlandı` | Action bar, metrics, filtre, tablo, quick-policy, runtime, table data ve actions composable/component'lerine ayrıldı; page shell seviyesine indi | - | Policy list ekranı action bar, filtre, tablo ve quick-policy boundary'leriyle ayrışmış olur | `npm run test:unit -- --run src/pages/PolicyList.test.js` + `npm run build` |
| 5 | `PolicyDetail.vue` | `Tamamlandı` | Runtime / summary / quick-dialog / UI split tamamlandı | - | Detay ekranı veri hazırlama, aksiyonlar ve sunum component'leriyle ayrılır | `npm run test:unit -- --run src/pages/PolicyDetail.test.js` + `npm run build` |
| 6 | `OfferDetail.vue` | `Tamamlandı` | Runtime ve UI split tamamlandı | - | Offer detail sayfası shell + helper/composable ayrımına sahip olur | Mevcut detay smoke testi + `npm run build` |
| 7 | `ReconciliationWorkbench.vue` | `Tamamlandı` | Action bar, metrics, filtre, import, preview, tablo ve action dialog component'lere ayrıldı; runtime/filter/import/summary/actions split tamamlandı | - | Filtre, import, bulk action ve export akışları composable'da; UI parçaları component'lerde olur | `npm run test:unit -- --run src/pages/ReconciliationWorkbench.test.js` + `npm run build` |
| 8 | `PaymentsBoard.vue` | `Tamamlandı` | Runtime split, quick payment ve board sections tamamlandı | - | Filtre/preset/liste/export akışları shell'den ayrılmış olur | `npm run test:unit -- --run src/pages/PaymentsBoard.test.js` + `npm run build` |
| 9 | `ImportData.vue` | `Tamamlandı` | Runtime ve step panelleri ayrıldı | Page shell yükleme/submit ile sınırlı kaldı | Import mapping, validation ve row handling blokları composable/component'lere ayrılmış olur | `npm run test:unit -- --run src/composables/useImportDataRuntime.test.js src/pages/ImportExport.test.js` + `npm run build` |
| 10 | `BreakGlassApprovals.vue` | `Tamamlandı` | Approval list / action akışları composable'a ve ayrı panel component'lerine taşındı; page shell seviyesine indi | - | Onay akışları ayrı boundary'lere taşınmış olur | `npm run test:unit -- --run src/pages/BreakGlassApprovals.test.js` + `npm run build` |
| 11 | `BreakGlassRequest.vue` | `Tamamlandı` | Runtime ve panel split tamamlandı | Request form ve status akışları ayrıldı | İstek oluşturma, izleme ve yanıt parçaları ayrışır | `npm run test:unit -- --run src/composables/useBreakGlassRequest.test.js src/pages/BreakGlassRequest.test.js` + `npm run build` |
| 12 | `ExportData.vue` | `Tamamlandı` | Runtime ve panel split tamamlandı | Export query, preset ve download helperları ayrıldı | Export ekranı shell seviyesine iner | `npm run test:unit -- --run src/composables/useExportDataRuntime.test.js src/pages/ImportExport.test.js` + `npm run build` |

---

## Tamamlanan Büyük Ekranlar

Bu ekranlar için ana refactor işi tamamlandı ve artık öncelikli backlog'ta değiller:

- `Dashboard.vue`
- `OfferBoard.vue`
- `Reports.vue`
- `LeadList.vue`
- `ClaimsBoard.vue`
- `AuxWorkbench.vue`
- `CustomerDetail.vue`
- `CustomerList.vue`
- `LeadDetail.vue`
- `PaymentDetail.vue`
- `RenewalsBoard.vue`
- `PolicyList.vue`
- `ReconciliationWorkbench.vue`
- `CommunicationCenter.vue`
- `PolicyDetail.vue`
- `OfferDetail.vue`
- `PaymentsBoard.vue`
- `ImportData.vue`
- `BreakGlassApprovals.vue`
- `BreakGlassRequest.vue`
- `ExportData.vue`

---

## Büyük Component Backlog'u

Bu bölüm sayfa değil, ama büyük ve bölünebilir component'leri izlemek için eklendi:

| Öncelik | Component | Durum | Yapılacak İş | Kabul Kriteri | Test Kriteri |
|---------|-----------|-------|--------------|---------------|--------------|
| 1 | `PolicyForm.vue` | `Tamamlandı` | Runtime composable ve step component'leri ayrıldı | Form alanları küçük subcomponent'lerle yönetilir | `src/components/PolicyForm.test.js` + `npm run build` |
| 2 | `ScheduledReportsManager.vue` | `Tamamlanmadı` | Schedule-specific filter/action bloklarını böl | Schedule akışları shared config ile sadeleşir | `src/components/reports/ScheduledReportsManager.test.js` + build |
| 3 | `OfficeBranchSelect.vue` | `Tamamlandı` | Branch list/scope helperları composable'a taşındı; component shell seviyesine yaklaştı | Seçici bileşen shell + data helper sınırına iner | `src/components/app-shell/OfficeBranchSelect.test.js` + `npm run build` |
| 4 | `QuickCreateFormRenderer.vue` | `Tamamlandı` | Field renderer logic'i composable'a taşındı; component shell seviyesine indi | Form renderer daha küçük field-type bileşenlerine bölünür | `src/components/app-shell/QuickCreateFormRenderer.test.js` + `npm run build` |
| 5 | `QuickCustomerPicker.vue` | `Tamamlanmadı` | Picker UI ve option mapping'i sadeleştir | Seçici bileşen temiz boundary'lere sahip olur | İlgili quick-create testleri + build |
| 6 | `Sidebar.vue` | `Tamamlanmadı` | Menü/section render bloklarını sadeleştir | Sidebar daha küçük sunum bileşenlerine ayrılır | Layout smoke + build |

---

## Not

- Bir ekranın `Tamamlandı` sayılması için hem davranış hem de build/test doğrulaması geçmiş olmalı.
- `Devam Ediyor` olanlar için yeni bir split yapıldığında bu dosyada bir sonraki somut adım güncellenecek.
- `Tamamlanmadı` olanlar için henüz anlamlı bir split başlamamış ya da sadece yardımcı parçalar çıkarılmış olabilir.
