<template>
  <div class="space-y-6">
    <!-- Combined Summary Cards -->
    <div v-if="allCards.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div 
        v-for="card in allCards" 
        :key="card.key" 
        class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center transition-all hover:shadow-md"
      >
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{{ card.label }}</p>
        <p class="text-2xl font-black text-slate-900">{{ card.value }}</p>
        <p v-if="card.hint" class="mt-1 text-[10px] text-slate-400 font-medium">{{ card.hint }}</p>
      </div>
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
