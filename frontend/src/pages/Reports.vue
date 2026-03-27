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
      <ReportsHeroMetrics :items="heroSummaryCells" />
    </template>

    <SectionPanel
      ref="filtersSectionRef"
      :title="t('filtersTitle')"
      :count="`${activeFilterCount} ${t('activeFilters')}`"
      :meta="branchScopeLabel"
      panel-class="surface-card rounded-2xl p-4"
    >
      <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <select v-model="filters.reportKey" class="report-filter-control min-w-[180px]">
            <option v-for="option in reportOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>

          <select
            v-if="filters.reportKey === 'policy_list'"
            :value="activePreset"
            class="report-filter-control min-w-[210px]"
            @change="applyDatePreset($event.target.value)"
          >
            <option value="">{{ t("dateRangeLabel") }}</option>
            <option v-for="preset in datePresets" :key="preset.value" :value="preset.value">
              {{ preset.label }}
            </option>
          </select>

          <div class="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-1.5 py-1">
            <input
              v-model="filters.fromDate"
              class="report-filter-control report-filter-control--date"
              type="date"
              :placeholder="t('dateFrom')"
              :title="t('dateFrom')"
            />
            <span class="text-xs text-gray-400">-</span>
            <input
              v-model="filters.toDate"
              class="report-filter-control report-filter-control--date"
              type="date"
              :placeholder="t('dateTo')"
              :title="t('dateTo')"
            />
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2">
          <button
            type="button"
            class="flex h-8 items-center gap-1 rounded-md border border-gray-200 px-2.5 text-xs text-gray-500 transition-colors hover:bg-gray-50"
            @click="reportsAdvancedOpen = !reportsAdvancedOpen"
          >
            {{ reportsAdvancedOpen ? t('hideAdvancedFilters') : t('advancedFilters') }}
          </button>

          <span
            v-if="activeFilterCount > 0"
            class="flex h-8 items-center gap-1 rounded-md border border-gray-200 px-2.5 text-xs text-gray-500"
          >
            {{ activeFilterCount }} {{ t('activeFilters') }}
          </span>

          <div class="ml-auto flex flex-wrap items-center gap-2">
            <FilterPresetMenu
              :model-value="presetModelValue"
              :label="t('presetLabel')"
              :options="presetOptionsList"
              :can-delete="canDeletePresetFlag"
              :show-save="true"
              :show-delete="true"
              :disabled="loading"
              :save-label="t('savePreset')"
              :delete-label="t('deletePreset')"
              @update:model-value="presetKey = $event"
              @change="onPresetChange"
              @save="savePreset"
              @delete="deletePreset"
            />
            <button class="btn btn-sm" type="button" :disabled="loading" @click="loadReport">{{ t('refresh') }}</button>
            <button class="btn btn-sm" type="button" :disabled="loading" @click="loadReport">{{ t('applyFilters') }}</button>
            <button class="btn btn-outline btn-sm" type="button" :disabled="loading" @click="resetFilters">{{ t('clearFilters') }}</button>
          </div>
        </div>
      </div>

      <div v-if="reportsAdvancedOpen" class="mt-3 rounded-lg border border-gray-200 bg-gray-50/50 p-3">
        <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <label
            v-for="field in visibleAdvancedFilters"
            :key="field.key"
            class="flex flex-col gap-1"
          >
            <span class="text-xs font-medium text-gray-600">{{ field.label }}</span>
            <input
              v-model.trim="filters[field.modelKey]"
              class="report-filter-control"
              type="search"
              :placeholder="field.label"
              :list="`advanced-${field.key}-options`"
            />
            <datalist :id="`advanced-${field.key}-options`">
              <option
                v-for="option in getAdvancedFilterOptions(field.key)"
                :key="`${field.key}-${option}`"
                :value="option"
              />
            </datalist>
          </label>
        </div>
      </div>

      <div class="mt-3 flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
        <span>{{ t("listSummaryTitle") }}</span>
        <span>{{ t("columns") }}: {{ columnsSummaryLabel }}</span>
      </div>
    </SectionPanel>

    <ReportsReportPanel
      :title="activeReportLabel"
      :count="sortedRows.length"
      :meta="branchScopeLabel"
      :columns-label="t('columns')"
      :columns-summary-label="columnsSummaryLabel"
      :column-hint="t('columnHint')"
      :show-all-columns-label="t('showAllColumns')"
      :loading-label="t('loading')"
      :load-error-title="t('loadErrorTitle')"
      :empty-title="t('emptyTitle')"
      :empty-description="t('emptyDescription')"
      :showing-records-label="t('showingRecords')"
      :exporting-label="t('exporting')"
      :loading="loading"
      :export-loading="exportLoading"
      :error="error"
      :columns="columns"
      :sorted-rows="sortedRows"
      :visible-columns="visibleColumns"
      :show-all-columns="showAllColumns"
      :is-column-visible="isColumnVisible"
      :toggle-column="toggleColumn"
      :get-column-label="getColumnLabel"
      :toggle-sort="toggleSort"
      :get-sort-indicator="getSortIndicator"
      :is-row-clickable="isRowClickable"
      :on-row-click="onRowClick"
      :format-cell-value="formatCellValue"
    />

      <SectionPanel
        v-if="comparisonSummaryItems.length"
        :title="t('comparisonSummaryTitle')"
        :meta="t('comparisonSummaryHint')"
        :count="comparisonSummaryItems.length"
      >
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="item in comparisonSummaryItems"
            :key="item.key"
            class="mini-metric shadow-sm border border-slate-200 bg-white/95"
            :class="item.cardClass"
          >
            <p class="mini-metric-label">
              {{ item.label }}
            </p>
            <p class="mini-metric-value" :class="item.valueClass">
              {{ item.value }}
            </p>
            <p class="mt-1 text-xs font-medium" :class="item.delta >= 0 ? 'text-emerald-600' : 'text-amber-700'">
              {{ formatComparisonDelta(item.delta, item.previous) }}
            </p>
          </article>
        </div>
      </SectionPanel>

      <div class="space-y-4">
        <SectionPanel
          v-if="canManageScheduledReports"
          :title="t('scheduledTitle')"
          :meta="t('scheduledSubtitle')"
          :count="scheduledReports.length"
        >
          <ScheduledReportsManager
            :items="scheduledReports"
            :loading="scheduledLoading"
            :running="scheduledRunLoading"
            :locale="activeLocale"
            :report-catalog="reportCatalog"
            :active-office-branch="branchStore.requestBranch"
            @run="runScheduledReports"
            @save="saveScheduledReport"
            @remove="removeScheduledReport"
          />
          <div class="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
            <div class="space-y-1">
              <h4 class="text-sm font-semibold text-slate-900">{{ t("segmentSnapshotTitle") }}</h4>
              <p class="text-xs text-slate-500">{{ t("segmentSnapshotHint") }}</p>
            </div>
            <button
              class="btn btn-sm"
              type="button"
              data-testid="run-segment-snapshot-job"
              :disabled="snapshotRunLoading"
              @click="runCustomerSegmentSnapshots"
            >
              {{ snapshotRunLoading ? t("runningSegmentSnapshots") : t("runSegmentSnapshots") }}
            </button>
          </div>
        </SectionPanel>
      </div>
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, ref, unref } from "vue";
import { frappeRequest } from "frappe-ui";
import { useRoute, useRouter } from "vue-router";

