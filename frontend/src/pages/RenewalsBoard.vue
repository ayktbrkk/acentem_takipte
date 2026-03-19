<template>
  <section role="main" class="page-shell space-y-4">
    <div class="detail-topbar">
      <div>
        <p class="detail-breadcrumb">Sigorta Operasyonları → Yenilemeler</p>
        <h1 class="text-xl font-medium text-gray-900">{{ t("title") }}</h1>
      </div>
      <span class="text-sm text-gray-400">{{ renewals.length }} kayıt</span>
    </div>

    <!-- summary cards from renewalSummaryItems (already exists in script) -->
    <div class="grid grid-cols-2 gap-3 px-5 md:grid-cols-5">
      <div class="mini-metric">
        <p class="mini-metric-label">{{ t("metricTotal") }}</p>
        <p class="mini-metric-value">{{ renewalSummary.total }}</p>
      </div>
      <div class="mini-metric">
        <p class="mini-metric-label">{{ t("metricOpen") }}</p>
        <p class="mini-metric-value text-amber-600">{{ renewalSummary.open }}</p>
      </div>
      <div class="mini-metric">
        <p class="mini-metric-label">{{ t("metricInProgress") }}</p>
        <p class="mini-metric-value text-blue-600">{{ renewalSummary.inProgress }}</p>
      </div>
      <div class="mini-metric">
        <p class="mini-metric-label">{{ t("metricDone") }}</p>
        <p class="mini-metric-value text-green-600">{{ renewalSummary.done }}</p>
      </div>
      <div class="mini-metric">
        <p class="mini-metric-label">{{ t("metricCancelled") }}</p>
        <p class="mini-metric-value text-gray-500">{{ renewalSummary.cancelled }}</p>
      </div>
    </div>

    <!-- filter bar -->
    <div class="border-b border-gray-200 bg-white px-5 py-3">
      <FilterBar
        v-model:search="filters.query"
        :filters="renewalListFilterConfig"
        :active-count="renewalListActiveCount"
        @filter-change="onRenewalFilterChange"
        @reset="resetRenewalFilters"
      >
        <template #actions>
          <button class="btn btn-primary btn-sm" @click="showQuickRenewalDialog = true">+ Yeni Görev</button>
          <button class="btn btn-sm" :disabled="renewalsLoading" @click="reloadRenewals">Yenile</button>
          <button class="btn btn-sm" :disabled="renewalsLoading" @click="downloadRenewalExport('xlsx')">Excel</button>
          <button class="btn btn-sm" :disabled="renewalsLoading" @click="downloadRenewalExport('pdf')">PDF</button>
        </template>
      </FilterBar>
    </div>

    <!-- table -->
    <div class="flex-1 p-5">
      <ListTable
        :columns="renewalListColumns"
        :rows="renewalListRows"
        :loading="renewalsLoading"
        empty-message="Yenileme görevi bulunamadı."
        @row-click="(row) => openRenewalDetail(row)"
      />
    </div>

    <QuickCreateManagedDialog
      v-model="showQuickRenewalDialog"
      config-key="renewal_task"
      :locale="activeLocale"
      :options-map="renewalQuickOptionsMap"
      :show-save-and-open="false"
      :before-open="prepareQuickRenewalDialog"
      :success-handlers="quickRenewalSuccessHandlers"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRoute, useRouter } from "vue-router";

import ActionButton from "../components/app-shell/ActionButton.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import FilterBar from "../components/ui/FilterBar.vue";
import ListTable from "../components/ui/ListTable.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import { useCustomFilterPresets } from "../composables/useCustomFilterPresets";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useRenewalStore } from "../stores/renewal";
import { openTabularExport } from "../utils/listExport";

