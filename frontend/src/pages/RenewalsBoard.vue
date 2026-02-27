<template>
  <section class="space-y-4">
    <article class="surface-card rounded-2xl p-5">
      <PageToolbar
        :title="t('title')"
        :subtitle="t('subtitle')"
        :busy="renewalsResource.loading"
        :show-refresh="true"
        :refresh-label="t('refresh')"
        @refresh="reloadRenewals"
      >
        <template #actions>
          <div class="flex flex-wrap items-center gap-2">
            <QuickCreateLauncher
              variant="primary"
              size="sm"
              :label="t('newTask')"
              @launch="showQuickRenewalDialog = true"
            />
            <ActionButton variant="secondary" size="sm" :disabled="renewalsResource.loading" @click="reloadRenewals">
              {{ t("refresh") }}
            </ActionButton>
          </div>
        </template>
        <template #filters>
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
            @apply="applyRenewalFilters"
            @reset="resetRenewalFilters"
          >
            <input
              v-model.trim="filters.query"
              class="input"
              type="search"
              :placeholder="t('searchPlaceholder')"
              @keyup.enter="applyRenewalFilters"
            />
            <select v-model="filters.status" class="input">
              <option value="">{{ t("allStatuses") }}</option>
              <option v-for="option in renewalStatusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <select v-model.number="filters.limit" class="input">
              <option :value="20">20</option>
              <option :value="40">40</option>
              <option :value="80">80</option>
              <option :value="120">120</option>
            </select>

            <template #advanced>
              <input
                v-model.trim="filters.policyQuery"
                class="input"
                type="search"
                :placeholder="t('policyFilter')"
                @keyup.enter="applyRenewalFilters"
              />
              <select v-model="filters.dueScope" class="input">
                <option value="">{{ t("allDueScopes") }}</option>
                <option value="overdue">{{ t("dueScopeOverdue") }}</option>
                <option value="7">{{ t("dueScope7") }}</option>
                <option value="30">{{ t("dueScope30") }}</option>
                <option value="60">{{ t("dueScope60") }}</option>
              </select>
            </template>
          </WorkbenchFilterToolbar>
        </template>
      </PageToolbar>
    </article>

    <DocSummaryGrid v-if="showSummaryGrid" :items="renewalSummaryItems" />

    <DataTableShell
      :loading="renewalsResource.loading"
      :error="renewalsError"
      :empty="!renewalsResource.loading && !renewalsError && renewals.length === 0"
      :loading-label="t('loading')"
      :error-title="t('loadErrorTitle')"
      :empty-title="t('emptyTitle')"
      :empty-description="t('emptyDescription')"
    >
      <template #header>
        <div class="text-xs text-slate-500">
          {{ t("showing") }} {{ renewals.length }}
        </div>
      </template>

      <div class="overflow-auto">
        <table class="at-table">
          <thead>
            <tr class="at-table-head-row">
              <th class="at-table-head-cell">{{ t("task") }}</th>
              <th class="at-table-head-cell">{{ t("policy") }}</th>
              <th class="at-table-head-cell">{{ t("status") }}</th>
              <th class="at-table-head-cell">{{ t("due") }}</th>
              <th class="at-table-head-cell">{{ t("renewal") }}</th>
              <th class="at-table-head-cell">{{ t("actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in renewals" :key="task.name" class="at-table-row">
              <td class="at-table-cell font-medium text-slate-800">{{ task.name }}</td>
              <td class="at-table-cell text-slate-700">{{ task.policy || "-" }}</td>
              <td class="at-table-cell">
                <StatusBadge type="renewal" :status="task.status" />
              </td>
              <td class="at-table-cell text-slate-700">{{ formatDate(task.due_date) }}</td>
              <td class="at-table-cell text-slate-700">{{ formatDate(task.renewal_date) }}</td>
              <td class="at-table-cell">
                <InlineActionRow>
                  <ActionButton
                    v-if="task.policy"
                    variant="secondary"
                    size="xs"
                    @click="openPolicy(task.policy)"
                  >
                    {{ t("openPolicy") }}
                  </ActionButton>
                </InlineActionRow>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </DataTableShell>

    <QuickCreateManagedDialog
      v-model="showQuickRenewalDialog"
      config-key="renewal_task"
      :locale="sessionState.locale"
      :options-map="renewalQuickOptionsMap"
      :show-save-and-open="false"
      :before-open="prepareQuickRenewalDialog"
      :success-handlers="quickRenewalSuccessHandlers"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { createResource } from "frappe-ui";

import ActionButton from "../components/app-shell/ActionButton.vue";
import DataTableShell from "../components/app-shell/DataTableShell.vue";
import DocSummaryGrid from "../components/app-shell/DocSummaryGrid.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import PageToolbar from "../components/app-shell/PageToolbar.vue";
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import StatusBadge from "../components/StatusBadge.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
import { useCustomFilterPresets } from "../composables/useCustomFilterPresets";
import { sessionState } from "../state/session";

const copy = {
  tr: {
    title: "Yenilemeler",
    subtitle: "Bitise yakin policeler ve takip gorevleri",
    refresh: "Yenile",
    newTask: "Yeni Gorev",
    loading: "Yukleniyor...",
    loadErrorTitle: "Yenilemeler Yuklenemedi",
    loadError: "Yenileme gorevleri yuklenirken bir hata olustu.",
    emptyTitle: "Yenileme Kaydi Yok",
    emptyDescription: "Gosterilecek yenileme gorevi bulunamadi.",
    showing: "Gosterilen kayit",
    task: "Gorev",
    policy: "Police",
    status: "Durum",
    due: "Termin",
    renewal: "Yenileme",
    actions: "Aksiyon",
    openDesk: "Yonetim",
    openPolicy: "Policeyi Ac",
    metricTotal: "Toplam Gorev",
    metricOpen: "Acik",
    metricInProgress: "Devam Eden",
    metricDone: "Tamamlanan",
    metricCancelled: "Iptal",
    advancedFilters: "Gelismis Filtreler",
    hideAdvancedFilters: "Gelismis Filtreleri Gizle",
    activeFilters: "aktif filtre",
    presetLabel: "Filtre Sablonu",
    presetDefault: "Standart",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    savePresetPrompt: "Filtre sablonu adi",
    deletePresetConfirm: "Secili ozel filtre sablonu silinsin mi?",
    applyFilters: "Uygula",
    clearFilters: "Filtreleri Temizle",
    searchPlaceholder: "Gorev / police ara",
    allStatuses: "Tum durumlar",
    policyFilter: "Police (icerir)",
    allDueScopes: "Tum termin araliklari",
    dueScopeOverdue: "Gecikenler",
    dueScope7: "7 gun icinde",
    dueScope30: "30 gun icinde",
    dueScope60: "60 gun icinde",
  },
  en: {
    title: "Renewals",
    subtitle: "Near-expiry policies and follow-up tasks",
    refresh: "Refresh",
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
    due: "Due",
    renewal: "Renewal",
    actions: "Actions",
    openDesk: "Desk",
    openPolicy: "Open Policy",
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
  return copy[sessionState.locale]?.[key] || copy.en[key] || key;
}

const filters = reactive({
  query: "",
  status: "",
  policyQuery: "",
  dueScope: "",
  limit: 40,
});

const renewalStatusOptions = computed(() =>
  ["Open", "In Progress", "Done", "Cancelled"].map((value) => ({ value, label: value }))
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
  getSortLocale: () => (sessionState.locale === "tr" ? "tr-TR" : "en-US"),
});

const renewalsResource = createResource({
  url: "frappe.client.get_list",
  params: buildRenewalListParams(),
  auto: true,
});

const renewalQuickPolicyResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Policy",
    fields: ["name", "policy_no", "customer"],
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
    order_by: "modified desc",
    limit_page_length: 500,
  },
});

