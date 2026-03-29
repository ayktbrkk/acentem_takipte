<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="rows.length"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <ReconciliationWorkbenchActionBar
        :t="t"
        :syncing="syncing"
        :reconciling="reconciling"
        :bulk-action-loading="bulkActionLoading"
        :open-row-count="openRowCount"
        :workbench-loading="workbenchLoading"
        @open-import="openImportDialog"
        @bulk-resolve="runBulkResolution('Matched')"
        @bulk-ignore="runBulkResolution('Ignored')"
        @sync="runSync"
        @reconcile="runReconciliation"
        @refresh="reloadWorkbench"
        @export-xlsx="downloadReconciliationExport('xlsx')"
        @export-pdf="downloadReconciliationExport('pdf')"
      />
    </template>

    <template #metrics>
      <ReconciliationWorkbenchMetricsPanel :t="t" :summary="reconciliationSummary" :format-money="formatMoney" />
    </template>

    <div v-if="operationError" class="qc-error-banner" role="alert" aria-live="polite">
      <p class="qc-error-banner__text">{{ operationError }}</p>
    </div>

    <ReconciliationWorkbenchFilterSection
      v-model="presetKey"
      :t="t"
      :filters="filters"
      :preset-options="presetOptions"
      :can-delete-preset="canDeletePreset"
      :active-filter-count="activeFilterCount"
      :mismatch-options="mismatchOptions"
      :source-doctype-options="sourceDoctypeOptions"
      @preset-change="onPresetChange"
      @preset-save="savePreset"
      @preset-delete="deletePreset"
      @apply="applyWorkbenchFilters"
      @reset="resetWorkbenchFilters"
    />

    <ReconciliationWorkbenchImportDialog
      v-model:show="showImportDialog"
      v-model:csv="statementImportCsv"
      v-model:insurance-company="statementImportInsuranceCompany"
      v-model:delimiter="statementImportDelimiter"
      v-model:limit="statementImportLimit"
      :t="t"
      :loading="importLoading"
      :error="importError"
      :eyebrow="importDialogEyebrow"
      :labels="importDialogLabels"
      :summary="statementImportSummary"
      :rows="statementImportRows"
      :format-money="formatMoney"
      @close="closeImportDialog"
      @preview="previewStatementImport"
      @import="importStatementPreviewRows"
    />

    <ReconciliationWorkbenchPreviewSections
      :t="t"
      :workbench-loading="workbenchLoading"
      :collection-preview-rows="collectionPreviewRows"
      :commission-preview-rows="commissionPreviewRows"
      :format-money="formatMoney"
    />

    <ReconciliationWorkbenchTableSection
      :t="t"
      :workbench-loading="workbenchLoading"
      :workbench-error-text="workbenchErrorText"
      :rows="rows"
      :reconciliation-list-columns="reconciliationListColumns"
      :reconciliation-list-rows="reconciliationListRows"
      @row-click="handleReconciliationRowClick"
    />

    <ReconciliationWorkbenchActionDialog
      v-model:show="showActionDialog"
      v-model:notes="actionDialogNotes"
      :t="t"
      :action-dialog-eyebrow="actionDialogEyebrow"
      :action-dialog-labels="actionDialogLabels"
      :action-dialog-row="actionDialogRow"
      :action-dialog-loading="actionDialogLoading"
      :action-dialog-error="actionDialogError"
      :reconciliation-action-dialog-title="reconciliationActionDialogTitle"
      :reconciliation-action-dialog-subtitle="reconciliationActionDialogSubtitle"
      :format-money="formatMoney"
      @close="closeReconciliationActionDialog"
      @save="submitReconciliationActionDialog"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { unref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getAppPinia } from "../pinia";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useAccountingStore } from "../stores/accounting";
import { useReconciliationWorkbenchRuntime } from "../composables/useReconciliationWorkbenchRuntime";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import ReconciliationWorkbenchActionBar from "../components/reconciliation-workbench/ReconciliationWorkbenchActionBar.vue";
import ReconciliationWorkbenchActionDialog from "../components/reconciliation-workbench/ReconciliationWorkbenchActionDialog.vue";
import ReconciliationWorkbenchFilterSection from "../components/reconciliation-workbench/ReconciliationWorkbenchFilterSection.vue";
import ReconciliationWorkbenchImportDialog from "../components/reconciliation-workbench/ReconciliationWorkbenchImportDialog.vue";
import ReconciliationWorkbenchMetricsPanel from "../components/reconciliation-workbench/ReconciliationWorkbenchMetricsPanel.vue";
import ReconciliationWorkbenchPreviewSections from "../components/reconciliation-workbench/ReconciliationWorkbenchPreviewSections.vue";
import ReconciliationWorkbenchTableSection from "../components/reconciliation-workbench/ReconciliationWorkbenchTableSection.vue";

