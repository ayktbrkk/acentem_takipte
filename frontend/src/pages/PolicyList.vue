<template>
  <section class="space-y-4">
    <div class="surface-card rounded-2xl p-5">
      <PageToolbar
        :title="t('title')"
        :subtitle="t('subtitle')"
        :show-refresh="true"
        :busy="policyResource.loading"
        :refresh-label="t('refresh')"
        @refresh="refreshPolicyList"
      >
        <template #actions>
          <div class="flex flex-wrap items-center gap-2">
            <QuickCreateLauncher variant="primary" size="sm" :label="quickPolicyUi.newLabel" @launch="openQuickPolicyDialog" />
            <ActionButton variant="secondary" size="sm" :disabled="policyResource.loading" @click="refreshPolicyList">
              {{ t("refresh") }}
            </ActionButton>
          </div>
        </template>
        <template #filters>
          <WorkbenchFilterToolbar
            v-model="policyPresetKey"
            :advanced-label="t('advancedFilters')"
            :collapse-label="t('hideAdvancedFilters')"
            :active-count="policyActiveFilterCount"
            :active-count-label="t('activeFilters')"
            :preset-label="t('presetLabel')"
            :preset-options="policyPresetOptions"
            :can-delete-preset="canDeletePolicyPreset"
            :save-label="t('savePreset')"
            :delete-label="t('deletePreset')"
            :apply-label="t('applyFilters')"
            :reset-label="t('clearFilters')"
            @preset-change="onPolicyPresetChange"
            @preset-save="savePolicyPreset"
            @preset-delete="deletePolicyPreset"
            @apply="applyFilters"
            @reset="resetFilters"
          >
            <input
              v-model.trim="filters.query"
              class="input"
              type="search"
              :placeholder="t('searchPlaceholder')"
              @keyup.enter="applyFilters"
            />

            <select v-model="filters.insurance_company" class="input">
              <option value="">{{ t("allCompanies") }}</option>
              <option v-for="company in companies" :key="company.name" :value="company.name">
                {{ company.company_name || company.name }}
              </option>
            </select>

            <input
              v-model="filters.end_date"
              class="input"
              type="date"
              :placeholder="t('endDateFilter')"
            />

            <select v-model="filters.status" class="input">
              <option value="">{{ t("allStatuses") }}</option>
              <option v-for="status in statusOptions" :key="status.value" :value="status.value">
                {{ status.label }}
              </option>
            </select>

            <select v-model="filters.sort" class="input">
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>

            <select v-model.number="pagination.pageLength" class="input">
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>

            <template #advanced>
              <input
                v-model.trim="filters.customer"
                class="input"
                type="search"
                :placeholder="t('customerFilter')"
                @keyup.enter="applyFilters"
              />
              <input
                v-model="filters.gross_min"
                class="input"
                type="number"
                min="0"
                step="0.01"
                :placeholder="t('grossMinFilter')"
                @keyup.enter="applyFilters"
              />
              <input
                v-model="filters.gross_max"
                class="input"
                type="number"
                min="0"
                step="0.01"
                :placeholder="t('grossMaxFilter')"
                @keyup.enter="applyFilters"
              />
            </template>

          </WorkbenchFilterToolbar>
        </template>
      </PageToolbar>
    </div>

    <DataTableShell
      :loading="isInitialLoading"
      :error="policyListError"
      :empty="rows.length === 0"
      :loading-label="t('loading')"
      :error-title="t('loadErrorTitle')"
      :empty-title="t('emptyTitle')"
      :empty-description="t('empty')"
    >
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-slate-600">
            {{ t("showing") }} {{ startRow }}-{{ endRow }} / {{ pagination.total }}
          </p>
        </div>
      </template>

      <template #default>
        <div class="at-table-wrap">
          <table class="at-table min-h-[460px]">
            <thead>
              <tr class="at-table-head-row">
                <th class="at-table-head-cell">{{ t("colPolicy") }}</th>
                <th class="at-table-head-cell">{{ t("colDetails") }}</th>
                <th class="at-table-head-cell">{{ t("colStatus") }}</th>
                <th class="at-table-head-cell">{{ t("colPremiums") }}</th>
                <th class="at-table-head-cell">{{ t("colActions") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in rows"
                :key="row.name"
                class="at-table-row cursor-pointer"
                @click="openPolicyDetail(row.name)"
              >
                <DataTableCell cell-class="min-w-[220px]">
                  <TableEntityCell :title="row.policy_no || row.name" :facts="policyIdentityFacts(row)" />
                </DataTableCell>
                <TableFactsCell :items="policyDetailsFacts(row)" cell-class="min-w-[240px]" />
                <DataTableCell>
                  <StatusBadge type="policy" :status="row.status" />
                </DataTableCell>
                <TableFactsCell :items="policyPremiumFacts(row)" cell-class="min-w-[220px]" />
                <DataTableCell @click.stop>
                  <InlineActionRow>
                  </InlineActionRow>
                </DataTableCell>
              </tr>
            </tbody>
          </table>
        </div>

      </template>

      <template #footer>
        <TablePagerFooter
          :page="pagination.page"
          :total-pages="totalPages"
          :page-label="t('page')"
          :previous-label="t('previous')"
          :next-label="t('next')"
          :prev-disabled="pagination.page <= 1 || policyResource.loading"
          :next-disabled="!hasNextPage || policyResource.loading"
          @previous="previousPage"
          @next="nextPage"
        />
      </template>
    </DataTableShell>

    <Dialog v-model="showQuickPolicyDialog" :options="{ title: quickPolicyUi.title, size: 'xl' }">
      <template #body-content>
        <QuickCreateDialogShell
          :error="quickPolicyError"
          :subtitle="quickPolicyUi.subtitle"
          :labels="quickCreateCommon"
          :loading="quickPolicyLoading"
          @cancel="cancelQuickPolicyDialog"
          @save="submitQuickPolicy(false)"
          @save-and-open="submitQuickPolicy(true)"
        >
          <QuickCreateFormRenderer
            :fields="policyQuickFields"
            :model="quickPolicyForm"
            :field-errors="quickPolicyFieldErrors"
            :disabled="quickPolicyLoading"
            :locale="sessionState.locale"
            :options-map="policyQuickOptionsMap"
            @submit="submitQuickPolicy(false)"
          />
        </QuickCreateDialogShell>
      </template>
    </Dialog>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Dialog, createResource } from "frappe-ui";

import { sessionState } from "../state/session";
import ActionButton from "../components/app-shell/ActionButton.vue";
import DataTableCell from "../components/app-shell/DataTableCell.vue";
import StatusBadge from "../components/StatusBadge.vue";
import DataTableShell from "../components/app-shell/DataTableShell.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import PageToolbar from "../components/app-shell/PageToolbar.vue";
import QuickCreateDialogShell from "../components/app-shell/QuickCreateDialogShell.vue";
import QuickCreateFormRenderer from "../components/app-shell/QuickCreateFormRenderer.vue";
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import TablePagerFooter from "../components/app-shell/TablePagerFooter.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
import { buildQuickCreateDraft, getQuickCreateConfig, getLocalizedText } from "../config/quickCreateRegistry";
import { runQuickCreateSuccessTargets } from "../utils/quickCreateSuccess";
import { mutedFact, subtleFact } from "../utils/factItems";
import { readQuickCreateIntent, stripQuickCreateIntentQuery } from "../utils/quickRouteIntent";
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

const copy = {
  tr: {
    title: "Police Yonetimi",
    subtitle: "Frappe CRM tarzinda police listesi, filtre, siralama ve sayfalama",
    refresh: "Yenile",
    allCompanies: "Tum Sigorta Sirketleri",
    searchPlaceholder: "Police / Musteri / Kayit ara",
    endDateFilter: "Bitis Tarihi",
    allStatuses: "Tum Durumlar",
    advancedFilters: "Gelismis Filtreler",
    hideAdvancedFilters: "Gelismis Filtreleri Gizle",
    activeFilters: "aktif filtre",
    presetLabel: "Filtre Sablonu",
    presetDefault: "Standart",
    presetActive: "Aktif Policeler",
    presetExpiring30: "30 Gun Icinde Bitecek",
    presetHighPremium: "Yuksek Prim",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    savePresetPrompt: "Filtre sablonu adi",
    deletePresetConfirm: "Secili ozel filtre sablonu silinsin mi?",
    applyFilters: "Uygula",
    clearFilters: "Filtreleri Temizle",
    customerFilter: "Musteri (icerir)",
    grossMinFilter: "Min Brut Prim",
    grossMaxFilter: "Max Brut Prim",
    showing: "Gosterilen",
    loading: "Yukleniyor...",
    emptyTitle: "Police Bulunamadi",
    empty: "Filtrelere uygun police kaydi bulunamadi.",
    loadErrorTitle: "Liste Yuklenemedi",
    loadError: "Police listesi yuklenirken bir hata olustu. Lutfen tekrar deneyin.",
    openDesk: "Yonetim Ekraninda Ac",
    page: "Sayfa",
    previous: "Onceki",
    next: "Sonraki",
    colPolicy: "Police",
    colCustomer: "Musteri",
    colCompany: "Sigorta Sirketi",
    colEndDate: "Bitis Tarihi",
    colDetails: "Detaylar",
    colStatus: "Police Durumu",
    colPremiums: "Primler",
    colGross: "Brut Prim",
    colCommission: "Komisyon",
    colGwpTry: "GWP TRY",
    colActions: "Aksiyon",
    sortModifiedDesc: "Son Guncellenen",
    sortEndDateAsc: "Bitis Tarihi (Yakin)",
    sortEndDateDesc: "Bitis Tarihi (Uzak)",
    sortGrossDesc: "Brut Prim (Yuksek)",
  },
  en: {
    title: "Policy Workbench",
    subtitle: "Frappe CRM style policy list with filters, sorting and pagination",
    refresh: "Refresh",
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
    customerFilter: "Customer (contains)",
    grossMinFilter: "Min Gross Premium",
    grossMaxFilter: "Max Gross Premium",
    showing: "Showing",
    loading: "Loading...",
    emptyTitle: "No Policies Found",
    empty: "No policy records found for current filters.",
    loadErrorTitle: "Failed to Load List",
    loadError: "An error occurred while loading policies. Please try again.",
    openDesk: "Desk",
    page: "Page",
    previous: "Previous",
    next: "Next",
    colPolicy: "Policy",
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
  return copy[sessionState.locale]?.[key] || copy.en[key] || key;
}

const filters = reactive({
  query: "",
  insurance_company: "",
  end_date: "",
  status: "",
  customer: "",
  gross_min: "",
  gross_max: "",
  sort: "modified desc",
});

const pagination = reactive({
  page: 1,
  pageLength: 20,
  total: 0,
});
const POLICY_PRESET_STORAGE_KEY = "at:policy-list:preset";
const POLICY_PRESET_LIST_STORAGE_KEY = "at:policy-list:preset-list";
const policyPresetKey = ref(readFilterPresetKey(POLICY_PRESET_STORAGE_KEY, "default"));
const policyCustomPresets = ref(readFilterPresetList(POLICY_PRESET_LIST_STORAGE_KEY));

const statusOptions = computed(() => [
  { value: "Active", label: sessionState.locale === "tr" ? "Aktif" : "Active" },
  { value: "KYT", label: "KYT" },
  { value: "IPT", label: sessionState.locale === "tr" ? "Iptal" : "Cancelled" },
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
const quickPolicyLoading = ref(false);
const quickPolicyError = ref("");
const quickPolicyFieldErrors = reactive({});
const quickPolicyForm = reactive(buildQuickCreateDraft(quickPolicyConfig));
const quickPolicyReturnTo = ref("");
const quickPolicyOpenedFromIntent = ref(false);

const companyResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Insurance Company",
    fields: ["name", "company_name"],
    order_by: "company_name asc",
    limit_page_length: 500,
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
    limit_page_length: 500,
  },
});
const policyQuickSalesEntityResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Sales Entity",
    fields: ["name", "full_name"],
    order_by: "full_name asc",
    limit_page_length: 500,
  },
});
const policyQuickCustomerResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Customer",
    fields: ["name", "full_name"],
    order_by: "modified desc",
    limit_page_length: 200,
  },
});
const policyQuickOfferResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Offer",
    fields: ["name", "customer", "offer_date", "status"],
    order_by: "modified desc",
    limit_page_length: 200,
  },
});
const quickPolicyCreateResource = createResource({
  url: quickPolicyConfig.submitUrl,
  auto: false,
});

const policyResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
});

const policyCountResource = createResource({
  url: "frappe.client.count",
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

const companies = computed(() => companyResource.data || []);
const rows = computed(() => policyResource.data || []);
const localeCode = computed(() => (sessionState.locale === "tr" ? "tr-TR" : "en-US"));
const policyQuickFields = computed(() => quickPolicyConfig?.fields || []);
const policyQuickOptionsMap = computed(() => ({
  customers: (policyQuickCustomerResource.data || []).map((row) => ({ value: row.name, label: row.full_name || row.name })),
  salesEntities: (policyQuickSalesEntityResource.data || []).map((row) => ({ value: row.name, label: row.full_name || row.name })),
  insuranceCompanies: companies.value.map((row) => ({ value: row.name, label: row.company_name || row.name })),
  branches: (policyQuickBranchResource.data || []).map((row) => ({ value: row.name, label: row.branch_name || row.name })),
  offers: (policyQuickOfferResource.data || []).map((row) => ({
    value: row.name,
    label: `${row.name}${row.customer ? ` - ${row.customer}` : ""}`,
  })),
}));
const quickPolicyUi = computed(() => ({
  title: getLocalizedText(quickPolicyConfig?.title, sessionState.locale),
  subtitle: getLocalizedText(quickPolicyConfig?.subtitle, sessionState.locale),
  newLabel: sessionState.locale === "tr" ? "Yeni Police" : "New Policy",
}));
const quickCreateCommon = computed(() => ({
  cancel: sessionState.locale === "tr" ? "Vazgec" : "Cancel",
  save: sessionState.locale === "tr" ? "Kaydet" : "Save",
  saveAndOpen: sessionState.locale === "tr" ? "Kaydet ve Ac" : "Save & Open",
  validation: sessionState.locale === "tr" ? "Lutfen gerekli alanlari doldurun." : "Please fill required fields.",
  failed: sessionState.locale === "tr" ? "Hizli police olusturma basarisiz oldu." : "Quick policy create failed.",
}));
const policyListError = ref("");

const totalPages = computed(() => {
  if (!pagination.total) return 1;
  return Math.max(1, Math.ceil(pagination.total / pagination.pageLength));
});

const hasNextPage = computed(() => pagination.page < totalPages.value);

const startRow = computed(() => {
  if (!pagination.total) return 0;
  return (pagination.page - 1) * pagination.pageLength + 1;
});

const endRow = computed(() => {
  if (!pagination.total) return 0;
  return Math.min(pagination.total, pagination.page * pagination.pageLength);
});

const isInitialLoading = computed(() => policyResource.loading && rows.value.length === 0);
const policyActiveFilterCount = computed(() =>
  [
    filters.query,
    filters.insurance_company,
    filters.end_date,
    filters.status,
    filters.customer,
    filters.gross_min,
    filters.gross_max,
  ].filter((value) => String(value ?? "").trim() !== "").length
);

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
  return {
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
  };
}

function buildCountParams() {
  const payload = buildPolicyFilterPayload();
  return {
    doctype: "AT Policy",
    filters: payload.filters,
    ...(payload.or_filters ? { or_filters: payload.or_filters } : {}),
  };
}

async function refreshPolicyList() {
  if (pagination.page > totalPages.value && pagination.total > 0) {
    pagination.page = totalPages.value;
  }

  policyResource.params = buildPolicyParams();
  policyCountResource.params = buildCountParams();

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
      pagination.total = Number.isFinite(total) ? total : 0;
    } else {
      pagination.total = records.length;
    }
    return;
  }

  pagination.total = 0;
  policyResource.setData([]);
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

