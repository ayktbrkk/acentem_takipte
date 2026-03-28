<template>
  <div class="grid w-full grid-cols-1 gap-4 md:grid-cols-5">
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryTotal") }}</p>
      <p class="mini-metric-value">{{ formatCount(claimSummary.total) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryOpen") }}</p>
      <p class="mini-metric-value text-brand-600">{{ formatCount(claimSummary.open) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryApproved") }}</p>
      <p class="mini-metric-value text-amber-600">{{ formatCount(claimSummary.approved) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryPaid") }}</p>
      <p class="mini-metric-value text-green-600">{{ formatCount(claimSummary.paid) }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ t("summaryReservePaid") }}</p>
      <p class="mini-metric-value text-slate-900">{{ claimSummary.reserveVsPaid }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  claimSummary: {
    type: Object,
    required: true,
  },
  formatCount: {
    type: Function,
    required: true,
  },
  t: {
    type: Function,
    required: true,
  },
});
</script>