const copy = {
  tr: {
    title: "Yenilemeler",
    subtitle: "Bitişe yakın poliçeler ve takip görevleri",
    refresh: "Yenile",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    newTask: "Yeni Görev",
    loading: "Yükleniyor...",
    loadErrorTitle: "Yenilemeler Yüklenemedi",
    loadError: "Yenileme görevleri yüklenirken bir hata oluştu.",
    emptyTitle: "Yenileme Kaydı Yok",
    emptyDescription: "Gösterilecek yenileme görevi bulunamadı.",
    showing: "Gösterilen kayıt",
    task: "Görev",
    policy: "Poliçe",
    status: "Durum",
    competitor: "Rakip",
    due: "Termin",
    renewal: "Yenileme",
    actions: "Aksiyon",
    openDesk: "Yönetim",
    openPolicy: "Poliçeyi Aç",
    markInProgress: "Takibe Al",
    markDone: "Tamamla",
    metricTotal: "Toplam Görev",
    metricOpen: "Açık",
    metricInProgress: "Devam Eden",
    metricDone: "Tamamlanan",
    metricCancelled: "İptal",
    advancedFilters: "Gelişmiş Filtreler",
    hideAdvancedFilters: "Gelişmiş Filtreleri Gizle",
    activeFilters: "aktif filtre",
    presetLabel: "Filtre Şablonu",
    presetDefault: "Standart",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    savePresetPrompt: "Filtre şablonu adı",
    deletePresetConfirm: "Seçili özel filtre şablonu silinsin mi?",
    applyFilters: "Uygula",
    clearFilters: "Filtreleri Temizle",
    searchPlaceholder: "Görev / poliçe ara",
    allStatuses: "Tüm durumlar",
    policyFilter: "Poliçe (içerir)",
    allDueScopes: "Tüm termin aralıkları",
    dueScopeOverdue: "Gecikenler",
    dueScope7: "7 gün içinde",
    dueScope30: "30 gün içinde",
    dueScope60: "60 gün içinde",
  },
  en: {
    title: "Renewals",
    subtitle: "Near-expiry policies and follow-up tasks",
    refresh: "Refresh",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    newTask: "New Task",
    loading: "Loading...",
    loadErrorTitle: "Failed to Load Renewals",
    loadError: "An error occurred while loading renewal tasks.",
    emptyTitle: "No Renewal Tasks",
    emptyDescription: "No renewal tasks found to display.",
    showing: "Showing rows",
    task: "Task",
    policy: "Policy",
    status: "Status",
    competitor: "Competitor",
    due: "Due",
    renewal: "Renewal",
    actions: "Actions",
    openDesk: "Desk",
    openPolicy: "Open Policy",
    markInProgress: "Start Follow-up",
    markDone: "Mark Done",
    metricTotal: "Total Tasks",
    metricOpen: "Open",
    metricInProgress: "In Progress",
    metricDone: "Done",
    metricCancelled: "Cancelled",
    advancedFilters: "Advanced Filters",
    hideAdvancedFilters: "Hide Advanced Filters",
    activeFilters: "active filters",
    presetLabel: "Filter Preset",
    presetDefault: "Standard",
    savePreset: "Save",
    deletePreset: "Delete",
    savePresetPrompt: "Filter preset name",
    deletePresetConfirm: "Delete selected custom filter preset?",
    applyFilters: "Apply",
    clearFilters: "Clear Filters",
    searchPlaceholder: "Search task / policy",
    allStatuses: "All statuses",
    policyFilter: "Policy (contains)",
    allDueScopes: "All due ranges",
    dueScopeOverdue: "Overdue",
    dueScope7: "Due in 7 days",
    dueScope30: "Due in 30 days",
    dueScope60: "Due in 60 days",
  },
};

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

const authStore = useAuthStore();
const branchStore = useBranchStore();
const renewalStore = useRenewalStore();
const route = useRoute();
const router = useRouter();
const activeLocale = computed(() => unref(authStore.locale) || "en");
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
const resourceValue = (resource, fallback = null) => {
  const value = unref(resource?.data);
  return value == null ? fallback : value;
};
const asArray = (value) => (Array.isArray(value) ? value : []);

function buildOfficeBranchLookupFilters() {
  const officeBranch = branchStore.requestBranch || "";
  return officeBranch ? { office_branch: officeBranch } : {};
}

const filters = renewalStore.state.filters;