import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import ScheduledReportsManager from "../components/reports/ScheduledReportsManager.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import FilterPresetMenu from "../components/app-shell/FilterPresetMenu.vue";
import ReportsHeroMetrics from "../components/reports/ReportsHeroMetrics.vue";
import ReportsReportPanel from "../components/reports/ReportsReportPanel.vue";
import { columnLabels as columnLabelsConfig, reportCatalog as reportCatalogConfig, reportFilterConfig as reportFilterConfigConfig } from "../composables/reports/catalog";
import { useReportsRuntime } from "../composables/reports/runtime";
import { useReportsScheduled } from "../composables/reports/scheduled";
import { createReportFilters } from "../composables/reports/state";
import { useCustomFilterPresets } from "../composables/useCustomFilterPresets";
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
const REPORT_LOAD_DEBOUNCE_MS = 300;
let reportLoadTimer = null;

const copy = {
  tr: {
    breadcrumb: "Kontrol Merkezi / Raporlar",
    title: "Raporlar",
    subtitle: "Şube duyarlı raporlama ve dışa aktarma merkezi",
    refresh: "Yenile",
    exportPdf: "PDF",
    exportXlsx: "Excel",
    focusFilters: "Filtrele",
    recordCount: "kayıt",
    filtersTitle: "Filtreler",
    listSummaryTitle: "Liste Özeti",
    showingRecords: "kayıt gösteriliyor",
    advancedFilters: "Gelişmiş Filtreler",
    hideAdvancedFilters: "Gelişmiş Filtreleri Gizle",
    activeFilters: "aktif filtre",
    presetLabel: "Rapor Şablonu",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    applyFilters: "Uygula",
    clearFilters: "Temizle",
    branchFilter: "Sigorta branşı",
    companyFilter: "Sigorta şirketi",
    policyNoFilter: "Sigorta Şirketi Poliçe No",
    customerTaxIdFilter: "TC/VKN",
    salesEntityFilter: "Satış birimi",
    statusFilter: "Durum",
    loading: "Rapor yükleniyor...",
    loadErrorTitle: "Rapor Yüklenemedi",
    emptyTitle: "Kayıt bulunamadı",
    emptyDescription: "Seçili filtrelerle rapor verisi bulunamadı.",
    totalRows: "Toplam Satır",
    scopeAll: "Tüm şubeler",
    scopePrefix: "Ofis Şube",
    exportError: "Rapor dışa aktarma başarısız oldu.",
    exporting: "Dışa aktarılıyor...",
    summaryRows: "Kayıt Sayısı",
    summaryGrossPremium: "Brüt Prim",
    summaryCommission: "Komisyon",
    summaryPaidAmount: "Tahsil Edilen",
    summaryActivePolicies: "Aktif Poliçe",
    summaryAvgConversionRate: "Ort. Teklif Dönüşümü",
    summaryOpenRenewals: "Açık Yenileme Yükü",
    summaryLoyalCustomers: "Sadık Müşteri",
    summaryClaimCustomers: "Hasarlı Müşteri",
    summaryMatchedCustomers: "Eşleşen Müşteri",
    summaryCreatedDrafts: "Üretilen Taslak",
    summarySuccessfulDeliveries: "Başarılı Gönderim",
    summaryOpenReconciliation: "Açık Mutabakat",
    summaryDifferenceAmount: "Fark Tutarı",
    summaryResolvedItems: "Çözülen Kalem",
    summaryOpenClaims: "Açık Hasar",
    summaryRejectedClaims: "Reddedilen Hasar",
    summarySuccessfulNotifications: "Başarılı Bildirim",
    comparisonSummaryTitle: "Dönem Kıyaslaması",
    comparisonSummaryHint: "Seçili aralık, önceki eşit periyot ile karşılaştırılır.",
    columns: "Kolonlar",
    columnHint: "Seçili kolonlar tabloyu kurar, gizli kolonlar tek dokunuşla açılır.",
    selectedColumns: "Seçili Kolonlar",
    hiddenColumns: "Gizli Kolonlar",
    hiddenColumnsHint: "Gizli kolonlar tek dokunuşla tekrar görünür yapılabilir.",
    showAllColumns: "Tümünü Göster",
    viewStateError: "Rapor görünümü kaydedilemedi.",
    scheduledSaveError: "Zamanlanmış rapor kaydedilemedi.",
    scheduledDeleteError: "Zamanlanmış rapor silinemedi.",
    scheduledTitle: "Zamanlanmış Raporlar",
    scheduledSubtitle: "Site konfigürasyonu ile tanımlı rapor teslimleri",
    runScheduledReports: "Zamanlanmış Raporları Çalıştır",
    scheduledEmpty: "Tanımlı zamanlanmış rapor yok.",
    scheduledRecipients: "Alıcılar",
    scheduledFilters: "Filtreler",
    scheduledFrequency: "Frekans",
    scheduledFormat: "Format",
    scheduledLimit: "Limit",
    scheduledEnabled: "Etkin",
    scheduledDisabled: "Pasif",
    scheduledRunError: "Zamanlanmış raporlar tetiklenemedi.",
    scheduledLoadError: "Zamanlanmış raporlar yüklenemedi.",
    segmentSnapshotTitle: "Segment Snapshot'ları",
    segmentSnapshotHint: "Müşteri segment skorlarını toplu olarak yeniler",
    runSegmentSnapshots: "Snapshot'ları Çalıştır",
    runningSegmentSnapshots: "Snapshot'lar Çalışıyor...",
    segmentSnapshotRunError: "Segment snapshot işi tetiklenemedi.",
    granularityLabel: "Rapor Granülaritesi",
    granularityDaily: "Günlük",
    granularityMonthly: "Aylık",
    granularityYearly: "Yıllık",
    granularityPlaceholder: "-- Granülariteyi seçin --",
    dateRangeLabel: "Tarih Aralığı Seçin",
    datePresetToday: "Bugün",
    datePresetThisMonth: "Bu Ay",
    datePresetThisYear: "Bu Yıl",
    datePresetYesterday: "Dün",
    datePresetLastMonth: "Geçen Ay",
    datePresetLastYear: "Geçen Yıl",
    dateFrom: "Başlangıç Tarihi",
    dateTo: "Bitiş Tarihi",
  },
  en: {
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
  },
};

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

