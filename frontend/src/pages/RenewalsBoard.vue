<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :record-count="renewals.length"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <ActionButton variant="primary" size="sm">
        + {{ t("newTask") }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" @click="reloadRenewals">
        {{ t("refresh") }}
      </ActionButton>
    </template>

    <template #metrics>
      <div v-if="renewalsLoading && !renewals.length" class="w-full grid grid-cols-1 gap-4 md:grid-cols-5">
        <SkeletonLoader v-for="i in 5" :key="i" variant="card" />
      </div>
      <div v-else class="w-full grid grid-cols-1 gap-4 md:grid-cols-5">
        <div v-for="item in renewalSummaryItems" :key="item.key" class="mini-metric">
          <p class="mini-metric-label">{{ item.label }}</p>
          <p class="mini-metric-value" :class="item.valueClass">{{ item.value }}</p>
        </div>
      </div>
    </template>

    <SectionPanel :title="t('filters')">
      <div class="flex flex-wrap gap-4">
        <input
          v-model.trim="filters.query"
          class="input flex-1 min-w-[200px] h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
          type="search"
          :placeholder="t('searchPlaceholder')"
          @keyup.enter="applyRenewalFilters"
        />
        <select v-model="filters.status" class="input h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:bg-white transition-all" @change="applyRenewalFilters">
          <option value="">{{ t("allStatuses") }}</option>
          <option v-for="option in renewalStatusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <select v-model="filters.dueScope" class="input h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:bg-white transition-all" @change="applyRenewalFilters">
          <option value="">{{ t("allDueScopes") }}</option>
          <option value="overdue">{{ t("dueScopeOverdue") }}</option>
          <option value="7">{{ t("dueScope7") }}</option>
          <option value="30">{{ t("dueScope30") }}</option>
        </select>
      </div>
    </SectionPanel>

    <section class="kanban-board mt-6">
      <div v-if="renewalsLoading && !renewals.length" class="p-10 text-center">
        <SkeletonLoader variant="list" :rows="5" />
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
              @click="openRenewalDetail(task)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-bold text-slate-900">{{ task.customerLabel }}</p>
                  <p class="mt-0.5 truncate text-xs text-slate-500 font-medium">{{ task.branchLabel }} · {{ task.premiumLabel }}</p>
                </div>
                <div class="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase">
                  {{ task.avatarInitials }}
                </div>
              </div>

              <div class="mt-3 flex items-center gap-2">
                <StatusBadge domain="renewal" :status="task.status === 'Open' ? 'active' : task.status === 'Done' ? 'active' : 'hold'" :label="task.status" />
                <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {{ task.priorityLabel }}
                </span>
              </div>

              <div class="mt-3 space-y-1 text-[11px] text-slate-500 font-medium border-t border-slate-50 pt-2">
                <p class="flex justify-between"><span>{{ t("policy") }}:</span> <span class="text-slate-700">{{ task.policy || "-" }}</span></p>
                <p class="flex justify-between"><span>{{ t("due") }}:</span> <span class="text-slate-700">{{ formatDate(task.dueDate) }}</span></p>
              </div>

              <div class="mt-3 flex items-center justify-end gap-2 border-t border-slate-50 pt-3">
                <ActionButton
                  v-if="canMoveRenewalToStatus(task, 'In Progress')"
                  variant="secondary"
                  size="xs"
                  @click.stop="updateRenewalStatus(task, 'In Progress')"
                >
                  {{ t("markInProgress") }}
                </ActionButton>
              </div>
            </article>
          </div>
        </article>
      </div>
    </section>
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, unref } from "vue";
import { useAuthStore } from "../stores/auth";
import { useRenewalsBoardRuntime } from "../composables/useRenewalsBoardRuntime";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import SkeletonLoader from "../components/ui/SkeletonLoader.vue";

const authStore = useAuthStore();
const activeLocale = computed(() => unref(authStore.locale) || "tr");
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));

