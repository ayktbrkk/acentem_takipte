<template>
  <section class="page-shell space-y-4">
    <div class="detail-topbar">
      <div>
        <h1 class="detail-title">{{ t("title") }}</h1>
        <p class="detail-subtitle">{{ policyListTotalCount }} poliçe</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-outline btn-sm" type="button" @click="focusPolicySearch">Filtrele</button>
        <button class="btn btn-outline btn-sm" type="button" :disabled="policyLoading" @click="downloadPolicyExport('xlsx')">Dışa Aktar</button>
        <button class="btn btn-primary btn-sm" type="button" @click="openQuickPolicyDialog">+ Yeni Poliçe</button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 px-5 md:grid-cols-4">
      <div class="mini-metric">
        <p class="mini-metric-label">Toplam Poliçe</p>
        <p class="mini-metric-value">{{ formatCount(policySummary.total) }}</p>
      </div>
      <div class="mini-metric">
        <p class="mini-metric-label">Aktif</p>
        <p class="mini-metric-value text-brand-600">{{ formatCount(policySummary.active) }}</p>
      </div>
      <div class="mini-metric">
        <p class="mini-metric-label">Beklemede</p>
        <p class="mini-metric-value text-amber-600">{{ formatCount(policySummary.pending) }}</p>
      </div>
      <div class="mini-metric">
        <p class="mini-metric-label">Toplam Prim</p>
        <p class="mini-metric-value text-green-600">{{ formatCurrency(policySummary.totalPremium, "TRY") }}</p>
      </div>
    </div>

    <div class="surface-card rounded-2xl p-4">
      <FilterBar
        v-model:search="policyListSearchQuery"
        :filters="policyListFilterConfig"
        :active-count="policyListActiveCount"
        @filter-change="onPolicyListFilterChange"
        @reset="onPolicyListFilterReset"
      >
        <template #actions>
          <button class="btn btn-sm" :disabled="policyLoading" @click="refreshPolicyList">Yenile</button>
          <button v-if="policyListActiveCount > 0" class="btn btn-outline btn-sm" @click="onPolicyListFilterReset">Temizle</button>
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
    </div>

    <div class="surface-card rounded-2xl p-5">
      <ListTable
        :columns="policyListColumns"
        :rows="policyListRowsWithUrgency"
        :loading="policyLoading"
        empty-message="Poliçe bulunamadı."
        @row-click="(row) => openPolicyDetail(row.name)"
      />

      <div class="mt-4 flex items-center justify-between">
        <p class="text-xs text-gray-400">{{ policyListPagedRows.length }} / {{ policyListTotalCount }} kayıt gösteriliyor</p>
        <div class="flex items-center gap-1">
          <button class="btn btn-sm" :disabled="policyListPage <= 1" @click="policyListPage--">←</button>
          <span class="px-2 text-xs text-gray-600">{{ policyListPage }}</span>
          <button class="btn btn-sm" :disabled="policyListPage >= policyListTotalPages" @click="policyListPage++">→</button>
        </div>
      </div>
    </div>

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
  </section>
</template>

<script setup>
import { computed, reactive, ref, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Dialog, createResource } from "frappe-ui";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { usePolicyStore } from "../stores/policy";
import ActionButton from "../components/app-shell/ActionButton.vue";
import DataTableCell from "../components/app-shell/DataTableCell.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import TablePagerFooter from "../components/app-shell/TablePagerFooter.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
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
import {
  extractCustomFilterPresetId,
  isCustomFilterPresetValue,
  makeCustomFilterPresetValue,
  readFilterPresetKey,
  readFilterPresetList,
  writeFilterPresetKey,
  writeFilterPresetList,
} from "../utils/filterPresetState";

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
    title: "Poliçe Yönetimi",
    subtitle: "Poliçe listesini filtreleyin, sıralayın ve sayfalayın",
    refresh: "Yenile",
    exportXlsx: "Excel",
    exportPdf: "PDF",
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
    title: "Policy Workbench",
    subtitle: "Filter, sort, and paginate the policy list",
    refresh: "Refresh",
    exportXlsx: "Excel",
    exportPdf: "PDF",
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
const POLICY_PRESET_STORAGE_KEY = "at:policy-list:preset";
const POLICY_PRESET_LIST_STORAGE_KEY = "at:policy-list:preset-list";
const policyPresetKey = ref(readFilterPresetKey(POLICY_PRESET_STORAGE_KEY, "default"));
const policyCustomPresets = ref(readFilterPresetList(POLICY_PRESET_LIST_STORAGE_KEY));

