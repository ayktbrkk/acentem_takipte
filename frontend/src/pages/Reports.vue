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

    <SectionPanel
          :title="activeReportLabel"
          :count="sortedRows.length"
          :meta="branchScopeLabel"
          panel-class="surface-card rounded-2xl p-5"
        >
          <div class="mt-1 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>{{ t("columns") }}: {{ columnsSummaryLabel }}</span>
            <span v-if="exportLoading">{{ t("exporting") }}</span>
          </div>

          <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <p class="text-xs text-slate-600">{{ t("columnHint") }}</p>
              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                  {{ columnsSummaryLabel }}
                </span>
                <button
                  type="button"
                  class="btn btn-outline btn-xs"
                  @click="showAllColumns"
                >
                  {{ t("showAllColumns") }}
                </button>
              </div>
            </div>

            <div class="mt-3 rounded-xl border border-slate-200 bg-white/90 p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{{ t("columns") }}</p>
                <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {{ columnsSummaryLabel }}
                </span>
              </div>
              <div class="mt-2 max-h-40 overflow-y-auto flex flex-wrap gap-2">
                <button
                  v-for="column in columns"
                  :key="`all-${column}`"
                  type="button"
                  :class="isColumnVisible(column)
                    ? 'inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 transition hover:bg-sky-100'
                    : 'inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100'"
                  @click="toggleColumn(column)"
                >
                  {{ getColumnLabel(column) }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="loading" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
            {{ t("loading") }}
          </div>
          <div v-else-if="error" class="mt-4 qc-error-banner" role="alert" aria-live="polite">
            <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
            <p class="qc-error-banner__text mt-1">{{ error }}</p>
          </div>
          <template v-else>
            <div v-if="sortedRows.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <EmptyState :title="t('emptyTitle')" :description="t('emptyDescription')" />
            </div>

            <div class="mt-4 overflow-hidden rounded-lg border border-gray-200">
              <div class="overflow-auto">
              <table class="w-full border-collapse">
                <thead>
                  <tr class="border-b border-gray-200 bg-gray-50">
                    <th
                      v-for="column in visibleColumns"
                      :key="column"
                      class="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-gray-400"
                    >
                      <button
                        type="button"
                        class="inline-flex w-full items-center justify-between gap-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-600"
                        @click="toggleSort(column)"
                      >
                        <span>{{ getColumnLabel(column) }}</span>
                        <span class="text-[10px] text-gray-400">{{ getSortIndicator(column) }}</span>
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, rowIndex) in sortedRows"
                    :key="row.name || rowIndex"
                    class="border-b border-gray-100 transition-colors duration-100 last:border-0"
                    :class="isRowClickable(row) ? 'cursor-pointer hover:bg-gray-50' : ''"
                    @click="onRowClick(row)"
                  >
                    <td v-for="column in visibleColumns" :key="column" class="px-4 py-3 text-sm text-gray-900">
                      {{ formatCellValue(column, row[column]) }}
                    </td>
                  </tr>
                </tbody>
              </table>
              </div>

              <div class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
                <p class="text-xs text-gray-400">{{ sortedRows.length }} / {{ sortedRows.length }} {{ t("showingRecords") }}</p>
              </div>
            </div>
          </template>
        </SectionPanel>

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
import { computed, onBeforeUnmount, onMounted, reactive, ref, unref, watch } from "vue";
import { frappeRequest } from "frappe-ui";
import { useRoute, useRouter } from "vue-router";

import EmptyState from "../components/app-shell/EmptyState.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import ScheduledReportsManager from "../components/reports/ScheduledReportsManager.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import FilterPresetMenu from "../components/app-shell/FilterPresetMenu.vue";
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

