<template>
  <div class="space-y-6">
    <!-- Combined Summary Cards -->
    <div v-if="allCards.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SaaSMetricCard 
        v-for="card in allCards" 
        :key="card.key" 
        :label="card.label"
        :value="card.value"
        :trend="card.hint"
      />
    </div>

    <!-- Trend Section -->
    <SectionPanel 
      v-if="snapshotTrendRows.length" 
      :title="snapshotTrendTitle" 
      panel-class="surface-card rounded-2xl p-5"
    >
      <div class="grid gap-4 md:grid-cols-3">
        <div
          v-for="row in snapshotTrendRows"
          :key="row.snapshotDate"
          class="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
        >
          <p class="text-sm font-bold text-slate-900 mb-3">{{ row.snapshotDateLabel }}</p>
          <div class="space-y-2">
            <div class="flex justify-between items-center text-xs">
              <span class="text-slate-500">{{ totalSnapshotsLabel }}</span>
              <span class="font-bold text-slate-700">{{ row.total }}</span>
            </div>
            <div class="flex justify-between items-center text-xs">
              <span class="text-slate-500">{{ averageScoreLabel }}</span>
              <span class="font-bold text-slate-700">{{ row.averageScore }}</span>
            </div>
            <div class="flex justify-between items-center text-xs">
              <span class="text-slate-500">{{ highRiskSnapshotsLabel }}</span>
              <span class="font-bold text-rose-600">{{ row.highRisk }}</span>
            </div>
          </div>
        </div>
      </div>
    </SectionPanel>
  </div>
</template>

<script setup>
import { computed } from "vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import SaaSMetricCard from "../app-shell/SaaSMetricCard.vue";

const props = defineProps({
  snapshotSummaryCards: { type: Array, default: () => [] },
  reminderSummaryCards: { type: Array, default: () => [] },
  accessLogSummaryCards: { type: Array, default: () => [] },
  fileSummaryCards: { type: Array, default: () => [] },
  snapshotTrendRows: { type: Array, default: () => [] },
  snapshotTrendTitle: { type: String, default: "" },
  snapshotTrendHint: { type: String, default: "" },
  showingLabel: { type: String, default: "" },
  totalSnapshotsLabel: { type: String, default: "" },
  averageScoreLabel: { type: String, default: "" },
  highRiskSnapshotsLabel: { type: String, default: "" },
});

const allCards = computed(() => [
  ...props.snapshotSummaryCards,
  ...props.reminderSummaryCards,
  ...props.accessLogSummaryCards,
  ...props.fileSummaryCards,
]);
</script>
