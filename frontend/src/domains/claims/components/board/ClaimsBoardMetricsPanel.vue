<template>
  <div class="grid w-full grid-cols-1 gap-4 md:grid-cols-5">
    <SaaSMetricCard :label="t('summaryTotal')" :value="formatCount(claimSummary.total)" />
    <SaaSMetricCard :label="t('summaryOpen')" :value="formatCount(claimSummary.open)" value-class="text-brand-600" />
    <SaaSMetricCard :label="t('summaryApproved')" :value="formatCount(claimSummary.approved)" value-class="text-at-amber" />
    <SaaSMetricCard :label="t('summaryPaid')" :value="formatCount(claimSummary.paid)" value-class="text-at-green" />
    <SaaSMetricCard :label="t('summaryReservePaid')" :value="claimSummary.reserveVsPaid" />
  </div>
</template>

<script setup>
import SaaSMetricCard from "../app-shell/SaaSMetricCard.vue";

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
