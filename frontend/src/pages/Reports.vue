<template>
  <section class="page-shell space-y-4">
    <div class="detail-topbar flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="detail-breadcrumb">Kontrol Merkezi / Raporlar</p>
        <h1 class="detail-title">{{ t("title") }}</h1>
        <p class="detail-subtitle">{{ t("subtitle") }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <ActionButton variant="secondary" size="sm" :disabled="loading" @click="loadReport">
          {{ t("refresh") }}
        </ActionButton>
        <ActionButton variant="secondary" size="sm" :disabled="loading || exportLoading" @click="downloadReport('xlsx')">
          {{ t("exportXlsx") }}
        </ActionButton>
        <ActionButton variant="primary" size="sm" :disabled="loading || exportLoading" @click="downloadReport('pdf')">
          {{ t("exportPdf") }}
        </ActionButton>
        <span class="text-sm text-slate-400">{{ sortedRows.length }} {{ t("recordCount") }}</span>
      </div>
    </div>

    <section class="w-full grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article
        v-for="item in summaryItems"
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
      </article>
    </section>

    <section v-if="comparisonSummaryItems.length" class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-sm font-semibold text-slate-900">{{ t("comparisonSummaryTitle") }}</h3>
        <span class="text-[11px] font-medium text-slate-500">{{ t("comparisonSummaryHint") }}</span>
      </div>
      <div class="w-full grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
    </section>

    <SectionPanel
      :title="t('filtersTitle')"
      :count="`${activeFilterCount} ${t('activeFilters')}`"
      panel-class="surface-card rounded-2xl p-4"
    >
      <WorkbenchFilterToolbar
        v-model="presetKey"
        :advanced-label="t('advancedFilters')"
        :collapse-label="t('hideAdvancedFilters')"
        :active-count="activeFilterCount"
        :active-count-label="t('activeFilters')"
        :preset-label="t('presetLabel')"
        :preset-options="presetOptions"
        :can-delete-preset="canDeletePreset"
        :save-label="t('savePreset')"
        :delete-label="t('deletePreset')"
        :apply-label="t('applyFilters')"
        :reset-label="t('clearFilters')"
        @preset-change="onPresetChange"
        @preset-save="savePreset"
        @preset-delete="deletePreset"
        @apply="loadReport"
        @reset="resetFilters"
      >
        <select v-model="filters.reportKey" class="input">
          <option v-for="option in reportOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <input v-model="filters.fromDate" class="input" type="date" />
        <input v-model="filters.toDate" class="input" type="date" />

        <template #advanced>
          <input
            v-if="isFilterVisible('branch')"
            v-model.trim="filters.branch"
            class="input"
            type="search"
            :placeholder="t('branchFilter')"
          />
          <input
            v-if="isFilterVisible('insuranceCompany')"
            v-model.trim="filters.insuranceCompany"
            class="input"
            type="search"
            :placeholder="t('companyFilter')"
          />
          <input
            v-if="isFilterVisible('salesEntity')"
            v-model.trim="filters.salesEntity"
            class="input"
            type="search"
            :placeholder="t('salesEntityFilter')"
          />
          <input
            v-if="isFilterVisible('status')"
            v-model.trim="filters.status"
            class="input"
            type="search"
            :placeholder="t('statusFilter')"
          />
        </template>
      </WorkbenchFilterToolbar>
    </SectionPanel>

    <SectionPanel
      :title="activeReportLabel"
      :count="sortedRows.length"
      :meta="branchScopeLabel"
      panel-class="surface-card rounded-2xl p-5"
    >
      <div class="mt-1 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span v-if="exportLoading">{{ t("exporting") }}</span>
      </div>

      <div class="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{{ t("columns") }}</p>
            <p class="text-xs text-slate-500">{{ t("columnHint") }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
              {{ columnsSummaryLabel }}
            </span>
            <button
              type="button"
              class="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
              @click="showAllColumns"
            >
              {{ t("showAllColumns") }}
            </button>
          </div>
        </div>

        <div
          class="mt-4 grid gap-3"
          :class="hiddenColumns.length ? 'xl:grid-cols-2' : 'xl:grid-cols-1'"
        >
          <div class="rounded-2xl border border-sky-100 bg-sky-50/60 p-3">
            <div class="flex items-center justify-between gap-2">
              <div class="space-y-1">
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">{{ t("selectedColumns") }}</p>
                <p class="text-xs text-sky-700/80">{{ t("columnHint") }}</p>
              </div>
              <span class="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-sky-700 shadow-sm">
                {{ visibleColumns.length }}
              </span>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="column in visibleColumns"
                :key="`visible-${column}`"
                type="button"
                class="report-chip report-chip--active rounded-full"
                @click="toggleColumn(column)"
              >
                <span class="report-chip__dot" />
                {{ getColumnLabel(column) }}
              </button>
            </div>
          </div>

          <div v-if="hiddenColumns.length" class="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
            <div class="flex items-center justify-between gap-2">
              <div class="space-y-1">
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{{ t("hiddenColumns") }}</p>
                <p class="text-xs text-slate-500">{{ t("showAllColumns") }} ile geri açılabilir.</p>
              </div>
              <span class="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 shadow-sm">
                {{ hiddenColumns.length }}
              </span>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="column in hiddenColumns"
                :key="`hidden-${column}`"
                type="button"
                class="report-chip report-chip--hidden rounded-full"
                @click="toggleColumn(column)"
              >
                {{ getColumnLabel(column) }}
              </button>
            </div>
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

        <div class="mt-4 overflow-auto">
          <table class="at-table">
            <thead>
              <tr class="at-table-head-row">
                <th v-for="column in visibleColumns" :key="column" class="at-table-head-cell">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 text-left transition hover:text-slate-900"
                    @click="toggleSort(column)"
                  >
                    <span>{{ getColumnLabel(column) }}</span>
                    <span class="text-[10px] text-slate-400">{{ getSortIndicator(column) }}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in sortedRows" :key="row.name || rowIndex" class="at-table-row">
                <td v-for="column in visibleColumns" :key="column" class="at-table-cell text-sm text-slate-700">
                  {{ formatCellValue(column, row[column]) }}
                </td>
                </tr>
              </tbody>
            </table>
        </div>
      </template>
    </SectionPanel>

    <SectionPanel
      v-if="canManageScheduledReports"
      :title="t('scheduledTitle')"
      :meta="t('scheduledEmpty')"
      :count="scheduledReports.length"
      panel-class="surface-card rounded-2xl p-5 space-y-4"
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
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <div class="space-y-1">
          <h4 class="text-sm font-semibold text-slate-900">{{ t("segmentSnapshotTitle") }}</h4>
          <p class="text-xs text-slate-500">{{ t("segmentSnapshotHint") }}</p>
        </div>
        <ActionButton
          variant="secondary"
          size="sm"
          data-testid="run-segment-snapshot-job"
          :disabled="snapshotRunLoading"
          @click="runCustomerSegmentSnapshots"
        >
          {{ snapshotRunLoading ? t("runningSegmentSnapshots") : t("runSegmentSnapshots") }}
        </ActionButton>
      </div>
    </SectionPanel>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, unref, watch } from "vue";
import { frappeRequest } from "frappe-ui";
import { useRoute, useRouter } from "vue-router";

import ActionButton from "../components/app-shell/ActionButton.vue";
import EmptyState from "../components/app-shell/EmptyState.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
import ScheduledReportsManager from "../components/reports/ScheduledReportsManager.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
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
    title: "Raporlar",
    subtitle: "Şube duyarlı raporlama ve dışa aktarma merkezi",
    refresh: "Yenile",
    exportPdf: "PDF",
    exportXlsx: "Excel",
    recordCount: "kayıt",
    filtersTitle: "Filtreler",
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
  },
  en: {
    title: "Reports",
    subtitle: "Branch-aware BI and export hub",
    refresh: "Refresh",
    exportPdf: "PDF",
    exportXlsx: "Excel",
    recordCount: "records",
    filtersTitle: "Filters",
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
    readMethod: "acentem_takipte.acentem_takipte.api.reports.get_policy_list_report",
    exportMethod: "acentem_takipte.acentem_takipte.api.reports.export_policy_list_report",
  },
  payment_status: {
    label: { tr: "Tahsilat Durumu", en: "Payment Status" },
    readMethod: "acentem_takipte.acentem_takipte.api.reports.get_payment_status_report",
    exportMethod: "acentem_takipte.acentem_takipte.api.reports.export_payment_status_report",
  },
  renewal_performance: {
    label: { tr: "Yenileme Performansı", en: "Renewal Performance" },
    readMethod: "acentem_takipte.acentem_takipte.api.reports.get_renewal_performance_report",
    exportMethod: "acentem_takipte.acentem_takipte.api.reports.export_renewal_performance_report",
  },
  claim_loss_ratio: {
    label: { tr: "Hasar/Prim Oranı", en: "Claim Loss Ratio" },
    readMethod: "acentem_takipte.acentem_takipte.api.reports.get_claim_loss_ratio_report",
    exportMethod: "acentem_takipte.acentem_takipte.api.reports.export_claim_loss_ratio_report",
  },
  agent_performance: {
    label: { tr: "Acente Üretim Karnesi", en: "Agency Performance Scorecard" },
    readMethod: "acentem_takipte.acentem_takipte.api.reports.get_agent_performance_report",
    exportMethod: "acentem_takipte.acentem_takipte.api.reports.export_agent_performance_report",
  },
  customer_segmentation: {
    label: { tr: "Müşteri Segmentasyonu", en: "Customer Segmentation" },
    readMethod: "acentem_takipte.acentem_takipte.api.reports.get_customer_segmentation_report",
    exportMethod: "acentem_takipte.acentem_takipte.api.reports.export_customer_segmentation_report",
  },
  communication_operations: {
    label: { tr: "İletişim Operasyonları", en: "Communication Operations" },
    readMethod: "acentem_takipte.acentem_takipte.api.reports.get_communication_operations_report",
    exportMethod: "acentem_takipte.acentem_takipte.api.reports.export_communication_operations_report",
  },
  reconciliation_operations: {
    label: { tr: "Mutabakat Operasyonları", en: "Reconciliation Operations" },
    readMethod: "acentem_takipte.acentem_takipte.api.reports.get_reconciliation_operations_report",
    exportMethod: "acentem_takipte.acentem_takipte.api.reports.export_reconciliation_operations_report",
  },
  claims_operations: {
    label: { tr: "Hasar Operasyonları", en: "Claims Operations" },
    readMethod: "acentem_takipte.acentem_takipte.api.reports.get_claims_operations_report",
    exportMethod: "acentem_takipte.acentem_takipte.api.reports.export_claims_operations_report",
  },
};

