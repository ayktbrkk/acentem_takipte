<template>
  <WorkbenchPageLayout
    :breadcrumb="t('policies_breadcrumb')"
    :title="t('policies')"
    :record-count="summary.total"
    :record-count-label="t('total_policies')"
  >
    <template #actions>
      <ActionButton variant="primary" size="sm">
        + {{ t("new_policy") }}
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
          <p class="mini-metric-label">{{ t("waiting") }}</p>
          <p class="mini-metric-value text-amber-600">{{ summary.waiting }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("cancelled") }}</p>
          <p class="mini-metric-value text-rose-600">{{ summary.cancelled }}</p>
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

    <SectionPanel :title="t('policy_list')">
      <template v-if="loading && !rows.length">
        <SkeletonLoader variant="list" :rows="10" />
      </template>
      <template v-else>
        <ListTable
          :columns="columns"
          :rows="rows"
          :loading="loading"
          clickable
          @row-click="row => openPolicy(row.name)"
        >
          <template #cell(gross_premium)="{ row }">
            <span class="font-medium text-slate-900">{{ formatCurrency(row.gross_premium, row.currency) }}</span>
          </template>
          <template #cell(status)="{ row }">
            <StatusBadge domain="policy" :status="row.status === 'Active' ? 'active' : row.status === 'Cancelled' ? 'cancel' : 'hold'" :label="row.status_label" />
          </template>
          <template #cell(end_date)="{ row }">
            {{ formatDate(row.end_date) }}
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
import { computed } from "vue";
import { useAuthStore } from "../stores/auth";
import { usePolicyBoardRuntime } from "../composables/usePolicyBoardRuntime";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import ListTable from "../components/ui/ListTable.vue";
import FilterBar from "../components/ui/FilterBar.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import SkeletonLoader from "../components/ui/SkeletonLoader.vue";

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
  openPolicy,
} = usePolicyBoardRuntime({ activeLocale });

const columns = computed(() => [
  { key: "policy_no", label: t("policy_no"), width: "150px" },
  { key: "customer", label: t("customer"), width: "200px" },
  { key: "insurance_company", label: t("insurance_company"), width: "200px" },
  { key: "branch", label: t("branch"), width: "150px" },
  { key: "gross_premium", label: t("gross_premium"), width: "150px", align: "right" },
  { key: "end_date", label: t("end_date"), width: "120px" },
  { key: "status", label: t("status"), width: "120px" },
]);

const filterConfig = computed(() => [
  {
    key: "status",
    label: t("status"),
    options: [
      { value: "", label: t("all") },
      { value: "Active", label: t("status_active") },
      { value: "IPT", label: t("status_ipt") },
      { value: "KYT", label: t("status_kyt") },
    ],
  },
]);

function formatCurrency(val, currency = "TRY") {
  return new Intl.NumberFormat(activeLocale.value === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: currency || "TRY",
  }).format(Number(val || 0));
}

function formatDate(val) {
  if (!val) return "-";
  return new Intl.DateTimeFormat(activeLocale.value === "tr" ? "tr-TR" : "en-US").format(new Date(val));
}
</script>