const activeLocale = computed(() => unref(authStore.locale) || "en");
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
const reportCatalog = reportCatalogConfig;
const columnLabels = columnLabelsConfig;
const reportFilterConfig = reportFilterConfigConfig;
const filters = createReportFilters(props.initialReportKey);

const scheduledLoading = ref(false);
const scheduledRunLoading = ref(false);
const snapshotRunLoading = ref(false);
const filtersSectionRef = ref(null);
const reportsAdvancedOpen = ref(false);
const scheduledReports = ref([]);

const reportOptions = computed(() =>
  Object.entries(reportCatalog).map(([value, config]) => ({
    value,
    label: config.label[activeLocale.value] || config.label.en,
  })),
);

const activeReportLabel = computed(
  () => reportCatalog[filters.reportKey]?.label[activeLocale.value] || reportCatalog[filters.reportKey]?.label.en || filters.reportKey,
);

const branchScopeLabel = computed(() => {
  if (!branchStore.requestBranch) {
    return `${t("scopePrefix")}: ${t("scopeAll")}`;
  }
  return `${t("scopePrefix")}: ${branchStore.activeBranch?.label || branchStore.requestBranch}`;
});

const visibleFilters = computed(() => new Set(reportFilterConfig[filters.reportKey] || []));
const canManageScheduledReports = computed(() => {
  const roles = Array.isArray(unref(authStore.roles)) ? unref(authStore.roles) : [];
  return Boolean(unref(authStore.isDeskUser)) || roles.includes("Manager");
});

