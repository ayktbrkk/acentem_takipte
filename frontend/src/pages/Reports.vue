<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="summaryItems.length ? `${sortedRows.length}` : '0'"
    :record-count-label="t('record_count')"
  >
    <template #actions>
      <ActionButton variant="secondary" size="sm" @click="focusFilters">
        {{ t("focus_filters") }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" :loading="loading || exportLoading" @click="downloadReport('xlsx')">
        {{ t("export_xlsx") }}
      </ActionButton>
      <ActionButton variant="primary" size="sm" :loading="loading || exportLoading" @click="downloadReport('pdf')">
        {{ t("export_pdf") }}
      </ActionButton>
    </template>

    <template #metrics>
      <div v-if="loading && !heroSummaryCells.length" class="w-full grid grid-cols-1 gap-4 md:grid-cols-4">
        <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
      </div>
      <div v-else class="w-full grid grid-cols-1 gap-4 md:grid-cols-4">
        <div
          v-for="item in heroSummaryCells"
          :key="item.label"
          class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center transition-all hover:shadow-md"
        >
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{{ item.label }}</p>
          <p class="text-2xl font-black text-slate-900" :class="item.valueClass">{{ item.value }}</p>
        </div>
      </div>
    </template>

    <ReportsFilterSection
      ref="filtersSectionRef"
      :filters="filters"
      :t="t"
      :report-options="reportOptions"
      :active-preset="activePreset"
      :date-presets="datePresets"
      :reports-advanced-open="reportsAdvancedOpen"
      :active-filter-count="activeFilterCount"
      :branch-scope-label="branchScopeLabel"
      :loading="loading"
      :preset-model-value="presetModelValue"
      :preset-options-list="presetOptionsList"
      :can-delete-preset-flag="canDeletePresetFlag"
      :visible-advanced-filters="visibleAdvancedFilters"
      :get-advanced-filter-options="getAdvancedFilterOptions"
      :columns-summary-label="columnsSummaryLabel"
      @toggle-advanced="reportsAdvancedOpen = !reportsAdvancedOpen"
      @refresh="loadReport"
      @apply-filters="loadReport"
      @clear-filters="resetFilters"
      @apply-date-preset="applyDatePreset"
      @preset-change="onPresetChange"
      @preset-save="savePreset"
      @preset-delete="deletePreset"
      @update:preset-key="presetKey = $event"
      @enqueue-export="enqueueBackgroundExport"
    />

    <ReportsChartSection
      :rows="sortedRows"
      :report-key="filters.reportKey"
      :report-catalog="reportCatalog"
      :filters="filters"
      :t="t"
      :locale="activeLocale"
    />

    <ReportsTableSection
      :active-report-label="activeReportLabel"
      :branch-scope-label="branchScopeLabel"
      :columns-summary-label="columnsSummaryLabel"
      :columns="columns"
      :visible-columns="visibleColumns"
      :sorted-rows="sortedRows"
      :loading="loading"
      :error="error"
      :export-loading="exportLoading"
      :is-column-visible="isColumnVisible"
      :on-toggle-column="toggleColumn"
      :on-show-all-columns="showAllColumns"
      :get-column-label="getColumnLabel"
      :on-toggle-sort="toggleSort"
      :get-sort-indicator="getSortIndicator"
      :format-cell-value="formatCellValue"
      :is-row-clickable="isRowClickable"
      :on-row-click="onRowClick"
      :t="t"
      :group-by-column="groupByColumn"
      :groupable-columns="groupableColumns"
      @on-preview-click="openPreview"
      @on-group-by-change="toggleGroupBy"
    />

    <ReportsComparisonSection
      v-if="comparisonSummaryItems.length"
      :title="t('comparison_summary_title')"
      :meta="t('comparison_summary_hint')"
      :comparison-summary-items="comparisonSummaryItems"
      :format-comparison-delta="formatComparisonDelta"
    />

    <ReportsScheduledSection
      :t="t"
      :can-manage-scheduled-reports="canManageScheduledReports"
      :scheduled-reports="scheduledReports"
      :scheduled-loading="scheduledLoading"
      :scheduled-run-loading="scheduledRunLoading"
      :snapshot-run-loading="snapshotRunLoading"
      :active-locale="activeLocale"
      :report-catalog="reportCatalog"
      :active-office-branch="branchStore.requestBranch"
      @run="runScheduledReports"
      @save="saveScheduledReport"
      @remove="removeScheduledReport"
      @run-segment-snapshots="runCustomerSegmentSnapshots"
    />
  </WorkbenchPageLayout>

  <!-- Side Panel for Record Previews -->
  <SidePanel
    :show="showPreview"
    :title="previewTitle"
    :subtitle="previewSubtitle"
    @close="closePreview"
  >
    <RecordPreviewer
      v-if="previewTarget"
      :doctype="previewTarget.doctype"
      :name="previewTarget.name"
    />
  </SidePanel>
</template>

<script setup>
import { computed, onMounted, reactive, ref, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { translateText } from "../utils/i18n";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import SkeletonLoader from "../components/ui/SkeletonLoader.vue";
import SidePanel from "../components/ui/SidePanel.vue";
import RecordPreviewer from "../components/ui/RecordPreviewer.vue";
import ReportsFilterSection from "../components/reports/ReportsFilterSection.vue";
import ReportsComparisonSection from "../components/reports/ReportsComparisonSection.vue";
import ReportsTableSection from "../components/reports/ReportsTableSection.vue";
import ReportsChartSection from "../components/reports/ReportsChartSection.vue";
import ReportsScheduledSection from "../components/reports/ReportsScheduledSection.vue";
import { reportCatalog } from "../composables/reportsConfig";
import { useReportsFilters } from "../composables/useReportsFilters";
import { useReportsRuntime } from "../composables/useReportsRuntime";
import { useReportsTableData } from "../composables/useReportsTableData";
import { useReportsRowActions } from "../composables/useReportsRowActions";
import { useReportsViewState } from "../composables/useReportsViewState";
import { getAppPinia } from "../pinia";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";

const props = defineProps({
  initialReportKey: { type: String, default: "policy_list" },
});

const appPinia = getAppPinia();
const authStore = useAuthStore(appPinia);
const branchStore = useBranchStore(appPinia);
const route = useRoute();
const router = useRouter();

const filtersSectionRef = ref(null);
const showPreview = ref(false);
const previewTarget = ref(null);
const previewTitle = ref("");
const previewSubtitle = ref("");

// Refs that need to be shared between multiple composables
const rows = ref([]);
const columns = ref([]);
const comparisonRows = ref([]);
const visibleColumnKeys = ref([]);
const pendingVisibleColumnKeys = ref([]);
const groupByColumn = ref("");
const sortState = reactive({ column: "", direction: "" });

const activeLocale = computed(() => unref(authStore.locale) || "tr");
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));