const reportCatalog = {
  policy_list: {
    label: { tr: "Poliçe Listesi", en: "Policy List" },
    readMethod: "acentem_takipte.api.reports.get_policy_list_report",
    exportMethod: "acentem_takipte.api.reports.export_policy_list_report",
  },
  payment_status: {
    label: { tr: "Tahsilat Durumu", en: "Payment Status" },
    readMethod: "acentem_takipte.api.reports.get_payment_status_report",
    exportMethod: "acentem_takipte.api.reports.export_payment_status_report",
  },
  renewal_performance: {
    label: { tr: "Yenileme Performansı", en: "Renewal Performance" },
    readMethod: "acentem_takipte.api.reports.get_renewal_performance_report",
    exportMethod: "acentem_takipte.api.reports.export_renewal_performance_report",
  },
  claim_loss_ratio: {
    label: { tr: "Hasar/Prim Oranı", en: "Claim Loss Ratio" },
    readMethod: "acentem_takipte.api.reports.get_claim_loss_ratio_report",
    exportMethod: "acentem_takipte.api.reports.export_claim_loss_ratio_report",
  },
  agent_performance: {
    label: { tr: "Acente Üretim Karnesi", en: "Agency Performance Scorecard" },
    readMethod: "acentem_takipte.api.reports.get_agent_performance_report",
    exportMethod: "acentem_takipte.api.reports.export_agent_performance_report",
  },
  customer_segmentation: {
    label: { tr: "Müşteri Segmentasyonu", en: "Customer Segmentation" },
    readMethod: "acentem_takipte.api.reports.get_customer_segmentation_report",
    exportMethod: "acentem_takipte.api.reports.export_customer_segmentation_report",
  },
  communication_operations: {
    label: { tr: "İletişim Operasyonları", en: "Communication Operations" },
    readMethod: "acentem_takipte.api.reports.get_communication_operations_report",
    exportMethod: "acentem_takipte.api.reports.export_communication_operations_report",
  },
  reconciliation_operations: {
    label: { tr: "Mutabakat Operasyonları", en: "Reconciliation Operations" },
    readMethod: "acentem_takipte.api.reports.get_reconciliation_operations_report",
    exportMethod: "acentem_takipte.api.reports.export_reconciliation_operations_report",
  },
  claims_operations: {
    label: { tr: "Hasar Operasyonları", en: "Claims Operations" },
    readMethod: "acentem_takipte.api.reports.get_claims_operations_report",
    exportMethod: "acentem_takipte.api.reports.export_claims_operations_report",
  },
};