const activeFilterCount = computed(() => {
  let count = 0;
  if (filters.fromDate) count += 1;
  if (filters.toDate) count += 1;
  if (visibleFilters.value.has("branch") && filters.branch) count += 1;
  if (visibleFilters.value.has("insuranceCompany") && filters.insuranceCompany) count += 1;
  if (visibleFilters.value.has("policyNo") && filters.policyNo) count += 1;
  if (visibleFilters.value.has("customerTaxId") && filters.customerTaxId) count += 1;
  if (visibleFilters.value.has("salesEntity") && filters.salesEntity) count += 1;
  if (visibleFilters.value.has("status") && filters.status) count += 1;
  return count;
});

const datePresets = computed(() => [
  { value: "today", label: t("datePresetToday") },
  { value: "this_month", label: t("datePresetThisMonth") },
  { value: "this_year", label: t("datePresetThisYear") },
  { value: "yesterday", label: t("datePresetYesterday") },
  { value: "last_month", label: t("datePresetLastMonth") },
  { value: "last_year", label: t("datePresetLastYear") },
]);

const advancedFilterDefinitions = computed(() => [
  { key: "branch", modelKey: "branch", label: t("branchFilter") },
  { key: "insuranceCompany", modelKey: "insuranceCompany", label: t("companyFilter") },
  { key: "policyNo", modelKey: "policyNo", label: t("policyNoFilter") },
  { key: "customerTaxId", modelKey: "customerTaxId", label: t("customerTaxIdFilter") },
  { key: "salesEntity", modelKey: "salesEntity", label: t("salesEntityFilter") },
  { key: "status", modelKey: "status", label: t("statusFilter") },
]);

const visibleAdvancedFilters = computed(() =>
  advancedFilterDefinitions.value.filter((item) => isFilterVisible(item.key)),
);

