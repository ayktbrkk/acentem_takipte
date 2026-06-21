<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="reconciliationTotalCount"
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
      <ReconciliationWorkbenchMetricsPanel :t="t" :summary="reconciliationSummary" :format-money="formatMoney" :format-count="formatCount" />
    </template>

    <div v-if="operationError" class="qc-error-banner flex items-center justify-between gap-4" role="alert" aria-live="polite">
      <p class="qc-error-banner__text">{{ operationError }}</p>
      <ActionButton variant="secondary" size="sm" @click="reloadWorkbench">
        {{ t("retry") }}
      </ActionButton>
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
      :locale="activeLocale"
      :workbench-loading="workbenchLoading"
      :collection-preview-rows="collectionPreviewRows"
      :commission-preview-rows="commissionPreviewRows"
      :format-money="formatMoney"
    />

    <ReconciliationWorkbenchTableSection
      :t="t"
      :locale="activeLocale"
      :workbench-loading="workbenchLoading"
      :workbench-error-text="workbenchErrorText"
      :rows="rows"
      :reconciliation-list-columns="reconciliationListColumns"
      :reconciliation-list-rows="pagedReconciliationListRows"
      :page="listPagination.page"
      :shown-count="reconciliationShownCount"
      :total-count="reconciliationTotalCount"
      :has-next-page="reconciliationHasNextPage"
      :fetch-truncated="reconciliationFetchTruncated"
      @row-click="handleReconciliationRowClick"
      @retry="reloadWorkbench"
      @previous-page="listPagination.page -= 1"
      @next-page="listPagination.page += 1"
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
import { computed, reactive, unref, watch } from "vue";
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
import ActionButton from "../components/app-shell/ActionButton.vue";
import { RECONCILIATION_TRANSLATIONS } from "../config/reconciliation_translations";
import { translateText } from "../utils/i18n";
import { useAtFormatting } from "../composables/useAtFormatting";

const appPinia = getAppPinia();
const authStore = useAuthStore(appPinia);
const branchStore = useBranchStore(appPinia);
const accountingStore = useAccountingStore();
const route = useRoute();
const router = useRouter();
const activeLocale = computed(() => (String(unref(authStore.locale) || "en").toLowerCase().startsWith("tr") ? "tr" : "en"));
const { formatCount } = useAtFormatting(activeLocale);

function t(key) {
  const locale = unref(activeLocale) || "en";
  return RECONCILIATION_TRANSLATIONS[locale]?.[key] || RECONCILIATION_TRANSLATIONS.en[key] || translateText(key, locale);
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

const listPagination = reactive({ page: 1, pageLength: 20 });

watch(
  () => [filters.status, filters.mismatchType, filters.sourceQuery, filters.sourceDoctype, filters.limit],
  () => {
    listPagination.page = 1;
  },
);

const reconciliationTotalCount = computed(() => reconciliationListRows.value.length);
const pagedReconciliationListRows = computed(() => {
  const start = (listPagination.page - 1) * listPagination.pageLength;
  return reconciliationListRows.value.slice(start, start + listPagination.pageLength);
});
const reconciliationShownCount = computed(() => pagedReconciliationListRows.value.length);
const reconciliationHasNextPage = computed(
  () => listPagination.page * listPagination.pageLength < reconciliationListRows.value.length,
);
const reconciliationFetchTruncated = computed(() => rows.value.length >= Number(filters.limit || 100));
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>

