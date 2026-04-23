<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :record-count="policyListTotalCount"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <button class="btn btn-outline btn-sm" type="button" @click="focusPolicySearch">
        {{ t("focusFilters") }}
      </button>
      <button class="btn btn-outline btn-sm" type="button" :disabled="policyLoading" @click="downloadPolicyExport('xlsx')">
        {{ t("exportXlsx") }}
      </button>
      <button class="btn btn-primary btn-sm" type="button" @click="openQuickPolicyDialog()">
        {{ t("newPolicy") }}
      </button>
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

    <SectionPanel :title="t('filtersTitle')" :count="`${policyListActiveCount} ${t('activeFilters')}`">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label class="flex flex-col gap-1 text-sm text-slate-600">
          <span>{{ t("searchPlaceholder") }}</span>
          <input v-model="policyListSearchQuery" class="input" type="text" :placeholder="t('searchPlaceholder')" />
        </label>
        <label class="flex flex-col gap-1 text-sm text-slate-600">
          <span>{{ t("insurance_company") }}</span>
          <input v-model="filters.insurance_company" class="input" type="text" @change="applyFilters" />
        </label>
        <label class="flex flex-col gap-1 text-sm text-slate-600">
          <span>{{ t("endDateFilter") }}</span>
          <input v-model="filters.end_date" class="input" type="date" @change="applyFilters" />
        </label>
        <label class="flex flex-col gap-1 text-sm text-slate-600">
          <span>{{ t("status") }}</span>
          <select v-model="filters.status" class="input" @change="applyFilters">
            <option value="">{{ t("allStatuses") }}</option>
            <option value="Active">{{ t("statusActive") }}</option>
            <option value="KYT">{{ t("statusWaiting") }}</option>
            <option value="IPT">{{ t("cancelled") }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1 text-sm text-slate-600">
          <span>{{ t("customerFilter") }}</span>
          <input v-model="filters.customer" class="input" type="text" @change="applyFilters" />
        </label>
        <label class="flex flex-col gap-1 text-sm text-slate-600">
          <span>{{ t("pageSize") }}</span>
          <input v-model.number="pagination.pageLength" class="input" type="number" min="1" step="1" @change="onPageLengthChange" />
        </label>
      </div>
      <div class="mt-3 flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
        <span>{{ t("mobileSummaryTitle") }}</span>
        <span>{{ t("pageSize") }}: {{ pagination.pageLength }}</span>
      </div>
      <div class="mt-3 flex items-center gap-2">
        <button class="btn btn-sm" type="button" :disabled="policyLoading" @click="applyFilters">{{ t("applyFilters") }}</button>
        <button class="btn btn-outline btn-sm" type="button" @click="clearFilters">{{ t("clearFilters") }}</button>
      </div>
    </SectionPanel>

    <SectionPanel :title="t('policyTableTitle')" :count="formatCount(policyListTotalCount)">
      <div v-if="policyListError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {{ policyListError }}
      </div>
      <template v-else-if="isInitialLoading">
        <SkeletonLoader variant="list" :rows="8" />
      </template>
      <template v-else>
        <ListTable
          :columns="columns"
          :rows="policyListRowsWithUrgency"
          :loading="policyLoading"
          :empty-message="t('empty')"
          clickable
          @row-click="(row) => openPolicyDetail(row.name)"
        />
        <div class="mt-4 flex items-center justify-between">
          <p class="text-xs text-gray-400">{{ policyListRowsWithUrgency.length }} / {{ policyListTotalCount }} {{ t("showingRecords") }}</p>
          <div class="flex items-center gap-1">
            <button class="btn btn-sm" type="button" :disabled="policyListPage <= 1" @click="previousPage">{{ t("previous") }}</button>
            <span class="px-2 text-xs text-gray-600">{{ policyListPage }}</span>
            <button class="btn btn-sm" type="button" :disabled="!hasNextPage" @click="nextPage">{{ t("next") }}</button>
          </div>
        </div>
      </template>
    </SectionPanel>

    <PolicyListQuickPolicyDialog
      :show="showQuickPolicyDialog"
      :dialog-key="quickPolicyDialogKey"
      :model="quickPolicyForm"
      :field-errors="quickPolicyFieldErrors"
      :options-map="policyQuickOptionsMap"
      :disabled="quickPolicyLoading"
      :loading="quickPolicyLoading"
      :has-source-offer="hasQuickPolicySourceOffer"
      :office-branch="branchStore.requestBranch"
      :error="quickPolicyError"
      :eyebrow="quickPolicyUi.eyebrow"
      :title="quickPolicyUi.title"
      :subtitle="quickPolicyUi.subtitle"
      @update:show="setQuickPolicyDialogVisibility"
      @cancel="cancelQuickPolicyDialog"
      @submit="submitQuickPolicy"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

import { POLICY_TRANSLATIONS } from "../config/policy_translations";
import { usePolicyListActions } from "../composables/usePolicyListActions";
import { usePolicyListFilters } from "../composables/usePolicyListFilters";
import { usePolicyListPresetSync } from "../composables/usePolicyListPresetSync";
import { usePolicyListQuickPolicy } from "../composables/usePolicyListQuickPolicy";
import { usePolicyListRuntime } from "../composables/usePolicyListRuntime";
import { usePolicyListTableData } from "../composables/usePolicyListTableData";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import PolicyListQuickPolicyDialog from "../components/policy-list/PolicyListQuickPolicyDialog.vue";
import ListTable from "../components/ui/ListTable.vue";
import SkeletonLoader from "../components/ui/SkeletonLoader.vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { usePolicyStore } from "../stores/policy";

const authStore = useAuthStore();
const branchStore = useBranchStore();
const policyStore = usePolicyStore();
const router = useRouter();
const route = useRoute();

const activeLocale = computed(() => (String(authStore.locale || "tr").toLowerCase().startsWith("tr") ? "tr" : "en"));
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));

