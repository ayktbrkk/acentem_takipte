<template>
  <section class="page-shell space-y-4">
    <div class="detail-topbar">
      <div>
        <h1 class="detail-title">{{ t("title") }}</h1>
        <p class="detail-subtitle">{{ t("subtitle") }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
      <div v-for="item in renewalSummaryItems" :key="item.key" class="mini-metric">
        <p class="mini-metric-label">{{ item.label }}</p>
        <p class="mini-metric-value" :class="item.valueClass">{{ item.value }}</p>
      </div>
    </div>

    <article class="surface-card rounded-2xl p-5">
      <PageToolbar
        :show-refresh="true"
        :busy="renewalsLoading"
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
            <ActionButton variant="secondary" size="sm" :disabled="renewalsLoading" @click="reloadRenewals">
              {{ t("refresh") }}
            </ActionButton>
            <ActionButton
              variant="secondary"
              size="sm"
              :disabled="renewalsLoading"
              @click="downloadRenewalExport('xlsx')"
            >
              {{ t("exportXlsx") }}
            </ActionButton>
            <ActionButton
              variant="primary"
              size="sm"
              :disabled="renewalsLoading"
              @click="downloadRenewalExport('pdf')"
            >
              {{ t("exportPdf") }}
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

    <div v-if="renewalsError" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <p class="font-medium">{{ t("loadErrorTitle") }}</p>
      <p>{{ renewalsError }}</p>
    </div>

    <section class="kanban-board">
      <header class="kanban-board-header">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("title") }}</p>
          <p class="text-sm text-slate-500">{{ t("showing") }} {{ renewals.length }}</p>
        </div>
      </header>

      <div v-if="renewalsLoading" class="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-sm text-slate-500">
        {{ t("loading") }}
      </div>

      <div v-else class="kanban-grid">
        <article v-for="column in boardColumns" :key="column.key" class="kanban-column">
          <div class="kanban-column-header">
            <div>
              <p class="kanban-column-title">{{ column.label }}</p>
              <p class="kanban-column-hint">{{ column.hint }}</p>
            </div>
            <span class="kanban-column-count">{{ column.cards.length }}</span>
          </div>

          <div class="kanban-column-body">
            <div v-if="column.cards.length === 0" class="kanban-empty">{{ t("emptyColumn") }}</div>

            <article
              v-for="task in column.cards"
              :key="task.name"
              class="kanban-card"
              role="button"
              tabindex="0"
              @click="openRenewalDetail(task)"
              @keydown.enter.prevent="openRenewalDetail(task)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-slate-900">{{ task.customerLabel }}</p>
                  <p class="mt-0.5 truncate text-xs text-slate-500">{{ task.branchLabel }} · {{ task.premiumLabel }}</p>
                </div>
                <div class="kanban-avatar">{{ task.avatarInitials }}</div>
              </div>

              <div class="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge domain="renewal" :status="task.status" />
                <span class="kanban-priority" :class="task.priorityTone">{{ task.priorityLabel }}</span>
              </div>

              <div class="mt-3 space-y-1 text-xs text-slate-500">
                <p>{{ t("policy") }}: {{ task.policy || "-" }}</p>
                <p>{{ t("due") }}: {{ formatDate(task.dueDate) }}</p>
                <p>{{ t("renewal") }}: {{ formatDate(task.renewalDate) }}</p>
                <p v-if="task.competitorName">{{ lostReasonColumnLabel }}: {{ task.competitorName }}</p>
              </div>

              <div class="mt-3 flex flex-wrap gap-2">
                <ActionButton variant="secondary" size="xs" :disabled="renewalMutationLoading" @click.stop="openRenewalDetail(task)">
                  {{ t("openDetail") }}
                </ActionButton>
                <ActionButton
                  v-if="canMoveRenewalToStatus(task, 'In Progress')"
                  variant="secondary"
                  size="xs"
                  :disabled="renewalMutationLoading"
                  @click.stop="updateRenewalStatus(task, 'In Progress')"
                >
                  {{ t("markInProgress") }}
                </ActionButton>
                <ActionButton
                  v-if="canMoveRenewalToStatus(task, 'Done')"
                  variant="secondary"
                  size="xs"
                  :disabled="renewalMutationLoading"
                  @click.stop="updateRenewalStatus(task, 'Done')"
                >
                  {{ t("markDone") }}
                </ActionButton>
                <ActionButton
                  v-if="task.policy"
                  variant="secondary"
                  size="xs"
                  @click.stop="openPolicy(task.policy)"
                >
                  {{ t("openPolicy") }}
                </ActionButton>
              </div>
            </article>
          </div>
        </article>
      </div>
    </section>

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
import PageToolbar from "../components/app-shell/PageToolbar.vue";
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
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
    openDetail: "Detaya Git",
    columnNew: "Yeni (30+ gün)",
    columnNewHint: "Henüz erken safhadaki yenilemeler",
    columnNotified: "Bildirim Gönderildi",
    columnNotifiedHint: "Müşteriye ilk temas yapıldı",
    columnQuoted: "Teklif Hazırlandı",
    columnQuotedHint: "Teklif veya ön hazırlık tamam",
    columnDecision: "Müşteri Kararında",
    columnDecisionHint: "Cevap beklenen ya da geciken kartlar",
    columnDone: "Tamamlandı",
    columnDoneHint: "Başarıyla kapanan ya da iptal edilen kartlar",
    emptyColumn: "Bu kolonda kart yok",
    branch: "Branş",
    premium: "Prim",
    priority: "Öncelik",
    priorityLow: "Düşük",
    priorityMedium: "Orta",
    priorityHigh: "Yüksek",
    priorityCritical: "Kritik",
    priorityOverdue: "Gecikmiş",
    priorityClosed: "Kapandı",
    priorityUnknown: "Belirsiz",
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
    openDetail: "Open Detail",
    columnNew: "New (30+ days)",
    columnNewHint: "Renewals that are still far from due",
    columnNotified: "Notification Sent",
    columnNotifiedHint: "First customer touch has started",
    columnQuoted: "Quote Ready",
    columnQuotedHint: "Offer or preparation is complete",
    columnDecision: "Customer Deciding",
    columnDecisionHint: "Waiting on response or overdue follow-up",
    columnDone: "Completed",
    columnDoneHint: "Successfully closed or cancelled cards",
    emptyColumn: "No cards in this column",
    branch: "Branch",
    premium: "Premium",
    priority: "Priority",
    priorityLow: "Low",
    priorityMedium: "Medium",
    priorityHigh: "High",
    priorityCritical: "Critical",
    priorityOverdue: "Overdue",
    priorityClosed: "Closed",
    priorityUnknown: "Unknown",
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
    fields: ["name", "policy_no", "customer", "branch", "office_branch", "gross_premium", "currency", "end_date", "sales_entity"],
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

