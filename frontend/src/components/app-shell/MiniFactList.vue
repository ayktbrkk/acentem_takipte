<template>
  <div class="space-y-2">
    <div v-for="item in items" :key="item.key || item.label" :class="item.wrapperClass || ''">
      <p class="text-[11px] uppercase tracking-wide text-slate-400">{{ item.label }}</p>
      <p class="truncate text-sm" :class="item.valueClass || 'font-medium text-slate-800'">
        {{ item.value ?? "-" }}
      </p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    default: () => [],
  },
});
</script>