const columnLabels = {
  name: { tr: "Kayıt No", en: "Record Number" },
  customer: { tr: "Müşteri", en: "Customer" },
  customer_full_name: { tr: "Müşteri Ad Soyad", en: "Customer Full Name" },
  customer_tax_id: { tr: "TC/VKN", en: "Tax ID" },
  policy: { tr: "Poliçe", en: "Policy" },
  policy_no: { tr: "Sigorta Şirketi Poliçe No", en: "Carrier Policy Number" },
  office_branch: { tr: "Ofis Şube", en: "Office Branch" },
  branch: { tr: "Sigorta Branşı", en: "Insurance Branch" },
  insurance_company: { tr: "Sigorta Şirketi", en: "Insurance Company" },
  sales_entity: { tr: "Satış Birimi", en: "Sales Entity" },
  sales_entity_full_name: { tr: "Satış Birimi Ad Soyad", en: "Sales Entity Full Name" },
  assigned_agent: { tr: "Atanan Temsilci", en: "Assigned Agent" },
  status: { tr: "Durum", en: "Status" },
  claim_status: { tr: "Hasar Durumu", en: "Claim Status" },
  assigned_to: { tr: "Atanan Kişi", en: "Assigned To" },
  issue_date: { tr: "Tanzim Tarihi", en: "Issue Date" },
  period: { tr: "Dönem", en: "Period" },
  period_label: { tr: "Dönem Etiketi", en: "Period Label" },
  start_date: { tr: "Başlangıç Tarihi", en: "Start Date" },
  end_date: { tr: "Bitiş Tarihi", en: "End Date" },
  renewal_date: { tr: "Yenileme Tarihi", en: "Renewal Date" },
  due_date: { tr: "Vade Tarihi", en: "Due Date" },
  gross_premium: { tr: "Brüt Prim", en: "Gross Premium" },
  total_gross_premium: { tr: "Toplam Brüt Prim", en: "Total Gross Premium" },
  total_premium: { tr: "Toplam Prim", en: "Total Premium" },
  commission_amount: { tr: "Komisyon", en: "Commission" },
  total_commission: { tr: "Toplam Komisyon", en: "Total Commission" },
  paid_amount: { tr: "Ödenen", en: "Paid Amount" },
  approved_amount: { tr: "Onaylanan", en: "Approved Amount" },
  estimated_amount: { tr: "Tahmini Tutar", en: "Estimated Amount" },
  loss_ratio_percent: { tr: "Hasar/Prim Oranı", en: "Loss Ratio" },
  policy_count: { tr: "Poliçe Sayısı", en: "Policy Count" },
  active_policy_count: { tr: "Aktif Poliçe", en: "Active Policies" },
  cancelled_policy_count: { tr: "İptal Poliçe", en: "Cancelled Policies" },
  offer_count: { tr: "Teklif Sayısı", en: "Offer Count" },
  accepted_offer_count: { tr: "Kabul Edilen Teklif", en: "Accepted Offers" },
  converted_offer_count: { tr: "Poliçeye Dönüşen Teklif", en: "Converted Offers" },
  offer_conversion_rate: { tr: "Teklif Dönüşüm Oranı", en: "Offer Conversion Rate" },
  renewal_task_count: { tr: "Yenileme Görevi", en: "Renewal Tasks" },
  completed_renewal_task_count: { tr: "Tamamlanan Yenileme", en: "Completed Renewals" },
  open_renewal_task_count: { tr: "Açık Yenileme Yükü", en: "Open Renewal Load" },
  renewal_success_rate: { tr: "Yenileme Başarı Oranı", en: "Renewal Success Rate" },
  claim_count: { tr: "Hasar Sayısı", en: "Claim Count" },
  claim_history_segment: { tr: "Hasar Geçmişi", en: "Claim History" },
  loyalty_segment: { tr: "Sadakat Segmenti", en: "Loyalty Segment" },
  policy_segment: { tr: "Poliçe Segmenti", en: "Policy Segment" },
  premium_segment: { tr: "Prim Segmenti", en: "Premium Segment" },
  campaign_name: { tr: "Kampanya", en: "Campaign" },
  segment: { tr: "Segment", en: "Segment" },
  channel: { tr: "Kanal", en: "Channel" },
  scheduled_for: { tr: "Planlanan Çalışma", en: "Scheduled Run" },
  last_run_on: { tr: "Son Çalışma", en: "Last Run" },
  matched_customer_count: { tr: "Eşleşen Müşteri", en: "Matched Customers" },
  sent_count: { tr: "Üretilen Taslak", en: "Created Drafts" },
  skipped_count: { tr: "Atlanan", en: "Skipped" },
  draft_count: { tr: "Toplam Taslak", en: "Draft Count" },
  sent_outbox_count: { tr: "Başarılı Gönderim", en: "Successful Deliveries" },
  failed_outbox_count: { tr: "Hatalı Gönderim", en: "Failed Deliveries" },
  accounting_entry: { tr: "Muhasebe Kaydı", en: "Accounting Entry" },
  claim_no: { tr: "Hasar No", en: "Claim No" },
  source_doctype: { tr: "Kaynak Tipi", en: "Source Type" },
  source_name: { tr: "Kaynak Kayıt", en: "Source Record" },
  mismatch_type: { tr: "Uyumsuzluk Tipi", en: "Mismatch Type" },
  difference_try: { tr: "Fark Tutarı", en: "Difference Amount" },
  resolution_action: { tr: "Çözüm", en: "Resolution" },
  resolved_on: { tr: "Çözüm Tarihi", en: "Resolved On" },
  needs_reconciliation: { tr: "Mutabakat Gerekli", en: "Needs Reconciliation" },
  assigned_expert: { tr: "Eksper", en: "Assigned Expert" },
  rejection_reason: { tr: "Red Sebebi", en: "Rejection Reason" },
  appeal_status: { tr: "İtiraz Durumu", en: "Appeal Status" },
  next_follow_up_on: { tr: "Sonraki Takip", en: "Next Follow-up" },
  reported_date: { tr: "Bildirim Tarihi", en: "Reported Date" },
  unique_key: { tr: "Benzersiz Anahtar", en: "Unique Key" },
};