const copy = {
  tr: {
    breadcrumb: "Kontrol Merkezi → Mutabakat",
    title: "Mutabakat Masası",
    subtitle: "Muhasebe uyumsuzluklarını izleyin, eşleştirin ve kapatın",
    recordCount: "kayıt",
    summaryTotal: "Toplam Kayıt",
    summaryMatched: "Eşleşti",
    summaryPending: "Beklemede",
    summaryMismatch: "Uyumsuzluk",
    summaryDifference: "Toplam Tutar Farkı",
    importStatement: "Ekstre İçe Aktar",
    importStatementTitle: "Ekstre İçe Aktarma Önizlemesi",
    importStatementSubtitle: "CSV içeriğini yapıştır, poliçe veya ödeme eşleşmelerini önizle.",
    importStatementPlaceholder: "external_ref,policy_no,payment_no,customer,amount_try",
    importStatementRows: "Eşleşenleri İçe Aktar",
    importingStatement: "İçe Aktarılıyor...",
    importTotalRows: "Toplam Satır",
    importMatchedRows: "Eşleşen",
    importUnmatchedRows: "Eşleşmeyen",
    importAmount: "Toplam Tutar",
    insuranceCompany: "Sigorta Şirketi",
    delimiter: "Ayıraç",
    policy: "Poliçe",
    payment: "Ödeme",
    sync: "Sync Çalıştır",
    syncing: "Sync...",
    bulkResolve: "Açıkları Toplu Çöz",
    bulkResolving: "Toplu Çözülüyor...",
    bulkIgnore: "Açıkları Toplu Yoksay",
    bulkIgnoring: "Toplu Yoksayılıyor...",
    bulkResolveConfirm: "Görünen açık mutabakat kayıtları çözülmüş olarak işaretlensin mi?",
    bulkIgnoreConfirm: "Görünen açık mutabakat kayıtları yoksayılsın mı?",
    reconcile: "Mutabakat Çalıştır",
    reconciling: "Çalışıyor...",
    refresh: "Yenile",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    statusOpen: "Açık",
    statusResolved: "Çözüldü",
    statusIgnored: "Yoksayıldı",
    allStatuses: "Tüm durumlar",
    allTypes: "Tüm uyumsuzluk tipleri",
    filtersTitle: "Filtreler",
    advancedFilters: "Gelişmiş Filtreler",
    hideAdvancedFilters: "Gelişmiş Filtreleri Gizle",
    activeFilters: "aktif filtre",
    presetLabel: "Filtre Şablonu",
    presetDefault: "Standart",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    savePresetPrompt: "Filtre şablonu adı",
    deletePresetConfirm: "Seçili özel filtre şablonu silinsin mi?",
    applyFilters: "Uygula",
    clearFilters: "Filtreleri Temizle",
    sourceSearchPlaceholder: "Kaynak kayıt / ref ara",
    allSources: "Tüm kaynak tipleri",
    metricOpen: "Açık Fark",
    metricResolved: "Çözülen",
    metricIgnored: "Yoksayılan",
    metricFailed: "Başarısız Kayıt",
    metricOverdueCollections: "Geciken Tahsilat",
    metricOverdueAmount: "Geciken Tutar",
    metricCommissionAccrual: "Komisyon Tahakkuk",
    metricCommissionAccrualAmount: "Tahakkuk Tutarı",
    collectionPreviewTitle: "Geciken Tahsilat Önizleme",
    emptyCollectionPreview: "Geciken tahsilat kaydı bulunamadı.",
    commissionPreviewTitle: "Komisyon Tahakkuk Önizleme",
    reconciliationListTitle: "Mutabakat Listesi",
    emptyCommissionPreview: "Komisyon tahakkuk kaydı bulunamadı.",
    loading: "Yükleniyor...",
    loadErrorTitle: "Mutabakat Verileri Yüklenemedi",
    loadError: "Mutabakat masası verileri yüklenirken bir hata oluştu.",
    permissionDeniedRead: "Mutabakat verilerini görmek için yetkiniz yok.",
    permissionDeniedAction: "Bu mutabakat işlemini yapmaya yetkiniz yok.",
    emptyTitle: "Mutabakat Kaydı Yok",
    empty: "Gösterilecek mutabakat kaydı bulunamadı.",
    source: "Kaynak",
    type: "Uyumsuzluk",
    status: "Durum",
    dueDate: "Vade",
    localTry: "Yerel TRY",
    externalTry: "Harici TRY",
    difference: "Fark",
    accountingEntry: "Muhasebe Kaydı",
    resolution: "Çözüm",
    actions: "Aksiyon",
    resolve: "Çöz",
    ignore: "Yoksay",
    addNote: "Açıklama",
    open: "Aç",
    noteLabel: "Açıklama",
    notePlaceholder: "Mutabakat notu / açıklama girin",
    currentNote: "Mevcut Not",
    actionNoteTitle: "Mutabakat Açıklaması",
    actionResolveTitle: "Mutabakat Çöz",
    actionIgnoreTitle: "Mutabakat Yoksay",
    actionNoteSubtitle: "Kayıt için açıklama notu güncelle",
    actionResolveSubtitle: "Kaydı not ile birlikte çözülmüş olarak işaretle",
    actionIgnoreSubtitle: "Kaydı not ile birlikte yoksayılmış olarak işaretle",
    actionSaveNote: "Açıklamayı Kaydet",
    actionSaveResolve: "Çöz ve Kaydet",
    actionSaveIgnore: "Yoksay ve Kaydet",
    actionFailed: "Mutabakat aksiyonu tamamlanamadı.",
    openPanel: "Panel",
    openPolicyPanel: "Poliçeyi Aç",
    openCustomerPanel: "Müşteriyi Aç",
    openOffersPanel: "Teklif Panosu",
    openClaimsPanel: "Hasar Panosu",
    openPaymentsPanel: "Ödeme Panosu",
    openRenewalsPanel: "Yenileme Panosu",
    openReconciliationPanel: "Mutabakat Panosu",
    openCommunicationPanel: "İletişim Kaydı",
    openMasterDataPanel: "Ana Veri Kaydı",
    externalRef: "Harici Ref",
    mismatchAmount: "Tutar",
    mismatchCurrency: "Para Birimi",
    mismatchMissingExternal: "Harici Kayıt Eksik",
    mismatchMissingLocal: "Yerel Kayıt Eksik",
    mismatchStatus: "Durum Uyumsuzluğu",
    mismatchOther: "Diğer",
  },
  en: {
    breadcrumb: "Control Center → Reconciliation",
    title: "Reconciliation Workbench",
    subtitle: "Track, match and close accounting mismatches",
    recordCount: "records",
    summaryTotal: "Total Records",
    summaryMatched: "Matched",
    summaryPending: "Pending",
    summaryMismatch: "Mismatch",
    summaryDifference: "Total Difference",
    importStatement: "Import Statement",
    importStatementTitle: "Statement Import Preview",
    importStatementSubtitle: "Paste CSV content and preview policy or payment matches.",
    importStatementPlaceholder: "external_ref,policy_no,payment_no,customer,amount_try",
    importStatementRows: "Import Matched Rows",
    importingStatement: "Importing...",
    importTotalRows: "Total Rows",
    importMatchedRows: "Matched",
    importUnmatchedRows: "Unmatched",
    importAmount: "Total Amount",
    insuranceCompany: "Insurance Company",
    delimiter: "Delimiter",
    policy: "Policy",
    payment: "Payment",
    sync: "Run Sync",
    syncing: "Syncing...",
    bulkResolve: "Resolve Visible Open Items",
    bulkResolving: "Resolving...",
    bulkIgnore: "Ignore Visible Open Items",
    bulkIgnoring: "Ignoring...",
    bulkResolveConfirm: "Mark visible open reconciliation rows as resolved?",
    bulkIgnoreConfirm: "Ignore visible open reconciliation rows?",
    reconcile: "Run Reconciliation",
    reconciling: "Running...",
    refresh: "Refresh",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    statusOpen: "Open",
    statusResolved: "Resolved",
    statusIgnored: "Ignored",
    allStatuses: "All statuses",
    allTypes: "All mismatch types",
    filtersTitle: "Filters",
    advancedFilters: "Advanced Filters",
    hideAdvancedFilters: "Hide Advanced Filters",
    activeFilters: "active filters",
    presetLabel: "Filter Preset",
    presetDefault: "Standard",
    savePreset: "Save",
    deletePreset: "Delete",
    savePresetPrompt: "Filter preset name",
    deletePresetConfirm: "Delete selected custom filter preset?",
    applyFilters: "Apply",
    clearFilters: "Clear Filters",
    sourceSearchPlaceholder: "Search source record / external ref",
    allSources: "All source types",
    metricOpen: "Open Items",
    metricResolved: "Resolved",
    metricIgnored: "Ignored",
    metricFailed: "Failed Entries",
    metricOverdueCollections: "Overdue Collections",
    metricOverdueAmount: "Overdue Amount",
    metricCommissionAccrual: "Commission Accruals",
    metricCommissionAccrualAmount: "Accrual Amount",
    collectionPreviewTitle: "Overdue Collection Preview",
    emptyCollectionPreview: "No overdue collection found.",
    commissionPreviewTitle: "Commission Accrual Preview",
    reconciliationListTitle: "Reconciliation List",
    emptyCommissionPreview: "No commission accrual found.",
    loading: "Loading...",
    loadErrorTitle: "Failed to Load Reconciliation Data",
    loadError: "An error occurred while loading reconciliation workbench data.",
    permissionDeniedRead: "You do not have permission to view reconciliation data.",
    permissionDeniedAction: "You do not have permission to perform this reconciliation action.",
    emptyTitle: "No Reconciliation Rows",
    empty: "No reconciliation rows found.",
    source: "Source",
    type: "Mismatch",
    status: "Status",
    dueDate: "Due Date",
    localTry: "Local TRY",
    externalTry: "External TRY",
    difference: "Difference",
    accountingEntry: "Accounting Entry",
    resolution: "Resolution",
    actions: "Actions",
    resolve: "Resolve",
    ignore: "Ignore",
    addNote: "Note",
    open: "Open",
    noteLabel: "Note",
    notePlaceholder: "Enter reconciliation note / comment",
    currentNote: "Current Note",
    actionNoteTitle: "Reconciliation Note",
    actionResolveTitle: "Resolve Reconciliation Item",
    actionIgnoreTitle: "Ignore Reconciliation Item",
    actionNoteSubtitle: "Update a note for this reconciliation row",
    actionResolveSubtitle: "Resolve this row and save an optional note",
    actionIgnoreSubtitle: "Ignore this row and save an optional note",
    actionSaveNote: "Save Note",
    actionSaveResolve: "Resolve & Save",
    actionSaveIgnore: "Ignore & Save",
    actionFailed: "Reconciliation action could not be completed.",
    openPanel: "Open Panel",
    openPolicyPanel: "Open Policy",
    openCustomerPanel: "Open Customer",
    openOffersPanel: "Open Offers Board",
    openClaimsPanel: "Open Claims Board",
    openPaymentsPanel: "Open Payments Board",
    openRenewalsPanel: "Open Renewals Board",
    openReconciliationPanel: "Open Reconciliation",
    openCommunicationPanel: "Communication Record",
    openMasterDataPanel: "Master Data Record",
    externalRef: "External Ref",
    mismatchAmount: "Amount",
    mismatchCurrency: "Currency",
    mismatchMissingExternal: "Missing External",
    mismatchMissingLocal: "Missing Local",
    mismatchStatus: "Status",
    mismatchOther: "Other",
  },
};
const appPinia = getAppPinia();
const authStore = useAuthStore(appPinia);
const branchStore = useBranchStore(appPinia);
const accountingStore = useAccountingStore();
const route = useRoute();
const router = useRouter();