function t(key) {
  return translateText(key, activeLocale);
}

const reportFilterComposables = useReportsFilters({
  props,
  t,
  activeLocale,
  localeCode,
  route,
  router,
  authStore,
  branchStore,
  refresh: () => loadReport(),
  visibleColumnKeys,
  groupByColumn,
});

const {
  filters,
  reportsAdvancedOpen,
  activePreset,
  reportOptions,
  activeReportLabel,
  branchScopeLabel,
  visibleFilters,
  canManageScheduledReports: filterCanManage,
  activeFilterCount,
  datePresets,
  visibleAdvancedFilters,
  buildFiltersPayload,
  buildPreviousPeriodFiltersPayload,
  clearHiddenFilters,
  syncReportKeyFromRoute,
  persistReportKeyToRoute,
  resetFilters,
  applyDatePreset,
  isActivePresetRange,
  getAdvancedFilterOptions,
  presetKey,
  onPresetChange,
  savePreset,
  deletePreset,
  presetModelValue,
  presetOptionsList,
  canDeletePresetFlag,
} = reportFilterComposables;

const reportTableData = useReportsTableData({
  filters,
  rows,
  columns,
  comparisonRows,
  activeLocale,
  localeCode,
  branchScopeLabel,
  t,
  visibleColumnKeys,
  pendingVisibleColumnKeys,
  groupByColumn,
  sortState,
});

