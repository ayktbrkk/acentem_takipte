<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="formatCount(policyListTotalCount)"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <PolicyListActionBar
        :t="t"
        :loading="policyLoading"
        @focus-filters="focusPolicySearch"
        @export="downloadPolicyExport"
        @new-policy="openQuickPolicyDialog"
      />
    </template>

    <template #metrics>
      <PolicyListMetricsPanel :t="t" :summary="policySummary" :format-count="formatCount" :format-currency="formatCurrency" />
    </template>

    <article v-if="policyListError" class="qc-error-banner">
      <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
      <p class="qc-error-banner__text mt-1">{{ policyListError }}</p>
    </article>

    <PolicyListFilterSection
      v-model:search="policyListSearchQuery"
      :t="t"
      :filters="policyListFilterConfig"
      :active-count="policyListActiveCount"
      :loading="policyLoading"
      :form-filters="filters"
      :pagination="pagination"
      @filter-change="onPolicyListFilterChange"
      @reset="onPolicyListFilterReset"
      @refresh="refreshPolicyList"
    />

    <PolicyListTableSection
      :t="t"
      :columns="policyListColumns"
      :rows="policyListRowsWithUrgency"
      :loading="policyLoading"
      :total-count="policyListTotalCount"
      :total-pages="policyListTotalPages"
      :page-rows="policyListPagedRows"
      :page="policyListPage"
      :format-count="formatCount"
      @row-click="(row) => openPolicyDetail(row.name)"
      @update-page="setPolicyListPage"
    />

    <PolicyListQuickPolicyDialog
      v-model:show="showQuickPolicyDialog"
      :ui="quickPolicyUi"
      :dialog-key="quickPolicyDialogKey"
      :model="quickPolicyForm"
      :field-errors="quickPolicyFieldErrors"
      :options-map="policyQuickOptionsMap"
      :loading="quickPolicyLoading"
      :has-source-offer="hasQuickPolicySourceOffer"
      :office-branch="branchStore.requestBranch || ''"
      :error="quickPolicyError"
      @cancel="cancelQuickPolicyDialog"
      @submit="submitQuickPolicy(false)"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, unref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { usePolicyStore } from "../stores/policy";
import { usePolicyListFilters } from "../composables/usePolicyListFilters";
import { usePolicyListPresetSync } from "../composables/usePolicyListPresetSync";
import { usePolicyListTableData } from "../composables/usePolicyListTableData";
import { usePolicyListRuntime } from "../composables/usePolicyListRuntime";
import { usePolicyQuickCreateRuntime } from "../composables/usePolicyQuickCreateRuntime";
import PolicyListActionBar from "../components/policy-list/PolicyListActionBar.vue";
import PolicyListMetricsPanel from "../components/policy-list/PolicyListMetricsPanel.vue";
import PolicyListFilterSection from "../components/policy-list/PolicyListFilterSection.vue";
import PolicyListTableSection from "../components/policy-list/PolicyListTableSection.vue";
import PolicyListQuickPolicyDialog from "../components/policy-list/PolicyListQuickPolicyDialog.vue";
import DataTableCell from "../components/app-shell/DataTableCell.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import { getLocalizedText } from "../config/quickCreateRegistry";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const branchStore = useBranchStore();
const policyStore = usePolicyStore();
let persistPolicyPresetStateToServer = () => Promise.resolve();