const renewalStatusOptions = computed(() =>
  ["Open", "In Progress", "Done", "Cancelled"].map((value) => ({ value, label: value }))
);
const lostReasonColumnLabel = computed(() =>
  activeLocale.value === "tr" ? "Kayip Sonucu" : "Loss Outcome"
);
const activeFilterCount = computed(() => {
  let count = 0;
  if (filters.query) count += 1;
  if (filters.status) count += 1;
  if (filters.policyQuery) count += 1;
  if (filters.dueScope) count += 1;
  if (Number(filters.limit) !== 40) count += 1;
  return count;
});
const {
  presetKey,
  presetOptions,
  canDeletePreset,
  applyPreset,
  onPresetChange,
  savePreset,
  deletePreset,
  persistPresetStateToServer,
  hydratePresetStateFromServer,
} = useCustomFilterPresets({
  screen: "renewals_board",
  presetStorageKey: "at:renewals-board:preset",
  presetListStorageKey: "at:renewals-board:preset-list",
  t,
  getCurrentPayload: currentRenewalPresetPayload,
  setFilterStateFromPayload: setRenewalFilterStateFromPayload,
  resetFilterState: resetRenewalFilterState,
  refresh: reloadRenewals,
  getSortLocale: () => localeCode.value,
});

const renewalsResource = createResource({
  url: "frappe.client.get_list",
  params: buildRenewalListParams(),
  auto: true,
});
const renewalMutationResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.quick_create.update_quick_aux_record",
  auto: false,
});

const renewalQuickPolicyResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Policy",
    fields: ["name", "policy_no", "customer"],
    filters: buildOfficeBranchLookupFilters(),
    order_by: "end_date asc, modified desc",
    limit_page_length: 500,
  },
});
const renewalQuickCustomerResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Customer",
    fields: ["name", "full_name"],
    filters: buildOfficeBranchLookupFilters(),
    order_by: "modified desc",
    limit_page_length: 500,
  },
});

const renewalsRaw = computed(() => renewalStore.state.items || []);
const renewalsLoading = computed(() => Boolean(unref(renewalsResource.loading)));
const renewalMutationLoading = computed(() => Boolean(unref(renewalMutationResource.loading)));
const renewals = computed(() => {
  let rows = renewalsRaw.value.slice();
  const query = normalizeText(filters.query);
  if (query) {
    rows = rows.filter((row) =>
      [row?.name, row?.policy].some((value) => normalizeText(value).includes(query))
    );
  }
  const policyQuery = normalizeText(filters.policyQuery);
  if (policyQuery) {
    rows = rows.filter((row) => normalizeText(row?.policy).includes(policyQuery));
  }
  if (filters.dueScope) {
    rows = rows.filter((row) => matchesDueScope(row?.due_date, filters.dueScope));
  }
  return rows;
});
const showQuickRenewalDialog = ref(false);
const renewalQuickOptionsMap = computed(() => ({
  policies: asArray(resourceValue(renewalQuickPolicyResource, [])).map((row) => ({
    value: row.name,
    label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
  })),
  customers: asArray(resourceValue(renewalQuickCustomerResource, [])).map((row) => ({
    value: row.name,
    label: row.full_name || row.name,
  })),
}));
const quickRenewalSuccessHandlers = {
  renewal_list: async () => {
    await reloadRenewals();
  },
};
const showSummaryGrid = computed(
  () => !renewalStore.state.loading && !renewalsError.value && renewals.value.length > 0
);
const renewalSummaryItems = computed(() => {
  const summary = renewalStore.state.summary || {};
  return [
    { key: "total", label: t("metricTotal"), value: String(summary.total || 0) },
    { key: "open", label: t("metricOpen"), value: String(summary.open || 0), valueClass: "text-amber-700" },
    {
      key: "in-progress",
      label: t("metricInProgress"),
      value: String(summary.inProgress || 0),
      valueClass: "text-sky-700",
    },
    { key: "done", label: t("metricDone"), value: String(summary.done || 0), valueClass: "text-emerald-700" },
    {
      key: "cancelled",
      label: t("metricCancelled"),
      value: String(summary.cancelled || 0),
      valueClass: "text-rose-700",
    },
  ];
});

const renewalsError = computed(() => {
  return renewalStore.state.error || "";
});

const renewalSummary = computed(() => {
  const summary = renewalStore.state.summary || {};
  return {
    total: summary.total || 0,
    open: summary.open || 0,
    inProgress: summary.inProgress || 0,
    done: summary.done || 0,
    cancelled: summary.cancelled || 0,
  };
});

