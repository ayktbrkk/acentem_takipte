<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="summaryItems.length ? `${sortedRows.length}` : '0'"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <button class="btn btn-outline btn-sm" type="button" @click="focusFilters">
        {{ t("focusFilters") }}
      </button>
      <button class="btn btn-outline btn-sm" type="button" :disabled="loading || exportLoading" @click="downloadReport('xlsx')">
        {{ t("exportXlsx") }}
      </button>
      <button class="btn btn-primary btn-sm" type="button" :disabled="loading || exportLoading" @click="downloadReport('pdf')">
        {{ t("exportPdf") }}
      </button>
    </template>

    <template #metrics>
      <div class="w-full grid grid-cols-1 gap-4 md:grid-cols-4">
        <div
          v-for="item in heroSummaryCells"
          :key="item.label"
          class="mini-metric"
        >
          <p class="mini-metric-label">
            {{ item.label }}
          </p>
          <p class="mini-metric-value" :class="item.valueClass">
            {{ item.value }}
          </p>
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
    />

      <ReportsComparisonSection
        :title="t('comparisonSummaryTitle')"
        :meta="t('comparisonSummaryHint')"
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
</template>

<script setup>
import { computed, onMounted, ref, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { translateText } from "@/utils/i18n";

import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import ReportsFilterSection from "../components/reports/ReportsFilterSection.vue";
import ReportsComparisonSection from "../components/reports/ReportsComparisonSection.vue";
import ReportsTableSection from "../components/reports/ReportsTableSection.vue";
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
  initialReportKey: {
    type: String,
    default: "policy_list",
  },
});

const appPinia = getAppPinia();
const authStore = useAuthStore(appPinia);
const branchStore = useBranchStore(appPinia);
const route = useRoute();
const router = useRouter();

const filtersSectionRef = ref(null);
const rows = ref([]);
const columns = ref([]);
const comparisonRows = ref([]);

const copy = {
  breadcrumb: "Control Center / Reports",
  title: "Reports",
  subtitle: "Branch-aware BI and export hub",
  refresh: "Refresh",
  exportPdf: "PDF",
  exportXlsx: "Excel",
  focusFilters: "Filter",
  recordCount: "records",
  filtersTitle: "Filters",
  listSummaryTitle: "List Summary",
  showingRecords: "records shown",
  advancedFilters: "Advanced Filters",
  hideAdvancedFilters: "Hide Advanced Filters",
  activeFilters: "active filters",
  presetLabel: "Report Preset",
  savePreset: "Save",
  deletePreset: "Delete",
  applyFilters: "Apply",
  clearFilters: "Clear",
  branchFilter: "Insurance branch",
  companyFilter: "Insurance company",
  policyNoFilter: "Carrier Policy Number",
  customerTaxIdFilter: "Tax ID",
  salesEntityFilter: "Sales entity",
  statusFilter: "Status",
  loading: "Loading report...",
  loadErrorTitle: "Failed to Load Report",
  emptyTitle: "No records found",
  emptyDescription: "No report rows matched the selected filters.",
  totalRows: "Total Rows",
  scopeAll: "All Branches",
  scopePrefix: "Office Branch",
  exportError: "Failed to export report.",
  exporting: "Exporting...",
  summaryRows: "Rows",
  summaryGrossPremium: "Gross Premium",
  summaryCommission: "Commission",
  summaryPaidAmount: "Collected",
  summaryActivePolicies: "Active Policies",
  summaryAvgConversionRate: "Avg Offer Conversion",
  summaryOpenRenewals: "Open Renewal Load",
  summaryLoyalCustomers: "Loyal Customers",
  summaryClaimCustomers: "Customers With Claims",
  summaryMatchedCustomers: "Matched Customers",
  summaryCreatedDrafts: "Created Drafts",
  summarySuccessfulDeliveries: "Successful Deliveries",
  summaryOpenReconciliation: "Open Reconciliation",
  summaryDifferenceAmount: "Difference Amount",
  summaryResolvedItems: "Resolved Items",
  summaryOpenClaims: "Open Claims",
  summaryRejectedClaims: "Rejected Claims",
  summarySuccessfulNotifications: "Successful Notifications",
  comparisonSummaryTitle: "Period Comparison",
  comparisonSummaryHint: "Selected range is compared with the previous equal period",
  columns: "Columns",
  columnHint: "Selected columns define the table, hidden columns can be restored with one tap.",
  selectedColumns: "Selected Columns",
  hiddenColumns: "Hidden Columns",
  hiddenColumnsHint: "Hidden columns can be restored with a single tap.",
  showAllColumns: "Show All",
  viewStateError: "Failed to save report view.",
  scheduledSaveError: "Failed to save scheduled report.",
  scheduledDeleteError: "Failed to delete scheduled report.",
  scheduledTitle: "Scheduled Reports",
  scheduledSubtitle: "Report deliveries defined in site config",
  runScheduledReports: "Run Scheduled Reports",
  scheduledEmpty: "No scheduled reports configured.",
  scheduledRecipients: "Recipients",
  scheduledFilters: "Filters",
  scheduledFrequency: "Frequency",
  scheduledFormat: "Format",
  scheduledLimit: "Limit",
  scheduledEnabled: "Enabled",
  scheduledDisabled: "Disabled",
  scheduledRunError: "Failed to trigger scheduled reports.",
  scheduledLoadError: "Failed to load scheduled reports.",
  segmentSnapshotTitle: "Segment Snapshots",
  segmentSnapshotHint: "Refreshes customer segment scores in batch",
  runSegmentSnapshots: "Run Snapshots",
  runningSegmentSnapshots: "Snapshots Running...",
  segmentSnapshotRunError: "Failed to trigger segment snapshot job.",
  granularityLabel: "Report Granularity",
  granularityDaily: "Daily",
  granularityMonthly: "Monthly",
  granularityYearly: "Yearly",
  granularityPlaceholder: "-- Select granularity --",
  dateRangeLabel: "Select Date Range",
  datePresetToday: "Today",
  datePresetThisMonth: "This Month",
  datePresetThisYear: "This Year",
  datePresetYesterday: "Yesterday",
  datePresetLastMonth: "Last Month",
  datePresetLastYear: "Last Year",
  dateFrom: "Start Date",
  dateTo: "End Date",
};