const copy = {
  tr: {
    breadcrumb: "Sigorta Operasyonları → Poliçeler",
    title: "Poliçe Yönetimi",
    subtitle: "Poliçe listesini filtreleyin, sıralayın ve sayfalayın",
    recordCount: "kayıt",
    refresh: "Yenile",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    newPolicy: "+ Yeni Poliçe",
    focusFilters: "Filtrele",
    filtersTitle: "Filtreler",
    policyTableTitle: "Poliçe Listesi",
    summaryTotal: "Toplam Poliçe",
    summaryActive: "Aktif",
    summaryPending: "Beklemede",
    summaryTotalPremium: "Toplam Prim",
    allCompanies: "Tüm Sigorta Şirketleri",
    searchPlaceholder: "Poliçe / Müşteri / Kayıt ara",
    endDateFilter: "Bitiş Tarihi",
    allStatuses: "Tüm Durumlar",
    advancedFilters: "Gelişmiş Filtreler",
    hideAdvancedFilters: "Gelişmiş Filtreleri Gizle",
    activeFilters: "aktif filtre",
    presetLabel: "Filtre Şablonu",
    presetDefault: "Standart",
    presetActive: "Aktif Poliçeler",
    presetExpiring30: "30 Gün İçinde Bitecek",
    presetHighPremium: "Yüksek Prim",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    savePresetPrompt: "Filtre şablonu adı",
    deletePresetConfirm: "Seçili özel filtre şablonu silinsin mi?",
    applyFilters: "Uygula",
    clearFilters: "Filtreleri Temizle",
    mobileSummaryTitle: "Liste Özeti",
    pageSize: "Sayfa Boyutu",
    showingRecords: "kayıt gösteriliyor",
    customerFilter: "Müşteri (içerir)",
    grossMinFilter: "Min Brüt Prim",
    grossMaxFilter: "Max Brüt Prim",
    showing: "Gösterilen",
    loading: "Yükleniyor...",
    emptyTitle: "Poliçe Bulunamadı",
    empty: "Filtrelere uygun poliçe kaydı bulunamadı.",
    loadErrorTitle: "Liste Yüklenemedi",
    loadError: "Poliçe listesi yüklenirken bir hata oluştu. Lütfen tekrar deneyin.",
    openDesk: "Yönetim Ekranını Aç",
    page: "Sayfa",
    previous: "Önceki",
    next: "Sonraki",
    colPolicy: "Poliçe",
    recordNo: "Kayıt No",
    carrierPolicyNo: "Şirket Poliçe No",
    colCustomer: "Müşteri",
    colCompany: "Sigorta Şirketi",
    colEndDate: "Bitiş Tarihi",
    colDetails: "Detaylar",
    colStatus: "Poliçe Durumu",
    colPremiums: "Primler",
    colGross: "Brüt Prim",
    colCommission: "Komisyon",
    colGwpTry: "GWP TRY",
    colActions: "Aksiyon",
    sortModifiedDesc: "Son Güncellenen",
    sortEndDateAsc: "Bitiş Tarihi (Yakın)",
    sortEndDateDesc: "Bitiş Tarihi (Uzak)",
    sortGrossDesc: "Brüt Prim (Yüksek)",
  },
  en: {
    breadcrumb: "Insurance Operations → Policies",
    title: "Policy Workbench",
    subtitle: "Filter, sort, and paginate the policy list",
    recordCount: "records",
    refresh: "Refresh",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    newPolicy: "+ New Policy",
    focusFilters: "Focus Filters",
    filtersTitle: "Filters",
    policyTableTitle: "Policy List",
    summaryTotal: "Total Policies",
    summaryActive: "Active",
    summaryPending: "Pending",
    summaryTotalPremium: "Total Premium",
    allCompanies: "All Insurance Companies",
    searchPlaceholder: "Search policy / customer / record",
    endDateFilter: "End Date",
    allStatuses: "All Statuses",
    advancedFilters: "Advanced Filters",
    hideAdvancedFilters: "Hide Advanced Filters",
    activeFilters: "active filters",
    presetLabel: "Filter Preset",
    presetDefault: "Standard",
    presetActive: "Active Policies",
    presetExpiring30: "Expiring in 30 Days",
    presetHighPremium: "High Premium",
    savePreset: "Save",
    deletePreset: "Delete",
    savePresetPrompt: "Filter preset name",
    deletePresetConfirm: "Delete selected custom filter preset?",
    applyFilters: "Apply",
    clearFilters: "Clear Filters",
    mobileSummaryTitle: "List Summary",
    pageSize: "Page Size",
    showingRecords: "records shown",
    customerFilter: "Customer (contains)",
    grossMinFilter: "Min Gross Premium",
    grossMaxFilter: "Max Gross Premium",
    showing: "Showing",
    loading: "Loading...",
    emptyTitle: "No Policies Found",
    empty: "No policy records found for current filters.",
    loadErrorTitle: "Failed to Load List",
    loadError: "An error occurred while loading policies. Please try again.",
    openDesk: "Open Desk",
    page: "Page",
    previous: "Previous",
    next: "Next",
    colPolicy: "Policy",
    recordNo: "Record No",
    carrierPolicyNo: "Carrier Policy No",
    colCustomer: "Customer",
    colCompany: "Insurance Company",
    colEndDate: "End Date",
    colDetails: "Details",
    colStatus: "Policy Status",
    colPremiums: "Premiums",
    colGross: "Gross Premium",
    colCommission: "Commission",
    colGwpTry: "GWP TRY",
    colActions: "Actions",
    sortModifiedDesc: "Last Modified",
    sortEndDateAsc: "End Date (Soonest)",
    sortEndDateDesc: "End Date (Latest)",
    sortGrossDesc: "Gross Premium (High)",
  },
};

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