const renewalListFilterConfig = computed(() => [
  {
    key: "status",
    label: t("status"),
    options: renewalStatusOptions.value.map((o) => ({ value: o.value, label: o.label })),
  },
]);

const renewalListActiveCount = computed(() =>
  [filters.query, filters.status, filters.policyQuery, filters.dueScope]
    .filter((v) => String(v ?? "").trim() !== "").length
);

const renewalListColumns = [
  { key: "name", label: t("task"), width: "160px", type: "mono" },
  { key: "policy", label: t("policy"), width: "180px" },
  { key: "status", label: t("status"), width: "120px", type: "status" },
  { key: "due_date", label: t("due"), width: "110px" },
  { key: "renewal_date", label: t("renewal"), width: "110px" },
  { key: "lost_reason", label: t("competitor"), width: "160px" },
];

const renewalListRows = computed(() =>
  renewals.value.map((row) => ({
    ...row,
    policy: row.policy || "-",
    due_date: formatDate(row.due_date),
    renewal_date: formatDate(row.renewal_date),
    lost_reason: row.lost_reason || (row.competitor_name ? row.competitor_name : "-"),
  }))
);

function onRenewalFilterChange({ key, value }) {
  filters[key] = String(value || "");
  return reloadRenewals();
}

function openRenewalDetail(row) {
  router.push(`/renewals/${encodeURIComponent(row.name)}`);
}

function reloadRenewals() {
  renewalsResource.params = buildRenewalListParams();
  return renewalsResource.reload();
}

function downloadRenewalExport(format) {
  openTabularExport({
    permissionDoctypes: ["AT Renewal Task"],
    exportKey: "renewals_board",
    title: t("title"),
    columns: [
      t("task"),
      t("policy"),
      t("status"),
      lostReasonColumnLabel.value,
      t("competitor"),
      t("due"),
      t("renewal"),
    ],
    rows: renewals.value.map((task) => ({
      [t("task")]: task.name || "-",
      [t("policy")]: task.policy || "-",
      [t("status")]: task.status || "-",
      [lostReasonColumnLabel.value]: formatLostReason(task),
      [t("competitor")]: task.competitor_name || "-",
      [t("due")]: formatDate(task.due_date),
      [t("renewal")]: formatDate(task.renewal_date),
    })),
    filters: currentRenewalPresetPayload(),
    format,
  });
}

function canMoveRenewalToStatus(task, nextStatus) {
  const current = String(task?.status || "").trim();
  if (!current || current === nextStatus) return false;
  const transitions = {
    Open: ["In Progress", "Done", "Cancelled"],
    "In Progress": ["Done", "Cancelled"],
  };
  return Boolean(transitions[current]?.includes(nextStatus));
}

async function updateRenewalStatus(task, nextStatus) {
  if (!task?.name || !nextStatus) return;
  await renewalMutationResource.submit({
    doctype: "AT Renewal Task",
    name: task.name,
    data: {
      status: nextStatus,
    },
  });
  await reloadRenewals();
}

function openPolicy(policyName) {
  if (!policyName) return;
  window.location.assign(`/at/policies/${encodeURIComponent(policyName)}`);
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat(localeCode.value).format(new Date(value));
  } catch {
    return value;
  }
}

function isoDateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function normalizeText(value) {
  return String(value || "").trim().toLocaleLowerCase(localeCode.value);
}

function toStartOfDay(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function matchesDueScope(dueDate, scope) {
  const target = toStartOfDay(dueDate);
  if (!target) return false;
  const today = toStartOfDay(new Date());
  if (!today) return false;
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86400000);
  if (scope === "overdue") return diffDays < 0;
  const maxDays = Number(scope);
  if (!Number.isFinite(maxDays)) return true;
  return diffDays >= 0 && diffDays <= maxDays;
}

