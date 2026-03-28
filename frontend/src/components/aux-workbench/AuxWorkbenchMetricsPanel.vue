<template>
  <div class="space-y-4">
    <div v-if="snapshotSummaryCards.length" class="grid grid-cols-1 gap-4 md:grid-cols-4">
      <article v-for="card in snapshotSummaryCards" :key="card.key" class="mini-metric">
        <p class="mini-metric-label">{{ card.label }}</p>
        <p class="mini-metric-value">{{ card.value }}</p>
        <p class="mt-1 text-xs text-slate-500">{{ card.hint }}</p>
      </article>
    </div>

    <div v-if="reminderSummaryCards.length" class="grid grid-cols-1 gap-4 md:grid-cols-4">
      <article v-for="card in reminderSummaryCards" :key="card.key" class="mini-metric">
        <p class="mini-metric-label">{{ card.label }}</p>
        <p class="mini-metric-value">{{ card.value }}</p>
        <p class="mt-1 text-xs text-slate-500">{{ card.hint }}</p>
      </article>
    </div>

    <div v-if="accessLogSummaryCards.length" class="grid grid-cols-1 gap-4 md:grid-cols-4">
      <article v-for="card in accessLogSummaryCards" :key="card.key" class="mini-metric">
        <p class="mini-metric-label">{{ card.label }}</p>
        <p class="mini-metric-value">{{ card.value }}</p>
        <p class="mt-1 text-xs text-slate-500">{{ card.hint }}</p>
      </article>
    </div>

    <div v-if="fileSummaryCards.length" class="grid grid-cols-1 gap-4 md:grid-cols-4">
      <article v-for="card in fileSummaryCards" :key="card.key" class="mini-metric">
        <p class="mini-metric-label">{{ card.label }}</p>
        <p class="mini-metric-value">{{ card.value }}</p>
        <p class="mt-1 text-xs text-slate-500">{{ card.hint }}</p>
      </article>
    </div>

    <article v-if="snapshotTrendRows.length" class="surface-card rounded-2xl p-5">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ snapshotTrendTitle }}</p>
          <p class="text-sm text-slate-500">{{ snapshotTrendHint }}</p>
        </div>
        <span class="text-xs text-slate-400">{{ showingLabel }} {{ snapshotTrendRows.length }}</span>
      </div>
      <div class="mt-4 grid gap-3 md:grid-cols-3">
        <article
          v-for="row in snapshotTrendRows"
          :key="row.snapshotDate"
          class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
        >
          <p class="text-sm font-semibold text-slate-900">{{ row.snapshotDateLabel }}</p>
          <div class="mt-2 space-y-1 text-xs text-slate-600">
            <p>{{ totalSnapshotsLabel }}: {{ row.total }}</p>
            <p>{{ averageScoreLabel }}: {{ row.averageScore }}</p>
            <p>{{ highRiskSnapshotsLabel }}: {{ row.highRisk }}</p>
          </div>
        </article>
      </div>
    </article>
  </div>
</template>

<script setup>
defineProps({
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
</script>
