<template>
  <div class="w-full grid grid-cols-1 gap-4 md:grid-cols-5">
    <SaaSMetricCard :label="t('summaryTotal')" :value="formatCount(paymentSummary.total)" />
    <SaaSMetricCard :label="t('summaryPending')" :value="formatCount(paymentSummary.pending)" value-class="text-at-amber" />
    <SaaSMetricCard :label="t('summaryCollected')" :value="formatCount(paymentSummary.collected)" value-class="text-at-green" />
    <SaaSMetricCard :label="t('summaryOverdue')" :value="formatCount(paymentSummary.overdue)" value-class="text-at-red" />
    <SaaSMetricCard :label="t('summaryTotalAmount')" :value="formatCurrency(paymentSummary.totalAmount)" />
  </div>
</template>

<script setup>
import SaaSMetricCard from "../app-shell/SaaSMetricCard.vue";

defineProps({
  paymentSummary: {
    type: Object,
    required: true,
  },
  formatCount: {
    type: Function,
    required: true,
  },
  formatCurrency: {
    type: Function,
    required: true,
  },
  t: {
    type: Function,
    required: true,
  },
});
</script>