function t(key) {
  const locale = unref(authStore.locale) || "en";
  return copy[locale]?.[key] || copy.en[key] || key;
}
const reconciliationRuntime = useReconciliationWorkbenchRuntime({
  t,
  route,
  router,
  authStore,
  branchStore,
  accountingStore,
});
const {
  importDialogEyebrow,
  actionDialogEyebrow,
  filters,
  presetKey,
  presetOptions,
  canDeletePreset,
  activeFilterCount,
  sourceDoctypeOptions,
  rows,
  openRowCount,
  metrics,
  collectionPreviewRows,
  commissionPreviewRows,
  statementImportRows,
  statementImportSummary,
  syncing,
  reconciling,
  operationError,
  bulkActionLoading,
  showImportDialog,
  importLoading,
  importError,
  statementImportCsv,
  statementImportInsuranceCompany,
  statementImportDelimiter,
  statementImportLimit,
  statementImportPreview,
  workbenchLoading,
  workbenchErrorText,
  mismatchOptions,
  reconciliationSummary,
  reconciliationListColumns,
  reconciliationListRows,
  showActionDialog,
  actionDialogMode,
  actionDialogRow,
  actionDialogNotes,
  actionDialogLoading,
  actionDialogError,
  actionDialogLabels,
  reconciliationActionDialogTitle,
  reconciliationActionDialogSubtitle,
  importDialogLabels,
  reloadWorkbench,
  downloadReconciliationExport,
  applyWorkbenchFilters,
  resetWorkbenchFilters,
  runSync,
  runReconciliation,
  runBulkResolution,
  openImportDialog,
  closeImportDialog,
  previewStatementImport,
  importStatementPreviewRows,
  resolveRow,
  openReconciliationActionDialog,
  closeReconciliationActionDialog,
  submitReconciliationActionDialog,
  handleReconciliationRowClick,
  openReconciliationDetail,
  applyPreset,
  onPresetChange,
  savePreset,
  deletePreset,
  persistPresetStateToServer,
  hydratePresetStateFromServer,
  formatMoney,
  sourceRowFacts,
  mismatchTypeFacts,
  sourcePanelLabel,
  canOpenSourcePanel,
  openSourcePanel,
  normalizeReconciliationStatus,
  deriveReconciliationPeriod,
  buildReconciliationRowActions,
} = reconciliationRuntime;
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>