const numberFormatter = computed(() =>
  new Intl.NumberFormat(localeCode.value, {
    maximumFractionDigits: 2,
  }),
);

const comparisonEnabled = computed(
  () =>
    ["communication_operations", "reconciliation_operations", "claims_operations"].includes(filters.reportKey)
    && Boolean(filters.fromDate)
    && Boolean(filters.toDate),
);

const visibleColumns = computed(() => {
  if (!visibleColumnKeys.value.length) {
    return columns.value;
  }
  return columns.value.filter((column) => visibleColumnKeys.value.includes(column));
});

const hiddenColumns = computed(() => columns.value.filter((column) => !visibleColumns.value.includes(column)));
const columnsSummaryLabel = computed(() => `${visibleColumns.value.length}/${columns.value.length}`);

const heroSummaryCells = computed(() =>
  summaryItems.value.map((item, index) => ({
    label: item.label,
    value: item.value,
    sub: index === 0 ? branchScopeLabel.value : undefined,
    variant: getHeroVariant(item.key, index),
  })),
);

const metricToneClasses = {
  rows: "text-gray-900",
  gross_premium: "text-brand-600",
  commission: "text-green-600",
  paid_amount: "text-amber-600",
  active_policies: "text-green-600",
  conversion_rate: "text-brand-600",
  open_renewals: "text-amber-600",
  loyal_customers: "text-gray-900",
  claim_customers: "text-amber-600",
  matched_customers: "text-green-600",
  created_drafts: "text-brand-600",
  successful_deliveries: "text-green-600",
  open_reconciliation: "text-amber-600",
  difference_amount: "text-brand-600",
  resolved_items: "text-green-600",
  open_claims: "text-amber-600",
  rejected_claims: "text-amber-600",
  successful_notifications: "text-green-600",
};
const buildMetricItem = (key, label, value, extra = {}) => ({
  key,
  label,
  value,
  valueClass: metricToneClasses[key] || "text-slate-900",
  cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm",
  ...extra,
});

function getHeroVariant(key, index) {
  if (index === 0) {
    return "lg";
  }

  if (["gross_premium", "difference_amount", "conversion_rate", "created_drafts"].includes(key)) {
    return "accent";
  }

  if (["commission", "active_policies", "matched_customers", "successful_deliveries", "resolved_items", "successful_notifications"].includes(key)) {
    return "success";
  }

  if (["paid_amount", "open_renewals", "claim_customers", "open_reconciliation", "open_claims", "rejected_claims"].includes(key)) {
    return "warn";
  }

  return "default";
}

const sortedRows = computed(() => {
  if (!sortState.column || !sortState.direction) {
    return rows.value;
  }

  const direction = sortState.direction === "desc" ? -1 : 1;
  return [...rows.value].sort((leftRow, rightRow) => {
    const left = normalizeSortableValue(leftRow?.[sortState.column]);
    const right = normalizeSortableValue(rightRow?.[sortState.column]);
    if (left === right) {
      return 0;
    }
    return left > right ? direction : -direction;
  });
});

