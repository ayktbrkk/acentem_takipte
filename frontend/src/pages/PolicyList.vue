<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="formatCount(policyListTotalCount)"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <button class="btn btn-outline btn-sm" type="button" @click="focusPolicySearch">{{ t("focusFilters") }}</button>
      <button class="btn btn-outline btn-sm" type="button" :disabled="policyLoading" @click="downloadPolicyExport('xlsx')">{{ t("exportXlsx") }}</button>
      <button class="btn btn-primary btn-sm" type="button" @click="openQuickPolicyDialog">{{ t("newPolicy") }}</button>
    </template>

    <template #metrics>
      <div class="w-full grid grid-cols-1 gap-4 md:grid-cols-4">
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryTotal") }}</p>
          <p class="mini-metric-value">{{ formatCount(policySummary.total) }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryActive") }}</p>
          <p class="mini-metric-value text-brand-600">{{ formatCount(policySummary.active) }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryPending") }}</p>
          <p class="mini-metric-value text-amber-600">{{ formatCount(policySummary.pending) }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryTotalPremium") }}</p>
          <p class="mini-metric-value text-green-600">{{ formatCurrency(policySummary.totalPremium, "TRY") }}</p>
        </div>
      </div>
    </template>

    <article v-if="policyListError" class="qc-error-banner">
      <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
      <p class="qc-error-banner__text mt-1">{{ policyListError }}</p>
    </article>

    <SectionPanel
      :title="t('filtersTitle')"
      :count="`${policyListActiveCount} ${t('activeFilters')}`"
      panel-class="surface-card rounded-2xl p-4"
    >
      <FilterBar
        v-model:search="policyListSearchQuery"
        :filters="policyListFilterConfig"
        :active-count="policyListActiveCount"
        @filter-change="onPolicyListFilterChange"
        @reset="onPolicyListFilterReset"
      >
        <template #actions>
          <button class="btn btn-sm" :disabled="policyLoading" @click="refreshPolicyList">{{ t("refresh") }}</button>
          <button v-if="policyListActiveCount > 0" class="btn btn-outline btn-sm" @click="onPolicyListFilterReset">{{ t("clearFilters") }}</button>
        </template>
      </FilterBar>
      <div class="hidden" aria-hidden="true">
        <input v-model="filters.query" class="input" type="text" />
        <input v-model="filters.status" class="input" type="text" />
        <input v-model="filters.insurance_company" class="input" type="text" />
        <input v-model="filters.customer" class="input" type="text" />
        <input v-model="filters.gross_min" class="input" type="text" />
        <input v-model.number="pagination.pageLength" class="input" type="number" min="1" />
      </div>
      <div class="mt-3 flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
        <span>{{ t("mobileSummaryTitle") }}</span>
        <span>{{ t("pageSize") }}: {{ pagination.pageLength || 20 }}</span>
      </div>
    </SectionPanel>

    <SectionPanel
      :title="t('policyTableTitle')"
      :count="formatCount(policyListTotalCount)"
      panel-class="surface-card rounded-2xl p-5"
    >
      <ListTable
        :columns="policyListColumns"
        :rows="policyListRowsWithUrgency"
        :loading="policyLoading"
        :empty-message="t('empty')"
        @row-click="(row) => openPolicyDetail(row.name)"
      />

      <div class="mt-4 flex items-center justify-between">
        <p class="text-xs text-gray-400">{{ policyListPagedRows.length }} / {{ policyListTotalCount }} {{ t("showingRecords") }}</p>
        <div class="flex items-center gap-1">
          <button class="btn btn-sm" :disabled="policyListPage <= 1" @click="policyListPage--">←</button>
          <span class="px-2 text-xs text-gray-600">{{ policyListPage }}</span>
          <button class="btn btn-sm" :disabled="policyListPage >= policyListTotalPages" @click="policyListPage++">→</button>
        </div>
      </div>
    </SectionPanel>

    <Dialog v-model="showQuickPolicyDialog" :options="{ title: quickPolicyUi.title, size: 'xl' }">
      <template #body-content>
        <PolicyForm
          :key="quickPolicyDialogKey"
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
      </template>
    </Dialog>
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Dialog, createResource } from "frappe-ui";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { usePolicyStore } from "../stores/policy";
import { usePolicyListFilters } from "../composables/usePolicyListFilters";
import { usePolicyListPresetSync } from "../composables/usePolicyListPresetSync";
import { usePolicyQuickCreateRuntime } from "../composables/usePolicyQuickCreateRuntime";
import DataTableCell from "../components/app-shell/DataTableCell.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import ListTable from "../components/ui/ListTable.vue";
import FilterBar from "../components/ui/FilterBar.vue";
import PolicyForm from "../components/PolicyForm.vue";
import { buildQuickCreateDraft, getQuickCreateConfig, getLocalizedText } from "../config/quickCreateRegistry";
import { getQuickCreateEyebrow, getQuickCreateLabels } from "../utils/quickCreateCopy";
import { runQuickCreateSuccessTargets } from "../utils/quickCreateSuccess";
import { mutedFact, subtleFact } from "../utils/factItems";
import { openListExport } from "../utils/listExport";
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

function normalizePolicyListStatus(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (["active"].includes(raw)) return "active";
  if (["kyt", "ipt", "waiting"].includes(raw)) return "waiting";
  if (["cancel", "cancelled", "expired"].includes(raw)) return "cancel";
  return raw;
}

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

const policyResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  transform(data) {
    if (Array.isArray(data)) {
      return Object.freeze(data.map(item => Object.freeze({...item})));
    }
    return data;
  },
});