const statusOptions = computed(() => [
  { value: "Active", label: activeLocale.value === "tr" ? "Aktif" : "Active" },
  { value: "KYT", label: "KYT" },
  { value: "IPT", label: activeLocale.value === "tr" ? "İptal" : "Cancelled" },
]);

const sortOptions = computed(() => [
  { value: "modified desc", label: t("sortModifiedDesc") },
  { value: "end_date asc", label: t("sortEndDateAsc") },
  { value: "end_date desc", label: t("sortEndDateDesc") },
  { value: "gross_premium desc", label: t("sortGrossDesc") },
]);
const policyPresetOptions = computed(() => [
  { value: "default", label: t("presetDefault") },
  { value: "active", label: t("presetActive") },
  { value: "expiring30", label: t("presetExpiring30") },
  { value: "highPremium", label: t("presetHighPremium") },
  ...policyCustomPresets.value.map((preset) => ({
    value: makeCustomFilterPresetValue(preset.id),
    label: preset.label,
  })),
]);
const canDeletePolicyPreset = computed(() => isCustomFilterPresetValue(policyPresetKey.value));
const quickPolicyConfig = getQuickCreateConfig("policy");
const showQuickPolicyDialog = ref(false);
const quickPolicyDialogKey = ref(0);
const quickPolicyLoading = ref(false);
const quickPolicyError = ref("");
const quickPolicyFieldErrors = reactive({});
const quickPolicyForm = reactive({
  queryText: "",
  customerOption: null,
  createCustomerMode: false,
  ...buildQuickCreateDraft(quickPolicyConfig),
});
const quickPolicyReturnTo = ref("");
const quickPolicyOpenedFromIntent = ref(false);
const QUICK_OPTION_LIMIT = 2000;

const companyResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Insurance Company",
    fields: ["name", "company_name"],
    order_by: "company_name asc",
    limit_page_length: QUICK_OPTION_LIMIT,
  },
});
const policyQuickBranchResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Branch",
    fields: ["name", "branch_name"],
    filters: { is_active: 1 },
    order_by: "branch_name asc",
    limit_page_length: QUICK_OPTION_LIMIT,
  },
});
const policyQuickSalesEntityResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Sales Entity",
    fields: ["name", "full_name"],
    order_by: "full_name asc",
    limit_page_length: QUICK_OPTION_LIMIT,
  },
});
const policyQuickCustomerResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Customer",
    fields: ["name", "full_name", "customer_type", "tax_id", "birth_date", "phone", "email"],
    filters: buildOfficeBranchLookupFilters(),
    order_by: "modified desc",
    limit_page_length: QUICK_OPTION_LIMIT,
  },
});
const policyQuickOfferResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Offer",
    fields: ["name", "customer", "offer_date", "status"],
    filters: { status: ["in", ["Sent", "Accepted"]] },
    order_by: "modified desc",
    limit_page_length: QUICK_OPTION_LIMIT,
  },
});
const quickPolicyCreateResource = createResource({
  url: quickPolicyConfig.submitUrl,
  auto: false,
});

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
const policyQuickFields = computed(() => quickPolicyConfig?.fields || []);
const policyQuickFormFields = computed(() =>
  policyQuickFields.value.filter(
    (field) =>
      !["customer", "customer_full_name", "customer_type", "customer_tax_id", "customer_phone", "customer_email"].includes(
        field.name
      )
  )
);
const hasQuickPolicySourceOffer = computed(() => String(quickPolicyForm.source_offer || "").trim() !== "");
const policyQuickCustomerOptions = computed(() =>
  asArray(resourceValue(policyQuickCustomerResource, [])).map((row) => ({
    value: row.name,
    label: row.full_name || row.name,
    description: row.tax_id || "",
    customer_type: row.customer_type || "",
    tax_id: row.tax_id || "",
    birth_date: row.birth_date || "",
    phone: row.phone || "",
    email: row.email || "",
  }))
);
const policyQuickCustomerLookup = computed(() => {
  const lookup = new Map();
  for (const row of policyQuickCustomerOptions.value) {
    lookup.set(String(row.value || "").trim(), row);
  }
  return lookup;
});
const policyQuickOptionsMap = computed(() => ({
  customers: policyQuickCustomerOptions.value,
  salesEntities: asArray(resourceValue(policyQuickSalesEntityResource, [])).map((row) => ({ value: row.name, label: row.full_name || row.name })),
  insuranceCompanies: companies.value.map((row) => ({ value: row.name, label: row.company_name || row.name })),
  branches: asArray(resourceValue(policyQuickBranchResource, [])).map((row) => ({ value: row.name, label: row.branch_name || row.name })),
  offers: asArray(resourceValue(policyQuickOfferResource, [])).map((row) => ({
    value: row.name,
    label: `${row.name}${row.customer ? ` - ${row.customer}` : ""}${row.status ? ` (${row.status})` : ""}`,
  })),
}));
const policyQuickAllowedStatuses = new Set(["Active", "KYT", "IPT"]);
const policyQuickAllowedOfferNames = computed(() => new Set(policyQuickOptionsMap.value.offers.map((option) => String(option.value || "").trim()).filter(Boolean)));
const quickPolicyUi = computed(() => ({
  title: getLocalizedText(quickPolicyConfig?.title, activeLocale.value),
  subtitle: getLocalizedText(quickPolicyConfig?.subtitle, activeLocale.value),
  eyebrow: getQuickCreateEyebrow("policy", activeLocale.value),
  newLabel: activeLocale.value === "tr" ? "Yeni Poliçe" : "New Policy",
}));
const quickCreateCommon = computed(() => ({
  ...getQuickCreateLabels("create", activeLocale.value),
  validation: activeLocale.value === "tr" ? "Lütfen gerekli alanları doldurun." : "Please fill required fields.",
  issueDateAfterStartDate:
    activeLocale.value === "tr"
      ? "Tanzim tarihi başlangıç tarihinden sonra olamaz."
      : "Issue date cannot be later than start date.",
  startDateAfterEndDate:
    activeLocale.value === "tr"
      ? "Başlangıç tarihi bitiş tarihinden sonra olamaz."
      : "Start date cannot be later than end date.",
  failed: activeLocale.value === "tr" ? "Hızlı poliçe oluşturma başarısız oldu." : "Quick policy create failed.",
}));
const policyListError = ref("");
const totalPages = computed(() => policyStore.totalPages);
const hasNextPage = computed(() => policyStore.hasNextPage);
const startRow = computed(() => policyStore.startRow);
const endRow = computed(() => policyStore.endRow);
const isInitialLoading = computed(() => policyStore.state.loading && rows.value.length === 0);
const policyActiveFilterCount = computed(() => policyStore.activeFilterCount);

