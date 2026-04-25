<template>
  <div v-if="showAnalyticsRow" class="grid gap-4 xl:grid-cols-3">
    <SectionPanel :title="t('leadPipeline')" :show-count="false" :meta="t('liveData')">
      <div v-if="dashboardLoading" class="text-sm text-slate-500">
        {{ t("loading") }}
      </div>
      <div v-else class="space-y-4">
        <ProgressMetricRow
          v-for="item in leadStatusSummary"
          :key="item.key"
          :label="item.label"
          :value="formatNumber(item.value)"
          :ratio="item.ratio"
          :bar-class="item.colorClass"
        />
      </div>
    </SectionPanel>

    <SectionPanel :title="t('offerStatusOverviewTitle')" :show-count="false" :meta="t('liveData')">
      <div v-if="dashboardLoading" class="text-sm text-slate-500">
        {{ t("loading") }}
      </div>
      <div v-else-if="salesOfferStatusSummary.length === 0" class="card-empty-compact text-sm">
        {{ t("noOfferStatus") }}
      </div>
      <div v-else class="space-y-4">
        <ProgressMetricRow
          v-for="item in salesOfferStatusSummary"
          :key="item.key"
          :label="item.label"
          :value="formatNumber(item.value)"
          :ratio="item.ratio"
          :bar-class="item.colorClass"
        />
      </div>
    </SectionPanel>

    <SectionPanel :title="t('commissionTrend')" :show-count="false" :meta="t('lastMonths')">
      <div
        v-if="commissionTrend.length === 0"
        class="card-empty-compact text-center"
      >
        {{ t("noTrendData") }}
      </div>
      <div v-else class="space-y-3">
        <TrendMetricRow
          v-for="entry in commissionTrend"
          :key="entry.month_key"
          :label="formatMonthKey(entry.month_key)"
          :value="formatCurrency(entry.total_commission)"
          :ratio="trendRatio(entry.total_commission)"
        />
      </div>
    </SectionPanel>
  </div>
</template>

<script setup>
import ProgressMetricRow from "../app-shell/ProgressMetricRow.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import TrendMetricRow from "../app-shell/TrendMetricRow.vue";

defineProps({
  commissionTrend: { type: Array, required: true },
  dashboardLoading: { type: Boolean, required: true },
  formatCurrency: { type: Function, required: true },
  formatMonthKey: { type: Function, required: true },
  formatNumber: { type: Function, required: true },
  leadStatusSummary: { type: Array, required: true },
  salesOfferStatusSummary: { type: Array, required: true },
  showAnalyticsRow: { type: Boolean, required: true },
  t: { type: Function, required: true },
  trendRatio: { type: Function, required: true },
});
</script>