const summaryItems = computed(() => {
  const numericTotal = (keys) =>
    rows.value.reduce((sum, row) => {
      const value = keys.reduce((acc, key) => {
        const parsed = Number(row?.[key] || 0);
        return Number.isFinite(parsed) ? acc + parsed : acc;
      }, 0);
      return sum + value;
    }, 0);

  const avgNumeric = (key) => {
    if (!rows.value.length) return 0;
    const total = rows.value.reduce((sum, row) => {
      const parsed = Number(row?.[key] || 0);
      return Number.isFinite(parsed) ? sum + parsed : sum;
    }, 0);
    return total / rows.value.length;
  };

  if (filters.reportKey === "policy_list" && filters.granularity) {
    return [
      buildMetricItem("rows", t("summaryRows"), numberFormatter.value.format(numericTotal(["policy_count"]))),
      buildMetricItem("gross_premium", t("summaryGrossPremium"), numberFormatter.value.format(numericTotal(["total_gross_premium"]))),
      buildMetricItem("commission", t("summaryCommission"), numberFormatter.value.format(numericTotal(["total_commission"]))),
      buildMetricItem("paid_amount", t("summaryPaidAmount"), numberFormatter.value.format(0)),
    ];
  }

  if (filters.reportKey === "agent_performance") {
    return [
      buildMetricItem("rows", t("summaryRows"), numberFormatter.value.format(rows.value.length)),
      buildMetricItem("gross_premium", t("summaryGrossPremium"), numberFormatter.value.format(numericTotal(["total_gross_premium"]))),
      buildMetricItem("commission", t("summaryCommission"), numberFormatter.value.format(numericTotal(["total_commission"]))),
      buildMetricItem("conversion_rate", t("summaryAvgConversionRate"), `%${percentFormatter.value.format(avgNumeric("offer_conversion_rate"))}`),
    ];
  }

  if (filters.reportKey === "customer_segmentation") {
    return [
      buildMetricItem("rows", t("summaryRows"), numberFormatter.value.format(rows.value.length)),
      buildMetricItem("gross_premium", t("summaryGrossPremium"), numberFormatter.value.format(numericTotal(["total_premium"]))),
      buildMetricItem("active_policies", t("summaryActivePolicies"), numberFormatter.value.format(numericTotal(["active_policy_count"]))),
      buildMetricItem(
        "claim_customers",
        t("summaryClaimCustomers"),
        numberFormatter.value.format(rows.value.filter((row) => String(row?.claim_history_segment || "") === "HAS_CLAIM").length),
      ),
    ];
  }

  if (filters.reportKey === "communication_operations") {
    return [
      buildMetricItem("rows", t("summaryRows"), numberFormatter.value.format(rows.value.length)),
      buildMetricItem("matched_customers", t("summaryMatchedCustomers"), numberFormatter.value.format(numericTotal(["matched_customer_count"]))),
      buildMetricItem("created_drafts", t("summaryCreatedDrafts"), numberFormatter.value.format(numericTotal(["sent_count"]))),
      buildMetricItem("successful_deliveries", t("summarySuccessfulDeliveries"), numberFormatter.value.format(numericTotal(["sent_outbox_count"]))),
    ];
  }

  if (filters.reportKey === "reconciliation_operations") {
    return [
      buildMetricItem("rows", t("summaryRows"), numberFormatter.value.format(rows.value.length)),
      buildMetricItem(
        "open_reconciliation",
        t("summaryOpenReconciliation"),
        numberFormatter.value.format(rows.value.filter((row) => String(row?.status || "") === "Open").length),
      ),
      buildMetricItem("difference_amount", t("summaryDifferenceAmount"), numberFormatter.value.format(numericTotal(["difference_try"]))),
      buildMetricItem(
        "resolved_items",
        t("summaryResolvedItems"),
        numberFormatter.value.format(rows.value.filter((row) => ["Resolved", "Ignored"].includes(String(row?.status || ""))).length),
      ),
    ];
  }

  if (filters.reportKey === "claims_operations") {
    return [
      buildMetricItem("rows", t("summaryRows"), numberFormatter.value.format(rows.value.length)),
      buildMetricItem(
        "open_claims",
        t("summaryOpenClaims"),
        numberFormatter.value.format(rows.value.filter((row) => ["Open", "In Review"].includes(String(row?.claim_status || ""))).length),
      ),
      buildMetricItem(
        "rejected_claims",
        t("summaryRejectedClaims"),
        numberFormatter.value.format(rows.value.filter((row) => String(row?.claim_status || "") === "Rejected").length),
      ),
      buildMetricItem("successful_notifications", t("summarySuccessfulNotifications"), numberFormatter.value.format(numericTotal(["sent_outbox_count"]))),
    ];
  }

  return [
    buildMetricItem("rows", t("summaryRows"), numberFormatter.value.format(rows.value.length)),
    buildMetricItem("gross_premium", t("summaryGrossPremium"), numberFormatter.value.format(numericTotal(["gross_premium", "total_gross_premium", "total_premium"]))),
    buildMetricItem("commission", t("summaryCommission"), numberFormatter.value.format(numericTotal(["commission_amount", "total_commission"]))),
    buildMetricItem("paid_amount", t("summaryPaidAmount"), numberFormatter.value.format(numericTotal(["paid_amount", "approved_amount"]))),
  ];
});

function numericTotalFromRows(rowSet, keys) {
  return rowSet.reduce((total, row) => {
    for (const key of keys) {
      const value = Number(row?.[key] || 0);
      if (Number.isFinite(value) && value !== 0) {
        return total + value;
      }
    }
    return total;
  }, 0);
}

