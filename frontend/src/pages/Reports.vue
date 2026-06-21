<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="sortedRows.length"
    :record-count-label="t('record_count')"
  >
    <template #actions>
      <ActionButton variant="primary" size="sm" :disabled="loading" @click="loadReport">
        <FeatherIcon name="refresh-cw" :class="['h-4 w-4', loading && 'animate-spin']" />
        {{ t("runReport") }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" @click="focusFilters">
        <FeatherIcon name="search" class="h-4 w-4" />
        {{ t("focus_filters") }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" :disabled="loading || exportLoading" @click="downloadReport('xlsx')">
        <FeatherIcon name="download" class="h-4 w-4" />
        {{ t("export_xlsx") }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" :disabled="loading || exportLoading" @click="downloadReport('pdf')">
        <FeatherIcon name="file-text" class="h-4 w-4" />
        {{ t("export_pdf") }}
      </ActionButton>
    </template>

    <template #metrics>
      <div v-if="loading && !heroSummaryCells.length" class="w-full grid grid-cols-1 gap-4 md:grid-cols-4">
        <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
      </div>
      <div v-else class="w-full grid grid-cols-1 gap-4 md:grid-cols-4">
        <SaaSMetricCard
          v-for="item in heroSummaryCells"
          :key="item.label"
          :label="item.label"
          :value="item.value"
          :value-class="item.valueClass"
        />
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
      :visible-column-keys="visibleColumnKeys"
      :sorted-rows="pagedSortedRows"
      :loading="loading"
      :error="error"
      :export-loading="exportLoading"
      :page="reportListPagination.page"
      :shown-count="reportListShownCount"
      :total-count="sortedRows.length"
      :has-next-page="reportListHasNextPage"
      :fetch-truncated="reportFetchTruncated"
      :is-column-visible="isColumnVisible"
      :on-toggle-column="toggleColumn"
      :on-show-all-columns="showAllColumns"
      :get-column-label="getColumnLabel"
      :format-cell-value="formatCellValue"
      :sort-column="sortState.column"
      :sort-direction="sortState.direction"
      :group-by-column="groupByColumn"
      :groupable-columns="groupableColumns"
      :t="t"
      @on-preview-click="openPreview"
      @on-group-by-change="toggleGroupBy"
      @update:sort-column="sortState.column = $event"
      @update:sort-direction="sortState.direction = $event"
      @on-row-click="onRowClick"
      @retry="loadReport"
      @previous-page="reportListPagination.page -= 1"
      @next-page="reportListPagination.page += 1"
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
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import { FeatherIcon } from "frappe-ui";
import SidePanel from "../components/ui/SidePanel.vue";
import RecordPreviewer from "../components/ui/RecordPreviewer.vue";
import ReportsFilterSection from "../components/reports/ReportsFilterSection.vue";
import ReportsComparisonSection from "../components/reports/ReportsComparisonSection.vue";
import ReportsTableSection from "../components/reports/ReportsTableSection.vue";
import ReportsChartSection from "../components/reports/ReportsChartSection.vue";
import ReportsScheduledSection from "../components/reports/ReportsScheduledSection.vue";
import { reportCatalog, reportDefaultColumns } from "../composables/reportsConfig";
import { REPORTS_TRANSLATIONS } from "../config/reports_translations";
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
  const locale = String(unref(activeLocale) || "tr").toLowerCase().startsWith("tr") ? "tr" : "en";
  return REPORTS_TRANSLATIONS[locale]?.[key] || REPORTS_TRANSLATIONS.en?.[key] || translateText(key, activeLocale);
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
  canManageScheduledReports: filterCanManage,
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

const reportListPagination = reactive({ page: 1, pageLength: 50 });

watch(
  () => [filters.reportKey, sortedRows.value.length],
  () => {
    reportListPagination.page = 1;
  },
);

const pagedSortedRows = computed(() => {
  const start = (reportListPagination.page - 1) * reportListPagination.pageLength;
  return sortedRows.value.slice(start, start + reportListPagination.pageLength);
});
const reportListShownCount = computed(() => pagedSortedRows.value.length);
const reportListHasNextPage = computed(
  () => reportListPagination.page * reportListPagination.pageLength < sortedRows.value.length,
);
const reportFetchTruncated = computed(() => sortedRows.value.length >= 500);

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
  const doctypeLabel = translateText(doctype, activeLocale) || doctype;
  previewTitle.value = `${doctypeLabel}: ${name}`;
  previewSubtitle.value = doctypeLabel;
  showPreview.value = true;
}

function closePreview() {
  showPreview.value = false;
  previewTarget.value = null;
}


const { onRowClick } = useReportsRowActions({ filters, router });

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

const canManageScheduledReports = filterCanManage;

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
    const defaults = reportDefaultColumns[filters.reportKey] || nextColumns;
    visibleColumnKeys.value = nextColumns.filter((column) => defaults.includes(column));
    if (!visibleColumnKeys.value.length) visibleColumnKeys.value = [...nextColumns];
  } else {
    visibleColumnKeys.value = visibleColumnKeys.value.filter((column) => nextColumns.includes(column));
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
  if (!String(route.query?.report_sort || "")) syncViewStateFromStorage();
  void loadReport();
  void loadScheduledReports();
});
</script>