const renewalPolicyLookupRows = computed(() => asArray(resourceValue(renewalQuickPolicyResource, [])));
const renewalCustomerLookupRows = computed(() => asArray(resourceValue(renewalQuickCustomerResource, [])));
const renewalPolicyLookupMap = computed(
  () =>
    new Map(
      renewalPolicyLookupRows.value
        .map((row) => [String(row?.name || row?.policy_no || "").trim(), row])
        .filter(([key]) => Boolean(key)),
    ),
);
const renewalCustomerLookupMap = computed(
  () =>
    new Map(
      renewalCustomerLookupRows.value
        .map((row) => [String(row?.name || row?.full_name || "").trim(), row])
        .filter(([key]) => Boolean(key)),
    ),
);

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

const renewalCards = computed(() => renewals.value.map((task) => buildRenewalBoardCard(task)));
const boardColumns = computed(() => {
  const columns = [
    {
      key: "new",
      label: t("columnNew"),
      hint: t("columnNewHint"),
    },
    {
      key: "notified",
      label: t("columnNotified"),
      hint: t("columnNotifiedHint"),
    },
    {
      key: "quoted",
      label: t("columnQuoted"),
      hint: t("columnQuotedHint"),
    },
    {
      key: "decision",
      label: t("columnDecision"),
      hint: t("columnDecisionHint"),
    },
    {
      key: "done",
      label: t("columnDone"),
      hint: t("columnDoneHint"),
    },
  ];

  return columns.map((column) => ({
    ...column,
    cards: renewalCards.value.filter((task) => task.boardColumnKey === column.key),
  }));
});