function resolveFieldValue(source, field) {
  if (typeof source === "function") {
    return source({
      field,
      model: quickPolicyForm,
      locale: activeLocale.value,
      text: (value) => getLocalizedText(value, activeLocale.value),
    });
  }
  return source;
}

function isFieldRequired(field) {
  return Boolean(resolveFieldValue(field?.required, field));
}

const activeLocale = computed(() => unref(authStore.locale) || "en");
const filters = policyStore.state.filters;
const pagination = policyStore.state.pagination;

const statusOptions = computed(() => [
  { value: "active", label: activeLocale.value === "tr" ? "Aktif" : "Active" },
  { value: "waiting", label: activeLocale.value === "tr" ? "Bekliyor" : "Waiting" },
  { value: "cancel", label: activeLocale.value === "tr" ? "İptal" : "Cancelled" },
]);

const sortOptions = computed(() => [
  { value: "modified desc", label: t("sortModifiedDesc") },
  { value: "end_date asc", label: t("sortEndDateAsc") },
  { value: "end_date desc", label: t("sortEndDateDesc") },
  { value: "gross_premium desc", label: t("sortGrossDesc") },
]);
const policyQuickRuntime = usePolicyQuickCreateRuntime({
  t,
  activeLocale,
  router,
  route,
  branchStore,
  refreshPolicyList: () => refreshPolicyList(),
  openPolicyDetail: (policyName) => openPolicyDetail(policyName),
});
const {
  showQuickPolicyDialog,
  quickPolicyDialogKey,
  quickPolicyLoading,
  quickPolicyError,
  quickPolicyFieldErrors,
  quickPolicyForm,
  policyQuickOptionsMap,
  quickPolicyUi,
  hasQuickPolicySourceOffer,
  openQuickPolicyDialog,
  cancelQuickPolicyDialog,
  submitQuickPolicy,
} = policyQuickRuntime;

const rows = computed(() => policyStore.state.items);
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));

const {
  policyPresetKey,
  policyCustomPresets,
  policyListSearchQuery,
  policyListLocalFilters,
  policyListActiveCount,
  applyPolicyPreset,
  onPolicyListFilterChange,
  onPolicyListFilterReset,
} = usePolicyListFilters({
  t,
  localeCode,
  filters,
  pagination,
  refreshPolicyList: () => refreshPolicyList(),
  persistPolicyPresetStateToServer: () => persistPolicyPresetStateToServer(),
});
const {
  hydratePolicyPresetStateFromServer,
  persistPolicyPresetStateToServer: persistPolicyPresetStateToServerImpl,
} = usePolicyListPresetSync({
  presetKey: policyPresetKey,
  customPresets: policyCustomPresets,
  applyPolicyPreset,
});
persistPolicyPresetStateToServer = persistPolicyPresetStateToServerImpl;

const {
  policyListColumns,
  policyListFilterConfig,
  policyListTotalCount,
  policyListTotalPages,
  policyListPagedRows,
  policyListRowsWithUrgency,
  policySummary,
  policyIdentityFacts,
  policyDetailsFacts,
  policyPremiumFacts,
  formatDate,
  formatCurrency,
  formatCount,
} = usePolicyListTableData({
  rows,
  pagination,
  policyListSearchQuery,
  policyListLocalFilters,
  localeCode,
  t,
});
const {
  policyLoading,
  policyListError,
  policyListPage,
  buildPolicyExportQuery,
  downloadPolicyExport,
  focusPolicySearch,
  openPolicyDetail,
  refreshPolicyList,
  bindPolicyListLifecycle,
} = usePolicyListRuntime({
  t,
  filters,
  pagination,
  branchStore,
  initialActiveFilters: policyStore.activeFilterCount,
  policyStore,
});

function setPolicyListPage(value) {
  policyListPage.value = Number(value) || 1;
}

bindPolicyListLifecycle({
  hydratePolicyPresetStateFromServer,
  applyPolicyPreset,
  policyPresetKey,
  branchSelected: computed(() => branchStore.selected),
});
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>

