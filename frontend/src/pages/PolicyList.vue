<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="policyListTotalCount"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <ActionButton variant="secondary" size="sm" @click="downloadPolicyExport('xlsx')">
        <FeatherIcon name="download" class="h-4 w-4" />
        {{ t("exportXlsx") }}
      </ActionButton>
      <ActionButton variant="primary" size="sm" @click="openQuickPolicyDialog()">
        <FeatherIcon name="plus" class="h-4 w-4" />
        {{ t("newPolicy") }}
      </ActionButton>
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

      <div v-if="showAdvancedFilters" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label class="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>{{ t("insurance_company") }}</span>
            <input v-model="filters.insurance_company" class="input" type="text" @change="applyFilters" />
          </label>
          <label class="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>{{ t("endDateFilter") }}</span>
            <input v-model="filters.end_date" class="input" type="date" @change="applyFilters" />
          </label>
          <label class="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>{{ t("customerFilter") }}</span>
            <input v-model="filters.customer" class="input" type="text" @change="applyFilters" />
          </label>
        </div>
        <div class="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <ActionButton variant="secondary" size="sm" @click="clearFilters">
            {{ t("clearFilters") }}
          </ActionButton>
          <ActionButton variant="primary" size="sm" class="px-6" @click="applyFilters">
            {{ t("applyFilters") }}
          </ActionButton>
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
        <ListPager
          :shown="policyListRowsWithUrgency.length"
          :total="policyListTotalCount"
          :page="policyListPage"
          :has-next="hasNextPage"
          :showing-label="t('showingRecords')"
          @previous="previousPage"
          @next="nextPage"
        />
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
import { usePolicyListRuntime } from "../composables/usePolicyListRuntime";
import { usePolicyListActions } from "../composables/usePolicyListActions";
import { usePolicyListFilters } from "../composables/usePolicyListFilters";
import { usePolicyListPresetSync } from "../composables/usePolicyListPresetSync";
import { usePolicyListQuickPolicy } from "../composables/usePolicyListQuickPolicy";
import { buildPolicyListTableColumns } from "../composables/policyListTableModel";
import { usePolicyListTableData } from "../composables/usePolicyListTableData";
import ActionButton from "../components/app-shell/ActionButton.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import SmartFilterBar from "../components/app-shell/SmartFilterBar.vue";
import PolicyListQuickPolicyDialog from "../components/policy-list/PolicyListQuickPolicyDialog.vue";
import ListTable from "../components/ui/ListTable.vue";
import ListPager from "../components/app-shell/ListPager.vue";
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
  t,
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

const columns = computed(() => buildPolicyListTableColumns(t));

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