const {
  visibleColumns,
  columnsSummaryLabel,
  heroSummaryCells,
  summaryItems,
  comparisonSummaryItems,
  sortedRows,
  groupableColumns,
  toggleGroupBy,
  getColumnLabel,
  formatCellValue,
  isColumnVisible,
  toggleColumn,
  showAllColumns,
  toggleSort,
  getSortIndicator,
  formatComparisonDelta,
} = reportTableData;

const reportsRuntime = useReportsRuntime({
  filters,
  rows,
  columns,
  comparisonRows,
  reportCatalog,
  t,
  buildFiltersPayload,
  buildPreviousPeriodFiltersPayload,
  canManageScheduledReports: ref(true),
  filtersSectionRef,
  visibleColumnKeys,
  groupByColumn,
});

const {
  loading,
  error,
  exportLoading,
  scheduledReports,
  scheduledLoading,
  scheduledRunLoading,
  snapshotRunLoading,
  loadReport,
  scheduleReportLoad,
  downloadReport,
  enqueueBackgroundExport,
  loadScheduledReports,
  runScheduledReports,
  runCustomerSegmentSnapshots,
  saveScheduledReport,
  removeScheduledReport,
  focusFilters,
} = reportsRuntime;

function openPreview(row) {
  if (!row) return;

  let doctype = "AT Policy";
  let name = row.name;
  
  const rk = filters.reportKey;
  if (rk === "customer_segmentation") {
    doctype = "AT Customer";
  } else if (rk === "claim_loss_ratio" || rk === "claims_operations") {
    doctype = "AT Claim";
  } else if (rk === "payment_status" && row.policy) {
    name = row.policy;
  } else if (rk === "renewal_performance" && row.policy) {
    name = row.policy;
  }

  if (!name) return;

  previewTarget.value = { doctype, name };
  previewTitle.value = name;
  previewSubtitle.value = doctype;
  showPreview.value = true;
}

function closePreview() {
  showPreview.value = false;
  previewTarget.value = null;
}


const { isRowClickable, onRowClick } = useReportsRowActions({ filters, router });

const {
  persistViewStateToStorage,
  syncViewStateFromStorage,
  syncViewStateFromRoute,
  persistViewStateToRoute,
} = useReportsViewState({
  filters,
  columns,
  visibleColumnKeys,
  pendingVisibleColumnKeys,
  sortState,
  route,
  router,
  error,
  t,
});

const canManageScheduledReports = computed(() => Boolean(authStore.isDeskUser));

watch(() => branchStore.selected, () => scheduleReportLoad());

watch(() => filters.reportKey, () => {
  clearHiddenFilters();
  persistReportKeyToRoute();
  syncViewStateFromStorage();
  persistViewStateToRoute();
  scheduleReportLoad();
});

watch([() => filters.fromDate, () => filters.toDate], () => {
  if (!isActivePresetRange()) activePreset.value = "";
  scheduleReportLoad();
});

watch(columns, (nextColumns) => {
  if (!Array.isArray(nextColumns) || nextColumns.length === 0) {
    visibleColumnKeys.value = [];
    pendingVisibleColumnKeys.value = [];
    sortState.column = "";
    sortState.direction = "";
    return;
  }
  if (pendingVisibleColumnKeys.value.length) {
    visibleColumnKeys.value = nextColumns.filter((column) => pendingVisibleColumnKeys.value.includes(column));
    if (!visibleColumnKeys.value.length) visibleColumnKeys.value = [...nextColumns];
    pendingVisibleColumnKeys.value = [];
  } else if (!visibleColumnKeys.value.length) {
    visibleColumnKeys.value = [...nextColumns];
  } else {
    visibleColumnKeys.value = visibleColumnKeys.value.filter((column) => nextColumns.includes(column));
    if (!visibleColumnKeys.value.length) visibleColumnKeys.value = [...nextColumns];
  }
}, { immediate: true });

watch([visibleColumnKeys, () => sortState.column, () => sortState.direction], () => {
  persistViewStateToStorage();
  persistViewStateToRoute();
}, { deep: true });

onMounted(() => {
  syncReportKeyFromRoute();
  persistReportKeyToRoute();
  syncViewStateFromRoute();
  if (!String(route.query?.report_cols || "") && !String(route.query?.report_sort || "")) syncViewStateFromStorage();
  void loadReport();
  void loadScheduledReports();
});
</script>
