<template>
  <div class="w-full grid grid-cols-1 gap-4 md:grid-cols-5">
    <SaaSMetricCard :label="props.t('summaryTotal')" :value="String(props.summary.total)" />
    <SaaSMetricCard :label="props.t('summaryMatched')" :value="String(props.summary.matched)" value-class="text-at-green" />
    <SaaSMetricCard :label="props.t('summaryPending')" :value="String(props.summary.pending)" value-class="text-brand-600" />
    <SaaSMetricCard :label="props.t('summaryMismatch')" :value="String(props.summary.mismatch)" value-class="text-at-amber" />
    <SaaSMetricCard :label="props.t('summaryDifference')" :value="props.formatMoney(props.summary.totalDifference)" />
  </div>
</template>

<script setup>
import SaaSMetricCard from "../app-shell/SaaSMetricCard.vue";
const props = defineProps({
  t: { type: Function, required: true },
  summary: { type: Object, required: true },
  formatMoney: { type: Function, required: true },
});
</script>
