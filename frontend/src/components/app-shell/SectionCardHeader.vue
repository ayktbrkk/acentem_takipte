<template>
  <div class="mb-4 flex items-center justify-between">
    <h3 class="text-base font-semibold text-slate-900">{{ title }}</h3>
    <slot v-if="$slots.trailing" name="trailing" />
    <span v-else-if="showCount" class="text-xs text-slate-500">{{ count }}</span>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: "" },
  count: { type: [String, Number], default: "" },
  showCount: { type: Boolean, default: true },
});
</script>
