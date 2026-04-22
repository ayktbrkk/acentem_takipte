<template>
  <WorkbenchPageLayout
    :breadcrumb="t('payments_breadcrumb')"
    :title="t('payments')"
    :record-count="summary.total"
    :record-count-label="t('total_payments')"
  >
    <template #actions>
      <ActionButton variant="primary" size="sm">
        + {{ t("new_payment") }}
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
          <p class="mini-metric-label">{{ t("paid") }}</p>
          <p class="mini-metric-value text-emerald-600">{{ summary.paid }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("unpaid") }}</p>
          <p class="mini-metric-value text-amber-600">{{ summary.unpaid }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("overdue") }}</p>
          <p class="mini-metric-value text-rose-600">{{ summary.overdue }}</p>
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

    <SectionPanel :title="t('payment_list')">
      <template v-if="loading && !rows.length">
        <SkeletonLoader variant="list" :rows="10" />
      </template>
      <template v-else>
        <ListTable
          :columns="columns"
          :rows="rows"
          :loading="loading"
          clickable
          @row-click="row => openPayment(row.name)"
        >
          <template #cell(amount)="{ row }">
            <span class="font-medium text-slate-900">{{ formatCurrency(row.amount, row.currency) }}</span>
          </template>
          <template #cell(status)="{ row }">
            <StatusBadge domain="payment" :status="row.status === 'Paid' ? 'active' : row.status === 'Unpaid' ? 'hold' : 'hold'" :label="row.status_label" />
          </template>
          <template #cell(payment_date)="{ row }">
            {{ formatDate(row.payment_date) }}
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
import { usePaymentBoardRuntime } from "../composables/usePaymentBoardRuntime";
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
  openPayment,
} = usePaymentBoardRuntime({ activeLocale });

const columns = computed(() => [
  { key: "payment_no", label: t("payment_no"), width: "150px" },
  { key: "customer", label: t("customer"), width: "200px" },
  { key: "payment_purpose", label: t("payment_purpose"), width: "150px" },
  { key: "amount", label: t("amount"), width: "150px", align: "right" },
  { key: "payment_date", label: t("payment_date"), width: "120px" },
  { key: "status", label: t("status"), width: "120px" },
]);

const filterConfig = computed(() => [
  {
    key: "status",
    label: t("status"),
    options: [
      { value: "", label: t("all") },
      { value: "Paid", label: t("status_paid") },
      { value: "Unpaid", label: t("status_unpaid") },
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
