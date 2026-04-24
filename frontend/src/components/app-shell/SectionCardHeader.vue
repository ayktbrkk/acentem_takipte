<template>
  <div class="mb-4 flex items-center justify-between">
    <h3 class="text-lg font-bold text-gray-900">{{ title }}</h3>
    <slot v-if="$slots.trailing" name="trailing" />
    <span v-else-if="showCount" class="text-xs font-medium text-gray-400">{{ count }}</span>
    <span v-else-if="meta" class="text-xs font-medium text-gray-400">{{ meta }}</span>
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