const columnLabels = {
  name: { tr: "Kayıt No", en: "Record Number" },
  customer: { tr: "Müşteri", en: "Customer" },
  policy: { tr: "Poliçe", en: "Policy" },
  policy_no: { tr: "Sigorta Şirketi Poliçe No", en: "Carrier Policy Number" },
  office_branch: { tr: "Ofis Şube", en: "Office Branch" },
  branch: { tr: "Sigorta Branşı", en: "Insurance Branch" },
  insurance_company: { tr: "Sigorta Şirketi", en: "Insurance Company" },
  sales_entity: { tr: "Satış Birimi", en: "Sales Entity" },
  assigned_agent: { tr: "Atanan Temsilci", en: "Assigned Agent" },
  status: { tr: "Durum", en: "Status" },
  claim_status: { tr: "Hasar Durumu", en: "Claim Status" },
  assigned_to: { tr: "Atanan Kişi", en: "Assigned To" },
    issue_date: { tr: "Tanzim Tarihi", en: "Issue Date" },
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
  policy_list: ["branch", "insuranceCompany", "status"],
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
  salesEntity: "",
  status: "",
});

const loading = ref(false);
const exportLoading = ref(false);
const scheduledLoading = ref(false);
const scheduledRunLoading = ref(false);
const snapshotRunLoading = ref(false);
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
  if (visibleFilters.value.has("salesEntity") && filters.salesEntity) count += 1;
  if (visibleFilters.value.has("status") && filters.status) count += 1;
  return count;
});

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

