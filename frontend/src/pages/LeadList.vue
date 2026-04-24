<template>
  <WorkbenchPageLayout
    :breadcrumb="t('leads_breadcrumb')"
    :title="t('leads')"
    :record-count="summary.total"
    :record-count-label="t('total_leads')"
  >
    <template #actions>
      <ActionButton variant="primary" size="sm" @click="openQuickLeadDialog()">
        + {{ t("new_lead") }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" @click="reload">
        {{ t("refresh") }}
      </ActionButton>
    </template>

    <template #metrics>
      <div v-if="loading && !rows.length" class="w-full grid grid-cols-1 gap-4 md:grid-cols-4">
        <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
      </div>
      <div v-else class="w-full grid grid-cols-1 gap-4 md:grid-cols-4">
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("total") }}</p>
          <p class="mini-metric-value">{{ summary.total }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("active") }}</p>
          <p class="mini-metric-value text-brand-600">{{ summary.active }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("individual") }}</p>
          <p class="mini-metric-value text-emerald-600">{{ summary.individual }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("corporate") }}</p>
          <p class="mini-metric-value text-violet-600">{{ summary.corporate }}</p>
        </div>
      </div>
    </template>

    <SectionPanel :title="t('filters')">
      <FilterBar
        :search="filters.query"
        :filters="filterConfig"
        @update:search="v => updateFilter('query', v)"
        @filter-change="({ key, value }) => updateFilter(key, value)"
      />
    </SectionPanel>

    <SectionPanel :title="t('lead_list')">
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
        >
          <template #cell(full_name)="{ row }">
            <div class="flex items-center gap-3">
              <div class="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
                {{ (row.full_name || "?").charAt(0).toUpperCase() }}
              </div>
              <div>
                <p class="font-medium text-slate-900">{{ row.full_name }}</p>
                <p class="text-xs text-slate-500">{{ row.name }}</p>
              </div>
            </div>
          </template>
          <template #cell(status)="{ row }">
            <StatusBadge
              domain="lead"
              :status="row.status === 'Closed' ? 'cancel' : row.status === 'Replied' ? 'active' : 'hold'"
              :label="row.status_label"
            />
          </template>
        </ListTable>

        <div class="mt-4 flex items-center justify-between">
          <p class="text-xs text-slate-500">
            {{ t("showing") }} {{ rows.length }} / {{ summary.total }}
          </p>
          <div class="flex items-center gap-2">
            <ActionButton
              variant="secondary"
              size="xs"
              :disabled="pagination.page <= 1"
              @click="setPage(pagination.page - 1)"
            >
              ←
            </ActionButton>
            <span class="text-xs font-medium text-slate-700">{{ pagination.page }}</span>
            <ActionButton
              variant="secondary"
              size="xs"
              :disabled="rows.length < pagination.pageLength"
              @click="setPage(pagination.page + 1)"
            >
              →
            </ActionButton>
          </div>
        </div>
      </template>
    </SectionPanel>

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
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import ListTable from "../components/ui/ListTable.vue";
import FilterBar from "../components/ui/FilterBar.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import SkeletonLoader from "../components/ui/SkeletonLoader.vue";
import LeadListQuickLeadDialog from "../components/lead-list/LeadListQuickLeadDialog.vue";

const authStore = useAuthStore();
const activeLocale = computed(() => authStore.locale || "tr");

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
  { key: "full_name", label: t("full_name"), width: "220px" },
  { key: "branch", label: t("branch"), width: "120px" },
  { key: "phone", label: t("phone"), width: "140px" },
  { key: "status", label: t("status"), width: "110px" },
  { key: "creation", label: t("lead_date"), width: "130px", type: "date" },
  { key: "estimated_gross_premium", label: t("estimated_gross_premium"), width: "160px", type: "currency" },
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
</script>
