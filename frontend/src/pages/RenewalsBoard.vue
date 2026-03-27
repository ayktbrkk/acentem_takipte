<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="formatCount(renewals.length)"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
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
    </template>

    <template #metrics>
      <div class="w-full grid grid-cols-1 gap-4 md:grid-cols-5">
        <div v-for="item in renewalSummaryItems" :key="item.key" class="mini-metric">
          <p class="mini-metric-label">{{ item.label }}</p>
          <p class="mini-metric-value" :class="item.valueClass">{{ item.value }}</p>
        </div>
      </div>
    </template>

    <article class="surface-card rounded-2xl p-5">
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
    </article>

    <article v-if="renewalsError" class="qc-error-banner">
      <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
      <p class="qc-error-banner__text mt-1">{{ renewalsError }}</p>
    </article>

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
      :eyebrow="quickRenewalEyebrow"
      :show-save-and-open="false"
      :before-open="prepareQuickRenewalDialog"
      :success-handlers="quickRenewalSuccessHandlers"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, unref } from "vue";

import { getAppPinia } from "../pinia";
import ActionButton from "../components/app-shell/ActionButton.vue";
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
import { useRenewalsBoardRuntime } from "../composables/useRenewalsBoardRuntime";
import { useAuthStore } from "../stores/auth";

const copy = {
  tr: {
    breadcrumb: "Sigorta Operasyonları → Yenilemeler",
    title: "Yenilemeler",
    subtitle: "Bitişe yakın poliçeler ve takip görevleri",
    recordCount: "kayıt",
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
    openDesk: "Yönetim Ekranını Aç",
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
    openDetail: "Yenileme Kaydını Aç",
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
    breadcrumb: "Insurance Operations → Renewals",
    title: "Renewals",
    subtitle: "Near-expiry policies and follow-up tasks",
    recordCount: "records",
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
    openDesk: "Open Desk",
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
    openDetail: "Open Renewal Record",
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

const appPinia = getAppPinia();
const authStore = useAuthStore(appPinia);
const activeLocale = computed(() => unref(authStore.locale) || "en");
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
const renewalsRuntime = useRenewalsBoardRuntime({
  activeLocale,
  localeCode,
  t,
});

const {
  filters,
  renewalStatusOptions,
  lostReasonColumnLabel,
  activeFilterCount,
  presetKey,
  presetOptions,
  canDeletePreset,
  applyPreset,
  applyRenewalFilters,
  onPresetChange,
  savePreset,
  deletePreset,
  renewals,
  renewalsLoading,
  renewalMutationLoading,
  showQuickRenewalDialog,
  renewalQuickOptionsMap,
  quickRenewalEyebrow,
  quickRenewalSuccessHandlers,
  renewalSummaryItems,
  boardColumns,
  renewalsError,
  reloadRenewals,
  downloadRenewalExport,
  canMoveRenewalToStatus,
  updateRenewalStatus,
  openPolicy,
  openRenewalDetail,
  formatDate,
  formatCount,
  prepareQuickRenewalDialog,
  resetRenewalFilters,
} = renewalsRuntime;
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
  @apply bg-amber-50 text-amber-700;
}
</style>

