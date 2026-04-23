<template>
  <WorkbenchPageLayout
    :breadcrumb="t('title')"
    :title="t('title')"
    :record-count="paymentSummary.total"
    :record-count-label="t('records')"
  >
    <template #actions>
      <PaymentsBoardActionBar
        :loading="paymentsLoading"
        :t="t"
        @launch="showQuickPaymentDialog = true"
        @refresh="reloadPayments"
        @export-xlsx="downloadPaymentExport('xlsx')"
      />
    </template>

    <template #metrics>
      <PaymentsBoardMetricsPanel
        :payment-summary="paymentSummary"
        :format-count="formatCount"
        :format-currency="formatCurrency"
        :t="t"
      />
    </template>

    <PaymentsBoardFilterSection
      v-model="presetKey"
      :filters="filters"
      :payment-sort-options="paymentSortOptions"
      :preset-options="presetOptions"
      :can-delete-preset="canDeletePreset"
      :active-count="activeFilterCount"
      :t="t"
      @preset-change="onPresetChange"
      @preset-save="savePreset"
      @preset-delete="deletePreset"
      @apply="applyPaymentFilters"
      @reset="resetPaymentFilters"
    />

    <PaymentsBoardTableSection
      :payments="paymentSnapshots"
      :payment-list-columns="paymentListColumns"
      :payments-with-actions="paymentsWithActions"
      :loading="paymentsLoading"
      :error-text="paymentsErrorText"
      :locale="localeCode"
      :t="t"
      @row-click="openPaymentDetail"
    />

    <PaymentsBoardQuickPaymentDialog
      v-model="showQuickPaymentDialog"
      :locale="activeLocale"
      :options-map="paymentQuickOptionsMap"
      :eyebrow="quickPaymentEyebrow"
      :before-open="prepareQuickPaymentDialog"
      :success-handlers="quickPaymentSuccessHandlers"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { useRoute, useRouter } from "vue-router";

import PaymentsBoardActionBar from "../components/payments-board/PaymentsBoardActionBar.vue";
import PaymentsBoardFilterSection from "../components/payments-board/PaymentsBoardFilterSection.vue";
import PaymentsBoardMetricsPanel from "../components/payments-board/PaymentsBoardMetricsPanel.vue";
import PaymentsBoardQuickPaymentDialog from "../components/payments-board/PaymentsBoardQuickPaymentDialog.vue";
import PaymentsBoardTableSection from "../components/payments-board/PaymentsBoardTableSection.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import { usePaymentsBoardRuntime } from "../composables/usePaymentsBoardRuntime";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { usePaymentStore } from "../stores/payment";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const branchStore = useBranchStore();
const paymentStore = usePaymentStore();

const {
  activeLocale,
  localeCode,
  filters,
  paymentSortOptions,
  activeFilterCount,
  presetKey,
  presetOptions,
  canDeletePreset,
  onPresetChange,
  savePreset,
  deletePreset,
  paymentsLoading,
  showQuickPaymentDialog,
  paymentQuickOptionsMap,
  quickPaymentEyebrow,
  quickPaymentSuccessHandlers,
  paymentsErrorText,
  paymentSnapshots,
  paymentSummary,
  paymentListColumns,
  paymentsWithActions,
  reloadPayments,
  downloadPaymentExport,
  applyPaymentFilters,
  resetPaymentFilters,
  openPaymentDetail,
  prepareQuickPaymentDialog,
  formatCurrency,
  formatCount,
  t,
} = usePaymentsBoardRuntime({
  route,
  router,
  authStore,
  branchStore,
  paymentStore,
});
</script>
