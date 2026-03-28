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
        :policy-loading="policyLoading"
        :t="t"
        @focus-filters="focusPolicySearch"
        @export-xlsx="downloadPolicyExport('xlsx')"
        @new-policy="openQuickPolicyDialog"
      />
    </template>

    <template #metrics>
      <PolicyListMetricsPanel :policy-summary="policySummary" :format-count="formatCount" :format-currency="formatCurrency" :t="t" />
    </template>

    <article v-if="policyListError" class="qc-error-banner">
      <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
      <p class="qc-error-banner__text mt-1">{{ policyListError }}</p>
    </article>

    <PolicyListFilterSection
      v-model:search="policyListSearchQuery"
      :filters="policyListFilterConfig"
      :active-count="policyListActiveCount"
      :policy-loading="policyLoading"
      :page-length="pagination.pageLength"
      :t="t"
      @filter-change="onPolicyListFilterChange"
      @reset="onPolicyListFilterReset"
      @refresh="refreshPolicyList"
      @clear="onPolicyListFilterReset"
    />

    <div class="hidden" aria-hidden="true">
      <input v-model="filters.query" class="input" type="text" />
      <input v-model="filters.status" class="input" type="text" />
      <input v-model="filters.insurance_company" class="input" type="text" />
      <input v-model="filters.customer" class="input" type="text" />
      <input v-model="filters.gross_min" class="input" type="text" />
      <input v-model.number="pagination.pageLength" class="input" type="number" min="1" />
    </div>

    <PolicyListTableSection
      :columns="policyListColumns"
      :rows="policyListRowsWithUrgency"
      :loading="policyLoading"
      :empty-message="t('empty')"
      :total-count="policyListTotalCount"
      :total-pages="policyListTotalPages"
      v-model:page="policyListPage"
      :format-count="formatCount"
      :t="t"
      @row-click="(row) => openPolicyDetail(row.name)"
    />

    <PolicyListQuickPolicyDialog
      v-model:show="showQuickPolicyDialog"
      :dialog-key="quickPolicyDialogKey"
      :model="quickPolicyForm"
      :field-errors="quickPolicyFieldErrors"
      :options-map="policyQuickOptionsMap"
      :disabled="quickPolicyLoading"
      :loading="quickPolicyLoading"
      :has-source-offer="hasQuickPolicySourceOffer"
      :office-branch="branchStore.requestBranch || ''"
      :error="quickPolicyError"
      :eyebrow="quickPolicyUi.eyebrow"
      :title="quickPolicyUi.title"
      :subtitle="quickPolicyUi.subtitle"
      @cancel="cancelQuickPolicyDialog"
      @submit="submitQuickPolicy(false)"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { createResource } from "frappe-ui";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { usePolicyStore } from "../stores/policy";
import { usePolicyListFilters } from "../composables/usePolicyListFilters";
import { usePolicyListPresetSync } from "../composables/usePolicyListPresetSync";
import { usePolicyListRuntime } from "../composables/usePolicyListRuntime";
import { usePolicyListTableData } from "../composables/usePolicyListTableData";
import { usePolicyListActions } from "../composables/usePolicyListActions";
import { usePolicyQuickCreateRuntime } from "../composables/usePolicyQuickCreateRuntime";
import DataTableCell from "../components/app-shell/DataTableCell.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import PolicyListActionBar from "../components/policy-list/PolicyListActionBar.vue";
import PolicyListMetricsPanel from "../components/policy-list/PolicyListMetricsPanel.vue";
import PolicyListFilterSection from "../components/policy-list/PolicyListFilterSection.vue";
import PolicyListTableSection from "../components/policy-list/PolicyListTableSection.vue";
import PolicyListQuickPolicyDialog from "../components/policy-list/PolicyListQuickPolicyDialog.vue";
import { buildQuickCreateDraft, getQuickCreateConfig, getLocalizedText } from "../config/quickCreateRegistry";
import { getQuickCreateEyebrow, getQuickCreateLabels } from "../utils/quickCreateCopy";
import { runQuickCreateSuccessTargets } from "../utils/quickCreateSuccess";
import { buildQuickCreateIntentQuery, readQuickCreateIntent, stripQuickCreateIntentQuery } from "../utils/quickRouteIntent";
import { buildRelatedQuickCreateNavigation } from "../utils/relatedQuickCreate";
import { isValidTckn, normalizeCustomerType, normalizeIdentityNumber } from "../utils/customerIdentity";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const branchStore = useBranchStore();
const policyStore = usePolicyStore();

function buildOfficeBranchLookupFilters() {
  const officeBranch = branchStore.requestBranch || "";
  return officeBranch ? { office_branch: officeBranch } : {};
}

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
let refreshPolicyList = () => Promise.resolve();

