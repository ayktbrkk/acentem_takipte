<template>
  <WorkbenchPageLayout
    :breadcrumb="t('renewals_breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="renewals.length"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <div class="flex items-center gap-2">
        <div class="mr-2 flex rounded-lg border border-slate-200 bg-white p-1" role="group" :aria-label="t('viewMode')">
          <button
            type="button"
            class="rounded px-3 py-1 text-xs font-medium transition-all"
            :class="isListView ? 'bg-brand-50 text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-700'"
            :aria-pressed="isListView"
            :aria-label="t('viewList')"
            @click="renewalsViewMode = 'list'"
          >
            {{ t('viewList') }}
          </button>
          <button
            type="button"
            class="rounded px-3 py-1 text-xs font-medium transition-all"
            :class="!isListView ? 'bg-brand-50 text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-700'"
            :aria-pressed="!isListView"
            :aria-label="t('viewBoard')"
            @click="renewalsViewMode = 'board'"
          >
            {{ t('viewBoard') }}
          </button>
        </div>
        <ActionButton variant="secondary" size="sm" @click="reloadRenewals">
          <FeatherIcon name="refresh-cw" :class="['h-4 w-4', renewalsLoading && 'animate-spin']" />
          {{ t("refresh") }}
        </ActionButton>
        <ActionButton variant="secondary" size="sm" @click="downloadRenewalExport('xlsx')">
          {{ t("exportExcel") }}
        </ActionButton>
        <ActionButton variant="secondary" size="sm" @click="downloadRenewalExport('pdf')">
          {{ t("exportPdf") }}
        </ActionButton>
        <ActionButton variant="primary" size="sm" @click="showQuickRenewalDialog = true">
          <FeatherIcon name="plus" class="h-4 w-4" />
          {{ t("newRenewalTask") }}
        </ActionButton>
      </div>
    </template>

    <template #metrics>
      <div v-if="renewalsLoading && !renewals.length" class="w-full grid grid-cols-1 gap-4 md:grid-cols-5">
        <SkeletonLoader v-for="i in 5" :key="i" variant="card" />
      </div>
      <div v-else class="w-full grid grid-cols-1 gap-4 md:grid-cols-5">
        <SaaSMetricCard
          v-for="item in renewalSummaryItems"
          :key="item.key"
          :label="item.label"
          :value="item.value"
          :value-class="item.valueClass"
        />
      </div>
    </template>

    <div v-if="renewalsError" class="rounded-xl border border-at-red/20 bg-at-red/5 p-4 mb-4" role="alert">
      <p class="text-sm font-semibold text-at-red">{{ renewalsError }}</p>
    </div>

    <div class="mb-6">
      <SmartFilterBar
        v-model="filters.query"
        :placeholder="t('searchPlaceholder')"
        :advanced-label="t('filtersTitle')"
        @open-advanced="showAdvanced = !showAdvanced"
      >
        <template #primary-filters>
          <select v-model="filters.status" class="input h-9 py-1 text-sm min-w-[140px]" @change="applyRenewalFilters">
            <option value="">{{ t("allStatuses") }}</option>
            <option v-for="option in renewalStatusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <select v-model="filters.dueScope" class="input h-9 py-1 text-sm min-w-[140px]" @change="applyRenewalFilters">
            <option value="">{{ t("allDueScopes") }}</option>
            <option value="overdue">{{ t("dueScopeOverdue") }}</option>
            <option value="7">{{ t("dueScope7") }}</option>
            <option value="30">{{ t("dueScope30") }}</option>
          </select>
        </template>
      </SmartFilterBar>
    </div>

    <div v-if="showAdvanced" class="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label class="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
          <span>{{ t("policySearchLabel") }}</span>
          <input v-model="filters.policyQuery" class="input" type="text" @keyup.enter="applyRenewalFilters" />
        </label>
      </div>
      <div class="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <ActionButton
          variant="secondary"
          size="sm"
          @click="
            filters.policyQuery = '';
            filters.query = '';
            filters.status = '';
            filters.dueScope = '';
            applyRenewalFilters();
          "
        >
          {{ t("clearFilters") }}
        </ActionButton>
        <ActionButton variant="primary" size="sm" class="px-6" @click="applyRenewalFilters">
          {{ t("applyFilters") }}
        </ActionButton>
      </div>
    </div>

    <!-- List View -->
    <section v-if="isListView" class="mt-6">
      <div v-if="renewalsLoading && !renewals.length" class="p-10 text-center">
        <SkeletonLoader variant="list" :rows="5" />
      </div>
      <ListTable
        v-else
        :columns="listColumns"
        :rows="pagedRenewals"
        :locale="activeLocale"
        :loading="renewalsLoading"
        :empty-message="t('emptyList')"
        @row-click="openRenewalDetail"
      >
        <template #cell(policy)="{ row }">
          <span class="text-sm font-medium text-slate-900">{{ row.policyLabel || t("unspecified") }}</span>
        </template>
        <template #cell(customer)="{ row }">
          <span class="text-sm font-medium text-slate-800">{{ row.customerLabel || t("unspecified") }}</span>
        </template>
        <template #cell(due_date)="{ row }">
          <span class="text-sm text-slate-600">{{ formatDate(row.dueDate) }}</span>
        </template>
        <template #cell(status)="{ row }">
          <StatusBadge domain="renewal" :status="row.status || 'Open'" :locale="activeLocale" />
        </template>
        <template #cell(priority)="{ row }">
          <span
            v-if="row.status !== 'Done' && row.status !== 'Cancelled' && row.priorityLabel"
            class="inline-flex items-center rounded-full bg-at-amber/10 text-at-amber text-[10px] font-bold px-2 py-0.5"
          >
            {{ row.priorityLabel }}
          </span>
          <span v-else class="text-xs text-slate-400">{{ t("unspecified") }}</span>
        </template>
      </ListTable>
      <ListPager
        :shown="renewalListShownCount"
        :total="renewalsTotal"
        :page="listPagination.page"
        :has-next="renewalListHasNextPage"
        :showing-label="t('showingRecords')"
        @previous="previousRenewalPage"
        @next="nextRenewalPage"
      />
    </section>

    <!-- Board View -->
    <section v-else class="mt-6">
      <div v-if="renewalsLoading && !renewals.length" class="p-10 text-center">
        <SkeletonLoader variant="list" :rows="5" />
      </div>
      <div v-else class="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <article v-for="column in boardColumns.slice(0, 4)" :key="column.key" class="flex min-h-[500px] flex-col rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
          <header class="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <p class="text-sm font-bold text-slate-900">{{ column.label }}</p>
              <p class="mt-0.5 text-[11px] text-slate-500 font-medium">{{ column.hint }}</p>
            </div>
            <span class="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-600 px-2 text-[10px] font-bold text-white">{{ column.cards.length > renewalBoardDisplayLimit ? `${renewalBoardDisplayLimit}+` : column.cards.length }}</span>
          </header>

          <div class="space-y-3 overflow-y-auto pr-1">
            <div v-if="column.cards.length === 0" class="rounded-xl border border-dashed border-slate-200 bg-white/50 px-3 py-8 text-center text-xs text-slate-400 font-medium">{{ t("emptyBoardColumn") }}</div>
            <article
              v-for="task in column.cards.slice(0, renewalBoardDisplayLimit)"
              :key="task.name"
              class="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-brand-200"
              @click="openRenewalDetail(task)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-bold text-slate-900">{{ task.customerLabel }}</p>
                  <p class="mt-0.5 truncate text-xs text-slate-500 font-medium">{{ task.branchLabel }} · {{ task.premiumLabel }}</p>
                </div>
                <div class="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase shrink-0">
                  {{ task.avatarInitials }}
                </div>
              </div>

              <div class="mt-3 flex items-center gap-2">
                <StatusBadge domain="renewal" :status="task.status || 'Open'" :locale="activeLocale" />
                <span
                  v-if="task.status !== 'Done' && task.status !== 'Cancelled'"
                  class="inline-flex items-center rounded-full bg-at-amber/10 text-at-amber text-[10px] font-bold px-2 py-0.5"
                >
                  {{ task.priorityLabel }}
                </span>
              </div>

              <div class="mt-3 space-y-1 text-[11px] text-slate-500 font-medium border-t border-slate-50 pt-2">
                <p class="flex justify-between"><span>{{ t("policy") }}:</span> <span class="text-slate-700">{{ task.policyLabel || t("unspecified") }}</span></p>
                <p class="flex justify-between"><span>{{ t("due") }}:</span> <span class="text-slate-700">{{ formatDate(task.dueDate) }}</span></p>
              </div>

              <div class="mt-3 flex items-center justify-end gap-2 border-t border-slate-50 pt-3">
                <ActionButton
                  v-if="canMoveRenewalToStatus(task, 'In Progress')"
                  variant="secondary"
                  size="xs"
                  @click.stop="updateRenewalStatus(task, 'In Progress')"
                >
                  {{ t("mark_in_progress") }}
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
      :title-override="t('newRenewalTask')"
      :options-map="renewalQuickOptionsMap"
      :eyebrow="quickRenewalEyebrow"
      :before-open="prepareQuickRenewalDialog"
      :success-handlers="quickRenewalSuccessHandlers"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, unref } from "vue";
