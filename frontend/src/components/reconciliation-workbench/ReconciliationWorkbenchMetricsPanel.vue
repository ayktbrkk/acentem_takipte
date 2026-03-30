<template>
  <div class="w-full grid grid-cols-1 gap-4 md:grid-cols-5">
    <div class="mini-metric">
      <p class="mini-metric-label">{{ props.t("summaryTotal") }}</p>
      <p class="mini-metric-value">{{ props.summary.total }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ props.t("summaryMatched") }}</p>
      <p class="mini-metric-value text-emerald-600">{{ props.summary.matched }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ props.t("summaryPending") }}</p>
      <p class="mini-metric-value text-amber-600">{{ props.summary.pending }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ props.t("summaryMismatch") }}</p>
      <p class="mini-metric-value text-amber-700">{{ props.summary.mismatch }}</p>
    </div>
    <div class="mini-metric">
      <p class="mini-metric-label">{{ props.t("summaryDifference") }}</p>
      <p class="mini-metric-value text-sky-600">{{ props.formatMoney(props.summary.totalDifference) }}</p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  t: { type: Function, required: true },
  summary: { type: Object, required: true },
  formatMoney: { type: Function, required: true },
});
</script>
