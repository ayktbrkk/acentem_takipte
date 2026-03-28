<template>
  <SectionPanel
    v-if="comparisonSummaryItems.length"
    :title="title"
    :meta="meta"
    :count="comparisonSummaryItems.length"
  >
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="item in comparisonSummaryItems"
        :key="item.key"
        class="mini-metric shadow-sm border border-slate-200 bg-white/95"
        :class="item.cardClass"
      >
        <p class="mini-metric-label">
          {{ item.label }}
        </p>
        <p class="mini-metric-value" :class="item.valueClass">
          {{ item.value }}
        </p>
        <p class="mt-1 text-xs font-medium" :class="item.delta >= 0 ? 'text-emerald-600' : 'text-amber-700'">
          {{ formatComparisonDelta(item.delta, item.previous) }}
        </p>
      </article>
    </div>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";

defineProps({
  title: {
    type: String,
    default: "",
  },
  meta: {
    type: String,
    default: "",
  },
  comparisonSummaryItems: {
    type: Array,
    default: () => [],
  },
  formatComparisonDelta: {
    type: Function,
    required: true,
  },
});
</script>