const policyCountResource = createResource({
  url: "frappe.client.get_count",
  auto: false,
});
const policyPresetServerReadResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.filter_presets.get_filter_preset_state",
  auto: false,
});
const policyPresetServerWriteResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.filter_presets.set_filter_preset_state",
  auto: false,
});

const resourceValue = (resource, fallback = null) => {
  const value = unref(resource?.data);
  return value == null ? fallback : value;
};
const asArray = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);
const companies = computed(() => asArray(resourceValue(companyResource, [])));
const rows = computed(() => policyStore.state.items);
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
const policyLoading = computed(() => Boolean(unref(policyResource.loading)));
const policyListError = ref("");
const totalPages = computed(() => policyStore.totalPages);
const hasNextPage = computed(() => policyStore.hasNextPage);
const startRow = computed(() => policyStore.startRow);
const endRow = computed(() => policyStore.endRow);
const isInitialLoading = computed(() => policyStore.state.loading && rows.value.length === 0);
const policyActiveFilterCount = computed(() => policyStore.activeFilterCount);
const policyListHydratingPreset = ref(false);
const policyListPage = computed({
  get: () => Number(pagination.page || 1),
  set: (value) => {
    pagination.page = Number(value) || 1;
    void refreshPolicyList();
  },
});
const policyListPageSize = computed(() => Math.max(1, Number(pagination.pageLength || 20)));
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

const policyListMappedRows = computed(() =>
  rows.value.map((row) => ({
    ...row,
    name: row.policy_no || row.name,
    branch: row.branch || "-",
    remaining_days: computeRemainingDays(row.end_date),
  }))
);

const policyListFilteredRows = computed(() => {
  const q = policyListSearchQuery.value.trim().toLocaleLowerCase(localeCode.value);
  return policyListMappedRows.value.filter((row) => {
    const matchesQuery =
      !q ||
      [row.name, row.customer, row.branch, row.status]
        .map((value) => String(value || "").toLocaleLowerCase(localeCode.value))
        .some((value) => value.includes(q));

    const matchesStatus =
      !policyListLocalFilters.status ||
      normalizePolicyListStatus(row.status) === policyListLocalFilters.status;

    const matchesBranch = !policyListLocalFilters.branch || String(row.branch || "") === policyListLocalFilters.branch;

    return matchesQuery && matchesStatus && matchesBranch;
  });
});

const policyListTotalCount = computed(() => Number(policyStore.state.pagination.total || policyListFilteredRows.value.length));
const policyListTotalPages = computed(() => Math.max(1, Math.ceil(policyListTotalCount.value / policyListPageSize.value)));
const policyListPagedRows = computed(() => policyListFilteredRows.value);
const policyListRowsWithUrgency = computed(() =>
  policyListPagedRows.value.map((row) => ({
    ...row,
    _urgency: row.remaining_days <= 7 ? "row-critical" : row.remaining_days <= 30 ? "row-warning" : "",
  }))
);
const policySummary = computed(() => {
  const rowsAll = policyListMappedRows.value;
  let active = 0;
  let pending = 0;
  let totalPremium = 0;

  rowsAll.forEach((row) => {
    const status = normalizePolicyListStatus(row.status);
    if (status === "active") active += 1;
    if (status === "waiting") pending += 1;
    totalPremium += Number(row.gwp_try || row.gross_premium || 0);
  });

  return {
    total: rowsAll.length,
    active,
    pending,
    totalPremium,
  };
});
function focusPolicySearch() {
  const searchInput = document.querySelector('input[placeholder*="ara"]');
  if (searchInput instanceof HTMLInputElement) {
    searchInput.focus();
    searchInput.select();
  }
}

function computeRemainingDays(endDate) {
  if (!endDate) return null;
  const target = new Date(endDate);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / 86400000);
}

function buildPolicyFilterPayload() {
  const out = { filters: {} };
  if (filters.insurance_company) out.filters.insurance_company = filters.insurance_company;
  if (filters.status) out.filters.status = filters.status;
  if (filters.end_date) out.filters.end_date = ["<=", filters.end_date];
  if (filters.customer) out.filters.customer = ["like", `%${filters.customer}%`];
  if (filters.gross_min !== "") out.filters.gross_premium = [">=", Number(filters.gross_min || 0)];
  if (filters.gross_max !== "") {
    if (Array.isArray(out.filters.gross_premium)) {
      out.filters.gross_premium = ["between", [Number(filters.gross_min || 0), Number(filters.gross_max || 0)]];
    } else {
      out.filters.gross_premium = ["<=", Number(filters.gross_max || 0)];
    }
  }
  if (filters.query) {
    out.or_filters = [
      ["AT Policy", "name", "like", `%${filters.query}%`],
      ["AT Policy", "policy_no", "like", `%${filters.query}%`],
      ["AT Policy", "customer", "like", `%${filters.query}%`],
    ];
  }
  return out;
}