const metricToneClasses = {
  rows: "text-slate-900",
  gross_premium: "text-sky-700",
  commission: "text-emerald-700",
  paid_amount: "text-amber-700",
  active_policies: "text-emerald-700",
  conversion_rate: "text-sky-700",
  open_renewals: "text-amber-700",
  loyal_customers: "text-slate-900",
  claim_customers: "text-amber-700",
  matched_customers: "text-emerald-700",
  created_drafts: "text-sky-700",
  successful_deliveries: "text-emerald-700",
  open_reconciliation: "text-amber-700",
  difference_amount: "text-sky-700",
  resolved_items: "text-emerald-700",
  open_claims: "text-amber-700",
  rejected_claims: "text-amber-700",
  successful_notifications: "text-emerald-700",
};
const buildMetricItem = (key, label, value, extra = {}) => ({
  key,
  label,
  value,
  valueClass: metricToneClasses[key] || "text-slate-900",
  cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm",
  ...extra,
});

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
    }),
    setFilterStateFromPayload: (payload) => {
      filters.reportKey = String(payload?.reportKey || "policy_list");
      filters.fromDate = String(payload?.fromDate || "");
      filters.toDate = String(payload?.toDate || "");
      filters.branch = String(payload?.branch || "");
      filters.insuranceCompany = String(payload?.insuranceCompany || "");
      filters.salesEntity = String(payload?.salesEntity || "");
      filters.status = String(payload?.status || "");
    },
    resetFilterState: () => {
      filters.reportKey = "policy_list";
      filters.fromDate = "";
      filters.toDate = "";
      filters.branch = "";
      filters.insuranceCompany = "";
      filters.salesEntity = "";
      filters.status = "";
    },
    refresh: () => loadReport(),
    getSortLocale: () => localeCode.value,
  });

function buildFiltersPayload() {
  return {
    from_date: filters.fromDate || null,
    to_date: filters.toDate || null,
    branch: visibleFilters.value.has("branch") ? filters.branch || null : null,
    insurance_company: visibleFilters.value.has("insuranceCompany") ? filters.insuranceCompany || null : null,
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

function applyViewState(payload = {}) {
  const columnKeys = Array.isArray(payload?.visibleColumnKeys)
    ? payload.visibleColumnKeys.filter((item) => typeof item === "string" && item)
    : [];

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
      url: "/api/method/acentem_takipte.acentem_takipte.api.reports.get_scheduled_report_configs",
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
      url: "/api/method/acentem_takipte.acentem_takipte.api.admin_jobs.run_scheduled_reports_job",
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
      url: "/api/method/acentem_takipte.acentem_takipte.api.admin_jobs.run_customer_segment_snapshot_job",
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
      url: "/api/method/acentem_takipte.acentem_takipte.api.reports.save_scheduled_report_config",
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
      url: "/api/method/acentem_takipte.acentem_takipte.api.reports.remove_scheduled_report_config",
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
</style>
