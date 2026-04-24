<template>
  <div class="w-full grid grid-cols-1 gap-4 md:grid-cols-5">
    <SaaSMetricCard :label="t('summaryTotal')" :value="formatCount(paymentSummary.total)" />
    <SaaSMetricCard :label="t('summaryPending')" :value="formatCount(paymentSummary.pending)" value-class="text-amber-600" />
    <SaaSMetricCard :label="t('summaryCollected')" :value="formatCount(paymentSummary.collected)" value-class="text-green-600" />
    <SaaSMetricCard :label="t('summaryOverdue')" :value="formatCount(paymentSummary.overdue)" value-class="text-amber-700" />
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
