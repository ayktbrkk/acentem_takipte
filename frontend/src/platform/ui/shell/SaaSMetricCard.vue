<template>
  <div class="at-metric-card">
    <p class="at-metric-label">{{ label }}</p>
    <div class="flex items-baseline gap-2">
      <p :class="['at-metric-value', valueClass || 'text-slate-900']">{{ value }}</p>
      <p v-if="trend" :class="['text-xs font-medium', trendClass || 'text-slate-500']">{{ trend }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  valueClass: { type: String, default: "" },
  trend: { type: String, default: "" },
  trendClass: { type: String, default: "" },
});
</script>