const reportFilterConfig = {
  policy_list: ["branch", "insuranceCompany", "policyNo", "customerTaxId", "status"],
  payment_status: ["branch", "insuranceCompany", "status"],
  renewal_performance: ["branch", "salesEntity", "status"],
  claim_loss_ratio: ["branch", "insuranceCompany", "status"],
  agent_performance: ["branch", "salesEntity"],
  customer_segmentation: ["branch", "salesEntity"],
  communication_operations: ["status"],
  reconciliation_operations: ["status"],
  claims_operations: ["branch", "insuranceCompany", "status"],
};

const filters = reactive({
  reportKey: props.initialReportKey || "policy_list",
  fromDate: "",
  toDate: "",
  branch: "",
  insuranceCompany: "",
  policyNo: "",
  customerTaxId: "",
  salesEntity: "",
  status: "",
});

const loading = ref(false);
const exportLoading = ref(false);
const scheduledLoading = ref(false);
const scheduledRunLoading = ref(false);
const snapshotRunLoading = ref(false);
const filtersSectionRef = ref(null);
const reportsAdvancedOpen = ref(false);
const activePreset = ref(""); // Seçili tarih aralığı preset'i
const error = ref("");
const columns = ref([]);
const rows = ref([]);
const comparisonRows = ref([]);
const scheduledReports = ref([]);
const visibleColumnKeys = ref([]);
const pendingVisibleColumnKeys = ref([]);
const sortState = reactive({
  column: "",
  direction: "",
});

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

const presetModelValue = computed(() => String(unref(presetKey) || "default"));
const presetOptionsList = computed(() => {
  const value = unref(presetOptions);
  return Array.isArray(value) ? value : [];
});
const canDeletePresetFlag = computed(() => Boolean(unref(canDeletePreset)));

function formatDateForInput(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateRangeForPreset(preset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (preset === "today") {
    return {
      fromDate: formatDateForInput(today),
      toDate: formatDateForInput(today),
    };
  }

  if (preset === "this_month") {
    const year = today.getFullYear();
    const month = today.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    return {
      fromDate: formatDateForInput(monthStart),
      toDate: formatDateForInput(monthEnd),
    };
  }

  if (preset === "this_year") {
    const year = today.getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    return {
      fromDate: formatDateForInput(yearStart),
      toDate: formatDateForInput(yearEnd),
    };
  }

  if (preset === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      fromDate: formatDateForInput(yesterday),
      toDate: formatDateForInput(yesterday),
    };
  }

  if (preset === "last_month") {
    const year = today.getFullYear();
    const month = today.getMonth() - 1;
    const lastMonthStart = new Date(year, month, 1);
    const lastMonthEnd = new Date(year, month + 1, 0);
    return {
      fromDate: formatDateForInput(lastMonthStart),
      toDate: formatDateForInput(lastMonthEnd),
    };
  }

  if (preset === "last_year") {
    const lastYear = today.getFullYear() - 1;
    const yearStart = new Date(lastYear, 0, 1);
    const yearEnd = new Date(lastYear, 11, 31);
    return {
      fromDate: formatDateForInput(yearStart),
      toDate: formatDateForInput(yearEnd),
    };
  }

  return { fromDate: "", toDate: "" };
}

function buildFiltersPayload() {
  return {
    from_date: filters.fromDate || null,
    to_date: filters.toDate || null,
    branch: visibleFilters.value.has("branch") ? filters.branch || null : null,
    insurance_company: visibleFilters.value.has("insuranceCompany") ? filters.insuranceCompany || null : null,
    policy_no: visibleFilters.value.has("policyNo") ? filters.policyNo || null : null,
    customer_tax_id: visibleFilters.value.has("customerTaxId") ? filters.customerTaxId || null : null,
    sales_entity: visibleFilters.value.has("salesEntity") ? filters.salesEntity || null : null,
    status: visibleFilters.value.has("status") ? filters.status || null : null,
    office_branch: branchStore.requestBranch || null,
  };
}

