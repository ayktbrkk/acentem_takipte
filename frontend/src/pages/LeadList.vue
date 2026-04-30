<template>
  <WorkbenchPageLayout
    :breadcrumb="t('leads_breadcrumb')"
    :title="t('leads')"
    :subtitle="t('subtitle')"
    :record-count="summary.total"
    :record-count-label="t('total_leads')"
  >
    <template #actions>
      <ActionButton variant="primary" size="sm" @click="openQuickLeadDialog()">
        <FeatherIcon name="plus" class="h-4 w-4" />
        {{ t("new_lead") }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" @click="reload">
        <FeatherIcon name="refresh-cw" class="h-4 w-4" />
        {{ t("refresh") }}
      </ActionButton>
    </template>

    <template #metrics>
      <div v-if="loading && !rows.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
      </div>
      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SaaSMetricCard :label="t('total')" :value="summary.total" />
        <SaaSMetricCard :label="t('active')" :value="summary.active" value-class="text-brand-600" />
        <SaaSMetricCard :label="t('individual')" :value="summary.individual" value-class="text-at-green" />
        <SaaSMetricCard :label="t('corporate')" :value="summary.corporate" value-class="text-slate-900" />
      </div>
    </template>

    <div class="space-y-4">
      <SmartFilterBar
        v-model="filters.query"
        :placeholder="t('search')"
        :advanced-label="t('filters')"
        @open-advanced="showAdvancedFilters = !showAdvancedFilters"
      >
        <template #primary-filters>
          <select
            class="input h-9 py-1 text-sm"
            @change="updateFilter('status', $event.target.value)"
          >
            <option value="">{{ t("status") }}: {{ t("all") }}</option>
            <option v-for="opt in filterConfig[0].options" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </template>
      </SmartFilterBar>

      <div v-if="showAdvancedFilters" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label class="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>{{ t("branch") }}</span>
            <input v-model="filters.office_branch" class="input" type="text" />
          </label>
          <label class="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>{{ t("status") }}</span>
            <select v-model="filters.sort" class="input">
              <option value="creation desc">{{ t("sortNewest") }}</option>
              <option value="creation asc">{{ t("sortOldest") }}</option>
            </select>
          </label>
        </div>
        <div class="mt-5 flex items-center justify-end gap-2 border-t pt-4">
          <button class="btn btn-outline btn-sm" type="button" @click="clearFilters">{{ t("clearFilters") }}</button>
          <button class="btn btn-primary btn-sm px-6" type="button" @click="applyAdvancedFilters">{{ t("applyFilters") }}</button>
        </div>
      </div>
    </div>

    <div class="mt-8 space-y-4">
      <template v-if="loading && !rows.length">
        <SkeletonLoader variant="list" :rows="10" />
      </template>
      <template v-else>
        <ListTable
          :columns="columns"
          :rows="rows"
          :loading="loading"
          clickable
          @row-click="row => openLead(row.name)"
        />

        <div class="mt-4 flex items-center justify-between px-2">
          <p class="text-xs font-medium text-slate-400">
            {{ t("showing") }} {{ rows.length }} / {{ summary.total }} {{ t('total_leads') }}
          </p>
          <div class="flex items-center gap-2">
            <button
              class="btn btn-outline btn-sm"
              :disabled="pagination.page <= 1"
              @click="setPage(pagination.page - 1)"
            >
              <FeatherIcon name="chevron-left" class="h-3 w-3" />
            </button>
            <span class="text-xs font-bold text-slate-900 w-8 text-center">{{ pagination.page }}</span>
            <button
              class="btn btn-outline btn-sm"
              :disabled="rows.length < pagination.pageLength"
              @click="setPage(pagination.page + 1)"
            >
              <FeatherIcon name="chevron-right" class="h-3 w-3" />
            </button>
          </div>
        </div>
      </template>
    </div>

    <LeadListQuickLeadDialog
      :show-quick-lead-dialog="showQuickLeadDialog"
      :quick-lead-ui="quickLeadUi"
      :quick-lead-error="quickLeadError"
      :quick-create-common="quickCreateCommon"
      :quick-lead-loading="quickLeadLoading"
      :quick-lead-form="quickLeadForm"
      :quick-lead-field-errors="quickLeadFieldErrors"
      :active-locale="activeLocale"
      :lead-quick-form-fields="leadQuickFormFields"
      :lead-quick-options-map="leadQuickOptionsMap"
      @update:show-quick-lead-dialog="showQuickLeadDialog = $event"
      @cancel="cancelQuickLeadDialog"
      @save="submitQuickLead"
      @request-related-create="onLeadRelatedCreateRequested"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
/**
 * Lead List Page (Version 2.2)
 * Synchronized with AT Lead doctype (first_name, last_name)
 */
import { computed } from "vue";
import { useAuthStore } from "../stores/auth";
import { useLeadBoardRuntime } from "../composables/useLeadBoardRuntime";
import { useLeadListQuickLead } from "../composables/useLeadListQuickLead";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import SmartFilterBar from "../components/app-shell/SmartFilterBar.vue";
import ListTable from "../components/ui/ListTable.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import SkeletonLoader from "../components/ui/SkeletonLoader.vue";
import LeadListQuickLeadDialog from "../components/lead-list/LeadListQuickLeadDialog.vue";
import { FeatherIcon } from "frappe-ui";
import { ref } from "vue";

const authStore = useAuthStore();
const activeLocale = computed(() => authStore.locale || "tr");
const showAdvancedFilters = ref(false);

const {
  filters,
  pagination,
  summary,
  rows,
  loading,
  t,
  reload,
  setPage,
  updateFilter,
  openLead,
} = useLeadBoardRuntime({ activeLocale });

const {
  showQuickLeadDialog,
  quickLeadLoading,
  quickLeadError,
  quickLeadFieldErrors,
  quickLeadForm,
  leadQuickFormFields,
  leadQuickOptionsMap,
  quickLeadUi,
  quickCreateCommon,
  openQuickLeadDialog,
  cancelQuickLeadDialog,
  submitQuickLead,
  onLeadRelatedCreateRequested,
} = useLeadListQuickLead({
  t,
  activeLocale,
  refreshLeadList: reload,
  openLeadDetail: openLead,
});

// Standard lead columns - creation date and name fields prioritized
const columns = computed(() => [
  { key: "lead_primary", secondaryKey: "lead_secondary", label: t("colLead"), type: "stacked" },
  { key: "customer_label", secondaryKey: "customer_secondary", label: t("colCustomer"), type: "stacked" },
  { key: "status_label", secondaryKey: "takip_label", label: t("colStatus"), type: "stacked" },
  { key: "finance_primary", secondaryKey: "date_secondary", label: t("colPotential"), type: "stacked", align: "right" },
]);

const filterConfig = computed(() => [
  {
    key: "status",
    label: t("status"),
    options: [
      { value: "", label: t("all") },
      { value: "Draft", label: t("status_draft") },
      { value: "Open", label: t("status_open") },
      { value: "Replied", label: t("status_replied") },
      { value: "Closed", label: t("status_closed") },
    ],
  },
]);

function applyAdvancedFilters() {
  pagination.page = 1;
  reload();
}

function clearFilters() {
  filters.query = "";
  filters.status = "";
  filters.office_branch = "";
  filters.sort = "creation desc";
  pagination.page = 1;
  reload();
}
</script>