import { useAuthStore } from "../stores/auth";
import { useRenewalsBoardRuntime } from "../composables/useRenewalsBoardRuntime";
import { RENEWAL_TRANSLATIONS } from "../config/renewal_translations";
import { translateText } from "../utils/i18n";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SmartFilterBar from "../components/app-shell/SmartFilterBar.vue";
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import SkeletonLoader from "../components/ui/SkeletonLoader.vue";
import ListTable from "../components/ui/ListTable.vue";
import ListPager from "../components/app-shell/ListPager.vue";
import { FeatherIcon } from "frappe-ui";
import { ref } from "vue";

const showAdvanced = ref(false);
const renewalsViewMode = ref("board");
const isListView = computed(() => renewalsViewMode.value === "list");

const authStore = useAuthStore();
const activeLocale = computed(() => (String(unref(authStore.locale) || "tr").toLowerCase().startsWith("tr") ? "tr" : "en"));
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));

function t(key) {
  const locale = activeLocale.value === "tr" ? "tr" : "en";
  return RENEWAL_TRANSLATIONS[locale]?.[key] || translateText(key, activeLocale.value);
}

const {
  filters,
  renewalStatusOptions,
  renewalsLoading,
  renewals,
  renewalsError,
  showQuickRenewalDialog,
  renewalQuickOptionsMap,
  quickRenewalEyebrow,
  quickRenewalSuccessHandlers,
  renewalSummaryItems,
  boardColumns,
  listPagination,
  pagedRenewals,
  renewalsTotal,
  renewalListHasNextPage,
  renewalListShownCount,
  renewalBoardDisplayLimit,
  reloadRenewals,
  downloadRenewalExport,
  applyRenewalFilters,
  previousRenewalPage,
  nextRenewalPage,
  prepareQuickRenewalDialog,
  canMoveRenewalToStatus,
  updateRenewalStatus,
  openRenewalDetail,
  formatDate,
} = useRenewalsBoardRuntime({
  activeLocale,
  localeCode,
  t,
});

const listColumns = computed(() => [
  { key: "policy", label: t("colPolicy"), type: "component", width: "1fr" },
  { key: "customer", label: t("colCustomer"), type: "component", width: "1fr" },
  { key: "due_date", label: t("colDueDate"), type: "component", width: "120px" },
  { key: "status", label: t("colStatus"), type: "component", width: "100px" },
  { key: "priority", label: t("colPriority"), type: "component", width: "90px" },
]);
</script>

<style scoped>
select.input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}
</style>