function buildRenewalListParams() {
  const params = {
    doctype: "AT Renewal Task",
    fields: ["name", "policy", "status", "lost_reason_code", "competitor_name", "due_date", "renewal_date"],
    order_by: "due_date asc",
    limit_page_length: Number(filters.limit) || 40,
  };
  if (filters.status) {
    params.filters = { status: filters.status };
  }
  return withOfficeBranchFilter(params);
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

function applyRenewalFilters() {
  return reloadRenewals();
}

function resetRenewalFilterState() {
  filters.query = "";
  filters.status = "";
  filters.policyQuery = "";
  filters.dueScope = "";
  filters.limit = 40;
}

function currentRenewalPresetPayload() {
  return {
    query: filters.query,
    status: filters.status,
    policyQuery: filters.policyQuery,
    dueScope: filters.dueScope,
    limit: Number(filters.limit) || 40,
  };
}

function setRenewalFilterStateFromPayload(payload) {
  renewalStore.setFilters({
    query: String(payload?.query || ""),
    status: String(payload?.status || ""),
    policyQuery: String(payload?.policyQuery || ""),
    dueScope: String(payload?.dueScope || ""),
    limit: Number(payload?.limit || 40) || 40,
  });
}

function resetRenewalFilters() {
  applyPreset("default", { refresh: false });
  void persistPresetStateToServer();
  return reloadRenewals();
}

function prepareQuickRenewalDialog({ form }) {
  if (!form.renewal_date) form.renewal_date = isoDateOffset(30);
  if (!form.due_date) form.due_date = isoDateOffset(15);
}

function formatLostReason(task) {
  const rawStatus = String(task?.status || "");
  const rawReason = String(task?.lost_reason_code || "").trim();
  if (rawStatus !== "Cancelled") return "-";
  if (!rawReason) return activeLocale.value === "tr" ? "İptal" : "Cancelled";

  const labels = {
    Price: { tr: "Fiyat", en: "Price" },
    Competitor: { tr: "Rakip", en: "Competitor" },
    Service: { tr: "Hizmet", en: "Service" },
    "Customer Declined": { tr: "Müşteri Vazgeçti", en: "Customer Declined" },
    "Coverage Mismatch": { tr: "Teminat Uyumsuzlugu", en: "Coverage Mismatch" },
    Other: { tr: "Diğer", en: "Other" },
  };
  return labels[rawReason]?.[activeLocale.value] || rawReason;
}

function syncRenewalRouteFilters({ refresh = true } = {}) {
  const routeTask = String(route.query.task || "").trim();
  if (!routeTask || filters.query === routeTask) return;
  renewalStore.setFilters({ query: routeTask });
  if (refresh) void reloadRenewals();
}

onMounted(() => {
  syncRenewalRouteFilters({ refresh: false });
  applyPreset(presetKey.value, { refresh: false });
  void reloadRenewals();
  void hydratePresetStateFromServer();
});

watch(
  () => unref(renewalsResource.data),
  (rows) => {
    const nextRows = Array.isArray(rows) ? rows : [];
    renewalStore.setItems(nextRows);
  },
  { immediate: true }
);

watch(
  () => Boolean(unref(renewalsResource.loading)),
  (value) => {
    renewalStore.setLoading(value);
  },
  { immediate: true }
);

watch(
  () => unref(renewalsResource.error),
  (err) => {
    if (!err) {
      renewalStore.clearError();
      return;
    }
    if (Array.isArray(err.messages) && err.messages.length > 0) {
      renewalStore.setError(err.messages.join(" "));
      return;
    }
    renewalStore.setError(err.message || t("loadError"));
  },
  { immediate: true }
);

watch(
  () => branchStore.selected,
  () => {
    const officeFilters = buildOfficeBranchLookupFilters();
    renewalQuickPolicyResource.params = {
      doctype: "AT Policy",
      fields: ["name", "policy_no", "customer"],
      filters: officeFilters,
      order_by: "end_date asc, modified desc",
      limit_page_length: 500,
    };
    renewalQuickCustomerResource.params = {
      doctype: "AT Customer",
      fields: ["name", "full_name"],
      filters: officeFilters,
      order_by: "modified desc",
      limit_page_length: 500,
    };
    void renewalQuickPolicyResource.reload();
    void renewalQuickCustomerResource.reload();
    void reloadRenewals();
  }
);

watch(
  () => route.query.task,
  () => {
    syncRenewalRouteFilters();
  },
  { immediate: true }
);
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>