function shiftDateString(dateString, deltaDays) {
  const base = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(base.getTime())) {
    return "";
  }
  base.setDate(base.getDate() + deltaDays);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, "0");
  const day = String(base.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildPreviousPeriodFiltersPayload() {
  if (!comparisonEnabled.value) {
    return null;
  }
  const fromDate = new Date(`${filters.fromDate}T00:00:00`);
  const toDate = new Date(`${filters.toDate}T00:00:00`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || toDate < fromDate) {
    return null;
  }
  const diffDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
  return {
    ...buildFiltersPayload(),
    from_date: shiftDateString(filters.fromDate, -diffDays),
    to_date: shiftDateString(filters.toDate, -diffDays),
  };
}

function formatComparisonDelta(delta, previous) {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${numberFormatter.value.format(delta)} / ${numberFormatter.value.format(previous)}`;
}

function isFilterVisible(key) {
  return visibleFilters.value.has(key);
}

function getAdvancedFilterOptions(key) {
  const keyMap = {
    branch: ["branch"],
    insuranceCompany: ["insurance_company", "insuranceCompany"],
    policyNo: ["policy_no"],
    customerTaxId: ["customer_tax_id", "tax_id"],
    salesEntity: ["sales_entity", "salesEntity"],
    status: ["status", "claim_status"],
  };

  const sourceKeys = keyMap[key] || [key];
  const options = new Set();

  for (const row of rows.value || []) {
    for (const sourceKey of sourceKeys) {
      const raw = row?.[sourceKey];
      const value = typeof raw === "string" ? raw.trim() : String(raw || "").trim();
      if (value) {
        options.add(value);
      }
    }
  }

  return [...options]
    .sort((a, b) => a.localeCompare(b, localeCode.value))
    .slice(0, 80);
}

function getColumnLabel(column) {
  const entry = columnLabels[column];
  if (entry) {
    return entry[activeLocale.value] || entry.en || column;
  }
  return String(column)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isDateLikeValue(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getReportRowRoute(row) {
  if (!row || typeof row !== "object") {
    return null;
  }

  if (filters.reportKey === "policy_list" && row.name) {
    return { name: "policy-detail", params: { name: row.name } };
  }

  if (filters.reportKey === "payment_status" && row.name) {
    return { name: "payment-detail", params: { name: row.name } };
  }

  if (filters.reportKey === "renewal_performance" && row.name) {
    return { name: "renewal-task-detail", params: { name: row.name } };
  }

  if (filters.reportKey === "claims_operations" && row.name) {
    return { name: "claim-detail", params: { name: row.name } };
  }

  if (filters.reportKey === "agent_performance" && row.sales_entity) {
    return { name: "policy-list", query: { sales_entity: row.sales_entity } };
  }

  return null;
}

function isRowClickable(row) {
  return Boolean(getReportRowRoute(row));
}

function onRowClick(row) {
  const targetRoute = getReportRowRoute(row);
  if (!targetRoute) {
    return;
  }
  void router.push(targetRoute);
}

function formatCellValue(column, value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (["loss_ratio_percent", "offer_conversion_rate", "renewal_success_rate"].includes(column)) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? `%${percentFormatter.value.format(numeric)}` : String(value);
  }

  if (typeof value === "number") {
    return numberFormatter.value.format(value);
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    const numericColumns = new Set([
      "gross_premium",
      "total_gross_premium",
      "total_premium",
      "commission_amount",
      "total_commission",
      "paid_amount",
      "approved_amount",
      "estimated_amount",
      "policy_count",
      "offer_count",
      "accepted_offer_count",
      "renewal_task_count",
      "claim_count",
    ]);

    if (numericColumns.has(column) && Number.isFinite(numeric)) {
      return numberFormatter.value.format(numeric);
    }

    if (isDateLikeValue(value)) {
      const parsed = new Date(`${value}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        return dateFormatter.value.format(parsed);
      }
    }
  }

  return String(value);
}