const policyListSearchQuery = ref("");
const policyListPage = ref(1);
const policyListPageSize = 20;
const policyListLocalFilters = reactive({ status: "", branch: "" });

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
      String(row.status || "").toLocaleLowerCase(localeCode.value).includes(policyListLocalFilters.status);

    const matchesBranch = !policyListLocalFilters.branch || String(row.branch || "") === policyListLocalFilters.branch;

    return matchesQuery && matchesStatus && matchesBranch;
  });
});

const policyListTotalCount = computed(() => policyListFilteredRows.value.length);
const policyListTotalPages = computed(() => Math.max(1, Math.ceil(policyListTotalCount.value / policyListPageSize)));
const policyListPagedRows = computed(() => {
  const start = (policyListPage.value - 1) * policyListPageSize;
  return policyListFilteredRows.value.slice(start, start + policyListPageSize);
});
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
    const status = String(row.status || "").toLocaleLowerCase(localeCode.value);
    if (status.includes("active")) active += 1;
    if (status.includes("waiting") || status.includes("draft") || status.includes("kyt")) pending += 1;
    totalPremium += Number(row.gwp_try || row.gross_premium || 0);
  });

  return {
    total: rowsAll.length,
    active,
    pending,
    totalPremium,
  };
});
const policyListActiveCount = computed(
  () =>
    (policyListSearchQuery.value.trim() ? 1 : 0) +
    Object.values(policyListLocalFilters).filter((value) => String(value || "").trim() !== "").length
);

function focusPolicySearch() {
  const searchInput = document.querySelector('input[placeholder*="ara"]');
  if (searchInput instanceof HTMLInputElement) {
    searchInput.focus();
    searchInput.select();
  }
}

function onPolicyListFilterChange({ key, value }) {
  policyListLocalFilters[key] = String(value || "").toLocaleLowerCase(localeCode.value);
  policyListPage.value = 1;
}

