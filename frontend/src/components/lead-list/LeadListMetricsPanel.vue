<template>
  <div class="w-full grid grid-cols-1 gap-4 md:grid-cols-5">
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryTotal") }}</p>
      <p class="mini-metric-value">{{ formatCount(pagination.total) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryOpen") }}</p>
      <p class="mini-metric-value text-brand-600">{{ formatCount(leadPageSummary.open) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryFollowUp") }}</p>
      <p class="mini-metric-value text-amber-600">{{ formatCount(leadPageSummary.followUp) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryActionable") }}</p>
      <p class="mini-metric-value text-blue-600">{{ formatCount(leadPageSummary.actionable) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryConversion") }}</p>
      <p class="mini-metric-value text-green-600">{{ formatPercent(leadPageSummary.conversionRate) }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  pagination: {
    type: Object,
    required: true,
  },
  leadPageSummary: {
    type: Object,
    required: true,
  },
  formatCount: {
    type: Function,
    required: true,
  },
  formatPercent: {
    type: Function,
    required: true,
  },
  t: {
    type: Function,
    required: true,
  },
});
</script>