function t(key) {
  return translateText(copy[key] || key, activeLocale.value);
}

const activeLocale = computed(() => unref(authStore.locale) || "en");
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));

const reportFilterComposables = useReportsFilters({
  props,
  t,
  activeLocale,
  localeCode,
  route,
  router,
  authStore,
  branchStore,
  rows,
  refresh: () => loadReport(),
});

const {
  filters,
  reportsAdvancedOpen,
  activePreset,
  reportOptions,
  activeReportLabel,
  branchScopeLabel,
  visibleFilters,
  canManageScheduledReports,
  activeFilterCount,
  datePresets,
  advancedFilterDefinitions,
  visibleAdvancedFilters,
  comparisonEnabled,
  buildFiltersPayload,
  buildPreviousPeriodFiltersPayload,
  clearHiddenFilters,
  syncReportKeyFromRoute,
  persistReportKeyToRoute,
  resetFilters,
  applyDatePreset,
  isActivePresetRange,
  isFilterVisible,
  getAdvancedFilterOptions,
  presetKey,
  presetOptions,
  canDeletePreset,
  applyPreset,
  onPresetChange,
  savePreset,
  deletePreset,
  presetModelValue,
  presetOptionsList,
  canDeletePresetFlag,
} = reportFilterComposables;

const reportsRuntime = useReportsRuntime({
  filters,
  rows,
  columns,
  comparisonRows,
  reportCatalog,
  t,
  buildFiltersPayload,
  buildPreviousPeriodFiltersPayload,
  canManageScheduledReports,
  filtersSectionRef,
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
  loadScheduledReports,
  runScheduledReports,
  runCustomerSegmentSnapshots,
  saveScheduledReport,
  removeScheduledReport,
  focusFilters,
} = reportsRuntime;

const reportTableData = useReportsTableData({
  filters,
  rows,
  columns,
  comparisonRows,
  activeLocale,
  localeCode,
  branchScopeLabel,
  t,
});

const {
  visibleColumnKeys,
  pendingVisibleColumnKeys,
  sortState,
  numberFormatter,
  dateFormatter,
  percentFormatter,
  visibleColumns,
  hiddenColumns,
  columnsSummaryLabel,
  heroSummaryCells,
  summaryItems,
  comparisonSummaryItems,
  sortedRows,
  getColumnLabel,
  formatCellValue,
  normalizeSortableValue,
  isColumnVisible,
  toggleColumn,
  showAllColumns,
  toggleSort,
  getSortIndicator,
  formatComparisonDelta,
} = reportTableData;

const { isRowClickable, onRowClick } = useReportsRowActions({
  filters,
  router,
});

const {
  applyViewState,
  buildViewStatePayload,
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

watch(
  () => branchStore.selected,
  () => {
    scheduleReportLoad();
  },
);

watch(
  () => filters.reportKey,
  () => {
    clearHiddenFilters();
    persistReportKeyToRoute();
    syncViewStateFromStorage();
    persistViewStateToRoute();
    scheduleReportLoad();
  },
);

watch(
  [() => filters.fromDate, () => filters.toDate],
  () => {
    // Kullanıcı manuel tarih değiştirirse preset seçimini temizle
    if (!isActivePresetRange()) {
      activePreset.value = "";
    }
    scheduleReportLoad();
  },
);

watch(
  columns,
  (nextColumns) => {
    if (!Array.isArray(nextColumns) || nextColumns.length === 0) {
      visibleColumnKeys.value = [];
      pendingVisibleColumnKeys.value = [];
      sortState.column = "";
      sortState.direction = "";
      return;
    }

    if (pendingVisibleColumnKeys.value.length) {
      visibleColumnKeys.value = nextColumns.filter((column) => pendingVisibleColumnKeys.value.includes(column));
      if (!visibleColumnKeys.value.length) {
        visibleColumnKeys.value = [...nextColumns];
      }
      pendingVisibleColumnKeys.value = [];
    } else if (!visibleColumnKeys.value.length) {
      visibleColumnKeys.value = [...nextColumns];
    } else {
      visibleColumnKeys.value = visibleColumnKeys.value.filter((column) => nextColumns.includes(column));
      if (!visibleColumnKeys.value.length) {
        visibleColumnKeys.value = [...nextColumns];
      }
    }

    if (sortState.column && !nextColumns.includes(sortState.column)) {
      sortState.column = "";
      sortState.direction = "";
    }
  },
  { immediate: true },
);

watch(
  [visibleColumnKeys, () => sortState.column, () => sortState.direction],
  () => {
    persistViewStateToStorage();
    persistViewStateToRoute();
  },
  { deep: true },
);

onMounted(() => {
  syncReportKeyFromRoute();
  persistReportKeyToRoute();
  syncViewStateFromRoute();
  if (!String(route.query?.report_cols || "") && !String(route.query?.report_sort || "")) {
    syncViewStateFromStorage();
  }
  void loadReport();
  void loadScheduledReports();
});
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}

.report-filter-control {
  @apply h-8 appearance-none rounded-md border border-gray-200 bg-white px-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-brand-600 focus:outline-none;
}

.report-filter-control--date {
  @apply w-[142px] border-transparent px-2;
}
</style>

