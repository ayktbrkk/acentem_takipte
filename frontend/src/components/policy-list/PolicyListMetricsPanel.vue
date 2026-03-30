<template>
  <div class="w-full grid grid-cols-1 gap-4 md:grid-cols-4">
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryTotal") }}</p>
      <p class="mini-metric-value">{{ formatCount(policySummary.total) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryActive") }}</p>
      <p class="mini-metric-value text-brand-600">{{ formatCount(policySummary.active) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryPending") }}</p>
      <p class="mini-metric-value text-amber-600">{{ formatCount(policySummary.pending) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryTotalPremium") }}</p>
      <p class="mini-metric-value text-green-600">{{ formatCurrency(policySummary.totalPremium, "TRY") }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  policySummary: {
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
