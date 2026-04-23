<template>
  <WorkbenchPageLayout
    :breadcrumb="t('customers_breadcrumb')"
    :title="t('customers')"
    :record-count="summary.total"
    :record-count-label="t('total_customers')"
  >
    <template #actions>
      <ActionButton variant="primary" size="sm">
        + {{ t("new_customer") }}
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
          <p class="mini-metric-value text-emerald-600">{{ summary.active }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("individual") }}</p>
          <p class="mini-metric-value text-blue-600">{{ summary.individual }}</p>
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

    <SectionPanel :title="t('customer_list')">
      <template v-if="loading && !rows.length">
        <SkeletonLoader variant="list" :rows="10" />
      </template>
      <template v-else>
        <ListTable
          :columns="columns"
          :rows="rows"
          :loading="loading"
          clickable
          @row-click="row => openCustomer(row.name)"
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
          <template #cell(consent_status)="{ row }">
            <StatusBadge domain="customer" :status="row.consent_status === 'Granted' ? 'active' : 'cancel'" :label="row.consent_status_label" />
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
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, unref } from "vue";
import { useCustomerBoardRuntime } from "../composables/useCustomerBoardRuntime";
import { useAuthStore } from "../stores/auth";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import ListTable from "../components/ui/ListTable.vue";
import FilterBar from "../components/ui/FilterBar.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import SkeletonLoader from "../components/ui/SkeletonLoader.vue";

const authStore = useAuthStore();
const activeLocale = computed(() => unref(authStore.locale) || "tr");

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
  openCustomer,
} = useCustomerBoardRuntime({ activeLocale });

const columns = computed(() => [
  { key: "full_name", label: t("full_name"), width: "250px" },
  { key: "tax_id", label: t("tax_id"), width: "150px" },
  { key: "customer_type_label", label: t("type"), width: "120px" },
  { key: "phone", label: t("phone"), width: "150px" },
  { key: "office_branch", label: t("branch"), width: "150px" },
  { key: "consent_status", label: t("consent"), width: "120px" },
]);

const filterConfig = computed(() => [
  {
    key: "consent_status",
    label: t("consent"),
    options: [
      { value: "", label: t("all") },
      { value: "Granted", label: t("consent_granted") },
      { value: "Revoked", label: t("consent_revoked") },
      { value: "Unknown", label: t("consent_unknown") },
    ],
  },
]);
</script>
