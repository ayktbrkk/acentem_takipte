<template>
  <div class="grid items-center gap-3" :class="gridClass">
    <p class="text-xs font-semibold text-slate-500">{{ label }}</p>
    <div class="h-2 rounded-full bg-slate-100">
      <div class="h-2 rounded-full" :class="barClass" :style="{ width: `${safeRatio}%` }" />
    </div>
    <p class="text-right text-sm font-semibold text-slate-800">{{ value }}</p>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  label: { type: String, default: "-" },
  value: { type: [String, Number], default: "-" },
  ratio: { type: [String, Number], default: 0 },
  barClass: { type: String, default: "bg-emerald-500" },
  leftWidth: { type: String, default: "90px" },
  rightWidth: { type: String, default: "120px" },
});

const safeRatio = computed(() => {
  const n = Number(props.ratio || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
});

const gridClass = computed(() => `grid-cols-[${props.leftWidth}_1fr_${props.rightWidth}]`);
</script>