function normalizeSortableValue(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    if (isDateLikeValue(value)) {
      return value;
    }
    const numeric = Number(value);
    if (Number.isFinite(numeric) && value.trim() !== "") {
      return numeric;
    }
    return value.toLocaleLowerCase(localeCode.value);
  }
  return String(value);
}

function clearHiddenFilters() {
  if (!visibleFilters.value.has("branch")) {
    filters.branch = "";
  }
  if (!visibleFilters.value.has("insuranceCompany")) {
    filters.insuranceCompany = "";
  }
  if (!visibleFilters.value.has("policyNo")) {
    filters.policyNo = "";
  }
  if (!visibleFilters.value.has("customerTaxId")) {
    filters.customerTaxId = "";
  }
  if (!visibleFilters.value.has("salesEntity")) {
    filters.salesEntity = "";
  }
  if (!visibleFilters.value.has("status")) {
    filters.status = "";
  }
}

function syncReportKeyFromRoute() {
  const requestedReport = String(route.query?.report || "");
  if (requestedReport && reportCatalog[requestedReport]) {
    filters.reportKey = requestedReport;
  }
}

function persistReportKeyToRoute() {
  const nextQuery = {
    ...route.query,
    report: filters.reportKey,
  };
  if (JSON.stringify(nextQuery) === JSON.stringify(route.query || {})) {
    return;
  }
  void router.replace({ query: nextQuery });
}

function getViewStorageKey() {
  return `at:reports:view:${filters.reportKey}`;
}

function getSafeLocalStorage() {
  const storage = window?.localStorage;
  if (!storage) return null;
  return typeof storage.getItem === "function" && typeof storage.setItem === "function" ? storage : null;
}

// Column renames between releases — maps old key → new key per report
const COLUMN_MIGRATIONS = {
  policy_list: {
    customer: "customer_full_name",
    sales_entity: "sales_entity_full_name",
  },
};

function migrateColumnKeys(reportKey, keys) {
  const renames = COLUMN_MIGRATIONS[reportKey];
  if (!renames || !keys.length) return keys;
  const migrated = keys.map((k) => renames[k] ?? k);
  // Insert customer_tax_id right after customer_full_name when customer was present
  if (keys.includes("customer") && !migrated.includes("customer_tax_id")) {
    const insertAt = migrated.indexOf("customer_full_name");
    if (insertAt !== -1) migrated.splice(insertAt + 1, 0, "customer_tax_id");
    else migrated.push("customer_tax_id");
  }
  return migrated;
}

function applyViewState(payload = {}) {
  const rawKeys = Array.isArray(payload?.visibleColumnKeys)
    ? payload.visibleColumnKeys.filter((item) => typeof item === "string" && item)
    : [];
  const columnKeys = migrateColumnKeys(filters.reportKey, rawKeys);

  pendingVisibleColumnKeys.value = [...columnKeys];
  visibleColumnKeys.value = columnKeys.length
    ? columns.value.filter((column) => columnKeys.includes(column))
    : [...columns.value];

  sortState.column = typeof payload?.sortColumn === "string" && payload.sortColumn ? payload.sortColumn : "";
  sortState.direction = payload?.sortDirection === "asc" || payload?.sortDirection === "desc" ? payload.sortDirection : "";
}

function buildViewStatePayload() {
  return {
    visibleColumnKeys: [...visibleColumnKeys.value],
    sortColumn: sortState.column || "",
    sortDirection: sortState.direction || "",
  };
}

function persistViewStateToStorage() {
  try {
    const storage = getSafeLocalStorage();
    if (!storage) return;
    storage.setItem(getViewStorageKey(), JSON.stringify(buildViewStatePayload()));
  } catch (err) {
    error.value = String(err?.message || err || t("viewStateError"));
  }
}