function resetQuickPolicyForm() {
  Object.assign(quickPolicyForm, buildQuickCreateDraft(quickPolicyConfig));
  quickPolicyError.value = "";
  clearQuickPolicyFieldErrors();
}

function openQuickPolicyDialog({ fromIntent = false, returnTo = "" } = {}) {
  resetQuickPolicyForm();
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

function validateQuickPolicyForm() {
  clearQuickPolicyFieldErrors();
  quickPolicyError.value = "";
  let valid = true;
  for (const field of policyQuickFields.value) {
    if (!field?.required) continue;
    if (String(quickPolicyForm[field.name] ?? "").trim() === "") {
      quickPolicyFieldErrors[field.name] = getLocalizedText(field.label, sessionState.locale);
      valid = false;
    }
  }
  if (!valid) {
    quickPolicyError.value = quickCreateCommon.value.validation;
    return false;
  }
  const gross = Number(quickPolicyForm.gross_premium || 0);
  if (!(Number.isFinite(gross) && gross > 0)) {
    quickPolicyFieldErrors.gross_premium = getLocalizedText(
      policyQuickFields.value.find((f) => f.name === "gross_premium")?.label,
      sessionState.locale
    );
    quickPolicyError.value = quickCreateCommon.value.validation;
    return false;
  }
  return true;
}

function buildQuickPolicyPayload() {
  return {
    customer: quickPolicyForm.customer || null,
    sales_entity: quickPolicyForm.sales_entity || null,
    insurance_company: quickPolicyForm.insurance_company || null,
    branch: quickPolicyForm.branch || null,
    policy_no: quickPolicyForm.policy_no || null,
    source_offer: quickPolicyForm.source_offer || null,
    status: quickPolicyForm.status || "Active",
    issue_date: quickPolicyForm.issue_date || null,
    start_date: quickPolicyForm.start_date || null,
    end_date: quickPolicyForm.end_date || null,
    currency: quickPolicyForm.currency || "TRY",
    gross_premium: quickPolicyForm.gross_premium === "" ? null : Number(quickPolicyForm.gross_premium || 0),
    net_premium: quickPolicyForm.net_premium === "" ? null : Number(quickPolicyForm.net_premium || 0),
    tax_amount: quickPolicyForm.tax_amount === "" ? null : Number(quickPolicyForm.tax_amount || 0),
    commission_amount:
      quickPolicyForm.commission_amount === "" ? null : Number(quickPolicyForm.commission_amount || 0),
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

function consumeQuickPolicyRouteIntent() {
  const intent = readQuickCreateIntent(route.query);
  if (!intent.quick) return;
  openQuickPolicyDialog({ fromIntent: true, returnTo: intent.returnTo });
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
  return [subtleFact("record", "ID", row?.name || "-")];
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

applyPolicyPreset(policyPresetKey.value, { refresh: false });
void refreshPolicyList();
void hydratePolicyPresetStateFromServer();
void consumeQuickPolicyRouteIntent();
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>
