<template>
  <div class="mb-4 flex items-center justify-between">
    <h3 class="text-lg font-semibold text-gray-900 leading-tight">{{ title }}</h3>
    <slot v-if="$slots.trailing" name="trailing" />
    <span v-else-if="showCount" class="badge badge-brand ml-2">{{ count }}</span>
    <span v-else-if="meta" class="text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ meta }}</span>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: "" },
  count: { type: [String, Number], default: "" },
  meta: { type: String, default: "" },
  showCount: { type: Boolean, default: true },
});
</script>