function syncViewStateFromStorage() {
  try {
    const storage = getSafeLocalStorage();
    if (!storage) {
      applyViewState({});
      return;
    }
    const raw = storage.getItem(getViewStorageKey());
    if (!raw) {
      applyViewState({});
      return;
    }
    applyViewState(JSON.parse(raw));
  } catch {
    applyViewState({});
  }
}

function syncViewStateFromRoute() {
  const visibleColumnsFromRoute = String(route.query?.report_cols || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  applyViewState({
    visibleColumnKeys: visibleColumnsFromRoute,
    sortColumn: String(route.query?.report_sort || ""),
    sortDirection: String(route.query?.report_dir || ""),
  });
}

function persistViewStateToRoute() {
  const nextQuery = {
    ...route.query,
    report: filters.reportKey,
    report_cols: visibleColumnKeys.value.length ? visibleColumnKeys.value.join(",") : undefined,
    report_sort: sortState.column || undefined,
    report_dir: sortState.direction || undefined,
  };

  if (JSON.stringify(nextQuery) === JSON.stringify(route.query || {})) {
    return;
  }

  void router.replace({ query: nextQuery });
}

async function loadReport() {
  loading.value = true;
  error.value = "";
  try {
    const payload = await frappeRequest({
      url: `/api/method/${reportCatalog[filters.reportKey].readMethod}`,
      method: "GET",
      params: {
        filters: JSON.stringify(buildFiltersPayload()),
        limit: 500,
      },
    });
    const message = payload?.message || payload || {};
    columns.value = message.columns || [];
    rows.value = message.rows || [];
    comparisonRows.value = [];

    const previousFilters = buildPreviousPeriodFiltersPayload();
    if (previousFilters) {
      const comparisonPayload = await frappeRequest({
        url: `/api/method/${reportCatalog[filters.reportKey].readMethod}`,
        method: "GET",
        params: {
          filters: JSON.stringify(previousFilters),
          limit: 500,
        },
      });
      const comparisonMessage = comparisonPayload?.message || comparisonPayload || {};
      comparisonRows.value = Array.isArray(comparisonMessage.rows) ? comparisonMessage.rows : [];
    }
  } catch (err) {
    const errorMessage =
      err?.response?.message
      || (Array.isArray(err?.messages) && err.messages[0])
      || err?.message
      || t("loadErrorTitle");
    error.value = String(errorMessage);
    columns.value = [];
    rows.value = [];
    comparisonRows.value = [];
  } finally {
    loading.value = false;
  }
}

function scheduleReportLoad({ immediate = false } = {}) {
  const runLoad = () => {
    reportLoadTimer = null;
    void loadReport();
  };

  if (immediate) {
    if (reportLoadTimer) {
      window.clearTimeout(reportLoadTimer);
      reportLoadTimer = null;
    }
    runLoad();
    return;
  }

  if (reportLoadTimer) {
    window.clearTimeout(reportLoadTimer);
  }
  reportLoadTimer = window.setTimeout(runLoad, REPORT_LOAD_DEBOUNCE_MS);
}

async function downloadReport(format) {
  exportLoading.value = true;
  try {
    const method = reportCatalog[filters.reportKey].exportMethod;
    const params = new URLSearchParams({
      filters: JSON.stringify(buildFiltersPayload()),
      export_format: format,
      limit: "1000",
    });
    const popup = window.open(`/api/method/${method}?${params.toString()}`, "_blank", "noopener");
    if (!popup) {
      throw new Error("Popup blocked");
    }
  } catch (err) {
    error.value = String(err?.message || err || t("exportError"));
  } finally {
    exportLoading.value = false;
  }
}

async function loadScheduledReports() {
  if (!canManageScheduledReports.value) {
    scheduledReports.value = [];
    return;
  }

  scheduledLoading.value = true;
  try {
    const payload = await frappeRequest({
      url: "/api/method/acentem_takipte.api.reports.get_scheduled_report_configs",
      method: "GET",
    });
    const message = payload?.message || payload || {};
    scheduledReports.value = Array.isArray(message.items) ? message.items : [];
  } catch (err) {
    error.value = String(err?.message || err || t("scheduledLoadError"));
    scheduledReports.value = [];
  } finally {
    scheduledLoading.value = false;
  }
}

async function runScheduledReports() {
  scheduledRunLoading.value = true;
  try {
    await frappeRequest({
      url: "/api/method/acentem_takipte.api.admin_jobs.run_scheduled_reports_job",
      method: "POST",
      params: {
        frequency: "daily",
        limit: 10,
      },
    });
    await loadScheduledReports();
  } catch (err) {
    error.value = String(err?.message || err || t("scheduledRunError"));
  } finally {
    scheduledRunLoading.value = false;
  }
}

async function runCustomerSegmentSnapshots() {
  snapshotRunLoading.value = true;
  try {
    await frappeRequest({
      url: "/api/method/acentem_takipte.api.admin_jobs.run_customer_segment_snapshot_job",
      method: "POST",
      params: {
        limit: 250,
      },
    });
  } catch (err) {
    error.value = String(err?.message || err || t("segmentSnapshotRunError"));
  } finally {
    snapshotRunLoading.value = false;
  }
}

async function saveScheduledReport({ index, config }) {
  try {
    await frappeRequest({
      url: "/api/method/acentem_takipte.api.reports.save_scheduled_report_config",
      method: "POST",
      params: {
        index: index || "",
        config,
      },
    });
    await loadScheduledReports();
  } catch (err) {
    error.value = String(err?.message || err || t("scheduledSaveError"));
  }
}

async function removeScheduledReport(index) {
  try {
    await frappeRequest({
      url: "/api/method/acentem_takipte.api.reports.remove_scheduled_report_config",
      method: "POST",
      params: { index },
    });
    await loadScheduledReports();
  } catch (err) {
    error.value = String(err?.message || err || t("scheduledDeleteError"));
  }
}

function resetFilters() {
  applyPreset("default", { refresh: false });
  void loadReport();
}

function isColumnVisible(column) {
  return visibleColumns.value.includes(column);
}

function toggleColumn(column) {
  if (visibleColumnKeys.value.includes(column)) {
    if (visibleColumnKeys.value.length === 1) {
      return;
    }
    visibleColumnKeys.value = visibleColumnKeys.value.filter((item) => item !== column);
    if (!visibleColumnKeys.value.includes(sortState.column)) {
      sortState.column = "";
      sortState.direction = "";
    }
    return;
  }
  visibleColumnKeys.value = [...visibleColumnKeys.value, column];
}

function showAllColumns() {
  visibleColumnKeys.value = [...columns.value];
}

function focusFilters() {
  const root = filtersSectionRef.value?.$el || filtersSectionRef.value;
  if (root && typeof root.scrollIntoView === "function") {
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function toggleSort(column) {
  if (sortState.column !== column) {
    sortState.column = column;
    sortState.direction = "asc";
    return;
  }
  if (sortState.direction === "asc") {
    sortState.direction = "desc";
    return;
  }
  if (sortState.direction === "desc") {
    sortState.column = "";
    sortState.direction = "";
    return;
  }
  sortState.direction = "asc";
}

function getSortIndicator(column) {
  if (sortState.column !== column) {
    return "|";
  }
  return sortState.direction === "desc" ? "v" : "^";
}

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

function applyDatePreset(preset) {
  activePreset.value = String(preset || "");
  if (!activePreset.value) {
    return;
  }
  const dateRange = getDateRangeForPreset(preset);
  filters.fromDate = dateRange.fromDate;
  filters.toDate = dateRange.toDate;
  scheduleReportLoad();
}

function isActivePresetRange() {
  if (!activePreset.value) {
    return false;
  }
  const range = getDateRangeForPreset(activePreset.value);
  return filters.fromDate === range.fromDate && filters.toDate === range.toDate;
}

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

onBeforeUnmount(() => {
  if (reportLoadTimer) {
    window.clearTimeout(reportLoadTimer);
    reportLoadTimer = null;
  }
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