const statusOptions = computed(() => [
  { value: "active", label: activeLocale.value === "tr" ? "Aktif" : "Active" },
  { value: "waiting", label: activeLocale.value === "tr" ? "Bekliyor" : "Waiting" },
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
  refreshPolicyList,
  openPolicyDetail: (policyName) => router.push({ name: "policy-detail", params: { name: policyName } }),
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
  quickCreateCommon,
  hasQuickPolicySourceOffer,
  openQuickPolicyDialog,
  cancelQuickPolicyDialog,
  submitQuickPolicy,
  onPolicyRelatedCreateRequested,
} = policyQuickRuntime;

const policyPresetServerReadResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.filter_presets.get_filter_preset_state",
  auto: false,
});
const policyPresetServerWriteResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.filter_presets.set_filter_preset_state",
  auto: false,
});

const rows = computed(() => policyStore.state.items);
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
const policyActiveFilterCount = computed(() => policyStore.activeFilterCount);
const policyListHydratingPreset = ref(false);
let persistPolicyPresetStateToServer = () => Promise.resolve();

const {
  POLICY_PRESET_STORAGE_KEY,
  policyPresetKey,
  policyCustomPresets,
  policyPresetOptions,
  canDeletePolicyPreset,
  policyListSearchQuery,
  policyListLocalFilters,
  policyListActiveCount,
  currentPolicyPresetPayload,
  applyPolicyPreset,
  onPolicyPresetChange,
  onPolicyListFilterChange,
  onPolicyListFilterReset,
  savePolicyPreset,
  deletePolicyPreset,
} = usePolicyListFilters({
  t,
  localeCode,
  filters,
  pagination,
  refreshPolicyList,
  persistPolicyPresetStateToServer: () => persistPolicyPresetStateToServer(),
});
const {
  hydratePolicyPresetStateFromServer,
  persistPolicyPresetStateToServer: persistPolicyPresetStateToServerImpl,
} = usePolicyListPresetSync({
  presetKey: policyPresetKey,
  customPresets: policyCustomPresets,
  applyPolicyPreset,
  policyPresetServerReadResource,
  policyPresetServerWriteResource,
});
persistPolicyPresetStateToServer = persistPolicyPresetStateToServerImpl;
const policyRuntime = usePolicyListRuntime({
  t,
  branchStore,
  policyStore,
  filters,
  pagination,
});
const {
  policyResource,
  policyCountResource,
  policyLoading,
  policyListError,
  totalPages,
  hasNextPage,
  startRow,
  endRow,
  isInitialLoading,
  policyListPage,
  policyListPageSize,
  downloadPolicyExport,
  focusPolicySearch,
} = policyRuntime;
refreshPolicyList = policyRuntime.refreshPolicyList;
const {
  policyListMappedRows,
  policyListFilteredRows,
  policyListTotalCount,
  policyListTotalPages,
  policyListPagedRows,
  policyListRowsWithUrgency,
  policySummary,
} = usePolicyListTableData({
  rows,
  policyStore,
  policyListSearchQuery,
  policyListLocalFilters,
  localeCode,
  policyListPageSize,
});
const {
  openPolicyDetail,
  policyIdentityFacts,
  policyDetailsFacts,
  policyPremiumFacts,
  formatDate,
  formatCurrency,
  formatCount,
} = usePolicyListActions({
  router,
  localeCode,
  t,
});

const policyListColumns = [
  { key: "name", label: "Poliçe No", width: "160px", type: "mono" },
  { key: "customer", label: "Müşteri", width: "220px" },
  { key: "branch", label: "Branş", width: "160px" },
  { key: "gross_premium", label: "Brüt Prim", width: "120px", type: "amount", align: "right" },
  { key: "status", label: "Durum", width: "100px", type: "status" },
  { key: "remaining_days", label: "Kalan Gün", width: "100px", type: "urgency", align: "right" },
  { key: "end_date", label: "Bitiş Tarihi", width: "120px", type: "date" },
];

const policyListFilterConfig = computed(() => {
  const branchOptions = [...new Set(rows.value.map((row) => String(row.branch || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, localeCode.value))
    .map((value) => ({ value, label: value }));
  return [
    {
      key: "status",
      label: "Durum",
      options: [
        { value: "active", label: "Aktif" },
        { value: "draft", label: "Taslak" },
        { value: "cancel", label: "İptal" },
        { value: "waiting", label: "Bekliyor" },
      ],
    },
    {
      key: "branch",
      label: "Branş",
      options: branchOptions,
    },
  ];
});

applyPolicyPreset(policyPresetKey.value, { refresh: false });
onMounted(() => {
  void (async () => {
    policyListHydratingPreset.value = true;
    try {
      await hydratePolicyPresetStateFromServer();
    } finally {
      policyListHydratingPreset.value = false;
    }
    await refreshPolicyList();
  })();
});
watch(
  () => pagination.pageLength,
  () => {
    if (policyListHydratingPreset.value) return;
    pagination.page = 1;
    void refreshPolicyList();
  }
);

watch(
  () => branchStore.selected,
  () => {
    pagination.page = 1;
    void refreshPolicyList();
  }
);
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>

