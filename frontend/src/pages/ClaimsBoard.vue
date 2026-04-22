<template>
  <WorkbenchPageLayout
    :breadcrumb="t('claims_breadcrumb')"
    :title="t('claims')"
    :record-count="summary.total"
    :record-count-label="t('total_claims')"
  >
    <template #actions>
      <ActionButton variant="primary" size="sm">
        + {{ t("new_claim") }}
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
          <p class="mini-metric-label">{{ t("closed") }}</p>
          <p class="mini-metric-value text-slate-600">{{ summary.closed }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("rejected") }}</p>
          <p class="mini-metric-value text-rose-600">{{ summary.rejected }}</p>
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

    <SectionPanel :title="t('claim_list')">
      <template v-if="loading && !rows.length">
        <SkeletonLoader variant="list" :rows="10" />
      </template>
      <template v-else>
        <ListTable
          :columns="columns"
          :rows="rows"
          :loading="loading"
          clickable
          @row-click="row => openClaim(row.name)"
        >
          <template #cell(total_amount)="{ row }">
            <span class="font-medium text-slate-900">{{ formatCurrency(row.total_amount, row.currency) }}</span>
          </template>
          <template #cell(status)="{ row }">
            <StatusBadge domain="claim" :status="row.status === 'Open' ? 'active' : row.status === 'Closed' ? 'closed' : 'hold'" :label="row.status_label" />
          </template>
          <template #cell(claim_date)="{ row }">
            {{ formatDate(row.claim_date) }}
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
import { useClaimBoardRuntime } from "../composables/useClaimBoardRuntime";
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
  openClaim,
} = useClaimBoardRuntime({ activeLocale });

const columns = computed(() => [
  { key: "name", label: t("claim_id"), width: "150px" },
  { key: "customer", label: t("customer"), width: "200px" },
  { key: "insurance_company", label: t("insurance_company"), width: "200px" },
  { key: "policy", label: t("policy_no"), width: "150px" },
  { key: "total_amount", label: t("total_amount"), width: "150px", align: "right" },
  { key: "claim_date", label: t("claim_date"), width: "120px" },
  { key: "status", label: t("status"), width: "120px" },
]);

const filterConfig = computed(() => [
  {
    key: "status",
    label: t("status"),
    options: [
      { value: "", label: t("all") },
      { value: "Open", label: t("status_open") },
      { value: "Closed", label: t("status_closed") },
      { value: "Rejected", label: t("status_rejected") },
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