function onPolicyListFilterReset() {
  policyListSearchQuery.value = "";
  policyListLocalFilters.status = "";
  policyListLocalFilters.branch = "";
  policyListPage.value = 1;
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

function dateAfterDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function applyPolicyPreset(key, { refresh = true } = {}) {
  const requested = String(key || "default");

  if (isCustomFilterPresetValue(requested)) {
    const customId = extractCustomFilterPresetId(requested);
    const presetRow = policyCustomPresets.value.find((item) => item.id === customId);
    if (!presetRow) {
      applyPolicyPreset("default", { refresh });
      return;
    }
    const payload = presetRow.payload || {};
    policyPresetKey.value = requested;
    writeFilterPresetKey(POLICY_PRESET_STORAGE_KEY, requested);
    filters.query = String(payload.query || "");
    filters.insurance_company = String(payload.insurance_company || "");
    filters.end_date = String(payload.end_date || "");
    filters.status = String(payload.status || "");
    filters.customer = String(payload.customer || "");
    filters.gross_min = payload.gross_min != null ? String(payload.gross_min) : "";
    filters.gross_max = payload.gross_max != null ? String(payload.gross_max) : "";
    filters.sort = String(payload.sort || "modified desc");
    pagination.pageLength = Number(payload.pageLength || 20) || 20;
    pagination.page = 1;
    if (refresh) refreshPolicyList();
    return;
  }

  const preset = requested;
  policyPresetKey.value = preset;
  writeFilterPresetKey(POLICY_PRESET_STORAGE_KEY, preset);

  filters.query = "";
  filters.insurance_company = "";
  filters.end_date = "";
  filters.status = "";
  filters.customer = "";
  filters.gross_min = "";
  filters.gross_max = "";
  filters.sort = "modified desc";
  pagination.pageLength = 20;

  if (preset === "active") {
    filters.status = "Active";
  } else if (preset === "expiring30") {
    filters.status = "Active";
    filters.end_date = dateAfterDays(30);
    filters.sort = "end_date asc";
  } else if (preset === "highPremium") {
    filters.sort = "gross_premium desc";
    filters.gross_min = "10000";
  }

  pagination.page = 1;
  if (refresh) refreshPolicyList();
}

function onPolicyPresetChange() {
  applyPolicyPreset(policyPresetKey.value, { refresh: true });
  void persistPolicyPresetStateToServer();
}

function currentPolicyPresetPayload() {
  return {
    query: filters.query,
    insurance_company: filters.insurance_company,
    end_date: filters.end_date,
    status: filters.status,
    customer: filters.customer,
    gross_min: filters.gross_min,
    gross_max: filters.gross_max,
    sort: filters.sort,
    pageLength: pagination.pageLength,
  };
}

function savePolicyPreset() {
  const currentCustomId = extractCustomFilterPresetId(policyPresetKey.value);
  const currentCustom = currentCustomId
    ? policyCustomPresets.value.find((item) => item.id === currentCustomId)
    : null;
  const initialName = currentCustom?.label || "";
  const name = String(window.prompt(t("savePresetPrompt"), initialName) || "").trim();
  if (!name) return;

  const existing = policyCustomPresets.value.find(
    (item) => item.label.toLowerCase() === name.toLowerCase()
  );
  const targetId = currentCustomId || existing?.id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const nextList = policyCustomPresets.value.filter((item) => item.id !== targetId);
  nextList.push({
    id: targetId,
    label: name,
    payload: currentPolicyPresetPayload(),
  });
  policyCustomPresets.value = nextList.sort((a, b) => a.label.localeCompare(b.label, localeCode.value));
  writeFilterPresetList(POLICY_PRESET_LIST_STORAGE_KEY, policyCustomPresets.value);
  policyPresetKey.value = makeCustomFilterPresetValue(targetId);
  writeFilterPresetKey(POLICY_PRESET_STORAGE_KEY, policyPresetKey.value);
  void persistPolicyPresetStateToServer();
}

function deletePolicyPreset() {
  if (!canDeletePolicyPreset.value) return;
  if (!window.confirm(t("deletePresetConfirm"))) return;
  const customId = extractCustomFilterPresetId(policyPresetKey.value);
  if (!customId) return;
  policyCustomPresets.value = policyCustomPresets.value.filter((item) => item.id !== customId);
  writeFilterPresetList(POLICY_PRESET_LIST_STORAGE_KEY, policyCustomPresets.value);
  applyPolicyPreset("default", { refresh: true });
  void persistPolicyPresetStateToServer();
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
  policyPresetKey.value = "default";
  writeFilterPresetKey(POLICY_PRESET_STORAGE_KEY, "default");
  filters.query = "";
  filters.insurance_company = "";
  filters.end_date = "";
  filters.status = "";
  filters.customer = "";
  filters.gross_min = "";
  filters.gross_max = "";
  filters.sort = "modified desc";
  pagination.pageLength = 20;
  pagination.page = 1;
  void persistPolicyPresetStateToServer();
  refreshPolicyList();
}

function hasMeaningfulPolicyPresetState(selectedKey, presets) {
  return String(selectedKey || "default") !== "default" || (Array.isArray(presets) && presets.length > 0);
}

async function persistPolicyPresetStateToServer() {
  try {
    await policyPresetServerWriteResource.submit({
      screen: "policy_list",
      selected_key: policyPresetKey.value,
      custom_presets: policyCustomPresets.value,
    });
  } catch {
    // Keep localStorage as fallback; server sync is best-effort.
  }
}

async function hydratePolicyPresetStateFromServer() {
  try {
    const remote = await policyPresetServerReadResource.reload({ screen: "policy_list" });
    const remoteSelectedKey = String(remote?.selected_key || "default");
    const remoteCustomPresets = Array.isArray(remote?.custom_presets) ? remote.custom_presets : [];

    const localHasState = hasMeaningfulPolicyPresetState(policyPresetKey.value, policyCustomPresets.value);
    const remoteHasState = hasMeaningfulPolicyPresetState(remoteSelectedKey, remoteCustomPresets);

    if (!remoteHasState) {
      if (localHasState) {
        void persistPolicyPresetStateToServer();
      }
      return;
    }

    const localSnapshot = JSON.stringify({
      selected_key: policyPresetKey.value,
      custom_presets: policyCustomPresets.value,
    });
    const remoteSnapshot = JSON.stringify({
      selected_key: remoteSelectedKey,
      custom_presets: remoteCustomPresets,
    });

    if (localSnapshot === remoteSnapshot) return;

    policyCustomPresets.value = remoteCustomPresets;
    writeFilterPresetList(POLICY_PRESET_LIST_STORAGE_KEY, policyCustomPresets.value);
    applyPolicyPreset(remoteSelectedKey, { refresh: true });
  } catch {
    // Keep local-only behavior on any API error.
  }
}

function clearQuickPolicyFieldErrors() {
  Object.keys(quickPolicyFieldErrors).forEach((key) => delete quickPolicyFieldErrors[key]);
}

function parseDateOnly(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  const date = new Date(`${trimmed}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resetQuickPolicyForm() {
  Object.assign(quickPolicyForm, {
    queryText: "",
    customerOption: null,
    createCustomerMode: false,
    ...buildQuickCreateDraft(quickPolicyConfig),
  });
  quickPolicyError.value = "";
  clearQuickPolicyFieldErrors();
}

function openQuickPolicyDialog({ fromIntent = false, returnTo = "" } = {}) {
  resetQuickPolicyForm();
  quickPolicyDialogKey.value += 1;
  quickPolicyOpenedFromIntent.value = !!fromIntent;
  quickPolicyReturnTo.value = returnTo || "";
  showQuickPolicyDialog.value = true;
}

function cancelQuickPolicyDialog() {
  showQuickPolicyDialog.value = false;
  if (quickPolicyOpenedFromIntent.value && quickPolicyReturnTo.value) {
    const target = quickPolicyReturnTo.value;
    quickPolicyOpenedFromIntent.value = false;
    quickPolicyReturnTo.value = "";
    router.push(target).catch(() => {});
    return;
  }
  quickPolicyOpenedFromIntent.value = false;
  quickPolicyReturnTo.value = "";
}

function syncQuickPolicyCustomerSelection() {
  if (hasQuickPolicySourceOffer.value) return;
  const customerName = String(quickPolicyForm.customer || "").trim();
  const selectedCustomer = customerName ? policyQuickCustomerLookup.value.get(customerName) : null;

  if (selectedCustomer) {
    const selectedCustomerType = normalizeCustomerType(
      selectedCustomer.customer_type || quickPolicyForm.customer_type,
      selectedCustomer.tax_id || quickPolicyForm.customer_tax_id
    );
    quickPolicyForm.customer_full_name = String(selectedCustomer.label || customerName).trim() || customerName;
    quickPolicyForm.queryText = quickPolicyForm.customer_full_name;
    quickPolicyForm.customer_type = selectedCustomerType;
    quickPolicyForm.customer_tax_id = selectedCustomer.tax_id || quickPolicyForm.customer_tax_id;
    quickPolicyForm.customer_birth_date = selectedCustomerType === "Corporate" ? "" : String(selectedCustomer.birth_date || "").trim();
    quickPolicyForm.customer_phone = selectedCustomer.phone || quickPolicyForm.customer_phone;
    quickPolicyForm.customer_email = selectedCustomer.email || quickPolicyForm.customer_email;
    quickPolicyForm.createCustomerMode = false;
    return;
  }

  if (!quickPolicyForm.createCustomerMode) {
    quickPolicyForm.customer_type = "Individual";
    quickPolicyForm.customer_tax_id = "";
    quickPolicyForm.customer_phone = "";
    quickPolicyForm.customer_email = "";
    quickPolicyForm.customer_birth_date = "";
  }
}

function validateQuickPolicyForm() {
  clearQuickPolicyFieldErrors();
  quickPolicyError.value = "";
  let valid = true;
  const hasSourceOffer = hasQuickPolicySourceOffer.value;
  const statusValue = String(quickPolicyForm.status || "").trim();
  if (!hasSourceOffer && statusValue && !policyQuickAllowedStatuses.has(statusValue)) {
    quickPolicyFieldErrors.status =
      activeLocale.value === "tr"
        ? "Geçersiz durum seçimi."
        : "Unsupported status selection.";
    valid = false;
  }
  const selectedSourceOffer = String(quickPolicyForm.source_offer || "").trim();
  if (hasSourceOffer && selectedSourceOffer && !policyQuickAllowedOfferNames.value.has(selectedSourceOffer)) {
    quickPolicyFieldErrors.source_offer =
      activeLocale.value === "tr"
        ? "Seçili teklif bulunamadı."
        : "Selected source offer was not found.";
    valid = false;
  }
  for (const field of policyQuickFormFields.value) {
    if (!isFieldRequired(field)) continue;
    if (String(quickPolicyForm[field.name] ?? "").trim() === "") {
      quickPolicyFieldErrors[field.name] = getLocalizedText(field.label, activeLocale.value);
      valid = false;
    }
  }
  if (!hasSourceOffer && !String(quickPolicyForm.customer || "").trim()) {
    const shouldCreateCustomer = Boolean(quickPolicyForm.createCustomerMode);
    const customerName = String(quickPolicyForm.customer_full_name || quickPolicyForm.queryText || "").trim();
    const identityNumber = normalizeIdentityNumber(quickPolicyForm.customer_tax_id);
    const customerType = normalizeCustomerType(quickPolicyForm.customer_type, identityNumber);
    if (!shouldCreateCustomer) {
      quickPolicyFieldErrors.customer =
        activeLocale.value === "tr"
          ? "Bir müşteri seçin veya yeni müşteri ekleyin."
        : "Select a customer or add a new customer.";
      valid = false;
    } else if (!customerName) {
      quickPolicyFieldErrors.customer =
        activeLocale.value === "tr" ? "Yeni müşteri adı gerekli." : "New customer name is required.";
      valid = false;
    }
    if (shouldCreateCustomer && !identityNumber) {
      quickPolicyFieldErrors.customer_tax_id = getLocalizedText(
        policyQuickFields.value.find((field) => field.name === "customer_tax_id")?.label,
        activeLocale.value
      );
      valid = false;
    } else if (shouldCreateCustomer && customerType === "Corporate") {
      if (identityNumber.length !== 10) {
        quickPolicyFieldErrors.customer_tax_id =
          activeLocale.value === "tr" ? "Vergi numarası 10 haneli olmalıdır." : "Tax number must be 10 digits.";
        valid = false;
      }
    } else if (shouldCreateCustomer && identityNumber.length !== 11) {
      quickPolicyFieldErrors.customer_tax_id =
        activeLocale.value === "tr"
          ? "TC kimlik numarası 11 haneli olmalıdır."
          : "National ID number must be 11 digits.";
      valid = false;
    } else if (shouldCreateCustomer && !isValidTckn(identityNumber)) {
      quickPolicyFieldErrors.customer_tax_id =
        activeLocale.value === "tr"
          ? "Geçerli bir TC kimlik numarası girin."
          : "Enter a valid Turkish national ID number.";
      valid = false;
    }
    const birthDateValue = String(quickPolicyForm.customer_birth_date || "").trim();
    if (shouldCreateCustomer && customerType !== "Corporate" && birthDateValue) {
      const birthDate = new Date(`${birthDateValue}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(birthDate.getTime()) || birthDate > today) {
        quickPolicyFieldErrors.customer_birth_date =
          activeLocale.value === "tr" ? "Doğum tarihi gelecekte olamaz." : "Birth date cannot be in the future.";
        valid = false;
      }
    }
  }
  if (!valid) {
    quickPolicyError.value = quickCreateCommon.value.validation;
    return false;
  }
  const issueDate = parseDateOnly(quickPolicyForm.issue_date);
  const startDate = parseDateOnly(quickPolicyForm.start_date);
  const endDate = parseDateOnly(quickPolicyForm.end_date);
  if (issueDate && startDate && issueDate > startDate) {
    quickPolicyFieldErrors.issue_date = quickCreateCommon.value.issueDateAfterStartDate;
    quickPolicyError.value = quickCreateCommon.value.validation;
    return false;
  }
  if (startDate && endDate && startDate > endDate) {
    quickPolicyFieldErrors.end_date = quickCreateCommon.value.startDateAfterEndDate;
    quickPolicyError.value = quickCreateCommon.value.validation;
    return false;
  }
  const gross = Number(quickPolicyForm.gross_premium || 0);
  if (!hasSourceOffer && !(Number.isFinite(gross) && gross > 0)) {
    quickPolicyFieldErrors.gross_premium = getLocalizedText(
      policyQuickFields.value.find((f) => f.name === "gross_premium")?.label,
      activeLocale.value
    );
    quickPolicyError.value = quickCreateCommon.value.validation;
    return false;
  }
  return true;
}

