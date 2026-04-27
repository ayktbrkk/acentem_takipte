<template>
  <div class="flex h-24 flex-col justify-center rounded-xl border-[0.5px] border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
    <p class="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">{{ label }}</p>
    <div class="mt-1 flex items-baseline gap-2">
      <p :class="['text-2xl font-bold', valueClass || 'text-slate-900']">{{ value }}</p>
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