const renewalsError = computed(() => {
  return renewalStore.state.error || "";
});

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
      t("customer"),
      t("policy"),
      t("branch"),
      t("premium"),
      t("status"),
      t("priority"),
      t("due"),
      t("renewal"),
    ],
    rows: renewalCards.value.map((task) => ({
      [t("customer")]: task.customerLabel || "-",
      [t("policy")]: task.policy || "-",
      [t("branch")]: task.branchLabel || "-",
      [t("premium")]: task.premiumLabel || "-",
      [t("status")]: task.status || "-",
      [t("priority")]: task.priorityLabel || "-",
      [t("due")]: formatDate(task.dueDate),
      [t("renewal")]: formatDate(task.renewalDate),
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
  router.push({ name: "policy-detail", params: { name: policyName } });
}

function openRenewalDetail(task) {
  if (!task?.name) return;
  router.push({ name: "renewal-task-detail", params: { name: task.name } });
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat(localeCode.value).format(new Date(value));
  } catch {
    return value;
  }
}

function formatRenewalPremium(amount, currency) {
  if (amount === null || amount === undefined || amount === "") return "-";
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return String(amount);
  try {
    return new Intl.NumberFormat(localeCode.value, {
      style: "currency",
      currency: String(currency || "TRY").toUpperCase(),
    }).format(numericAmount);
  } catch {
    const formattedAmount = new Intl.NumberFormat(localeCode.value).format(numericAmount);
    return currency ? `${formattedAmount} ${currency}` : formattedAmount;
  }
}

function getRenewalDaysUntilDue(value) {
  const target = toStartOfDay(value);
  if (!target) return null;
  const today = toStartOfDay(new Date());
  if (!today) return null;
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function buildInitials(value) {
  const words = String(value || "")
    .replace(/[@._-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const initials = words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
  return initials || "-";
}

function getRenewalPriorityMeta(task, daysUntilDue) {
  const status = String(task?.status || "").trim();
  if (status === "Done" || status === "Cancelled") {
    return {
      label: t("priorityClosed"),
      tone: "kanban-priority-neutral",
    };
  }
  if (!Number.isFinite(daysUntilDue)) {
    return {
      label: t("priorityUnknown"),
      tone: "kanban-priority-neutral",
    };
  }
  if (daysUntilDue < 0) {
    return {
      label: t("priorityOverdue"),
      tone: "kanban-priority-critical",
    };
  }
  if (daysUntilDue <= 7) {
    return {
      label: t("priorityCritical"),
      tone: "kanban-priority-critical",
    };
  }
  if (daysUntilDue <= 15) {
    return {
      label: t("priorityHigh"),
      tone: "kanban-priority-high",
    };
  }
  if (daysUntilDue <= 30) {
    return {
      label: t("priorityMedium"),
      tone: "kanban-priority-medium",
    };
  }
  return {
    label: t("priorityLow"),
    tone: "kanban-priority-low",
  };
}

function getRenewalBoardColumnKey(task, daysUntilDue) {
  const status = String(task?.status || "Open").trim();
  const dueDays = Number.isFinite(daysUntilDue) ? daysUntilDue : getRenewalDaysUntilDue(task?.due_date);
  if (status === "Done" || status === "Cancelled") return "done";
  if (status === "In Progress") {
    if (!Number.isFinite(dueDays)) return "quoted";
    if (dueDays <= 7) return "decision";
    if (dueDays <= 15) return "quoted";
    return "notified";
  }
  if (!Number.isFinite(dueDays)) return "new";
  if (dueDays > 30) return "new";
  if (dueDays > 15) return "notified";
  if (dueDays > 0) return "quoted";
  return "decision";
}

function buildRenewalBoardCard(task) {
  const policy = renewalPolicyLookupMap.value.get(String(task?.policy || "").trim()) || null;
  const customer = renewalCustomerLookupMap.value.get(String(task?.customer || "").trim()) || null;
  const dueDate = task?.due_date || null;
  const renewalDate = task?.renewal_date || null;
  const daysUntilDue = getRenewalDaysUntilDue(dueDate);
  const priority = getRenewalPriorityMeta(task, daysUntilDue);
  const customerLabel = customer?.full_name || customer?.name || task?.customer || "-";
  const branchLabel = policy?.branch || policy?.office_branch || task?.office_branch || "-";
  const premiumSource = policy?.gross_premium ?? policy?.premium ?? task?.gross_premium ?? task?.amount;
  const currency = policy?.currency || task?.currency || "TRY";
  const assignedName = String(task?.assigned_to || "").trim();
  const avatarSeed = assignedName || customerLabel;
  const boardColumnKey = getRenewalBoardColumnKey(task, daysUntilDue);

  return {
    ...task,
    customerLabel,
    branchLabel,
    premiumLabel: formatRenewalPremium(premiumSource, currency),
    dueDate,
    renewalDate,
    daysUntilDue,
    priorityLabel: priority.label,
    priorityTone: priority.tone,
    avatarInitials: buildInitials(avatarSeed),
    boardColumnKey,
  };
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
    fields: [
      "name",
      "policy",
      "customer",
      "office_branch",
      "policy_end_date",
      "renewal_date",
      "due_date",
      "status",
      "lost_reason_code",
      "competitor_name",
      "assigned_to",
      "notes",
    ],
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
      fields: ["name", "policy_no", "customer", "branch", "office_branch", "gross_premium", "currency", "end_date", "sales_entity"],
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

.kanban-board {
  @apply rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur;
}

.kanban-board-header {
  @apply mb-4 flex items-center justify-between gap-3;
}

.kanban-grid {
  @apply grid gap-4 xl:grid-cols-5;
}

.kanban-column {
  @apply flex min-h-[24rem] flex-col rounded-2xl border border-slate-200 bg-slate-50/80;
}

.kanban-column-header {
  @apply flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3;
}

.kanban-column-title {
  @apply text-sm font-semibold text-slate-900;
}

.kanban-column-hint {
  @apply mt-0.5 text-xs text-slate-500;
}

.kanban-column-count {
  @apply inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-900 px-2 text-xs font-semibold text-white;
}

.kanban-column-body {
  @apply flex flex-1 flex-col gap-3 p-3;
}

.kanban-empty {
  @apply rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-sm text-slate-500;
}

.kanban-card {
  @apply cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500;
}

.kanban-avatar {
  @apply inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white;
}

.kanban-priority {
  @apply inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700;
}

.kanban-priority-neutral {
  @apply bg-slate-100 text-slate-700;
}

.kanban-priority-low {
  @apply bg-emerald-50 text-emerald-700;
}

.kanban-priority-medium {
  @apply bg-amber-50 text-amber-700;
}

.kanban-priority-high {
  @apply bg-orange-50 text-orange-700;
}

.kanban-priority-critical {
  @apply bg-rose-50 text-rose-700;
}
</style>