function buildQuickPolicyPayload() {
  const hasSourceOffer = hasQuickPolicySourceOffer.value;
  const selectedCustomer = String(quickPolicyForm.customer || "").trim();
  const shouldCreateCustomer = !hasSourceOffer && !selectedCustomer && Boolean(quickPolicyForm.createCustomerMode);
  const identityNumber = normalizeIdentityNumber(quickPolicyForm.customer_tax_id);
  const customerType = normalizeCustomerType(quickPolicyForm.customer_type, identityNumber);
  const customerBirthDate = String(quickPolicyForm.customer_birth_date || "").trim();
  const statusValue = String(quickPolicyForm.status || "").trim();
  const normalizedStatus = hasSourceOffer
    ? null
    : policyQuickAllowedStatuses.has(statusValue)
      ? statusValue
      : "Active";
  return {
    customer: hasSourceOffer ? null : selectedCustomer || null,
    customer_full_name: shouldCreateCustomer ? String(quickPolicyForm.customer_full_name || quickPolicyForm.queryText || "").trim() || null : null,
    customer_type: shouldCreateCustomer ? customerType : null,
    customer_tax_id: shouldCreateCustomer ? identityNumber || null : null,
    customer_phone: shouldCreateCustomer ? quickPolicyForm.customer_phone || null : null,
    customer_email: shouldCreateCustomer ? quickPolicyForm.customer_email || null : null,
    customer_birth_date: shouldCreateCustomer && customerType !== "Corporate" && customerBirthDate ? customerBirthDate : null,
    sales_entity: hasSourceOffer ? null : quickPolicyForm.sales_entity || null,
    insurance_company: hasSourceOffer ? null : quickPolicyForm.insurance_company || null,
    branch: hasSourceOffer ? null : quickPolicyForm.branch || null,
    policy_no: quickPolicyForm.policy_no || null,
    source_offer: quickPolicyForm.source_offer || null,
    status: normalizedStatus,
    issue_date: hasSourceOffer ? null : quickPolicyForm.issue_date || null,
    start_date: quickPolicyForm.start_date || null,
    end_date: quickPolicyForm.end_date || null,
    currency: quickPolicyForm.currency || "TRY",
    gross_premium:
      hasSourceOffer || quickPolicyForm.gross_premium === ""
        ? null
        : Number(quickPolicyForm.gross_premium || 0),
    net_premium: hasSourceOffer
      ? null
      : quickPolicyForm.net_premium === ""
        ? null
        : Number(quickPolicyForm.net_premium || 0),
    tax_amount: hasSourceOffer
      ? null
      : quickPolicyForm.tax_amount === ""
        ? null
        : Number(quickPolicyForm.tax_amount || 0),
    commission_amount:
      hasSourceOffer
        ? null
        : quickPolicyForm.commission_amount === ""
          ? null
          : Number(quickPolicyForm.commission_amount || 0),
    notes: quickPolicyForm.notes || null,
  };
}

