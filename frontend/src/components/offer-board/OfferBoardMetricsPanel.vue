<template>
  <div v-if="isListView" class="w-full grid grid-cols-1 gap-4 md:grid-cols-5">
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryTotal") }}</p>
      <p class="mini-metric-value">{{ formatCount(summary.total) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryDraft") }}</p>
      <p class="mini-metric-value text-gray-600">{{ formatCount(summary.draft) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summarySent") }}</p>
      <p class="mini-metric-value text-blue-600">{{ formatCount(summary.sent) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryAccepted") }}</p>
      <p class="mini-metric-value text-green-600">{{ formatCount(summary.accepted) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryConversion") }}</p>
      <p class="mini-metric-value text-brand-600">{{ conversionRate }}%</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  conversionRate: {
    type: String,
    default: "0.0",
  },
  formatCount: {
    type: Function,
    required: true,
  },
  isListView: {
    type: Boolean,
    default: false,
  },
  summary: {
    type: Object,
    default: () => ({
      total: 0,
      draft: 0,
      sent: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
    }),
  },
  t: {
    type: Function,
    required: true,
  },
});
</script>
