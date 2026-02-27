<template>
  <article class="at-metric-card">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="at-metric-label">{{ title }}</p>
        <p class="at-metric-value">{{ value }}</p>
      </div>
      <div class="at-metric-icon">
        <FeatherIcon :name="icon || 'bar-chart-2'" class="h-5 w-5" />
      </div>
    </div>

    <div class="at-metric-hint flex items-center gap-2">
      <span class="font-semibold" :class="trendClass">
        {{ trendText }}
      </span>
      <span>{{ trendHint }}</span>
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
    type: String,
    default: "",
  },
  trendText: {
    type: String,
    default: "",
  },
  trendClass: {
    type: String,
    default: "text-slate-600",
  },
  trendHint: {
    type: String,
    default: "",
  },
  icon: {
    type: String,
    default: "bar-chart-2",
  },
});
</script>