const renewalsRaw = computed(() => renewalsResource.data || []);
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
const localeCode = computed(() => (sessionState.locale === "tr" ? "tr-TR" : "en-US"));
const showQuickRenewalDialog = ref(false);
const renewalQuickOptionsMap = computed(() => ({
  policies: (renewalQuickPolicyResource.data || []).map((row) => ({
    value: row.name,
    label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
  })),
  customers: (renewalQuickCustomerResource.data || []).map((row) => ({
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
  () => !renewalsResource.loading && !renewalsError.value && renewals.value.length > 0
);
const renewalSummaryItems = computed(() => {
  const rows = renewals.value;
  const countByStatus = rows.reduce((acc, row) => {
    const key = String(row.status || "Open");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const doneCount = Number(countByStatus.Done || 0) + Number(countByStatus.Completed || 0);
  return [
    { key: "total", label: t("metricTotal"), value: String(rows.length) },
    { key: "open", label: t("metricOpen"), value: String(countByStatus.Open || 0), valueClass: "text-amber-700" },
    {
      key: "in-progress",
      label: t("metricInProgress"),
      value: String(countByStatus["In Progress"] || 0),
      valueClass: "text-sky-700",
    },
    { key: "done", label: t("metricDone"), value: String(doneCount), valueClass: "text-emerald-700" },
    {
      key: "cancelled",
      label: t("metricCancelled"),
      value: String(countByStatus.Cancelled || 0),
      valueClass: "text-rose-700",
    },
  ];
});

const renewalsError = computed(() => {
  const err = renewalsResource.error;
  if (!err) return "";
  if (Array.isArray(err.messages) && err.messages.length > 0) return err.messages.join(" ");
  return err.message || t("loadError");
});

function reloadRenewals() {
  renewalsResource.params = buildRenewalListParams();
  return renewalsResource.reload();
}

function openPolicy(policyName) {
  if (!policyName) return;
  window.location.href = `/at/policies/${encodeURIComponent(policyName)}`;
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
  return String(value || "").trim().toLocaleLowerCase(sessionState.locale === "tr" ? "tr-TR" : "en-US");
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
    fields: ["name", "policy", "status", "due_date", "renewal_date"],
    order_by: "due_date asc",
    limit_page_length: Number(filters.limit) || 40,
  };
  if (filters.status) {
    params.filters = { status: filters.status };
  }
  return params;
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
  filters.query = String(payload?.query || "");
  filters.status = String(payload?.status || "");
  filters.policyQuery = String(payload?.policyQuery || "");
  filters.dueScope = String(payload?.dueScope || "");
  filters.limit = Number(payload?.limit || 40) || 40;
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

onMounted(() => {
  applyPreset(presetKey.value, { refresh: false });
  if (String(presetKey.value || "default") !== "default") void reloadRenewals();
  void hydratePresetStateFromServer();
});
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>