async function submitQuickPolicy(openAfter = false) {
  if (quickPolicyLoading.value) return;
  if (!validateQuickPolicyForm()) return;
  quickPolicyLoading.value = true;
  quickPolicyError.value = "";
  try {
    const result = await quickPolicyCreateResource.submit(buildQuickPolicyPayload());
    const policyName = result?.policy || quickPolicyCreateResource.data?.policy || null;
    showQuickPolicyDialog.value = false;
    resetQuickPolicyForm();
    await runQuickCreateSuccessTargets(quickPolicyConfig?.successRefreshTargets, {
      policy_list: refreshPolicyList,
    });
    const returnTarget = quickPolicyOpenedFromIntent.value ? quickPolicyReturnTo.value : "";
    quickPolicyOpenedFromIntent.value = false;
    quickPolicyReturnTo.value = "";
    if (!openAfter && returnTarget) {
      router.push(returnTarget).catch(() => {});
      return;
    }
    if (openAfter && policyName) openPolicyDetail(policyName);
  } catch (error) {
    quickPolicyError.value = error?.messages?.join(" ") || error?.message || quickCreateCommon.value.failed;
  } finally {
    quickPolicyLoading.value = false;
  }
}

function applyQuickPolicyPrefills(prefills = {}) {
  if (!prefills || typeof prefills !== "object") return;
  for (const field of policyQuickFields.value) {
    const fieldName = String(field?.name || "").trim();
    if (!fieldName || !(fieldName in prefills)) continue;
    const prefillValue = String(prefills[fieldName] ?? "").trim();
    if (fieldName === "status" && prefillValue && !policyQuickAllowedStatuses.has(prefillValue)) {
      quickPolicyForm[fieldName] = "Active";
      continue;
    }
    quickPolicyForm[fieldName] = prefillValue;
  }
  const customerName = String(prefills.customer || "").trim();
  const customerLabel = String(prefills.customer_label || customerName || prefills.customer_full_name || prefills.queryText || "").trim();
  if (customerName) {
    quickPolicyForm.customer = customerName;
    quickPolicyForm.customerOption = {
      value: customerName,
      label: customerLabel || customerName,
    };
  }
  if (customerLabel) {
    quickPolicyForm.customer_full_name = customerLabel;
    quickPolicyForm.queryText = customerLabel;
  }
  if ("createCustomerMode" in prefills) {
    quickPolicyForm.createCustomerMode = String(prefills.createCustomerMode || "") === "1";
  }
}

