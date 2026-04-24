<template>
  <div class="w-full grid grid-cols-1 gap-4 md:grid-cols-5">
    <div class="mini-metric">
      <p class="mini-metric-label">{{ labels.total }}</p>
      <p class="mini-metric-value">{{ formatCount(summary.total) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ labels.draft }}</p>
      <p class="mini-metric-value text-gray-600">{{ formatCount(summary.draft) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ labels.sent }}</p>
      <p class="mini-metric-value text-brand-600">{{ formatCount(summary.sent) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ labels.accepted }}</p>
      <p class="mini-metric-value text-green-600">{{ formatCount(summary.accepted) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ labels.conversion }}</p>
      <p class="mini-metric-value text-brand-600">{{ conversionRate }}%</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  summary: { type: Object, default: () => ({ total: 0, draft: 0, sent: 0, accepted: 0 }) },
  conversionRate: { type: [String, Number], default: "0.0" },
  labels: {
    type: Object,
    default: () => ({ total: "", draft: "", sent: "", accepted: "", conversion: "" }),
  },
  formatCount: { type: Function, required: true },
});
</script>
