<template>
  <div class="w-full grid grid-cols-1 gap-4 md:grid-cols-5">
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryTotal") }}</p>
      <p class="mini-metric-value">{{ formatCount(paymentSummary.total) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryPending") }}</p>
      <p class="mini-metric-value text-amber-600">{{ formatCount(paymentSummary.pending) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryCollected") }}</p>
      <p class="mini-metric-value text-green-600">{{ formatCount(paymentSummary.collected) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryOverdue") }}</p>
      <p class="mini-metric-value text-amber-700">{{ formatCount(paymentSummary.overdue) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryTotalAmount") }}</p>
      <p class="mini-metric-value text-slate-900">{{ formatCurrency(paymentSummary.totalAmount) }}</p>
    </div>
  </div>
</template>

<script setup>
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