function t(key) {
  return POLICY_TRANSLATIONS[activeLocale.value]?.[key] || POLICY_TRANSLATIONS.en?.[key] || key;
}

const filters = policyStore.state.filters;
const pagination = policyStore.state.pagination;

const {
  policyLoading,
  policyListError,
  hasNextPage,
  isInitialLoading,
  policyListPage,
  policyListPageSize,
  downloadPolicyExport,
  refreshPolicyList,
  applyFilters,
  previousPage,
  nextPage,
  focusPolicySearch,
} = usePolicyListRuntime({
  t,
  branchStore,
  policyStore,
  filters,
  pagination,
});

const {
  policyPresetKey,
  policyCustomPresets,
  policyListSearchQuery,
  policyListLocalFilters,
  policyListActiveCount,
  applyPolicyPreset,
  onPolicyListFilterReset,
} = usePolicyListFilters({
  t,
  localeCode,
  filters,
  pagination,
  refreshPolicyList,
  persistPolicyPresetStateToServer: () => presetSync.persistPolicyPresetStateToServer(),
});

const presetSync = usePolicyListPresetSync({
  presetKey: policyPresetKey,
  customPresets: policyCustomPresets,
  applyPolicyPreset,
});

const { openPolicyDetail, formatCurrency, formatCount } = usePolicyListActions({ router, localeCode, t });

const {
  policyListTotalCount,
  policyListRowsWithUrgency,
  policySummary,
} = usePolicyListTableData({
  rows: computed(() => policyStore.state.items),
  policyStore,
  policyListSearchQuery,
  policyListLocalFilters,
  localeCode,
  policyListPageSize,
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
  hasQuickPolicySourceOffer,
  openQuickPolicyDialog,
  cancelQuickPolicyDialog,
  submitQuickPolicy,
  consumeQuickPolicyRouteIntent,
} = usePolicyListQuickPolicy({
  t,
  activeLocale,
  router,
  route,
  branchStore,
  refreshPolicyList,
  openPolicyDetail,
});

const columns = computed(() => [
  { key: "carrier_policy_no", label: t("carrierPolicyNo") },
  { key: "customer_label", label: t("colCustomer") },
  { key: "insurance_company", label: t("colCompany") },
  { key: "end_date", label: t("colEndDate") },
  { key: "gross_premium", label: t("colGross") },
  { key: "status", label: t("colStatus") },
]);

function clearFilters() {
  onPolicyListFilterReset();
  filters.insurance_company = "";
  filters.end_date = "";
  filters.status = "";
  filters.customer = "";
  filters.gross_min = "";
  filters.gross_max = "";
  pagination.pageLength = 20;
  applyFilters();
}

function onPageLengthChange() {
  const nextValue = Math.max(1, Number(pagination.pageLength || 20));
  pagination.pageLength = nextValue;
  pagination.page = 1;
  void refreshPolicyList();
}

function setQuickPolicyDialogVisibility(value) {
  if (value) {
    openQuickPolicyDialog();
    return;
  }
  cancelQuickPolicyDialog();
}

onMounted(async () => {
  await presetSync.hydratePolicyPresetStateFromServer();
  consumeQuickPolicyRouteIntent();
  await refreshPolicyList();
});
</script>
