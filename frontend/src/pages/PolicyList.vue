<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :record-count="policyListTotalCount"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <button class="btn btn-outline" type="button" @click="downloadPolicyExport('xlsx')">
        <FeatherIcon name="download" class="h-4 w-4" />
        {{ t("exportXlsx") }}
      </button>
      <button class="btn btn-primary" type="button" @click="openQuickPolicyDialog()">
        <FeatherIcon name="plus" class="h-4 w-4" />
        {{ t("newPolicy") }}
      </button>
    </template>

    <template #metrics>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SaaSMetricCard :label="t('summaryTotal')" :value="formatCount(policySummary.total)" />
        <SaaSMetricCard :label="t('summaryActive')" :value="formatCount(policySummary.active)" value-class="text-brand-600" />
        <SaaSMetricCard :label="t('summaryPending')" :value="formatCount(policySummary.pending)" value-class="text-at-amber" />
        <SaaSMetricCard :label="t('summaryTotalPremium')" :value="formatCurrency(policySummary.totalPremium, 'TRY')" value-class="text-at-green" />
      </div>
    </template>

    <div class="space-y-4">
      <SmartFilterBar
        v-model="policyListSearchQuery"
        :placeholder="t('searchPlaceholder')"
        :advanced-label="t('filtersTitle')"
        @open-advanced="showAdvancedFilters = !showAdvancedFilters"
      >
        <template #primary-filters>
          <div class="flex items-center gap-2">
            <select v-model="filters.status" class="input h-9 py-1 text-sm" @change="applyFilters">
              <option value="">{{ t("allStatuses") }}</option>
              <option value="Active">{{ t("statusActive") }}</option>
              <option value="KYT">{{ t("statusWaiting") }}</option>
              <option value="IPT">{{ t("cancelled") }}</option>
            </select>
          </div>
        </template>
      </SmartFilterBar>

      <div v-if="showAdvancedFilters" class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label class="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            <span>{{ t("insurance_company") }}</span>
            <input v-model="filters.insurance_company" class="input" type="text" @change="applyFilters" />
          </label>
          <label class="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            <span>{{ t("endDateFilter") }}</span>
            <input v-model="filters.end_date" class="input" type="date" @change="applyFilters" />
          </label>
          <label class="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            <span>{{ t("customerFilter") }}</span>
            <input v-model="filters.customer" class="input" type="text" @change="applyFilters" />
          </label>
        </div>
        <div class="mt-5 flex items-center justify-end gap-2 border-t pt-4">
          <button class="btn btn-outline btn-sm" type="button" @click="clearFilters">{{ t("clearFilters") }}</button>
          <button class="btn btn-primary btn-sm px-6" type="button" @click="applyFilters">{{ t("applyFilters") }}</button>
        </div>
      </div>
    </div>

    <div class="mt-8 space-y-4">
      <div v-if="policyListError" class="rounded-xl border border-at-red/20 bg-at-red/5 px-4 py-3 text-sm text-at-red shadow-sm">
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
          :locale="activeLocale"
          clickable
          @row-click="(row) => openPolicyDetail(row.name)"
        />
        <div class="mt-4 flex items-center justify-between px-2">
          <p class="text-xs font-medium text-slate-400">{{ policyListRowsWithUrgency.length }} / {{ policyListTotalCount }} {{ t("showingRecords") }}</p>
          <div class="flex items-center gap-2">
            <button class="btn btn-outline btn-sm" type="button" :disabled="policyListPage <= 1" @click="previousPage">
              <FeatherIcon name="chevron-left" class="h-3 w-3" />
            </button>
            <span class="text-xs font-bold text-slate-900 w-8 text-center">{{ policyListPage }}</span>
            <button class="btn btn-outline btn-sm" type="button" :disabled="!hasNextPage" @click="nextPage">
              <FeatherIcon name="chevron-right" class="h-3 w-3" />
            </button>
          </div>
        </div>
      </template>
    </div>

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
      @submit="submitQuickPolicy(false)"
      @submit-and-open="submitQuickPolicy(true)"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

import { POLICY_TRANSLATIONS } from "../config/policy_translations";
import { translateText } from "../utils/i18n";
import { usePolicyListActions } from "../composables/usePolicyListActions";
import { usePolicyListFilters } from "../composables/usePolicyListFilters";
import { usePolicyListPresetSync } from "../composables/usePolicyListPresetSync";
import { usePolicyListQuickPolicy } from "../composables/usePolicyListQuickPolicy";
import { usePolicyListRuntime } from "../composables/usePolicyListRuntime";
import { usePolicyListTableData } from "../composables/usePolicyListTableData";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import SmartFilterBar from "../components/app-shell/SmartFilterBar.vue";
import PolicyListQuickPolicyDialog from "../components/policy-list/PolicyListQuickPolicyDialog.vue";
import ListTable from "../components/ui/ListTable.vue";
import SkeletonLoader from "../components/ui/SkeletonLoader.vue";
import { FeatherIcon } from "frappe-ui";
import { ref } from "vue";
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
const showAdvancedFilters = ref(false);

function t(key) {
  return POLICY_TRANSLATIONS[activeLocale.value]?.[key] || POLICY_TRANSLATIONS.en?.[key] || translateText(key, activeLocale.value) || key;
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
  { key: "policy_primary", secondaryKey: "policy_secondary", label: t("colPolicy"), type: "stacked" },
  { key: "customer_label", secondaryKey: "customer_secondary", label: t("colCustomer"), type: "stacked" },
  { key: "product_primary", secondaryKey: "product_secondary", label: t("colProduct"), type: "stacked" },
  { key: "vade_primary", secondaryKey: "vade_secondary", label: t("colVade"), type: "stacked" },
  { key: "finance_primary", secondaryKey: "finance_secondary", label: t("colPremium"), type: "stacked", align: "right" },
  { key: "status", label: t("colStatus"), type: "status", domain: "policy" },
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
