<template>
  <article class="at-metric-card group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="mb-1.5 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{{ title }}</p>
        <p :class="['at-metric-value tabular-nums text-2xl font-bold tracking-tight', valueClass || 'text-slate-900']">
          {{ value }}
        </p>
        <p v-if="trendText" :class="['mt-1 truncate text-xs font-medium', trendClass || 'text-slate-500']">
          {{ trendText }}
        </p>
      </div>
      <div
        v-if="icon"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"
      >
        <FeatherIcon :name="icon || 'bar-chart-2'" class="h-5 w-5" />
      </div>
    </div>
  </article>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui";

defineProps({
  title: {
    type: String,
    default: "",
  },
  value: {
    type: [String, Number],
    default: "",
  },
  t: {
    type: Function,
    required: true,
  },
  icon: {
    type: String,
    default: "bar-chart-2",
  },
  valueClass: {
    type: String,
    default: "",
  },
  trendText: {
    type: String,
    default: "",
  },
  trendClass: {
    type: String,
    default: "",
  },
});
</script>
