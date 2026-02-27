<template>
  <div>
    <div class="flex items-center justify-between text-sm">
      <span class="font-medium text-slate-700">{{ label }}</span>
      <span class="font-semibold text-slate-900">{{ value }}</span>
    </div>
    <div class="mt-2 h-2 rounded-full bg-slate-100">
      <div
        class="h-2 rounded-full transition-all"
        :class="barClass"
        :style="{ width: `${safeRatio}%` }"
      />
    </div>
    <p v-if="meta" class="mt-1 text-right text-xs text-slate-500">{{ meta }}</p>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  label: { type: String, default: "-" },
  value: { type: [String, Number], default: "-" },
  ratio: { type: [String, Number], default: 0 },
  barClass: { type: String, default: "bg-slate-400" },
  meta: { type: String, default: "" },
});

const safeRatio = computed(() => {
  const n = Number(props.ratio || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
});
</script>