const copy = {
  tr: {
    breadcrumb: "Operasyonlar → Yenilemeler",
    title: "Yenilemeler",
    subtitle: "Bitişe yakın poliçeler",
    recordCount: "kayıt",
    refresh: "Yenile",
    newTask: "Yeni Görev",
    markInProgress: "Takibe Al",
    searchPlaceholder: "Görev / poliçe ara",
    allStatuses: "Tüm Durumlar",
    allDueScopes: "Tüm Vadeler",
    dueScopeOverdue: "Gecikmiş",
    dueScope7: "7 Gün",
    dueScope30: "30 Gün",
    policy: "Poliçe",
    due: "Vade",
    emptyColumn: "Kart yok",
    columnOpen: "Açık",
    columnOpenHint: "Yeni yenilemeler",
    columnInProgress: "Takipte",
    columnInProgressHint: "İşlemdeki kayıtlar",
    columnDone: "Tamamlandı",
    columnDoneHint: "Biten kayıtlar",
    columnCancelled: "İptal",
    columnCancelledHint: "İptal edilenler",
    metricTotal: "Toplam",
    metricOpen: "Açık",
    metricDone: "Biten",
    metricCancelled: "İptal",
    metricDue: "Vadesi Gelen",
    filters: "Filtreler",
  },
  en: {
    breadcrumb: "Operations → Renewals",
    title: "Renewals",
    subtitle: "Near-expiry policies",
    recordCount: "records",
    refresh: "Refresh",
    newTask: "New Task",
    markInProgress: "Start Follow-up",
    searchPlaceholder: "Search task / policy",
    allStatuses: "All Statuses",
    allDueScopes: "All Due Ranges",
    dueScopeOverdue: "Overdue",
    dueScope7: "7 Days",
    dueScope30: "30 Days",
    policy: "Policy",
    due: "Due",
    emptyColumn: "No cards",
    columnOpen: "Open",
    columnOpenHint: "New renewals",
    columnInProgress: "In Progress",
    columnInProgressHint: "Ongoing tasks",
    columnDone: "Done",
    columnDoneHint: "Completed tasks",
    columnCancelled: "Cancelled",
    columnCancelledHint: "Cancelled tasks",
    metricTotal: "Total",
    metricOpen: "Open",
    metricDone: "Done",
    metricCancelled: "Cancelled",
    metricDue: "Due Soon",
    filters: "Filters",
  }
};

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

const {
  filters,
  renewalStatusOptions,
  renewalsLoading,
  renewals,
  renewalSummaryItems,
  boardColumns,
  reloadRenewals,
  applyRenewalFilters,
  canMoveRenewalToStatus,
  updateRenewalStatus,
  openRenewalDetail,
  formatDate,
} = useRenewalsBoardRuntime({
  activeLocale,
  localeCode,
  t,
});
</script>

<style scoped>
.kanban-board {
  @apply overflow-x-auto pb-4;
}

.kanban-grid {
  @apply flex gap-6 min-w-max pb-4;
}

.kanban-column {
  @apply flex flex-col w-[320px] rounded-2xl border border-slate-100 bg-slate-50/50 backdrop-blur-sm;
}

.kanban-column-header {
  @apply flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3;
}

.kanban-column-title {
  @apply text-sm font-bold text-slate-900 uppercase tracking-tight;
}

.kanban-column-hint {
  @apply mt-0.5 text-[11px] text-slate-500 font-medium;
}

.kanban-column-count {
  @apply inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-900 px-2 text-[10px] font-bold text-white;
}

.kanban-column-body {
  @apply flex flex-col gap-3 p-3 overflow-y-auto max-h-[calc(100vh-400px)];
}

.kanban-empty {
  @apply rounded-xl border border-dashed border-slate-200 bg-white/50 px-3 py-8 text-center text-xs text-slate-400 font-medium;
}

.kanban-card {
  @apply cursor-pointer rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 active:scale-[0.98];
}

.mini-metric {
  @apply bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center;
}

.mini-metric-label {
  @apply text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1;
}

.mini-metric-value {
  @apply text-xl font-black text-slate-900;
}
</style>