function buildPolicyQuickReturnTo() {
  const prefills = {};
  for (const field of policyQuickFields.value) {
    const fieldName = String(field?.name || "").trim();
    if (!fieldName) continue;
    const value = String(quickPolicyForm[fieldName] ?? "").trim();
    if (!value) continue;
    if (fieldName === "status" && !policyQuickAllowedStatuses.has(value)) {
      prefills[fieldName] = "Active";
      continue;
    }
    prefills[fieldName] = value;
  }
  const customerName = String(quickPolicyForm.customer || "").trim();
  const customerLabel = String(
    quickPolicyForm.customer_full_name || quickPolicyForm.queryText || quickPolicyForm?.customerOption?.label || ""
  ).trim();
  if (customerName) prefills.customer = customerName;
  if (customerLabel) prefills.customer_label = customerLabel;
  if (!customerName && customerLabel) {
    prefills.customer_full_name = customerLabel;
    prefills.queryText = customerLabel;
  }
  if (quickPolicyForm.createCustomerMode) prefills.createCustomerMode = "1";
  return router.resolve({
    name: "policy-list",
    query: buildQuickCreateIntentQuery({ prefills }),
  }).fullPath;
}

function onPolicyRelatedCreateRequested(request = {}) {
  const navigation = buildRelatedQuickCreateNavigation({
    optionsSource: request?.optionsSource,
    query: request?.query,
    returnTo: buildPolicyQuickReturnTo(),
  });
  if (!navigation) return;
  router.push(navigation).catch(() => {});
}