function buildPolicyParams() {
  const payload = buildPolicyFilterPayload();
  return withOfficeBranchFilter({
    doctype: "AT Policy",
    fields: [
      "name",
      "policy_no",
      "customer",
      "insurance_company",
      "status",
      "currency",
      "end_date",
      "gross_premium",
      "commission_amount",
      "commission",
      "gwp_try",
    ],
    filters: payload.filters,
    ...(payload.or_filters ? { or_filters: payload.or_filters } : {}),
    order_by: filters.sort,
    limit_start: (pagination.page - 1) * pagination.pageLength,
    limit_page_length: pagination.pageLength,
  });
}

function buildPolicyExportQuery() {
  const payload = buildPolicyFilterPayload();
  return withOfficeBranchFilter({
    filters: payload.filters,
    ...(payload.or_filters ? { or_filters: payload.or_filters } : {}),
    order_by: filters.sort,
  });
}

function downloadPolicyExport(format) {
  openListExport({
    screen: "policy_list",
    query: buildPolicyExportQuery(),
    format,
    limit: 1000,
  });
}

function buildCountParams() {
  const payload = buildPolicyFilterPayload();
  return withOfficeBranchFilter({
    doctype: "AT Policy",
    filters: payload.filters,
    ...(payload.or_filters ? { or_filters: payload.or_filters } : {}),
  });
}

function withOfficeBranchFilter(params) {
  const officeBranch = branchStore.requestBranch || "";
  if (!officeBranch) return params;
  return {
    ...params,
    filters: {
      ...(params.filters || {}),
      office_branch: officeBranch,
    },
  };
}

async function refreshPolicyList() {
  if (pagination.page > totalPages.value && pagination.total > 0) {
    pagination.page = totalPages.value;
  }

  policyResource.params = buildPolicyParams();
  policyCountResource.params = buildCountParams();
  policyStore.setLoading(true);
  policyStore.clearError();

  const [recordsResult, countResult] = await Promise.allSettled([
    policyResource.reload(),
    policyCountResource.reload(),
  ]);

  if (recordsResult.status === "fulfilled") {
    const records = recordsResult.value || [];
    policyResource.setData(records);
    policyListError.value = "";

    if (countResult.status === "fulfilled") {
      const total = Number(countResult.value || 0);
      policyStore.applyListPayload(records, Number.isFinite(total) ? total : 0);
    } else {
      policyStore.applyListPayload(records, records.length);
    }
    policyStore.setLoading(false);
    return;
  }

  policyResource.setData([]);
  policyStore.applyListPayload([], 0);
  policyStore.setError(t("loadError"));
  policyStore.setLoading(false);
  policyListError.value = t("loadError");
}

function applyFilters() {
  pagination.page = 1;
  refreshPolicyList();
}

function resetFilters() {
  applyPolicyPreset("default", { refresh: false });
  void persistPolicyPresetStateToServer();
  refreshPolicyList();
}

function previousPage() {
  if (pagination.page <= 1) return;
  pagination.page -= 1;
  refreshPolicyList();
}

function nextPage() {
  if (!hasNextPage.value) return;
  pagination.page += 1;
  refreshPolicyList();
}

function openPolicyDetail(policyName) {
  router.push({ name: "policy-detail", params: { name: policyName } });
}

function policyIdentityFacts(row) {
  return [
    subtleFact("record", t("recordNo"), row?.name || "-"),
    subtleFact("policyNo", t("carrierPolicyNo"), row?.policy_no || "-"),
  ];
}

function policyDetailsFacts(row) {
  return [
    mutedFact("customer", t("colCustomer"), row?.customer || "-"),
    mutedFact("company", t("colCompany"), row?.insurance_company || "-"),
    mutedFact("endDate", t("colEndDate"), formatDate(row?.end_date)),
  ];
}

function policyPremiumFacts(row) {
  return [
    mutedFact("gross", t("colGross"), formatCurrency(row?.gross_premium, row?.currency || "TRY")),
    mutedFact(
      "commission",
      t("colCommission"),
      formatCurrency(row?.commission_amount || row?.commission, row?.currency || "TRY")
    ),
    mutedFact("gwpTry", t("colGwpTry"), formatCurrency(row?.gwp_try, "TRY")),
  ];
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(localeCode.value).format(new Date(value));
}

function formatCurrency(value, currency) {
  return new Intl.NumberFormat(localeCode.value, {
    style: "currency",
    currency: currency || "TRY",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatCount(value) {
  return Number(value || 0).toLocaleString(localeCode.value);
}

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