const comparisonSummaryItems = computed(() => {
  if (!comparisonEnabled.value || !comparisonRows.value.length) {
    return [];
  }

  if (filters.reportKey === "communication_operations") {
    const currentMatched = numericTotal(["matched_customer_count"]);
    const previousMatched = numericTotalFromRows(comparisonRows.value, ["matched_customer_count"]);
    const currentDrafts = numericTotal(["sent_count"]);
    const previousDrafts = numericTotalFromRows(comparisonRows.value, ["sent_count"]);
    const currentDeliveries = numericTotal(["sent_outbox_count"]);
    const previousDeliveries = numericTotalFromRows(comparisonRows.value, ["sent_outbox_count"]);
    return [
      { key: "cmp_matched", label: t("summaryMatchedCustomers"), value: numberFormatter.value.format(currentMatched), previous: previousMatched, delta: currentMatched - previousMatched, valueClass: metricToneClasses.matched_customers, cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm" },
      { key: "cmp_drafts", label: t("summaryCreatedDrafts"), value: numberFormatter.value.format(currentDrafts), previous: previousDrafts, delta: currentDrafts - previousDrafts, valueClass: metricToneClasses.created_drafts, cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm" },
      { key: "cmp_deliveries", label: t("summarySuccessfulDeliveries"), value: numberFormatter.value.format(currentDeliveries), previous: previousDeliveries, delta: currentDeliveries - previousDeliveries, valueClass: metricToneClasses.successful_deliveries, cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm" },
    ];
  }

  if (filters.reportKey === "reconciliation_operations") {
    const currentOpen = rows.value.filter((row) => String(row?.status || "") === "Open").length;
    const previousOpen = comparisonRows.value.filter((row) => String(row?.status || "") === "Open").length;
    const currentDiff = numericTotal(["difference_try"]);
    const previousDiff = numericTotalFromRows(comparisonRows.value, ["difference_try"]);
    const currentResolved = rows.value.filter((row) => ["Resolved", "Ignored"].includes(String(row?.status || ""))).length;
    const previousResolved = comparisonRows.value.filter((row) => ["Resolved", "Ignored"].includes(String(row?.status || ""))).length;
    return [
      { key: "cmp_open", label: t("summaryOpenReconciliation"), value: numberFormatter.value.format(currentOpen), previous: previousOpen, delta: currentOpen - previousOpen, valueClass: metricToneClasses.open_reconciliation, cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm" },
      { key: "cmp_difference", label: t("summaryDifferenceAmount"), value: numberFormatter.value.format(currentDiff), previous: previousDiff, delta: currentDiff - previousDiff, valueClass: metricToneClasses.difference_amount, cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm" },
      { key: "cmp_resolved", label: t("summaryResolvedItems"), value: numberFormatter.value.format(currentResolved), previous: previousResolved, delta: currentResolved - previousResolved, valueClass: metricToneClasses.resolved_items, cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm" },
    ];
  }

  if (filters.reportKey === "claims_operations") {
    const currentOpen = rows.value.filter((row) => ["Open", "In Review"].includes(String(row?.claim_status || ""))).length;
    const previousOpen = comparisonRows.value.filter((row) => ["Open", "In Review"].includes(String(row?.claim_status || ""))).length;
    const currentRejected = rows.value.filter((row) => String(row?.claim_status || "") === "Rejected").length;
    const previousRejected = comparisonRows.value.filter((row) => String(row?.claim_status || "") === "Rejected").length;
    const currentNotifications = numericTotal(["sent_outbox_count"]);
    const previousNotifications = numericTotalFromRows(comparisonRows.value, ["sent_outbox_count"]);
    return [
      { key: "cmp_claim_open", label: t("summaryOpenClaims"), value: numberFormatter.value.format(currentOpen), previous: previousOpen, delta: currentOpen - previousOpen, valueClass: metricToneClasses.open_claims, cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm" },
      { key: "cmp_claim_rejected", label: t("summaryRejectedClaims"), value: numberFormatter.value.format(currentRejected), previous: previousRejected, delta: currentRejected - previousRejected, valueClass: metricToneClasses.rejected_claims, cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm" },
      { key: "cmp_claim_notifications", label: t("summarySuccessfulNotifications"), value: numberFormatter.value.format(currentNotifications), previous: previousNotifications, delta: currentNotifications - previousNotifications, valueClass: metricToneClasses.successful_notifications, cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm" },
    ];
  }

  return [];
});

const dateFormatter = computed(() =>
  new Intl.DateTimeFormat(localeCode.value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }),
);

const percentFormatter = computed(() =>
  new Intl.NumberFormat(localeCode.value, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }),
);

const { presetKey, presetOptions, canDeletePreset, applyPreset, onPresetChange, savePreset, deletePreset } =
  useCustomFilterPresets({
    screen: "reports",
    presetStorageKey: "at:reports:preset",
    presetListStorageKey: "at:reports:preset-list",
    t,
    getCurrentPayload: () => ({
      reportKey: filters.reportKey,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      branch: filters.branch,
      insuranceCompany: filters.insuranceCompany,
      salesEntity: filters.salesEntity,
      status: filters.status,
      granularity: filters.granularity,
    }),
    setFilterStateFromPayload: (payload) => {
      filters.reportKey = String(payload?.reportKey || "policy_list");
      filters.fromDate = String(payload?.fromDate || "");
      filters.toDate = String(payload?.toDate || "");
      filters.branch = String(payload?.branch || "");
      filters.insuranceCompany = String(payload?.insuranceCompany || "");
      filters.salesEntity = String(payload?.salesEntity || "");
      filters.status = String(payload?.status || "");
      filters.granularity = String(payload?.granularity || "");
    },
    resetFilterState: () => {
      filters.reportKey = "policy_list";
      filters.fromDate = "";
      filters.toDate = "";
      filters.branch = "";
      filters.insuranceCompany = "";
      filters.salesEntity = "";
      filters.status = "";
      filters.granularity = "";
    },
    refresh: () => loadReport(),
    getSortLocale: () => localeCode.value,
  });

let loadScheduledReports = async () => {};

const reportsRuntime = useReportsRuntime({
  t,
  activeLocale,
  localeCode,
  reportCatalog,
  columnLabels,
  filters,
  visibleFilters,
  comparisonEnabled,
  branchStore,
  route,
  router,
  filtersSectionRef,
  numberFormatter,
  dateFormatter,
  percentFormatter,
  onLoadScheduledReports: () => loadScheduledReports(),
});

const {
  loading,
  exportLoading,
  error,
  columns,
  rows,
  comparisonRows,
  activePreset,
  visibleColumnKeys,
  pendingVisibleColumnKeys,
  sortState,
  clearHiddenFilters,
  formatComparisonDelta,
  isFilterVisible,
  getAdvancedFilterOptions,
  getColumnLabel,
  getReportRowRoute,
  isRowClickable,
  onRowClick,
  formatCellValue,
  normalizeSortableValue,
  syncReportKeyFromRoute,
  persistReportKeyToRoute,
  applyViewState,
  buildViewStatePayload,
  persistViewStateToStorage,
  syncViewStateFromStorage,
  syncViewStateFromRoute,
  persistViewStateToRoute,
  loadReport,
  scheduleReportLoad,
  downloadReport,
  isColumnVisible,
  toggleColumn,
  showAllColumns,
  focusFilters,
  toggleSort,
  getSortIndicator,
  applyDatePreset,
  isActivePresetRange,
} = reportsRuntime;

const reportsScheduled = useReportsScheduled({
  t,
  frappeRequest,
  canManageScheduledReports,
  scheduledReports,
  scheduledLoading,
  scheduledRunLoading,
  snapshotRunLoading,
  errorRef: error,
});

loadScheduledReports = reportsScheduled.loadScheduledReports;

const {
  runScheduledReports,
  runCustomerSegmentSnapshots,
  saveScheduledReport,
  removeScheduledReport,
} = reportsScheduled;

const presetModelValue = computed(() => String(unref(presetKey) || "default"));
const presetOptionsList = computed(() => {
  const value = unref(presetOptions);
  return Array.isArray(value) ? value : [];
});
const canDeletePresetFlag = computed(() => Boolean(unref(canDeletePreset)));

function resetFilters() {
  applyPreset("default", { refresh: false });
  void loadReport();
}
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