function consumeQuickPolicyRouteIntent() {
  const intent = readQuickCreateIntent(route.query);
  if (!intent.quick) return;
  openQuickPolicyDialog({ fromIntent: true, returnTo: intent.returnTo });
  applyQuickPolicyPrefills(intent.prefills || {});
  const nextQuery = stripQuickCreateIntentQuery(route.query);
  router.replace({ name: "policy-list", query: nextQuery }).catch(() => {});
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
void refreshPolicyList();
watch(
  () => branchStore.selected,
  () => {
    pagination.page = 1;
    policyQuickCustomerResource.params = {
      doctype: "AT Customer",
      fields: ["name", "full_name"],
      filters: buildOfficeBranchLookupFilters(),
      order_by: "modified desc",
      limit_page_length: QUICK_OPTION_LIMIT,
    };
    void policyQuickCustomerResource.reload();
    void refreshPolicyList();
  }
);
watch(
  () => [quickPolicyForm.customer, quickPolicyForm.createCustomerMode, hasQuickPolicySourceOffer.value, policyQuickCustomerOptions.value.length],
  () => {
    syncQuickPolicyCustomerSelection();
  },
  { immediate: true }
);
watch(
  () => quickPolicyForm.source_offer,
  (value) => {
    if (!String(value || "").trim()) return;
    quickPolicyForm.customer = "";
    quickPolicyForm.customer_full_name = "";
    quickPolicyForm.queryText = "";
    quickPolicyForm.customerOption = null;
    quickPolicyForm.createCustomerMode = false;
    quickPolicyForm.customer_birth_date = "";
  }
);
void hydratePolicyPresetStateFromServer();
void consumeQuickPolicyRouteIntent();
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>
